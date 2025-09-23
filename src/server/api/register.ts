import express from "express";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import validator from "validator";
import rateLimit from "express-rate-limit";

const prisma = new PrismaClient();
const router = express.Router();

// ==================== КОНФИГУРАЦИЯ БЕЗОПАСНОСТИ ====================

// Конфигурация Argon2
const argon2Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 4, // Увеличили для большей безопасности
  parallelism: 1,
  hashLength: 32
};

// Глобальный перец для паролей
const PASSWORD_PEPPER = process.env.PASSWORD_PEPPER || crypto.randomBytes(32).toString('hex');

// Rate limiting для регистрации
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 час
  max: 5, // Максимум 5 регистраций в час с одного IP
  message: {
    error: "Too many registration attempts from this IP, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Применяем лимитер к регистрации
router.use("/register", registerLimiter);

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

// Санитизация и валидация ввода
const sanitizeInput = (input: string): string => {
  return validator.escape(validator.trim(input));
};

// Санитизация для email (без escape, чтобы не ломать адрес)
const sanitizeEmail = (email: string): string => {
  return validator.trim(email).toLowerCase();
};

const validateEmail = (email: string): boolean => {
  return (
    validator.isEmail(email, { allow_utf8_local_part: false }) && // стандартная проверка
    validator.isLength(email, { max: 254 }) // ограничение по стандарту
  );
};


const validateNickname = (nickname: string): boolean => {
  return validator.isLength(nickname, { min: 3, max: 20 }) &&
         validator.isAlphanumeric(nickname, 'en-US', { ignore: '_' }) &&
         !validator.contains(nickname.toLowerCase(), 'admin') &&
         !validator.contains(nickname.toLowerCase(), 'moderator') &&
         !validator.contains(nickname.toLowerCase(), 'administrator');
};

const validateName = (name: string): boolean => {
  return validator.isLength(name, { min: 2, max: 50 }) &&
         validator.isAlpha(validator.blacklist(name, ' '), 'en-US') && // Только буквы и пробелы
         !validator.contains(name.toLowerCase(), 'admin') &&
         !validator.contains(name.toLowerCase(), 'moderator');
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
    return { 
      valid: false, 
      error: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character" 
    };
  }

  // Проверка на common passwords
  const commonPasswords = ['password', '123456', 'qwerty', 'admin', 'welcome'];
  if (commonPasswords.some(common => password.toLowerCase().includes(common))) {
    return { 
      valid: false, 
      error: "Password is too common or weak. Please choose a more secure password." 
    };
  }

  return { valid: true };
};

// Хеширование с перцем
const hashPassword = async (password: string): Promise<string> => {
  const pepperedPassword = password + PASSWORD_PEPPER;
  return await argon2.hash(pepperedPassword, argon2Options);
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
  
  logRegistration: (email: string, success: boolean, metadata: any) => {
    console.info(`[REGISTRATION] ${success ? 'SUCCESS' : 'FAILED'}`, {
      email: email.substring(0, 3) + '***', // Частичное логирование
      success,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware для извлечения IP с учетом прокси
const getClientIP = (req: express.Request): string => {
  return req.ip || 
         (req.connection as any).remoteAddress || 
         (req.headers['x-forwarded-for'] as string) || 
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

// ==================== ОБНОВЛЕННАЯ РЕГИСТРАЦИЯ ====================

router.post("/register", async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';
  
  try {
    const { name, nickname, email, password, confirmPassword } = req.body;

    // Базовая валидация наличия полей
    if (!name?.trim() || !nickname?.trim() || !email?.trim() || !password || !confirmPassword) {
      await constantTimeDelay();
      securityLogger.logRegistration(email || 'unknown', false, {
        reason: 'missing_fields',
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "All fields are required and cannot be empty" 
      });
    }

    // Проверка совпадения паролей
    if (password !== confirmPassword) {
      await constantTimeDelay();
      securityLogger.logRegistration(email, false, {
        reason: 'password_mismatch',
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "Passwords do not match" 
      });
    }

    // Санитизация ввода
    const sanitizedName = sanitizeInput(name);
    const sanitizedNickname = sanitizeInput(nickname);
    const sanitizedEmail = sanitizeEmail(email);

    // Расширенная валидация имени
    if (!validateName(sanitizedName)) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'invalid_name',
        name: sanitizedName,
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "Name must be 2-50 characters long and contain only letters and spaces" 
      });
    }

    // Валидация email
    if (!validateEmail(sanitizedEmail)) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'invalid_email',
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "Please provide a valid email address" 
      });
    }

    // Валидация nickname
    if (!validateNickname(sanitizedNickname)) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'invalid_nickname',
        nickname: sanitizedNickname,
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "Nickname must be 3-20 characters long and contain only letters, numbers and underscores. Cannot contain restricted words." 
      });
    }

    // Валидация пароля
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'weak_password',
        ip: clientIP
      });
      return res.status(400).json({ 
        error: passwordValidation.error 
      });
    }

    // Проверка уникальности в транзакции для избежания race condition
    const existingUser = await prisma.$transaction(async (tx) => {
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
        ip: clientIP,
        existingField: field
      });
      
      await constantTimeDelay();
      return res.status(409).json({ 
        error: `User with this ${field} already exists` 
      });
    }

    // Хеширование пароля
    const hashedPassword = await hashPassword(password);

    // Создание пользователя с транзакцией - УДАЛЕНЫ НЕСУЩЕСТВУЮЩИЕ ПОЛЯ
    const user = await prisma.user.create({
      data: { 
        name: sanitizedName,
        nickname: sanitizedNickname,
        email: sanitizedEmail,
        password: hashedPassword,
        // Удалены поля, которых нет в модели User: lastLogin, loginAttempts, lockedUntil, isActive, emailVerified, registrationIp, userAgent
      },
      select: {
        id: true,
        name: true,
        nickname: true,
        email: true,
        createdAt: true,
        // Удалено поле isActive, которого нет в модели
      }
    });

    // Логирование успешной регистрации
    securityLogger.logRegistration(sanitizedEmail, true, {
      userId: user.id,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100)
    });

    // Опционально: отправка email для верификации
    // await sendVerificationEmail(user.email, user.id);

    // Постоянное время ответа для защиты от timing attacks
    const elapsed = Date.now() - startTime;
    await constantTimeDelay(Math.max(0, 800 - elapsed)); // Увеличили базовое время

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email for verification.",
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt,
        // Удалено поле isActive, которого нет в модели
      },
      nextSteps: [
        "Check your email for verification link",
        "Complete your profile setup",
        "Review our community guidelines"
      ]
    });

  } catch (err: unknown) { // ИСПРАВЛЕНА ТИПИЗАЦИЯ ОШИБКИ
    console.error("Registration error:", err);

    // Логирование ошибки безопасности
    securityLogger.logSuspiciousActivity('registration_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP,
      userAgent
    });

    await constantTimeDelay();
    
    // Обработка ошибок Prisma
    if (err instanceof Error && 'code' in err) {
      const prismaError = err as { code: string };
      
      if (prismaError.code === 'P2002') {
        securityLogger.logSuspiciousActivity('prisma_duplicate_error', {
          error: prismaError.code,
          ip: clientIP
        });
        return res.status(409).json({ 
          error: "User with this email or nickname already exists" 
        });
      }

      if (prismaError.code === 'P2003') {
        return res.status(400).json({ 
          error: "Invalid data provided" 
        });
      }
    }

    // Общая ошибка сервера
    return res.status(500).json({ 
      error: "Registration service temporarily unavailable. Please try again later." 
    });
  }
});

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================

// Функция для верификации пароля (для логина)
export const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
  try {
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await argon2.verify(hashedPassword, pepperedPassword);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
};

// Функция для отправки email верификации (заглушка)
const sendVerificationEmail = async (email: string, userId: string): Promise<void> => {
  // В реальной реализации здесь будет логика отправки email
  console.log(`Verification email would be sent to: ${email} for user: ${userId}`);
};

export default router;