// CompleteProfile.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ThemeToggle from "./ThemeToggle.js";
import CountrySelect from "./CountrySelect.js";
import "./CSS/CompleteProfile.css";

interface ProfileData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
    country: string;
    city: string;
    agreeTerms: boolean;
}

interface ProfileErrors {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    phone?: string;
    country?: string;
    city?: string;
    agreeTerms?: string;
}

export const CompleteProfile: React.FC = () => {
    const [profileData, setProfileData] = useState<ProfileData>({
        firstName: '',
        lastName: '',
        dateOfBirth: '',
        phone: '',
        country: '',
        city: '',
        agreeTerms: false
    });

    const [errors, setErrors] = useState<ProfileErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);
    const [isCountryListOpen, setIsCountryListOpen] = useState(false);

    const countrySelectRef = useRef<HTMLDivElement>(null);
    const countryInputRef = useRef<HTMLInputElement>(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Максимальная дата рождения (18 лет назад)
    const today = new Date();
    const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const maxDateStr = eighteenYearsAgo.toISOString().split('T')[0]; // формат "YYYY-MM-DD"

    const handleDateChange = (value: string) => {
        const inputDate = new Date(value);

        if (isNaN(inputDate.getTime())) {
            // Если ввели невалидное значение, очищаем
            setProfileData(prev => ({ ...prev, dateOfBirth: '' }));
            return;
        }

        if (inputDate > eighteenYearsAgo) {
            // Если пользователь младше 18, ставим максимально допустимую дату
            setProfileData(prev => ({ ...prev, dateOfBirth: maxDateStr }));
        } else {
            setProfileData(prev => ({ ...prev, dateOfBirth: value }));
        }

        if (errors.dateOfBirth) {
            setErrors(prev => ({ ...prev, dateOfBirth: undefined }));
        }
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
            const response = await fetch(`http://localhost:4000/api/users/${userId}/basic`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            console.log('User data:', data);

            setUserInfo(data);

            if (data.name) {
                const names = data.name.split(' ');
                setProfileData(prev => ({
                    ...prev,
                    firstName: names[0] || '',
                    lastName: names.slice(1).join(' ') || ''
                }));
            }

            if (data.email) {
                setUserInfo(prev => prev ? { ...prev, email: data.email } : { email: data.email, name: '' });
            }

            // <-- Вставляем сюда
            if (data.phone) {
                setProfileData(prev => ({ ...prev, phone: data.phone }));
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

        if (profileData.dateOfBirth) {
            const dob = new Date(profileData.dateOfBirth);
            const age = today.getFullYear() - dob.getFullYear();
            const monthDiff = today.getMonth() - dob.getMonth();
            const dayDiff = today.getDate() - dob.getDate();
            const isUnder18 = age < 18 || (age === 18 && (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)));
            if (isUnder18) newErrors.dateOfBirth = "You must be at least 18 years old";
        }

        if (profileData.phone && !/^\(\d{3}\) \d{3}-\d{2}-\d{2}$/.test(profileData.phone)) {
            newErrors.phone = "Please enter a valid phone number: (555) 123-45-67";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleInputChange = (field: keyof ProfileData, value: string | boolean) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    };

    const handlePhoneChange = (value: string) => {
        const numbers = value.replace(/\D/g, '').slice(0, 11);
        let formatted = numbers;
        if (numbers.length > 3 && numbers.length <= 6) formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
        else if (numbers.length > 6 && numbers.length <= 8) formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6)}`;
        else if (numbers.length > 8) formatted = `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 8)}-${numbers.slice(8)}`;
        handleInputChange('phone', formatted);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsLoading(true);
        try {
            const response = await fetch("http://localhost:4000/api/complete-profile", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(profileData)
            });

            if (response.ok) {
                navigate('/dashboard', { state: { message: "Profile completed successfully!" } });
            } else {
                const errorData = await response.json();
                setErrors({ firstName: errorData.error || "Failed to complete profile" });
            }
        } catch {
            setErrors({ firstName: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const countries = ["United States", "Canada", "Russia"].sort();

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
                        <p className="complete-profile-subtitle">Welcome, {userInfo.name}! Please provide some additional information to continue.</p>
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
                                <label htmlFor="lastName" className="form-label">Last Name</label>
                                <input
                                    id="lastName"
                                    type="text"
                                    value={profileData.lastName}
                                    onChange={e => handleInputChange('lastName', e.target.value)}
                                    className="form-input"
                                    placeholder="Name"
                                    disabled={isCountryListOpen}
                                />
                                {/* Ошибка будет отображаться только если есть реально другая ошибка, но не пустое поле */}
                                {errors.lastName && errors.lastName !== 'Required' && (
                                    <p className="form-error">{errors.lastName}</p>
                                )}
                            </div>
                        </div>

                        <div className="form-group">
                            <label htmlFor="email" className="form-label">Email (from Discord)</label>
                            <input
                                id="email"
                                type="email"
                                value={userInfo.email}
                                disabled
                                className="form-input form-input-disabled"
                            />
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
