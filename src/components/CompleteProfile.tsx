// CompleteProfile.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MdVerified, MdWarning,  } from 'react-icons/md';
import ThemeToggle from "./ThemeToggle.js";
import CountrySelect from "./CountrySelect.js";
import "./CSS/CompleteProfile.css";

interface ProfileData {
    firstName: string;
    country: string;
    city: string;
    agreeTerms: boolean;
}

interface ProfileErrors {
    firstName?: string;
    country?: string;
    city?: string;
    agreeTerms?: string;
}

// ОБНОВЛЕННЫЙ интерфейс userInfo с цветами
interface UserInfo {
    email: string;
    name: string;
    avatar?: string;
    discordId?: string;
    emailVerified?: boolean;
    discordCreatedAt?: string;
    highestRole?: string;
    roleColor?: number;        // Добавьте это поле
    roleHexColor?: string;     // Добавьте это поле
}

export const CompleteProfile: React.FC = () => {
    const [profileData, setProfileData] = useState<ProfileData>({
        firstName: '',
        country: '',
        city: '',
        agreeTerms: false
    });

    const [errors, setErrors] = useState<ProfileErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
    const [isCountryListOpen, setIsCountryListOpen] = useState(false);

    const countrySelectRef = useRef<HTMLDivElement>(null);
    const countryInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

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

            // Генерируем ID сессии
            const sessionId = generateSessionId();

            // Устанавливаем userInfo с ВСЕМИ данными включая цвета
            setUserInfo({
                email: data.email,
                name: data.name,
                avatar: data.avatar,
                discordId: data.discordId,
                emailVerified: data.emailVerified,
                discordCreatedAt: data.discordCreatedAt,
                highestRole: data.highestRole,
                roleColor: data.roleColor,           // Добавьте это
                roleHexColor: data.roleHexColor      // Добавьте это
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

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProfileData, value: string | boolean) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const token = localStorage.getItem('authToken');
            console.log('Submitting profile with token:', token?.substring(0, 20) + '...');
            console.log('Profile data:', profileData);

            const dataToSend = {
                firstName: profileData.firstName,
                country: profileData.country || null,
                city: profileData.city || null,
            };

            console.log('Sending data:', dataToSend);

            const response = await fetch("http://localhost:4000/api/complete-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(dataToSend)
            });

            console.log('Complete profile response status:', response.status);

            if (response.ok) {
                navigate('/dashboard', { state: { message: "Profile completed successfully!" } });
            } else if (response.status === 401) {
                console.error('Complete profile: Unauthorized');
                const errorText = await response.text();
                console.error('Error response:', errorText);
                setErrors({ firstName: "Session expired. Please login again." });
            } else {
                const errorData = await response.json();
                console.error('Complete profile error:', errorData);
                setErrors({ firstName: errorData.error || "Failed to complete profile" });
            }
        } catch (error) {
            console.error('Network error:', error);
            setErrors({ firstName: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
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

                        <div className="form-grid-2col">
                            <div className="form-group country-select-group">
                                <label htmlFor="country" className="form-label">Country</label>
                                <div className="command-param-select-wrapper" ref={countrySelectRef}>
                                    <CountrySelect
                                        value={profileData.country}
                                        onChange={val => handleInputChange('country', val)}
                                        onOpenChange={setIsCountryListOpen}
                                    />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="city" className="form-label">City</label>
                                <input
                                    id="city"
                                    type="text"
                                    value={profileData.city}
                                    onChange={e => handleInputChange('city', e.target.value)}
                                    className="form-input"
                                    placeholder="City"
                                    disabled={isCountryListOpen}
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

                        <button type="submit" disabled={isLoading || isCountryListOpen} className="submit-button">
                            {isLoading ? "Completing Profile..." : "Complete Profile"}
                        </button>

                        <p className="required-hint">* Required fields</p>
                    </form>
                </div>
            </div>
        </div>
    );
};