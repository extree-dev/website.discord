import { useState } from "react";
import { MdWarning, MdLock, MdArrowBack } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle.js";
import styles from "../module_pages/ForgotPassword.module.scss";

export const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<{ email?: string }>({});
    const [formError, setFormError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const navigate = useNavigate();

    const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEmail(e.target.value);
        if (errors.email || formError) {
            setErrors({});
            setFormError("");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setFormError("");

        // Валидация на клиенте
        const newErrors: { email?: string } = {};

        if (!email.trim()) {
            newErrors.email = "Enter your email address";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("http://localhost:4000/api/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Failed to send reset instructions");
                return;
            }

            // Успешная отправка
            setIsSuccess(true);

        } catch (err) {
            console.error("Forgot password error:", err);
            setFormError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBackToLogin = () => {
        navigate("/login");
    };

    return (
        <div className={styles.wrapper}>
            <div className={styles.background}></div>
            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.headerTop}>
                        <ThemeToggle />
                    </div>

                    {/* Back button */}
                    <button className={styles.backButton} onClick={handleBackToLogin}>
                        <MdArrowBack className={styles.backIcon} />
                        Back to Login
                    </button>

                    <div className={styles.header}>
                        <h2 className={styles.title}>Reset Your Password</h2>
                        <p className={styles.subtitle}>
                            {isSuccess
                                ? "Check your email for reset instructions"
                                : "Enter your email to receive reset instructions"
                            }
                        </p>
                    </div>

                    {formError && (
                        <div className={styles.globalError}>
                            <MdWarning className={styles.errorIcon} />
                            {formError}
                        </div>
                    )}

                    {isSuccess ? (
                        <div className={styles.successSection}>
                            <div className={styles.successIcon}>
                                <MdLock />
                            </div>
                            <h3 className={styles.successTitle}>Check Your Email</h3>
                            <p className={styles.successMessage}>
                                We've sent password reset instructions to <strong>{email}</strong>.
                                Please check your inbox and follow the link to reset your password.
                            </p>
                            <div className={styles.successActions}>
                                <button
                                    className={styles.resendButton}
                                    onClick={handleSubmit}
                                    disabled={isLoading}
                                >
                                    {isLoading ? "Sending..." : "Resend Instructions"}
                                </button>
                                <button
                                    className={styles.backToLoginButton}
                                    onClick={handleBackToLogin}
                                >
                                    Return to Login
                                </button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className={styles.form} noValidate>
                            <div className={styles.formGroup}>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={handleEmailChange}
                                    className={`${styles.formInput} ${errors.email ? styles.inputError : ''}`}
                                    placeholder="Enter your email address"
                                    disabled={isLoading}
                                />
                                {errors.email && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.email}
                                    </p>
                                )}
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className={styles.loadingSpinnerSmall}></div>
                                        Sending Instructions...
                                    </>
                                ) : (
                                    "Send Reset Instructions"
                                )}
                            </button>
                        </form>
                    )}

                    <div className={styles.securityNote}>
                        <div className={styles.securityNote__title}>
                            <MdLock size={14} style={{ marginRight: '0.5rem' }} />
                            Secure Password Reset
                        </div>
                        <div className={styles.securityNote__content}>
                            Reset links are valid for 1 hour and can only be used once.
                            For security reasons, we don't indicate if an email is registered.
                        </div>
                    </div>

                    <p className={styles.helpText}>
                        Need help? <a href="/support" className={styles.linkPrimary}>Contact support</a>
                    </p>

                    <p className={styles.terms}>
                        &copy; {new Date().getFullYear()} Sentinel LLC. By resetting your password, you agree to our{" "}
                        <a href="/terms" className={styles.linkPrimary}>Terms</a> and{" "}
                        <a href="/privacy" className={styles.linkPrimary}>Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};