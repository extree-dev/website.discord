import express from "express";
import authRouter from "./auth/index"; // Импортируйте из папки auth

const router = express.Router();

// Подключаем auth роутер
router.use("/", authRouter);

export default router;