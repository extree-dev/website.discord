// Login.tsx - ОБНОВЛЕННЫЙ КОМПОНЕНТ В СТИЛЕ COMPLETEPROFILE

import { useState, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { MdVisibility, MdVisibilityOff, MdWarning } from 'react-icons/md';
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

  // Обычный логин
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
      <div className="login-background"></div>
      <div className="login-container">
        <div className="login-card">
          <div className="login-header-top"><ThemeToggle /></div>

          <div className="login-header">
            <h2 className="login-title">Welcome Back</h2>
            <p className="login-subtitle">Log in to continue</p>
          </div>

          {oauthError && (
            <div className="global-error">
              <MdWarning className="error-icon" />
              {oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="identifier" className="form-label">
                Email or Login
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`form-input ${errors.identifier ? 'input-error' : ''}`}
                placeholder="Enter your email or username"
                disabled={isLoading || isDiscordLoading}
              />
              {errors.identifier && (
                <p className="form-error">
                  <MdWarning className="error-icon" />
                  {errors.identifier}
                </p>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="password" className="form-label">
                Password
              </label>
              <div className="password-input-container">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`form-input ${errors.password ? 'input-error' : ''}`}
                  placeholder="Enter your password"
                  disabled={isLoading || isDiscordLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isDiscordLoading}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {errors.password && (
                <p className="form-error">
                  <MdWarning className="error-icon" />
                  {errors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="submit-button"
              disabled={isLoading || isDiscordLoading}
            >
              {isLoading ? (
                <>
                  <div className="loading-spinner-small"></div>
                  Loading...
                </>
              ) : (
                "Log in"
              )}
            </button>

            <p className="login-register">
              Don't have an account? <a href="/register" className="link-primary">Create an account</a>
            </p>

            <div className="login-divider">
              <span>Or continue with</span>
            </div>

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
                  <FaDiscord className="discord-icon" />
                  Continue with Discord
                </>
              )}
            </button>

            <p className="login-terms">
              &copy; {new Date().getFullYear()} Sentinel LLC. By logging in, you agree to our{" "}
              <a href="/terms" className="link-primary">Terms</a> and <a href="/privacy" className="link-primary">Privacy Policy</a>.
            </p>
          </form>
        </div>
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