import validator from "validator";

// SQL injection patterns
export const advancedSQLInjectionPatterns = [
    /(\b(UNION\s+ALL\s+SELECT|UNION\s+SELECT)\b)/i,
    /(EXEC\s*\(|EXECUTE\s*\(|sp_executesql)/i,
    /(WAITFOR\s+DELAY\s+'[0-9]+:[0-9]+:[0-9]+')/i,
    /(\b(SLEEP|BENCHMARK)\s*\(\s*[0-9]+\s*\))/i,
    /(\/\*![0-9]+\s*)/,
    /(CHAR\s*\(\s*[0-9\s,]+\))/i,
    /(LOAD_FILE\s*\(|INTO\s+OUTFILE|INTO\s+DUMPFILE)/i,
    /(\b(IF|CASE|WHEN)\b.*\bTHEN\b)/i
];

export const detectSQLInjection = (input: string): boolean => {
    return advancedSQLInjectionPatterns.some(pattern => pattern.test(input));
};

// Валидация данных
export const validateEmail = (email: string): boolean => {
    return (
        validator.isEmail(email, { allow_utf8_local_part: false }) &&
        validator.isLength(email, { max: 254 })
    );
};

export const validateNickname = (nickname: string): boolean => {
    return validator.isLength(nickname, { min: 3, max: 20 }) &&
        validator.isAlphanumeric(nickname, 'en-US', { ignore: '_' }) &&
        !validator.contains(nickname, 'admin') &&
        !validator.contains(nickname, 'moderator');
};

export const validatePassword = (password: string): { valid: boolean; error?: string } => {
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

export const sanitizeInput = (input: string): string => {
    return validator.escape(validator.trim(input));
};

// Санитизация данных запроса
export const deepSanitize = (obj: any): any => {
    if (typeof obj === 'string') {
        return validator.escape(
            validator.trim(
                obj.replace(/[<>]/g, '')
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

export const sanitizeRequestData = (req: any, res: any, next: any) => {
    try {
        if (req.body && typeof req.body === 'object') {
            req.body = deepSanitize(req.body);
        }

        next();

    } catch (error) {
        console.error('Sanitization error:', error);
        next();
    }
};

export const validationMiddleware = [sanitizeRequestData];