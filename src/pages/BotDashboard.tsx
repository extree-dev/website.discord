import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import {
    RefreshCw,
    Play,
    StopCircle,
    Settings,
    Shield,
    Zap,
    Database,
    Network,
    Cpu,
    HardDrive,
    Bot,
    Link,
    BarChart3,
    Activity,
    Server,
    Globe,
    Clock,
    Users,
    MessageCircle,
    Code,
    AlertTriangle,
    CheckCircle,
    XCircle
} from "lucide-react";
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
    PieChart,
    Pie,
    Cell,
    PieLabelRenderProps // Добавляем импорт типа
} from "recharts";
import styles from "../module_pages/BotDashboard.module.scss";

type Status = "online" | "idle" | "dnd" | "offline";

// Используем правильный тип для данных Pie chart
interface PieDataItem {
    name: string;
    value: number;
    [key: string]: any; // Добавляем индексную сигнатуру
}

// Правильная типизация для функции label
const renderCustomizedLabel = (props: PieLabelRenderProps) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;

    // Проверяем что percent существует и является числом
    if (percent === undefined || percent === null || typeof percent !== 'number') {
        return null;
    }

    return `${name} ${(percent * 100).toFixed(0)}%`;
};

export default function BotDashboard() {
    const [status, setStatus] = useState<Status>("online");
    const [isRestarting, setIsRestarting] = useState(false);
    const [selectedIntegration, setSelectedIntegration] = useState<string | null>(null);

    const statuses = [
        { value: "online", label: "Online", description: "Bot is fully operational", color: "#10b981" },
        { value: "idle", label: "Idle", description: "Bot is online but inactive", color: "#f59e0b" },
        { value: "dnd", label: "Do Not Disturb", description: "Bot is busy or in maintenance", color: "#ef4444" },
        { value: "offline", label: "Offline", description: "Bot is completely offline", color: "#6b7280" },
    ];

    // Performance metrics
    const performanceData = {
        cpu: 24,
        memory: 68,
        network: 45,
        storage: 82
    };

    // Online users data
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

    // Command usage data
    const commandData = [
        { command: "/help", count: 45, category: "Utility" },
        { command: "/stats", count: 32, category: "Utility" },
        { command: "/ping", count: 60, category: "Utility" },
        { command: "/play", count: 25, category: "Music" },
        { command: "/ban", count: 18, category: "Moderation" },
        { command: "/mute", count: 22, category: "Moderation" },
    ];

    // Server distribution data - используем правильный тип
    const serverData: PieDataItem[] = [
        { name: "Gaming", value: 35 },
        { name: "Community", value: 25 },
        { name: "Education", value: 20 },
        { name: "Other", value: 20 },
    ];

    const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b'];

    const integrations = [
        {
            id: "youtube",
            name: "YouTube",
            description: "Live stream notifications and updates",
            connected: true,
            icon: "▶️",
            color: "#ff0000"
        },
        {
            id: "twitch",
            name: "Twitch",
            description: "Stream alerts and chat integration",
            connected: false,
            icon: "📺",
            color: "#9146ff"
        },
        {
            id: "webhooks",
            name: "Webhooks",
            description: "Custom integrations and automation",
            connected: true,
            icon: "🔗",
            color: "#3b82f6"
        },
        {
            id: "api",
            name: "API",
            description: "Developer API and endpoints",
            connected: true,
            icon: "⚡",
            color: "#10b981"
        }
    ];

    const handleRestart = async () => {
        setIsRestarting(true);
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsRestarting(false);
    };

    const currentStatus = statuses.find(s => s.value === status);

    const quickStats = [
        { label: "Servers", value: "245", change: "+12", trend: "up" },
        { label: "Users", value: "18.3K", change: "+2.1%", trend: "up" },
        { label: "Uptime", value: "99.8%", change: "Stable", trend: "neutral" },
        { label: "Response Time", value: "42ms", change: "-5ms", trend: "up" },
        { label: "Commands Today", value: "1.2K", change: "+15%", trend: "up" },
        { label: "Memory Usage", value: "64%", change: "+8%", trend: "down" },
    ];

    return (
        <div className={styles.layout}>
            <Sidebars />

            <main className={styles.botDashboard}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerText}>
                            <h1>Bot Control Panel</h1>
                            <span className={styles.subtitle}>
                                Monitor performance and manage bot settings
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            <button
                                className={styles.primaryBtn}
                                onClick={() => console.log('Open settings')}
                            >
                                <Settings size={16} />
                                Settings
                            </button>
                        </div>
                    </div>
                </header>

                {/* Status and Quick Stats */}
                <section className={styles.statusSection}>
                    <div className={styles.statusCard}>
                        <div className={styles.statusHeader}>
                            <div className={styles.statusInfo}>
                                <div
                                    className={styles.statusIndicator}
                                    style={{ backgroundColor: currentStatus?.color }}
                                ></div>
                                <div>
                                    <h3>Bot Status</h3>
                                    <p>{currentStatus?.description}</p>
                                </div>
                            </div>
                            <div className={styles.statusActions}>
                                {statuses.map((s) => (
                                    <button
                                        key={s.value}
                                        className={`${styles.statusBtn} ${status === s.value ? styles.active : ''}`}
                                        onClick={() => setStatus(s.value as Status)}
                                        style={{ borderColor: s.color }}
                                    >
                                        {s.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className={styles.quickStats}>
                        {quickStats.map((stat, index) => (
                            <div key={index} className={styles.quickStat}>
                                <div className={styles.statValue}>{stat.value}</div>
                                <div className={styles.statLabel}>{stat.label}</div>
                                <div className={`${styles.statChange} ${styles[stat.trend]}`}>
                                    {stat.change}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Performance Metrics */}
                <section className={styles.performanceSection}>
                    <h2 className={styles.sectionTitle}>System Performance</h2>
                    <div className={styles.performanceGrid}>
                        <div className={styles.performanceCard}>
                            <div className={styles.performanceHeader}>
                                <Cpu size={20} />
                                <span>CPU Usage</span>
                            </div>
                            <div className={styles.performanceBar}>
                                <div
                                    className={styles.performanceFill}
                                    style={{ width: `${performanceData.cpu}%` }}
                                ></div>
                            </div>
                            <div className={styles.performanceValue}>{performanceData.cpu}%</div>
                        </div>

                        <div className={styles.performanceCard}>
                            <div className={styles.performanceHeader}>
                                <HardDrive size={20} />
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

                        <div className={styles.performanceCard}>
                            <div className={styles.performanceHeader}>
                                <Network size={20} />
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

                        <div className={styles.performanceCard}>
                            <div className={styles.performanceHeader}>
                                <Database size={20} />
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
                </section>

                {/* Charts Grid */}
                <div className={styles.chartsGrid}>
                    {/* Online Users Chart */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Users size={20} />
                                Online Users (24h)
                            </h3>
                            <div className={styles.cardActions}>
                                <button className={styles.iconBtn}>
                                    <BarChart3 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={200}>
                                <LineChart data={onlineData}>
                                    <Line
                                        type="monotone"
                                        dataKey="users"
                                        stroke="#6366f1"
                                        strokeWidth={2}
                                        dot={{ fill: '#6366f1', strokeWidth: 2 }}
                                    />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="hour" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(0, 0, 0, 0.8)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Command Usage Chart */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <MessageCircle size={20} />
                                Command Usage
                            </h3>
                            <div className={styles.cardActions}>
                                <button className={styles.iconBtn}>
                                    <Activity size={16} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={commandData}>
                                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="command" stroke="#888" />
                                    <YAxis stroke="#888" />
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(0, 0, 0, 0.8)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Server Distribution */}
                    <div className={styles.chartCard}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>
                                <Globe size={20} />
                                Server Distribution
                            </h3>
                            <div className={styles.cardActions}>
                                <button className={styles.iconBtn}>
                                    <Server size={16} />
                                </button>
                            </div>
                        </div>
                        <div className={styles.chartContainer}>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={serverData}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                        label={renderCustomizedLabel}
                                    >
                                        {serverData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            background: 'rgba(0, 0, 0, 0.8)',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '8px'
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Integrations */}
                <section className={styles.integrationsSection}>
                    <h2 className={styles.sectionTitle}>Integrations</h2>
                    <div className={styles.integrationsGrid}>
                        {integrations.map((integration) => (
                            <div
                                key={integration.id}
                                className={`${styles.integrationCard} ${integration.connected ? styles.connected : ''}`}
                                onClick={() => setSelectedIntegration(integration.id)}
                            >
                                <div className={styles.integrationHeader}>
                                    <div
                                        className={styles.integrationIcon}
                                        style={{ backgroundColor: integration.color }}
                                    >
                                        {integration.icon}
                                    </div>
                                    <div className={styles.integrationStatus}>
                                        {integration.connected ? (
                                            <CheckCircle size={16} className={styles.connected} />
                                        ) : (
                                            <XCircle size={16} className={styles.disconnected} />
                                        )}
                                    </div>
                                </div>
                                <div className={styles.integrationContent}>
                                    <h4>{integration.name}</h4>
                                    <p>{integration.description}</p>
                                </div>
                                <div className={styles.integrationActions}>
                                    <button className={styles.integrationBtn}>
                                        {integration.connected ? 'Configure' : 'Connect'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Actions */}
                <div className={styles.actionsSection}>
                    <button
                        className={`${styles.restartBtn} ${isRestarting ? styles.loading : ''}`}
                        onClick={handleRestart}
                        disabled={isRestarting}
                    >
                        <RefreshCw size={16} className={isRestarting ? styles.spinning : ''} />
                        {isRestarting ? 'Restarting...' : 'Restart Bot'}
                    </button>

                    <div className={styles.actionButtons}>
                        <button className={styles.secondaryBtn}>
                            <Play size={16} />
                            Start
                        </button>
                        <button className={styles.secondaryBtn}>
                            <StopCircle size={16} />
                            Stop
                        </button>
                        <button className={styles.secondaryBtn}>
                            <Code size={16} />
                            Logs
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}