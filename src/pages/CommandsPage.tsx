import React, { useState } from "react";
import Sidebars from "@/components/Saidbar.js";
import {
    Search,
    Filter,
    Plus,
    Download,
    Upload,
    RefreshCw,
    Zap,
    Shield,
    Users,
    MessageCircle,
    BarChart3,
    Eye,
    Edit,
    Trash2,
    Play,
    StopCircle,
    Copy,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertTriangle
} from "lucide-react";
import styles from "../module_pages/CommandsPage.module.scss";

export type CommandParam = {
    id: string;
    name: string;
    description: string;
    type: 'string' | 'number' | 'user' | 'channel' | 'role';
    required: boolean;
};

export type DiscordCommand = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    usageCount: number;
    lastUsed: string;
    category: string;
    params: CommandParam[];
    access: string[];
    responseTime: number;
    successRate: number;
};

export default function CommandsPage() {
    const [commands, setCommands] = useState<DiscordCommand[]>([
        {
            id: "1",
            name: "ping",
            description: "Check bot latency and response time",
            enabled: true,
            usageCount: 1250,
            lastUsed: "2 minutes ago",
            category: "Utility",
            params: [],
            access: ["@everyone"],
            responseTime: 45,
            successRate: 100
        },
        {
            id: "2",
            name: "ban",
            description: "Ban a user from the server",
            enabled: false,
            usageCount: 45,
            lastUsed: "1 day ago",
            category: "Moderation",
            params: [
                { id: "p1", name: "user", description: "User to ban", type: "user", required: true },
                { id: "p2", name: "reason", description: "Reason for ban", type: "string", required: false },
            ],
            access: ["admin", "moderator"],
            responseTime: 120,
            successRate: 98
        },
        {
            id: "3",
            name: "mute",
            description: "Temporarily mute a user",
            enabled: true,
            usageCount: 320,
            lastUsed: "5 hours ago",
            category: "Moderation",
            params: [
                { id: "p1", name: "user", description: "User to mute", type: "user", required: true },
                { id: "p2", name: "duration", description: "Mute duration", type: "string", required: true },
                { id: "p3", name: "reason", description: "Reason for mute", type: "string", required: false },
            ],
            access: ["admin", "moderator"],
            responseTime: 85,
            successRate: 95
        },
        {
            id: "4",
            name: "clear",
            description: "Clear messages from a channel",
            enabled: true,
            usageCount: 890,
            lastUsed: "30 minutes ago",
            category: "Moderation",
            params: [
                { id: "p1", name: "amount", description: "Number of messages to clear", type: "number", required: true },
            ],
            access: ["admin", "moderator"],
            responseTime: 210,
            successRate: 92
        },
        {
            id: "5",
            name: "userinfo",
            description: "Get information about a user",
            enabled: true,
            usageCount: 560,
            lastUsed: "1 hour ago",
            category: "Utility",
            params: [
                { id: "p1", name: "user", description: "User to inspect", type: "user", required: false },
            ],
            access: ["@everyone"],
            responseTime: 65,
            successRate: 99
        }
    ]);

    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [selectedCommands, setSelectedCommands] = useState<string[]>([]);

    // Filter commands
    const filteredCommands = commands.filter(command => {
        const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            command.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" ||
            (statusFilter === "enabled" && command.enabled) ||
            (statusFilter === "disabled" && !command.enabled);
        const matchesCategory = categoryFilter === "all" || command.category === categoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
    });

    // Statistics
    const stats = {
        total: commands.length,
        enabled: commands.filter(cmd => cmd.enabled).length,
        disabled: commands.filter(cmd => !cmd.enabled).length,
        totalUsage: commands.reduce((sum, cmd) => sum + cmd.usageCount, 0),
        avgResponseTime: Math.round(commands.reduce((sum, cmd) => sum + cmd.responseTime, 0) / commands.length),
        successRate: Math.round(commands.reduce((sum, cmd) => sum + cmd.successRate, 0) / commands.length)
    };

    const categories = [...new Set(commands.map(cmd => cmd.category))];

    const handleToggle = (id: string, enabled: boolean) => {
        setCommands(prev =>
            prev.map((cmd) => (cmd.id === id ? { ...cmd, enabled } : cmd))
        );
    };

    const handleDelete = (id: string) => {
        if (!window.confirm("Are you sure you want to delete this command?")) return;
        setCommands(prev => prev.filter((cmd) => cmd.id !== id));
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsRefreshing(false);
    };

    const handleExport = () => {
        const dataStr = JSON.stringify(commands, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'discord-commands-backup.json';
        link.click();
        URL.revokeObjectURL(url);
    };

    const handleSelectCommand = (commandId: string) => {
        setSelectedCommands(prev =>
            prev.includes(commandId)
                ? prev.filter(id => id !== commandId)
                : [...prev, commandId]
        );
    };

    const handleSelectAll = () => {
        setSelectedCommands(
            selectedCommands.length === filteredCommands.length
                ? []
                : filteredCommands.map(cmd => cmd.id)
        );
    };

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Moderation': return <Shield size={16} />;
            case 'Utility': return <Zap size={16} />;
            case 'Fun': return <MessageCircle size={16} />;
            default: return <Zap size={16} />;
        }
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'Moderation': return '#ef4444';
            case 'Utility': return '#3b82f6';
            case 'Fun': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    return (
        <div className={styles.layout}>
            <Sidebars />

            <main className={`${styles.commandsPage} ${isRefreshing ? styles.updating : ''}`}>
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerText}>
                            <h1>Command Management</h1>
                            <span className={styles.subtitle}>
                                Manage and monitor bot commands
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.primaryBtn}>
                                <Plus size={16} />
                                New Command
                            </button>
                            <button className={styles.secondaryBtn}>
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stats Overview */}
                <section className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Zap size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stats.total}</h3>
                            <p>Total Commands</p>
                            <div className={styles.statChange}>
                                <span className={styles.changePositive}>+2 this week</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <CheckCircle size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stats.enabled}</h3>
                            <p>Enabled</p>
                            <div className={styles.statChange}>
                                <span className={styles.changePositive}>Active</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <BarChart3 size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stats.totalUsage.toLocaleString()}</h3>
                            <p>Total Usage</p>
                            <div className={styles.statChange}>
                                <span className={styles.changePositive}>+12% today</span>
                            </div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <AlertTriangle size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{stats.disabled}</h3>
                            <p>Disabled</p>
                            <div className={styles.statChange}>
                                <span className={styles.changeNeutral}>Needs review</span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Quick Actions */}
                <div className={styles.quickActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={16} className={isRefreshing ? styles.loading : ''} />
                        Refresh Data
                    </button>
                    <button className={styles.actionBtn} onClick={handleExport}>
                        <Download size={16} />
                        Export Commands
                    </button>
                    <button className={styles.actionBtn}>
                        <Upload size={16} />
                        Import Commands
                    </button>
                    <button className={styles.actionBtn}>
                        <Play size={16} />
                        Test All
                    </button>
                </div>

                {/* Filters and Search */}
                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search commands by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filters}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Status</option>
                            <option value="enabled">Enabled</option>
                            <option value="disabled">Disabled</option>
                        </select>

                        <select
                            value={categoryFilter}
                            onChange={(e) => setCategoryFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Categories</option>
                            {categories.map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>

                        <button className={styles.filterBtn}>
                            <Filter size={16} />
                            More Filters
                        </button>
                    </div>
                </div>

                {/* Commands Table */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.tableInfo}>
                            <span>
                                Showing {filteredCommands.length} of {commands.length} commands
                            </span>
                            {selectedCommands.length > 0 && (
                                <span className={styles.selectedCount}>
                                    {selectedCommands.length} selected
                                </span>
                            )}
                        </div>

                        <div className={styles.tableActions}>
                            {selectedCommands.length > 0 && (
                                <>
                                    <button className={styles.batchBtn}>
                                        <Play size={16} />
                                        Enable
                                    </button>
                                    <button className={styles.batchBtn}>
                                        <StopCircle size={16} />
                                        Disable
                                    </button>
                                    <button className={styles.batchBtn}>
                                        <Copy size={16} />
                                        Duplicate
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={styles.table}>
                        <div className={styles.tableRow + ' ' + styles.tableHeaderRow}>
                            <div className={styles.tableCell + ' ' + styles.checkboxCell}>
                                <input
                                    type="checkbox"
                                    checked={selectedCommands.length === filteredCommands.length && filteredCommands.length > 0}
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </div>
                            <div className={styles.tableCell + ' ' + styles.commandCell}>Command</div>
                            <div className={styles.tableCell + ' ' + styles.categoryCell}>Category</div>
                            <div className={styles.tableCell + ' ' + styles.usageCell}>Usage</div>
                            <div className={styles.tableCell + ' ' + styles.performanceCell}>Performance</div>
                            <div className={styles.tableCell + ' ' + styles.statusCell}>Status</div>
                            <div className={styles.tableCell + ' ' + styles.actionsCell}>Actions</div>
                        </div>

                        {filteredCommands.map((command) => (
                            <div key={command.id} className={styles.tableRow + ' ' + (selectedCommands.includes(command.id) ? styles.selected : '')}>
                                <div className={styles.tableCell + ' ' + styles.checkboxCell}>
                                    <input
                                        type="checkbox"
                                        checked={selectedCommands.includes(command.id)}
                                        onChange={() => handleSelectCommand(command.id)}
                                        className={styles.checkbox}
                                    />
                                </div>

                                <div className={styles.tableCell + ' ' + styles.commandCell}>
                                    <div className={styles.commandInfo}>
                                        <div className={styles.commandIcon}>
                                            <Zap size={20} />
                                        </div>
                                        <div className={styles.commandDetails}>
                                            <div className={styles.commandName}>
                                                /{command.name}
                                            </div>
                                            <div className={styles.commandDescription}>
                                                {command.description}
                                            </div>
                                            <div className={styles.commandParams}>
                                                {command.params.length > 0 ? (
                                                    <span>{command.params.length} parameter{command.params.length !== 1 ? 's' : ''}</span>
                                                ) : (
                                                    <span>No parameters</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.categoryCell}>
                                    <span
                                        className={styles.categoryBadge}
                                        style={{ backgroundColor: getCategoryColor(command.category) }}
                                    >
                                        {getCategoryIcon(command.category)}
                                        {command.category}
                                    </span>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.usageCell}>
                                    <div className={styles.usageInfo}>
                                        <div className={styles.usageCount}>
                                            {command.usageCount.toLocaleString()}
                                        </div>
                                        <div className={styles.lastUsed}>
                                            {command.lastUsed}
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.performanceCell}>
                                    <div className={styles.performanceInfo}>
                                        <div className={styles.responseTime}>
                                            {command.responseTime}ms
                                        </div>
                                        <div className={styles.successRate}>
                                            <div className={styles.rateBar}>
                                                <div
                                                    className={styles.rateFill}
                                                    style={{ width: `${command.successRate}%` }}
                                                ></div>
                                            </div>
                                            <span>{command.successRate}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.statusCell}>
                                    <label className={styles.toggleSwitch}>
                                        <input
                                            type="checkbox"
                                            checked={command.enabled}
                                            onChange={(e) => handleToggle(command.id, e.target.checked)}
                                        />
                                        <span className={styles.slider}></span>
                                    </label>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.actionsCell}>
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => console.log('View', command.id)}
                                            title="View Details"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => console.log('Edit', command.id)}
                                            title="Edit Command"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => console.log('Test', command.id)}
                                            title="Test Command"
                                        >
                                            <Play size={16} />
                                        </button>
                                        <button
                                            className={styles.iconBtn + ' ' + styles.danger}
                                            onClick={() => handleDelete(command.id)}
                                            title="Delete Command"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {filteredCommands.length === 0 && (
                        <div className={styles.emptyState}>
                            <Zap size={48} className={styles.emptyStateIcon} />
                            <div className={styles.emptyStateTitle}>
                                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                                    ? "No commands found"
                                    : "No commands created"
                                }
                            </div>
                            <div className={styles.emptyStateDescription}>
                                {searchTerm || statusFilter !== "all" || categoryFilter !== "all"
                                    ? "Try adjusting your search or filter criteria."
                                    : "Get started by creating your first bot command."
                                }
                            </div>
                            {(searchTerm || statusFilter !== "all" || categoryFilter !== "all") ? (
                                <button
                                    className={styles.actionBtn}
                                    onClick={() => {
                                        setSearchTerm("");
                                        setStatusFilter("all");
                                        setCategoryFilter("all");
                                    }}
                                >
                                    Clear Filters
                                </button>
                            ) : (
                                <button className={styles.primaryBtn}>
                                    <Plus size={16} />
                                    Create First Command
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}