import express from "express";
import argon2 from "argon2";
import { PrismaClient, Prisma } from "@prisma/client"; // Добавлен Prisma
import crypto from "crypto";
import validator from "validator";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { securityLogger } from "../../utils/securityLogger";
import { generateToken, verifyToken } from "@/utils/jwt";



if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
  console.error('Missing Discord OAuth environment variables');
  console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
  console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);
}

const router = express.Router();
const prisma = new PrismaClient();

// ==================== ЗАЩИТА ОТ SQL-ИНЪЕКЦИЙ ====================

const sqlInjectionPatterns = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|ALTER|CREATE|TRUNCATE)\b)/i,
  /('|"|`|--|#|\/\*|\*\/|;|\|)/,
  /(\b(OR|AND)\s+['"]?[0-9]+\s*=\s*[0-9]+\b)/i,
  /(WAITFOR\s+DELAY|SLEEP\s*\(\s*[0-9]+\s*\))/i,
  /(xp_cmdshell|sp_configure|@@version)/i
];

const detectSQLInjection = (input: string): boolean => {
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
};

const secureSanitizeInput = (input: string, fieldName: string, ip: string): string => {
  const trimmed = validator.trim(input);
  const escaped = validator.escape(trimmed);

  if (detectSQLInjection(input) || detectSQLInjection(trimmed)) {
    securityLogger.logSuspiciousActivity('sql_injection_attempt', {
      field: fieldName,
      originalInput: input.substring(0, 100),
      sanitizedInput: escaped.substring(0, 100),
      ip: ip,
      timestamp: new Date().toISOString()
    });
  }

  return escaped;
};

const sqlInjectionProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIP = getClientIP(req);

  if (req.query) {
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && detectSQLInjection(value)) {
        securityLogger.logSuspiciousActivity('sql_injection_query', {
          parameter: key,
          value: value.substring(0, 50),
          ip: clientIP,
          url: req.originalUrl
        });
        return res.status(400).json({ error: "Invalid request parameters" });
      }
    }
  }

  if (req.body && typeof req.body === 'object') {
    const suspiciousFields = checkObjectForSQLInjection(req.body, clientIP);
    if (suspiciousFields.length > 0) {
      securityLogger.logSuspiciousActivity('sql_injection_body', {
        fields: suspiciousFields,
        ip: clientIP,
        url: req.originalUrl
      });
      return res.status(400).json({ error: "Invalid request data" });
    }
  }

  next();
};

const checkObjectForSQLInjection = (obj: any, ip: string, path: string = ''): string[] => {
  const suspiciousFields: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;

    if (typeof value === 'string') {
      if (detectSQLInjection(value)) {
        suspiciousFields.push(currentPath);
      }
    } else if (typeof value === 'object' && value !== null) {
      suspiciousFields.push(...checkObjectForSQLInjection(value, ip, currentPath));
    }
  }

  return suspiciousFields;
};

router.use(sqlInjectionProtection);

// ==================== ИНТЕРФЕЙСЫ ДЛЯ ТИПИЗАЦИИ ====================

interface UserBasic {
  id: number;
  nickname: string;
  email: string;
}

interface UserAuth {
  id: number;
  name: string;
  nickname: string;
  email: string;
  password: string;
  discordId: string | null;
  createdAt: Date;
  loginAttempts: number;
  lockedUntil: Date | null;
  isActive: boolean;
}

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

    // ИСПРАВЛЕННАЯ ТРАНЗАКЦИЯ
    const existingUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return await tx.user.findFirst({
        where: {
          OR: [
            { email: sanitizedEmail },
            { nickname: sanitizedNickname }
          ]
        },
        select: { id: true, email: true, nickname: true }
      });
    }) as UserBasic | null; // Явная типизация

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

    // ИСПРАВЛЕННАЯ ТРАНЗАКЦИЯ
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const user = await tx.user.findFirst({
        where: {
          OR: [
            { email: sanitizedIdentifier.toLowerCase() },
            { nickname: sanitizedIdentifier }
          ]
        }
      }) as UserAuth | null;

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

        // Если аккаунт заблокирован
        if (lockedUntil) {
          securityLogger.logSuspiciousActivity('account_locked', {
            userId: user.id,
            attempts: newAttempts,
            ip: clientIP,
            userAgent
          });

          await constantTimeDelay();
          return res.status(423).json({
            error: "Account temporarily locked due to too many failed attempts. Please try again in 30 minutes.",
            retryAfter: 1800 // 30 минут в секундах
          });
        }

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

// ==================== DISCORD OAUTH УЛУЧШЕННАЯ РЕАЛИЗАЦИЯ ====================

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  global_name?: string;
  avatar?: string;
  email: string;
  verified: boolean;
}

// Генерация состояния для OAuth
const generateOAuthState = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Хранение состояний OAuth (в продакшене используйте Redis)
const oauthStates = new Map<string, { ip: string; timestamp: number }>();

// Очистка просроченных состояний каждые 5 минут
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now - data.timestamp > 10 * 60 * 1000) { // 10 минут
      oauthStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

// Discord OAuth initiation
router.get("/oauth/discord", (req, res) => {
  const clientIP = getClientIP(req);
  const state = generateOAuthState();

  // Сохраняем состояние с IP и временем
  oauthStates.set(state, {
    ip: clientIP,
    timestamp: Date.now()
  });

  const discordParams = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID!,
    redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    response_type: 'code',
    scope: 'identify email',
    state: state,
  });

  const authUrl = `https://discord.com/api/oauth2/authorize?${discordParams.toString()}`;

  res.json({
    success: true,
    authUrl: authUrl,
    state: state
  });
});

// Discord OAuth callback - УЛУЧШЕННАЯ ВЕРСИЯ
router.get("/oauth/discord/callback", async (req, res) => {
  const { code, state } = req.query;
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';

  if (!code || typeof code !== 'string') {
    securityLogger.logSuspiciousActivity('oauth_missing_code', {
      ip: clientIP,
      state: state
    });
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_oauth_request`);
  }

  const stateData = oauthStates.get(state as string);
  if (!stateData) {
    securityLogger.logSuspiciousActivity('oauth_invalid_state', {
      ip: clientIP,
      providedState: state
    });
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=invalid_state`);
  }

  if (stateData.ip !== clientIP) {
    securityLogger.logSuspiciousActivity('oauth_ip_mismatch', {
      expectedIp: stateData.ip,
      actualIp: clientIP,
      state: state
    });
  }

  oauthStates.delete(state as string);

  try {
    // 1) exchange code -> token
    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID!,
        client_secret: process.env.DISCORD_CLIENT_SECRET!,
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: process.env.DISCORD_REDIRECT_URI!,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Discord token API error: ${tokenResponse.status} - ${errorText}`);
    }
    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error('No access token received from Discord');

    // 2) get discord user
    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
        'User-Agent': 'YourApp/1.0 (+https://yourapp.com)'
      },
    });
    if (!userResponse.ok) throw new Error(`Discord user API error: ${userResponse.status}`);
    const discordUser: DiscordUser = await userResponse.json();

    if (!discordUser.id || !discordUser.email) throw new Error('Invalid user data from Discord');

    // sanitize etc.
    const email = sanitizeInput(discordUser.email).toLowerCase();
    const discordId = discordUser.id;
    const username = sanitizeInput(discordUser.username);
    const globalName = sanitizeInput(discordUser.global_name || discordUser.username);
    const displayName = globalName || username;

    // 3) transaction: ищем/создаём пользователя
    const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 3.a. Найти по discordId
      let foundUser = await tx.user.findFirst({ where: { discordId } });

      if (foundUser) {
        const profileRow = await tx.profile.findFirst({ where: { userId: foundUser.id } });
        const isProfileComplete = Boolean(foundUser.name && foundUser.email && profileRow?.firstName);

        const updatedUser = await tx.user.update({
          where: { id: foundUser.id },
          data: {
            lastLogin: new Date(),
            loginAttempts: 0,
            lockedUntil: null
          }
        });

        return {
          id: updatedUser.id,
          requiresCompletion: !isProfileComplete,
          email: updatedUser.email,
          name: updatedUser.name
        };
      }

      // 3.b. Найти по email (привязать discord)
      foundUser = await tx.user.findFirst({
        where: {
          email,
          discordId: null
        }
      });

      if (foundUser) {
        const updated = await tx.user.update({
          where: { id: foundUser.id },
          data: {
            discordId,
            lastLogin: new Date(),
            loginAttempts: 0,
            lockedUntil: null
          }
        });
        const profileRow = await tx.profile.findFirst({ where: { userId: updated.id } });
        const isProfileComplete = Boolean(updated.name && updated.email && profileRow?.firstName);
        return {
          id: updated.id,
          requiresCompletion: !isProfileComplete,
          email: updated.email,
          name: updated.name
        };
      }

      // 3.c. Создать нового пользователя
      const randomPassword = generateSecureToken(32);
      const hashedPassword = await hashPassword(randomPassword);

      const baseNickname = username.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 15);
      let uniqueNickname = baseNickname;
      let counter = 1;
      while (await tx.user.findFirst({ where: { nickname: uniqueNickname } })) {
        uniqueNickname = `${baseNickname}_${counter}`;
        counter++;
        if (counter > 100) {
          uniqueNickname = `discord_${discordId.substring(0, 8)}`;
          break;
        }
      }

      const createdUser = await tx.user.create({
        data: {
          name: displayName,
          nickname: uniqueNickname,
          email,
          discordId,
          password: hashedPassword,
          emailVerified: discordUser.verified || false,
          lastLogin: new Date(),
          loginAttempts: 0,
          isActive: true
        }
      });

      await tx.profile.create({
        data: {
          userId: createdUser.id,
          firstName: '',
          lastName: '',
          dateOfBirth: null,
          avatar: discordUser.avatar ? `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null
        }
      });

      return {
        id: createdUser.id,
        requiresCompletion: true,
        email: createdUser.email,
        name: createdUser.name
      };
    });

    // 4) ГЕНЕРИРУЕМ JWT ТОКЕН вместо session token
    const jwtToken = generateToken({
      userId: txResult.id,
      email: txResult.email,
      name: txResult.name
    });

    // 5) Редирект с JWT токеном
    let redirectPath = txResult.requiresCompletion ? '/complete-profile' : '/dashboard';
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}${redirectPath}`);
    redirectUrl.searchParams.set('token', jwtToken); // Используем JWT
    redirectUrl.searchParams.set('userId', txResult.id.toString());
    redirectUrl.searchParams.set('method', 'discord');
    redirectUrl.searchParams.set('requiresCompletion', txResult.requiresCompletion.toString());

    return res.redirect(redirectUrl.toString());

  } catch (err) {
    securityLogger.logError('oauth_discord_callback_error', {
      error: (err as Error).message,
      ip: clientIP
    });
    return res.redirect(`${process.env.FRONTEND_URL}/login?error=oauth_failed`);
  }
});

// ==================== ПРОВЕРКА СТАТУСА DISCORD АУТЕНТИФИКАЦИИ ====================

router.get("/oauth/discord/status", async (req, res) => {
  const { userId } = req.query;

  if (!userId) {
    return res.status(400).json({ error: "User ID required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId as string) },
      select: { discordId: true, email: true }
    });

    res.json({
      hasDiscord: !!user?.discordId,
      email: user?.email
    });
  } catch (error) {
    console.error('Discord status check error:', error);
    res.status(500).json({ error: "Status check failed" });
  }
});

router.get("/users/:userId/basic", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = parseInt(req.params.userId);

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Верифицируем JWT токен вместо проверки сессии
    const decoded = verifyToken(token);

    // Проверяем, что userId в токене совпадает с запрошенным
    if (decoded.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        nickname: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error('User info fetch error:', error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

// ==================== ОТВЯЗКА DISCORD АККАУНТА ====================

router.post("/oauth/discord/disconnect", async (req, res) => {
  const { userId, password } = req.body; // Требуем пароль для безопасности

  if (!userId || !password) {
    return res.status(400).json({ error: "User ID and password required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { id: parseInt(userId) }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Проверяем пароль для безопасности
    if (!user.password || !(await verifyPassword(user.password, password))) {
      return res.status(401).json({ error: "Invalid password" });
    }

    // Не позволяем отвязать Discord, если это единственный метод входа
    if (!user.password) {
      return res.status(400).json({
        error: "Cannot disconnect Discord. Please set a password first."
      });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { discordId: null }
    });

    res.json({
      success: true,
      message: "Discord account disconnected successfully"
    });

  } catch (error) {
    console.error('Discord disconnect error:', error);
    res.status(500).json({ error: "Disconnect failed" });
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

router.post("/complete-profile", async (req, res) => {
  const clientIP = getClientIP(req);
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    // Проверяем сессию
    const tokenHash = await hashPassword(token);
    const session = await prisma.session.findFirst({
      where: {
        token: tokenHash,
        expiresAt: { gt: new Date() }
      },
      include: { user: true }
    });

    if (!session) {
      return res.status(401).json({ error: "Invalid or expired session" });
    }

    const { firstName, lastName, dateOfBirth, phone, country, city } = req.body;

    // Валидация
    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: "First name and last name are required" });
    }

    // Обновляем профиль пользователя
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: `${firstName.trim()} ${lastName.trim()}`,
      }
    });

    // Upsert профиля отдельно
    await prisma.profile.upsert({
      where: { userId: session.user.id }, // предполагается уникальный индекс по userId
      create: {
        userId: session.user.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        profileCompleted: true
      },
      update: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        phone: phone?.trim() || null,
        country: country?.trim() || null,
        city: city?.trim() || null,
        profileCompleted: true
      }
    });

    securityLogger.logAuthAttempt(session.user.email, true, {
      userId: session.user.id,
      action: 'profile_completed',
      ip: clientIP
    });

    res.json({
      success: true,
      message: "Profile completed successfully"
    });

  } catch (error) {
    console.error('Profile completion error:', error);
    res.status(500).json({ error: "Failed to complete profile" });
  }
});

export default router;