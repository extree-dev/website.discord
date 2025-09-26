import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export function OAuthSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const userId = searchParams.get('userId');
    const method = searchParams.get('method');

    if (token && userId) {
      // Сохраняем токен в localStorage
      localStorage.setItem('auth_token', token);
      localStorage.setItem('user_id', userId);
      
      // Закрываем popup окно и обновляем основное окно
      if (window.opener) {
        // Отправляем сообщение в основное окно
        window.opener.postMessage({
          type: 'OAUTH_SUCCESS',
          token,
          userId,
          method
        }, window.location.origin);
        
        // Закрываем popup
        window.close();
      } else {
        // Если не popup, редиректим на главную
        navigate('/');
      }
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Авторизация успешна!</h2>
      <p>Закройте это окно или вы будете перенаправлены...</p>
    </div>
  );
}