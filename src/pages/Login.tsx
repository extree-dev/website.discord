import { useState, useEffect } from "react";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import "../components/CSS/Login.css"; // отдельный CSS для Login

export const Login = () => {
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const isEmail = (value: string) => /\S+@\S+\.\S+/.test(value);

    // Очистка ошибки при изменении полей ввода
    useEffect(() => {
        if (error && identifier.trim()) {
            setError("");
        }
    }, [identifier, error]);

    useEffect(() => {
        if (error && password.trim()) {
            setError("");
        }
    }, [password, error]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!identifier.trim()) {
            setError("Enter your email or login");
            return;
        }
        if (!password.trim()) {
            setError("Enter the password");
            return;
        }

        setIsLoading(true);
        try {
            console.log(isEmail(identifier) ? "Email entered" : "Login entered", identifier);
            console.log("Password:", password);

            // TODO: реальный запрос на сервер
            navigate("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Login failed");
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = (provider: "discord" | "google" | "github") => {
        console.log(`Redirect to ${provider} OAuth`);
    };

    return (
        <div className="login-wrapper">
            <div className="login-card">
                <div className="login-header-top">
                    <ThemeToggle />
                </div>

                <div className="login-header">
                    <h1>Welcome Back</h1>
                    <p>Log in to continue</p>
                </div>

                {error && <div className="login-error">{error}</div>}

                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    <div className="login-input-group floating-label">
                        <input
                            id="identifier"
                            type="text"
                            value={identifier}
                            onChange={(e) => setIdentifier(e.target.value)}
                            placeholder=" "
                            required
                        />
                        <label htmlFor="identifier">Email or Login</label>
                    </div>

                    <div className="login-input-group floating-label password-group">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder=" "
                            required
                        />
                        <label htmlFor="password">Password</label>
                        {password && (
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        )}
                    </div>

                    <button type="submit" className="login-btn" disabled={isLoading}>
                        {isLoading ? "Loading..." : "Log in"}
                    </button>
                    <p className="login-register">
                        Don't have an account? <a href="/register">Create an account</a>
                    </p>

                    <div className="login-divider">Or login with</div>

                    <div className="login-socials">
                        <button onClick={() => handleOAuth("github")} className="login-social github">
                            <FaGithub size={24} />
                        </button>
                        <button onClick={() => handleOAuth("discord")} className="login-social discord">
                            <FaDiscord size={24} />
                        </button>
                        <button onClick={() => handleOAuth("google")} className="login-social google">
                            <FaGoogle size={24} />
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