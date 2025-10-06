// CompleteProfile.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdVerified, MdWarning, MdKey, MdVisibility, MdVisibilityOff } from "react-icons/md";
import ThemeToggle from "./ThemeToggle/ThemeToggle.js";
import CountrySelect from "./CountrySelect.js";
import styles from "../styles/components/CompleteProfile.module.scss";

interface ProfileData {
    firstName: string;
    country: string;
    city: string;
    agreeTerms: boolean;
    secretCode: string;
    password: string;
    confirmPassword: string;
}

interface ProfileErrors {
    firstName?: string;
    country?: string;
    city?: string;
    agreeTerms?: string;
    secretCode?: string;
    password?: string;
    confirmPassword?: string;
}

interface UserInfo {
    email: string;
    name: string;
    avatar?: string;
    discordId?: string;
    emailVerified?: boolean;
    discordCreatedAt?: string;
    highestRole?: string;
    roleColor?: number;
    roleHexColor?: string;
}

export const CompleteProfile: React.FC = () => {
    const [profileData, setProfileData] = useState<ProfileData>({
        firstName: '',
        country: '',
        city: '',
        agreeTerms: false,
        secretCode: '',
        password: '',
        confirmPassword: ''
    });

    const [errors, setErrors] = useState<ProfileErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isCountryListOpen, setIsCountryListOpen] = useState(false);
    const [isValidatingCode, setIsValidatingCode] = useState(false);
    const [codeValidation, setCodeValidation] = useState<{
        isValid: boolean;
        message: string;
    } | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);

    const countrySelectRef = useRef<HTMLDivElement>(null);
    const countryInputRef = useRef<HTMLInputElement>(null);

    const getPasswordStrengthColor = () => ["#ff4444", "#ff8800", "#ffbb33", "#00C851", "#007E33"][passwordStrength] || "#666";
    const getPasswordStrengthLabel = () => ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][passwordStrength] || "";

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

    // Функция для получения дефолтного аватара на основе имени
    const getDefaultAvatar = (name: string) => {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'];
        const color = colors[name.length % colors.length];
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=${color.slice(1)}&color=fff&size=128&bold=true&rounded=true`;
    };

    // Функция для форматирования даты
    const formatDiscordDate = (timestamp?: string) => {
        if (!timestamp) return 'Unknown';
        const date = new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Функция для получения класса статуса email
    const getEmailStatusClass = (verified?: boolean) => {
        return verified ? 'email-verified' : 'email-unverified';
    };

    // Функция для получения текста статуса email
    const getEmailStatusText = (verified?: boolean) => {
        return verified
            ? <><MdVerified className="email-status-icon verified" /> Email verified</>
            : <><MdWarning className="email-status-icon unverified" /> Email not verified</>;
    };

    // Функция для определения контрастного цвета текста
    const getContrastColor = (hexColor: string): string => {
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);

        // Яркость по формуле
        const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;

        return brightness > 128 ? '#000000' : '#FFFFFF';
    };

    // Генерация ID сессии
    const generateSessionId = () => {
        return 'SESS-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    };

    // ========== ОСНОВНЫЕ ФУНКЦИИ ==========

    useEffect(() => {
        let strength = 0;
        if (profileData.password.length >= 12) strength += 1;
        if (/[A-Z]/.test(profileData.password)) strength += 1;
        if (/\d/.test(profileData.password)) strength += 1;
        if (/[^A-Za-z0-9]/.test(profileData.password)) strength += 1;
        setPasswordStrength(strength);
    }, [profileData.password]);

    useEffect(() => {
        const token = searchParams.get('token');
        const userId = searchParams.get('userId');

        if (!token || !userId) {
            const storedToken = localStorage.getItem('authToken');
            const storedUserId = localStorage.getItem('userId');
            if (!storedToken || !storedUserId) {
                navigate('/login');
                return;
            }
            fetchUserInfo(storedUserId, storedToken);
        } else {
            localStorage.setItem('authToken', token);
            localStorage.setItem('userId', userId);
            fetchUserInfo(userId, token);
        }
    }, [searchParams, navigate]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                countrySelectRef.current &&
                countryInputRef.current &&
                !countrySelectRef.current.contains(event.target as Node) &&
                !countryInputRef.current.contains(event.target as Node)
            ) {
                setIsCountryListOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchUserInfo = async (userId: string, token: string) => {
        try {
            console.log('Fetching user info with:', { userId, token: token.substring(0, 20) + '...' });

            const response = await fetch(`http://localhost:4000/api/users/${userId}/basic`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                console.error('Token is invalid or expired');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userId');
                navigate('/login');
                return;
            }

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('User data received:', data);
            console.log('Discord role from API:', data.highestRole);
            console.log('Role color from API:', data.roleColor);
            console.log('Role hex color from API:', data.roleHexColor);

            // Устанавливаем userInfo с ВСЕМИ данными включая цвета
            setUserInfo({
                email: data.email,
                name: data.name,
                avatar: data.avatar,
                discordId: data.discordId,
                emailVerified: data.emailVerified,
                discordCreatedAt: data.discordCreatedAt,
                highestRole: data.highestRole,
                roleColor: data.roleColor,
                roleHexColor: data.roleHexColor
            });

            if (data.name) {
                const names = data.name.split(' ');
                setProfileData(prev => ({
                    ...prev,
                    firstName: names[0] || '',
                }));
            }

        } catch (error) {
            console.error('Error fetching user info:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('userId');
            navigate('/login');
        }
    };

    const validateForm = (): boolean => {
        const newErrors: ProfileErrors = {};

        if (!profileData.firstName.trim()) newErrors.firstName = "First name is required";
        if (!profileData.agreeTerms) newErrors.agreeTerms = "You must agree to the terms and conditions";
        if (!profileData.secretCode.trim()) newErrors.secretCode = "Secret registration code is required";
        else if (codeValidation && !codeValidation.isValid) newErrors.secretCode = codeValidation.message;

        // Валидация пароля
        if (!profileData.password.trim()) {
            newErrors.password = "Password is required";
        } else if (profileData.password.length < 12) {
            newErrors.password = "Password must be at least 12 characters long";
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(profileData.password)) {
            newErrors.password = "Password must contain uppercase, lowercase, number and special character";
        }

        // Валидация подтверждения пароля
        if (!profileData.confirmPassword.trim()) {
            newErrors.confirmPassword = "Please confirm your password";
        } else if (profileData.password !== profileData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = async (field: keyof ProfileData, value: string | boolean) => {
        setProfileData(prev => ({ ...prev, [field]: value }));

        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));

        // Автоматическая проверка кода при вводе
        if (field === 'secretCode' && typeof value === 'string') {
            if (value.trim().length >= 4) {
                await validateSecretCode(value);
            } else {
                setCodeValidation(null);
            }
        }

        // Очистка ошибок подтверждения пароля при изменении основного пароля
        if (field === 'password' && errors.confirmPassword) {
            setErrors(prev => ({ ...prev, confirmPassword: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Проверяем код перед отправкой
        const isCodeValid = await validateSecretCode(profileData.secretCode);
        if (!isCodeValid) {
            setErrors(prev => ({
                ...prev,
                secretCode: "Please provide a valid secret registration code"
            }));
            return;
        }

        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            console.log('Submitting profile with token:', token?.substring(0, 20) + '...');

            const dataToSend = {
                firstName: profileData.firstName,
                country: profileData.country || null,
                city: profileData.city || null,
                secretCode: profileData.secretCode.toUpperCase(),
                password: profileData.password
            };

            const response = await fetch("http://localhost:4000/api/complete-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            if (response.ok) {
                // Отмечаем код как использованный
                await markCodeAsUsed(profileData.secretCode, userInfo?.email || 'Unknown');

                navigate('/dashboard', { state: { message: "Profile completed successfully!" } });
            } else if (response.status === 401) {
                const errorText = await response.text();
                setErrors({ firstName: "Session expired. Please login again." });
            } else {
                const errorData = await response.json();
                setErrors({ firstName: errorData.error || "Failed to complete profile" });
            }
        } catch (error) {
            console.error('Network error:', error);
            setErrors({ firstName: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const validateSecretCode = async (code: string): Promise<boolean> => {
        if (!code.trim()) return false;

        setIsValidatingCode(true);
        try {
            const response = await fetch("http://localhost:4000/api/validate-secret-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const data = await response.json();

            if (data.valid) {
                setCodeValidation({
                    isValid: true,
                    message: " Valid registration code"
                });
                return true;
            } else {
                setCodeValidation({
                    isValid: false,
                    message: data.error || "Invalid code"
                });
                return false;
            }
        } catch (error) {
            console.error('Error validating secret code:', error);
            setCodeValidation({
                isValid: false,
                message: "Error validating code"
            });
            return false;
        } finally {
            setIsValidatingCode(false);
        }
    };

    const markCodeAsUsed = async (code: string, usedBy: string) => {
        try {
            // Сначала получаем ID кода
            const validationResponse = await fetch("http://localhost:4000/api/validate-secret-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ code: code.toUpperCase() })
            });

            const validationData = await validationResponse.json();

            if (validationData.valid && validationData.code) {
                await fetch("http://localhost:4000/api/use-secret-code", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        codeId: validationData.code.id,
                        usedBy: usedBy
                    })
                });
            }
        } catch (error) {
            console.error('Error marking code as used:', error);
        }
    };

    if (!userInfo)
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
            </div>
        );

    return (
        <div className={styles.wrapper}>
            <div
                className={`${styles.background} ${isCountryListOpen ? styles.blurBackground : ""
                    }`}
            ></div>

            <div className={styles.container}>
                <div className={styles.card}>
                    <div className={styles.headerTop}>
                        <ThemeToggle />
                    </div>

                    <div className={styles.header}>
                        <h2 className={styles.title}>Complete Your Profile</h2>

                        <div className={styles.avatarContainer}>
                            {userInfo.avatar ? (
                                <img
                                    src={userInfo.avatar}
                                    alt={`${userInfo.name}'s avatar`}
                                    className={styles.avatar}
                                    onError={(e) => {
                                        e.currentTarget.src = getDefaultAvatar(userInfo.name);
                                    }}
                                />
                            ) : (
                                <img
                                    src={getDefaultAvatar(userInfo.name)}
                                    alt={`${userInfo.name}'s avatar`}
                                    className={styles.avatar}
                                />
                            )}
                        </div>

                        <p className={styles.subtitle}>
                            Welcome, {userInfo.name}! Please provide some additional
                            information to continue.
                        </p>
                    </div>

                    <form className={styles.form} onSubmit={handleSubmit}>
                        <div className={styles.formGroup}>
                            <label htmlFor="secretCode" className={styles.formLabel}>
                                <MdKey className={styles.inlineIcon} />
                                Secret Registration Code *
                            </label>
                            <input
                                id="secretCode"
                                type="text"
                                value={profileData.secretCode}
                                onChange={(e) =>
                                    handleInputChange("secretCode", e.target.value.toUpperCase())
                                }
                                className={`${styles.formInput} 
                  ${codeValidation?.isValid ? styles.inputValid : ""} 
                  ${codeValidation && !codeValidation.isValid
                                        ? styles.inputError
                                        : ""
                                    } 
                  ${errors.secretCode ? styles.inputError : ""}`}
                                placeholder="Enter code provided by administrator"
                                disabled={isLoading || isCountryListOpen}
                            />

                            {isValidatingCode && (
                                <div className={styles.validationLoading}>
                                    <div className={styles.loadingSpinnerSmall}></div>
                                    Validating code...
                                </div>
                            )}

                            {codeValidation?.isValid && !isValidatingCode && (
                                <div
                                    className={`${styles.codeValidation} ${styles.validationValid}`}
                                >
                                    <MdVerified className={styles.validationIcon} />
                                    {codeValidation.message}
                                </div>
                            )}

                            {codeValidation && !codeValidation.isValid && !isValidatingCode && (
                                <div
                                    className={`${styles.codeValidation} ${styles.validationInvalid}`}
                                >
                                    <MdWarning className={styles.validationIcon} />
                                    {codeValidation.message}
                                </div>
                            )}

                            {errors.secretCode && !isValidatingCode && (
                                <p className={styles.formError}>
                                    <MdWarning className={styles.errorIcon} />
                                    {errors.secretCode}
                                </p>
                            )}
                        </div>

                        <div className={styles.formGrid2col}>
                            <div className={styles.formGroup}>
                                <label htmlFor="password" className={styles.formLabel}>
                                    Password *
                                </label>
                                <div className={styles.passwordInputContainer}>
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={profileData.password}
                                        onChange={(e) =>
                                            handleInputChange("password", e.target.value)
                                        }
                                        className={`${styles.formInput} ${errors.password ? styles.inputError : ""
                                            }`}
                                        placeholder="Create a strong password"
                                        disabled={isLoading || isCountryListOpen}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading || isCountryListOpen}
                                    >
                                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>

                                {profileData.password.length > 0 && (
                                    <div className={styles.passwordStrengthIndicator}>
                                        <div className={styles.passwordStrengthText}>
                                            Strength:{" "}
                                            <span style={{ color: getPasswordStrengthColor() }}>
                                                {getPasswordStrengthLabel()}
                                            </span>
                                        </div>
                                        <div className={styles.passwordStrengthBar}>
                                            <div
                                                className={styles.passwordStrengthProgress}
                                                style={{
                                                    width: `${(passwordStrength / 4) * 100}%`,
                                                    backgroundColor: getPasswordStrengthColor(),
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {errors.password && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.password}
                                    </p>
                                )}

                                <div className={styles.passwordHints}>
                                    <small>• At least 12 characters</small>
                                    <small>• Uppercase & lowercase letters</small>
                                    <small>• Numbers & special characters</small>
                                </div>
                            </div>

                            <div className={styles.formGroup}>
                                <label htmlFor="confirmPassword" className={styles.formLabel}>
                                    Confirm Password *
                                </label>
                                <div className={styles.passwordInputContainer}>
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={profileData.confirmPassword}
                                        onChange={(e) =>
                                            handleInputChange("confirmPassword", e.target.value)
                                        }
                                        className={`${styles.formInput} ${errors.confirmPassword ? styles.inputError : ""
                                            }`}
                                        placeholder="Repeat password"
                                        disabled={isLoading || isCountryListOpen}
                                    />
                                    <button
                                        type="button"
                                        className={styles.passwordToggle}
                                        onClick={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                        disabled={isLoading || isCountryListOpen}
                                    >
                                        {showConfirmPassword ? (
                                            <MdVisibilityOff />
                                        ) : (
                                            <MdVisibility />
                                        )}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className={styles.formError}>
                                        <MdWarning className={styles.errorIcon} />
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGrid2col}>
                            <div className={styles.formGroup}>
                                <label htmlFor="firstName" className={styles.formLabel}>
                                    First Name *
                                </label>
                                <input
                                    id="firstName"
                                    type="text"
                                    value={profileData.firstName}
                                    onChange={(e) =>
                                        handleInputChange("firstName", e.target.value)
                                    }
                                    className={styles.formInput}
                                    placeholder="John"
                                    disabled
                                />
                                {errors.firstName && (
                                    <p className={styles.formError}>{errors.firstName}</p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="discordId" className={styles.formLabel}>
                                    Discord ID
                                </label>
                                <input
                                    id="discordId"
                                    type="text"
                                    value={userInfo.discordId || ""}
                                    className={`${styles.formInput} ${styles.formInputDisabled}`}
                                    placeholder="Discord ID"
                                    disabled
                                />
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="email" className={styles.formLabel}>
                                Email (from Discord)
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={userInfo.email}
                                disabled
                                className={`${styles.formInput} ${styles.formInputDisabled} ${getEmailStatusClass(
                                    userInfo.emailVerified
                                )}`}
                            />
                            <div
                                className={`${styles.emailStatus} ${getEmailStatusClass(
                                    userInfo.emailVerified
                                )}`}
                            >
                                {getEmailStatusText(userInfo.emailVerified)}
                            </div>
                        </div>

                        <div className={styles.formGrid2col}>
                            <div className={styles.formGroup}>
                                <label htmlFor="discordCreated" className={styles.formLabel}>
                                    Discord Member Since
                                </label>
                                <input
                                    id="discordCreated"
                                    type="text"
                                    value={formatDiscordDate(userInfo.discordCreatedAt)}
                                    className={`${styles.formInput} ${styles.formInputDisabled}`}
                                    disabled
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="discordRole" className={styles.formLabel}>
                                    Discord Role
                                </label>
                                <input
                                    id="discordRole"
                                    type="text"
                                    value={userInfo.highestRole || "@everyone"}
                                    className={`${styles.formInput} ${styles.formInputDisabled}`}
                                    style={{
                                        backgroundColor: userInfo.roleHexColor || "#99AAB5",
                                        color: userInfo.roleHexColor
                                            ? getContrastColor(userInfo.roleHexColor)
                                            : "#FFFFFF",
                                        borderColor: userInfo.roleHexColor || "#99AAB5",
                                        fontWeight: "600",
                                        textShadow: "0 1px 1px rgba(0, 0, 0, 0.2)",
                                    }}
                                    disabled
                                />
                            </div>
                        </div>

                        <div className={styles.checkboxGroup}>
                            <input
                                id="agreeTerms"
                                type="checkbox"
                                checked={profileData.agreeTerms}
                                onChange={(e) =>
                                    handleInputChange("agreeTerms", e.target.checked)
                                }
                                className={styles.checkboxInput}
                                disabled={isCountryListOpen}
                            />
                            <label htmlFor="agreeTerms" className={styles.checkboxLabel}>
                                I agree to the{" "}
                                <a href="/terms" className={styles.linkPrimary}>
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="/privacy" className={styles.linkPrimary}>
                                    Privacy Policy
                                </a>{" "}
                                *
                            </label>
                        </div>

                        {errors.agreeTerms && (
                            <p className={styles.formError}>{errors.agreeTerms}</p>
                        )}

                        <button
                            type="submit"
                            disabled={
                                isLoading || isCountryListOpen || !profileData.agreeTerms
                            }
                            className={styles.submitButton}
                        >
                            {isLoading
                                ? "Completing Registration..."
                                : "Complete Registration"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};