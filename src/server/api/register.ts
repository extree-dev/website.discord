import express from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, nickname, email, password } = req.body;

  if (!name || !nickname || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Проверка уникальности
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] }
    });
    if (existingUser) return res.status(400).json({ error: "Nickname or email already exists" });

    // Хеширование пароля
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создание пользователя
    const user = await prisma.user.create({
      data: { name, nickname, email, password: hashedPassword }
    });

    return res.status(201).json({ id: user.id, nickname: user.nickname, email: user.email });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
