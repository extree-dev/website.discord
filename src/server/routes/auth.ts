import express from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/register
router.post("/register", async (req, res) => {
  const { name, nickname, email, password } = req.body;

  if (!name || !nickname || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] }
    });
    if (existingUser) return res.status(400).json({ error: "Nickname or email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, nickname, email, password: hashedPassword }
    });

    res.status(201).json({ id: user.id, nickname: user.nickname, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
