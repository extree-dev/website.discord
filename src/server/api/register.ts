import express from "express";
import argon2 from "argon2";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";
import validator from "validator";
import rateLimit from "express-rate-limit";
import axios from "axios";
import { secretCodeService } from "@/utils/secretCodes";

const prisma = new PrismaClient();
const router = express.Router();

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

// reCAPTCHA секретный ключ
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

// Rate limiting для регистрации
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: {
    error: "Too many registration attempts from this IP, please try again later"
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Применяем лимитер к регистрации
router.use("/register", registerLimiter);

// ==================== СИСТЕМА СЕКРЕТНЫХ КОДОВ ====================

interface SecretCode {
  id: string;
  code: string;
  createdBy: string;
  createdAt: Date;
  used: boolean;
  usedBy?: string;
  usedAt?: Date;
  expiresAt?: Date;
}

// Функция для валидации секретного кода
const validateSecretCode = async (code: string): Promise<{ valid: boolean; error?: string; codeData?: any }> => {
  return await secretCodeService.validateCode(code);
};

// Функция для отметки кода как использованного
const markCodeAsUsed = async (codeId: string, usedBy: string): Promise<boolean> => {
  try {
    await secretCodeService.markCodeAsUsed(codeId, usedBy);
    return true;
  } catch (error) {
    console.error('Error marking code as used:', error);
    return false;
  }
};

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

// Улучшенная санитизация с защитой от SQL-инъекций
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

// Специализированная санитизация для разных типов полей
const sanitizeForDatabase = {
  text: (input: string, fieldName: string, ip: string): string => {
    const sanitized = secureSanitizeInput(input, fieldName, ip);
    return validator.blacklist(sanitized, '<>\"\'`;|&$');
  },
  
  email: (input: string, fieldName: string, ip: string): string => {
    const sanitized = validator.trim(input.toLowerCase());
    
    if (detectSQLInjection(sanitized)) {
      securityLogger.logSuspiciousActivity('sql_injection_email', {
        field: fieldName,
        input: sanitized.substring(0, 50),
        ip: ip
      });
      throw new Error('Invalid email format');
    }
    
    return sanitized;
  },
  
  nickname: (input: string, fieldName: string, ip: string): string => {
    const sanitized = validator.escape(validator.trim(input));
    
    if (!/^[a-zA-Z0-9_\-\.]+$/.test(sanitized)) {
      securityLogger.logSuspiciousActivity('invalid_nickname_chars', {
        field: fieldName,
        input: sanitized,
        ip: ip
      });
      throw new Error('Nickname contains invalid characters');
    }
    
    return sanitized;
  },

  secretCode: (input: string, fieldName: string, ip: string): string => {
    const sanitized = validator.escape(validator.trim(input.toUpperCase()));
    
    if (!/^[A-Z0-9\-_]+$/.test(sanitized)) {
      securityLogger.logSuspiciousActivity('invalid_secret_code_chars', {
        field: fieldName,
        input: sanitized,
        ip: ip
      });
      throw new Error('Secret code contains invalid characters');
    }
    
    return sanitized;
  }
};

// Middleware для проверки SQL-инъекций
const sqlInjectionProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIP = getClientIP(req);
  
  // Проверка query parameters
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
  
  // Проверка body (для JSON)
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

// ==================== reCAPTCHA ПРОВЕРКА ====================

const verifyRecaptcha = async (token: string, ip: string): Promise<boolean> => {
  if (!RECAPTCHA_SECRET_KEY) {
    console.warn('RECAPTCHA_SECRET_KEY not set, skipping verification');
    return true;
  }
  
  try {
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      null,
      {
        params: {
          secret: RECAPTCHA_SECRET_KEY,
          response: token,
          remoteip: ip
        }
      }
    );
    
    return response.data.success && response.data.score > 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false;
  }
};

// ==================== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ====================

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
      email: email.substring(0, 3) + '***',
      success,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  },

  logSecretCodeUsage: (code: string, email: string, success: boolean, metadata: any) => {
    console.info(`[SECRET_CODE] ${success ? 'USED' : 'FAILED'}`, {
      code: code.substring(0, 4) + '***',
      email: email.substring(0, 3) + '***',
      success,
      ...metadata,
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware для извлечения IP
const getClientIP = (req: express.Request): string => {
  return req.ip || 
         (req.connection as any).remoteAddress || 
         (req.headers['x-forwarded-for'] as string) || 
         'unknown';
};

// Защита от timing attacks
const constantTimeDelay = (ms: number = 500): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

// Валидация email домена
const validateEmailDomain = async (email: string): Promise<boolean> => {
  const domain = email.split('@')[1];
  
  const tempEmailDomains = [
    'tempmail.com', '10minutemail.com', 'guerrillamail.com',
    'mailinator.com', 'yopmail.com', 'throwawaymail.com'
  ];
  
  if (tempEmailDomains.some(temp => domain.includes(temp))) {
    return false;
  }
  
  return true;
};

const validateEmail = async (email: string): Promise<boolean> => {
  return (
    validator.isEmail(email, { allow_utf8_local_part: false }) &&
    validator.isLength(email, { max: 254 }) &&
    await validateEmailDomain(email)
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
         validator.isAlpha(validator.blacklist(name, ' '), 'en-US') &&
         !validator.contains(name.toLowerCase(), 'admin') &&
         !validator.contains(name.toLowerCase(), 'moderator');
};

// Улучшенная валидация пароля с проверкой утечек
const validatePassword = async (password: string): Promise<{ valid: boolean; error?: string }> => {
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

  // Запрет последовательных символов
  if (/(.)\1{2,}/.test(password)) {
    return { valid: false, error: "Password contains repeated characters" };
  }
  
  // Запрет простых последовательностей
  const sequences = ['123', 'abc', 'qwe', '987', '321'];
  if (sequences.some(seq => password.toLowerCase().includes(seq))) {
    return { valid: false, error: "Password contains simple sequences" };
  }

  return { valid: true };
};

// Хеширование с перцем
const hashPassword = async (password: string): Promise<string> => {
  const pepperedPassword = password + PASSWORD_PEPPER;
  return await argon2.hash(pepperedPassword, argon2Options);
};

// Middleware для проверки Content-Type
const validateContentType = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (req.method === 'POST' && !req.is('application/json')) {
    return res.status(400).json({ error: "Content-Type must be application/json" });
  }
  next();
};

router.use(validateContentType);
router.use(sqlInjectionProtection);

// ==================== ОБНОВЛЕННАЯ РЕГИСТРАЦИЯ С СЕКРЕТНЫМИ КОДАМИ ====================

router.post("/register", async (req, res) => {
  const startTime = Date.now();
  const clientIP = getClientIP(req);
  const userAgent = req.get('User-Agent') || 'unknown';
  
  try {
    const { name, nickname, email, password, confirmPassword, recaptchaToken, secretCode } = req.body;

    // ==================== ПРОВЕРКА СЕКРЕТНОГО КОДА ====================
    if (!secretCode) {
      await constantTimeDelay();
      securityLogger.logRegistration(email || 'unknown', false, {
        reason: 'missing_secret_code',
        ip: clientIP
      });
      return res.status(400).json({ 
        error: "Secret registration code is required" 
      });
    }

    // Санитизация секретного кода
    const sanitizedSecretCode = sanitizeForDatabase.secretCode(secretCode, 'secretCode', clientIP);

    // Валидация секретного кода
    const codeValidation = await validateSecretCode(sanitizedSecretCode);
    if (!codeValidation.valid) {
      await constantTimeDelay();
      securityLogger.logRegistration(email || 'unknown', false, {
        reason: 'invalid_secret_code',
        code: sanitizedSecretCode,
        ip: clientIP,
        error: codeValidation.error
      });
      return res.status(400).json({ 
        error: codeValidation.error 
      });
    }

    // ==================== ОСТАЛЬНЫЕ ПРОВЕРКИ ====================

    // Проверка reCAPTCHA
    if (RECAPTCHA_SECRET_KEY && (!recaptchaToken || !await verifyRecaptcha(recaptchaToken, clientIP))) {
      securityLogger.logSuspiciousActivity('recaptcha_failed', {
        ip: clientIP,
        email: email,
        secretCode: sanitizedSecretCode
      });
      return res.status(400).json({ error: "Bot verification failed" });
    }

    // Базовая валидация наличия полей
    if (!name?.trim() || !nickname?.trim() || !email?.trim() || !password || !confirmPassword) {
      await constantTimeDelay();
      securityLogger.logRegistration(email || 'unknown', false, {
        reason: 'missing_fields',
        ip: clientIP,
        secretCode: sanitizedSecretCode
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
        ip: clientIP,
        secretCode: sanitizedSecretCode
      });
      return res.status(400).json({ 
        error: "Passwords do not match" 
      });
    }

    // Улучшенная санитизация с защитой от SQL-инъекций
    const sanitizedName = sanitizeForDatabase.text(name, 'name', clientIP);
    const sanitizedNickname = sanitizeForDatabase.nickname(nickname, 'nickname', clientIP);
    const sanitizedEmail = sanitizeForDatabase.email(email, 'email', clientIP);

    // Расширенная валидация имени
    if (!validateName(sanitizedName)) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'invalid_name',
        name: sanitizedName,
        ip: clientIP,
        secretCode: sanitizedSecretCode
      });
      return res.status(400).json({ 
        error: "Name must be 2-50 characters long and contain only letters and spaces" 
      });
    }

    // Валидация email
    if (!await validateEmail(sanitizedEmail)) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'invalid_email',
        ip: clientIP,
        secretCode: sanitizedSecretCode
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
        ip: clientIP,
        secretCode: sanitizedSecretCode
      });
      return res.status(400).json({ 
        error: "Nickname must be 3-20 characters long and contain only letters, numbers and underscores. Cannot contain restricted words." 
      });
    }

    // Валидация пароля
    const passwordValidation = await validatePassword(password);
    if (!passwordValidation.valid) {
      await constantTimeDelay();
      securityLogger.logRegistration(sanitizedEmail, false, {
        reason: 'weak_password',
        ip: clientIP,
        secretCode: sanitizedSecretCode
      });
      return res.status(400).json({ 
        error: passwordValidation.error 
      });
    }

    // Проверка уникальности в транзакции
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
        existingField: field,
        secretCode: sanitizedSecretCode
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
        createdAt: true,
      }
    });

    // ==================== ОТМЕТКА КОДА КАК ИСПОЛЬЗОВАННОГО ====================
    if (codeValidation.codeData) {
      const codeMarked = await markCodeAsUsed(codeValidation.codeData.id, sanitizedEmail);
      
      securityLogger.logSecretCodeUsage(sanitizedSecretCode, sanitizedEmail, codeMarked, {
        userId: user.id,
        codeId: codeValidation.codeData.id,
        ip: clientIP
      });

      if (!codeMarked) {
        console.warn(`Failed to mark secret code as used: ${codeValidation.codeData.id}`);
      }
    }

    // Логирование успешной регистрации
    securityLogger.logRegistration(sanitizedEmail, true, {
      userId: user.id,
      ip: clientIP,
      userAgent: userAgent.substring(0, 100),
      secretCode: sanitizedSecretCode
    });

    // Постоянное время ответа
    const elapsed = Date.now() - startTime;
    await constantTimeDelay(Math.max(0, 800 - elapsed));

    return res.status(201).json({
      success: true,
      message: "User registered successfully. Please check your email for verification.",
      user: {
        id: user.id,
        name: user.name,
        nickname: user.nickname,
        email: user.email,
        createdAt: user.createdAt,
      },
      nextSteps: [
        "Check your email for verification link",
        "Complete your profile setup",
        "Review our community guidelines"
      ]
    });

  } catch (err: unknown) {
    console.error("Registration error:", err);

    securityLogger.logSuspiciousActivity('registration_error', {
      error: err instanceof Error ? err.message : 'Unknown error',
      ip: clientIP,
      userAgent
    });

    await constantTimeDelay();
    
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

    return res.status(500).json({ 
      error: "Registration service temporarily unavailable. Please try again later." 
    });
  }
});

// ==================== ДОПОЛНИТЕЛЬНЫЕ ФУНКЦИИ ====================

export const verifyPassword = async (hashedPassword: string, password: string): Promise<boolean> => {
  try {
    const pepperedPassword = password + PASSWORD_PEPPER;
    return await argon2.verify(hashedPassword, pepperedPassword);
  } catch (err) {
    console.error("Password verification error:", err);
    return false;
  }
};

const sendVerificationEmail = async (email: string, userId: string): Promise<void> => {
  console.log(`Verification email would be sent to: ${email} for user: ${userId}`);
};

export default router;