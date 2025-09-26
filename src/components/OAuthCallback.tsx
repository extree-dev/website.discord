// OAuthCallback.tsx
import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    if (token) {
      // Сообщаем родительскому окну об успехе
      window.opener.postMessage({
        type: 'OAUTH_SUCCESS',
        token: token
      }, 'http://localhost:4000');
      
      window.close();
    } else if (error) {
      // Сообщаем об ошибке
      window.opener.postMessage({
        type: 'OAUTH_ERROR',
        error: error
      }, 'http://localhost:4000');
      
      window.close();
    } else {
      // Неизвестная ошибка
      window.opener.postMessage({
        type: 'OAUTH_ERROR',
        error: 'Authentication failed'
      }, 'http://localhost:4000');
      
      window.close();
    }
  }, [searchParams, navigate]);

  return (
    <div className="oauth-callback">
      <div className="loading-spinner"></div>
      <p>Completing authentication...</p>
    </div>
  );
};