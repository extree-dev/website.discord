import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle.js";
import "../components/CSS/Register.css";
import { Eye, EyeOff, Key } from "lucide-react"; // ← Добавьте Key в импорт
import { Toast } from "@/components/Toast.js";

declare global {
    interface Window {
        grecaptcha: any;
    }
}

export const Register = () => {
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [secretCode, setSecretCode] = useState(""); // ← Добавьте это состояние
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState<{
        name?: string;
        nickname?: string;
        email?: string;
        password?: string;
        confirmPassword?: string;
        secretCode?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordsMatch, setPasswordsMatch] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
    const [recaptchaToken, setRecaptchaToken] = useState("");
    const [isRecaptchaReady, setIsRecaptchaReady] = useState(false);
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [codeValidation, setCodeValidation] = useState<{
        isValid: boolean;
        message: string;
    } | null>(null);

    const navigate = useNavigate();

    // Функция для проверки секретного кода
    const validateSecretCode = async (code: string): Promise<boolean> => {
        if (!code.trim()) return false;

        setIsValidatingCode(true);
        try {
            const response = await fetch("http://localhost:4000/api/validate-secret-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const data = await response.json();

            if (data.valid) {
                setCodeValidation({
                    isValid: true,
                    message: "✓ Valid registration code"
                });
                return true;
            } else {
                setCodeValidation({
                    isValid: false,
                    message: data.error || "Invalid code"
                });
                return false;
            }
        } catch (error) {
            console.error('Error validating secret code:', error);
            setCodeValidation({
                isValid: false,
                message: "Error validating code"
            });
            return false;
        } finally {
            setIsValidatingCode(false);
        }
    };

    const handleSecretCodeChange = async (value: string) => {
        const upperValue = value.toUpperCase();
        setSecretCode(upperValue);

        if (errors.secretCode) {
            setErrors(prev => ({ ...prev, secretCode: undefined }));
        }

        // Автоматическая проверка кода при вводе
        if (upperValue.trim().length >= 4) {
            await validateSecretCode(upperValue);
        } else {
            setCodeValidation(null);
        }
    };

    // Загрузка reCAPTCHA
    useEffect(() => {
        const loadRecaptcha = () => {
            const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

            if (!recaptchaSiteKey) {
                console.error('ReCAPTCHA site key is not defined');
                return;
            }

            // Проверяем, не загружен ли уже скрипт
            if (document.querySelector(`script[src*="recaptcha"]`)) {
                if (window.grecaptcha) {
                    setIsRecaptchaReady(true);
                    executeRecaptcha();
                }
                return;
            }

            const script = document.createElement('script');
            script.src = `https://www.google.com/recaptcha/api.js?render=${recaptchaSiteKey}`;
            script.async = true;
            script.defer = true;

            script.onload = () => {
                console.log('reCAPTCHA loaded');
                setIsRecaptchaReady(true);
                executeRecaptcha();
            };

            script.onerror = () => {
                console.error('Failed to load reCAPTCHA script');
                setIsRecaptchaReady(false);
            };

            document.head.appendChild(script);
        };

        const executeRecaptcha = () => {
            if (window.grecaptcha && window.grecaptcha.ready) {
                window.grecaptcha.ready(() => {
                    const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

                    window.grecaptcha.execute(recaptchaSiteKey, {
                        action: 'register'
                    }).then((token: string) => {
                        console.log('reCAPTCHA token generated');
                        setRecaptchaToken(token);
                    }).catch((error: any) => {
                        console.error('reCAPTCHA execution error:', error);
                        setRecaptchaToken("");
                    });
                });
            }
        };

        loadRecaptcha();

        // Очистка при размонтировании
        return () => {
            if (recaptchaToken && window.grecaptcha) {
                // Сбрасываем reCAPTCHA при размонтировании компонента
                window.grecaptcha.reset();
            }
        };
    }, []);

    // Обновляем reCAPTCHA токен при изменении полей формы
    useEffect(() => {
        if (isRecaptchaReady && (name || nickname || email || password || secretCode)) {
            refreshRecaptchaToken();
        }
    }, [name, nickname, email, password, secretCode, isRecaptchaReady]);

    const refreshRecaptchaToken = () => {
        if (window.grecaptcha && isRecaptchaReady) {
            const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

            window.grecaptcha.ready(() => {
                window.grecaptcha.execute(recaptchaSiteKey, {
                    action: 'register'
                }).then((token: string) => {
                    setRecaptchaToken(token);
                }).catch((error: any) => {
                    console.error('Error refreshing reCAPTCHA:', error);
                });
            });
        }
    };

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateNickname = (nickname: string) => /^[a-zA-Z0-9_]{3,20}$/.test(nickname);

    useEffect(() => setPasswordsMatch(password === confirmPassword || confirmPassword === ""), [password, confirmPassword]);

    useEffect(() => {
        let strength = 0;
        if (password.length >= 12) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setErrors({});

        // Проверяем готовность reCAPTCHA
        if (!isRecaptchaReady || !recaptchaToken) {
            setError("Security verification is not ready. Please wait...");
            setToast({ message: "Security verification is not ready. Please wait...", type: "error" });
            refreshRecaptchaToken();
            return;
        }

        // Проверяем секретный код
        const isCodeValid = await validateSecretCode(secretCode);
        if (!isCodeValid) {
            setErrors(prev => ({
                ...prev,
                secretCode: "Please provide a valid secret registration code"
            }));
            return;
        }

        const newErrors: typeof errors = {};
        let valid = true;

        // Валидация (добавляем проверку секретного кода)
        if (!name.trim()) { newErrors.name = "Full name is required"; valid = false; }
        if (!nickname.trim()) { newErrors.nickname = "Nickname is required"; valid = false; }
        else if (!validateNickname(nickname)) { newErrors.nickname = "3-20 chars, letters, numbers, underscores"; valid = false; }
        if (!email.trim()) { newErrors.email = "Email is required"; valid = false; }
        else if (!validateEmail(email)) { newErrors.email = "Invalid email"; valid = false; }
        if (!password) { newErrors.password = "Password is required"; valid = false; }
        else if (password.length < 12) { newErrors.password = "Password must be 12+ chars"; valid = false; }
        if (!confirmPassword) { newErrors.confirmPassword = "Confirm your password"; valid = false; }
        else if (password !== confirmPassword) { newErrors.confirmPassword = "Passwords do not match"; valid = false; }
        if (!secretCode.trim()) { newErrors.secretCode = "Secret registration code is required"; valid = false; }
        else if (codeValidation && !codeValidation.isValid) { newErrors.secretCode = codeValidation.message; valid = false; }

        setErrors(newErrors);
        if (!valid) return;

        setIsLoading(true);

        try {
            // Формируем объект для отправки с reCAPTCHA токеном и секретным кодом
            const payload = {
                name: name.trim(),
                nickname: nickname.trim(),
                email: email.trim().toLowerCase(),
                password,
                confirmPassword: password,
                recaptchaToken,
                secretCode: secretCode.toUpperCase() // ← добавляем код
            };

            const res = await fetch("http://localhost:4000/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Registration failed");
            }

            setError("");
            setToast({ message: "Registration successful! Redirecting to login...", type: "success" });

            // Очищаем форму
            setName("");
            setNickname("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setSecretCode("");
            setRecaptchaToken("");
            setCodeValidation(null);

            // Переход на логин через 2 секунды
            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Registration failed";
            setError(errorMessage);
            setToast({ message: errorMessage, type: "error" });

            // Обновляем reCAPTCHA токен после ошибки
            refreshRecaptchaToken();
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrengthColor = () => ["#ff4444", "#ff8800", "#ffbb33", "#00C851", "#007E33"][passwordStrength] || "#666";
    const getPasswordStrengthLabel = () => ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"][passwordStrength] || "";

    return (
        <div className="register-wrapper">
            <div className="register-card">
                <div className="register-header-top"><ThemeToggle /></div>
                <div className="register-header">
                    <h1>Create your account</h1>
                    <p>Get started with our platform</p>
                </div>

                {error && <div className="register-error">{error}</div>}

                <form className="register-form" onSubmit={handleSubmit} noValidate>
                    {/* Секретный код - добавляем первым полем */}
                    <div className="register-input-group">
                        <div className="floating-label-container">
                            <div className="floating-label secret-code-group">
                                <input
                                    id="secretCode"
                                    type="text"
                                    value={secretCode}
                                    onChange={(e) => handleSecretCodeChange(e.target.value)}
                                    placeholder=" "
                                    required
                                    className={errors.secretCode ? "error" : codeValidation?.isValid ? "success" : ""}
                                    disabled={isLoading}
                                    style={{ textTransform: 'uppercase' }}
                                />
                                <label htmlFor="secretCode">
                                    <Key size={16} className="inline-icon" />
                                    Secret Registration Code
                                </label>
                            </div>
                        </div>
                        {isValidatingCode && (
                            <div className="code-validation-loading">Validating code...</div>
                        )}
                        {codeValidation && !isValidatingCode && (
                            <div className={`code-validation-message ${codeValidation.isValid ? 'valid' : 'invalid'}`}>
                                {codeValidation.message}
                            </div>
                        )}
                        {errors.secretCode && !isValidatingCode && (
                            <div className="input-error">{errors.secretCode}</div>
                        )}
                    </div>

                    {/* Name */}
                    <div className="register-input-group">
                        <div className="floating-label-container">
                            <div className="floating-label">
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="name"
                                    className={errors.name ? "error" : ""}
                                    disabled={isLoading}
                                />
                                <label htmlFor="name">Full Name</label>
                            </div>
                        </div>
                        {errors.name && <div className="input-error">{errors.name}</div>}
                    </div>

                    {/* Nickname */}
                    <div className="register-input-group">
                        <div className="floating-label-container">
                            <div className="floating-label">
                                <input
                                    id="nickname"
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="username"
                                    className={errors.nickname ? "error" : ""}
                                    disabled={isLoading}
                                />
                                <label htmlFor="nickname">Nickname</label>
                            </div>
                        </div>
                        {errors.nickname && <div className="input-error">{errors.nickname}</div>}
                    </div>

                    {/* Email */}
                    <div className="register-input-group">
                        <div className="floating-label-container">
                            <div className="floating-label">
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="email"
                                    className={errors.email ? "error" : ""}
                                    disabled={isLoading}
                                />
                                <label htmlFor="email">Email</label>
                            </div>
                        </div>
                        {errors.email && <div className="input-error">{errors.email}</div>}
                    </div>

                    {/* Password */}
                    <div className="register-input-group floating-label password-group">
                        <div className="floating-label-container">
                            <div className="password-wrapper">
                                <input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="new-password"
                                    className={errors.password ? "error" : ""}
                                    disabled={isLoading}
                                />
                                <label htmlFor="password">Password</label>
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        {errors.password && <div className="input-error">{errors.password}</div>}
                        {password.length > 0 && !errors.password && (
                            <div className="password-strength" style={{ color: getPasswordStrengthColor() }}>
                                Strength: {getPasswordStrengthLabel()}
                            </div>
                        )}
                    </div>

                    {/* Confirm Password */}
                    <div className="register-input-group floating-label password-group">
                        <div className="floating-label-container">
                            <div className="password-wrapper">
                                <input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder=" "
                                    required
                                    autoComplete="new-password"
                                    className={errors.confirmPassword || (!passwordsMatch && confirmPassword) ? "error" : ""}
                                    disabled={isLoading}
                                />
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                {confirmPassword.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        {errors.confirmPassword && <div className="input-error">{errors.confirmPassword}</div>}
                        {!errors.confirmPassword && !passwordsMatch && confirmPassword && (
                            <div className="input-error">Passwords do not match</div>
                        )}
                    </div>

                    {/* Invisible reCAPTCHA - скрытый элемент */}
                    <div style={{ display: 'none' }}>
                        <div className="g-recaptcha" data-sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} data-size="invisible"></div>
                    </div>

                    <button
                        type="submit"
                        className="register-btn"
                        disabled={isLoading || !isRecaptchaReady}
                    >
                        {isLoading ? (
                            <span className="loading-spinner"></span>
                        ) : !isRecaptchaReady ? (
                            "Loading Security..."
                        ) : (
                            "Create account"
                        )}
                    </button>
                </form>

                {/* Индикатор загрузки reCAPTCHA */}
                {!isRecaptchaReady && (
                    <div className="recaptcha-loading">
                        <small>Loading security verification...</small>
                    </div>
                )}
            </div>

            {toast && (
                <Toast
                    message={toast.message}
                    type={toast.type}
                    onClose={() => setToast(null)}
                />
            )}
        </div>
    );
};