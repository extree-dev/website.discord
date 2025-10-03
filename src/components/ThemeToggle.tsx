import React, { useEffect, useState, useRef } from "react";
import { Sun, Moon } from "lucide-react";
import "./CSS/themetoggle.css";

const ThemeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return true;
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const handleThemeToggle = (e: React.MouseEvent) => {
    if (isAnimating) return;

    setIsAnimating(true);

    // Создаем элемент волны
    const wave = document.createElement('div');

    // Определяем цвет волны в зависимости от направления смены темы
    const isSwitchingToLight = darkMode;
    wave.className = `theme-wave ${isSwitchingToLight ? 'to-light' : 'to-dark'}`;

    // Получаем позицию клика относительно ВИДПОРТА (окна браузера)
    const x = e.clientX;
    const y = e.clientY;

    // Устанавливаем позицию волны относительно viewport
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;

    // Добавляем волну в body
    document.body.appendChild(wave);

    // Запускаем анимацию волны
    setTimeout(() => {
      wave.classList.add('expanding');
    }, 10);

    // Меняем тему в середине анимации волны
    setTimeout(() => {
      setDarkMode((prev) => !prev);
    }, 300);

    // Завершаем анимацию и удаляем волну
    setTimeout(() => {
      setIsAnimating(false);
      if (wave.parentNode) {
        wave.parentNode.removeChild(wave);
      }
    }, 1000);
  };

  return (
    <button
      ref={buttonRef}
      className={`theme-toggle ${isAnimating ? 'animating' : ''}`}
      onClick={handleThemeToggle}
      aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
      disabled={isAnimating}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;