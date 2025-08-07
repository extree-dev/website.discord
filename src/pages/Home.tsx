import '../components/CSS/Home.css'
import { useAuth } from '@/stores/auth'
import { useEffect, useState, useRef } from 'react'
import { FaDiscord } from 'react-icons/fa'
import AnimatedButton from '../components/AnimatedButton'

const Home = () => {
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [mousePressed, setMousePressed] = useState(false);
  const [hoveredLetter, setHoveredLetter] = useState<{ index: number, element: HTMLElement } | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setCursorPos({ x: e.clientX, y: e.clientY });

      if (!textContainerRef.current) return;

      // Находим все буквы внутри контейнера
      const letters = Array.from(textContainerRef.current.querySelectorAll('.letter')) as HTMLElement[];

      // Находим ближайшую букву к курсору
      let closestLetter = null;
      let minDistance = Infinity;

      letters.forEach((letter, index) => {
        const rect = letter.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.sqrt(
          Math.pow(e.clientX - centerX, 2) + Math.pow(e.clientY - centerY, 2)
        );

        if (distance < minDistance && distance < 30) { // 30px - радиус воздействия
          minDistance = distance;
          closestLetter = { index, element: letter };
        }
      });

      // Убираем эффект с предыдущей буквы
      if (hoveredLetter && (!closestLetter || hoveredLetter.index !== closestLetter.index)) {
        hoveredLetter.element.classList.remove('letter-hovered');
      }

      // Применяем эффект к новой букве
      if (closestLetter && (!hoveredLetter || hoveredLetter.index !== closestLetter.index)) {
        closestLetter.element.classList.add('letter-hovered');
        setHoveredLetter(closestLetter);
      } else if (!closestLetter && hoveredLetter) {
        setHoveredLetter(null);
      }
    };

    const handleMouseDown = () => setMousePressed(true);
    const handleMouseUp = () => setMousePressed(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);

      // Убираем эффект при размонтировании
      if (hoveredLetter) {
        hoveredLetter.element.classList.remove('letter-hovered');
      }
    };
  }, [hoveredLetter]);

  const handleDiscordLogin = () => {
    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
    const redirectUri = import.meta.env.VITE_DISCORD_REDIRECT_URI;
    const scope = import.meta.env.VITE_DISCORD_SCOPE || 'identify email';

    if (!clientId) {
      setError('Discord Client ID is not configured');
      return;
    }

    try {
      const authUrl = new URL('https://discord.com/api/oauth2/authorize');
      authUrl.searchParams.append('client_id', clientId);
      authUrl.searchParams.append('redirect_uri', redirectUri);
      authUrl.searchParams.append('response_type', 'code');
      authUrl.searchParams.append('scope', scope);

      window.location.href = authUrl.toString();
    } catch (err) {
      setError('Failed to construct Discord auth URL');
      console.error(err);
    }
  };

  // Функция для разбиения текста на буквы
  const renderTextWithLetterEffects = (text: string) => {
    return text.split('').map((char, index) => (
      <span key={index} className="letter">
        {char === ' ' ? '\u00A0' : char} {/* Заменяем обычный пробел на неразрывный */}
      </span>
    ));
  };

  return (
    <div className="section-hero">
      {/* Кастомный курсор */}
      <div
        className={`custom-cursor ${mousePressed ? 'cursor-pressed' : ''}`}
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
        }}
      />

      <div className="background-layer"></div>
      <div className="container">
        <div className="padding-vertical-xxlarge">
          <div className="timeline-hero_heading-wrapper" ref={textContainerRef}>
            <h1>
              {renderTextWithLetterEffects('Sentinel ')}
              <span className="text-underline">
                {renderTextWithLetterEffects('Technologies')}
              </span>
            </h1>
            <div className="margin-bottom-medium">
              <h4>
                {renderTextWithLetterEffects('Moderation management at a new level')}
              </h4>
            </div>
            <div className="margin-bottom-privacy">
              <h5>
                {renderTextWithLetterEffects('By clicking the button, you agree to the Privacy Policy')}
              </h5>
            </div>
          </div>
          <div className="buttons-container">
            <div className="discord-login-container">
              <button
                onClick={handleDiscordLogin}
                className="discord-login-button"
              >
                <FaDiscord className="discord-icon" />
                <span>Login with Discord</span>
              </button>
              {error && <div className="error-message">{error}</div>}
            </div>
            <AnimatedButton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;