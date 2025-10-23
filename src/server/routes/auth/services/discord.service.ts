import { PrismaClient } from "@prisma/client";
import { AuthService } from "./auth.service";
import { generateToken } from "@/utils/jwt";
import { securityLogger } from "@/utils/securityLogger";
import { userCache } from "./cache.service";
import { sanitizeInput } from "../middleware/validation";
import crypto from "crypto";

const prisma = new PrismaClient();
const DISCORD_SERVER_ID = process.env.DISCORD_SERVER_ID || '1343586237868544052';

export const DiscordService = {
    async handleOAuthCallback(code: string, clientIP: string) {
        // 1. Exchange code -> token
        const tokenData = await this.exchangeCodeForToken(code);

        // 2. Get Discord user data
        const discordUser = await this.getDiscordUser(tokenData.access_token);

        // 3. Get user roles
        const userRoles = await this.getUserDiscordRoles(tokenData.access_token, discordUser.id);
        const highestRole = this.getHighestRole(userRoles);

        // 4. Find or create user
        const userResult = await this.findOrCreateUser(discordUser, userRoles, highestRole);

        // 5. Generate JWT token
        const jwtToken = generateToken({
            userId: userResult.id,
            email: userResult.email,
            name: userResult.name,
            role: highestRole.name,
            roleColor: highestRole.color,
            roleHexColor: this.discordColorToHex(highestRole.color),
            allRoles: userRoles.map((r: any) => r.name),
            avatar: userResult.avatar
        });

        return {
            token: jwtToken,
            userId: userResult.id,
            requiresCompletion: userResult.requiresCompletion
        };
    },

    async exchangeCodeForToken(code: string) {
        const response = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.DISCORD_CLIENT_ID!,
                client_secret: process.env.DISCORD_CLIENT_SECRET!,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: process.env.DISCORD_REDIRECT_URI!,
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord token API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
    },

    async getDiscordUser(accessToken: string) {
        const response = await fetch('https://discord.com/api/users/@me', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'User-Agent': 'YourApp/1.0 (+https://yourapp.com)'
            },
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Discord user API error: ${response.status} - ${errorText}`);
        }

        const user = await response.json();

        if (!user.id || !user.email) {
            throw new Error('Invalid user data from Discord - missing id or email');
        }

        return user;
    },

    async getUserDiscordRoles(accessToken: string, discordId: string) {
        try {
            const response = await fetch(
                `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${discordId}`,
                {
                    headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!response.ok) {
                if (response.status === 404) {
                    return [];
                }
                throw new Error(`Discord API error: ${response.status}`);
            }

            const memberData = await response.json();
            const roleIds = memberData.roles || [];

            if (roleIds.length === 0) {
                return [];
            }

            // Get server roles
            const rolesResponse = await fetch(
                `https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/roles`,
                {
                    headers: {
                        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (!rolesResponse.ok) {
                throw new Error(`Discord roles API error: ${rolesResponse.status}`);
            }

            const serverRoles = await rolesResponse.json();

            return serverRoles
                .filter((role: any) => roleIds.includes(role.id))
                .map((role: any) => ({
                    id: role.id,
                    name: role.name,
                    color: role.color,
                    position: role.position
                }));

        } catch (error) {
            console.error('Error fetching Discord roles:', error);
            return [];
        }
    },

    getHighestRole(userRoles: any[]) {
        if (userRoles.length === 0) {
            return { name: '@everyone', color: 0 };
        }

        const sortedRoles = userRoles.sort((a, b) => b.position - a.position);
        return sortedRoles[0];
    },

    discordColorToHex(color: number): string {
        if (!color || color === 0) return '#99AAB5';
        const hex = color.toString(16).padStart(6, '0');
        return `#${hex}`;
    },

    async findOrCreateUser(discordUser: any, userRoles: any[], highestRole: any) {
        const email = sanitizeInput(discordUser.email).toLowerCase();
        const discordId = discordUser.id;
        const username = sanitizeInput(discordUser.username);
        const globalName = sanitizeInput(discordUser.global_name || discordUser.username);
        const displayName = globalName || username;
        const avatarUrl = discordUser.avatar ?
            `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null;

        return await prisma.$transaction(async (tx) => {
            // Try to find by discordId
            let user = await tx.user.findFirst({
                where: { discordId },
                include: { profile: true }
            });

            if (user) {
                await this.updateUserProfile(tx, user.id, avatarUrl, highestRole.name);
                const isProfileComplete = Boolean(user.name && user.email && user.profile?.firstName);

                await tx.user.update({
                    where: { id: user.id },
                    data: { lastLogin: new Date() }
                });

                return {
                    id: user.id,
                    requiresCompletion: !isProfileComplete,
                    email: user.email,
                    name: user.name,
                    avatar: avatarUrl
                };
            }

            // Try to find by email and link discord
            user = await tx.user.findFirst({
                where: { email, discordId: null },
                include: { profile: true }
            });

            if (user) {
                await this.updateUserProfile(tx, user.id, avatarUrl, highestRole.name);

                await tx.user.update({
                    where: { id: user.id },
                    data: { discordId, lastLogin: new Date() }
                });

                const isProfileComplete = Boolean(user.name && user.email && user.profile?.firstName);
                return {
                    id: user.id,
                    requiresCompletion: !isProfileComplete,
                    email: user.email,
                    name: user.name,
                    avatar: avatarUrl
                };
            }

            // Create new user
            const randomPassword = await AuthService.hashPassword(crypto.randomBytes(32).toString('hex'));
            const nickname = await this.generateUniqueNickname(tx, username, discordId);

            const newUser = await tx.user.create({
                data: {
                    name: displayName,
                    nickname,
                    email,
                    discordId,
                    password: randomPassword,
                    emailVerified: discordUser.verified || false,
                    lastLogin: new Date(),
                    isActive: true
                }
            });

            await tx.profile.create({
                data: {
                    userId: newUser.id,
                    firstName: '',
                    lastName: '',
                    avatar: avatarUrl,
                    discordRole: highestRole.name,
                    profileCompleted: false
                }
            });

            return {
                id: newUser.id,
                requiresCompletion: true,
                email: newUser.email,
                name: newUser.name,
                avatar: avatarUrl
            };
        });
    },

    async generateUniqueNickname(tx: any, baseName: string, discordId: string) {
        const baseNickname = baseName.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 15);
        let uniqueNickname = baseNickname;
        let counter = 1;

        while (await tx.user.findFirst({ where: { nickname: uniqueNickname } })) {
            uniqueNickname = `${baseNickname}_${counter}`;
            counter++;
            if (counter > 100) {
                uniqueNickname = `discord_${discordId.substring(0, 8)}`;
                break;
            }
        }

        return uniqueNickname;
    },

    async updateUserProfile(tx: any, userId: number, avatarUrl: string | null, discordRole: string) {
        await tx.profile.upsert({
            where: { userId },
            create: {
                userId,
                firstName: '',
                lastName: '',
                avatar: avatarUrl,
                discordRole,
                profileCompleted: false
            },
            update: {
                avatar: avatarUrl,
                discordRole
            }
        });
    },

    async getDiscordStatus(userId: number) {
        const user = await prisma.user.findFirst({
            where: { id: userId },
            select: { discordId: true, email: true }
        });

        return {
            hasDiscord: !!user?.discordId,
            email: user?.email
        };
    },

    async disconnectDiscord(userId: number, password: string) {
        const user = await prisma.user.findFirst({
            where: { id: userId }
        });

        if (!user) {
            throw new Error("User not found");
        }

        if (!user.password || !(await AuthService.verifyPassword(user.password, password))) {
            throw new Error("Invalid password");
        }

        if (!user.password) {
            throw new Error("Cannot disconnect Discord. Please set a password first.");
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { discordId: null }
        });
    },

    async getServerStats() {
        const GUILD_ID = process.env.DISCORD_GUILD_ID;

        const guildResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`,
            {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!guildResponse.ok) {
            throw new Error("Bot is not on the server or server not found");
        }

        const guildData = await guildResponse.json();

        // Get members for accurate online count
        const membersResponse = await fetch(
            `https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`,
            {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        let onlineMembers = 0;
        if (membersResponse.ok) {
            const members = await membersResponse.json();
            onlineMembers = members.filter((member: any) =>
                member.status === 'online' || member.status === 'idle' || member.status === 'dnd'
            ).length;
        }

        return {
            server: {
                name: guildData.name,
                id: guildData.id,
                icon: guildData.icon ?
                    `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null,
                owner: guildData.owner_id,
                created: guildData.created_at
            },
            members: {
                total: guildData.approximate_member_count || 0,
                online: guildData.approximate_presence_count || onlineMembers,
                offline: (guildData.approximate_member_count || 0) - (guildData.approximate_presence_count || onlineMembers)
            },
            boosts: guildData.premium_subscription_count || 0,
            tier: guildData.premium_tier || 0
        };
    },

    async getServerRoles() {
        const response = await fetch(
            `https://discord.com/api/v10/guilds/${process.env.DISCORD_SERVER_ID}/roles`,
            {
                headers: {
                    'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        if (!response.ok) {
            throw new Error("Failed to fetch server roles");
        }

        const roles = await response.json();

        return roles
            .filter((role: any) => !role.managed && role.name !== '@everyone')
            .sort((a: any, b: any) => b.position - a.position)
            .map((role: any) => ({
                id: role.id,
                name: role.name,
                color: role.color,
                memberCount: 0,
                permissions: role.permissions
            }));
    }
};