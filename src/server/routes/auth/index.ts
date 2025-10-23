import express from "express";
import authController from "./auth.controller";
import discordController from "./discord.controller";
import secretCodesController from "./secret-codes.controller";
import systemController from "./system.controller";
import { securityMiddleware } from "./middleware/security";
import { validationMiddleware } from "./middleware/validation";
import { bruteForceProtection, authLimiter, strictAuthLimiter } from "./middleware/security";

const router = express.Router();

// Глобальные middleware
router.use(securityMiddleware);
router.use(validationMiddleware);

// Применяем rate limiting к конкретным маршрутам
router.use("/login", bruteForceProtection, strictAuthLimiter);
router.use("/register", bruteForceProtection, authLimiter);
router.use("/oauth/discord", bruteForceProtection);

// Подключаем модули - ВАЖЕН ПОРЯДОК!
router.use("/", authController);
router.use("/discord", discordController);
router.use("/oauth/discord", discordController);
router.use("/secret-codes", secretCodesController);
router.use("/system", systemController);

export default router;