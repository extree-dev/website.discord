// CompleteProfile.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdVerified, MdWarning, MdKey, MdVisibility, MdVisibilityOff } from 'react-icons/md';
import ThemeToggle from "./ThemeToggle.js";
import CountrySelect from "./CountrySelect.js";
import "./CSS/CompleteProfile.css";

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

    if (!userInfo) return (
        <div className="loading-container">
            <div className="loading-spinner"></div>
        </div>
    );

    return (
        <div className="complete-profile-wrapper">
            <div className={`complete-profile-background ${isCountryListOpen ? 'blur-background' : ''}`}></div>
            <div className="complete-profile-container">
                <div className="complete-profile-card">
                    <div className="login-header-top"><ThemeToggle /></div>
                    <div className="complete-profile-header">
                        <h2 className="complete-profile-title">Complete Your Profile</h2>

                        {/* Аватар пользователя */}
                        <div className="user-avatar-container">
                            {userInfo.avatar ? (
                                <img
                                    src={userInfo.avatar}
                                    alt={`${userInfo.name}'s avatar`}
                                    className="user-avatar"
                                    onError={(e) => {
                                        console.log('Avatar failed to load, using default');
                                        e.currentTarget.src = getDefaultAvatar(userInfo.name);
                                    }}
                                />
                            ) : (
                                <img
                                    src={getDefaultAvatar(userInfo.name)}
                                    alt={`${userInfo.name}'s avatar`}
                                    className="user-avatar"
                                />
                            )}
                        </div>

                        <p className="complete-profile-subtitle">
                            Welcome, {userInfo.name}! Please provide some additional information to continue.
                        </p>
                    </div>

                    <form className="complete-profile-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="secretCode" className="form-label">
                                <MdKey className="inline-icon" />
                                Secret Registration Code *
                            </label>
                            <input
                                id="secretCode"
                                type="text"
                                value={profileData.secretCode}
                                onChange={e => handleInputChange('secretCode', e.target.value.toUpperCase())}
                                className={`form-input ${codeValidation?.isValid ? 'input-valid' :
                                    codeValidation && !codeValidation.isValid ? 'input-error' : ''
                                    } ${errors.secretCode ? 'input-error' : ''}`}
                                placeholder="Enter code provided by administrator"
                                disabled={isLoading || isCountryListOpen}
                            />

                            {/* Индикатор загрузки валидации */}
                            {isValidatingCode && (
                                <div className="validation-loading">
                                    <div className="loading-spinner-small"></div>
                                    Validating code...
                                </div>
                            )}

                            {/* Сообщение о валидном коде */}
                            {codeValidation?.isValid && !isValidatingCode && (
                                <div className="code-validation validation-valid">
                                    <MdVerified className="validation-icon" />
                                    {codeValidation.message}
                                </div>
                            )}

                            {/* Сообщение о невалидном коде */}
                            {codeValidation && !codeValidation.isValid && !isValidatingCode && (
                                <div className="code-validation validation-invalid">
                                    <MdWarning className="validation-icon" />
                                    {codeValidation.message}
                                </div>
                            )}

                            {/* Общие ошибки формы */}
                            {errors.secretCode && !isValidatingCode && (
                                <p className="form-error">
                                    <MdWarning className="error-icon" />
                                    {errors.secretCode}
                                </p>
                            )}
                        </div>

                        {/* Поля для пароля */}
                        <div className="form-grid-2col">
                            <div className="form-group">
                                <label htmlFor="password" className="form-label">
                                    Password *
                                </label>
                                <div className="password-input-container">
                                    <input
                                        id="password"
                                        type={showPassword ? "text" : "password"}
                                        value={profileData.password}
                                        onChange={e => handleInputChange('password', e.target.value)}
                                        className={`form-input password-input ${errors.password ? 'input-error' : ''}`}
                                        placeholder="Create a strong password"
                                        disabled={isLoading || isCountryListOpen}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        disabled={isLoading || isCountryListOpen}
                                    >
                                        {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>

                                {profileData.password.length > 0 && ( // ← измените password на profileData.password
                                    <div className="password-strength-indicator">
                                        <div className="password-strength-text">
                                            Strength: <span style={{ color: getPasswordStrengthColor() }}>{getPasswordStrengthLabel()}</span>
                                        </div>
                                        <div className="password-strength-bar">
                                            <div
                                                className="password-strength-progress"
                                                style={{
                                                    width: `${(passwordStrength / 4) * 100}%`,
                                                    backgroundColor: getPasswordStrengthColor()
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {errors.password && (
                                    <p className="form-error">
                                        <MdWarning className="error-icon" />
                                        {errors.password}
                                    </p>
                                )}
                                <div className="password-hints">
                                    <small>• At least 12 characters</small>
                                    <small>• Uppercase & lowercase letters</small>
                                    <small>• Numbers & special characters</small>
                                </div>
                            </div>

                            <div className="form-group">
                                <label htmlFor="confirmPassword" className="form-label">
                                    Confirm Password *
                                </label>

                                <div className="password-input-container">
                                    <input
                                        id="confirmPassword"
                                        type={showConfirmPassword ? "text" : "password"}
                                        value={profileData.confirmPassword}
                                        onChange={e => handleInputChange('confirmPassword', e.target.value)}
                                        className={`form-input password-input ${errors.confirmPassword ? 'input-error' : ''}`} // ← добавил password-input
                                        placeholder="Repeat password"
                                        disabled={isLoading || isCountryListOpen}
                                    />
                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        disabled={isLoading || isCountryListOpen}
                                    >
                                        {showConfirmPassword ? <MdVisibilityOff /> : <MdVisibility />}
                                    </button>
                                </div>
                                {errors.confirmPassword && (
                                    <p className="form-error">
                                        <MdWarning className="error-icon" />
                                        {errors.confirmPassword}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="form-grid-2col">
                            <div className="form-group">
                                <label htmlFor="firstName" className="form-label">First Name *</label>
                                <input
                                    id="firstName"
                                    type="text"
                                    value={profileData.firstName}
                                    onChange={e => handleInputChange('firstName', e.target.value)}
                                    className="form-input"
                                    placeholder="John"
                                    disabled
                                />
                                {errors.firstName && <p className="form-error">{errors.firstName}</p>}
                            </div>
                            <div className="form-group">
                                <label htmlFor="discordId" className="form-label">Discord ID</label>
                                <input
                                    id="discordId"
                                    type="text"
                                    value={userInfo.discordId || ''}
                                    className="form-input form-input-disabled"
                                    placeholder="Discord ID"
                                    disabled
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email (from Discord)</label>
                            <input
                                id="email"
                                type="email"
                                value={userInfo.email}
                                disabled
                                className={`form-input form-input-disabled ${getEmailStatusClass(userInfo.emailVerified)}`}
                            />
                            <div className={`email-status ${getEmailStatusClass(userInfo.emailVerified)}`}>
                                {getEmailStatusText(userInfo.emailVerified)}
                            </div>
                        </div>

                        <div className="form-grid-2col">
                            <div className="form-group">
                                <label htmlFor="discordCreated" className="form-label">Discord Member Since</label>
                                <input
                                    id="discordCreated"
                                    type="text"
                                    value={formatDiscordDate(userInfo.discordCreatedAt)}
                                    className="form-input form-input-disabled"
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="discordRole" className="form-label">Discord Role</label>
                                <input
                                    id="discordRole"
                                    type="text"
                                    value={userInfo.highestRole || '@everyone'}
                                    className="form-input form-input-disabled"
                                    style={{
                                        backgroundColor: userInfo.roleHexColor || '#99AAB5',
                                        color: userInfo.roleHexColor ? getContrastColor(userInfo.roleHexColor) : '#FFFFFF',
                                        borderColor: userInfo.roleHexColor || '#99AAB5',
                                        fontWeight: '600',
                                        textShadow: '0 1px 1px rgba(0, 0, 0, 0.2)'
                                    }}
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="checkbox-group">
                            <input
                                id="agreeTerms"
                                type="checkbox"
                                checked={profileData.agreeTerms}
                                onChange={e => handleInputChange('agreeTerms', e.target.checked)}
                                className="checkbox-input"
                                disabled={isCountryListOpen}
                            />
                            <label htmlFor="agreeTerms" className="checkbox-label">
                                I agree to the <a href="/terms" className="link-primary">Terms of Service</a> and <a href="/privacy" className="link-primary">Privacy Policy</a> *
                            </label>
                        </div>
                        {errors.agreeTerms && <p className="form-error">{errors.agreeTerms}</p>}

                        <button
                            type="submit"
                            disabled={isLoading || isCountryListOpen || !profileData.agreeTerms}
                            className="submit-button"
                        >
                            {isLoading ? "Completing Registrathion..." : "Completing Registrathion"}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};