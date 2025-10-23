import rateLimit from "express-rate-limit";

// Конфигурации rate limiting
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        error: "Too many authentication attempts, please try again later"
    },
    standardHeaders: true,
    legacyHeaders: false
});

export const strictAuthLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        error: "Account temporarily locked due to too many failed attempts"
    }
});

export const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: "Too many requests, please try again later"
    }
});

export const sensitiveOperationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        error: "Too many sensitive operations, please try again later"
    }
});