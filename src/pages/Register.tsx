import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import "../components/CSS/Register.css";
import { Eye, EyeOff } from "lucide-react";

export const Register = () => {
    const [name, setName] = useState("");
    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState("");
    const [errors, setErrors] = useState<{ 
        name?: string; 
        nickname?: string;
        email?: string; 
        password?: string; 
        confirmPassword?: string 
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordsMatch, setPasswordsMatch] = useState(true);

    const navigate = useNavigate();

    // Валидация email при изменении
    const validateEmail = (email: string) => {
        if (email.trim() === "") return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    // Валидация nickname (только буквы, цифры, подчеркивания, 3-20 символов)
    const validateNickname = (nickname: string) => {
        if (nickname.trim() === "") return true;
        const nicknameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        return nicknameRegex.test(nickname);
    };

    // Очистка ошибок при заполнении полей
    useEffect(() => {
        if (name.trim() && errors.name) {
            setErrors(prev => ({ ...prev, name: undefined }));
        }
    }, [name, errors.name]);

    useEffect(() => {
        if (nickname.trim() && errors.nickname) {
            setErrors(prev => ({ ...prev, nickname: undefined }));
        }
    }, [nickname, errors.nickname]);

    useEffect(() => {
        if (email.trim() && errors.email) {
            setErrors(prev => ({ ...prev, email: undefined }));
        }
    }, [email, errors.email]);

    useEffect(() => {
        if (password && errors.password) {
            setErrors(prev => ({ ...prev, password: undefined }));
        }
    }, [password, errors.password]);

    useEffect(() => {
        if (confirmPassword && errors.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }
        setPasswordsMatch(password === confirmPassword || confirmPassword === "");
    }, [password, confirmPassword, errors.confirmPassword]);

    useEffect(() => {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    }, [password]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let valid = true;
        const newErrors: typeof errors = {};

        if (!name.trim()) {
            newErrors.name = "Full name is required";
            valid = false;
        }

        if (!nickname.trim()) {
            newErrors.nickname = "Nickname is required";
            valid = false;
        } else if (!validateNickname(nickname)) {
            newErrors.nickname = "Nickname must be 3-20 characters (letters, numbers, underscores only)";
            valid = false;
        }

        if (!email.trim()) {
            newErrors.email = "Email is required";
            valid = false;
        } else if (!validateEmail(email)) {
            newErrors.email = "Please enter a valid email address";
            valid = false;
        }

        if (!password) {
            newErrors.password = "Password is required";
            valid = false;
        } else if (password.length < 8) {
            newErrors.password = "Password must be at least 8 characters";
            valid = false;
        }

        if (!confirmPassword) {
            newErrors.confirmPassword = "Please confirm your password";
            valid = false;
        } else if (password !== confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
            valid = false;
        }

        setErrors(newErrors);

        if (!valid) return;

        setIsLoading(true);
        try {
            // Симуляция API запроса
            setTimeout(() => {
                navigate("/dashboard");
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

    const getPasswordStrengthLabel = () => {
        switch (passwordStrength) {
            case 0: return "Very Weak";
            case 1: return "Weak";
            case 2: return "Medium";
            case 3: return "Strong";
            case 4: return "Very Strong";
            default: return "";
        }
    };

    const getPasswordStrengthColor = () => {
        switch (passwordStrength) {
            case 0: return "#ff4444";
            case 1: return "#ff8800";
            case 2: return "#ffbb33";
            case 3: return "#00C851";
            case 4: return "#007E33";
            default: return "#666";
        }
    };

    const isEmailInvalid = email.trim() && !validateEmail(email);
    const isNicknameInvalid = nickname.trim() && !validateNickname(nickname);

    return (
        <div className="register-wrapper">
            <div className="register-card">
                <div className="register-header-top">
                    <ThemeToggle />
                </div>

                <div className="register-header">
                    <h1>Create your account</h1>
                    <p>Get started with our platform</p>
                </div>

                {error && <div className="register-error">{error}</div>}

                <form className="register-form" onSubmit={handleSubmit} noValidate>

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
                                />
                                <label htmlFor="name">Full Name</label>
                            </div>
                        </div>
                        <div className="error-message-container">
                            {errors.name && <div className="input-error">{errors.name}</div>}
                        </div>
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
                                    className={errors.nickname || isNicknameInvalid ? "error" : ""}
                                />
                                <label htmlFor="nickname">Nickname</label>
                            </div>
                        </div>
                        <div className="error-message-container">
                            {errors.nickname && <div className="input-error">{errors.nickname}</div>}
                            {!errors.nickname && isNicknameInvalid && (
                                <div className="input-error">3-20 characters (letters, numbers, underscores only)</div>
                            )}
                        </div>
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
                                    className={errors.email || isEmailInvalid ? "error" : ""}
                                />
                                <label htmlFor="email">Email</label>
                            </div>
                        </div>
                        <div className="error-message-container">
                            {errors.email && <div className="input-error">{errors.email}</div>}
                            {!errors.email && isEmailInvalid && (
                                <div className="input-error">Please enter a valid email address</div>
                            )}
                        </div>
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
                                />
                                <label htmlFor="password">Password</label>
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        title={showPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowPassword(!showPassword)}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="error-message-container">
                            {errors.password && (
                                <div className="input-error">{errors.password}</div>
                            )}
                            {password.length > 0 && !errors.password && (
                                <div className="password-strength" style={{ color: getPasswordStrengthColor() }}>
                                    Strength: {getPasswordStrengthLabel()}
                                </div>
                            )}
                        </div>
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
                                />
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                {confirmPassword.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        title={showConfirmPassword ? "Hide password" : "Show password"}
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="error-message-container">
                            {errors.confirmPassword && (
                                <div className="input-error">{errors.confirmPassword}</div>
                            )}
                            {!errors.confirmPassword && !passwordsMatch && confirmPassword && (
                                <div className="input-error">Passwords do not match</div>
                            )}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="register-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? <span className="loading-spinner"></span> : "Create account"}
                    </button>
                </form>

                <div className="register-footer">
                    <p>
                        Already have an account?{" "}
                        <button 
                            className="register-link" 
                            onClick={() => navigate("/login")}
                            type="button"
                        >
                            Sign in
                        </button>
                    </p>
                </div>

                <p className="login-terms">
                    &copy; {new Date().getFullYear()} Sentinel LLC. By logging in, you agree to our{" "}
                    <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                </p>
            </div>
        </div>
    );
};