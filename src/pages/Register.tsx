import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../components/CSS/Register.css';
import ThemeToggle from '@/components/ThemeToggle';

export const Register = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            navigate('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (

        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-header with-toggle">
                    <ThemeToggle />
                </div>
                <div className="auth-header">
                    <h1>Create your account</h1>
                    <p>Get started with our platform</p>
                </div>

                {error && <div className="auth-error">{error}</div>}

                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="input-group">
                        <label htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="John Doe"
                            required
                            autoComplete="name"
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="input-group">
                        <div className="password-label-container">
                            <label htmlFor="password">Password</label>
                            <button
                                type="button"
                                className="show-password"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                                {showPassword ? (
                                    <EyeOffIcon />
                                ) : (
                                    <EyeIcon />
                                )}
                            </button>
                        </div>
                        <input
                            id="password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                            
                        />
                        
                    </div>

                    <div className="input-group">
                        
                        <label htmlFor="confirmPassword">Confirm Password</label>
                        <input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="new-password"
                        />
                        
                    </div>

                    <div className="auth-actions">
                        <button
                            type="submit"
                            className="auth-button primary"
                            disabled={isLoading}
                        >
                            {isLoading ? <Spinner /> : 'Create account'}
                        </button>
                    </div>
                </form>

                <div className="auth-footer">
                    <p>
                        Already have an account?{' '}
                        <button
                            className="auth-link"
                            onClick={() => navigate('/login')}
                        >
                            Sign in
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

// Повторное использование иконок из Login компонента
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