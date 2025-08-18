import { useState } from 'react';
import { FaDiscord, FaGithub, FaGoogle } from 'react-icons/fa';
import '../components/CSS/Login.css';
import ThemeToggle from '@/components/ThemeToggle';
import { useNavigate } from 'react-router-dom';

export const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
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
                    {/* Email Input */}
                    <div className={`floating-input ${email ? 'filled' : ''}`}>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <label htmlFor="email">Email</label>
                        <span className="underline"></span>
                    </div>

                    {/* Password Input */}
                    <div className={`floating-input ${password ? 'filled' : ''}`}>
                        <input
                            type={showPassword ? 'text' : 'password'}
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <label htmlFor="password">Password</label>
                        <span className="underline"></span>
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? 'Hide' : 'Show'}
                        </button>
                    </div>

                    <button type="submit" className="auth-button primary" disabled={isLoading}>
                        {isLoading ? 'Loading...' : 'Log in'}
                    </button>

                    <div className="auth-divider">
                        <span>Login with</span>
                    </div>

                    <div className="social-login">
                        <button className="social-btn github" onClick={() => handleOAuth('github')}>
                            <FaGithub size={24} />
                        </button>
                        <button className="social-btn discord" onClick={() => handleOAuth('discord')}>
                            <FaDiscord size={24} />
                        </button>
                        <button className="social-btn google" onClick={() => handleOAuth('google')}>
                            <FaGoogle size={24} />
                        </button>
                    </div>
                    <p className="auth-terms">
                        By logging in you agree to our <a href="/terms">Terms</a> and <a href="/privacy">Privacy Policy</a>.
                    </p>
                </form>
            </div>
        </div>
    );
};
