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
        confirmPassword?: string;
    }>({});
    const [isLoading, setIsLoading] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordsMatch, setPasswordsMatch] = useState(true);

    const navigate = useNavigate();

    const [form, setForm] = useState({
        username: "",
        email: "",
        password: ""
    });

    const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const validateNickname = (nickname: string) => /^[a-zA-Z0-9_]{3,20}$/.test(nickname);

    useEffect(() => setPasswordsMatch(password === confirmPassword || confirmPassword === ""), [password, confirmPassword]);
    useEffect(() => {
        let strength = 0;
        if (password.length >= 8) strength += 1;
        if (/[A-Z]/.test(password)) strength += 1;
        if (/\d/.test(password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;
        setPasswordStrength(strength);
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        const newErrors: typeof errors = {};
        let valid = true;

        if (!name.trim()) { newErrors.name = "Full name is required"; valid = false; }
        if (!nickname.trim()) { newErrors.nickname = "Nickname is required"; valid = false; }
        else if (!validateNickname(nickname)) { newErrors.nickname = "3-20 chars, letters, numbers, underscores"; valid = false; }
        if (!email.trim()) { newErrors.email = "Email is required"; valid = false; }
        else if (!validateEmail(email)) { newErrors.email = "Invalid email"; valid = false; }
        if (!password) { newErrors.password = "Password is required"; valid = false; }
        else if (password.length < 8) { newErrors.password = "Password must be 8+ chars"; valid = false; }
        if (!confirmPassword) { newErrors.confirmPassword = "Confirm your password"; valid = false; }
        else if (password !== confirmPassword) { newErrors.confirmPassword = "Passwords do not match"; valid = false; }

        setErrors(newErrors);
        if (!valid) return;

        setIsLoading(true);
        try {
            const res = await fetch("http://localhost:4000/api/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form)  // <--- теперь TS знает, что такое form
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Registration failed");
            navigate("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
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
                                />
                                <label htmlFor="password">Password</label>
                                {password.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowPassword(!showPassword)}
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
                                />
                                <label htmlFor="confirmPassword">Confirm Password</label>
                                {confirmPassword.length > 0 && (
                                    <button
                                        type="button"
                                        className="password-toggle-btn"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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

                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? <span className="loading-spinner"></span> : "Create account"}
                    </button>
                </form>
            </div>
        </div>
    );
};
