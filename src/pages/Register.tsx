// Register.tsx - ОБНОВЛЕННЫЙ КОМПОНЕНТ В СТИЛЕ COMPLETEPROFILE

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MdVisibility, MdVisibilityOff, MdKey, MdWarning, MdCheckCircle, MdError } from 'react-icons/md';
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle.js";
import { Toast } from "@/components/Toast.js";
import styles from "../module_pages/Register.module.scss"

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
    const [secretCode, setSecretCode] = useState("");
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

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if (data.valid) {
                setCodeValidation({
                    isValid: true,
                    message: "Valid registration code"
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

        return () => {
            if (recaptchaToken && window.grecaptcha) {
                window.grecaptcha.reset();
            }
        };
    }, []);

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

        if (!isRecaptchaReady || !recaptchaToken) {
            setError("Security verification is not ready. Please wait...");
            setToast({ message: "Security verification is not ready. Please wait...", type: "error" });
            refreshRecaptchaToken();
            return;
        }

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
            const payload = {
                name: name.trim(),
                nickname: nickname.trim(),
                email: email.trim().toLowerCase(),
                password,
                confirmPassword: password,
                recaptchaToken,
                secretCode: secretCode.toUpperCase()
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

            setName("");
            setNickname("");
            setEmail("");
            setPassword("");
            setConfirmPassword("");
            setSecretCode("");
            setRecaptchaToken("");
            setCodeValidation(null);

            setTimeout(() => {
                navigate("/login");
            }, 2000);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Registration failed";
            setError(errorMessage);
            setToast({ message: errorMessage, type: "error" });
            refreshRecaptchaToken();
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrengthColor = () => ["#ff4444", "#ff8800", "#ffbb33", "#00C851", "#007E33"][passwordStrength] || "#666";
    const getPasswordStrengthLabel = () => ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"][passwordStrength] || "";

    return (
        <div className={styles.wrapper}>
            <div className={styles.background}></div>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.headerTop}><ThemeToggle /></div>

                    <div className={styles.header}>
                        <h2 className={styles.title}>Create Your Account</h2>
                        <p className={styles.subtitle}>Get started with our platform</p>
                    </div>

                    {error && (
                        <div className={styles.globalError}>
                            <MdWarning className={styles.errorIcon} />
                            {error}
                        </div>
                    )}

                    <form className={styles.form} onSubmit={handleSubmit} noValidate>
                        {/* Секретный код */}
                        <div className={styles.formGroup}>
                            <label htmlFor="secretCode" className={styles.formLabel}>
                                <MdKey className={styles.inlineIcon} />
                                Secret Registration Code *
                            </label>
                            <input
                                id="secretCode"
                                type="text"
                                value={secretCode}
                                onChange={(e) => handleSecretCodeChange(e.target.value)}
                                className={`${styles.formInput} ${codeValidation?.isValid ? styles.inputValid : codeValidation && !codeValidation.isValid ? styles.inputError : ''} ${errors.secretCode ? styles.inputError : ''}`}
                                placeholder="Enter code provided by administrator"
                                disabled={isLoading}
                                style={{ textTransform: 'uppercase' }}
                            />

                            {/* Индикатор загрузки валидации */}
                            {isValidatingCode && (
                                <div className={styles.validationLoading}>
                                    <div className={styles.loadingSpinnerSmall}></div>
                                    Validating code...
                                </div>
                            )}

                            {/* Сообщение о валидном коде */}
                            {codeValidation?.isValid && !isValidatingCode && (
                                <div className={`${styles.codeValidation} ${styles.validationValid}`}>
                                    <MdCheckCircle className={styles.validationIcon} />
                                    {codeValidation.message}
                                </div>
                            )}

                            {/* Сообщение о невалидном коде */}
                            {codeValidation && !codeValidation.isValid && !isValidatingCode && (
                                <div className={`${styles.codeValidation} ${styles.validationInvalid}`}>
                                    <MdError className={styles.validationIcon} />
                                    {codeValidation.message}
                                </div>
                            )}

                            {/* Общие ошибки формы */}
                            {errors.secretCode && !isValidatingCode && (
                                <p className={styles.formError}>
                                    <MdWarning className={styles.errorIcon} />
                                    {errors.secretCode}
                                </p>
                            )}
                        </div>

                        {/* Основные поля формы */}
                        <div className={styles.formGrid2col}>
                            <div className={styles.formGroup}>
                                <label htmlFor="name" className={styles.formLabel}>
                                    Full Name *
                                </label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                                    placeholder="Enter your full name"
                                    autoComplete="name"
                                    disabled={isLoading}
                                />
                                {errors.name && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.name}
                                    </p>
                                )}
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="nickname" className={styles.formLabel}>
                                    Nickname *
                                </label>
                                <input
                                    id="nickname"
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    className={`${styles.formInput} ${errors.nickname ? styles.inputError : ''}`}
                                    placeholder="Enter your nickname"
                                    autoComplete="username"
                                    disabled={isLoading}
                                />
                                {errors.nickname && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.nickname}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.formLabel}>
                                Email *
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
                                placeholder="Enter your email"
                                autoComplete="email"
                                disabled={isLoading}
                            />
                            {errors.email && (
                                <p className={styles.formError}>
                                    <MdWarning className={styles.errorIcon} />
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div className={styles.formGrid2col}>
                            <div className={styles.formGroup}>
                                <label htmlFor="password" className={styles.formLabel}>
                                    Password *
                                </label>
                                <div className={styles.passwordInputContainer}>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className={`${styles.formInput} ${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
                                        placeholder="Create a strong password"
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading}
                                    >
                                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>

                                {/* Индикатор силы пароля */}
                                {password.length > 0 && (
                                    <div className={styles.passwordStrengthIndicator}>
                                        <div className={styles.passwordStrengthText}>
                                            Strength: <span style={{ color: getPasswordStrengthColor() }}>{getPasswordStrengthLabel()}</span>
                                        </div>
                                        <div className={styles.passwordStrengthBar}>
                                            <div
                                                className={styles.passwordStrengthProgress}
                                                style={{
                                                    width: `${(passwordStrength / 4) * 100}%`,
                                                    backgroundColor: getPasswordStrengthColor()
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {errors.password && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.password}
                                    </p>
                                )}
                                <div className={styles.passwordHints}>
                                    <small>• At least 12 characters</small>
                                    <small>• Uppercase & lowercase letters</small>
                                    <small>• Numbers & special characters</small>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="confirmPassword" className={styles.formLabel}>
                                    Confirm Password *
                                </label>
                                <div className={styles.passwordInputContainer}>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className={`${styles.formInput} ${styles.passwordInput} ${errors.confirmPassword || (!passwordsMatch && confirmPassword) ? styles.inputError : ''}`}
                                        placeholder="Repeat password"
                                        autoComplete="new-password"
                                        disabled={isLoading}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading}
                                    >
                                        {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.confirmPassword}
                                    </p>
                                )}
                                {!errors.confirmPassword && !passwordsMatch && confirmPassword && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        Passwords do not match
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Hidden reCAPTCHA */}
                        <div style={{ display: 'none' }}>
                            <div className="g-recaptcha" data-sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY} data-size="invisible"></div>
                        </div>

                        <button
                            type="submit"
                            className={styles.submitButton}
                            disabled={isLoading || !isRecaptchaReady}
                        >
                            {isLoading ? (
                                <>
                                    <div className={styles.loadingSpinnerSmall}></div>
                                    Creating Account...
                                </>
                            ) : !isRecaptchaReady ? (
                                "Loading Security..."
                            ) : (
                                "Create Account"
                            )}
                        </button>

                        <p className={styles.registerLogin}>
                            Already have an account? <a href="/login" className={styles.linkPrimary}>Log in here</a>
                        </p>

                        <p className={styles.registerTerms}>
                            &copy; {new Date().getFullYear()} Sentinel LLC. By creating an account, you agree to our{" "}
                            <a href="/terms" className={styles.linkPrimary}>Terms</a> and <a href="/privacy" className={styles.linkPrimary}>Privacy Policy</a>.
                        </p>
                    </form>

                    {!isRecaptchaReady && (
                        <div className={styles.recaptchaLoading}>
                            <small>Loading security verification...</small>
                        </div>
                    )}
                </div>
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