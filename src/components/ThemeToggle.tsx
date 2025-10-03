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
    
    const wave = document.createElement('div');
    const isSwitchingToLight = darkMode;
    wave.className = `theme-wave ${isSwitchingToLight ? 'to-light' : 'to-dark'}`;
    
    // Позиция относительно viewport
    const x = e.clientX;
    const y = e.clientY;
    
    wave.style.left = `${x}px`;
    wave.style.top = `${y}px`;
    
    document.body.appendChild(wave);
    
    setTimeout(() => {
      wave.classList.add('expanding');
    }, 10);
    
    setTimeout(() => {
      setDarkMode((prev) => !prev);
    }, 400);
    
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