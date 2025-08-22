import express from "express";
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const router = express.Router();
const prisma = new PrismaClient();

// -------------------- REGISTER --------------------
router.post("/register", async (req, res) => {
  const { name, nickname, email, password } = req.body;

  if (!name || !nickname || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { nickname }] },
    });

    if (existingUser) {
      return res.status(400).json({ error: "Nickname or email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: { name, nickname, email, password: hashedPassword },
    });

    res.status(201).json({ id: user.id, nickname: user.nickname, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- LOGIN --------------------
router.post("/login", async (req, res) => {
  const { identifier, password } = req.body;

  if (!identifier || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { OR: [{ email: identifier }, { nickname: identifier }] },
    });

    if (!user) return res.status(400).json({ error: "User not found" });

    if (!user.password) {
      return res
        .status(400)
        .json({ error: "This account uses social login. Please use Discord login." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Invalid password" });

    res.status(200).json({ id: user.id, nickname: user.nickname, email: user.email });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// -------------------- DISCORD OAUTH --------------------
router.get("/oauth/discord", (req, res) => {
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${process.env.DISCORD_REDIRECT_URI}&response_type=code&scope=identify%20email`;
  res.redirect(authUrl);
});

router.get("/oauth/callback/discord", async (req, res) => {
  const { code } = req.query;
  if (!code || typeof code !== "string") return res.status(400).send("Missing code");

  try {
    // Обмен code на access_token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) throw new Error("Failed to get Discord access token");

    // Получение данных пользователя
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    const email = discordUser.email;
    const discordId = discordUser.id;
    const username = discordUser.username;
    const globalName = discordUser.global_name || discordUser.username;

    // РАЗДЕЛЬНЫЕ ЗАПРОСЫ (надежное решение)
    let user = await prisma.user.findFirst({
      where: { discordId: discordId }
    });

    if (!user) {
      user = await prisma.user.findFirst({
        where: { email: email }
      });
    }

    if (!user) {
      // Автоматически создаем нового пользователя
      user = await prisma.user.create({
        data: {
          name: globalName,
          nickname: username,
          email: email,
          discordId: discordId,
          password: await bcrypt.hash(Math.random().toString(36) + Date.now().toString(), 10),
        },
      });
    } else if (!user.discordId) {
      // Если пользователь существует но без discordId - обновляем
      user = await prisma.user.update({
        where: { id: user.id },
        data: { discordId: discordId },
      });
    }

    // Редирект на dashboard после успешной аутентификации
    return res.redirect("http://localhost:5173/dashboard");
    
  } catch (err) {
    console.error("Discord OAuth error:", err);
    res.status(500).send("Discord OAuth login failed");
  }
});

export default router;
