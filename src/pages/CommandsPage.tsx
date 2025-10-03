import React, { useState } from "react";
import CommandTable from "../components/CommandTable.js";
import CommandForm from "../components/CommandForm.js";
import Sidebars from "@/components/Saidbar.js";
import { FiPlus, FiSearch, FiFilter, FiRefreshCw, FiDownload, FiUpload } from "react-icons/fi";
import styles from "../module_pages/CommandsPage.module.scss";

export type CommandParam = {
    id: string;
    name: string;
    description: string;
    type: string;
    required: boolean;
};

export type DiscordCommand = {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    usageCount: number;
    params: CommandParam[];
    access: string[]; // list of role or user IDs
};

export default function CommandsPage() {
    const [commands, setCommands] = useState<DiscordCommand[]>([
        {
            id: "1",
            name: "ping",
            description: "Responds with pong",
            enabled: true,
            usageCount: 25,
            params: [],
            access: [],
        },
        {
            id: "2",
            name: "ban",
            description: "Ban a user",
            enabled: false,
            usageCount: 5,
            params: [
                { id: "p1", name: "user", description: "User to ban", type: "user", required: true },
                { id: "p2", name: "reason", description: "Reason", type: "string", required: false },
            ],
            access: ["admin"],
        },
        {
            id: "3",
            name: "mute",
            description: "Mute a user temporarily",
            enabled: true,
            usageCount: 12,
            params: [
                { id: "p1", name: "user", description: "User to mute", type: "user", required: true },
                { id: "p2", name: "duration", description: "Mute duration", type: "string", required: true },
                { id: "p3", name: "reason", description: "Reason for mute", type: "string", required: false },
            ],
            access: ["admin", "moderator"],
        },
    ]);

    const [editing, setEditing] = useState<DiscordCommand | null>(null);
    const [openForm, setOpenForm] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [isRefreshing, setIsRefreshing] = useState(false);

    // Filter commands based on search and status
    const filteredCommands = commands.filter(command => {
        const matchesSearch = command.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            command.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === "all" || 
                            (statusFilter === "enabled" && command.enabled) ||
                            (statusFilter === "disabled" && !command.enabled);
        return matchesSearch && matchesStatus;
    });

    // Calculate statistics
    const stats = {
        total: commands.length,
        enabled: commands.filter(cmd => cmd.enabled).length,
        disabled: commands.filter(cmd => !cmd.enabled).length,
        totalUsage: commands.reduce((sum, cmd) => sum + cmd.usageCount, 0)
    };

    function handleCreate() {
        setEditing(null);
        setOpenForm(true);
    }

    function handleEdit(cmd: DiscordCommand) {
        setEditing(cmd);
        setOpenForm(true);
    }

    function handleSave(command: DiscordCommand) {
        setCommands((prev) => {
            if (editing) {
                return prev.map((c) => (c.id === editing.id ? command : c));
            }
            return [...prev, { ...command, id: Date.now().toString() }];
        });
        setOpenForm(false);
        setEditing(null);
    }

    function handleToggle(id: string, enabled: boolean) {
        setCommands((prev) =>
            prev.map((cmd) => (cmd.id === id ? { ...cmd, enabled } : cmd))
        );
    }

    function handleDelete(id: string) {
        if (!window.confirm("Are you sure you want to delete this command?")) return;
        setCommands((prev) => prev.filter((cmd) => cmd.id !== id));
    }

    const handleRefresh = async () => {
        setIsRefreshing(true);
        // Simulate API call
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

    return (
        <div className={styles.layout}>
            <Sidebars />
            <div className={`${styles.commandsPage} ${isRefreshing ? styles.updating : ''}`}>
                {/* Header */}
                <div className={styles.header}>
                    <h1>Bot Command Management</h1>
                    <button className={styles.createButton} onClick={handleCreate}>
                        <FiPlus /> Create Command
                    </button>
                </div>

                {/* Statistics Overview */}
                <div className={styles.statsOverview}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statCard__value} ${styles.total}`}>
                            {stats.total}
                        </div>
                        <div className={styles.statCard__label}>Total Commands</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statCard__value} ${styles.enabled}`}>
                            {stats.enabled}
                        </div>
                        <div className={styles.statCard__label}>Enabled</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statCard__value} ${styles.disabled}`}>
                            {stats.disabled}
                        </div>
                        <div className={styles.statCard__label}>Disabled</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statCard__value}>
                            {stats.totalUsage}
                        </div>
                        <div className={styles.statCard__label}>Total Usage</div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className={styles.quickActions}>
                    <button className={`${styles.actionButton} ${styles.primary}`} onClick={handleRefresh}>
                        <FiRefreshCw className={isRefreshing ? styles.loading : ''} />
                        Refresh Data
                    </button>
                    <button className={styles.actionButton} onClick={handleExport}>
                        <FiDownload />
                        Export Commands
                    </button>
                    <button className={styles.actionButton}>
                        <FiUpload />
                        Import Commands
                    </button>
                </div>

                {/* Filter Bar */}
                <div className={styles.filterBar}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <FiSearch style={{ 
                            position: 'absolute', 
                            left: '12px', 
                            top: '50%', 
                            transform: 'translateY(-50%)', 
                            color: 'var(--text-secondary)' 
                        }} />
                        <input
                            type="text"
                            placeholder="Search commands..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                            style={{ paddingLeft: '2.5rem' }}
                        />
                    </div>
                    <select 
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">All Status</option>
                        <option value="enabled">Enabled</option>
                        <option value="disabled">Disabled</option>
                    </select>
                </div>

                {/* Commands Table */}
                {filteredCommands.length > 0 ? (
                    <CommandTable
                        commands={filteredCommands}
                        onToggle={handleToggle}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                ) : (
                    <div className={styles.emptyState}>
                        <FiSearch className={styles.emptyStateIcon} />
                        <div className={styles.emptyStateTitle}>
                            {searchTerm || statusFilter !== "all" ? "No commands found" : "No commands created"}
                        </div>
                        <div className={styles.emptyStateDescription}>
                            {searchTerm || statusFilter !== "all" 
                                ? "Try adjusting your search or filter criteria."
                                : "Get started by creating your first bot command."
                            }
                        </div>
                        {(searchTerm || statusFilter !== "all") ? (
                            <button 
                                className={styles.actionButton}
                                onClick={() => {
                                    setSearchTerm("");
                                    setStatusFilter("all");
                                }}
                            >
                                Clear Filters
                            </button>
                        ) : (
                            <button className={styles.emptyStateAction} onClick={handleCreate}>
                                <FiPlus />
                                Create First Command
                            </button>
                        )}
                    </div>
                )}

                {/* Command Form Modal */}
                {openForm && (
                    <CommandForm
                        command={editing}
                        onSave={handleSave}
                        onCancel={() => {
                            setOpenForm(false);
                            setEditing(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}