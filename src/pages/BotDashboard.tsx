// BotDashboard.tsx
import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import { FaSyncAlt, FaYoutube, FaTwitch, FaLink, FaRobot, FaCode, FaChartLine } from "react-icons/fa";
import {
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
    BarChart,
    Bar,
    ResponsiveContainer,
} from "recharts";
import styles from "../module_pages/BotDashboard.module.scss";

type Status = "online" | "idle" | "dnd" | "offline";

export default function BotDashboard() {
    const [status, setStatus] = useState<Status>("online");
    const [open, setOpen] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    const statuses = [
        { value: "online", label: "🟢 Online", description: "Bot is fully operational" },
        { value: "idle", label: "🌙 Idle", description: "Bot is online but inactive" },
        { value: "dnd", label: "⛔ Do Not Disturb", description: "Bot is busy or in maintenance" },
        { value: "offline", label: "⚫ Offline", description: "Bot is completely offline" },
    ];

    // Data for charts
    const onlineData = [
        { hour: "00:00", users: 120 },
        { hour: "02:00", users: 98 },
        { hour: "04:00", users: 110 },
        { hour: "06:00", users: 150 },
        { hour: "08:00", users: 200 },
        { hour: "10:00", users: 240 },
        { hour: "12:00", users: 310 },
        { hour: "14:00", users: 280 },
        { hour: "16:00", users: 320 },
        { hour: "18:00", users: 350 },
        { hour: "20:00", users: 380 },
        { hour: "22:00", users: 290 },
    ];

    const commandData = [
        { command: "/help", count: 45 },
        { command: "/stats", count: 32 },
        { command: "/ping", count: 60 },
        { command: "/play", count: 25 },
        { command: "/ban", count: 18 },
        { command: "/mute", count: 22 },
    ];

    const handleRestart = async () => {
        setIsRestarting(true);
        // Simulate restart process
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsRestarting(false);
        alert("Bot restarted successfully!");
    };

    const currentStatus = statuses.find(s => s.value === status);

    return (
        <div className={styles.layout}>
            <Sidebars />
            <main className={`${styles.main} ${styles.botDashboard}`}>
                <header className={styles.header}>
                    <h1 className={styles.header__title}>
                        <FaRobot style={{ marginRight: '0.5rem' }} />
                        Bot Dashboard
                    </h1>
                    <p className={styles.header__subtitle}>
                        Manage your bot and view real-time statistics
                    </p>
                </header>

                <div className={styles.botGrid}>
                    {/* Status Card */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaRobot />
                            Bot Status
                        </h2>
                        <p className={styles.botCard__value}>
                            Current status: <strong>{currentStatus?.label}</strong>
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            {currentStatus?.description}
                        </p>
                        <div className={`${styles.glassDropdown} ${open ? styles.open : ''}`}>
                            <div
                                className={styles.glassSelected}
                                onClick={() => setOpen(!open)}
                                tabIndex={0}
                            >
                                <span>{currentStatus?.label}</span>
                                <span className={styles.arrow} />
                            </div>
                            {open && (
                                <ul className={styles.glassOptions}>
                                    {statuses.map((s) => (
                                        <li
                                            key={s.value}
                                            className={`${s.value} ${status === s.value ? styles.active : ''}`}
                                            onClick={() => {
                                                setStatus(s.value as Status);
                                                setOpen(false);
                                            }}
                                        >
                                            {s.label}
                                            {status === s.value && (
                                                <span className={styles.optCheck}>✔</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Integrations Card */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaLink />
                            Integrations
                        </h2>
                        <div className={styles.integrationButtons}>
                            <button 
                                className={`${styles.integrationButton} ${styles.youtube}`}
                                onClick={() => alert("Connecting YouTube API...")}
                            >
                                <span className={styles.iconContainer}>
                                    <FaYoutube />
                                </span>
                                <div className={styles.integrationContent}>
                                    <p className={styles.integrationText}>Connect YouTube</p>
                                    <p className={styles.integrationDescription}>Live stream notifications</p>
                                </div>
                            </button>

                            <button 
                                className={`${styles.integrationButton} ${styles.twitch}`}
                                onClick={() => alert("Connecting Twitch...")}
                            >
                                <span className={styles.iconContainer}>
                                    <FaTwitch />
                                </span>
                                <div className={styles.integrationContent}>
                                    <p className={styles.integrationText}>Connect Twitch</p>
                                    <p className={styles.integrationDescription}>Stream alerts and commands</p>
                                </div>
                            </button>

                            <button 
                                className={`${styles.integrationButton} ${styles.webhooks}`}
                                onClick={() => alert("Configuring webhooks...")}
                            >
                                <span className={styles.iconContainer}>
                                    <FaLink />
                                </span>
                                <div className={styles.integrationContent}>
                                    <p className={styles.integrationText}>Configure Webhooks</p>
                                    <p className={styles.integrationDescription}>Custom integrations</p>
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Commands Card */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaCode />
                            Popular Commands
                        </h2>
                        <ul className={styles.botList}>
                            {commandData.slice(0, 4).map((cmd, index) => (
                                <li key={cmd.command}>
                                    <strong>{cmd.command}</strong> — {cmd.count} uses today
                                </li>
                            ))}
                        </ul>
                        <button
                            className={`${styles.botAction} ${styles.addCommand}`}
                            onClick={() => alert("Opening command creation window...")}
                        >
                            <FaCode />
                            Add New Command
                        </button>
                    </div>

                    {/* Online Users Chart */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaChartLine />
                            Online Users (24h)
                        </h2>
                        <div className={styles.rechartsWrapper}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={onlineData}>
                                    <Line
                                        type="monotone"
                                        dataKey="users"
                                        stroke="#00ffaa"
                                        strokeWidth={2}
                                        dot={{ fill: '#00ffaa', strokeWidth: 2 }}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="hour" />
                                    <YAxis />
                                    <Tooltip />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Command Usage Chart */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaChartLine />
                            Command Usage
                        </h2>
                        <div className={styles.rechartsWrapper}>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={commandData}>
                                    <Bar dataKey="count" fill="#5865F2" radius={[4, 4, 0, 0]} />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="command" />
                                    <YAxis />
                                    <Tooltip />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Bot Statistics */}
                    <div className={styles.botCard}>
                        <h2 className={styles.botCard__title}>
                            <FaRobot />
                            Quick Stats
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Servers</span>
                                <strong style={{ color: 'var(--text-primary)' }}>245</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Uptime</span>
                                <strong style={{ color: '#22c55e' }}>99.8%</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Response Time</span>
                                <strong style={{ color: 'var(--text-primary)' }}>42ms</strong>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>Memory Usage</span>
                                <strong style={{ color: '#f59e0b' }}>64%</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Restart Button */}
                <div className={styles.botRestartContainer}>
                    <button
                        className={`${styles.botAction} ${styles.restart} ${isRestarting ? styles.loading : ''}`}
                        onClick={handleRestart}
                        disabled={isRestarting}
                    >
                        <FaSyncAlt className={isRestarting ? styles.restartIcon : ''} />
                        {isRestarting ? "Restarting..." : "Restart Bot"}
                    </button>
                </div>
            </main>
        </div>
    );
}