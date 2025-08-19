import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import "../components/CSS/Register.css"; // отдельный CSS для Register
import { Eye, EyeOff } from "lucide-react";

export const Register = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirmPassword) {
            setError("Passwords do not match");
            return;
        }

        setIsLoading(true);
        try {
            // TODO: реальная регистрация
            navigate("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Registration failed");
        } finally {
            setIsLoading(false);
        }
    };

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

                <form className="register-form" onSubmit={handleSubmit}>
                    <div className="register-input-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="register-input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="register-input-group password-group">
                        <label>Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="register-input-group password-group">
                        <label>Confirm Password</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <button type="submit" className="register-btn" disabled={isLoading}>
                        {isLoading ? "Loading..." : "Create account"}
                    </button>
                </form>

                <div className="register-footer">
                    <p>
                        Already have an account?{" "}
                        <button className="register-link" onClick={() => navigate("/login")}>
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
