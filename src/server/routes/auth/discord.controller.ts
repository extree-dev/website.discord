// src/server/routes/discord.controller.ts
import express from "express";
import crypto from "crypto";
import { DiscordService } from "./services/discord.service";
import { getClientIP } from "./middleware/security";
import { securityLogger } from "@/utils/securityLogger";

const router = express.Router();
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

// OAuth инициация → /api/auth/discord
router.get("/", (req, res) => {
    try {
        const clientIP = getClientIP(req);
        const state = crypto.randomBytes(32).toString('hex');

        const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || "http://localhost:4000/api/auth/discord/callback";

        if (!process.env.DISCORD_CLIENT_ID) {
            throw new Error('DISCORD_CLIENT_ID is not configured');
        }

        oauthStates.set(state, {
            ip: clientIP,
            timestamp: Date.now()
        });

        const discordParams = new URLSearchParams({
            client_id: process.env.DISCORD_CLIENT_ID,
            redirect_uri: REDIRECT_URI,
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

    } catch (error) {
        console.error('❌ OAuth initiation error:', error);
        res.status(500).json({
            success: false,
            error: "Failed to initialize OAuth"
        });
    }
});

// OAuth callback → /api/auth/discord/callback
router.get("/callback", async (req, res) => {
    const { code, state } = req.query;
    const clientIP = getClientIP(req);

    if (!code || typeof code !== 'string') {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_oauth_request`);
    }

    const stateData = oauthStates.get(state as string);
    if (!stateData) {
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
    }

    oauthStates.delete(state as string);

    try {
        const result = await DiscordService.handleOAuthCallback(code, clientIP);
        const redirectPath = result.requiresCompletion ? '/complete-profile' : '/dashboard';
        const redirectUrl = `${process.env.FRONTEND_URL}${redirectPath}?token=${result.token}&userId=${result.userId}&method=discord&requiresCompletion=${result.requiresCompletion}`;

        return res.redirect(redirectUrl);

    } catch (error) {
        console.error('❌ Discord OAuth callback error:', error);
        return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
    }
});

// Статус Discord → /api/auth/discord/status
router.get("/status", async (req, res) => {
    const { userId } = req.query;

    if (!userId) {
        return res.status(400).json({ error: "User ID required" });
    }

    try {
        const status = await DiscordService.getDiscordStatus(parseInt(userId as string));
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: "Status check failed" });
    }
});

// Отвязка Discord → /api/auth/discord/disconnect
router.post("/disconnect", async (req, res) => {
    const { userId, password } = req.body;

    if (!userId || !password) {
        return res.status(400).json({ error: "User ID and password required" });
    }

    try {
        await DiscordService.disconnectDiscord(parseInt(userId), password);
        res.json({ success: true, message: "Discord account disconnected successfully" });
    } catch (error) {
        res.status(500).json({ error: "Disconnect failed" });
    }
});

export default router;