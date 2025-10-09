import React, { useState, useEffect, useCallback } from "react";
import {
    Bell,
    Filter,
    Search,
    CheckCircle,
    Trash2,
    Settings,
    RefreshCw,
    AlertTriangle,
    Info,
    CheckCircle2,
    XCircle,
    MessageCircle,
    UserPlus,
    Shield,
    Zap,
    Clock,
    MoreVertical,
    Eye,
    Archive,
    Volume2,
    VolumeX,
    Send,
    Users
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/NotificationsPage.module.scss";

interface Notification {
    id: string;
    type: 'info' | 'warning' | 'success' | 'error' | 'system' | 'user';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    read: boolean;
    archived: boolean;
    createdAt: Date;
    expiresAt?: Date;
    action?: {
        label: string;
        url?: string;
        handler?: () => void;
    };
    source?: {
        type: 'system' | 'user' | 'moderation' | 'analytics';
        id?: string;
        name?: string;
    };
    metadata?: {
        userId?: string;
        reportId?: string;
        analyticsEvent?: string;
        [key: string]: any;
    };
}

interface NotificationStats {
    total: number;
    unread: number;
    read: number;
    archived: number;
    highPriority: number;
    today: number;
}

interface FilterState {
    type: string[];
    priority: string[];
    status: string[];
    dateRange: {
        start: Date | null;
        end: Date | null;
    };
}

export const NotificationsPage: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [filteredNotifications, setFilteredNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationStats>({
        total: 0,
        unread: 0,
        read: 0,
        archived: 0,
        highPriority: 0,
        today: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        type: [],
        priority: [],
        status: [],
        dateRange: { start: null, end: null }
    });
    const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const typeOptions = [
        { value: 'info', label: 'Information', color: '#3b82f6', icon: Info },
        { value: 'warning', label: 'Warning', color: '#f59e0b', icon: AlertTriangle },
        { value: 'success', label: 'Success', color: '#10b981', icon: CheckCircle2 },
        { value: 'error', label: 'Error', color: '#ef4444', icon: XCircle },
        { value: 'system', label: 'System', color: '#6b7280', icon: Settings },
        { value: 'user', label: 'User', color: '#8b5cf6', icon: Users }
    ];

    const priorityOptions = [
        { value: 'low', label: 'Low', color: '#10b981' },
        { value: 'medium', label: 'Medium', color: '#f59e0b' },
        { value: 'high', label: 'High', color: '#ef4444' },
        { value: 'critical', label: 'Critical', color: '#dc2626' }
    ];

    const statusOptions = [
        { value: 'unread', label: 'Unread' },
        { value: 'read', label: 'Read' },
        { value: 'archived', label: 'Archived' }
    ];

    const getAuthToken = useCallback((): string => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error("No authentication token found");
        }
        return token;
    }, []);

    const loadNotifications = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/notifications", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load notifications: ${response.status}`);
            }

            const notificationsData = await response.json();
            const formattedNotifications: Notification[] = notificationsData.map((notification: any) => ({
                ...notification,
                createdAt: new Date(notification.createdAt),
                expiresAt: notification.expiresAt ? new Date(notification.expiresAt) : undefined
            }));

            setNotifications(formattedNotifications);
            setFilteredNotifications(formattedNotifications);

        } catch (error) {
            console.error("Error loading notifications:", error);
            setError(error instanceof Error ? error.message : "Failed to load notifications");

            // Fallback mock data
            setNotifications(generateMockNotifications());
            setFilteredNotifications(generateMockNotifications());
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    const loadStats = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/notifications/stats", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const statsData = await response.json();
                setStats(statsData);
            }
        } catch (error) {
            console.error("Error loading stats:", error);
            // Calculate stats from local data
            const localStats = calculateStats(notifications);
            setStats(localStats);
        }
    }, [notifications, getAuthToken]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (notifications.length > 0) {
            loadStats();
            applyFilters();
        }
    }, [notifications, filters, searchTerm, loadStats]);

    const generateMockNotifications = (): Notification[] => {
        const mockNotifications: Notification[] = [];
        const types: Notification['type'][] = ['info', 'warning', 'success', 'error', 'system', 'user'];
        const priorities: Notification['priority'][] = ['low', 'medium', 'high', 'critical'];
        const sources = ['system', 'user', 'moderation', 'analytics'];

        for (let i = 1; i <= 50; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const priority = priorities[Math.floor(Math.random() * priorities.length)];
            const isRead = Math.random() > 0.6;
            const isArchived = Math.random() > 0.8;

            mockNotifications.push({
                id: `notif-${i}`,
                type,
                priority,
                title: getMockTitle(type, i),
                message: getMockMessage(type),
                read: isRead,
                archived: isArchived,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                expiresAt: Math.random() > 0.7 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined,
                action: Math.random() > 0.5 ? {
                    label: ['View Details', 'Take Action', 'Review', 'View Report'][Math.floor(Math.random() * 4)],
                    url: '/dashboard'
                } : undefined,
                source: {
                    type: sources[Math.floor(Math.random() * sources.length)] as any,
                    name: ['Security System', 'User Report', 'Analytics Engine', 'Moderation Tool'][Math.floor(Math.random() * 4)]
                },
                metadata: {
                    userId: `user-${Math.floor(Math.random() * 1000)}`,
                    reportId: Math.random() > 0.7 ? `report-${Math.floor(Math.random() * 100)}` : undefined
                }
            });
        }

        return mockNotifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    };

    const getMockTitle = (type: Notification['type'], index: number): string => {
        const titles = {
            info: [
                'System Update Available',
                'New Feature Released',
                'Weekly Analytics Report',
                'Maintenance Scheduled'
            ],
            warning: [
                'Unusual Login Activity',
                'Storage Space Running Low',
                'Suspicious Activity Detected',
                'API Rate Limit Approaching'
            ],
            success: [
                'Backup Completed Successfully',
                'User Registration Successful',
                'Payment Processed',
                'Task Completed'
            ],
            error: [
                'Backup Failed',
                'Payment Processing Error',
                'API Connection Timeout',
                'Database Sync Error'
            ],
            system: [
                'System Restart Required',
                'Security Patch Installed',
                'Performance Optimization',
                'Database Maintenance'
            ],
            user: [
                'New User Registration',
                'Password Change Request',
                'Profile Update',
                'Support Ticket Created'
            ]
        };

        const typeTitles = titles[type];
        return typeTitles[Math.floor(Math.random() * typeTitles.length)];
    };

    const getMockMessage = (type: Notification['type']): string => {
        const messages = {
            info: 'This is an informational message about recent system activities or updates that require your attention.',
            warning: 'Attention required: This notification indicates a potential issue that should be reviewed soon.',
            success: 'Operation completed successfully. All systems are functioning as expected.',
            error: 'An error has occurred that requires immediate attention. Please review the details and take appropriate action.',
            system: 'System notification regarding infrastructure changes, updates, or maintenance activities.',
            user: 'User-generated notification requiring moderator attention or review.'
        };

        return messages[type];
    };

    const calculateStats = (notificationsData: Notification[]): NotificationStats => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return {
            total: notificationsData.length,
            unread: notificationsData.filter(n => !n.read && !n.archived).length,
            read: notificationsData.filter(n => n.read && !n.archived).length,
            archived: notificationsData.filter(n => n.archived).length,
            highPriority: notificationsData.filter(n => (n.priority === 'high' || n.priority === 'critical') && !n.archived).length,
            today: notificationsData.filter(n => {
                const notifDate = new Date(n.createdAt);
                notifDate.setHours(0, 0, 0, 0);
                return notifDate.getTime() === today.getTime() && !n.archived;
            }).length
        };
    };

    const applyFilters = () => {
        let filtered = notifications;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(notification =>
                notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                notification.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                notification.source?.name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Type filter
        if (filters.type.length > 0) {
            filtered = filtered.filter(notification => filters.type.includes(notification.type));
        }

        // Priority filter
        if (filters.priority.length > 0) {
            filtered = filtered.filter(notification => filters.priority.includes(notification.priority));
        }

        // Status filter
        if (filters.status.length > 0) {
            filtered = filtered.filter(notification => {
                if (filters.status.includes('unread') && !notification.read && !notification.archived) return true;
                if (filters.status.includes('read') && notification.read && !notification.archived) return true;
                if (filters.status.includes('archived') && notification.archived) return true;
                return false;
            });
        }

        // Date range filter
        if (filters.dateRange.start && filters.dateRange.end) {
            filtered = filtered.filter(notification => {
                const notificationDate = new Date(notification.createdAt);
                return notificationDate >= filters.dateRange.start! && notificationDate <= filters.dateRange.end!;
            });
        }

        setFilteredNotifications(filtered);
    };

    const markAsRead = async (notificationId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}/read`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to mark notification as read");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                notification.id === notificationId ? { ...notification, read: true } : notification
            ));

        } catch (error) {
            console.error("Error marking notification as read:", error);
            setError("Failed to mark notification as read");
        }
    };

    const markAsUnread = async (notificationId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}/unread`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to mark notification as unread");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                notification.id === notificationId ? { ...notification, read: false } : notification
            ));

        } catch (error) {
            console.error("Error marking notification as unread:", error);
            setError("Failed to mark notification as unread");
        }
    };

    const archiveNotification = async (notificationId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}/archive`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to archive notification");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                notification.id === notificationId ? { ...notification, archived: true } : notification
            ));

        } catch (error) {
            console.error("Error archiving notification:", error);
            setError("Failed to archive notification");
        }
    };

    const unarchiveNotification = async (notificationId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}/unarchive`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to unarchive notification");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                notification.id === notificationId ? { ...notification, archived: false } : notification
            ));

        } catch (error) {
            console.error("Error unarchiving notification:", error);
            setError("Failed to unarchive notification");
        }
    };

    const deleteNotification = async (notificationId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/${notificationId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to delete notification");
            }

            // Update local state
            setNotifications(prev => prev.filter(notification => notification.id !== notificationId));

        } catch (error) {
            console.error("Error deleting notification:", error);
            setError("Failed to delete notification");
        }
    };

    const bulkMarkAsRead = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/bulk/read`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ notificationIds: selectedNotifications })
            });

            if (!response.ok) {
                throw new Error("Failed to mark notifications as read");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                selectedNotifications.includes(notification.id) ? { ...notification, read: true } : notification
            ));

            setSelectedNotifications([]);

        } catch (error) {
            console.error("Error bulk marking notifications as read:", error);
            setError("Failed to mark notifications as read");
        }
    };

    const bulkArchive = async () => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/notifications/bulk/archive`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ notificationIds: selectedNotifications })
            });

            if (!response.ok) {
                throw new Error("Failed to archive notifications");
            }

            // Update local state
            setNotifications(prev => prev.map(notification =>
                selectedNotifications.includes(notification.id) ? { ...notification, archived: true } : notification
            ));

            setSelectedNotifications([]);

        } catch (error) {
            console.error("Error bulk archiving notifications:", error);
            setError("Failed to archive notifications");
        }
    };

    const handleSelectAll = () => {
        if (selectedNotifications.length === filteredNotifications.length) {
            setSelectedNotifications([]);
        } else {
            setSelectedNotifications(filteredNotifications.map(n => n.id));
        }
    };

    const handleSelectNotification = (notificationId: string) => {
        setSelectedNotifications(prev =>
            prev.includes(notificationId)
                ? prev.filter(id => id !== notificationId)
                : [...prev, notificationId]
        );
    };

    const getTypeIcon = (type: Notification['type']) => {
        const option = typeOptions.find(opt => opt.value === type);
        const IconComponent = option?.icon || Bell;
        return <IconComponent className={styles.typeIcon} style={{ color: option?.color }} />;
    };

    const getPriorityBadge = (priority: Notification['priority']) => {
        const option = priorityOptions.find(opt => opt.value === priority);
        return (
            <span
                className={`${styles.priorityBadge} ${styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`]}`}
            >
                {option?.label}
            </span>
        );
    };

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
        return date.toLocaleDateString();
    };

    const isExpired = (notification: Notification) => {
        if (!notification.expiresAt) return false;
        return new Date() > notification.expiresAt;
    };

    if (isLoading && notifications.length === 0) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.loadingState}>
                            <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                            <p>Loading notifications...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Sidebars />
            <div className={styles.contentArea}>
                <div className={styles.fullscreen}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <div className={styles.headerTitle}>
                                <div>
                                    <h1 className={styles.title}>Notifications</h1>
                                    <p className={styles.subtitle}>
                                        Manage and review system and user notifications
                                    </p>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                <button
                                    onClick={() => setIsSettingsOpen(true)}
                                    className={styles.settingsButton}
                                >
                                    <Settings className={styles.buttonIcon} />
                                    Settings
                                </button>
                                <button
                                    onClick={loadNotifications}
                                    className={styles.refreshButton}
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`${styles.buttonIcon} ${isLoading ? styles.animateSpin : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className={styles.errorBanner}>
                            <div className={styles.errorContent}>
                                <AlertTriangle className={styles.errorIcon} />
                                <span className={styles.errorText}>{error}</span>
                            </div>
                            <button onClick={() => setError(null)} className={styles.errorClose}>
                                ×
                            </button>
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Bell className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>{stats.total}</div>
                                <div className={styles.statLabel}>Total</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Eye className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statUnread}`}>{stats.unread}</div>
                                <div className={styles.statLabel}>Unread</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <CheckCircle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statRead}`}>{stats.read}</div>
                                <div className={styles.statLabel}>Read</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Archive className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statArchived}`}>{stats.archived}</div>
                                <div className={styles.statLabel}>Archived</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <AlertTriangle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statCritical}`}>{stats.highPriority}</div>
                                <div className={styles.statLabel}>High Priority</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Zap className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>{stats.today}</div>
                                <div className={styles.statLabel}>Today</div>
                            </div>
                        </div>
                    </div>

                    {/* Bulk Actions */}
                    {selectedNotifications.length > 0 && (
                        <div className={styles.bulkActions}>
                            <div className={styles.bulkInfo}>
                                <span className={styles.bulkCount}>
                                    {selectedNotifications.length} selected
                                </span>
                            </div>
                            <div className={styles.bulkButtons}>
                                <button
                                    onClick={bulkMarkAsRead}
                                    className={styles.bulkButton}
                                >
                                    <CheckCircle className={styles.buttonIcon} />
                                    Mark as Read
                                </button>
                                <button
                                    onClick={bulkArchive}
                                    className={styles.bulkButton}
                                >
                                    <Archive className={styles.buttonIcon} />
                                    Archive
                                </button>
                                <button
                                    onClick={() => setSelectedNotifications([])}
                                    className={styles.bulkCancel}
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Filters and Search */}
                    <div className={styles.filtersSection}>
                        <div className={styles.searchBox}>
                            <Search className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search notifications..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.filterButtons}>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`${styles.filterToggle} ${showFilters ? styles.active : ''}`}
                            >
                                <Filter className={styles.buttonIcon} />
                                Filters
                                {(filters.type.length > 0 || filters.priority.length > 0 || filters.status.length > 0) && (
                                    <span className={styles.filterCount}>
                                        {filters.type.length + filters.priority.length + filters.status.length}
                                    </span>
                                )}
                            </button>

                            <div className={styles.quickFilters}>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: ['unread'] }))}
                                    className={`${styles.quickFilter} ${filters.status.includes('unread') ? styles.active : ''}`}
                                >
                                    Unread ({stats.unread})
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, priority: ['high', 'critical'] }))}
                                    className={`${styles.quickFilter} ${styles.critical}`}
                                >
                                    Critical ({stats.highPriority})
                                </button>
                                <button
                                    onClick={() => setFilters(prev => ({ ...prev, status: ['archived'] }))}
                                    className={`${styles.quickFilter} ${filters.status.includes('archived') ? styles.active : ''}`}
                                >
                                    Archived ({stats.archived})
                                </button>
                            </div>
                        </div>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <div className={styles.advancedFilters}>
                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Type</label>
                                    <div className={styles.filterOptions}>
                                        {typeOptions.map(option => {
                                            const IconComponent = option.icon;
                                            return (
                                                <label key={option.value} className={styles.filterOption}>
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.type.includes(option.value)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilters(prev => ({
                                                                    ...prev,
                                                                    type: [...prev.type, option.value]
                                                                }));
                                                            } else {
                                                                setFilters(prev => ({
                                                                    ...prev,
                                                                    type: prev.type.filter(t => t !== option.value)
                                                                }));
                                                            }
                                                        }}
                                                    />
                                                    <IconComponent className={styles.optionIcon} style={{ color: option.color }} />
                                                    <span>{option.label}</span>
                                                </label>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Priority</label>
                                    <div className={styles.filterOptions}>
                                        {priorityOptions.map(option => (
                                            <label key={option.value} className={styles.filterOption}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.priority.includes(option.value)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFilters(prev => ({
                                                                ...prev,
                                                                priority: [...prev.priority, option.value]
                                                            }));
                                                        } else {
                                                            setFilters(prev => ({
                                                                ...prev,
                                                                priority: prev.priority.filter(p => p !== option.value)
                                                            }));
                                                        }
                                                    }}
                                                />
                                                <div
                                                    className={styles.optionColor}
                                                    style={{ backgroundColor: option.color }}
                                                />
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.filterGroup}>
                                    <label className={styles.filterLabel}>Status</label>
                                    <div className={styles.filterOptions}>
                                        {statusOptions.map(option => (
                                            <label key={option.value} className={styles.filterOption}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.status.includes(option.value)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setFilters(prev => ({
                                                                ...prev,
                                                                status: [...prev.status, option.value]
                                                            }));
                                                        } else {
                                                            setFilters(prev => ({
                                                                ...prev,
                                                                status: prev.status.filter(s => s !== option.value)
                                                            }));
                                                        }
                                                    }}
                                                />
                                                <span>{option.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div className={styles.filterActions}>
                                    <button
                                        onClick={() => setFilters({
                                            type: [],
                                            priority: [],
                                            status: [],
                                            dateRange: { start: null, end: null }
                                        })}
                                        className={styles.clearFilters}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Notifications List */}
                    <div className={styles.notificationsContainer}>
                        <div className={styles.notificationsHeader}>
                            <h2 className={styles.notificationsTitle}>
                                Notifications
                                <span className={styles.notificationsCount}>({filteredNotifications.length})</span>
                            </h2>
                            <div className={styles.notificationsActions}>
                                {filteredNotifications.length > 0 && (
                                    <label className={styles.selectAll}>
                                        <input
                                            type="checkbox"
                                            checked={selectedNotifications.length === filteredNotifications.length}
                                            onChange={handleSelectAll}
                                        />
                                        Select All
                                    </label>
                                )}
                            </div>
                        </div>

                        <div className={styles.notificationsList}>
                            {filteredNotifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    className={`${styles.notificationCard} ${notification.read ? styles.read : styles.unread
                                        } ${isExpired(notification) ? styles.expired : ''} ${selectedNotifications.includes(notification.id) ? styles.selected : ''
                                        }`}
                                >
                                    <div className={styles.notificationCheckbox}>
                                        <input
                                            type="checkbox"
                                            checked={selectedNotifications.includes(notification.id)}
                                            onChange={() => handleSelectNotification(notification.id)}
                                        />
                                    </div>

                                    <div className={styles.notificationContent}>
                                        <div className={styles.notificationHeader}>
                                            <div className={styles.notificationType}>
                                                {getTypeIcon(notification.type)}
                                                <span className={styles.typeText}>{notification.type}</span>
                                            </div>
                                            <div className={styles.notificationMeta}>
                                                {getPriorityBadge(notification.priority)}
                                                <span className={styles.timeAgo}>
                                                    {getTimeAgo(notification.createdAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.notificationBody}>
                                            <h3 className={styles.notificationTitle}>
                                                {notification.title}
                                            </h3>
                                            <p className={styles.notificationMessage}>
                                                {notification.message}
                                            </p>

                                            {notification.source && (
                                                <div className={styles.notificationSource}>
                                                    <span className={styles.sourceLabel}>Source:</span>
                                                    <span className={styles.sourceName}>{notification.source.name}</span>
                                                </div>
                                            )}

                                            {isExpired(notification) && (
                                                <div className={styles.expiredBadge}>
                                                    <Clock className={styles.expiredIcon} />
                                                    Expired
                                                </div>
                                            )}
                                        </div>

                                        {(notification.action || !notification.read) && (
                                            <div className={styles.notificationActions}>
                                                {notification.action && (
                                                    <button
                                                        className={styles.actionButton}
                                                        onClick={notification.action.handler}
                                                    >
                                                        {notification.action.label}
                                                    </button>
                                                )}
                                                {!notification.read && (
                                                    <button
                                                        onClick={() => markAsRead(notification.id)}
                                                        className={styles.markReadButton}
                                                    >
                                                        <CheckCircle className={styles.actionIcon} />
                                                        Mark Read
                                                    </button>
                                                )}
                                                {notification.read && (
                                                    <button
                                                        onClick={() => markAsUnread(notification.id)}
                                                        className={styles.markUnreadButton}
                                                    >
                                                        <Eye className={styles.actionIcon} />
                                                        Mark Unread
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.notificationMenu}>
                                        <button className={styles.menuButton}>
                                            <MoreVertical className={styles.menuIcon} />
                                        </button>
                                        <div className={styles.dropdownMenu}>
                                            {!notification.archived ? (
                                                <button
                                                    onClick={() => archiveNotification(notification.id)}
                                                    className={styles.menuItem}
                                                >
                                                    <Archive className={styles.menuIcon} />
                                                    Archive
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => unarchiveNotification(notification.id)}
                                                    className={styles.menuItem}
                                                >
                                                    <Archive className={styles.menuIcon} />
                                                    Unarchive
                                                </button>
                                            )}
                                            <button
                                                onClick={() => deleteNotification(notification.id)}
                                                className={`${styles.menuItem} ${styles.deleteItem}`}
                                            >
                                                <Trash2 className={styles.menuIcon} />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {filteredNotifications.length === 0 && !isLoading && (
                            <div className={styles.emptyState}>
                                <Bell className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>No notifications found</p>
                                <p className={styles.emptyDescription}>
                                    {searchTerm || filters.type.length > 0 || filters.priority.length > 0
                                        ? "Try adjusting your search or filters"
                                        : "You're all caught up! No new notifications"
                                    }
                                </p>
                            </div>
                        )}

                        {isLoading && filteredNotifications.length === 0 && (
                            <div className={styles.loadingState}>
                                <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                                <p>Loading notifications...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default NotificationsPage;