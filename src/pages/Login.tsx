import { useState } from "react";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle.js";
import "../components/CSS/Login.css";

export const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();

    const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setIdentifier(e.target.value);
        if (errors.identifier) setErrors(prev => ({ ...prev, identifier: undefined }));
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPassword(e.target.value);
        if (errors.password) setErrors(prev => ({ ...prev, password: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newErrors: typeof errors = {};
        if (!identifier.trim()) newErrors.identifier = "Enter your email or login";
        if (!password.trim()) newErrors.password = "Enter the password";
        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);
        try {
            const res = await fetch("http://localhost:4000/api/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ identifier, password }),
            });
            const data = await res.json();
            if (!res.ok) {
                const serverErrors: typeof errors = {};
                if (data.error.includes("User")) serverErrors.identifier = data.error;
                else if (data.error.includes("password")) serverErrors.password = data.error;
                else serverErrors.identifier = data.error;
                setErrors(serverErrors);
                return;
            }
            navigate("/dashboard");
        } catch (err) {
            setErrors({ identifier: err instanceof Error ? err.message : "Login failed" });
        } finally {
            setIsLoading(false);
        }
    };

    // ======= OAuth =======
    const handleOAuth = (provider: "discord" | "google" | "github") => {
        const oauthWindow = window.open(
            `http://localhost:4000/api/oauth/${provider}`,
            "_blank",
            "width=500,height=600"
        );

        // Слушаем сообщение с редиректом от сервера
        const oauthListener = (event: MessageEvent) => {
            if (event.origin !== "http://localhost:4000") return;
            const { redirect } = event.data;
            if (redirect) window.location.href = redirect;
            window.removeEventListener("message", oauthListener);
        };

        window.addEventListener("message", oauthListener);
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header-top"><ThemeToggle /></div>
                <div className="login-header">
                    <h1>Welcome Back</h1>
                    <p>Log in to continue</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    {/* Identifier */}
                    <div className="login-input-group floating-label">
                        <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={handleIdentifierChange}
                            placeholder=" "
                            className={errors.identifier ? "error" : ""}
                        />
                        <label htmlFor="identifier">Email or Login</label>
                        {errors.identifier && <div className="input-error">{errors.identifier}</div>}
                    </div>

                    {/* Password */}
                    <div className="login-input-group floating-label password-group">
                        <div className="password-wrapper">
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={handlePasswordChange}
                                placeholder=" "
                                className={errors.password ? "error" : ""}
                            />
                            <label htmlFor="password">Password</label>
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                        {errors.password && <div className="input-error">{errors.password}</div>}
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? "Loading..." : "Log in"}
                    </button>

                    <p className="login-register">
                        Don't have an account? <a href="/register">Create an account</a>
                    </p>

                    <div className="login-divider">Or login with</div>

                    <div className="login-socials">
                        <button type="button" onClick={() => handleOAuth("discord")} className="login-social discord">
                            <FaDiscord size={24} />
                        </button>
                    </div>


                    <p className="login-terms">
                        &copy; {new Date().getFullYear()} Sentinel LLC. By logging in, you agree to our{" "}
                        <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                    </p>
                </form>
            </div>
        </div>
    );
};
