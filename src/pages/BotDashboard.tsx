// BotDashboard.tsx
import React, { useState } from "react";
import "../components/CSS/BotDashboard.css";
import "../components/CSS/BotStatusSelect.css"; // твой CSS из LanguageSelect.css
import Sidebars from "@/components/Saidbar";
import { FaSyncAlt, FaYoutube, FaTwitch, FaLink } from "react-icons/fa";
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

type Status = "online" | "idle" | "dnd" | "offline";

export default function BotDashboard() {
    const [status, setStatus] = useState<Status>("online");
    const [open, setOpen] = useState(false);

    const statuses = [
        { value: "online", label: "🟢 Online" },
        { value: "idle", label: "🌙 Idle" },
        { value: "dnd", label: "⛔ Do Not Disturb" },
        { value: "offline", label: "⚫ Offline" },
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
    ];

    const commandData = [
        { command: "/help", count: 45 },
        { command: "/stats", count: 32 },
        { command: "/ping", count: 60 },
        { command: "/play", count: 25 },
    ];

    return (
        <div className="mp-layout">
            <Sidebars />
            <main className="mp-main bot-dashboard">
                <header className="mp-header">
                    <h1 className="mp-header__title">Bot Dashboard</h1>
                    <p className="mp-header__subtitle">
                        Manage your bot and view real-time statistics
                    </p>
                </header>

                <div className="bot-grid">
                    {/* Status */}

                    <div className="bot-card">
                        <h2 className="bot-card__title">Integrations</h2>

                        <div className="bot-action-youtube">
                            <button onClick={() => alert("Connecting YouTube API")}>
                                <span className="icon-container">
                                    <FaYoutube />
                                </span>
                                <p className="p-youtube">Connect YouTube</p>
                            </button>
                        </div>

                        <div className="bot-action-twitch">
                            <button onClick={() => alert("Connecting Twitch")}>
                                <span className="icon-container">
                                    <FaTwitch />
                                </span>
                                <p className="p-twitch">Connect Twitch</p>
                            </button>
                        </div>

                        <div className="bot-action-webhooks">
                            <button onClick={() => alert("Configuring webhooks")}>
                                <span className="icon-container">
                                    <FaLink />
                                </span>
                                <p className="p-webhooks">Configure Webhooks</p>
                            </button>
                        </div>
                    </div>


                    {/* Commands */}
                    <div className="bot-card">
                        <h2 className="bot-card__title">Commands</h2>
                        <ul className="bot-list">
                            <li>/help — Show help</li>
                            <li>/stats — Show statistics</li>
                            <li>/ping — Check response time</li>
                        </ul>
                        <button
                            className="bot-action add-command"
                            onClick={() => alert("Command adding window")}
                        >
                            Add Command
                        </button>
                    </div>

                    {/* Integrations */}

                    <div className="bot-card">
                        <h2 className="bot-card__title">Status</h2>
                        <p className="bot-card__value">Select bot status</p>
                        <div className={`glass-dropdown ${open ? "open" : ""}`}>
                            <div
                                className="glass-selected"
                                onClick={() => setOpen(!open)}
                                tabIndex={0}
                            >
                                <span>{statuses.find((s) => s.value === status)?.label}</span>
                                <span className="arrow" />
                            </div>
                            {open && (
                                <ul className="glass-options">
                                    {statuses.map((s) => (
                                        <li
                                            key={s.value}
                                            className={`${s.value} ${status === s.value ? "active" : ""
                                                }`}
                                            onClick={() => {
                                                setStatus(s.value as Status);
                                                setOpen(false);
                                            }}
                                        >
                                            {s.label}
                                            {status === s.value && (
                                                <span className="opt-check">✔</span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Chart — Online Users */}
                    <div className="bot-card">
                        <h2 className="bot-card__title">Online Users</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={onlineData}>
                                <Line
                                    type="monotone"
                                    dataKey="users"
                                    stroke="#00ffaa"
                                    strokeWidth={2}
                                />
                                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                                <XAxis dataKey="hour" />
                                <YAxis />
                                <Tooltip />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Chart — Command Calls */}
                    <div className="bot-card">
                        <h2 className="bot-card__title">Command Calls</h2>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={commandData}>
                                <Bar dataKey="count" fill="#00ffaa" />
                                <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                                <XAxis dataKey="command" />
                                <YAxis />
                                <Tooltip />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Restart button */}
                <div className="bot-restart-container">
                    <button
                        className="bot-action restart"
                        onClick={() => alert("Bot restarted!")}
                    >
                        <FaSyncAlt className="restart-icon" />
                        Restart Bot
                    </button>
                </div>
            </main>
        </div>
    );
}
