import React from "react";
import Sidebars from "@/components/Saidbar";
import '../components/CSS/NotificationPage.css'
import LanguageSelect from "@/components/LanguageSelect";

type Props = {
    options: string[];
    defaultValue?: string;
    onChange: (value: string) => void;
};

const NotificationPage: React.FC = () => {
    return (
        <div className="notification-page-container">
            <Sidebars />
            <div className="notification-content-area">
                <div className="notification-fullscreen">

                    {/* Header */}
                    <div className="notification-header">
                        <h1 className="notification-title">Notifications</h1>
                        <p className="notification-subtitle">
                            Configure notifications for your bot to receive important messages.
                        </p>
                    </div>

                    {/* Notification Grid */}
                    <div className="notification-grid">

                        {/* Email Notifications */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Email Notifications</h2>
                            <p className="notification-help">
                                Receive reports and system notifications via email.
                            </p>
                            <div className="notification-actions">
                                <button className="toggle-button">Enable</button>
                            </div>
                        </div>

                        {/* Discord Notifications */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Discord Notifications</h2>
                            <p className="notification-help">
                                Link a channel for logs and system messages.
                            </p>
                            <div className="notification-actions">
                                <button className="toggle-button">Connect</button>
                            </div>
                        </div>

                        {/* Notification Frequency */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Notification Frequency</h2>
                            <p className="notification-help">
                                Choose how often you'd like to receive notifications.
                            </p>
                            <LanguageSelect
                                options={["Instant", "Daily", "Weekly"]}
                                defaultValue="Instant"
                                onChange={(value) => console.log("Selected:", value)}
                            />

                        </div>


                        {/* Sound Alerts */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Sound Alerts</h2>
                            <p className="notification-help">
                                Play a sound when a new notification arrives.
                            </p>
                            <div className="notification-actions">
                                <button className="toggle-button">Enable</button>
                            </div>
                        </div>

                        {/* Push Notifications */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Push Notifications</h2>
                            <p className="notification-help">
                                Receive notifications directly in your browser or OS.
                            </p>
                            <div className="notification-actions">
                                <button className="toggle-button">Enable</button>
                            </div>
                        </div>

                        {/* Notification History */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Notification History</h2>
                            <p className="notification-help">
                                See your recent notifications.
                            </p>
                            <ul>
                                <li>Server rebooted at 10:32 AM</li>
                                <li>New message in Discord channel #general</li>
                                <li>Email report sent</li>
                            </ul>
                        </div>

                        {/* Test Notification */}
                        <div className="notification-card">
                            <h2 className="notification-card__title">Test Notification</h2>
                            <p className="notification-help">
                                Send a test notification to verify your settings.
                            </p>
                            <div className="notification-actions">
                                <button className="save-button">Send Test</button>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationPage;
