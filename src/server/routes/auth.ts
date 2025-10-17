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
const cacheTimeout = 5 * 60 * 1000; // 5 минут

async function fetchUserWithCache(userId: string) {
  if (userCache.has(userId)) {
    const cached = userCache.get(userId);
    if (Date.now() - cached.timestamp < cacheTimeout) {
      return cached.data;
    }
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
      const result = {
        username: userData.username,
        global_name: userData.global_name,
        discriminator: userData.discriminator
      };

      userCache.set(userId, {
        data: result,
        timestamp: Date.now()
      });
      return result;
    } else {
    }
  } catch (error) {
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
      console.log(`❌ Bot is NOT on server. Status: ${response.status}`);
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

// Эндпоинт для получения audit log
router.get("/discord/audit-logs", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const decoded = verifyToken(token);
    const GUILD_ID = process.env.DISCORD_GUILD_ID;

    if (!GUILD_ID) {
      console.error('❌ DISCORD_GUILD_ID is not set in environment variables');
      return res.status(500).json({ error: "Server configuration error" });
    }

    const auditResponse = await fetch(`https://discord.com/api/v10/guilds/${GUILD_ID}/audit-logs?limit=20`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (!auditResponse.ok) {
      const errorText = await auditResponse.text();
      return res.status(auditResponse.status).json({
        error: "Failed to fetch audit logs",
        details: `Discord API returned ${auditResponse.status}: ${errorText}`
      });
    }

    const auditData = await auditResponse.json();
    if (auditData.audit_log_entries && auditData.audit_log_entries.length > 0) {
    }

    const moderationActions = await transformAuditLogToActivities(auditData.audit_log_entries || [], GUILD_ID);

    res.json({
      recentActivities: moderationActions,
      total: moderationActions.length,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Audit log fetch error:', error);
    res.status(500).json({
      error: "Failed to fetch audit logs",
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Функция для преобразования audit log в наш формат
async function transformAuditLogToActivities(auditLogEntries: any[], guildId: string) {
  const actions = [];
  const processedEntries = new Set();

  for (const entry of auditLogEntries) {
    try {
      if (processedEntries.has(entry.id)) continue;
      processedEntries.add(entry.id);

      // Получаем информацию о пользователе
      let userName = 'Unknown';
      if (entry.user_id) {
        const userData = await fetchUserWithCache(entry.user_id);
        if (userData) {
          userName = userData.global_name || userData.username || `User${entry.user_id}`;
        } else {
        }
      }

      const actionInfo = getActionType(entry.action_type);
      let targetName = 'Unknown';
      let reason = entry.reason || 'No reason provided';

      // Обрабатываем разные типы действий
      switch (entry.action_type) {
        case 24: // MEMBER_ROLE_UPDATE (старый)
        case 25: // MEMBER_ROLE_UPDATE (новый)
          await processRoleUpdate(entry, actionInfo);
          targetName = await getTargetName(entry.target_id);
          break;

        case 26: // BOT_ADD
          actionInfo.action = 'added bot';
          targetName = await getTargetName(entry.target_id) || 'bot';
          break;

        case 72: // INTEGRATION_CREATE
          actionInfo.action = 'added integration';
          targetName = entry.options?.name || 'integration';
          break;

        case 28: // MESSAGE_DELETE
          actionInfo.action = 'deleted message in';
          targetName = await getChannelName(entry.target_id) || 'channel';
          break;

        case 31: // UNPIN_MESSAGE
          actionInfo.action = 'unpinned message in';
          targetName = await getChannelName(entry.target_id) || 'channel';
          break;

        default:
          targetName = await getTargetName(entry.target_id);
          break;
      }

      // Правильный расчет timestamp
      const timestamp = new Date(parseInt(entry.id) / 4194304 + 1420070400000);

      actions.push({
        id: entry.id,
        user: entry.user_id,
        userName: userName,
        action: actionInfo.action,
        target: entry.target_id,
        targetName: targetName,
        reason: reason,
        time: formatTimeAgo(timestamp),
        timestamp: timestamp.toISOString(),
        status: 'success'
      });

    } catch (error) {
      console.error('❌ Error processing audit log entry:', error);
    }
  }
  return actions;
}

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

async function processRoleUpdate(entry: any, actionInfo: any) {
  if (entry.changes && entry.changes.length > 0) {
    const roleChange = entry.changes.find((change: any) => change.key === '$add' || change.key === '$remove');
    if (roleChange) {
      const actionType = roleChange.key === '$add' ? 'added role to' : 'removed role from';

      // Получаем имя роли из changes
      let roleName = 'role';
      if (roleChange.new_value && Array.isArray(roleChange.new_value)) {
        // Для action_type 25 структура может быть другой
        const roleData = roleChange.new_value[0];
        if (roleData && roleData.name) {
          roleName = roleData.name;
        } else if (roleData && roleData.id) {
          // Пытаемся получить имя роли по ID
          roleName = await getRoleName(roleData.id) || 'role';
        }
      }

      actionInfo.action = `${actionType} ${roleName}`;
    }
  }
}

async function getRoleName(roleId: string) {
  try {
    const roleResponse = await fetch(`https://discord.com/api/v10/guilds/${process.env.DISCORD_GUILD_ID}/roles`, {
      headers: {
        'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });

    if (roleResponse.ok) {
      const roles = await roleResponse.json();
      const role = roles.find((r: any) => r.id === roleId);
      return role ? role.name : null;
    }
  } catch (error) {
    console.error('Error fetching role name:', error);
  }
  return null;
}

// Функция для преобразования action_type в читаемый формат
function getActionType(actionType: number) {
  const actions: { [key: number]: { action: string; icon: string } } = {
    1: { action: 'updated server', icon: 'server' },
    10: { action: 'created channel', icon: 'channel' },
    11: { action: 'updated channel', icon: 'channel' },
    12: { action: 'deleted channel', icon: 'channel' },
    13: { action: 'created channel overwrite', icon: 'permissions' },
    14: { action: 'updated channel overwrite', icon: 'permissions' },
    15: { action: 'deleted channel overwrite', icon: 'permissions' },
    20: { action: 'kicked', icon: 'kick' },
    21: { action: 'pruned members', icon: 'prune' },
    22: { action: 'banned', icon: 'ban' },
    23: { action: 'unbanned', icon: 'unban' },
    24: { action: 'updated member roles', icon: 'role' },
    25: { action: 'updated member roles', icon: 'role' }, // MEMBER_ROLE_UPDATE
    26: { action: 'added bot to server', icon: 'bot' },
    27: { action: 'updated emoji', icon: 'emoji' },
    28: { action: 'deleted message', icon: 'delete' },
    29: { action: 'bulk deleted messages', icon: 'bulk_delete' },
    30: { action: 'pinned message', icon: 'pin' },
    31: { action: 'unpinned message', icon: 'unpin' },
    72: { action: 'added integration', icon: 'integration' },
    73: { action: 'updated integration', icon: 'integration' },
    74: { action: 'removed integration', icon: 'integration' },
  };

  return actions[actionType] || { action: 'performed action', icon: 'default' };
}

// Функция для форматирования времени (как "2 min ago")
function formatTimeAgo(timestamp: Date) {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  // Для событий старше недели показываем дату
  return timestamp.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: diffDays > 365 ? 'numeric' : undefined
  });
}

// Эндпоинт для статистики команд через Sentinel бота
router.get("/discord/command-stats", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const period = req.query.period as string || '24h';
    const filter = req.query.filter as string || 'all';

    console.log('📊 Fetching command stats...', { period, filter });

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
        console.log('✅ Received data from bot:', botData.commands?.length || 0, 'commands');
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

// Упрощенный эндпоинт для логирования (пока)
router.post("/discord/log-command", async (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: "Authentication required" });

  try {
    const { command, success = true, executionTime = 0 } = req.body;

    console.log('📝 Command logged:', {
      command,
      success,
      executionTime,
      timestamp: new Date().toISOString()
    });

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

export default router;