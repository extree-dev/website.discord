import express from "express";
import { SystemService } from "./services/system.service";
import { verifyToken } from "@/utils/jwt";

const router = express.Router();

// Все endpoints требуют аутентификации
router.use((req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: "Authentication required" });
    }
    try {
        verifyToken(token);
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
    }
});

// Системная статистика
router.get("/stats", async (req, res) => {
    try {
        const stats = await SystemService.getSystemStats();
        res.json(stats);
    } catch (error) {
        console.error('System stats error:', error);
        res.status(500).json({
            error: "Failed to fetch system statistics",
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

// Статус бота
router.get("/bot/status", async (req, res) => {
    try {
        const status = await SystemService.getBotStatus();
        res.json(status);
    } catch (error) {
        console.error('Bot status check error:', error);
        res.json({
            isOnServer: false,
            totalServers: 0,
            isReady: false,
            uptime: 0,
            ping: -1,
            lastChecked: new Date().toISOString(),
            serverName: 'Discord Server'
        });
    }
});

// Серверы бота
router.get("/bot/servers", async (req, res) => {
    try {
        const servers = await SystemService.getBotServers();
        res.json(servers);
    } catch (error) {
        console.error('Bot servers fetch error:', error);
        res.status(500).json({
            error: "Failed to fetch bot servers",
            totalServers: 0,
            servers: [],
            isOnline: false
        });
    }
});

// Статистика команд
router.get("/discord/command-stats", async (req, res) => {
    try {
        const period = req.query.period as string || '24h';
        const filter = req.query.filter as string || 'all';

        const stats = await SystemService.getCommandStats(period, filter);
        res.json(stats);
    } catch (error) {
        console.error('Command stats error:', error);
        res.status(500).json({
            error: "Internal server error",
            details: error instanceof Error ? error.message : 'Unknown error',
            source: 'error'
        });
    }
});

// Audit logs
router.get("/discord/audit-logs", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit as string) || 10;
        const logs = await SystemService.getAuditLogs(limit);
        res.json(logs);
    } catch (error) {
        console.error('Audit log fetch error:', error);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
});

export default router;