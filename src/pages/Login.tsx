// Login.tsx - ОБНОВЛЯЕМ КОМПОНЕНТ

import { useState, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle.js";
import { LockModal } from "@/components/LocalModal.js";
import "../components/CSS/Login.css";

interface LoginProps {
  lockUntil: number | null;
  lockMessage: string;
  setLockUntil: React.Dispatch<React.SetStateAction<number | null>>;
  setLockMessage: React.Dispatch<React.SetStateAction<string>>;
}

export const Login: React.FC<LoginProps> = ({
  lockUntil,
  lockMessage,
  setLockUntil,
  setLockMessage,
}) => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:5173") return;

      console.log('Received message from OAuth popup:', event.data);

      if (event.data.type === 'OAUTH_SUCCESS') {
        const { token, userId, method, requiresCompletion } = event.data;

        // Сохраняем токен
        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', userId);

        // Перенаправляем в зависимости от необходимости завершения профиля
        if (requiresCompletion) {
          navigate('/complete-profile');
        } else {
          navigate('/dashboard');
        }

      } else if (event.data.type === 'OAUTH_ERROR') {
        setOauthError(event.data.error || "Authentication failed");
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [navigate]);

  // Обработчик Discord OAuth
  const handleDiscordLogin = async () => {
    setIsDiscordLoading(true);
    setOauthError("");

    try {
      // Получаем URL для аутентификации Discord
      const response = await fetch("http://localhost:4000/api/oauth/discord");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate Discord login");
      }

      // ЗАМЕНЯЕМ window.open на window.location.href для редиректа в ЭТОЙ ЖЕ ВКЛАДКЕ
      window.location.href = data.authUrl;

    } catch (error) {
      console.error('Discord OAuth error:', error);
      setOauthError(error instanceof Error ? error.message : "Discord login failed");
    } finally {
      setIsDiscordLoading(false);
    }
  };

  // Обычный логин (остается без изменений)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setOauthError("");

    if (!identifier.trim()) {
      setErrors({ identifier: "Enter your email or login" });
      return;
    }
    if (!password.trim()) {
      setErrors({ password: "Enter the password" });
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
        if (data.error.includes("locked") || data.error.includes("temporarily")) {
          const lockTime = 30 * 60 * 1000;
          setLockUntil(Date.now() + lockTime);
          setLockMessage("Protection system activated. Please try again in 30 minutes.");
        } else {
          setErrors({
            identifier: "Invalid email/nickname or password",
            password: "Invalid email/nickname or password"
          });
        }
        return;
      }

      // Сохраняем токен и переходим на dashboard
      localStorage.setItem('authToken', data.session.token);
      navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);
      setErrors({ identifier: "Network error. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-header-top"><ThemeToggle /></div>
        <div className="login-header">
          <h1>Welcome Back</h1>
          <p>Log in to continue</p>
        </div>

        {oauthError && (
          <div className="login-error global-error">
            {oauthError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form" noValidate>
          {/* Поля для обычного логина */}
          <div className="login-input-group floating-label">
            <input
              id="identifier"
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder=" "
              className={errors.identifier ? "error" : ""}
              disabled={isLoading || isDiscordLoading}
            />
            <label htmlFor="identifier">Email or Login</label>
            {errors.identifier && <div className="input-error">{errors.identifier}</div>}
          </div>

          <div className="login-input-group floating-label password-group">
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className={errors.password ? "error" : ""}
                disabled={isLoading || isDiscordLoading}
              />
              <label htmlFor="password">Password</label>
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isDiscordLoading}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
            {errors.password && <div className="input-error">{errors.password}</div>}
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={isLoading || isDiscordLoading}
          >
            {isLoading ? "Loading..." : "Log in"}
          </button>

          <p className="login-register">
            Don't have an account? <a href="/register">Create an account</a>
          </p>

          <div className="login-divider">Or continue with</div>

          {/* Discord OAuth кнопка */}
          <button
            type="button"
            onClick={handleDiscordLogin}
            className="discord-oauth-btn"
            disabled={isLoading || isDiscordLoading}
          >
            {isDiscordLoading ? (
              <div className="loading-spinner-small"></div>
            ) : (
              <>
                <FaDiscord size={20} />
                Continue with Discord
              </>
            )}
          </button>

          <p className="login-terms">
            &copy; {new Date().getFullYear()} Sentinel LLC. By logging in, you agree to our{" "}
            <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
          </p>
        </form>
      </div>

      {lockUntil && (
        <LockModal
          message={lockMessage}
          onClose={() => setLockUntil(null)}
        />
      )}
    </div>
  );
};