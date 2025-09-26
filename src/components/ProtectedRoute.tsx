// ProtectedRoute.tsx или аналогичный компонент
import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [isProfileComplete, setIsProfileComplete] = useState<boolean | null>(null);
    const location = useLocation();

    useEffect(() => {
        const checkProfileCompletion = async () => {
            const token = localStorage.getItem('authToken');
            const userId = localStorage.getItem('userId');

            if (!token || !userId) {
                setIsProfileComplete(false);
                return;
            }

            try {
                const response = await fetch(`http://localhost:4000/api/users/${userId}/profile-status`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setIsProfileComplete(data.isComplete);
                } else {
                    setIsProfileComplete(false);
                }
            } catch (error) {
                setIsProfileComplete(false);
            }
        };

        checkProfileCompletion();
    }, []);

    if (isProfileComplete === null) {
        return <div>Loading...</div>;
    }

    if (!localStorage.getItem('authToken')) {
        return <Navigate to="/login" replace />;
    }

    // Если профиль не завершен и мы не на странице завершения профиля
    if (!isProfileComplete && location.pathname !== '/complete-profile') {
        return <Navigate to="/complete-profile" replace />;
    }

    // Если профиль завершен и мы на странице завершения профиля
    if (isProfileComplete && location.pathname === '/complete-profile') {
        return <Navigate to="/dashboard" replace />;
    }

    return <>{children}</>;
};