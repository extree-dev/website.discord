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
      console.log('❌ Missing secret code');
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
      console.log('❌ Invalid secret code:', sanitizedSecretCode);
      await constantTimeDelay();
      return res.status(400).json({
        error: "Invalid, expired, or already used registration code"
      });
    }

    console.log('✅ Secret code validated:', codeValidation.id);

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

      console.log('✅ User created:', user.id);

      // ==================== ОБНОВЛЕНИЕ СЕКРЕТНОГО КОДА ====================
      console.log('🔄 Updating secret code...', {
        codeId: codeValidation.id,
        userId: user.id
      });

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

      console.log('✅ Secret code updated:', updatedCode.id);

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
        console.log(`User ${discordId} not found on server ${DISCORD_SERVER_ID}`);
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

    console.log(`User ${discordId} roles with colors:`, userRoles);
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

    const discordCreatedAt = getDiscordCreationDate(discordUser.id);

    if (!discordUser.id || !discordUser.email) throw new Error('Invalid user data from Discord');

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

        console.log('User Discord roles with colors:', {
          allRoles: userRoles.map(r => ({ name: r.name, color: r.color })),
          highestRole: highestRole,
          roleColor: roleColor,
          roleHexColor: roleHexColor
        });
      } else {
        console.log('User has no special roles, using @everyone');
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

    console.log('Discord user data:', {
      discordId,
      username,
      email,
      avatar: discordUser.avatar,
      avatarUrl,
      userRoles: userRoles.map(r => r.name),
      highestRole,
      roleColor,
      roleHexColor
    });

    // 5) transaction: ищем/создаём пользователя
    const txResult = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 3.a. Найти по discordId
      let foundUser = await tx.user.findFirst({
        where: { discordId },
        include: { profile: true }
      }) as UserWithProfile | null;

      if (foundUser) {
        console.log('Found existing user by discordId:', foundUser.id);

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
        console.log('Found existing user by email, linking discord:', foundUser.id);

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
      console.log('Creating new user with discord');
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

      console.log('Created new user with avatar and role:', { avatarUrl, highestRole, roleHexColor });

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

    console.log('OAuth transaction result:', txResult);

    const savedProfile = await prisma.profile.findFirst({
      where: { userId: txResult.id },
      select: { discordRole: true }
    });
    console.log('Saved profile discordRole:', savedProfile?.discordRole);

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

    console.log('🎫 Generated JWT token with roles:', {
      userId: txResult.id,
      role: txResult.highestRole,
      allRoles: txResult.allRoles,
      roleColor: txResult.roleColor,
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

    console.log('User basic info response:', {
      userId: user.id,
      discordRoleFromDB: user.profile?.discordRole,
      highestRoleInResponse: highestRole,
      roleFromToken: decoded.role,
      roleColor: roleColor,
      roleHexColor: roleHexColor
    });

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

      console.log('Secret code marked as used:', {
        codeId: usedCode.id,
        usedBy: user.email,
        userId: user.id
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
    console.log('🔑 Token decoded for secret codes access:', { userId: decoded.userId, email: decoded.email });

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

    console.log('📋 Fetching secret codes with filter:', whereCondition);

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

    console.log(`✅ Found ${codes.length} secret codes`);

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

    console.log('🆕 Creating new secret code:', { code: code.toUpperCase(), createdBy: decoded.email });

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

    console.log('✅ Secret code created:', secretCode.id);
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
    console.log('🗑️ Deleting secret code:', id);

    await prisma.secretCode.delete({
      where: { id }
    });

    console.log('✅ Secret code deleted:', id);
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
    console.log('🎲 Generating random secret code');

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
    console.log('✅ Generated code:', code);

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
    console.log('🔍 Validating secret code:', sanitizedCode);

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
      console.log('❌ Code not found or already used:', sanitizedCode);
      return res.status(404).json({
        valid: false,
        error: 'Invalid or expired secret code'
      });
    }

    // Проверяем максимальное количество использований
    if (secretCode.uses >= secretCode.maxUses) {
      console.log('❌ Code reached usage limit:', sanitizedCode);
      return res.status(400).json({
        valid: false,
        error: 'Secret code has reached maximum usage limit'
      });
    }

    console.log('✅ Code is valid:', secretCode.id);
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

    console.log('🔄 Marking code as used:', { codeId, usedBy });

    const updatedCode = await prisma.secretCode.update({
      where: { id: codeId },
      data: {
        used: true,
        usedBy: usedBy || 'Unknown',
        usedAt: new Date(),
        uses: { increment: 1 }
      }
    });

    console.log('✅ Code marked as used:', updatedCode.id);
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

    console.log('📊 Secret codes stats:', stats);
    res.json(stats);

  } catch (error) {
    console.error('❌ Error fetching secret codes stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;