import React, { useState, useEffect, useContext } from "react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/DashboardOverview.module.scss";
import { useAuth } from "@/context/AuthContext.js";
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
    Filter,
    Download,
    Bell,
    Calendar,
    RefreshCw,
    Zap,
    Hash,
    Activity,
    Play,
    StopCircle,
    BarChart3,
    Server,
    Network,
    Cpu,
    Database,
    Globe,
    Heart
} from "lucide-react";
import { SidebarContext } from "@/App.js";
import { FaMemory } from "react-icons/fa";

interface BotStatus {
    isOnServer: boolean;
    totalServers: number;
    isReady: boolean;
    uptime: number;
    ping: number;
    lastChecked: string;
    serverName?: string;
}

interface SystemStats {
    users: {
        total: number;
        active: number;
        newToday: number;
        growthPercentage: number;
    };
    secretCodes: {
        total: number;
        used: number;
        available: number;
    };
    commands: {
        today: number;
        total: number;
    };
    system: {
        uptime: number;
        memory: any;
        timestamp: string;
    };
    totalServers?: number;
    totalCommands?: number;
    performance?: {
        cpu: number;
        memory: number;
        network: number;
        storage: number;
    };
    environment?: string;
    isRealData?: boolean;
    timestamp?: string;
}

interface LogEntry {
    time: string;
    type: string;
    message: string;
    user: string;
}

interface Guild {
    id: string;
    name: string;
    members: number;
    enabled: boolean;
    icon: string;
}

interface MonitoringMetric {
    value: number | string;
    status: 'optimal' | 'normal' | 'slow' | 'warning';
    label: string;
    unit: string;
    details?: any;
}

interface BotMonitoringData {
    responseTime: MonitoringMetric;
    lastHeartbeat: MonitoringMetric;
    apiLatency: MonitoringMetric;
    overallHealth: string;
    guilds: number;
    commandsTracked: number;
}

export default function DashboardOverview() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
    const [botMonitoring, setBotMonitoring] = useState<BotMonitoringData | null>(null);

    useEffect(() => {
        const fetchSystemStats = async () => {
            const response = await fetch('/api/system/stats');
            const data = await response.json();
            setSystemStats(data.data);
        };

        fetchSystemStats();
        const interval = setInterval(fetchSystemStats, 30000);

        return () => clearInterval(interval);
    }, []);

    // Функция для получения данных мониторинга
    const fetchBotMonitoring = async () => {
        try {
            const response = await fetch('http://localhost:3002/api/bot/monitoring');
            const data = await response.json();
            if (data.success && data.monitoring) {
                setBotMonitoring(data.monitoring);
            }
        } catch (error) {
            console.error('Error fetching bot monitoring:', error);
            // Установите fallback данные для демонстрации
            setBotMonitoring({
                responseTime: { value: 42, status: 'optimal', label: 'Response Time', unit: 'ms' },
                lastHeartbeat: { value: '2 seconds ago', status: 'optimal', label: 'Last Heartbeat', unit: '' },
                apiLatency: { value: 128, status: 'normal', label: 'API Latency', unit: 'ms' },
                overallHealth: 'healthy',
                guilds: 1,
                commandsTracked: 0
            });
        }
    };

    // Обновляем каждые 10 секунд
    useEffect(() => {
        fetchBotMonitoring();
        const interval = setInterval(fetchBotMonitoring, 10000);
        return () => clearInterval(interval);
    }, []);

    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

    // Загрузка данных системы
    const loadSystemData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            // ПРАВИЛЬНЫЕ ЭНДПОИНТЫ:

            // 1. Статус бота - через веб-сервер
            const botResponse = await fetch('/api/bot/status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (botResponse.ok) {
                const botData = await botResponse.json();
                console.log('Bot status from web server:', botData);
                setBotStatus(botData);
            } else {
                console.error('Failed to fetch bot status:', botResponse.status);
            }

            // 2. Системная статистика - через веб-сервер
            const statsResponse = await fetch('/api/system-stats', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                console.log('System stats from web server:', statsData);
                setSystemStats(statsData);
            } else {
                console.error('Failed to fetch system stats:', statsResponse.status);
            }

            // 3. Прямой запрос к боту для отладки (уберите потом)
            const directBotResponse = await fetch('http://localhost:3002/discord/bot-status');
            if (directBotResponse.ok) {
                const directData = await directBotResponse.json();
                console.log('Direct bot status:', directData);
            }

        } catch (error) {
            console.error('Error loading system data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Загрузка системных логов
    const loadSystemLogs = async (token: string) => {
        try {
            const API_BASE = 'http://localhost:3002';
            // Здесь можно добавить эндпоинт для системных логов
            // Пока используем моковые данные
            setLogs([
                { time: "2m ago", type: "success", message: "Bot started successfully", user: "System" },
                { time: "5m ago", type: "error", message: "/ban failed — Missing Permissions", user: "@Admin" },
                { time: "12m ago", type: "warn", message: "Rate limit warning — /ping", user: "@Moderator" },
                { time: "1h ago", type: "success", message: "Auto-moderation rule triggered", user: "System" },
                { time: "2h ago", type: "info", message: "Scheduled backup completed", user: "System" }
            ]);
        } catch (error) {
            console.error('Error loading logs:', error);
        }
    };

    // Загрузка списка серверов
    const loadGuilds = async (token: string) => {
        try {
            // Моковые данные серверов
            setGuilds([
                { id: "123456789", name: "Main Server", members: 1542, enabled: true, icon: "🏠" },
                { id: "987654321", name: "Test Server", members: 243, enabled: false, icon: "🧪" },
                { id: "543216789", name: "Gaming Hub", members: 3124, enabled: true, icon: "🎮" },
                { id: "789123456", name: "Community", members: 876, enabled: true, icon: "👥" }
            ]);
        } catch (error) {
            console.error('Error loading guilds:', error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await loadSystemData();
        setTimeout(() => setIsRefreshing(false), 1000);
    };


    useEffect(() => {
        loadSystemData();
    }, []);

    const toggleGuildStatus = (id: string) => {
        setGuilds(prev =>
            prev.map(g =>
                g.id === id ? { ...g, enabled: !g.enabled } : g
            )
        );
    };

    const getLogTypeClass = (type: string) => {
        switch (type) {
            case 'error': return styles.error;
            case 'warn': return styles.warn;
            case 'info': return styles.info;
            case 'success': return styles.success;
            default: return '';
        }
    };

    const getLogIcon = (type: string) => {
        switch (type) {
            case 'error': return <XCircle size={16} />;
            case 'warn': return <AlertTriangle size={16} />;
            case 'info': return <MessageCircle size={16} />;
            case 'success': return <CheckCircle size={16} />;
            default: return <MessageCircle size={16} />;
        }
    };

    if (loading) {
        return (
            <div className={`${styles.layout} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Sidebars
                    onCollapseChange={setSidebarCollapsed}
                    collapsed={sidebarCollapsed}
                />
                <div className={styles.overviewPage}>
                    <div className={styles.loading}>
                        <RefreshCw size={32} className={styles.spinner} />
                        <p>Loading system overview...</p>
                    </div>
                </div>
            </div>
        );
    }

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
                                {botStatus?.serverName && ` • ${botStatus.serverName}`}
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            <div className={styles.timeFilters}>
                                {['24h', '7d', '30d'].map((range) => (
                                    <button
                                        key={range}
                                        className={`${styles.timeFilter} ${activeTimeRange === range ? styles.active : ''}`}
                                        onClick={() => setActiveTimeRange(range as any)}
                                    >
                                        <div className={styles.timeRangeContent}>
                                            <div className={styles.timeRangeLabel}>{range}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={handleRefresh}
                                disabled={isRefreshing}
                                className={styles.refreshBtn}
                            >
                                <RefreshCw size={16} className={isRefreshing ? styles.loading : ''} />
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
                        <h3 className={styles.metricValue}>
                            {botStatus?.totalServers || systemStats?.totalServers || 0}
                        </h3>
                        <p className={styles.metricLabel}>
                            Active Servers
                        </p>
                        <div className={styles.metricChange}>
                            <span className={botStatus?.isOnServer ? styles.changePositive : styles.changeNeutral}>
                                {botStatus?.isOnServer ? '+1' : '0'}
                            </span>
                            <span className={styles.changeText}>
                                {botStatus?.isOnServer ? 'connected' : 'offline'}
                            </span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Users size={24} />
                            </div>
                            <TrendingUp size={16} className={styles.trendingUp} />
                        </div>
                        <h3 className={styles.metricValue}>
                            {systemStats?.users?.total || '0'}
                        </h3>
                        <p className={styles.metricLabel}>
                            Number of users in the system
                        </p>
                        <div className={styles.metricChange}>
                            <span className={
                                (systemStats?.users?.growthPercentage || 0) >= 0
                                    ? styles.changePositive
                                    : styles.changeNegative
                            }>
                                {(systemStats?.users?.growthPercentage || 0) >= 0 ? '+' : ''}
                                {systemStats?.users?.growthPercentage || 0}%
                            </span>
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
                        <h3 className={styles.metricValue}>
                            {systemStats?.totalCommands?.toLocaleString() || '0'}
                        </h3>
                        <p className={styles.metricLabel}>Commands Run</p>
                        <div className={styles.metricChange}>
                            <span className={styles.changePositive}>
                                +{systemStats?.commands?.today || 0} today
                            </span>
                            <span className={styles.changeText}>total</span>
                        </div>
                    </div>

                    <div className={styles.metricCard}>
                        <div className={styles.metricHeader}>
                            <div className={styles.metricIcon}>
                                <Clock size={24} />
                            </div>
                            <Heart size={16} className={styles.healthy} />
                        </div>
                        <h3 className={styles.metricValue}>
                            {systemStats?.system?.uptime ? '99.98%' : '0%'}
                        </h3>
                        <p className={styles.metricLabel}>Uptime</p>
                        <span className={
                            (systemStats?.users?.growthPercentage || 0) >= 0
                                ? styles.changePositive
                                : styles.changeNegative
                        }>
                            {(systemStats?.users?.growthPercentage || 0) >= 0 ? '+' : ''}
                            {systemStats?.users?.growthPercentage || 0}%
                        </span>
                    </div>
                </section>

                {/* System Status & Performance */}
                <div className={styles.contentGrid}>
                    {/* Bot Status */}
                    <div className={styles.statusCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Network size={20} /> Bot Status
                            </h3>
                            <div className={styles.statusIndicator}>
                                <div className={`${styles.statusDot} ${botStatus?.isOnServer ? styles.online : styles.offline}`}></div>
                                {botStatus?.isOnServer ? 'Online' : 'Offline'}
                            </div>
                        </div>

                        {/* Динамические данные вместо статических */}
                        {botMonitoring ? (
                            <div className={styles.statusGrid}>
                                <div className={styles.statusItem}>
                                    <div className={styles.statusLabel}>Response Time</div>
                                    <div className={styles.statusValue}>{botMonitoring.responseTime.value} ms</div>
                                    <div className={`${styles.statusSubtext} ${botMonitoring.responseTime.status === 'optimal' ? styles.optimal :
                                        botMonitoring.responseTime.status === 'normal' ? styles.normal : styles.slow
                                        }`}>
                                        {botMonitoring.responseTime.status.charAt(0).toUpperCase() + botMonitoring.responseTime.status.slice(1)}
                                    </div>
                                </div>
                                <div className={styles.statusItem}>
                                    <div className={styles.statusLabel}>Last Heartbeat</div>
                                    <div className={styles.statusValue}>
                                        {typeof botMonitoring.lastHeartbeat.value === 'string' && botMonitoring.lastHeartbeat.value.includes('seconds') ?
                                            botMonitoring.lastHeartbeat.value.replace(' seconds ago', 's') :
                                            String(botMonitoring.lastHeartbeat.value)}
                                    </div>
                                    <div className={`${styles.statusSubtext} ${botMonitoring.lastHeartbeat.status === 'optimal' ? styles.optimal : styles.warning
                                        }`}>
                                        {botMonitoring.lastHeartbeat.status === 'optimal' ? 'Active' : 'Check'}
                                    </div>
                                </div>
                                <div className={styles.statusItem}>
                                    <div className={styles.statusLabel}>API Latency</div>
                                    <div className={styles.statusValue}>{botMonitoring.apiLatency.value} ms</div>
                                    <div className={`${styles.statusSubtext} ${botMonitoring.apiLatency.status === 'optimal' ? styles.optimal :
                                        botMonitoring.apiLatency.status === 'normal' ? styles.normal : styles.slow
                                        }`}>
                                        {botMonitoring.apiLatency.status.charAt(0).toUpperCase() + botMonitoring.apiLatency.status.slice(1)}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.loading}>Loading monitoring data...</div>
                        )}
                    </div>

                    {/* System Performance */}
                    <div className={styles.performanceCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Cpu size={20} /> System Performance
                                {systemStats?.isRealData && (
                                    <span className={styles.realDataBadge}>LIVE DATA</span>
                                )}
                            </h3>
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
                                        style={{ width: `${systemStats?.performance?.cpu || 0}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{systemStats?.performance?.cpu || 0}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <FaMemory size={16} />
                                    <span>Memory</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${systemStats?.performance?.memory || 0}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{systemStats?.performance?.cpu || 0}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Network size={16} />
                                    <span>Network</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${systemStats?.performance?.network || 0}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{systemStats?.performance?.network || 0}%</div>
                            </div>
                            <div className={styles.performanceItem}>
                                <div className={styles.performanceHeader}>
                                    <Server size={16} />
                                    <span>Storage</span>
                                </div>
                                <div className={styles.performanceBar}>
                                    <div
                                        className={styles.performanceFill}
                                        style={{ width: `${systemStats?.performance?.storage || 0}%` }}
                                    ></div>
                                </div>
                                <div className={styles.performanceValue}>{systemStats?.performance?.storage || 0}%</div>
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
                                <div key={index} className={`${styles.logItem} ${getLogTypeClass(log.type)}`}>
                                    <div className={styles.logIcon}>
                                        {getLogIcon(log.type)}
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
                            <Server size={20} />
                            <span>Invite Bot</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <BarChart3 size={20} />
                            <span>View Analytics</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <Shield size={20} />
                            <span>Security Settings</span>
                        </button>
                        <button className={styles.actionBtn}>
                            <Database size={20} />
                            <span>Backup Data</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}