import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader, Shield, User, Key, Clock } from 'lucide-react';
import styles from '../module_pages/OAuthSuccess.module.scss';

export function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing');
  const [countdown, setCountdown] = useState(3);

  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const method = searchParams.get('method');

    if (token && userId) {
      try {
        // Сохраняем токен в localStorage
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_id', userId);
        
        // Сохраняем метод авторизации для аналитики
        if (method) {
          localStorage.setItem('auth_method', method);
        }

        setStatus('success');

        // Закрываем popup окно и обновляем основное окно
        if (window.opener) {
          // Отправляем сообщение в основное окно
          window.opener.postMessage({
            type: 'OAUTH_SUCCESS',
            token,
            userId,
            method
          }, window.location.origin);
          
          // Запускаем таймер для автоматического закрытия
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer);
                window.close();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);

          return () => clearInterval(timer);
        } else {
          // Если не popup, редиректим на главную через 2 секунды
          const timer = setTimeout(() => {
            navigate('/');
          }, 2000);

          return () => clearTimeout(timer);
        }
      } catch (error) {
        console.error('Error during OAuth success:', error);
        setStatus('error');
      }
    } else {
      setStatus('error');
    }
  }, [searchParams, navigate]);

  const getAuthMethodName = (method) => {
    const methods = {
      'discord': 'Discord',
      'google': 'Google',
      'github': 'GitHub',
      'microsoft': 'Microsoft'
    };
    return methods[method] || method || 'Unknown';
  };

  if (status === 'error') {
    return (
      <div className={`${styles.container} ${styles.error}`}>
        <div className={styles.content}>
          <Shield className={styles.icon} />
          <h1 className={styles.title}>Authorization Error</h1>
          <p className={styles.message}>
            Something went wrong during the authorization process. 
            Please try again or contact support if the problem persists.
          </p>
          <button 
            onClick={() => navigate('/login')}
            className={styles.retryButton}
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <CheckCircle className={styles.icon} />
        
        <div className={styles.successBadge}>
          <Shield size={16} />
          Authorization Successful
        </div>
        
        <h1 className={styles.title}>Welcome Aboard!</h1>
        <p className={styles.message}>
          {window.opener 
            ? `This window will close automatically in ${countdown} seconds...`
            : 'You will be redirected to the dashboard shortly...'
          }
        </p>

        <div className={styles.details}>
          <h3 className={styles.detailsTitle}>
            <User size={18} />
            Session Details
          </h3>
          <ul className={styles.detailsList}>
            <li className={styles.detailItem}>
              <span className={styles.detailLabel}>User ID:</span>
              <span className={styles.detailValue}>
                {searchParams.get('userId') || 'N/A'}
              </span>
            </li>
            <li className={styles.detailItem}>
              <span className={styles.detailLabel}>Auth Method:</span>
              <span className={styles.detailValue}>
                {getAuthMethodName(searchParams.get('method'))}
              </span>
            </li>
            <li className={styles.detailItem}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>
                <span style={{ color: '#22c55e' }}>Authenticated</span>
              </span>
            </li>
          </ul>
        </div>

        {window.opener && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span className={styles.loadingText}>
              Closing window... {countdown}s
            </span>
          </div>
        )}

        {!window.opener && (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <span className={styles.loadingText}>
              Redirecting to dashboard...
            </span>
          </div>
        )}

        <div style={{ marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          <p>
            If nothing happens,{' '}
            <button 
              onClick={() => window.opener ? window.close() : navigate('/')}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: 'var(--accent-color)', 
                textDecoration: 'underline',
                cursor: 'pointer'
              }}
            >
              click here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}