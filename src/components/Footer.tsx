import React from "react";
import { TbBrandDiscord } from "react-icons/tb";
import { FiTwitter, FiGithub, FiLinkedin } from "react-icons/fi";
import "./CSS/Footer.css";

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      {/* Верхний блок */}
      <div className="footer__container">

        {/* Меню */}
        <nav className="footer__menu">
          <a href="#">Главная</a>
          <a href="#">О нас</a>
          <a href="#">Документация</a>
          <a href="#">Поддержка</a>
        </nav>

        {/* Соцсети */}
        <div className="footer__socials">
          <a href="#"><TbBrandDiscord /></a>
          <a href="#"><FiTwitter /></a>
          <a href="#"><FiGithub /></a>
          <a href="#"><FiLinkedin /></a>
        </div>
      </div>

      {/* Нижний блок */}
      <div className="footer__bottom">
        <div className="footer__policies">
          <a href="#">Политика конфиденциальности</a>
          <a href="#">Условия использования</a>
        </div>
        <p className="footer__copy">
          © {new Date().getFullYear()} Sentinel Dashboard — Все права защищены.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
