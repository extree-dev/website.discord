// src/server/routes/auth/index.ts - ИСПРАВЛЕННАЯ ВЕРСИЯ
import express from "express";
import discordController from "./discord.controller";
import systemController from "./system.controller";

const router = express.Router();

router.use("/auth/discord", discordController);    // → /api/auth/discord/*
router.use("/auth/system", systemController);      // → /api/auth/system/*

export default router;