import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import "./CSS/themetoggle.css"; // создадим стили отдельно

const ThemeToggle: React.FC = () => {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Читаем тему из localStorage или по умолчанию — тёмная
    const saved = localStorage.getItem("theme");
    if (saved) return saved === "dark";
    return true;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "dark" : "light");
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <button
      className="theme-toggle"
      onClick={() => setDarkMode((prev) => !prev)}
      aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"}
    >
      {darkMode ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
};

export default ThemeToggle;
