import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import styles from './OAuthCallback.module.scss';

export const OAuthCallback = () => {
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const error = searchParams.get('error');

    const targetOrigin = 'http://localhost:4000'; // замените на ваш продакшн URL

    if (token) {
      window.opener.postMessage({ type: 'OAUTH_SUCCESS', token }, targetOrigin);
      window.close();
    } else {
      window.opener.postMessage({ type: 'OAUTH_ERROR', error: error || 'Authentication failed' }, targetOrigin);
      window.close();
    }
  }, [searchParams]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner}></div>
      <p className={styles.text}>Completing authentication...</p>
    </div>
  );
};
