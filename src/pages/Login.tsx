import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";
import '../components/CSS/Login.css';
import ThemeToggle from '@/components/ThemeToggle';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    const handleOAuth = (provider: 'discord' | 'google' | 'github') => {
        // Тут можно заменить на реальную логику авторизации
        // Например: window.location.href = `/api/auth/${provider}`;
        console.log(`Redirect to ${provider} OAuth`);
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header with-toggle">
                    <ThemeToggle />
                </div>
                <div className="auth-header">
                    <h1>Welcome back</h1>
                    <p>Log in to your account to continue</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="input-group">
                        <div className="password-label-container">
                            <label htmlFor="password">Password</label>
                        </div>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <div className="auth-actions">
                        <button
                            type="submit"
                            className="auth-button primary"
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner /> : 'Log in'}
                        </button>
                    </div>

                    <div className="auth-divider">
                        <span>or log in with</span>
                    </div>

                    <div className="social-login">
                        <button className="social-btn discord" onClick={() => handleOAuth('discord')}>
                            <FaDiscord size={20} />
                        </button>
                        <button className="social-btn google" onClick={() => handleOAuth('google')}>
                            <FaGoogle size={20} />
                        </button>
                        <button className="social-btn github" onClick={() => handleOAuth('github')}>
                            <FaGithub size={20} />
                        </button>
                    </div>

                </form>

                <div className="auth-footer">
                    <p>
                        Don't have an account?{' '}
                        <button
                            className="auth-link"
                            onClick={() => navigate('/register')}
                        >
                            Sign up
                        </button>
                    </p>
                    <button
                        className="auth-link"
                        onClick={() => navigate('/forgot-password')}
                    >
                        Forgot password?
                    </button>
                </div>
            </div>
        </div>
    );
};

// Иконки можно заменить на свои или использовать из библиотеки
const EyeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4C4 4 1 10 1 10C1 10 4 16 10 16C16 16 19 10 19 10C19 10 16 4 10 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const EyeOffIcon = () => (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M13 7.99999C12.8131 7.3613 12.4812 6.77701 12.0316 6.29335C11.582 5.80968 11.0279 5.4407 10.4139 5.21798C9.7999 4.99526 9.1437 4.92526 8.50192 5.01379C7.86014 5.10232 7.25161 5.34672 6.72601 5.72601M5 3L15 15M8.5 4.5C9.05666 4.39277 9.6224 4.33861 10.19 4.33861C14.19 4.33861 17 10 17 10C16.582 10.914 15.923 11.752 15.19 12.5M3.19 12.5C2.463 11.752 1.817 10.914 1.41 10C1.41 10 3.21 6.64 6.5 5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const Spinner = () => (
    <div className="spinner"></div>
);