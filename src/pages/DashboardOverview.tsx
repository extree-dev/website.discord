import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import {
    FiTrendingUp,
    FiUsers,
    FiActivity,
    FiClock,
    FiServer,
    FiAlertTriangle,
    FiWifi,
    FiRefreshCw
} from "react-icons/fi";
import styles from "../module_pages/DashboardOverview.module.scss";

export default function DashboardOverview() {
    const [guilds, setGuilds] = useState([
        { id: "123456789", name: "Main Server", members: 1542, enabled: true },
        { id: "987654321", name: "Test Server", members: 243, enabled: false },
        { id: "543216789", name: "Gaming Hub", members: 3124, enabled: true }
    ]);

    const [logs] = useState([
        { time: "5m ago", type: "error", message: "/ban failed — Missing Permissions", user: "@Admin" },
        { time: "12m ago", type: "warn", message: "Rate limit warning — /ping", user: "@Moderator" },
        { time: "1h ago", type: "error", message: "/kick failed — API Timeout", user: "@ModJane" },
        { time: "2h ago", type: "info", message: "Bot started successfully", user: "System" }
    ]);

    const [isRefreshing, setIsRefreshing] = useState(false);

    const toggleGuildStatus = (id: string) => {
        setGuilds(prev =>
            prev.map(g =>
                g.id === id ? { ...g, enabled: !g.enabled } : g
            )
        );
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Имитация обновления данных
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const getLogTypeClass = (type) => {
        switch (type) {
            case 'error': return styles.error;
            case 'warn': return styles.warn;
            case 'info': return styles.info;
            default: return '';
        }
    };

    return (
        <div className={styles.layout}>
            <Sidebars />
            <div className={`${styles.overviewPage} ${isRefreshing ? styles.updating : ''}`}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                        <h1>Overview</h1>
                        <button 
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            style={{
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '6px',
                                padding: '0.5rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <FiRefreshCw size={16} className={isRefreshing ? styles.loading : ''} />
                            Refresh
                        </button>
                    </div>
                    <span className={styles.subtitle}>
                        Monitor your bot's performance and usage statistics
                    </span>
                </div>

                {/* Основная статистика */}
                <div className={styles.grid}>
                    <div className={styles.card}>
                        <FiTrendingUp className={styles.cardIcon} />
                        <h2>Active Servers</h2>
                        <p>245</p>
                    </div>
                    <div className={styles.card}>
                        <FiUsers className={styles.cardIcon} />
                        <h2>Users Reached</h2>
                        <p>18,320</p>
                    </div>
                    <div className={styles.card}>
                        <FiActivity className={styles.cardIcon} />
                        <h2>Commands Run</h2>
                        <p>92,440</p>
                    </div>
                    <div className={styles.card}>
                        <FiClock className={styles.cardIcon} />
                        <h2>Uptime</h2>
                        <p>99.98%</p>
                    </div>
                </div>

                {/* Статус бота и версии */}
                <div className={styles.statusContainer}>
                    <div className={`${styles.section} ${styles.botStatus}`}>
                        <h2><FiWifi /> Bot Status</h2>
                        <div className={styles.statusContainer}>
                            <div className={styles.statusColumn}>
                                <p>Status</p>
                                <span>
                                    <span className={`${styles.statusDot} ${styles.online}`}></span> Online
                                </span>
                            </div>
                            <div className={styles.statusColumn}>
                                <p>Ping</p>
                                <span className={styles.statusValue}>42 ms</span>
                            </div>
                            <div className={styles.statusColumn}>
                                <p>Last heartbeat</p>
                                <span className={styles.statusValue}>2m ago</span>
                            </div>
                        </div>
                    </div>

                    <div className={`${styles.section} ${styles.versionInfo}`}>
                        <h2><FiServer /> Version & Uptime</h2>
                        <div className={styles.statusContainer}>
                            <div className={styles.statusColumn}>
                                <p>Bot Version</p>
                                <span className={styles.statusValue}>
                                    v2.3.1 <small>(commit a1b2c3d)</small>
                                </span>
                            </div>
                            <div className={styles.statusColumn}>
                                <p>Server Uptime</p>
                                <span className={styles.statusValue}>12 days 4 hours</span>
                            </div>
                            <div className={styles.statusColumn}>
                                <p>Last Deploy</p>
                                <span className={styles.statusValue}>2025-08-10 14:32</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Подключённые гильдии */}
                <div className={styles.section}>
                    <h2>Connected Guilds</h2>
                    {guilds.length > 0 ? (
                        <table className={styles.guildsTable}>
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>ID</th>
                                    <th>Members</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {guilds.map(g => (
                                    <tr key={g.id}>
                                        <td>{g.name}</td>
                                        <td className={styles.textMuted}>{g.id}</td>
                                        <td>{g.members.toLocaleString()}</td>
                                        <td>
                                            <button
                                                className={`${styles.guildToggle} ${g.enabled ? styles.on : styles.off}`}
                                                onClick={() => toggleGuildStatus(g.id)}
                                            >
                                                {g.enabled ? "Enabled" : "Disabled"}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className={styles.emptyState}>
                            <FiServer className={styles.emptyStateIcon} />
                            <div className={styles.emptyStateTitle}>No Guilds Connected</div>
                            <div className={styles.emptyStateDescription}>
                                Connect your first Discord server to get started.
                            </div>
                        </div>
                    )}
                </div>

                {/* Логи ошибок */}
                <div className={styles.section}>
                    <h2><FiAlertTriangle /> Bot Logs</h2>
                    {logs.length > 0 ? (
                        <ul className={styles.logsList}>
                            {logs.map((log, i) => (
                                <li key={i} className={`${styles.logItem} ${getLogTypeClass(log.type)}`}>
                                    <span className={styles.time}>{log.time}</span> — {log.message} by {log.user}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className={styles.emptyState}>
                            <FiActivity className={styles.emptyStateIcon} />
                            <div className={styles.emptyStateTitle}>No Logs Available</div>
                            <div className={styles.emptyStateDescription}>
                                Bot activity logs will appear here.
                            </div>
                        </div>
                    )}
                </div>

                {/* Дополнительная информация */}
                <div className={styles.section}>
                    <h2>Quick Actions</h2>
                    <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                        gap: '1rem',
                        marginTop: '1rem'
                    }}>
                        <button className={`${styles.guildToggle} ${styles.on}`} style={{ padding: '0.75rem 1rem' }}>
                            Invite Bot
                        </button>
                        <button className={`${styles.guildToggle} ${styles.on}`} style={{ padding: '0.75rem 1rem' }}>
                            View Documentation
                        </button>
                        <button className={`${styles.guildToggle} ${styles.off}`} style={{ padding: '0.75rem 1rem' }}>
                            Support Server
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}