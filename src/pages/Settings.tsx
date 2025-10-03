import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import LanguageSelect from "@/components/LanguageSelect.js";
import { useTheme } from "@/stores/theme.js";
import styles from "../module_pages/Settings.module.scss";

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
        <div className={styles.layout}>
            <Sidebars />
            <main className={styles.main}>
                <header className={styles.header}>
                    <h1 className={styles.header__title}>⚙ Settings</h1>
                    <p className={styles.header__subtitle}>
                        Customize appearance, language, notifications, and privacy preferences
                    </p>
                </header>

                <div className={styles.grid}>
                    {/* Appearance */}
                    <div className={styles.card}>
                        <h2 className={styles.card__title}>Appearance</h2>
                        <div className={styles.row}>
                            <label>Theme:</label>
                            <button className={styles.toggleButton} onClick={toggleTheme}>
                                {theme === "light" ? "Dark" : "Light"}
                            </button>
                        </div>
                    </div>

                    {/* Language */}
                    <div className={styles.card}>
                        <h2 className={styles.card__title}>Language</h2>
                        <div className={styles.row}>
                            <label>Select language:</label>
                            <LanguageSelect
                                options={["en", "es", "fr", "de"]}
                                defaultValue={language}
                                onChange={(lang) => setLanguage(lang)}
                            />
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className={styles.card}>
                        <h2 className={styles.card__title}>Notifications</h2>
                        <div className={styles.row}>
                            <label>Enable notifications:</label>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={notifications}
                                onChange={(e) => setNotifications(e.target.checked)}
                            />
                        </div>
                    </div>

                    {/* Privacy */}
                    <div className={styles.card}>
                        <h2 className={styles.card__title}>Privacy</h2>
                        <div className={styles.row}>
                            <label>Hide my online status:</label>
                            <input
                                type="checkbox"
                                className={styles.checkbox}
                                checked={privacy}
                                onChange={(e) => setPrivacy(e.target.checked)}
                            />
                        </div>
                    </div>
                </div>

                <div className={styles.actions}>
                    <button className={styles.saveButton} onClick={saveSettings}>
                        Save changes
                    </button>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;