// Login.tsx - ОБНОВЛЕННЫЙ С БЛОКИРОВКОЙ ПРИ ЛОКЕ

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
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscordLoading, setIsDiscordLoading] = useState(false);
  const [oauthError, setOauthError] = useState("");

  const navigate = useNavigate();

  // Проверяем заблокирована ли форма
  const isLocked = lockUntil !== null && lockUntil > Date.now();

  useEffect(() => {
    if (!lockUntil) return;

    const interval = setInterval(() => {
      if (Date.now() >= lockUntil) {
        setLockUntil(null);
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockUntil, setLockUntil]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "http://localhost:5173") return;

      console.log('Received message from OAuth popup:', event.data);

      if (event.data.type === 'OAUTH_SUCCESS') {
        const { token, userId, method, requiresCompletion } = event.data;

        localStorage.setItem('authToken', token);
        localStorage.setItem('userId', userId);

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

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return; // Блокируем ввод при локе
    setIdentifier(e.target.value);
    if (errors.identifier || formError) {
      setErrors(prev => ({ ...prev, identifier: undefined }));
      setFormError("");
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLocked) return; // Блокируем ввод при локе
    setPassword(e.target.value);
    if (errors.password || formError) {
      setErrors(prev => ({ ...prev, password: undefined }));
      setFormError("");
    }
  };

  const handleDiscordLogin = async () => {
    if (isLocked) return; // Блокируем OAuth при локе

    setIsDiscordLoading(true);
    setOauthError("");

    try {
      const response = await fetch("http://localhost:4000/api/oauth/discord");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initiate Discord login");
      }

      window.location.href = data.authUrl;

    } catch (error) {
      console.error('Discord OAuth error:', error);
      setOauthError(error instanceof Error ? error.message : "Discord login failed");
    } finally {
      setIsDiscordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return; // Блокируем отправку формы при локе

    setErrors({});
    setFormError("");
    setOauthError("");

    const newErrors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      newErrors.identifier = "Enter your email or login";
    }
    if (!password.trim()) {
      newErrors.password = "Enter the password";
    }

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
        if (data.error.includes("locked") || data.error.includes("temporarily")) {
          const lockTime = 2 * 60 * 1000;
          setLockUntil(Date.now() + lockTime);
          setLockMessage("Protection system activated. Please try again in 2 minutes.");
        } else {
          let errorMessage = "Invalid email/nickname or password";

          if (data.errorType === 'identifier_not_found') {
            errorMessage = "Invalid email or username";
          } else if (data.errorType === 'invalid_password') {
            errorMessage = "Invalid password";
          } else if (data.error) {
            errorMessage = data.error;
          }

          setFormError(errorMessage);
        }
        return;
      }

      localStorage.setItem('authToken', data.session.token);
      navigate("/dashboard");

    } catch (err) {
      console.error("Login error:", err);
      setFormError("Network error. Please try again.");
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

          {formError && (
            <div className={styles.globalError}>
              <MdWarning className={styles.errorIcon} />
              {formError}
            </div>
          )}

          {oauthError && (
            <div className={styles.globalError}>
              <MdWarning className={styles.errorIcon} />
              {oauthError}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form} noValidate>
            <div className={styles.formGroup}>
              <input
                id="identifier"
                type="text"
                value={identifier}
                onChange={handleIdentifierChange}
                className={`${styles.formInput} ${errors.identifier ? styles.inputError : ''} ${isLocked ? styles.inputDisabled : ''}`}
                placeholder="Enter your email or username"
                disabled={isLoading || isDiscordLoading || isLocked} // Добавляем isLocked
              />
              {errors.identifier && (
                <p className={styles.formError}>
                  <MdWarning className={styles.errorIcon} />
                  {errors.identifier}
                </p>
              )}
            </div>

            <div className={styles.formGroup}>
              <div className={styles.passwordInputContainer}>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={handlePasswordChange}
                  className={`${styles.formInput} ${styles.passwordInput} ${errors.password ? styles.inputError : ''} ${isLocked ? styles.inputDisabled : ''}`}
                  placeholder="Enter your password"
                  disabled={isLoading || isDiscordLoading || isLocked} // Добавляем isLocked
                />
                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => !isLocked && setShowPassword(!showPassword)} // Блокируем переключение
                  disabled={isLoading || isDiscordLoading || isLocked} // Добавляем isLocked
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

              <div className={styles.forgotPassword}>
                <a href="/forgot-password" className={isLocked ? styles.linkDisabled : ''}>
                  Forgot password?
                </a>
              </div>
            </div>

            <button
              type="submit"
              className={`${styles.submitButton} ${isLocked ? styles.buttonDisabled : ''}`}
              disabled={isLoading || isDiscordLoading || isLocked} // Добавляем isLocked
            >
              {isLoading ? (
                <>
                  <div className={styles.loadingSpinnerSmall}></div>
                  Loading...
                </>
              ) : isLocked ? (
                "Account Locked"
              ) : (
                "Log in"
              )}
            </button>

            <p className={styles.loginRegister}>
              Don't have an account? <a href="/register" className={isLocked ? styles.linkDisabled : styles.linkPrimary}>
                Create an account
              </a>
            </p>

            <div className={styles.loginDivider}>
              <span>Or continue with</span>
            </div>

            <button
              type="button"
              onClick={handleDiscordLogin}
              className={`${styles.discordOauthBtn} ${isLocked ? styles.buttonDisabled : ''}`}
              disabled={isLoading || isDiscordLoading || isLocked} // Добавляем isLocked
            >
              {isDiscordLoading ? (
                <div className={styles.loadingSpinnerSmall}></div>
              ) : isLocked ? (
                "Account Locked"
              ) : (
                <>
                  <FaDiscord className={styles.discordIcon} />
                  Continue with Discord
                </>
              )}
            </button>

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
              <a href="/terms" className={isLocked ? styles.linkDisabled : styles.linkPrimary}>Terms</a> and{" "}
              <a href="/privacy" className={isLocked ? styles.linkDisabled : styles.linkPrimary}>Privacy Policy</a>.
            </p>
          </form>
        </div>
      </div>

      {lockUntil && (
        <LockModal
          message={lockMessage}
          lockUntil={lockUntil} // Добавляем пропс
          onClose={() => setLockUntil(null)}
        />
      )}
    </div>
  );
};