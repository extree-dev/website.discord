// CompleteProfile.tsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Calendar, MapPin, Phone } from "lucide-react";

interface ProfileData {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    phone: string;
    country: string;
    city: string;
    agreeTerms: boolean;
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
    const [errors, setErrors] = useState<Partial<ProfileData>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [userInfo, setUserInfo] = useState<{ email: string; name: string } | null>(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    useEffect(() => {
        // Проверяем аутентификацию
        const token = localStorage.getItem('authToken');
        const userId = localStorage.getItem('userId');

        if (!token || !userId) {
            navigate('/login');
            return;
        }

        // Получаем базовую информацию пользователя
        fetchUserInfo();
    }, []);

    const fetchUserInfo = async () => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(`http://localhost:4000/api/users/${userId}/basic`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUserInfo(data);
                // Заполняем имя из Discord, если есть
                if (data.name) {
                    const names = data.name.split(' ');
                    setProfileData(prev => ({
                        ...prev,
                        firstName: names[0] || '',
                        lastName: names.slice(1).join(' ') || ''
                    }));
                }
            }
        } catch (error) {
            console.error('Error fetching user info:', error);
        }
    };
    
    type ProfileErrors = Partial<Record<keyof ProfileData, string>>;

    const validateForm = (): boolean => {
        
        const newErrors: ProfileErrors = {};

        if (!profileData.firstName.trim()) {
            newErrors.firstName = "First name is required";
        }

        if (!profileData.lastName.trim()) {
            newErrors.lastName = "Last name is required";
        }

        if (profileData.phone && !/^\+?[\d\s-()]{10,}$/.test(profileData.phone)) {
            newErrors.phone = "Please enter a valid phone number";
        }

        // agreeTerms — в ProfileData boolean, а в errors мы храним строку сообщения
        if (!profileData.agreeTerms) {
            newErrors.agreeTerms = "You must agree to the terms and conditions";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
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
                // Профиль завершен, перенаправляем на dashboard
                navigate('/dashboard', {
                    state: { message: "Profile completed successfully!" }
                });
            } else {
                const errorData = await response.json();
                setErrors({ firstName: errorData.error || "Failed to complete profile" });
            }
        } catch (error) {
            console.error('Error completing profile:', error);
            setErrors({ firstName: "Network error. Please try again." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof ProfileData, value: string | boolean) => {
        setProfileData(prev => ({ ...prev, [field]: value }));
        // Очищаем ошибку при изменении поля
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    if (!userInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="loading-spinner"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8">
                <div className="text-center">
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-white">
                        Complete Your Profile
                    </h2>
                    <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                        Welcome, {userInfo.name}! Please provide some additional information to continue.
                    </p>
                </div>

                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                First Name *
                            </label>
                            <input
                                id="firstName"
                                type="text"
                                value={profileData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                placeholder="John"
                            />
                            {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                        </div>

                        <div>
                            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Last Name *
                            </label>
                            <input
                                id="lastName"
                                type="text"
                                value={profileData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                placeholder="Doe"
                            />
                            {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Email (from Discord)
                        </label>
                        <input
                            id="email"
                            type="email"
                            value={userInfo.email}
                            disabled
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <p className="text-xs text-gray-500 mt-1">This email is from your Discord account</p>
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Phone Number
                        </label>
                        <input
                            id="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                            placeholder="+1 (555) 123-4567"
                        />
                        {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="country" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Country
                            </label>
                            <input
                                id="country"
                                type="text"
                                value={profileData.country}
                                onChange={(e) => handleInputChange('country', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                placeholder="Country"
                            />
                        </div>

                        <div>
                            <label htmlFor="city" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                City
                            </label>
                            <input
                                id="city"
                                type="text"
                                value={profileData.city}
                                onChange={(e) => handleInputChange('city', e.target.value)}
                                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                                placeholder="City"
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="dateOfBirth" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                            Date of Birth
                        </label>
                        <input
                            id="dateOfBirth"
                            type="date"
                            value={profileData.dateOfBirth}
                            onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-600"
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            id="agreeTerms"
                            type="checkbox"
                            checked={profileData.agreeTerms}
                            onChange={(e) => handleInputChange('agreeTerms', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="agreeTerms" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">
                            I agree to the <a href="/terms" className="text-blue-600 hover:text-blue-500">Terms of Service</a> and <a href="/privacy" className="text-blue-600 hover:text-blue-500">Privacy Policy</a> *
                        </label>
                    </div>
                    {errors.agreeTerms && <p className="text-red-500 text-xs">{errors.agreeTerms}</p>}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                        {isLoading ? "Completing Profile..." : "Complete Profile"}
                    </button>

                    <p className="text-xs text-gray-500 text-center">
                        * Required fields
                    </p>
                </form>
            </div>
        </div>
    );
};