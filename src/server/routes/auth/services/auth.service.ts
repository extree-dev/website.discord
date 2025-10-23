import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";
import crypto from "crypto";
import validator from "validator";
import { securityLogger } from "@/utils/securityLogger";
import { generateSecureToken, constantTimeDelay } from "./security.service";
import { validateEmail, validateNickname, validatePassword, sanitizeInput } from "../middleware/validation";

const prisma = new PrismaClient();
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || crypto.randomBytes(32).toString('hex');

export const AuthService = {
    async registerUser(userData: {
        name: string;
        nickname: string;
        email: string;
        password: string;
        secretCode: string;
        ip: string;
    }) {
        const { name, nickname, email, password, secretCode, ip } = userData;

        // Валидация секретного кода
        const codeValidation = await prisma.secretCode.findFirst({
            where: {
                code: secretCode.toUpperCase(),
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ],
                uses: { lt: prisma.secretCode.fields.maxUses }
            }
        });

        if (!codeValidation) {
            throw new Error("Invalid, expired, or already used registration code");
        }

        // Проверка уникальности пользователя
        const existingUser = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: sanitizeInput(email).toLowerCase() },
                    { nickname: sanitizeInput(nickname) }
                ]
            }
        });

        if (existingUser) {
            const field = existingUser.email === email ? "email" : "nickname";
            securityLogger.logSuspiciousActivity('duplicate_registration_attempt', {
                email, nickname, ip, secretCode
            });
            throw new Error(`User with this ${field} already exists`);
        }

        // Хеширование пароля
        const hashedPassword = await this.hashPassword(password);

        // Создание пользователя в транзакции
        return await prisma.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    name: sanitizeInput(name),
                    nickname: sanitizeInput(nickname),
                    email: sanitizeInput(email).toLowerCase(),
                    password: hashedPassword,
                    registrationCodeUsed: secretCode.toUpperCase()
                },
                select: {
                    id: true,
                    name: true,
                    nickname: true,
                    email: true,
                    createdAt: true,
                    registrationCodeUsed: true
                }
            });

            // Обновление секретного кода
            await tx.secretCode.update({
                where: { id: codeValidation.id },
                data: {
                    used: true,
                    usedAt: new Date(),
                    userId: user.id,
                    usedBy: user.id.toString(),
                    uses: { increment: 1 }
                }
            });

            return user;
        });
    },

    async loginUser(identifier: string, password: string, ip: string, userAgent: string) {
        const sanitizedIdentifier = sanitizeInput(identifier);

        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { email: sanitizedIdentifier.toLowerCase() },
                    { nickname: sanitizedIdentifier }
                ]
            }
        });

        if (!user) {
            await constantTimeDelay();
            throw new Error("Invalid credentials");
        }

        // Проверка блокировки аккаунта
        if (user.lockedUntil && user.lockedUntil > new Date()) {
            securityLogger.logSuspiciousActivity('login_attempt_locked_account', {
                userId: user.id,
                identifier: sanitizedIdentifier,
                ip
            });
            throw new Error("Account temporarily locked");
        }

        // Проверка пароля
        const isValid = user.password ? await this.verifyPassword(user.password, password) : false;

        if (!isValid) {
            const newAttempts = (user.loginAttempts || 0) + 1;
            const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;

            await prisma.user.update({
                where: { id: user.id },
                data: {
                    loginAttempts: newAttempts,
                    lockedUntil: lockedUntil
                }
            });

            if (lockedUntil) {
                securityLogger.logSuspiciousActivity('account_locked', {
                    userId: user.id,
                    attempts: newAttempts,
                    ip,
                    userAgent
                });
                throw new Error("Account temporarily locked due to too many failed attempts. Please try again in 30 minutes.");
            }

            if (newAttempts >= 3) {
                securityLogger.logSuspiciousActivity('suspicious_login_attempt', {
                    userId: user.id,
                    attempts: newAttempts,
                    ip,
                    userAgent
                });
            }

            throw new Error("Invalid credentials");
        }

        // Проверка социального логина
        if (!user.password && user.discordId) {
            throw new Error("Social login required");
        }

        // Сброс счетчика и обновление последнего логина
        await prisma.user.update({
            where: { id: user.id },
            data: {
                loginAttempts: 0,
                lockedUntil: null,
                lastLogin: new Date()
            }
        });

        // Создание сессии
        const sessionToken = generateSecureToken(64);
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await prisma.session.create({
            data: {
                userId: user.id,
                token: await this.hashPassword(sessionToken),
                expiresAt: sessionExpiry,
                ipAddress: ip,
                userAgent: userAgent.substring(0, 500)
            }
        });

        return {
            user: {
                id: user.id,
                name: user.name,
                nickname: user.nickname,
                email: user.email,
                createdAt: user.createdAt
            },
            session: {
                token: sessionToken,
                expiresAt: sessionExpiry
            }
        };
    },

    async hashPassword(password: string): Promise<string> {
        const pepperedPassword = password + PASSWORD_PEPPER;
        return await argon2.hash(pepperedPassword, {
            type: argon2.argon2id,
            memoryCost: 65536,
            timeCost: 4,
            parallelism: 1,
            hashLength: 32
        });
    },

    async verifyPassword(hashedPassword: string, password: string): Promise<boolean> {
        try {
            const pepperedPassword = password + PASSWORD_PEPPER;
            return await argon2.verify(hashedPassword, pepperedPassword);
        } catch (err) {
            console.error("Password verification error:", err);
            return false;
        }
    },

    async logoutUser(sessionToken: string) {
        const tokenHash = await this.hashPassword(sessionToken);
        await prisma.session.deleteMany({
            where: { token: tokenHash }
        });
    }
};