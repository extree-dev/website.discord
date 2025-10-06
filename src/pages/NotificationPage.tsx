import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import LanguageSelect from "@/components/LanguageSelect.js";
import {
    Mail,
    MessageCircle,
    Bell,
    Volume2,
    Smartphone,
    History,
    Send,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';
import styles from "../module_pages/NotificationPage.module.scss";

type Props = {
    options: string[];
    defaultValue?: string;
    onChange: (value: string) => void;
    className?: string; // ← добавлено
};

const NotificationPage: React.FC = () => {
    const [emailEnabled, setEmailEnabled] = useState(false);
    const [discordConnected, setDiscordConnected] = useState(false);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const [pushEnabled, setPushEnabled] = useState(true);
    const [frequency, setFrequency] = useState("Instant");
    const [isTesting, setIsTesting] = useState(false);

    const handleTestNotification = async () => {
        setIsTesting(true);
        // Имитация отправки тестового уведомления
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsTesting(false);
        alert('Test notification sent! Check your configured channels.');
    };

    const notificationHistory: NotificationItem[] = [
    { id: 1, message: "Server rebooted at 10:32 AM", time: "2 hours ago", type: "system" },
    { id: 2, message: "New message in Discord channel #general", time: "5 hours ago", type: "discord" },
    { id: 3, message: "Email report sent successfully", time: "1 day ago", type: "email" }
];

    type NotificationType = 'system' | 'discord' | 'email' | 'other';

    interface NotificationItem {
    id: number;
    message: string;
    time: string;
    type: NotificationType;
}

    const getStatusIcon = (type: NotificationType) => {
        switch (type) {
            case 'system': return <CheckCircle size={14} />;
            case 'discord': return <MessageCircle size={14} />;
            case 'email': return <Mail size={14} />;
            default: return <Bell size={14} />;
        }
    };

    return (
        <div className={styles.container}>
            <Sidebars />
            <div className={styles.contentArea}>
                <div className={styles.fullscreen}>

                    {/* Header */}
                    <div className={styles.header}>
                        <h1 className={styles.title}>Notifications</h1>
                        <p className={styles.subtitle}>
                            Configure notifications for your bot to receive important messages.
                        </p>
                    </div>

                    {/* Notification Grid */}
                    <div className={styles.grid}>

                        {/* Email Notifications */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <Mail className={styles.cardIcon} />
                                Email Notifications
                            </h2>
                            <p className={styles.help}>
                                Receive reports and system notifications via email.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.toggleButton} ${emailEnabled ? styles.active : styles.inactive}`}
                                    onClick={() => setEmailEnabled(!emailEnabled)}
                                >
                                    {emailEnabled ? 'Disable' : 'Enable'}
                                </button>
                                <span className={`${styles.statusIndicator} ${emailEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
                                    {emailEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                            {!emailEnabled && (
                                <div className={styles.infoBlock}>
                                    <div className={styles.infoBlock__title}>Email Notifications Disabled</div>
                                    <div className={styles.infoBlock__content}>
                                        Enable to receive important system reports and alerts directly to your email.
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Discord Notifications */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <MessageCircle className={styles.cardIcon} />
                                Discord Notifications
                            </h2>
                            <p className={styles.help}>
                                Link a channel for logs and system messages.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.toggleButton} ${discordConnected ? styles.active : styles.inactive}`}
                                    onClick={() => setDiscordConnected(!discordConnected)}
                                >
                                    {discordConnected ? 'Disconnect' : 'Connect'}
                                </button>
                                <span className={`${styles.statusIndicator} ${discordConnected ? styles.statusEnabled : styles.statusPending}`}>
                                    {discordConnected ? 'Connected' : 'Not Connected'}
                                </span>
                            </div>
                        </div>

                        {/* Notification Frequency */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <Clock className={styles.cardIcon} />
                                Notification Frequency
                            </h2>
                            <p className={styles.help}>
                                Choose how often you'd like to receive notifications.
                            </p>
                            <LanguageSelect
                                options={["Instant", "Daily", "Weekly"]}
                                defaultValue={frequency}
                                onChange={(value) => setFrequency(value)}
                                className={styles.languageSelect}
                            />
                            <div className={styles.infoBlock}>
                                <div className={styles.infoBlock__content}>
                                    <strong>Instant:</strong> Receive notifications immediately<br />
                                    <strong>Daily:</strong> Daily digest at 9:00 AM<br />
                                    <strong>Weekly:</strong> Weekly report on Monday
                                </div>
                            </div>
                        </div>

                        {/* Sound Alerts */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <Volume2 className={styles.cardIcon} />
                                Sound Alerts
                            </h2>
                            <p className={styles.help}>
                                Play a sound when a new notification arrives.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.toggleButton} ${soundEnabled ? styles.active : styles.inactive}`}
                                    onClick={() => setSoundEnabled(!soundEnabled)}
                                >
                                    {soundEnabled ? 'Disable' : 'Enable'}
                                </button>
                                <span className={`${styles.statusIndicator} ${soundEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
                                    {soundEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>

                        {/* Push Notifications */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <Smartphone className={styles.cardIcon} />
                                Push Notifications
                            </h2>
                            <p className={styles.help}>
                                Receive notifications directly in your browser or OS.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.toggleButton} ${pushEnabled ? styles.active : styles.inactive}`}
                                    onClick={() => setPushEnabled(!pushEnabled)}
                                >
                                    {pushEnabled ? 'Disable' : 'Enable'}
                                </button>
                                <span className={`${styles.statusIndicator} ${pushEnabled ? styles.statusEnabled : styles.statusDisabled}`}>
                                    {pushEnabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </div>
                        </div>

                        {/* Notification History */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <History className={styles.cardIcon} />
                                Notification History
                            </h2>
                            <p className={styles.help}>
                                See your recent notifications.
                            </p>
                            <ul className={styles.historyList}>
                                {notificationHistory.map((item) => (
                                    <li key={item.id} className={styles.historyItem}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                                            {getStatusIcon(item.type)}
                                            <span style={{ fontWeight: '500' }}>{item.message}</span>
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {item.time}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Test Notification */}
                        <div className={styles.card}>
                            <h2 className={styles.card__title}>
                                <Send className={styles.cardIcon} />
                                Test Notification
                            </h2>
                            <p className={styles.help}>
                                Send a test notification to verify your settings.
                            </p>
                            <div className={styles.actions}>
                                <button
                                    className={`${styles.saveButton} ${isTesting ? styles.testing : ''}`}
                                    onClick={handleTestNotification}
                                    disabled={isTesting}
                                >
                                    {isTesting ? (
                                        <>
                                            <Clock size={16} className={styles.spinner} />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={16} />
                                            Send Test
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className={styles.infoBlock}>
                                <div className={styles.infoBlock__content}>
                                    This will send a test notification to all enabled channels based on your current settings.
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;