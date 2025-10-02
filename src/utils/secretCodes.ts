// secretCodes.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface CreateSecretCodeInput {
    code: string;
    createdBy: string;
    expiresAt?: Date;
    maxUses?: number;
}

export const secretCodeService = {
    // Создание нового секретного кода
    async createCode(input: CreateSecretCodeInput) {
        return await prisma.secretCode.create({
            data: {
                code: input.code.toUpperCase(),
                createdBy: input.createdBy,
                expiresAt: input.expiresAt,
                maxUses: input.maxUses || 1,
                uses: 0
            }
        });
    },

    // Валидация кода
    async validateCode(code: string) {
        const secretCode = await prisma.secretCode.findUnique({
            where: { code: code.toUpperCase() }
        });

        if (!secretCode) {
            return { valid: false, error: 'Invalid secret code' };
        }

        if (secretCode.used) {
            return { valid: false, error: 'Secret code already used' };
        }

        if (secretCode.expiresAt && new Date() > secretCode.expiresAt) {
            return { valid: false, error: 'Secret code has expired' };
        }

        if (secretCode.maxUses && secretCode.uses >= secretCode.maxUses) {
            return { valid: false, error: 'Secret code usage limit reached' };
        }

        return { valid: true, codeData: secretCode };
    },

    // Отметка кода как использованного
    async markCodeAsUsed(codeId: string, usedBy: string) {
        return await prisma.secretCode.update({
            where: { id: codeId },
            data: {
                used: true,
                usedBy: usedBy,
                usedAt: new Date(),
                uses: { increment: 1 }
            }
        });
    },

    // Получение всех кодов
    async getAllCodes() {
        return await prisma.secretCode.findMany({
            orderBy: { createdAt: 'desc' }
        });
    },

    // Получение активных кодов
    async getActiveCodes() {
        return await prisma.secretCode.findMany({
            where: {
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            },
            orderBy: { createdAt: 'desc' }
        });
    },

    // Получение использованных кодов
    async getUsedCodes() {
        return await prisma.secretCode.findMany({
            where: {
                used: true
            },
            orderBy: { usedAt: 'desc' }
        });
    },

    // Удаление кода
    async deleteCode(codeId: string) {
        return await prisma.secretCode.delete({
            where: { id: codeId }
        });
    },

    // Генерация случайного кода
    generateRandomCode(): string {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        let result = "";
        for (let i = 0; i < 12; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
            if ((i + 1) % 4 === 0 && i !== 11) result += "-";
        }
        return result;
    },

    // Получение статистики кодов
    async getCodeStats() {
        const total = await prisma.secretCode.count();
        const active = await prisma.secretCode.count({
            where: {
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ]
            }
        });
        const used = await prisma.secretCode.count({
            where: { used: true }
        });
        const expired = await prisma.secretCode.count({
            where: {
                used: false,
                expiresAt: { lt: new Date() }
            }
        });

        return { total, active, used, expired };
    }
};