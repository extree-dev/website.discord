"E:\website\website.discord\src\server\routes\auth\discord.controller.ts"
import express from "express";
import crypto from "crypto";
import { DiscordService } from "./services/discord.service";
import { getClientIP } from "./middleware/security";
import { securityLogger } from "@/utils/securityLogger";
import { verifyToken } from "@/utils/jwt";

const router = express.Router();

// Хранение состояний OAuth
const oauthStates = new Map<string, { ip: string; timestamp: number }>();

// Очистка просроченных состояний
setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
        if (now - data.timestamp > 10 * 60 * 1000) {
            oauthStates.delete(state);
        }
    }
}, 5 * 60 * 1000);

// Инициация OAuth
router.get("/oauth/discord", (req, res) => {
    const clientIP = getClientIP(req);
    const state = crypto.randomBytes(32).toString('hex');

    oauthStates.set(state, {
        ip: clientIP,
        timestamp: Date.now()
    });

    const discordParams = new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
        response_type: 'code',
        scope: 'identify email',
        state: state,
    });

    const authUrl = `https://discord.com/api/oauth2/authorize?${discordParams.toString()}`;

    res.json({
        success: true,
        authUrl: authUrl,
        state: state
    });
});

router.get("/bot-status", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        verifyToken(token);

        // Запрос к боту на порту 3002
        const botResponse = await fetch('http://localhost:3002/discord/bot-status', {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!botResponse.ok) {
            throw new Error(`Bot API error: ${botResponse.status}`);
        }

        const botData = await botResponse.json();
        res.json(botData);

    } catch (error) {
        console.error('Bot status fetch error:', error);
        res.status(500).json({
            error: "Failed to fetch bot status",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// АУДИТ-ЛОГИ - новый эндпоинт
router.get("/audit-logs", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        verifyToken(token);

        const { limit = 50, timeRange = '24h' } = req.query;

        // Запрос к боту на порту 3002 для получения аудит-логов
        const botResponse = await fetch(`http://localhost:3002/discord/audit-logs?limit=${limit}&timeRange=${timeRange}`, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!botResponse.ok) {
            // Если бот вернул ошибку, возвращаем пустые данные вместо ошибки
            console.warn('Bot audit logs not available, returning empty data');
            return res.json({
                recentActivities: [],
                total: 0,
                source: 'fallback',
                message: 'Audit logs temporarily unavailable'
            });
        }

        const auditData = await botResponse.json();
        res.json(auditData);

    } catch (error) {
        console.error('Audit logs fetch error:', error);
        // В случае ошибки возвращаем пустые данные вместо 500 ошибки
        res.json({
            recentActivities: [],
            total: 0,
            source: 'fallback',
            message: 'Failed to fetch audit logs'
        });
    }
});

// Callback OAuth
router.get("/oauth/discord/callback", async (req, res) => {
    const { code, state } = req.query;
    const clientIP = getClientIP(req);

    if (!code || typeof code !== 'string') {
        securityLogger.logSuspiciousActivity('oauth_missing_code', { ip: clientIP, state });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_oauth_request`);
    }

    const stateData = oauthStates.get(state as string);
    if (!stateData) {
        securityLogger.logSuspiciousActivity('oauth_invalid_state', { ip: clientIP, state });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }

    oauthStates.delete(state as string);

    try {
        const result = await DiscordService.handleOAuthCallback(code, clientIP);

        const redirectPath = result.requiresCompletion ? '/complete-profile' : '/dashboard';
        const redirectUrl = new URL(`${process.env.FRONTEND_URL}${redirectPath}`);

        redirectUrl.searchParams.set('token', result.token);
        redirectUrl.searchParams.set('userId', result.userId.toString());
        redirectUrl.searchParams.set('method', 'discord');
        redirectUrl.searchParams.set('requiresCompletion', result.requiresCompletion.toString());

        return res.redirect(redirectUrl.toString());

    } catch (error) {
        console.error('Discord OAuth callback error:', error);
        securityLogger.logError('oauth_discord_callback_error', {
            error: (error as Error).message,
            ip: clientIP
        });
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
});

// Статус Discord аутентификации
router.get("/oauth/discord/status", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "User ID required" });
    }

    try {
        const status = await DiscordService.getDiscordStatus(parseInt(userId as string));
        res.json(status);
    } catch (error) {
        console.error('Discord status check error:', error);
        res.status(500).json({ error: "Status check failed" });
    }
});

// Отвязка Discord аккаунта
router.post("/oauth/discord/disconnect", async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ error: "User ID and password required" });
    }

    try {
        await DiscordService.disconnectDiscord(parseInt(userId), password);
        res.json({ success: true, message: "Discord account disconnected successfully" });
    } catch (error) {
        console.error('Discord disconnect error:', error);
        res.status(500).json({ error: "Disconnect failed" });
    }
});

// Данные Discord сервера
router.get("/server-stats", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        verifyToken(token);
        const stats = await DiscordService.getServerStats();
        res.json(stats);
    } catch (error) {
        console.error('Server stats fetch error:', error);
        res.status(500).json({ error: "Failed to fetch server statistics" });
    }
});

// Роли сервера
router.get("/server-roles", async (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        verifyToken(token);
        const roles = await DiscordService.getServerRoles();
        res.json(roles);
    } catch (error) {
        console.error('Server roles fetch error:', error);
        res.status(500).json({ error: "Failed to fetch server roles" });
    }
});

export default router;