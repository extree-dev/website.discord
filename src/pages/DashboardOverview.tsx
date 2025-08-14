import React, { useState } from "react";
import Sidebars from "@/components/Saidbar";
import "../components/CSS/DashboardOverview.css";
import {
    FiTrendingUp,
    FiUsers,
    FiActivity,
    FiClock,
    FiServer,
    FiAlertTriangle,
    FiWifi
} from "react-icons/fi";

export default function DashboardOverview() {
    const [guilds, setGuilds] = useState([
        { id: "123456789", name: "Main Server", members: 1542, enabled: true },
        { id: "987654321", name: "Test Server", members: 243, enabled: false },
        { id: "543216789", name: "Gaming Hub", members: 3124, enabled: true }
    ]);

    const [logs] = useState([
        { time: "5m ago", type: "error", message: "/ban failed — Missing Permissions", user: "@Admin" },
        { time: "12m ago", type: "warn", message: "Rate limit warning — /ping", user: "@Moderator" },
        { time: "1h ago", type: "error", message: "/kick failed — API Timeout", user: "@ModJane" }
    ]);

    const toggleGuildStatus = (id: string) => {
        setGuilds(prev =>
            prev.map(g =>
                g.id === id ? { ...g, enabled: !g.enabled } : g
            )
        );
    };

    return (
        <div className="mp-layout">
            <Sidebars />
            <div className="overview-page">
                <div className="overview-header">
                    <h1>Overview</h1>
                    <span className="overview-subtitle">
                        Monitor your bot’s performance and usage statistics
                    </span>
                </div>

                {/* Основная статистика */}
                <div className="overview-grid">
                    <div className="overview-card">
                        <FiTrendingUp className="card-icon" />
                        <h2>Active Servers</h2>
                        <p>245</p>
                    </div>
                    <div className="overview-card">
                        <FiUsers className="card-icon" />
                        <h2>Users Reached</h2>
                        <p>18,320</p>
                    </div>
                    <div className="overview-card">
                        <FiActivity className="card-icon" />
                        <h2>Commands Run</h2>
                        <p>92,440</p>
                    </div>
                    <div className="overview-card">
                        <FiClock className="card-icon" />
                        <h2>Uptime</h2>
                        <p>99.98%</p>
                    </div>
                </div>

                {/* Статус бота */}
                <div className="status-container">
                    <div className="overview-section bot-status">
                        <h2><FiWifi /> Bot Status</h2>
                        <div className="status-container">
                            <div className="status-column">
                                <p>Status</p>
                                <span>
                                    <span className="status-dot online"></span> Online
                                </span>
                            </div>
                            <div className="status-column">
                                <p>Ping</p>
                                <span className="status-value">42 ms</span>
                            </div>
                            <div className="status-column">
                                <p>Last heartbeat</p>
                                <span className="status-value">2m ago</span>
                            </div>
                        </div>
                    </div>

                    <div className="overview-section version-info">
                        <h2><FiServer /> Version & Uptime</h2>
                        <div className="status-container">
                            <div className="status-column">
                                <p>Bot Version</p>
                                <span className="status-value">v2.3.1 <small>(commit a1b2c3d)</small></span>
                            </div>
                            <div className="status-column">
                                <p>Server Uptime</p>
                                <span className="status-value">12 days 4 hours</span>
                            </div>
                            <div className="status-column">
                                <p>Last Deploy</p>
                                <span className="status-value">2025-08-10 14:32</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Подключённые гильдии */}
                <div className="overview-section">
                    <h2>Connected Guilds</h2>
                    <table className="guilds-table">
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
                                    <td>{g.id}</td>
                                    <td>{g.members}</td>
                                    <td>
                                        <button
                                            className={`guild-toggle ${g.enabled ? "on" : "off"}`}
                                            onClick={() => toggleGuildStatus(g.id)}
                                        >
                                            {g.enabled ? "Enabled" : "Disabled"}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Логи ошибок */}
                <div className="overview-section">
                    <h2><FiAlertTriangle /> Bot Logs</h2>
                    <ul className="logs-list">
                        {logs.map((log, i) => (
                            <li key={i} className={log.type}>
                                <span className="time">{log.time}</span> — {log.message} by {log.user}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
