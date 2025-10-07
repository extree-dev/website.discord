import React, { useEffect, useState } from "react";
import { FiSun, FiMoon } from "react-icons/fi";
import { BsSun, BsMoon } from "react-icons/bs";
import styles from './ThemeToggle.module.scss';

const ThemeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.classList.add(styles.themeTransition);

    const theme = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);

    const timer = setTimeout(() => {
      document.documentElement.classList.remove(styles.themeTransition);
    }, 600);

    return () => clearTimeout(timer);
  }, [darkMode]);

  const handleThemeToggle = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <button
      className={styles.toggle}
      onClick={handleThemeToggle}
      aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
    >
      {/* Статические иконки по бокам со стеклянными фонами */}
      <span className={`${styles.icon} ${styles.sun}`}>
        <FiSun size={14} />
      </span>
      <span className={`${styles.icon} ${styles.moon}`}>
        <FiMoon size={14} />
      </span>

      {/* Подвижный переключатель */}
      <div className={styles.thumb}>
        <span className={styles.thumbIcon}>
        </span>
      </div>
    </button>
  );
};

export default ThemeToggle;