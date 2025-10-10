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
    FiRefreshCw,
    FiCpu,
    FiDatabase,
    FiShield,
    FiMessageSquare,
    FiBarChart2,
    FiGlobe,
    FiDownload,
    FiUpload,
    FiHeart
} from "react-icons/fi";
import {
    Users,
    Eye,
    Command,
    Shield,
    AlertTriangle,
    TrendingUp,
    MessageCircle,
    Clock,
    CheckCircle,
    XCircle,
    Search,
    Filter,
    Download,
    MoreHorizontal,
    Bell,
    Calendar,
    Server,
    Network,
    Cpu,
    Database,
    BarChart3,
    Globe,
    Heart
} from "lucide-react";
import styles from "../module_pages/DashboardOverview.module.scss";

export default function DashboardOverview() {

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [guilds, setGuilds] = useState([
        { id: "123456789", name: "Main Server", members: 1542, enabled: true, icon: "🏠" },
        { id: "987654321", name: "Test Server", members: 243, enabled: false, icon: "🧪" },
        { id: "543216789", name: "Gaming Hub", members: 3124, enabled: true, icon: "🎮" },
        { id: "789123456", name: "Community", members: 876, enabled: true, icon: "👥" }
    ]);

    const [logs] = useState([
        { time: "2m ago", type: "success", message: "Bot started successfully", user: "System" },
        { time: "5m ago", type: "error", message: "/ban failed — Missing Permissions", user: "@Admin" },
        { time: "12m ago", type: "warn", message: "Rate limit warning — /ping", user: "@Moderator" },
        { time: "1h ago", type: "success", message: "Auto-moderation rule triggered", user: "System" },
        { time: "2h ago", type: "info", message: "Scheduled backup completed", user: "System" }
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
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    type LogType = 'error' | 'warn' | 'info' | 'success';

    const getLogTypeClass = (type: LogType) => {
        switch (type) {
            case 'error': return styles.error;
            case 'warn': return styles.warn;
            case 'info': return styles.info;
            case 'success': return styles.success;
            default: return '';
        }
    };

    const getLogIcon = (type: LogType) => {
        switch (type) {
            case 'error': return <XCircle size={16} />;
            case 'warn': return <AlertTriangle size={16} />;
            case 'info': return <MessageCircle size={16} />;
            case 'success': return <CheckCircle size={16} />;
            default: return <MessageCircle size={16} />;
        }
    };

    // Performance metrics
    const performanceData = {
        cpu: 24,
        memory: 68,
        network: 45,
        storage: 82
    };

    return (
        <div
            className={styles.layout}
            style={{
                '--sidebar-width': sidebarCollapsed ? '82px' : '280px'
            } as React.CSSProperties}
        >
            <Sidebars
                onCollapseChange={setSidebarCollapsed}
                collapsed={sidebarCollapsed}
            />
            <div className={`${styles.overviewPage} ${isRefreshing ? styles.updating : ''}`}>

                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerText}>
                            <h1>System Overview</h1>
                            <span className={styles.subtitle}>
                                Real-time monitoring and performance analytics
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            <div className={styles.timeFilters}>
                                {['24h', '7d', '30d'].map((range) => (
                                    <button key={range} className={styles.timeFilter}>
                                        {range}
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className={styles.refreshBtn}
                            >
                                <FiRefreshCw size={16} className={isRefreshing ? styles.loading : ''} />
                                Refresh
                            </button>
                        </div>
                    </div>
                </header>

                {/* Key Metrics Grid */}
                <section className={styles.metricsGrid}>
                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Globe size={24} />
                            </div>
                            <TrendingUp size={16} className={styles.trendingUp} />
                        </div>
                        <h3 className={styles.metricValue}>245</h3>
                        <p className={styles.metricLabel}>Active Servers</p>
                        <div className={styles.metricChange}>
                            <span className={styles.changePositive}>+12</span>
                            <span className={styles.changeText}>this week</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Users size={24} />
                            </div>
                            <TrendingUp size={16} className={styles.trendingUp} />
                        </div>
                        <h3 className={styles.metricValue}>18.3K</h3>
                        <p className={styles.metricLabel}>Users Reached</p>
                        <div className={styles.metricChange}>
                            <span className={styles.changePositive}>+2.1%</span>
                            <span className={styles.changeText}>today</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Command size={24} />
                            </div>
                            <TrendingUp size={16} className={styles.trendingUp} />
                        </div>
                        <h3 className={styles.metricValue}>92.4K</h3>
                        <p className={styles.metricLabel}>Commands Run</p>
                        <div className={styles.metricChange}>
                            <span className={styles.changePositive}>+15%</span>
                            <span className={styles.changeText}>vs yesterday</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Clock size={24} />
                            </div>
                            <Heart size={16} className={styles.healthy} />
                        </div>
                        <h3 className={styles.metricValue}>99.98%</h3>
                        <p className={styles.metricLabel}>Uptime</p>
                        <div className={styles.metricChange}>
                            <span className={styles.changeNeutral}>Stable</span>
                        </div>
                    </div>
                </section>

                {/* System Status & Performance */}
                <div className={styles.contentGrid}>
                    {/* Bot Status */}
                    <div className={styles.statusCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <FiWifi /> Bot Status
                            </h3>
                            <div className={styles.statusIndicator}>
                                <div className={`${styles.statusDot} ${styles.online}`}></div>
                                Online
                            </div>
                        </div>
                        <div className={styles.statusGrid}>
                            <div className={styles.statusItem}>
                                <div className={styles.statusLabel}>Response Time</div>
                                <div className={styles.statusValue}>42 ms</div>
                                <div className={styles.statusSubtext}>Optimal</div>
                            </div>
                            <div className={styles.statusItem}>
                                <div className={styles.statusLabel}>Last Heartbeat</div>
                                <div className={styles.statusValue}>2m ago</div>
                                <div className={styles.statusSubtext}>Active</div>
                            </div>
                            <div className={styles.statusItem}>
                                <div className={styles.statusLabel}>API Latency</div>
                                <div className={styles.statusValue}>128 ms</div>
                                <div className={styles.statusSubtext}>Normal</div>
                            </div>
                        </div>
                    </div>

                    {/* System Performance */}
                    <div className={styles.performanceCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Cpu size={20} /> System Performance
                            </h3>
                            <div className={styles.cardActions}>
                                <Filter size={16} />
                                <Download size={16} />
                            </div>
                        </div>
                        <div className={styles.performanceGrid}>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Cpu size={16} />
                                    <span>CPU</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${performanceData.cpu}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{performanceData.cpu}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Database size={16} />
                                    <span>Memory</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${performanceData.memory}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{performanceData.memory}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Network size={16} />
                                    <span>Network</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${performanceData.network}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{performanceData.network}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Server size={16} />
                                    <span>Storage</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${performanceData.storage}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{performanceData.storage}%</div>
                            </div>
                        </div>
                    </div>

                    {/* Connected Guilds */}
                    <div className={styles.guildsCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Globe size={20} /> Connected Servers
                            </h3>
                            <span className={styles.guildCount}>{guilds.length} servers</span>
                        </div>
                        <div className={styles.guildsList}>
                            {guilds.map((guild) => (
                                <div key={guild.id} className={styles.guildItem}>
                                    <div className={styles.guildInfo}>
                                        <div className={styles.guildIcon}>{guild.icon}</div>
                                        <div className={styles.guildDetails}>
                                            <div className={styles.guildName}>{guild.name}</div>
                                            <div className={styles.guildStats}>
                                                <span>{guild.members.toLocaleString()} members</span>
                                                <span className={styles.guildId}>#{guild.id.slice(-6)}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        className={`${styles.guildToggle} ${guild.enabled ? styles.enabled : styles.disabled}`}
                                        onClick={() => toggleGuildStatus(guild.id)}
                                    >
                                        <div className={styles.toggleIndicator}></div>
                                        {guild.enabled ? 'Enabled' : 'Disabled'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* System Logs */}
                    <div className={styles.logsCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <AlertTriangle size={20} /> System Logs
                            </h3>
                            <button className={styles.viewAllBtn}>View All</button>
                        </div>
                        <div className={styles.logsList}>
                            {logs.map((log, index) => (
                                <div key={index} className={`${styles.logItem} ${getLogTypeClass(log.type as LogType)}`}>
                                    <div className={styles.logIcon}>
                                        {getLogIcon(log.type as LogType)}
                                    </div>
                                    <div className={styles.logContent}>
                                        <div className={styles.logMessage}>{log.message}</div>
                                        <div className={styles.logMeta}>
                                            <span className={styles.logTime}>{log.time}</span>
                                            <span className={styles.logUser}>{log.user}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={styles.actionsSection}>
                    <h3 className={styles.sectionTitle}>Quick Actions</h3>
                    <div className={styles.actionsGrid}>
                        <button className={styles.actionBtn}>
                            <FiServer size={20} />
                            <span>Invite Bot</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <FiBarChart2 size={20} />
                            <span>View Analytics</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <FiShield size={20} />
                            <span>Security Settings</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <FiDatabase size={20} />
                            <span>Backup Data</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}