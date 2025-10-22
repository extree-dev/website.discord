import express from "express";
import argon2 from "argon2";
import { PrismaClient, Prisma } from "@prisma/client"; // Добавлен Prisma
import crypto from "crypto";
import validator from "validator";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { securityLogger } from "../../utils/securityLogger";
import { generateToken, verifyToken } from "@/utils/jwt";
import { secretCodeService } from "@/utils/secretCodes";
import { CommandLogger } from "../services/commandLogger";

if (!process.env.DISCORD_CLIENT_ID || !process.env.DISCORD_REDIRECT_URI) {
  console.error('Missing Discord OAuth environment variables');
  console.log('DISCORD_CLIENT_ID:', process.env.DISCORD_CLIENT_ID);
  console.log('DISCORD_REDIRECT_URI:', process.env.DISCORD_REDIRECT_URI);
}

const router = express.Router();
const prisma = new PrismaClient();
const failedAttempts = new Map();


// ==================== КЭШ ДЛЯ ПОЛЬЗОВАТЕЛЕЙ DISCORD ====================

const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

async function fetchUserWithCache(userId: string) {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const userResponse = await fetch(`https://discord.com/api/v10/users/${userId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (userResponse.ok) {
      const userData = await userResponse.json();
      userCache.set(userId, {
        data: userData,
        timestamp: Date.now()
      });
      return userData;
    }
  } catch (error) {
    console.error(`Error fetching user ${userId}:`, error);
  }

  return null;
}


const bruteForceProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = getClientIP(req);
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 минут

  if (!failedAttempts.has(ip)) {
    failedAttempts.set(ip, { count: 0, lastAttempt: now });
  }

  const attempts = failedAttempts.get(ip)!;

  // Сбрасываем счетчик если окно истекло
  if (now - attempts.lastAttempt > windowMs) {
    attempts.count = 0;
  }

  attempts.count++;
  attempts.lastAttempt = now;

  if (attempts.count > 10) {
    securityLogger.logSuspiciousActivity('brute_force_detected', {
      ip,
      attempts: attempts.count,
      userAgent: req.get('User-Agent'),
      path: req.path
    });

    // Блокируем IP на 1 час
    failedAttempts.set(ip, {
      count: attempts.count,
      lastAttempt: now,
      blockedUntil: now + (60 * 60 * 1000)
    });

    return res.status(429).json({
      error: "Too many failed attempts. IP blocked for 1 hour."
    });
  }

  // Проверяем блокировку
  if (attempts.blockedUntil && now < attempts.blockedUntil) {
    return res.status(429).json({
      error: "IP temporarily blocked. Try again later."
    });
  }

  next();
};

router.use("/login", bruteForceProtection);
router.use("/register", bruteForceProtection);
router.use("/oauth/discord", bruteForceProtection);

// ==================== ЗАЩИТА ОТ SQL-ИНЪЕКЦИЙ ====================

const advancedSQLInjectionPatterns = [
  /(\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT)\b)/i,
  /(EXEC\s*\(|EXECUTE\s*\(|sp_executesql)/i,
  /(WAITFOR\s+DELAY\s+'[0-9]+:[0-9]+:[0-9]+')/i,
  /(\b(SLEEP|BENCHMARK)\s*\(\s*[0-9]+\s*\))/i,
  /(\/\*![0-9]+\s*)/, // MySQL conditional comments
  /(CHAR\s*\(\s*[0-9\s,]+\))/i, // CHAR injection
  /(LOAD_FILE\s*\(|INTO\s+OUTFILE|INTO\s+DUMPFILE)/i,
  /(\b(IF|CASE|WHEN)\b.*\bTHEN\b)/i
];

const detectAdvancedSQLInjection = (input: string): boolean => {
  return [...advancedSQLInjectionPatterns, ...advancedSQLInjectionPatterns]
    .some(pattern => pattern.test(input));
};

const secureSanitizeInput = (input: string, fieldName: string, ip: string): string => {
  const trimmed = validator.trim(input);
  const escaped = validator.escape(trimmed);

  if (detectAdvancedSQLInjection(input) || detectAdvancedSQLInjection(trimmed)) {
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
      if (typeof value === 'string' && detectAdvancedSQLInjection(value)) {
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

    // ИСКЛЮЧЕНИЯ для полей секретных кодов
    if ((key === 'code' || key === 'secretCode') && typeof value === 'string') {
      // Разрешаем только буквы, цифры, дефисы и подчеркивания в верхнем регистре
      const codeRegex = /^[A-Z0-9\-_]+$/;
      if (!codeRegex.test(value)) {
        suspiciousFields.push(currentPath);
      }
      continue; // Пропускаем обычную проверку SQL-инъекций для кодов
    }

    if (typeof value === 'string') {
      if (detectAdvancedSQLInjection(value)) {
        suspiciousFields.push(currentPath);
      }
    } else if (typeof value === 'object' && value !== null) {
      suspiciousFields.push(...checkObjectForSQLInjection(value, ip, currentPath));
    }
  }

  return suspiciousFields;
};

router.use(sqlInjectionProtection);

const deepSanitize = (obj: any): any => {
  if (typeof obj === 'string') {
    // Удаляем потенциально опасные символы
    return validator.escape(
      validator.trim(
        obj.replace(/[<>]/g, '') // Удаляем < и >
      )
    );
  }
  if (Array.isArray(obj)) {
    return obj.map(deepSanitize);
  }
  if (typeof obj === 'object' && obj !== null) {
    return Object.keys(obj).reduce((acc, key) => {
      acc[key] = deepSanitize(obj[key]);
      return acc;
    }, {} as any);
  }
  return obj;
};

const sanitizeRequestData = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    // Санитизация body
    if (req.body && typeof req.body === 'object') {
      req.body = deepSanitize(req.body);
    }

    // Санитизация query параметров (без перезаписи req.query)
    if (req.query && typeof req.query === 'object') {
      const originalQuery = { ...req.query };
      const sanitizedQuery: any = {};

      for (const [key, value] of Object.entries(originalQuery)) {
        sanitizedQuery[key] = deepSanitize(value);
      }

      // Создаем прокси для безопасного доступа
      req.query = new Proxy(sanitizedQuery, {
        get(target, prop) {
          return target[prop as string];
        },
        set() {
          return false; // Запрещаем изменение
        }
      });
    }

    next();
  } catch (error) {
    console.error('Sanitization error:', error);
    next();
  }
};

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

interface UserWithProfile {
  id: number;
  name: string;
  nickname: string;
  email: string;
  password: string | null;
  discordId: string | null;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  loginAttempts: number;
  lockedUntil: Date | null;
  isActive: boolean;
  profile: {
    id: number;
    userId: number;
    firstName: string | null;
    lastName: string | null;
    avatar: string | null;
    discordRole: string | null;
    profileCompleted: boolean;
    sessionId: string | null;
    country: string | null;
    city: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
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

const getDiscordCreationDate = (discordId: string): string => {
  const timestamp = (parseInt(discordId) / 4194304) + 1420070400000;
  return new Date(timestamp).toISOString();
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

// ==================== РЕГИСТРАЦИЯ С СЕКРЕТНЫМИ КОДАМИ ====================

router.post("/register", async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);

  try {
    const { name, nickname, email, password, secretCode } = req.body; // ← Добавлен secretCode

    // ==================== ПРОВЕРКА СЕКРЕТНОГО КОДА ====================
    if (!secretCode) {
      await constantTimeDelay();
      return res.status(400).json({
        error: "Secret registration code is required"
      });
    }

    // Санитизация секретного кода
    const sanitizedSecretCode = validator.escape(validator.trim(secretCode.toUpperCase()));

    if (!/^[A-Z0-9\-_]+$/.test(sanitizedSecretCode)) {
      await constantTimeDelay();
      return res.status(400).json({
        error: "Secret code contains invalid characters"
      });
    }

    // Валидация секретного кода
    const codeValidation = await prisma.secretCode.findFirst({
      where: {
        code: sanitizedSecretCode,
        used: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        uses: { lt: prisma.secretCode.fields.maxUses }
      }
    });

    if (!codeValidation) {
      await constantTimeDelay();
      return res.status(400).json({
        error: "Invalid, expired, or already used registration code"
      });
    }

    // ==================== ОСТАЛЬНЫЕ ПРОВЕРКИ ====================

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

    // ИСПРАВЛЕННАЯ ТРАНЗАКЦИЯ С ОБНОВЛЕНИЕМ СЕКРЕТНОГО КОДА
    const result = await prisma.$transaction(async (tx) => {
      // Проверка уникальности пользователя
      const existingUser = await tx.user.findFirst({
        where: {
          OR: [
            { email: sanitizedEmail },
            { nickname: sanitizedNickname }
          ]
        },
        select: { id: true, email: true, nickname: true }
      });

      if (existingUser) {
        const field = existingUser.email === sanitizedEmail ? "email" : "nickname";
        securityLogger.logSuspiciousActivity('duplicate_registration_attempt', {
          email: sanitizedEmail,
          nickname: sanitizedNickname,
          ip: clientIP,
          secretCode: sanitizedSecretCode
        });
        throw new Error(`User with this ${field} already exists`);
      }

      // Хеширование пароля
      const hashedPassword = await hashPassword(password);

      // Создание пользователя
      const user = await tx.user.create({
        data: {
          name: sanitizedName,
          nickname: sanitizedNickname,
          email: sanitizedEmail,
          password: hashedPassword,
          registrationCodeUsed: sanitizedSecretCode // Сохраняем использованный код
        },
        select: {
          id: true,
          name: true,
          nickname: true,
          email: true,
          createdAt: true,
          registrationCodeUsed: true
        }
      });

      // ==================== ОБНОВЛЕНИЕ СЕКРЕТНОГО КОДА ====================

      // Обновляем секретный код
      const updatedCode = await tx.secretCode.update({
        where: {
          id: codeValidation.id,
          used: false // Защита от повторного использования
        },
        data: {
          used: true,
          usedAt: new Date(),
          userId: user.id,
          usedBy: user.id.toString(),
          uses: { increment: 1 }
        }
      });

      if (!updatedCode) {
        throw new Error("Failed to update secret code - may have been already used");
      }

      return user;
    });

    securityLogger.logAuthAttempt(sanitizedEmail, true, {
      type: 'registration',
      ip: clientIP,
      userId: result.id,
      secretCode: sanitizedSecretCode
    });

    // Постоянное время ответа
    const elapsed = Date.now() - startTime;
    await constantTimeDelay(Math.max(0, 500 - elapsed));

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      user: result
    });

  } catch (err: unknown) {
    console.error("Registration error:", err);

    // Логирование безопасности
    securityLogger.logSuspiciousActivity('registration_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP
    });

    await constantTimeDelay();

    // Обработка ошибок Prisma и пользовательских ошибок
    if (err instanceof Error) {
      if (err.message.includes('already exists')) {
        return res.status(409).json({
          error: err.message
        });
      }

      if (err.message.includes('secret code')) {
        return res.status(400).json({
          error: "Secret code is invalid or has already been used"
        });
      }

      if ('code' in err) {
        const prismaError = err as { code: string };

        if (prismaError.code === 'P2002') {
          return res.status(409).json({
            error: "User with this email or nickname already exists"
          });
        }

        if (prismaError.code === 'P2025') {
          return res.status(400).json({
            error: "Secret code is invalid or has already been used"
          });
        }
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

interface DiscordRole {
  id: string;
  name: string;
  color: number;
  position: number;
}

const DISCORD_SERVER_ID = '1343586237868544052';

// Обновленная функция для получения ролей с цветами
const getUserDiscordRolesWithColors = async (accessToken: string, discordId: string): Promise<DiscordRole[]> => {
  try {
    // Получаем информацию о участнике сервера
    const response = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/members/${discordId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        return []; // Пользователь не на сервере
      }
      throw new Error(`Discord API error: ${response.status}`);
    }

    const memberData = await response.json();
    const roleIds = memberData.roles || [];

    // Если нет ролей, возвращаем пустой массив
    if (roleIds.length === 0) {
      return [];
    }

    // Получаем все роли сервера
    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${DISCORD_SERVER_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!rolesResponse.ok) {
      throw new Error(`Discord roles API error: ${rolesResponse.status}`);
    }

    const serverRoles: DiscordRole[] = await rolesResponse.json();

    // Находим роли пользователя с их цветами
    const userRoles = serverRoles
      .filter((role: DiscordRole) => roleIds.includes(role.id))
      .map((role: DiscordRole) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position
      }));

    return userRoles;

  } catch (error) {
    console.error('Error fetching Discord roles:', error);
    return []; // Fallback - пустой массив
  }
};

// Обновленная функция для получения высшей роли с цветом
const getHighestRoleWithColor = (userRoles: DiscordRole[]): { name: string; color: number } => {
  if (userRoles.length === 0) {
    return { name: '@everyone', color: 0 }; // Черный цвет по умолчанию
  }

  // Сортируем роли по позиции (чем выше позиция, тем выше роль в иерархии)
  const sortedRoles = userRoles.sort((a, b) => b.position - a.position);
  const highestRole = sortedRoles[0];

  return {
    name: highestRole.name,
    color: highestRole.color
  };
};

// Функция для преобразования Discord color в HEX
const discordColorToHex = (color: number): string => {
  if (!color || color === 0) return '#99AAB5'; // Discord default gray

  // Discord color - десятичное число, нужно преобразовать в HEX
  const hex = color.toString(16).padStart(6, '0');
  return `#${hex}`;
};

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
      securityLogger.logSuspiciousActivity('discord_token_api_error', {
        status: tokenResponse.status,
        error: errorText,
        ip: clientIP
      });
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

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      securityLogger.logSuspiciousActivity('discord_user_api_error', {
        status: userResponse.status,
        error: errorText,
        ip: clientIP
      });
      throw new Error(`Discord user API error: ${userResponse.status} - ${errorText}`);
    }

    const discordUser: DiscordUser = await userResponse.json();

    const discordCreatedAt = getDiscordCreationDate(discordUser.id);

    if (!discordUser.id || !discordUser.email) {
      securityLogger.logSuspiciousActivity('discord_invalid_user_data', {
        ip: clientIP,
        hasId: !!discordUser.id,
        hasEmail: !!discordUser.email
      });
      throw new Error('Invalid user data from Discord - missing id or email');
    }

    // 3) Получаем роли пользователя с цветами
    let userRoles: DiscordRole[] = [];
    let highestRole = '@everyone';
    let roleColor = 0;
    let roleHexColor = '#99AAB5';

    try {
      userRoles = await getUserDiscordRolesWithColors(tokenData.access_token, discordUser.id);

      if (userRoles.length > 0) {
        const roleData = getHighestRoleWithColor(userRoles);
        highestRole = roleData.name;
        roleColor = roleData.color;
        roleHexColor = discordColorToHex(roleColor);
      } else {
      }
    } catch (roleError) {
      console.error('Failed to fetch user roles:', roleError);
    }

    // sanitize etc.
    const email = sanitizeInput(discordUser.email).toLowerCase();
    const discordId = discordUser.id;
    const username = sanitizeInput(discordUser.username);
    const globalName = sanitizeInput(discordUser.global_name || discordUser.username);
    const displayName = globalName || username;

    // Создаем URL аватара
    const avatarUrl = discordUser.avatar ?
      `https://cdn.discordapp.com/avatars/${discordId}/${discordUser.avatar}.png` : null;

    // 5) transaction: ищем/создаём пользователя
    const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 3.a. Найти по discordId
      let foundUser = await tx.user.findFirst({
        where: { discordId },
        include: { profile: true }
      }) as UserWithProfile | null;

      if (foundUser) {

        // ОБНОВЛЯЕМ ПРОФИЛЬ с ролью Discord для существующего пользователя
        await tx.profile.upsert({
          where: { userId: foundUser.id },
          create: {
            userId: foundUser.id,
            firstName: '',
            lastName: '',
            avatar: avatarUrl,
            discordRole: highestRole,
            profileCompleted: false
          },
          update: {
            avatar: avatarUrl,
            discordRole: highestRole
          }
        });

        const isProfileComplete = Boolean(foundUser.name && foundUser.email && foundUser.profile?.firstName);

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
          name: updatedUser.name,
          discordId: updatedUser.discordId,
          avatar: avatarUrl,
          highestRole: highestRole,
          roleColor: roleColor,
          roleHexColor: roleHexColor,
          allRoles: userRoles.map(r => r.name)
        };
      }

      // 3.b. Найти по email (привязать discord)
      foundUser = await tx.user.findFirst({
        where: {
          email,
          discordId: null
        },
        include: { profile: true }
      }) as UserWithProfile | null;

      if (foundUser) {

        // ОБНОВЛЯЕМ ПРОФИЛЬ с ролью Discord для существующего пользователя
        await tx.profile.upsert({
          where: { userId: foundUser.id },
          create: {
            userId: foundUser.id,
            firstName: '',
            lastName: '',
            avatar: avatarUrl,
            discordRole: highestRole,
            profileCompleted: false
          },
          update: {
            avatar: avatarUrl,
            discordRole: highestRole
          }
        });

        const updated = await tx.user.update({
          where: { id: foundUser.id },
          data: {
            discordId,
            lastLogin: new Date(),
            loginAttempts: 0,
            lockedUntil: null
          }
        });

        const isProfileComplete = Boolean(updated.name && updated.email && foundUser.profile?.firstName);
        return {
          id: updated.id,
          requiresCompletion: !isProfileComplete,
          email: updated.email,
          name: updated.name,
          discordId: updated.discordId,
          avatar: avatarUrl,
          highestRole: highestRole,
          roleColor: roleColor,
          roleHexColor: roleHexColor,
          allRoles: userRoles.map(r => r.name)
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

      // Создаем профиль с аватаром и ролью Discord
      await tx.profile.create({
        data: {
          userId: createdUser.id,
          firstName: '',
          lastName: '',
          avatar: avatarUrl,
          discordRole: highestRole,
          profileCompleted: false
        }
      });

      return {
        id: createdUser.id,
        requiresCompletion: true,
        email: createdUser.email,
        name: createdUser.name,
        discordId: createdUser.discordId,
        avatar: avatarUrl,
        highestRole: highestRole,
        roleColor: roleColor,
        roleHexColor: roleHexColor,
        allRoles: userRoles.map(r => r.name)
      };
    });

    const savedProfile = await prisma.profile.findFirst({
      where: { userId: txResult.id },
      select: { discordRole: true }
    });

    // 6) ГЕНЕРИРУЕМ JWT ТОКЕН с ролью и цветом
    const jwtToken = generateToken({
      userId: txResult.id,
      email: txResult.email,
      name: txResult.name,
      role: txResult.highestRole,
      roleColor: txResult.roleColor,
      roleHexColor: txResult.roleHexColor,
      allRoles: txResult.allRoles,
      avatar: txResult.avatar
    });

    // 7) Редирект с JWT токеном
    let redirectPath = txResult.requiresCompletion ? '/complete-profile' : '/dashboard';
    const redirectUrl = new URL(`${process.env.FRONTEND_URL}${redirectPath}`);
    redirectUrl.searchParams.set('token', jwtToken);
    redirectUrl.searchParams.set('userId', txResult.id.toString());
    redirectUrl.searchParams.set('method', 'discord');
    redirectUrl.searchParams.set('requiresCompletion', txResult.requiresCompletion.toString());

    return res.redirect(redirectUrl.toString());

  } catch (err) {
    console.error('Discord OAuth callback error:', err);
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

// ==================== ОБНОВЛЕННЫЙ ЭНДПОИНТ ДЛЯ ПОЛУЧЕНИЯ ДАННЫХ ПОЛЬЗОВАТЕЛЯ ====================

router.get("/users/:userId/basic", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = parseInt(req.params.userId);

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    if (decoded.userId !== userId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const user = await prisma.user.findFirst({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        nickname: true,
        discordId: true,
        emailVerified: true,
        profile: {
          select: {
            avatar: true,
            discordRole: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const discordCreatedAt = user.discordId ? getDiscordCreationDate(user.discordId) : null;

    // Получаем роль из токена с цветом
    const highestRole = user.profile?.discordRole || decoded.role || '@everyone';
    const roleColor = decoded.roleColor || 0;
    const roleHexColor = decoded.roleHexColor || '#99AAB5';

    const response = {
      id: user.id,
      name: user.name,
      email: user.email,
      nickname: user.nickname,
      discordId: user.discordId,
      emailVerified: user.emailVerified,
      discordCreatedAt: discordCreatedAt,
      avatar: user.profile?.avatar,
      highestRole: highestRole,
      roleColor: roleColor,
      roleHexColor: roleHexColor
    };

    res.json(response);

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

// ==================== ПОЛУЧЕНИЕ РОЛЕЙ СЕРВЕРА ДЛЯ ПРАВ ДОСТУПА ====================

router.get("/server/roles", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    // Получаем пользователя чтобы проверить его Discord ID
    const user = await prisma.user.findFirst({
      where: { id: decoded.userId },
      select: { discordId: true }
    });

    if (!user || !user.discordId) {
      return res.status(403).json({ error: "User not connected to Discord" });
    }

    // Получаем роли сервера через Discord API
    const serverRoles = await fetchServerRolesWithPermissions();

    res.json({
      success: true,
      roles: serverRoles,
      serverId: process.env.DISCORD_GUILD_ID
    });

  } catch (error) {
    console.error('Server roles fetch error:', error);
    res.status(500).json({ error: "Failed to fetch server roles" });
  }
});

// ==================== СИСТЕМНАЯ СТАТИСТИКА ====================

router.get("/system-stats", async (req, res) => {
  try {
    // Текущая дата
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Запросы к базе данных
    const totalUsers = await prisma.user.count();

    const usersToday = await prisma.user.count({
      where: { createdAt: { gte: today } }
    });

    const usersYesterday = await prisma.user.count({
      where: {
        createdAt: {
          gte: yesterday,
          lt: today
        }
      }
    });

    // Статистика секретных кодов
    const totalCodes = await prisma.secretCode.count();
    const usedCodes = await prisma.secretCode.count({
      where: { used: true }
    });

    // КОЛИЧЕСТВО ЗАРЕГИСТРИРОВАННЫХ КОМАНД БОТА ИЗ БАЗЫ ДАННЫХ
    let registeredCommandsCount = 0;
    let commandStats = { today: 0, total: 0 };

    try {
      console.log('🔄 Fetching registered commands from database...');

      // Получаем количество команд ИЗ БАЗЫ ДАННЫХ
      registeredCommandsCount = await prisma.botCommand.count({
        where: { enabled: true }
      });

      console.log(`✅ Database has ${registeredCommandsCount} registered commands`);

    } catch (error) {
      console.log('⚠️ Database commands unavailable, using API fallback:', String(error));

      // Fallback: запрашиваем у API бота
      try {
        const botResponse = await fetch('http://localhost:3002/api/bot/commands');
        if (botResponse.ok) {
          const botData = await botResponse.json();
          registeredCommandsCount = botData.totalCommands || 0;
        }
      } catch (apiError) {
        console.log('Using default command count');
        registeredCommandsCount = 7; // Стандартное количество команд
      }
    }

    // Статистика использования команд (опционально)
    try {
      const commandsToday = await prisma.commandStats.count({
        where: { timestamp: { gte: today } }
      });

      const commandsTotal = await prisma.commandStats.count();

      commandStats = {
        today: commandsToday,
        total: commandsTotal
      };
    } catch (dbError) {
      console.log('Command stats DB unavailable');
    }

    // Получаем статус бота
    let botServers = 1;
    try {
      const botStatusResponse = await fetch('http://localhost:3002/api/bot/status');
      if (botStatusResponse.ok) {
        const botStatus = await botStatusResponse.json();
        botServers = botStatus.totalServers || 1;
      }
    } catch (error) {
      console.log('Bot status unavailable, using default');
    }

    // Расчет процента роста пользователей
    const growthPercentage = usersYesterday > 0
      ? Math.round((usersToday / usersYesterday - 1) * 100)
      : usersToday > 0 ? 100 : 0;

    const stats = {
      users: {
        total: totalUsers,
        active: await prisma.user.count({
          where: {
            lastLogin: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            }
          }
        }),
        newToday: usersToday,
        growthPercentage: growthPercentage
      },
      secretCodes: {
        total: totalCodes,
        used: usedCodes,
        available: totalCodes - usedCodes
      },
      commands: commandStats,
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      },
      totalServers: botServers,
      totalCommands: registeredCommandsCount, // ← КОЛИЧЕСТВО ЗАРЕГИСТРИРОВАННЫХ КОМАНД
      performance: {
        cpu: 45,
        memory: 65,
        network: 25,
        storage: 80
      }
    };

    res.json(stats);

  } catch (error) {
    console.error('System stats error:', error);
    res.status(500).json({
      error: "Failed to fetch system statistics",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
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

// ==================== ЗАВЕРШЕНИЕ ПРОФИЛЯ ====================

router.post("/complete-profile", async (req, res) => {
  const clientIP = getClientIP(req);
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    const userId = decoded.userId;

    const user = await prisma.user.findFirst({
      where: { id: userId },
      include: { profile: true }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const { firstName, country, city, secretCode, password } = req.body; // ← добавлен password

    // Валидация
    if (!firstName?.trim()) {
      return res.status(400).json({ error: "First name is required" });
    }

    if (!secretCode?.trim()) {
      return res.status(400).json({ error: "Secret registration code is required" });
    }

    // Валидация пароля (если предоставлен)
    if (password) {
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: passwordValidation.error });
      }
    }

    // Проверяем валидность кода
    const codeValidation = await prisma.secretCode.findFirst({
      where: {
        code: secretCode.toUpperCase(),
        used: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ],
        AND: [
          { uses: { lt: prisma.secretCode.fields.maxUses } }
        ]
      }
    });

    if (!codeValidation) {
      return res.status(400).json({ error: "Invalid or expired secret code" });
    }

    const sessionId = 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);

    // Хешируем пароль если он предоставлен
    let hashedPassword = user.password;
    if (password) {
      hashedPassword = await hashPassword(password);
    }

    // Обновляем пользователя с возможным новым паролем
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: firstName.trim(),
        registrationCodeUsed: secretCode.toUpperCase(),
        password: hashedPassword // ← обновляем пароль если предоставлен
      }
    });

    // Upsert профиля
    await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        firstName: firstName.trim(),
        country: country?.trim() || null,
        city: city?.trim() || null,
        sessionId: sessionId,
        profileCompleted: true,
        discordRole: user.profile?.discordRole || null
      },
      update: {
        firstName: firstName.trim(),
        country: country?.trim() || null,
        city: city?.trim() || null,
        sessionId: sessionId,
        profileCompleted: true
      }
    });

    // Обновляем секретный код как использованный
    try {
      const usedCode = await prisma.secretCode.update({
        where: {
          code: secretCode.toUpperCase(),
          used: false
        },
        data: {
          used: true,
          usedBy: user.email,
          usedAt: new Date(),
          uses: { increment: 1 },
          userId: user.id,
        }
      });
    } catch (codeError) {
      console.error('Error updating secret code:', codeError);
      securityLogger.logError('secret_code_update_error', {
        userId: user.id,
        code: secretCode,
        error: codeError instanceof Error ? codeError.message : 'Unknown error'
      });
    }

    securityLogger.logAuthAttempt(user.email, true, {
      userId: user.id,
      action: 'profile_completed',
      ip: clientIP,
      sessionId: sessionId,
      secretCode: secretCode,
      passwordSet: !!password // ← логируем установку пароля
    });

    res.json({
      success: true,
      message: "Profile completed successfully",
      passwordSet: !!password // ← информируем фронтенд
    });

  } catch (error: any) {
    console.error('Profile completion error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    res.status(500).json({ error: "Failed to complete profile" });
  }
});

// ==================== СЕКРЕТНЫЕ КОДЫ ====================

// Получение всех секретных кодов
router.get("/secret-codes", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    // Проверяем токен
    const decoded = verifyToken(token);

    // Параметры запроса
    const includeUser = req.query.include === 'user';
    const usedFilter = req.query.used;

    // Строим условия where
    let whereCondition: any = {};

    if (usedFilter === 'true') {
      whereCondition.used = true;
    } else if (usedFilter === 'false') {
      whereCondition.used = false;
    }

    const codes = await prisma.secretCode.findMany({
      where: whereCondition,
      include: {
        user: includeUser ? {
          select: {
            id: true,
            email: true,
            name: true,
            nickname: true,
            discordId: true,
            createdAt: true
          }
        } : false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Форматируем ответ
    const formattedCodes = codes.map(code => ({
      id: code.id,
      code: code.code,
      createdBy: code.createdBy,
      createdAt: code.createdAt,
      used: code.used,
      usedBy: code.usedBy,
      usedAt: code.usedAt,
      expiresAt: code.expiresAt,
      maxUses: code.maxUses,
      uses: code.uses,
      userId: code.userId,
      user: code.user || null
    }));

    res.json(formattedCodes);

  } catch (error: unknown) {
    console.error('❌ Error fetching secret codes:', error);

    // Детальная обработка ошибок
    if (error instanceof Error) {
      if (error.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: "Invalid token" });
      }

      if (error.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Token expired" });
      }
    }

    res.status(500).json({
      error: "Internal server error",
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.message : undefined
    });
  }
});

// Создание секретного кода
router.post("/secret-codes", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);
    const { code, expiresAt, maxUses } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    // Валидация формата кода
    const codeRegex = /^[A-Z0-9\-_]+$/;
    if (!codeRegex.test(code.toUpperCase())) {
      return res.status(400).json({ error: "Code can only contain uppercase letters, numbers, hyphens and underscores" });
    }

    const secretCode = await prisma.secretCode.create({
      data: {
        code: code.toUpperCase(),
        createdBy: decoded.name || decoded.email || 'System',
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || 1,
        userId: decoded.userId
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            nickname: true,
            discordId: true,
            createdAt: true
          }
        }
      }
    });
    res.status(201).json(secretCode);

  } catch (error: unknown) {
    console.error('❌ Error creating secret code:', error);

    // Проверяем Prisma ошибки
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2002') {
        return res.status(409).json({ error: "Code already exists" });
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Удаление секретного кода
router.delete("/secret-codes/:id", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const { id } = req.params;

    await prisma.secretCode.delete({
      where: { id }
    });
    res.json({ success: true, message: "Code deleted successfully" });

  } catch (error: unknown) {
    console.error('❌ Error deleting secret code:', error);

    // Проверяем Prisma ошибки
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        return res.status(404).json({ error: "Code not found" });
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Генерация случайного кода
router.post("/secret-codes/generate", async (req, res) => {
  try {

    const generateCode = () => {
      const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let result = "";
      for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
        if ((i + 1) % 4 === 0 && i !== 11) result += "-";
      }
      return result;
    };

    const code = generateCode();

    res.json({ code });

  } catch (error: unknown) {
    console.error("❌ Error generating code:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Валидация секретного кода
router.post("/validate-secret-code", async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        error: 'Secret code is required'
      });
    }

    const sanitizedCode = code.toUpperCase().trim();

    const secretCode = await prisma.secretCode.findFirst({
      where: {
        code: sanitizedCode,
        used: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        user: {
          select: {
            email: true,
            name: true,
            nickname: true,
            discordId: true,
            createdAt: true
          }
        }
      }
    });

    if (!secretCode) {
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired secret code'
      });
    }

    // Проверяем максимальное количество использований
    if (secretCode.uses >= secretCode.maxUses) {
      return res.status(400).json({
        valid: false,
        error: 'Secret code has reached maximum usage limit'
      });
    }
    res.json({
      valid: true,
      code: {
        id: secretCode.id,
        code: secretCode.code,
        createdBy: secretCode.createdBy,
        expiresAt: secretCode.expiresAt,
        maxUses: secretCode.maxUses,
        uses: secretCode.uses,
        user: secretCode.user
      }
    });

  } catch (error: unknown) {
    console.error('❌ Error validating secret code:', error);
    res.status(500).json({
      valid: false,
      error: 'Internal server error'
    });
  }
});

// Отметка кода как использованного
router.post('/use-secret-code', async (req, res) => {
  try {
    const { codeId, usedBy } = req.body;

    if (!codeId) {
      return res.status(400).json({ error: 'Code ID is required' });
    }

    const updatedCode = await prisma.secretCode.update({
      where: { id: codeId },
      data: {
        used: true,
        usedBy: usedBy || 'Unknown',
        usedAt: new Date(),
        uses: { increment: 1 }
      }
    });
    res.json({ success: true, code: updatedCode });

  } catch (error: unknown) {
    console.error('❌ Error using secret code:', error);

    // Проверяем Prisma ошибки
    if (error instanceof Error && 'code' in error) {
      const prismaError = error as { code: string };
      if (prismaError.code === 'P2025') {
        return res.status(404).json({ error: "Code not found" });
      }
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Получение статистики по кодам
router.get("/secret-codes/stats", async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const decoded = verifyToken(token);

    const totalCodes = await prisma.secretCode.count();
    const usedCodes = await prisma.secretCode.count({ where: { used: true } });
    const activeCodes = await prisma.secretCode.count({
      where: {
        used: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });
    const expiredCodes = await prisma.secretCode.count({
      where: {
        used: false,
        expiresAt: { lt: new Date() }
      }
    });

    const stats = {
      total: totalCodes,
      used: usedCodes,
      active: activeCodes,
      expired: expiredCodes,
      usageRate: totalCodes > 0 ? (usedCodes / totalCodes) * 100 : 0
    };
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching secret codes stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DISCORD SERVER DATA API ====================

// Проверка наличия бота на сервере
router.get("/discord/bot-status", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    // ✅ ИСПРАВЛЕНО: используем GUILD_ID вместо SERVER_ID
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    // Проверяем подключение к Discord API
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    const botStatus = {
      isOnServer: response.ok,
      serverName: null as string | null,
      serverId: GUILD_ID, // ✅ Используем GUILD_ID
      lastChecked: new Date().toISOString()
    };

    if (response.ok) {
      const guildData = await response.json();
      botStatus.serverName = guildData.name;
    } else {
    }

    res.json(botStatus);

  } catch (error) {
    console.error('Bot status check error:', error);
    res.json({
      isOnServer: false,
      serverName: null,
      serverId: process.env.DISCORD_GUILD_ID, // ✅ Используем GUILD_ID
      lastChecked: new Date().toISOString(),
      error: "Failed to check bot status"
    });
  }
});

// Получение статистики сервера - ОБНОВЛЕННАЯ ВЕРСИЯ
router.get("/discord/server-stats", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    // ✅ ИСПРАВЛЕНО: используем GUILD_ID и with_counts=true
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}?with_counts=true`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!guildResponse.ok) {
      console.log(`❌ Discord API error: ${guildResponse.status}`);
      return res.status(404).json({ error: "Bot is not on the server or server not found" });
    }

    const guildData = await guildResponse.json();

    // Получаем список участников для точного подсчета онлайн
    const membersResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let onlineMembers = 0;
    if (membersResponse.ok) {
      const members = await membersResponse.json();
      // Считаем реальных онлайн участников
      onlineMembers = members.filter((member: any) =>
        member.status === 'online' || member.status === 'idle' || member.status === 'dnd'
      ).length;
    }

    // Получаем список каналов
    const channelsResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/channels`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    let channels = [];
    if (channelsResponse.ok) {
      channels = await channelsResponse.json();
    }

    // Считаем текстовые и голосовые каналы
    const textChannels = channels.filter((channel: any) => channel.type === 0).length;
    const voiceChannels = channels.filter((channel: any) => channel.type === 2).length;

    const stats = {
      server: {
        name: guildData.name,
        id: guildData.id,
        icon: guildData.icon ? `https://cdn.discordapp.com/icons/${guildData.id}/${guildData.icon}.png` : null,
        owner: guildData.owner_id,
        created: guildData.created_at ? new Date(guildData.created_at).toISOString() : new Date().toISOString()
      },
      members: {
        total: guildData.approximate_member_count || 0,
        online: guildData.approximate_presence_count || onlineMembers, // Используем approximate_presence_count если есть
        offline: (guildData.approximate_member_count || 0) - (guildData.approximate_presence_count || onlineMembers)
      },
      channels: {
        total: channels.length,
        text: textChannels,
        voice: voiceChannels
      },
      boosts: guildData.premium_subscription_count || 0,
      tier: guildData.premium_tier || 0,
      lastUpdated: new Date().toISOString()
    };

    res.json(stats);

  } catch (error) {
    console.error('❌ Server stats fetch error:', error);

    let errorMessage = "Failed to fetch server statistics";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
    }

    res.status(500).json({
      error: errorMessage,
      details: "Check bot permissions and server connectivity"
    });
  }
});

// Получение активности модерации (заглушка - в реальности нужно брать из БД)
router.get("/discord/moderation-activity", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    // Здесь должна быть логика получения данных модерации из вашей БД
    // Пока возвращаем mock данные
    const mockActivities = [
      { user: "Alex", action: "banned", target: "@spammer123", time: "2 min ago", status: "success" },
      { user: "Maria", action: "muted", target: "@toxic_user", time: "5 min ago", status: "success" },
      { user: "John", action: "warned", target: "@rule_breaker", time: "12 min ago", status: "warning" },
      { user: "Sarah", action: "kicked", target: "@advertiser", time: "25 min ago", status: "success" },
      { user: "Mike", action: "cleared", target: "#general (50 messages)", time: "1 hour ago", status: "success" }
    ];

    const mockCommands = [
      { name: "/ban", usage: 45, success: 98 },
      { name: "/mute", usage: 32, success: 95 },
      { name: "/warn", usage: 28, success: 92 },
      { name: "/clear", usage: 25, success: 100 },
      { name: "/kick", usage: 18, success: 96 }
    ];

    res.json({
      recentActivities: mockActivities,
      commandStats: mockCommands,
      period: '24h',
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Moderation activity fetch error:', error);
    res.status(500).json({ error: "Failed to fetch moderation activity" });
  }
});

// Получение ролей сервера для статистики
router.get("/discord/server-roles", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    const rolesResponse = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_CLIENT_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!rolesResponse.ok) {
      return res.status(404).json({ error: "Failed to fetch server roles" });
    }

    const roles = await rolesResponse.json();

    // Фильтруем и форматируем роли
    const formattedRoles = roles
      .filter((role: any) => !role.managed && role.name !== '@everyone')
      .sort((a: any, b: any) => b.position - a.position)
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        memberCount: 0, // Нужно считать из members
        permissions: role.permissions
      }));

    res.json({
      roles: formattedRoles,
      total: formattedRoles.length
    });

  } catch (error) {
    console.error('Server roles fetch error:', error);
    res.status(500).json({ error: "Failed to fetch server roles" });
  }
});

// Получение количества модераторов по ролям
router.get("/discord/moderator-stats", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    // ID ролей модераторов (замени на реальные ID ролей твоего сервера)
    const moderatorRoleIds = [
      '1399388382492360908', // Chief Administrator
      '1375122633930178621', // Bot Developer (если это модераторская роль)
      // Добавь другие ID ролей модераторов
    ];

    let activeModerators = 0;

    // Получаем список участников с ролями
    const membersResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/members?limit=1000`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (membersResponse.ok) {
      const members = await membersResponse.json();

      // Считаем участников с модераторскими ролями
      activeModerators = members.filter((member: any) => {
        return member.roles.some((roleId: string) => moderatorRoleIds.includes(roleId));
      }).length;

    }

    res.json({
      activeModerators,
      moderatorRoles: moderatorRoleIds,
      lastUpdated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Moderator stats error:', error);
    res.status(500).json({
      error: "Failed to fetch moderator statistics",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Эндпоинт для получения audit log через Discord Bot
router.get("/discord/audit-logs", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    if (!GUILD_ID) {
      return res.status(500).json({ error: "Server configuration error" });
    }

    const limit = parseInt(req.query.limit as string) || 10; // По умолчанию 10 записей

    // Обращаемся к Discord Bot вместо прямого Discord API
    const botResponse = await fetch(`http://localhost:3002/api/audit-logs?limit=${limit}&guildId=${GUILD_ID}`, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let auditData;

    if (!botResponse.ok) {
      const errorText = await botResponse.text();
      console.error('Bot API error:', botResponse.status, errorText);
      // Fallback: получаем из БД если бот недоступен
      auditData = {
        recentActivities: await getAuditLogsFromDB(limit),
        source: 'database-fallback'
      };
    } else {
      auditData = await botResponse.json();
    }

    // ТРАНСФОРМИРУЕМ ДАННЫЕ ДЛЯ ФРОНТЕНДА
    const transformedActivities = auditData.recentActivities.map((activity: any) => ({
      id: activity.id,
      user: activity.user,
      userName: activity.userName,
      action: transformActionForFrontend(activity.action, activity.actionType),
      target: activity.target,
      targetName: activity.targetName,
      targetType: activity.targetType,
      reason: activity.reason,
      time: activity.time,
      timestamp: activity.timestamp,
      status: activity.status,
      details: activity.details
    }));

    res.json({
      recentActivities: transformedActivities,
      total: transformedActivities.length,
      generatedAt: auditData.generatedAt || new Date().toISOString(),
      source: auditData.source || 'bot-transformed'
    });

  } catch (error) {
    console.error('Audit log fetch error:', error);
    // Fallback на данные из БД
    const dbLogs = await getAuditLogsFromDB(10);
    res.json({
      recentActivities: dbLogs,
      total: dbLogs.length,
      generatedAt: new Date().toISOString(),
      source: 'database-error-fallback'
    });
  }
});

// Эндпоинт для статистики команд через Sentinel бота
router.get("/discord/command-stats", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const period = req.query.period as string || '24h';
    const filter = req.query.filter as string || 'all';

    // Пробуем получить данные от бота
    let botData: any;
    try {
      // Создаем AbortController для таймаута
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const botResponse = await fetch(`http://localhost:3002/stats/commands?period=${period}&filter=${filter}`, {
        headers: {
          'Authorization': `Bearer ${process.env.SENTINEL_API_SECRET || process.env.API_SECRET}`
        },
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (botResponse.ok) {
        botData = await botResponse.json();
      } else {
        throw new Error(`Bot API responded with status: ${botResponse.status}`);
      }
    } catch (botError: unknown) {
      const errorMessage = botError instanceof Error ? botError.message : 'Unknown error';
      console.log('❌ Bot API unavailable:', errorMessage);

      // Используем демо-данные, но помечаем их явно
      botData = await getDemoCommandStats(period, filter);
      botData.source = 'demo-fallback';
    }

    // Простое форматирование без сложных вычислений
    const formattedStats = botData.commands.map((cmd: any) => ({
      id: cmd.name || cmd.id,
      name: cmd.name,
      usage: cmd.usage || 0,
      success: cmd.success || Math.round((cmd.usage || 0) * (cmd.successRate / 100)),
      failures: (cmd.usage || 0) - (cmd.success || 0),
      successRate: cmd.successRate || 0,
      avgResponseTime: cmd.avgResponseTime || 0,
      type: cmd.type || cmd.category || 'utility',
      lastUsed: cmd.lastUsed || getTimeAgo(),
      description: cmd.description || ''
    }));

    // Рассчитываем общую статистику
    const totalCommands = formattedStats.reduce((sum: number, cmd: any) => sum + cmd.usage, 0);
    const averageSuccessRate = formattedStats.length > 0
      ? Math.round(formattedStats.reduce((sum: number, cmd: any) => sum + cmd.successRate, 0) / formattedStats.length)
      : 0;

    // Определяем источник данных
    const dataSource = botData.source || 'bot';

    res.json({
      commands: formattedStats,
      period: period,
      filter: filter,
      totalCommands: totalCommands,
      averageSuccessRate: averageSuccessRate,
      generatedAt: new Date().toISOString(),
      source: dataSource,
      note: dataSource === 'demo-fallback' ? 'Using demo data - check bot connection' : 'Live data from bot'
    });

  } catch (error) {
    console.error('💥 Error in command-stats endpoint:', error);
    res.status(500).json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : 'Unknown error',
      source: 'error'
    });
  }
});

// Упрощенный эндпоинт для логирования (пока)
router.post("/discord/log-command", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const { command, success = true, executionTime = 0 } = req.body;

    // Пока просто логируем в консоль
    // Позже подключим базу данных

    res.json({
      success: true,
      message: "Command usage logged",
      loggedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Command log error:', error);
    res.status(500).json({
      error: "Failed to log command usage",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Эндпоинт для очистки старых логов
router.post("/discord/cleanup-logs", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const { days = 90 } = req.body;

    const deletedCount = await CommandLogger.cleanupOldLogs(days);

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old command logs`,
      deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      error: "Failed to cleanup logs",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

router.get("/bot/servers", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    // Пробуем получить данные от бота
    let botData;
    try {
      // Используем AbortController для таймаута вместо свойства timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const botResponse = await fetch('http://localhost:3002/api/bot/servers', {
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (botResponse.ok) {
        botData = await botResponse.json();
      } else {
        throw new Error(`Bot API responded with status: ${botResponse.status}`);
      }
    } catch (botError) {
      console.log('Bot API unavailable, using fallback data');
      // Fallback данные если бот недоступен
      botData = {
        success: false,
        totalServers: 1, // Минимальное значение
        servers: [],
        source: 'fallback'
      };
    }

    // Форматируем ответ для фронтенда
    const response = {
      totalServers: botData.totalServers || 0,
      servers: botData.servers || [],
      isOnline: botData.success !== false,
      lastUpdated: new Date().toISOString(),
      source: botData.source || 'bot'
    };

    res.json(response);

  } catch (error) {
    console.error('Bot servers fetch error:', error);
    res.status(500).json({
      error: "Failed to fetch bot servers",
      totalServers: 0,
      servers: [],
      isOnline: false
    });
  }
});

// Эндпоинт для статуса бота
router.get("/bot/status", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: "Authentication required" });
  }

  try {
    const decoded = verifyToken(token);

    let botStatus;
    try {
      // Используем AbortController для таймаута
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);

      const botResponse = await fetch('http://localhost:3002/api/bot/status', {
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (botResponse.ok) {
        botStatus = await botResponse.json();
      } else {
        throw new Error('Bot not responding');
      }
    } catch (error) {
      botStatus = {
        success: false,
        isReady: false,
        totalServers: 0,
        totalUsers: 0,
        uptime: 0,
        ping: -1
      };
    }

    // Форматируем для фронтенда
    const status = {
      isOnServer: botStatus.success && botStatus.totalServers > 0,
      totalServers: botStatus.totalServers || 0,
      isReady: botStatus.isReady || false,
      uptime: botStatus.uptime || 0,
      ping: botStatus.ping || -1,
      lastChecked: new Date().toISOString(),
      serverName: botStatus.serverName || 'Discord Server' // Добавляем serverName
    };

    res.json(status);

  } catch (error) {
    console.error('Bot status check error:', error);
    res.json({
      isOnServer: false,
      totalServers: 0,
      isReady: false,
      uptime: 0,
      ping: -1,
      lastChecked: new Date().toISOString(),
      serverName: 'Discord Server'
    });
  }
});

async function processRoleUpdate(entry: any, fullAuditData: any) {
  let targetName = 'Unknown User';
  let action = 'updated roles for';
  const details: any = { type: 'role_update', changes: [] };

  targetName = await getTargetName(entry.target_id);

  if (entry.changes && entry.changes.length > 0) {
    for (const change of entry.changes) {
      if (change.key === '$add' && Array.isArray(change.new_value)) {
        for (const roleData of change.new_value) {
          const roleName = await getRoleName(roleData.id) || 'Unknown Role';
          details.changes.push({ type: 'added', roleName, roleId: roleData.id });
        }
      } else if (change.key === '$remove' && Array.isArray(change.new_value)) {
        for (const roleData of change.new_value) {
          const roleName = await getRoleName(roleData.id) || 'Unknown Role';
          details.changes.push({ type: 'removed', roleName, roleId: roleData.id });
        }
      }
    }

    const addedRoles = details.changes.filter((c: any) => c.type === 'added');
    const removedRoles = details.changes.filter((c: any) => c.type === 'removed');

    if (addedRoles.length > 0 && removedRoles.length > 0) {
      action = `updated roles for`;
    } else if (addedRoles.length > 0) {
      const roleNames = addedRoles.map((r: any) => r.roleName).join(', ');
      action = `added roles ${roleNames} to`;
    } else if (removedRoles.length > 0) {
      const roleNames = removedRoles.map((r: any) => r.roleName).join(', ');
      action = `removed roles ${roleNames} from`;
    }
  }

  return { targetName, action, details };
}

// Вспомогательные функции
async function getTargetName(targetId: string) {
  if (!targetId) return 'Unknown';
  try {
    const userData = await fetchUserWithCache(targetId);
    if (userData) {
      return userData.global_name || userData.username || `User${targetId}`;
    }
  } catch (error) {
    console.error(`Error getting target name for ${targetId}:`, error);
  }
  return 'Unknown';
}

async function getChannelName(channelId: string) {
  if (!channelId) return 'Unknown';
  try {
    const channelResponse = await fetch(`https://discord.com/api/v10/channels/${channelId}`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    if (channelResponse.ok) {
      const channelData = await channelResponse.json();
      return channelData.name ? `#${channelData.name}` : 'channel';
    }
  } catch (error) {
    console.error(`Error getting channel name for ${channelId}:`, error);
  }
  return 'channel';
}

async function getRoleName(roleId: string): Promise<string | null> {
  try {
    const GUILD_ID = process.env.DISCORD_GUILD_ID;
    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    if (response.ok) {
      const roles = await response.json();
      const role = roles.find((r: any) => r.id === roleId);
      return role ? role.name : null;
    }
  } catch (error) {
    console.error(`Error fetching role ${roleId}:`, error);
  }
  return null;
}

// Функция для получения логов из БД
async function getAuditLogsFromDB(limit: number) {
  try {
    const logs = await prisma.auditLog.findMany({
      take: limit,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        action: true,
        actionType: true,
        userId: true,
        userName: true,
        targetId: true,
        targetName: true,
        targetType: true,
        reason: true,
        timestamp: true,
        changes: true,
        extra: true
      }
    });

    // Форматируем для фронтенда
    return logs.map(log => ({
      id: log.id,
      user: log.userId,
      userName: log.userName,
      action: log.action,
      target: log.targetId,
      targetName: log.targetName,
      targetType: log.targetType,
      reason: log.reason,
      time: formatTimeAgo(new Date(log.timestamp)),
      timestamp: log.timestamp.toISOString(),
      status: 'success',
      details: {
        changes: log.changes,
        extra: log.extra
      }
    }));

  } catch (error) {
    console.error('Error getting logs from DB:', error);
    return [];
  }
}

// Функция для получения ролей сервера с Discord API
async function fetchServerRolesWithPermissions(): Promise<any[]> {
  try {
    const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    if (!BOT_TOKEN || !GUILD_ID) {
      throw new Error('Bot token or guild ID not configured');
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    const roles = await response.json();

    // Фильтруем и сортируем роли
    return roles
      .filter((role: any) => !role.managed && role.name !== '@everyone')
      .sort((a: any, b: any) => b.position - a.position)
      .map((role: any) => ({
        id: role.id,
        name: role.name,
        color: role.color,
        position: role.position,
        permissions: role.permissions
      }));

  } catch (error) {
    console.error('Failed to fetch server roles from Discord:', error);
    throw error;
  }
}

// Обновленная функция для преобразования audit log с полным покрытием
async function transformAuditLogToActivities(auditLogEntries: any[], fullAuditData: any, guildId: string) {
  const actions = [];
  const processedEntries = new Set();

  for (const entry of auditLogEntries) {
    try {
      // Пропускаем дубликаты
      if (processedEntries.has(entry.id)) {
        continue;
      }
      processedEntries.add(entry.id);

      // Получаем информацию о модераторе
      let moderatorName = 'Unknown User';
      let moderatorAvatar = null;

      if (entry.user_id) {
        const userData = await fetchUserWithCache(entry.user_id);
        if (userData) {
          moderatorName = userData.global_name || userData.username || `User${entry.user_id}`;
          moderatorAvatar = userData.avatar ?
            `https://cdn.discordapp.com/avatars/${entry.user_id}/${userData.avatar}.png` : null;
        } else {
        }
      }

      // Получаем информацию о действии
      const actionInfo = getEnhancedActionType(entry.action_type);
      let targetName = 'Unknown';
      let targetType = 'user';
      let reason = entry.reason || 'No reason provided';
      let details = {};
      let finalAction = actionInfo.action;

      // Обрабатываем разные типы действий согласно Discord API
      switch (entry.action_type) {
        // GUILD
        case 1: // GUILD_UPDATE
          targetName = 'server';
          targetType = 'guild';
          details = { type: 'guild_update' };
          break;

        // CHANNEL
        case 10: // CHANNEL_CREATE
          targetName = entry.options?.name || 'New Channel';
          targetType = 'channel';
          details = { type: 'channel_create' };
          break;

        case 11: // CHANNEL_UPDATE
          targetName = await getChannelName(entry.target_id) || 'Unknown Channel';
          targetType = 'channel';
          details = { type: 'channel_update' };
          break;

        case 12: // CHANNEL_DELETE
          targetName = entry.options?.name || 'Deleted Channel';
          targetType = 'channel';
          details = { type: 'channel_delete' };
          break;

        // MEMBER
        case 20: // MEMBER_KICK
          targetName = await getTargetName(entry.target_id);
          details = { type: 'kick' };
          break;

        case 22: // MEMBER_BAN_ADD
          targetName = await getTargetName(entry.target_id);
          details = { type: 'ban' };
          break;

        case 23: // MEMBER_BAN_REMOVE
          targetName = await getTargetName(entry.target_id);
          details = { type: 'unban' };
          break;

        case 24: // MEMBER_UPDATE
        case 25: // MEMBER_ROLE_UPDATE
          const roleUpdateResult = await processRoleUpdate(entry, fullAuditData);
          targetName = roleUpdateResult.targetName;
          finalAction = roleUpdateResult.action;
          details = roleUpdateResult.details;
          break;

        case 26: // MEMBER_MOVE
          targetName = await getTargetName(entry.target_id);
          details = { type: 'member_move' };
          break;

        case 27: // MEMBER_DISCONNECT
          targetName = await getTargetName(entry.target_id);
          details = { type: 'member_disconnect' };
          break;

        // ROLE
        case 30: // ROLE_CREATE
          targetName = entry.options?.name || 'New Role';
          targetType = 'role';
          details = { type: 'role_create' };
          break;

        case 31: // ROLE_UPDATE
          targetName = await getRoleName(entry.target_id) || 'Unknown Role';
          targetType = 'role';
          details = { type: 'role_update' };
          break;

        case 32: // ROLE_DELETE
          targetName = entry.options?.name || 'Deleted Role';
          targetType = 'role';
          details = { type: 'role_delete' };
          break;

        // MESSAGE
        case 72: // MESSAGE_DELETE
          const channelName = await getChannelName(entry.target_id);
          targetName = channelName || 'Unknown Channel';
          targetType = 'channel';
          details = {
            type: 'message_delete',
            count: entry.options?.count || 1,
            channelId: entry.target_id
          };
          finalAction = `deleted ${entry.options?.count || 'multiple'} messages in ${targetName}`;
          break;

        case 73: // MESSAGE_BULK_DELETE
          targetName = await getChannelName(entry.target_id) || 'Unknown Channel';
          targetType = 'channel';
          details = {
            type: 'message_bulk_delete',
            count: entry.options?.count || 'multiple',
            channelId: entry.target_id
          };
          break;

        case 74: // MESSAGE_PIN
          targetName = await getChannelName(entry.target_id) || 'Unknown Channel';
          targetType = 'channel';
          details = { type: 'message_pin' };
          break;

        case 75: // MESSAGE_UNPIN
          targetName = await getChannelName(entry.target_id) || 'Unknown Channel';
          targetType = 'channel';
          details = { type: 'message_unpin' };
          break;

        // DEFAULT - для неизвестных типов
        default:
          targetName = await getTargetName(entry.target_id) || await getChannelName(entry.target_id) || await getRoleName(entry.target_id) || 'Unknown Target';
          details = { type: 'other', action_type: entry.action_type };
          break;
      }

      // ПРАВИЛЬНЫЙ расчет timestamp из Snowflake ID
      const timestamp = extractTimestampFromSnowflake(entry.id);

      actions.push({
        id: entry.id,
        user: entry.user_id,
        userName: moderatorName,
        userAvatar: moderatorAvatar,
        action: finalAction,
        actionType: entry.action_type,
        target: entry.target_id,
        targetName: targetName,
        targetType: targetType,
        reason: reason,
        time: formatTimeAgo(timestamp),
        timestamp: timestamp.toISOString(),
        status: 'success',
        details: details,
        changes: entry.changes || []
      });

    } catch (error) {
      console.error('❌ Error processing audit log entry:', error);
    }
  }

  // Сортируем по времени (новые сначала)
  const sortedActions = actions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  return sortedActions;
}

// Обновленная функция для определения типов действий
function getEnhancedActionType(actionType: number) {
  const actionTypes: { [key: number]: { action: string, category: string } } = {
    // GUILD
    1: { action: 'updated server', category: 'server' },

    // CHANNEL
    10: { action: 'created channel', category: 'channel' },
    11: { action: 'updated channel', category: 'channel' },
    12: { action: 'deleted channel', category: 'channel' },
    13: { action: 'created channel permission', category: 'channel' },
    14: { action: 'updated channel permission', category: 'channel' },
    15: { action: 'deleted channel permission', category: 'channel' },

    // MEMBER
    20: { action: 'kicked member', category: 'moderation' },
    21: { action: 'pruned members', category: 'moderation' },
    22: { action: 'banned member', category: 'moderation' },
    23: { action: 'unbanned member', category: 'moderation' },
    24: { action: 'updated member', category: 'member' },
    25: { action: 'updated member roles', category: 'roles' },
    26: { action: 'moved member', category: 'voice' },
    27: { action: 'disconnected member', category: 'voice' },
    28: { action: 'updated voice state', category: 'voice' },

    // ROLE
    30: { action: 'created role', category: 'roles' },
    31: { action: 'updated role', category: 'roles' },
    32: { action: 'deleted role', category: 'roles' },

    // MESSAGE
    72: { action: 'deleted message', category: 'messages' },
    73: { action: 'bulk deleted messages', category: 'messages' },
    74: { action: 'pinned message', category: 'messages' },
    75: { action: 'unpinned message', category: 'messages' },

    // INTEGRATION
    80: { action: 'created integration', category: 'integration' },
    81: { action: 'updated integration', category: 'integration' },
    82: { action: 'deleted integration', category: 'integration' },

    // STAGE_INSTANCE
    83: { action: 'created stage', category: 'stage' },
    84: { action: 'updated stage', category: 'stage' },
    85: { action: 'deleted stage', category: 'stage' },

    // STICKER
    90: { action: 'created sticker', category: 'sticker' },
    91: { action: 'updated sticker', category: 'sticker' },
    92: { action: 'deleted sticker', category: 'sticker' },

    // THREAD
    110: { action: 'created thread', category: 'thread' },
    111: { action: 'updated thread', category: 'thread' },
    112: { action: 'deleted thread', category: 'thread' },
  };

  return actionTypes[actionType] || { action: 'performed action', category: 'other' };
}

// Функция для трансформации действий для фронтенда согласно Discord API
function transformActionForFrontend(action: string, actionType: string | number): string {
  // Если действие уже нормальное, возвращаем как есть
  if (action !== 'performed action') {
    return action;
  }

  // Нормализуем actionType в число
  const actionTypeNum = typeof actionType === 'string' ? parseInt(actionType) : actionType;

  // Полная карта действий согласно Discord API Documentation
  // https://discord.com/developers/docs/resources/audit-log#audit-log-entry-object-audit-log-events
  const auditLogActionMap: { [key: number]: string } = {
    // GUILD
    1: 'updated server', // GUILD_UPDATE

    // CHANNEL
    10: 'created channel', // CHANNEL_CREATE
    11: 'updated channel', // CHANNEL_UPDATE
    12: 'deleted channel', // CHANNEL_DELETE
    13: 'created channel permission', // CHANNEL_OVERWRITE_CREATE
    14: 'updated channel permission', // CHANNEL_OVERWRITE_UPDATE
    15: 'deleted channel permission', // CHANNEL_OVERWRITE_DELETE

    // MEMBER
    20: 'kicked member', // MEMBER_KICK
    21: 'pruned members', // MEMBER_PRUNE
    22: 'banned member', // MEMBER_BAN_ADD
    23: 'unbanned member', // MEMBER_BAN_REMOVE
    24: 'updated member', // MEMBER_UPDATE
    25: 'updated member roles', // MEMBER_ROLE_UPDATE
    26: 'moved member', // MEMBER_MOVE
    27: 'disconnected member', // MEMBER_DISCONNECT
    28: 'updated voice state', // VOICE_STATE_UPDATE

    // ROLE
    30: 'created role', // ROLE_CREATE
    31: 'updated role', // ROLE_UPDATE
    32: 'deleted role', // ROLE_DELETE

    // INVITE
    40: 'created invite', // INVITE_CREATE
    41: 'updated invite', // INVITE_UPDATE
    42: 'deleted invite', // INVITE_DELETE

    // WEBHOOK
    50: 'created webhook', // WEBHOOK_CREATE
    51: 'updated webhook', // WEBHOOK_UPDATE
    52: 'deleted webhook', // WEBHOOK_DELETE

    // EMOJI
    60: 'created emoji', // EMOJI_CREATE
    61: 'updated emoji', // EMOJI_UPDATE
    62: 'deleted emoji', // EMOJI_DELETE

    // MESSAGE
    72: 'deleted message', // MESSAGE_DELETE
    73: 'bulk deleted messages', // MESSAGE_BULK_DELETE
    74: 'pinned message', // MESSAGE_PIN
    75: 'unpinned message', // MESSAGE_UNPIN

    // INTEGRATION
    80: 'created integration', // INTEGRATION_CREATE
    81: 'updated integration', // INTEGRATION_UPDATE
    82: 'deleted integration', // INTEGRATION_DELETE

    // STAGE_INSTANCE
    83: 'created stage', // STAGE_INSTANCE_CREATE
    84: 'updated stage', // STAGE_INSTANCE_UPDATE
    85: 'deleted stage', // STAGE_INSTANCE_DELETE

    // STICKER
    90: 'created sticker', // STICKER_CREATE
    91: 'updated sticker', // STICKER_UPDATE
    92: 'deleted sticker', // STICKER_DELETE

    // GUILD_SCHEDULED_EVENT
    100: 'created event', // GUILD_SCHEDULED_EVENT_CREATE
    101: 'updated event', // GUILD_SCHEDULED_EVENT_UPDATE
    102: 'deleted event', // GUILD_SCHEDULED_EVENT_DELETE

    // THREAD
    110: 'created thread', // THREAD_CREATE
    111: 'updated thread', // THREAD_UPDATE
    112: 'deleted thread', // THREAD_DELETE

    // APPLICATION_COMMAND_PERMISSION
    121: 'updated command permissions', // APPLICATION_COMMAND_PERMISSION_UPDATE

    // AUTO_MODERATION
    140: 'created automod rule', // AUTO_MODERATION_RULE_CREATE
    141: 'updated automod rule', // AUTO_MODERATION_RULE_UPDATE
    142: 'deleted automod rule', // AUTO_MODERATION_RULE_DELETE
    143: 'triggered automod rule', // AUTO_MODERATION_BLOCK_MESSAGE
    144: 'flagged automod message', // AUTO_MODERATION_FLAG_TO_CHANNEL
    145: 'quarantined user', // AUTO_MODERATION_USER_COMMUNICATION_DISABLED

    // CREATOR_MONETIZATION
    150: 'created monetization request', // CREATOR_MONETIZATION_REQUEST_CREATED
    151: 'updated monetization terms', // CREATOR_MONETIZATION_TERMS_ACCEPTED

    // ONBOARDING
    160: 'updated onboarding', // GUILD_ONBOARDING_UPDATE

    // GUILD_HOME
    170: 'updated home settings', // GUILD_HOME_SETTINGS_UPDATE

    // GUILD_DIRECTORY
    180: 'updated directory entry', // GUILD_DIRECTORY_ENTRY_CREATE
    181: 'removed directory entry', // GUILD_DIRECTORY_ENTRY_UPDATE

    // GUILD_INVITES
    190: 'updated invite settings', // GUILD_INVITES_UPDATE
  };

  const result = auditLogActionMap[actionTypeNum] || 'performed action';

  // Отладка для непонятных actionType
  if (result === 'performed action') {
  }

  return result;
}

// Остальные функции без изменений
function extractTimestampFromSnowflake(snowflake: string): Date {
  const discordEpoch = 1420070400000;
  const snowflakeInt = BigInt(snowflake);
  const timestamp = Number(snowflakeInt >> 22n) + discordEpoch;
  return new Date(timestamp);
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diffInSeconds < 60) return 'just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  return date.toLocaleDateString();
}

// Демо-данные с более реалистичными значениями
async function getDemoCommandStats(period: string, filter: string) {
  const demoCommands = [
    // Модерация
    { name: 'multe', description: 'Mute a user', category: 'moderation', baseUsage: 78, baseResponse: 120 },
    { name: 'warn', description: 'Warn a user', category: 'moderation', baseUsage: 120, baseResponse: 86 },
    { name: 'kick', description: 'Kick a user', category: 'moderation', baseUsage: 34, baseResponse: 110 },
    { name: 'ban', description: 'Ban a user', category: 'moderation', baseUsage: 15, baseResponse: 150 },

    // Утилиты
    { name: 'userinfo', description: 'Get user information', category: 'utility', baseUsage: 234, baseResponse: 186 },
    { name: 'serverinfo', description: 'Get server info', category: 'utility', baseUsage: 89, baseResponse: 120 },
    { name: 'avatar', description: 'Get user avatar', category: 'utility', baseUsage: 156, baseResponse: 95 },
    { name: 'help', description: 'Show help', category: 'utility', baseUsage: 342, baseResponse: 75 },
  ];

  // Множитель в зависимости от периода
  const periodMultiplier = {
    '24h': 0.3,
    '7d': 1,
    '30d': 3
  }[period] || 1;

  const commandStats = demoCommands.map(cmd => {
    const usage = Math.max(1, Math.round(cmd.baseUsage * periodMultiplier * (0.9 + Math.random() * 0.2)));
    const successRate = Math.min(100, Math.max(85, 95 - Math.random() * 15));
    const avgResponseTime = Math.round(cmd.baseResponse * (0.8 + Math.random() * 0.4));
    const success = Math.round(usage * (successRate / 100));

    return {
      name: cmd.name,
      usage: usage,
      success: success,
      successRate: Math.round(successRate),
      avgResponseTime: avgResponseTime,
      type: cmd.category,
      lastUsed: getTimeAgo(),
      description: cmd.description
    };
  });

  // Применяем фильтр
  let filteredStats = commandStats;
  if (filter === 'moderation') {
    filteredStats = commandStats.filter(cmd => cmd.type === 'moderation');
  } else if (filter === 'utility') {
    filteredStats = commandStats.filter(cmd => cmd.type === 'utility');
  }

  return {
    commands: filteredStats,
    period: period,
    filter: filter
  };
}

// Улучшенная функция для времени
function getTimeAgo(): string {
  const now = Date.now();
  const times = [
    { diff: 5 * 60 * 1000, text: "5 minutes ago" },
    { diff: 15 * 60 * 1000, text: "15 minutes ago" },
    { diff: 30 * 60 * 1000, text: "30 minutes ago" },
    { diff: 2 * 60 * 60 * 1000, text: "2 hours ago" },
    { diff: 6 * 60 * 60 * 1000, text: "6 hours ago" },
    { diff: 24 * 60 * 60 * 1000, text: "1 day ago" },
    { diff: 2 * 24 * 60 * 60 * 1000, text: "2 days ago" }
  ];

  const randomTime = times[Math.floor(Math.random() * times.length)];
  return randomTime.text;
}


export default router;