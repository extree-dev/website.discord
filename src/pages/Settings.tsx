import React, { useState } from "react";
import "../components/CSS/Settings.css";
import Sidebars from "@/components/Saidbar";
import LanguageSelect from "@/components/LanguageSelect";
import { useTheme } from "@/stores/theme";

const SettingsPage: React.FC = () => {
    const { theme, toggleTheme, setTheme } = useTheme();

    const [language, setLanguage] = useState<string>(
        localStorage.getItem("language") || "en"
    );
    const [notifications, setNotifications] = useState<boolean>(
        localStorage.getItem("notifications") === "true"
    );
    const [privacy, setPrivacy] = useState<boolean>(
        localStorage.getItem("privacy") === "true"
    );
    const [accent, setAccent] = useState<string>(
        localStorage.getItem("accent") || "#4b7cff"
    );

    const saveSettings = () => {
        localStorage.setItem("theme", theme);
        localStorage.setItem("language", language);
        localStorage.setItem("notifications", String(notifications));
        localStorage.setItem("privacy", String(privacy));
        localStorage.setItem("accent", accent);
        alert("Settings saved!");
    };

    return (
        <div className="mp-layout">
            <Sidebars />
            <main className="mp-main">
                <header className="mp-header">
                    <h1 className="mp-header__title">⚙ Settings</h1>
                    <p className="mp-header__subtitle">
                        Customize appearance, language, notifications, and privacy preferences
                    </p>
                </header>

                <div className="settings-grid">
                    {/* Appearance */}
                    <div className="settings-card">
                        <h2 className="settings-card__title">Appearance</h2>
                        <div className="settings-row">
                            <label>Theme:</label>
                            <button className="toggle-button" onClick={toggleTheme}>
                                {theme === "light" ? "Dark" : "Light"}
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className="settings-card">
                        <h2 className="settings-card__title">Language</h2>
                        <div className="settings-row">
                            <label>Select language:</label>
                            <LanguageSelect value={language} onChange={(lang) => setLanguage(lang)} />
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="settings-card">
                        <h2 className="settings-card__title">Notifications</h2>
                        <div className="settings-row">
                            <label>Enable notifications:</label>
                            <input
                                type="checkbox"
                                checked={notifications}
                                onChange={(e) => setNotifications(e.target.checked)}
                            />
                        </div>
                    </div>

                    {/* Privacy */}
                    <div className="settings-card">
                        <h2 className="settings-card__title">Privacy</h2>
                        <div className="settings-row">
                            <label>Hide my online status:</label>
                            <input
                                type="checkbox"
                                checked={privacy}
                                onChange={(e) => setPrivacy(e.target.checked)}
                            />
                        </div>
                    </div>
                </div>

                <div className="settings-actions">
                    <button className="save-button" onClick={saveSettings}>
                        Save changes
                    </button>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;
