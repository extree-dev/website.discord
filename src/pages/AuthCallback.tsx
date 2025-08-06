import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/stores/auth';

const AuthCallback = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    if (code) {
      // Здесь должен быть запрос к вашему бэкенду для обмена code на токен
      fetch('/api/auth/discord', {
        method: 'POST',
        body: JSON.stringify({ code }),
        headers: {
          'Content-Type': 'application/json'
        }
      })
      .then(res => res.json())
      .then(data => {
        login(); // Устанавливаем аутентификацию
        navigate('/dashboard'); // Перенаправляем на защищенную страницу
      });
    }
  }, [login, navigate]);

  return <div>Processing login...</div>;
};

export default AuthCallback;