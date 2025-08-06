// src/client/components/layout/Footer.tsx
import React from 'react';
import './CSS/Footer.css';
import { FiTwitter, FiGithub, FiFigma } from 'react-icons/fi';
import { TbBrandDiscord } from 'react-icons/tb';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="glass-footer">
            <div className="footer-bubbles">
                <div className="bubble bubble-1"></div>
                <div className="bubble bubble-2"></div>
            </div>

            <div className="footer-content">
                <div className="footer-left">
                    <div className="footer-logo-wrapper">
                        <span className="footer-logo">
                            <span className="logo-part-1">Sentinel</span>
                            <span className="logo-part-2">Technologies</span>
                        </span>
                        <div className="logo-underline"></div>
                    </div>
                    <p className="footer-slogan">
                        Moderation of the new generationn
                        <span className="slogan-divider">|</span>
                        <span className="copyright">{currentYear} © Все права защищены</span>
                    </p>
                </div>

                <div className="footer-right">
                    <div className="footer-links">
                        <a href="#" className="glass-link">Docs</a>
                        <a href="#" className="glass-link">GitHub</a>
                        <a href="#" className="glass-link">Careers</a>
                    </div>

                    <div className="footer-socials">
                        <a href="#" aria-label="Twitter"><FiTwitter /></a>
                        <a href="#" aria-label="Discord"><TbBrandDiscord /></a>
                        <a href="#" aria-label="Figma"><FiFigma /></a>
                        <a href="#" aria-label="GitHub"><FiGithub /></a>
                    </div>
                </div>
            </div>
        </footer>
    );
};