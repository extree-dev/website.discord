import express from "express";
import { AuthService } from "./services/auth.service";
import { securityLogger } from "@/utils/securityLogger";
import { getClientIP } from "./middleware/security";
import { constantTimeDelay } from "./services/security.service";
import { validateEmail, validateNickname, validatePassword, sanitizeInput } from "./middleware/validation";
import { verifyToken } from "@/utils/jwt";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// Регистрация
router.post("/register", async (req, res) => {
    const startTime = Date.now();
    const clientIP = getClientIP(req);

    try {
        const { name, nickname, email, password, secretCode } = req.body;

        // Базовая валидация
        if (!name?.trim() || !nickname?.trim() || !email?.trim() || !password || !secretCode) {
            await constantTimeDelay();
            return res.status(400).json({
                error: "All fields are required and cannot be empty"
            });
        }

        // Санитизация секретного кода
        const sanitizedSecretCode = sanitizeInput(secretCode.toUpperCase());
        if (!/^[A-Z0-9\-_]+$/.test(sanitizedSecretCode)) {
            await constantTimeDelay();
            return res.status(400).json({
                error: "Secret code contains invalid characters"
            });
        }

        // Валидация данных
        if (!validateEmail(email)) {
            await constantTimeDelay();
            return res.status(400).json({
                error: "Please provide a valid email address"
            });
        }

        if (!validateNickname(nickname)) {
            await constantTimeDelay();
            return res.status(400).json({
                error: "Nickname must be 3-20 characters long and contain only letters, numbers and underscores"
            });
        }

        const passwordValidation = validatePassword(password);
        if (!passwordValidation.valid) {
            await constantTimeDelay();
            return res.status(400).json({
                error: passwordValidation.error
            });
        }

        // Создание пользователя
        const user = await AuthService.registerUser({
            name,
            nickname,
            email,
            password,
            secretCode: sanitizedSecretCode,
            ip: clientIP
        });

        securityLogger.logAuthAttempt(email, true, {
            type: 'registration',
            ip: clientIP,
            userId: user.id,
            secretCode: sanitizedSecretCode
        });

        // Постоянное время ответа
        const elapsed = Date.now() - startTime;
        await constantTimeDelay(Math.max(0, 500 - elapsed));

        return res.status(201).json({
            success: true,
            message: "User registered successfully",
            user: user
        });

    } catch (err: unknown) {
        console.error("Registration error:", err);

        securityLogger.logSuspiciousActivity('registration_error', {
            error: err instanceof Error ? err.message : 'Unknown error',
            ip: clientIP
        });

        await constantTimeDelay();

        const error = err as Error;
        if (error.message.includes('already exists')) {
            return res.status(409).json({
                error: error.message
            });
        }

        if (error.message.includes('secret code')) {
            return res.status(400).json({
                error: error.message
            });
        }

        return res.status(500).json({
            error: "Internal server error. Please try again later."
        });
    }
});

// Логин
router.post("/login", async (req, res) => {
    const startTime = Date.now();
    const clientIP = getClientIP(req);
    const userAgent = req.get('User-Agent') || 'unknown';

    try {
        const { identifier, password } = req.body;

        // Базовая валидация
        if (!identifier?.trim() || !password) {
            await constantTimeDelay();
            return res.status(400).json({
                error: "All fields are required and cannot be empty"
            });
        }

        const result = await AuthService.loginUser(identifier, password, clientIP, userAgent);

        securityLogger.logAuthAttempt(identifier, true, {
            userId: result.user.id,
            ip: clientIP
        });

        // Постоянное время ответа
        const elapsed = Date.now() - startTime;
        await constantTimeDelay(Math.max(0, 500 - elapsed));

        return res.status(200).json({
            success: true,
            message: "Login successful",
            user: result.user,
            session: result.session
        });

    } catch (err: unknown) {
        const error = err as Error;
        console.error("Login error:", error);

        securityLogger.logSuspiciousActivity('login_error', {
            error: error.message,
            ip: clientIP
        });

        await constantTimeDelay();

        if (error.message.includes("locked")) {
            return res.status(423).json({
                error: error.message,
                retryAfter: 1800
            });
        }

        if (error.message.includes("Social login required")) {
            return res.status(400).json({
                error: "Social login required",
                details: "This account uses social authentication. Please use Discord login.",
                loginMethod: "discord"
            });
        }

        return res.status(401).json({
            error: "Invalid credentials"
        });
    }
});

// Логаут
router.post("/logout", async (req, res) => {
    const { sessionToken } = req.body;

    if (!sessionToken) {
        return res.status(400).json({ error: "Session token required" });
    }

    try {
        await AuthService.logoutUser(sessionToken);
        res.json({ success: true, message: "Logged out successfully" });
    } catch (err: unknown) {
        console.error("Logout error:", err);
        res.status(500).json({ error: "Logout failed" });
    }
});

// Завершение профиля
router.post("/complete-profile", async (req, res) => {
    const clientIP = getClientIP(req);
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = verifyToken(token);
        const userId = decoded.userId;

        const user = await prisma.user.findFirst({
            where: { id: userId },
            include: { profile: true }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const { firstName, country, city, secretCode, password } = req.body;

        // Валидация
        if (!firstName?.trim()) {
            return res.status(400).json({ error: "First name is required" });
        }

        if (!secretCode?.trim()) {
            return res.status(400).json({ error: "Secret registration code is required" });
        }

        // Валидация пароля (если предоставлен)
        if (password) {
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.valid) {
                return res.status(400).json({ error: passwordValidation.error });
            }
        }

        // Проверяем валидность кода
        const codeValidation = await prisma.secretCode.findFirst({
            where: {
                code: secretCode.toUpperCase(),
                used: false,
                OR: [
                    { expiresAt: null },
                    { expiresAt: { gt: new Date() } }
                ],
                AND: [
                    { uses: { lt: prisma.secretCode.fields.maxUses } }
                ]
            }
        });

        if (!codeValidation) {
            return res.status(400).json({ error: "Invalid or expired secret code" });
        }

        const sessionId = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

        // Хешируем пароль если он предоставлен
        let hashedPassword = user.password;
        if (password) {
            hashedPassword = await AuthService.hashPassword(password);
        }

        // Обновляем пользователя с возможным новым паролем
        await prisma.user.update({
            where: { id: user.id },
            data: {
                name: firstName.trim(),
                registrationCodeUsed: secretCode.toUpperCase(),
                password: hashedPassword
            }
        });

        // Upsert профиля
        await prisma.profile.upsert({
            where: { userId: user.id },
            create: {
                userId: user.id,
                firstName: firstName.trim(),
                country: country?.trim() || null,
                city: city?.trim() || null,
                sessionId: sessionId,
                profileCompleted: true,
                discordRole: user.profile?.discordRole || null
            },
            update: {
                firstName: firstName.trim(),
                country: country?.trim() || null,
                city: city?.trim() || null,
                sessionId: sessionId,
                profileCompleted: true
            }
        });

        // Обновляем секретный код как использованный
        try {
            await prisma.secretCode.update({
                where: {
                    code: secretCode.toUpperCase(),
                    used: false
                },
                data: {
                    used: true,
                    usedBy: user.email,
                    usedAt: new Date(),
                    uses: { increment: 1 },
                    userId: user.id,
                }
            });
        } catch (codeError) {
            console.error('Error updating secret code:', codeError);
            securityLogger.logError('secret_code_update_error', {
                userId: user.id,
                code: secretCode,
                error: codeError instanceof Error ? codeError.message : 'Unknown error'
            });
        }

        securityLogger.logAuthAttempt(user.email, true, {
            userId: user.id,
            action: 'profile_completed',
            ip: clientIP,
            sessionId: sessionId,
            secretCode: secretCode,
            passwordSet: !!password
        });

        res.json({
            success: true,
            message: "Profile completed successfully",
            passwordSet: !!password
        });

    } catch (error: any) {
        console.error('Profile completion error:', error);

        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: "Invalid or expired token" });
        }

        res.status(500).json({ error: "Failed to complete profile" });
    }
});

// Получение базовых данных пользователя
router.get("/users/:userId/basic", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const userId = parseInt(req.params.userId);

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const decoded = verifyToken(token);

        if (decoded.userId !== userId) {
            return res.status(403).json({ error: "Access denied" });
        }

        const user = await prisma.user.findFirst({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                nickname: true,
                discordId: true,
                emailVerified: true,
                profile: {
                    select: {
                        avatar: true,
                        discordRole: true
                    }
                }
            }
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        const discordCreatedAt = user.discordId ? getDiscordCreationDate(user.discordId) : null;

        // Получаем роль из токена с цветом
        const highestRole = user.profile?.discordRole || decoded.role || '@everyone';
        const roleColor = decoded.roleColor || 0;
        const roleHexColor = discordColorToHex(roleColor);

        const response = {
            id: user.id,
            name: user.name,
            email: user.email,
            nickname: user.nickname,
            discordId: user.discordId,
            emailVerified: user.emailVerified,
            discordCreatedAt: discordCreatedAt,
            avatar: user.profile?.avatar,
            highestRole: highestRole,
            roleColor: roleColor,
            roleHexColor: roleHexColor
        };

        res.json(response);

    } catch (error) {
        console.error('User info fetch error:', error);
        res.status(401).json({ error: "Invalid or expired token" });
    }
});

// Вспомогательные функции
function getDiscordCreationDate(discordId: string): string {
    const timestamp = (parseInt(discordId) / 4194304) + 1420070400000;
    return new Date(timestamp).toISOString();
}

function discordColorToHex(color: number): string {
    if (!color || color === 0) return '#99AAB5';
    const hex = color.toString(16).padStart(6, '0');
    return `#${hex}`;
}

export default router;