import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const SecretCodeService = {
    async getSecretCodes(options: { includeUser?: boolean; usedFilter?: string } = {}) {
        const { includeUser, usedFilter } = options;

        let whereCondition: any = {};

        if (usedFilter === 'true') {
            whereCondition.used = true;
        } else if (usedFilter === 'false') {
            whereCondition.used = false;
        }

        const codes = await prisma.secretCode.findMany({
            where: whereCondition,
            include: {
                user: includeUser ? {
                    select: {
                        id: true,
                        email: true,
                        name: true,
                        nickname: true,
                        discordId: true,
                        createdAt: true
                    }
                } : false
            },
            orderBy: { createdAt: 'desc' }
        });

        return codes.map(code => ({
            id: code.id,
            code: code.code,
            createdBy: code.createdBy,
            createdAt: code.createdAt,
            used: code.used,
            usedBy: code.usedBy,
            usedAt: code.usedAt,
            expiresAt: code.expiresAt,
            maxUses: code.maxUses,
            uses: code.uses,
            userId: code.userId,
            user: code.user || null
        }));
    },

    async createSecretCode(data: {
        code: string;
        expiresAt?: string;
        maxUses?: number;
        createdBy: string;
        userId: number;
    }) {
        const { code, expiresAt, maxUses, createdBy, userId } = data;

        // Validate code format
        const codeRegex = /^[A-Z0-9\-_]+$/;
        if (!codeRegex.test(code.toUpperCase())) {
            throw new Error("Code can only contain uppercase letters, numbers, hyphens and underscores");
        }

        return await prisma.secretCode.create({
            data: {
                code: code.toUpperCase(),
                createdBy,
                expiresAt: expiresAt ? new Date(expiresAt) : null,
                maxUses: maxUses || 1,
                userId
            },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                        nickname: true,
                        discordId: true,
                        createdAt: true
                    }
                }
            }
        });
    },

    async deleteSecretCode(id: string) {
        await prisma.secretCode.delete({
            where: { id }
        });
    },

    generateCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
            if ((i + 1) % 4 === 0 && i !== 11) result += "-";
        }
        return result;
    },

    async validateCode(code: string) {
        const sanitizedCode = code.toUpperCase().trim();

        const secretCode = await prisma.secretCode.findFirst({
            where: {
                code: sanitizedCode,
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            include: {
                user: {
                    select: {
                        email: true,
                        name: true,
                        nickname: true,
                        discordId: true,
                        createdAt: true
                    }
                }
            }
        });

        if (!secretCode) {
            return {
                valid: false,
                error: 'Invalid or expired secret code'
            };
        }

        if (secretCode.uses >= secretCode.maxUses) {
            return {
                valid: false,
                error: 'Secret code has reached maximum usage limit'
            };
        }

        return {
            valid: true,
            code: {
                id: secretCode.id,
                code: secretCode.code,
                createdBy: secretCode.createdBy,
                expiresAt: secretCode.expiresAt,
                maxUses: secretCode.maxUses,
                uses: secretCode.uses,
                user: secretCode.user
            }
        };
    },

    async useCode(codeId: string, usedBy?: string) {
        return await prisma.secretCode.update({
            where: { id: codeId },
            data: {
                used: true,
                usedBy: usedBy || 'Unknown',
                usedAt: new Date(),
                uses: { increment: 1 }
            }
        });
    },

    async getStats() {
        const totalCodes = await prisma.secretCode.count();
        const usedCodes = await prisma.secretCode.count({ where: { used: true } });
        const activeCodes = await prisma.secretCode.count({
            where: {
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });
        const expiredCodes = await prisma.secretCode.count({
            where: {
                used: false,
                expiresAt: { lt: new Date() }
            }
        });

        return {
            total: totalCodes,
            used: usedCodes,
            active: activeCodes,
            expired: expiredCodes,
            usageRate: totalCodes > 0 ? (usedCodes / totalCodes) * 100 : 0
        };
    }
};