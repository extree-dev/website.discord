import express from "express";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import validator from "validator";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

const router = express.Router();
const prisma = new PrismaClient();

// ==================== КОНФИГУРАЦИЯ БЕЗОПАСНОСТИ ====================

// Конфигурация Argon2
const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 4,
  parallelism: 1,
  hashLength: 32
};

// Глобальный перец для паролей
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || crypto.randomBytes(32).toString('hex');

// Rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    error: "Too many authentication attempts, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false
});

const strictAuthLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: "Account temporarily locked due to too many failed attempts"
  }
});

// Применяем лимитеры ко всем аутентификационным роутам
router.use("/register", authLimiter);
router.use("/login", strictAuthLimiter);

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Санитизация и валидация ввода
const sanitizeInput = (input: string): string => {
  return validator.escape(validator.trim(input));
};

const validateEmail = (email: string): boolean => {
  return (
    validator.isEmail(email, { allow_utf8_local_part: false }) &&
    validator.isLength(email, { max: 254 })
  );
};

const validateNickname = (nickname: string): boolean => {
  return validator.isLength(nickname, { min: 3, max: 20 }) &&
         validator.isAlphanumeric(nickname, 'en-US', { ignore: '_' }) &&
         !validator.contains(nickname, 'admin') &&
         !validator.contains(nickname, 'moderator');
};

const validatePassword = (password: string): { valid: boolean; error?: string } => {
  if (password.length < 12) {
    return { valid: false, error: "Password must be at least 12 characters long" };
  }
  if (!validator.isStrongPassword(password, { 
    minLength: 12, 
    minLowercase: 1, 
    minUppercase: 1, 
    minNumbers: 1, 
    minSymbols: 1 
  })) {
    return { valid: false, error: "Password must contain uppercase, lowercase, number and symbol" };
  }
  return { valid: true };
};

// Хеширование с перцем
const hashPassword = async (password: string): Promise<string> => {
  const pepperedPassword = password + PASSWORD_PEPPER;
  return await argon2.hash(pepperedPassword, argon2Options);
};

const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
  try {
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await argon2.verify(hashedPassword, pepperedPassword);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
};

// Защита от timing attacks
const constantTimeDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Логирование безопасности
const securityLogger = {
  logSuspiciousActivity: (type: string, data: any) => {
    console.warn(`[SECURITY] ${type}`, {
      ...data,
      timestamp: new Date().toISOString(),
      ip: data.ip || 'unknown'
    });
  },
  
  logAuthAttempt: (identifier: string, success: boolean, metadata: any) => {
    console.info(`[AUTH] ${success ? 'SUCCESS' : 'FAILED'}`, {
      identifier: identifier.substring(0, 3) + '***',
      success,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

// Генерация безопасных токенов
const generateSecureToken = (length: number = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

// ==================== MIDDLEWARE БЕЗОПАСНОСТИ ====================

// Middleware для извлечения IP с учетом прокси
const getClientIP = (req: express.Request): string => {
  return req.ip || 
         req.connection.remoteAddress || 
         req.headers['x-forwarded-for'] as string || 
         'unknown';
};

// Middleware для проверки Content-Type
const validateContentType = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({ error: "Content-Type must be application/json" });
  }
  next();
};

router.use(validateContentType);

// ==================== РЕГИСТРАЦИЯ ====================

router.post("/register", async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  
  try {
    const { name, nickname, email, password } = req.body;

    // Базовая валидация наличия полей
    if (!name?.trim() || !nickname?.trim() || !email?.trim() || !password) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: "All fields are required and cannot be empty" 
      });
    }

    // Санитизация ввода
    const sanitizedName = sanitizeInput(name);
    const sanitizedNickname = sanitizeInput(nickname);
    const sanitizedEmail = sanitizeInput(email).toLowerCase();

    // Расширенная валидация
    if (!validateEmail(sanitizedEmail)) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: "Please provide a valid email address" 
      });
    }

    if (!validateNickname(sanitizedNickname)) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: "Nickname must be 3-20 characters long and contain only letters, numbers and underscores" 
      });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: passwordValidation.error 
      });
    }

    // Проверка уникальности в транзакции для избежания race condition
    const existingUser = await prisma.$transaction(async (tx: PrismaClient) => {
      return await tx.user.findFirst({
        where: { 
          OR: [
            { email: sanitizedEmail }, 
            { nickname: sanitizedNickname }
          ] 
        },
        select: { id: true, email: true, nickname: true }
      });
    });

    if (existingUser) {
      const field = existingUser.email === sanitizedEmail ? "email" : "nickname";
      securityLogger.logSuspiciousActivity('duplicate_registration_attempt', {
        email: sanitizedEmail,
        nickname: sanitizedNickname,
        ip: clientIP
      });
      
      await constantTimeDelay();
      return res.status(409).json({ 
        error: `User with this ${field} already exists` 
      });
    }

    // Хеширование пароля
    const hashedPassword = await hashPassword(password);

    // Создание пользователя
    const user = await prisma.user.create({
      data: { 
        name: sanitizedName,
        nickname: sanitizedNickname,
        email: sanitizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        createdAt: true
      }
    });

    securityLogger.logAuthAttempt(sanitizedEmail, true, { type: 'registration', ip: clientIP });

    // Постоянное время ответа
    const elapsed = Date.now() - startTime;
    await constantTimeDelay(Math.max(0, 500 - elapsed));

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: user
    });

  } catch (err: unknown) {
    console.error("Registration error:", err);

    // Логирование безопасности
    securityLogger.logSuspiciousActivity('registration_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP
    });

    await constantTimeDelay();
    
    // Обработка ошибок Prisma
    if (err instanceof Error && 'code' in err) {
      const prismaError = err as { code: string };
      
      if (prismaError.code === 'P2002') {
        return res.status(409).json({ 
          error: "User with this email or nickname already exists" 
        });
      }
    }

    return res.status(500).json({ 
      error: "Internal server error. Please try again later." 
    });
  }
});

// ==================== ЛОГИН ====================

router.post("/login", async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';

  try {
    const { identifier, password } = req.body;

    // Базовая валидация
    if (!identifier?.trim() || !password) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: "All fields are required and cannot be empty" 
      });
    }

    const sanitizedIdentifier = sanitizeInput(identifier);

    // Поиск пользователя с блокировкой для избежания race condition
    const user = await prisma.$transaction(async (tx: PrismaClient) => {
      const user = await tx.user.findFirst({
        where: { 
          OR: [
            { email: sanitizedIdentifier.toLowerCase() }, 
            { nickname: sanitizedIdentifier }
          ] 
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          password: true,
          discordId: true,
          loginAttempts: true,
          lockedUntil: true,
          isActive: true,
          createdAt: true
        }
      });

      // Проверка блокировки аккаунта
      if (user?.lockedUntil && user.lockedUntil > new Date()) {
        securityLogger.logSuspiciousActivity('login_attempt_locked_account', {
          userId: user.id,
          identifier: sanitizedIdentifier,
          ip: clientIP
        });
        return null;
      }

      return user;
    });

    // Унифицированный ответ для безопасности
    let isValid = false;
    if (user && user.password && user.isActive) {
      isValid = await verifyPassword(user.password, password);
    }

    if (!user || !isValid) {
      // Увеличиваем счетчик неудачных попыток
      if (user) {
        const newAttempts = (user.loginAttempts || 0) + 1;
        const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null;
        
        await prisma.user.update({
          where: { id: user.id },
          data: { 
            loginAttempts: newAttempts,
            lockedUntil: lockedUntil
          }
        });

        if (newAttempts >= 3) {
          securityLogger.logSuspiciousActivity('suspicious_login_attempt', {
            userId: user.id,
            attempts: newAttempts,
            ip: clientIP,
            userAgent
          });
        }
      }

      securityLogger.logAuthAttempt(sanitizedIdentifier, false, { 
        ip: clientIP, 
        userAgent 
      });
      
      await constantTimeDelay();
      return res.status(401).json({ 
        error: "Invalid credentials" 
      });
    }

    // Проверка социального логина
    if (!user.password && user.discordId) {
      await constantTimeDelay();
      return res.status(400).json({ 
        error: "Social login required",
        details: "This account uses social authentication. Please use Discord login.",
        loginMethod: "discord"
      });
    }

    // Сброс счетчика попыток при успешном логине
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        loginAttempts: 0,
        lockedUntil: null,
        lastLogin: new Date()
      }
    });

    // Генерация сессии
    const sessionToken = generateSecureToken(64);
    const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Теперь prisma.session доступен
    await prisma.session.create({
      data: {
        userId: user.id,
        token: await hashPassword(sessionToken),
        expiresAt: sessionExpiry,
        ipAddress: clientIP,
        userAgent: userAgent.substring(0, 500)
      }
    });

    securityLogger.logAuthAttempt(sanitizedIdentifier, true, { 
      userId: user.id, 
      ip: clientIP 
    });

    // Успешный логин
    const response = {
      success: true,
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt
      },
      session: {
        token: sessionToken,
        expiresAt: sessionExpiry
      }
    };

    // Постоянное время ответа
    const elapsed = Date.now() - startTime;
    await constantTimeDelay(Math.max(0, 500 - elapsed));

    return res.status(200).json(response);

  } catch (err: unknown) {
    console.error("Login error:", err);
    
    securityLogger.logSuspiciousActivity('login_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP
    });

    await constantTimeDelay();
    return res.status(500).json({ 
      error: "Authentication service unavailable. Please try again later." 
    });
  }
});

// ==================== DISCORD OAUTH ====================

router.get("/oauth/discord", (req, res) => {
  const state = generateSecureToken(16);
  const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}&response_type=code&scope=identify%20email&state=${state}`;
  
  res.cookie('oauth_state', state, { 
    httpOnly: true, 
    secure: process.env.NODE_ENV === 'production',
    maxAge: 10 * 60 * 1000
  });
  
  res.redirect(authUrl);
});

router.get("/oauth/callback/discord", async (req, res) => {
  const { code, state } = req.query;
  const clientIP = getClientIP(req);
  
  // Валидация state для защиты от CSRF
  if (state !== req.cookies.oauth_state) {
    securityLogger.logSuspiciousActivity('oauth_csrf_attempt', {
      ip: clientIP,
      providedState: state
    });
    return res.status(400).send("Invalid state parameter");
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing authorization code");
  }

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

    if (!tokenRes.ok) {
      throw new Error(`Discord API responded with status: ${tokenRes.status}`);
    }

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      throw new Error("Failed to get Discord access token");
    }

    // Получение данных пользователя
    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { 
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'YourApp/1.0'
      },
    });

    if (!userRes.ok) {
      throw new Error(`Discord user API responded with status: ${userRes.status}`);
    }

    const discordUser = await userRes.json();

    // Валидация данных от Discord
    if (!discordUser.id || !discordUser.email) {
      throw new Error("Invalid user data from Discord");
    }

    const email = sanitizeInput(discordUser.email).toLowerCase();
    const discordId = discordUser.id;
    const username = sanitizeInput(discordUser.username);
    const globalName = sanitizeInput(discordUser.global_name || discordUser.username);

    // Поиск или создание пользователя в транзакции
    const user = await prisma.$transaction(async (tx: PrismaClient) => {
      let user = await tx.user.findFirst({
        where: { discordId: discordId }
      });

      if (!user) {
        user = await tx.user.findFirst({
          where: { email: email }
        });
      }

      if (!user) {
        // Создаем нового пользователя
        const randomPassword = generateSecureToken(32);
        const hashedPassword = await hashPassword(randomPassword);
        
        user = await tx.user.create({
          data: {
            name: globalName,
            nickname: username,
            email: email,
            discordId: discordId,
            password: hashedPassword,
            lastLogin: new Date(),
            loginAttempts: 0,
            isActive: true
          },
        });
      } else if (!user.discordId) {
        // Привязываем Discord к существующему аккаунту
        user = await tx.user.update({
          where: { id: user.id },
          data: { 
            discordId: discordId,
            lastLogin: new Date()
          },
        });
      } else {
        // Обновляем время последнего логина
        user = await tx.user.update({
          where: { id: user.id },
          data: { 
            lastLogin: new Date()
          },
        });
      }

      return user;
    });

    // Создаем сессию
    const sessionToken = generateSecureToken(64);
    await prisma.session.create({
      data: {
        userId: user.id,
        token: await hashPassword(sessionToken),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        ipAddress: clientIP,
        userAgent: req.get('User-Agent')?.substring(0, 500) || 'unknown'
      }
    });

    // Очищаем state cookie
    res.clearCookie('oauth_state');

    return res.redirect(`${process.env.FRONTEND_URL}/dashboard?token=${sessionToken}`);
    
  } catch (err: unknown) {
    console.error("Discord OAuth error:", err);
    
    securityLogger.logSuspiciousActivity('oauth_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP
    });
    
    res.status(500).send("OAuth authentication failed");
  }
});

// ==================== ЛОГАУТ ====================

router.post("/logout", async (req, res) => {
  const { sessionToken } = req.body;
  
  if (!sessionToken) {
    return res.status(400).json({ error: "Session token required" });
  }

  try {
    const tokenHash = await hashPassword(sessionToken);
    await prisma.session.deleteMany({
      where: { token: tokenHash }
    });

    res.json({ success: true, message: "Logged out successfully" });
  } catch (err: unknown) {
    console.error("Logout error:", err);
    res.status(500).json({ error: "Logout failed" });
  }
});

export default router;