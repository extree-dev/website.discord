import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import authRouter  from "./routes/auth/index.js";
import adminRoutes from "./routes/admin.js";
import 'module-alias/register';
import { addAlias } from "module-alias";
import { setupModerationRoutes } from './api/moderation.js'
import { setupUserRoutes } from "./api/users.js";
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

addAlias('@', __dirname);

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const app = express();
if (!process.env.JWT_SECRET) {
  console.error('❌ JWT_SECRET is not defined in .env file')
  process.exit(1)
}

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining']
}));

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://cdn.discordapp.com"],
      connectSrc: ["'self'", "https://discord.com"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  crossOriginEmbedderPolicy: false
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: { error: "Too many requests from this IP" },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Too many authentication attempts" }
});

app.use(globalLimiter);
app.use("/api/login", authLimiter);
app.use("/api/register", authLimiter);
app.use(express.json());

// ✅ ПОДКЛЮЧАЕМ ТОЛЬКО ГЛАВНЫЙ РОУТЕР
app.use("/api", authRouter);

// Другие роуты
app.use("/admin", adminRoutes);
setupModerationRoutes(app);
setupUserRoutes(app);

// Debug endpoint
app.get("/api/debug", (req, res) => {
  res.json({
    message: "✅ Сервер работает!",
    timestamp: new Date().toISOString(),
    availableRoutes: [
      "/api/auth/discord",
      "/api/auth/discord/callback",
      "/api/auth/system/stats",
      "/api/auth/system/bot/status",
      "/api/auth/system/bot/servers"
    ]
  });
});

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// Environment validation
const requiredEnvVars = [
  'JWT_SECRET',
  'DISCORD_BOT_TOKEN',
  'DISCORD_CLIENT_ID',
  'DISCORD_CLIENT_SECRET',
  'DATABASE_URL'
];

requiredEnvVars.forEach(envVar => {
  if (!process.env[envVar]) {
    console.error(`❌ CRITICAL: Missing environment variable: ${envVar}`);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.error('❌ JWT_SECRET must be at least 32 characters long');
  process.exit(1);
}

// Production redirect
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(`https://${req.headers.host}${req.url}`);
    }
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`🔗 Discord OAuth: http://localhost:${PORT}/api/auth/discord`);
  console.log(`🔄 Callback URL: http://localhost:${PORT}/api/auth/discord/callback`);
  console.log(`📊 System API: http://localhost:${PORT}/api/auth/system/stats`);
});