// Login.tsx - ОБНОВЛЕННЫЙ КОМПОНЕНТ В СТИЛЕ COMPLETEPROFILE

import { useState, useEffect } from "react";
import { FaDiscord } from "react-icons/fa";
import { MdVisibility, MdVisibilityOff, MdWarning, MdLock } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle.js";
import { LockModal } from "@/components/LocalModal.js";
import styles from "../module_pages/Login.module.scss";

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
    <div className={styles.wrapper}>
      <div className={styles.background}></div>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.headerTop}><ThemeToggle /></div>

          <div className={styles.header}>
            <h2 className={styles.title}>Welcome Back</h2>
            <p className={styles.subtitle}>Log in to continue</p>
          </div>

          {oauthError && (
            <div className={styles.globalError}>
              <MdWarning className={styles.errorIcon} />
              {oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.formGroup}>
              <label htmlFor="identifier" className={styles.formLabel}>
                Email or Login
              </label>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className={`${styles.formInput} ${errors.identifier ? styles.inputError : ''}`}
                placeholder="Enter your email or username"
                disabled={isLoading || isDiscordLoading}
              />
              {errors.identifier && (
                <p className={styles.formError}>
                  <MdWarning className={styles.errorIcon} />
                  {errors.identifier}
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="password" className={styles.formLabel}>
                Password
              </label>
              <div className={styles.passwordInputContainer}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${styles.formInput} ${styles.passwordInput} ${errors.password ? styles.inputError : ''}`}
                  placeholder="Enter your password"
                  disabled={isLoading || isDiscordLoading}
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading || isDiscordLoading}
                >
                  {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                </button>
              </div>
              {errors.password && (
                <p className={styles.formError}>
                  <MdWarning className={styles.errorIcon} />
                  {errors.password}
                </p>
              )}

              {/* Forgot Password Link */}
              <div className={styles.forgotPassword}>
                <a href="/forgot-password">Forgot password?</a>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isLoading || isDiscordLoading}
            >
              {isLoading ? (
                <>
                  <div className={styles.loadingSpinnerSmall}></div>
                  Loading...
                </>
              ) : (
                "Log in"
              )}
            </button>

            <p className={styles.loginRegister}>
              Don't have an account? <a href="/register" className={styles.linkPrimary}>Create an account</a>
            </p>

            <div className={styles.loginDivider}>
              <span>Or continue with</span>
            </div>

            {/* Discord OAuth кнопка */}
            <button
              type="button"
              onClick={handleDiscordLogin}
              className={styles.discordOauthBtn}
              disabled={isLoading || isDiscordLoading}
            >
              {isDiscordLoading ? (
                <div className={styles.loadingSpinnerSmall}></div>
              ) : (
                <>
                  <FaDiscord className={styles.discordIcon} />
                  Continue with Discord
                </>
              )}
            </button>

            {/* Security Note */}
            <div className={styles.securityNote}>
              <div className={styles.securityNote__title}>
                <MdLock size={14} style={{ marginRight: '0.5rem' }} />
                Secure Authentication
              </div>
              <div className={styles.securityNote__content}>
                Your login information is protected with industry-standard encryption.
                We never store your password in plain text.
              </div>
            </div>

            <p className={styles.loginTerms}>
              &copy; {new Date().getFullYear()} Sentinel LLC. By logging in, you agree to our{" "}
              <a href="/terms" className={styles.linkPrimary}>Terms</a> and <a href="/privacy" className={styles.linkPrimary}>Privacy Policy</a>.
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