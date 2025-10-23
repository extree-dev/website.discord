import { Request, Response, NextFunction } from "express";
import rateLimit from "express-rate-limit";
import validator from "validator";
import { securityLogger } from "@/utils/securityLogger";
import { failedAttempts, userCache } from "../services/cache.service";

// Rate limiting
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: "Too many authentication attempts" },
    standardHeaders: true,
});

export const strictAuthLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: { error: "Account temporarily locked" },
});

// Брутфорс защита
export const bruteForceProtection = (req: Request, res: Response, next: NextFunction) => {
    const ip = getClientIP(req);
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;

    if (!failedAttempts.has(ip)) {
        failedAttempts.set(ip, { count: 0, lastAttempt: now });
    }

    const attempts = failedAttempts.get(ip)!;

    if (now - attempts.lastAttempt > windowMs) {
        attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;

    if (attempts.count > 10) {
        securityLogger.logSuspiciousActivity('brute_force_detected', { ip });

        failedAttempts.set(ip, {
            count: attempts.count,
            lastAttempt: now,
            blockedUntil: now + (60 * 60 * 1000)
        });

        return res.status(429).json({ error: "Too many failed attempts. IP blocked for 1 hour." });
    }

    if (attempts.blockedUntil && now < attempts.blockedUntil) {
        return res.status(429).json({ error: "IP temporarily blocked. Try again later." });
    }

    next();
};

// SQL injection protection
const sqlInjectionPatterns = [
    /(\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT)\b)/i,
    /(EXEC\s*\(|EXECUTE\s*\(|sp_executesql)/i,
    // ... остальные паттерны
];

export const detectSQLInjection = (input: string): boolean => {
    return sqlInjectionPatterns.some(pattern => pattern.test(input));
};

export const sqlInjectionProtection = (req: Request, res: Response, next: NextFunction) => {
    const clientIP = getClientIP(req);

    // Проверка query параметров
    if (req.query) {
        for (const [key, value] of Object.entries(req.query)) {
            if (typeof value === 'string' && detectSQLInjection(value)) {
                securityLogger.logSuspiciousActivity('sql_injection_query', { parameter: key, ip: clientIP });
                return res.status(400).json({ error: "Invalid request parameters" });
            }
        }
    }

    // Проверка body
    if (req.body && typeof req.body === 'object') {
        const suspiciousFields = checkObjectForSQLInjection(req.body, clientIP);
        if (suspiciousFields.length > 0) {
            securityLogger.logSuspiciousActivity('sql_injection_body', { fields: suspiciousFields, ip: clientIP });
            return res.status(400).json({ error: "Invalid request data" });
        }
    }

    next();
};

const checkObjectForSQLInjection = (obj: any, ip: string, path: string = ''): string[] => {
    const suspiciousFields: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;

        if (key === 'code' || key === 'secretCode') {
            const codeRegex = /^[A-Z0-9\-_]+$/;
            if (typeof value === 'string' && !codeRegex.test(value)) {
                suspiciousFields.push(currentPath);
            }
            continue;
        }

        if (typeof value === 'string' && detectSQLInjection(value)) {
            suspiciousFields.push(currentPath);
        } else if (typeof value === 'object' && value !== null) {
            suspiciousFields.push(...checkObjectForSQLInjection(value, ip, currentPath));
        }
    }

    return suspiciousFields;
};

// Вспомогательные функции
export const getClientIP = (req: Request): string => {
    return req.ip || req.connection.remoteAddress || (req.headers['x-forwarded-for'] as string) || 'unknown';
};

export const validateContentType = (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'POST' && !req.is('application/json')) {
        return res.status(400).json({ error: "Content-Type must be application/json" });
    }
    next();
};

// Композитный middleware
export const securityMiddleware = [
    validateContentType,
    sqlInjectionProtection,
];

export const rateLimitingMiddleware = {
    login: [bruteForceProtection, strictAuthLimiter],
    register: [bruteForceProtection, authLimiter],
    oauth: [bruteForceProtection],
};