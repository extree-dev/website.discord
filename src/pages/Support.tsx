import { useState } from "react";
import { MdWarning, MdLock, MdArrowBack, MdEmail, MdChat, MdHelp } from 'react-icons/md';
import { useNavigate } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle/ThemeToggle.js";
import styles from "../module_pages/Support.module.scss";

// Определяем тип для ошибок
type FormErrors = {
    [key: string]: string | undefined;
};

export const Support: React.FC = () => {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [subject, setSubject] = useState("");
    const [message, setMessage] = useState("");
    const [category, setCategory] = useState("general");
    const [errors, setErrors] = useState<FormErrors>({}); // Исправленный тип
    const [formError, setFormError] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const navigate = useNavigate();

    const handleBackToLogin = () => {
        navigate("/login");
    };

    const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>, field: string) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
            setter(e.target.value);
            if (errors[field] || formError) {
                setErrors(prev => ({ ...prev, [field]: undefined })); // Теперь работает
                setFormError("");
            }
        };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrors({});
        setFormError("");

        // Валидация на клиенте
        const newErrors: FormErrors = {}; // Используем тот же тип

        if (!name.trim()) {
            newErrors.name = "Please enter your name";
        }
        if (!email.trim()) {
            newErrors.email = "Please enter your email address";
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = "Please enter a valid email address";
        }
        if (!subject.trim()) {
            newErrors.subject = "Please enter a subject";
        }
        if (!message.trim()) {
            newErrors.message = "Please enter your message";
        } else if (message.trim().length < 10) {
            newErrors.message = "Please provide more details (at least 10 characters)";
        }

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch("http://localhost:4000/api/support", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name,
                    email,
                    subject,
                    message,
                    category,
                    timestamp: new Date().toISOString()
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Failed to send support request");
                return;
            }

            // Успешная отправка
            setIsSuccess(true);

        } catch (err) {
            console.error("Support request error:", err);
            setFormError("Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const supportCategories = [
        { value: "general", label: "General Inquiry" },
        { value: "technical", label: "Technical Issue" },
        { value: "billing", label: "Billing Question" },
        { value: "account", label: "Account Issue" },
        { value: "feature", label: "Feature Request" },
        { value: "bug", label: "Bug Report" },
        { value: "other", label: "Other" }
    ];

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
                        <h2 className={styles.title}>Contact Support</h2>
                        <p className={styles.subtitle}>
                            {isSuccess
                                ? "We've received your message and will respond soon"
                                : "Get help with your account, technical issues, or general questions"
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
                                <MdChat />
                            </div>
                            <h3 className={styles.successTitle}>Message Sent Successfully</h3>
                            <p className={styles.successMessage}>
                                Thank you for contacting us! We've received your support request and will get back to you at <strong>{email}</strong> within 24 hours.
                            </p>
                            <div className={styles.successActions}>
                                <button
                                    className={styles.newRequestButton}
                                    onClick={() => {
                                        setIsSuccess(false);
                                        setName("");
                                        setEmail("");
                                        setSubject("");
                                        setMessage("");
                                        setCategory("general");
                                    }}
                                >
                                    Submit Another Request
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
                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="name" className={styles.formLabel}>
                                        Your Name *
                                    </label>
                                    <input
                                        id="name"
                                        type="text"
                                        value={name}
                                        onChange={handleInputChange(setName, 'name')}
                                        className={`${styles.formInput} ${errors.name ? styles.inputError : ''}`}
                                        placeholder="Enter your full name"
                                        disabled={isLoading}
                                    />
                                    {errors.name && (
                                        <p className={styles.formError}>
                                            <MdWarning className={styles.errorIcon} />
                                            {errors.name}
                                        </p>
                                    )}
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="email" className={styles.formLabel}>
                                        Email Address *
                                    </label>
                                    <input
                                        id="email"
                                        type="email"
                                        value={email}
                                        onChange={handleInputChange(setEmail, 'email')}
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
                            </div>

                            <div className={styles.formRow}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="category" className={styles.formLabel}>
                                        Category *
                                    </label>
                                    <select
                                        id="category"
                                        value={category}
                                        onChange={handleInputChange(setCategory, 'category')}
                                        className={styles.formSelect}
                                        disabled={isLoading}
                                    >
                                        {supportCategories.map(cat => (
                                            <option key={cat.value} value={cat.value}>
                                                {cat.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="subject" className={styles.formLabel}>
                                        Subject *
                                    </label>
                                    <input
                                        id="subject"
                                        type="text"
                                        value={subject}
                                        onChange={handleInputChange(setSubject, 'subject')}
                                        className={`${styles.formInput} ${errors.subject ? styles.inputError : ''}`}
                                        placeholder="Brief description of your issue"
                                        disabled={isLoading}
                                    />
                                    {errors.subject && (
                                        <p className={styles.formError}>
                                            <MdWarning className={styles.errorIcon} />
                                            {errors.subject}
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="message" className={styles.formLabel}>
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    value={message}
                                    onChange={handleInputChange(setMessage, 'message')}
                                    className={`${styles.formTextarea} ${errors.message ? styles.inputError : ''}`}
                                    placeholder="Please describe your issue in detail..."
                                    rows={6}
                                    disabled={isLoading}
                                />
                                {errors.message && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.message}
                                    </p>
                                )}
                                <div className={styles.charCount}>
                                    {message.length} characters (minimum 10)
                                </div>
                            </div>

                            <button
                                type="submit"
                                className={styles.submitButton}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className={styles.loadingSpinnerSmall}></div>
                                        Sending Message...
                                    </>
                                ) : (
                                    <>
                                        <MdEmail className={styles.buttonIcon} />
                                        Send Support Request
                                    </>
                                )}
                            </button>
                        </form>
                    )}

                    <div className={styles.supportInfo}>
                        <div className={styles.infoItem}>
                            <MdHelp className={styles.infoIcon} />
                            <div className={styles.infoContent}>
                                <h4>Quick Help</h4>
                                <p>Check our <a href="/help" className={styles.linkPrimary}>Help Center</a> for common questions and solutions.</p>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <MdLock className={styles.infoIcon} />
                            <div className={styles.infoContent}>
                                <h4>Security Notice</h4>
                                <p>Never share your password. Our team will never ask for sensitive credentials.</p>
                            </div>
                        </div>
                    </div>

                    <p className={styles.terms}>
                        &copy; {new Date().getFullYear()} Sentinel LLC. View our{" "}
                        <a href="/terms" className={styles.linkPrimary}>Terms of Service</a> and{" "}
                        <a href="/privacy" className={styles.linkPrimary}>Privacy Policy</a>.
                    </p>
                </div>
            </div>
        </div>
    );
};