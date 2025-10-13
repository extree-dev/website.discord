import React, { useState, useEffect, useCallback, useContext } from "react";
import {
    Flag,
    Filter,
    Search,
    Download,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    Clock,
    MoreVertical,
    User,
    MessageCircle,
    Shield,
    Ban,
    Trash2,
    Eye,
    ArrowUp,
    ArrowDown,
    Calendar,
    Users,
    FileText,
    Zap
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/ReportsPage.module.scss";
import { SidebarContext } from "@/App.js";

interface Report {
    id: string;
    type: 'spam' | 'harassment' | 'inappropriate' | 'other';
    status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
    severity: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    description: string;
    reportedUser: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    reporter: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    evidence?: {
        type: 'text' | 'image' | 'video' | 'audio';
        content: string;
        url?: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
    assignedModerator?: {
        id: string;
        name: string;
        email: string;
    };
    resolution?: {
        action: 'warning' | 'suspension' | 'ban' | 'no_action';
        reason: string;
        resolvedBy: string;
        resolvedAt: Date;
    };
    messageCount: number;
    priority: number;
}

interface ReportStats {
    total: number;
    pending: number;
    reviewed: number;
    resolved: number;
    dismissed: number;
    highPriority: number;
    avgResponseTime: number;
}

interface FilterState {
    status: string[];
    type: string[];
    severity: string[];
    dateRange: {
        start: Date | null;
        end: Date | null;
    };
    assigned: string;
}

export const ReportsPage: React.FC = () => {
    const [reports, setReports] = useState<Report[]>([]);
    const [filteredReports, setFilteredReports] = useState<Report[]>([]);
    const [stats, setStats] = useState<ReportStats>({
        total: 0,
        pending: 0,
        reviewed: 0,
        resolved: 0,
        dismissed: 0,
        highPriority: 0,
        avgResponseTime: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState<FilterState>({
        status: [],
        type: [],
        severity: [],
        dateRange: { start: null, end: null },
        assigned: "all"
    });

    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

    const statusOptions = [
        { value: 'pending', label: 'Pending', color: '#f59e0b', icon: Clock },
        { value: 'reviewed', label: 'Under Review', color: '#3b82f6', icon: Eye },
        { value: 'resolved', label: 'Resolved', color: '#10b981', icon: CheckCircle },
        { value: 'dismissed', label: 'Dismissed', color: '#6b7280', icon: Ban }
    ];

    const typeOptions = [
        { value: 'spam', label: 'Spam', color: '#6b7280' },
        { value: 'harassment', label: 'Harassment', color: '#ef4444' },
        { value: 'inappropriate', label: 'Inappropriate Content', color: '#f59e0b' },
        { value: 'other', label: 'Other', color: '#8b5cf6' }
    ];

    const severityOptions = [
        { value: 'low', label: 'Low', color: '#10b981' },
        { value: 'medium', label: 'Medium', color: '#f59e0b' },
        { value: 'high', label: 'High', color: '#ef4444' },
        { value: 'critical', label: 'Critical', color: '#dc2626' }
    ];

    const getAuthToken = useCallback((): string => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error("No authentication token found");
        }
        return token;
    }, []);

    const loadReports = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/reports?include=users,evidence", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load reports: ${response.status}`);
            }

            const reportsData = await response.json();
            const formattedReports: Report[] = reportsData.map((report: any) => ({
                ...report,
                createdAt: new Date(report.createdAt),
                updatedAt: new Date(report.updatedAt),
                resolution: report.resolution ? {
                    ...report.resolution,
                    resolvedAt: new Date(report.resolution.resolvedAt)
                } : undefined
            }));

            setReports(formattedReports);
            setFilteredReports(formattedReports);

        } catch (error) {
            console.error("Error loading reports:", error);
            setError(error instanceof Error ? error.message : "Failed to load reports");

            // Fallback mock data
            setReports(generateMockReports());
            setFilteredReports(generateMockReports());
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    const loadStats = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/reports/stats", {
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
            const localStats = calculateStats(reports);
            setStats(localStats);
        }
    }, [reports, getAuthToken]);

    useEffect(() => {
        loadReports();
    }, [loadReports]);

    useEffect(() => {
        if (reports.length > 0) {
            loadStats();
            applyFilters();
        }
    }, [reports, filters, searchTerm, loadStats]);

    const generateMockReports = (): Report[] => {
        const mockReports: Report[] = [];
        const types: Report['type'][] = ['spam', 'harassment', 'inappropriate', 'other'];
        const statuses: Report['status'][] = ['pending', 'reviewed', 'resolved', 'dismissed'];
        const severities: Report['severity'][] = ['low', 'medium', 'high', 'critical'];

        for (let i = 1; i <= 25; i++) {
            const type = types[Math.floor(Math.random() * types.length)];
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const severity = severities[Math.floor(Math.random() * severities.length)];

            mockReports.push({
                id: `report-${i}`,
                type,
                status,
                severity,
                title: `Report #${i}: ${type} violation`,
                description: `This is a detailed description of the reported ${type} incident. The user has been engaging in behavior that violates our community guidelines.`,
                reportedUser: {
                    id: `user-${i}`,
                    name: `User ${i}`,
                    email: `user${i}@example.com`
                },
                reporter: {
                    id: `reporter-${i}`,
                    name: `Reporter ${i}`,
                    email: `reporter${i}@example.com`
                },
                evidence: [
                    {
                        type: 'text',
                        content: 'Sample evidence text content'
                    }
                ],
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
                assignedModerator: Math.random() > 0.3 ? {
                    id: 'mod-1',
                    name: 'Admin User',
                    email: 'admin@example.com'
                } : undefined,
                resolution: status === 'resolved' || status === 'dismissed' ? {
                    action: ['warning', 'suspension', 'ban', 'no_action'][Math.floor(Math.random() * 4)] as any,
                    reason: 'Issue has been addressed according to our guidelines',
                    resolvedBy: 'mod-1',
                    resolvedAt: new Date()
                } : undefined,
                messageCount: Math.floor(Math.random() * 10),
                priority: Math.floor(Math.random() * 100)
            });
        }

        return mockReports.sort((a, b) => b.priority - a.priority);
    };

    const calculateStats = (reportsData: Report[]): ReportStats => {
        return {
            total: reportsData.length,
            pending: reportsData.filter(r => r.status === 'pending').length,
            reviewed: reportsData.filter(r => r.status === 'reviewed').length,
            resolved: reportsData.filter(r => r.status === 'resolved').length,
            dismissed: reportsData.filter(r => r.status === 'dismissed').length,
            highPriority: reportsData.filter(r => r.severity === 'high' || r.severity === 'critical').length,
            avgResponseTime: 2.5 // Mock average in hours
        };
    };

    const applyFilters = () => {
        let filtered = reports;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(report =>
                report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reportedUser.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                report.reporter.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (filters.status.length > 0) {
            filtered = filtered.filter(report => filters.status.includes(report.status));
        }

        // Type filter
        if (filters.type.length > 0) {
            filtered = filtered.filter(report => filters.type.includes(report.type));
        }

        // Severity filter
        if (filters.severity.length > 0) {
            filtered = filtered.filter(report => filters.severity.includes(report.severity));
        }

        // Date range filter
        if (filters.dateRange.start && filters.dateRange.end) {
            filtered = filtered.filter(report => {
                const reportDate = new Date(report.createdAt);
                return reportDate >= filters.dateRange.start! && reportDate <= filters.dateRange.end!;
            });
        }

        // Assigned filter
        if (filters.assigned === 'assigned') {
            filtered = filtered.filter(report => report.assignedModerator);
        } else if (filters.assigned === 'unassigned') {
            filtered = filtered.filter(report => !report.assignedModerator);
        }

        setFilteredReports(filtered);
    };

    const handleStatusChange = async (reportId: string, newStatus: Report['status']) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/reports/${reportId}/status`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!response.ok) {
                throw new Error("Failed to update report status");
            }

            // Update local state
            setReports(prev => prev.map(report =>
                report.id === reportId ? { ...report, status: newStatus, updatedAt: new Date() } : report
            ));

        } catch (error) {
            console.error("Error updating report status:", error);
            setError("Failed to update report status");
        }
    };

    const handleAssignToMe = async (reportId: string) => {
        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/reports/${reportId}/assign`, {
                method: "PATCH",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                throw new Error("Failed to assign report");
            }

            // Update local state
            setReports(prev => prev.map(report =>
                report.id === reportId ? {
                    ...report,
                    assignedModerator: {
                        id: 'current-user',
                        name: 'You',
                        email: 'current@example.com'
                    },
                    status: 'reviewed',
                    updatedAt: new Date()
                } : report
            ));

        } catch (error) {
            console.error("Error assigning report:", error);
            setError("Failed to assign report");
        }
    };

    const handleExportReports = () => {
        const dataStr = JSON.stringify(filteredReports, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `reports-export-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getStatusIcon = (status: Report['status']) => {
        const option = statusOptions.find(opt => opt.value === status);
        const IconComponent = option?.icon || Clock;
        return <IconComponent className={styles.statusIcon} style={{ color: option?.color }} />;
    };

    const getSeverityBadge = (severity: Report['severity']) => {
        const option = severityOptions.find(opt => opt.value === severity);
        return (
            <span
                className={`${styles.severityBadge} ${styles[`severity${severity.charAt(0).toUpperCase() + severity.slice(1)}`]}`}
            >
                {option?.label}
            </span>
        );
    };

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

        if (diffInHours < 1) return 'Just now';
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
        return `${Math.floor(diffInHours / 168)}w ago`;
    };

    if (isLoading && reports.length === 0) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.loadingState}>
                            <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                            <p>Loading reports...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebars />
            <main className="main">
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        {/* Header */}
                        <div className={styles.header}>
                            <div className={styles.headerTop}>
                                <div className={styles.headerTitle}>
                                    <div className={styles.titleIcon}>
                                        <Flag className={styles.icon} />
                                    </div>
                                    <div>
                                        <h1 className={styles.title}>Reports Management</h1>
                                        <p className={styles.subtitle}>
                                            Review and manage user reports and moderation cases
                                        </p>
                                    </div>
                                </div>
                                <div className={styles.headerActions}>
                                    <button
                                        onClick={handleExportReports}
                                        className={styles.exportButton}
                                        disabled={filteredReports.length === 0}
                                    >
                                        <Download className={styles.buttonIcon} />
                                        Export
                                    </button>
                                    <button
                                        onClick={loadReports}
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
                                    <FileText className={styles.icon} />
                                </div>
                                <div className={styles.statContent}>
                                    <div className={styles.statNumber}>{stats.total}</div>
                                    <div className={styles.statLabel}>Total Reports</div>
                                </div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>
                                    <Clock className={styles.icon} />
                                </div>
                                <div className={styles.statContent}>
                                    <div className={`${styles.statNumber} ${styles.statPending}`}>{stats.pending}</div>
                                    <div className={styles.statLabel}>Pending Review</div>
                                </div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>
                                    <Eye className={styles.icon} />
                                </div>
                                <div className={styles.statContent}>
                                    <div className={`${styles.statNumber} ${styles.statReviewed}`}>{stats.reviewed}</div>
                                    <div className={styles.statLabel}>Under Review</div>
                                </div>
                            </div>

                            <div className={styles.statCard}>
                                <div className={styles.statIcon}>
                                    <CheckCircle className={styles.icon} />
                                </div>
                                <div className={styles.statContent}>
                                    <div className={`${styles.statNumber} ${styles.statResolved}`}>{stats.resolved}</div>
                                    <div className={styles.statLabel}>Resolved</div>
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
                                    <div className={styles.statNumber}>{stats.avgResponseTime}h</div>
                                    <div className={styles.statLabel}>Avg. Response Time</div>
                                </div>
                            </div>
                        </div>

                        {/* Filters and Search */}
                        <div className={styles.filtersSection}>
                            <div className={styles.searchBox}>
                                <Search className={styles.searchIcon} />
                                <input
                                    type="text"
                                    placeholder="Search reports, users, content..."
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
                                    {(filters.status.length > 0 || filters.type.length > 0 || filters.severity.length > 0) && (
                                        <span className={styles.filterCount}>
                                            {filters.status.length + filters.type.length + filters.severity.length}
                                        </span>
                                    )}
                                </button>

                                <div className={styles.quickFilters}>
                                    <button
                                        onClick={() => setFilters(prev => ({ ...prev, status: ['pending'] }))}
                                        className={`${styles.quickFilter} ${filters.status.includes('pending') ? styles.active : ''}`}
                                    >
                                        Pending ({stats.pending})
                                    </button>
                                    <button
                                        onClick={() => setFilters(prev => ({ ...prev, severity: ['high', 'critical'] }))}
                                        className={`${styles.quickFilter} ${styles.critical}`}
                                    >
                                        Critical ({stats.highPriority})
                                    </button>
                                    <button
                                        onClick={() => setFilters(prev => ({ ...prev, assigned: 'unassigned' }))}
                                        className={`${styles.quickFilter} ${filters.assigned === 'unassigned' ? styles.active : ''}`}
                                    >
                                        Unassigned
                                    </button>
                                </div>
                            </div>

                            {/* Advanced Filters */}
                            {showFilters && (
                                <div className={styles.advancedFilters}>
                                    <div className={styles.filterGroup}>
                                        <label className={styles.filterLabel}>Status</label>
                                        <div className={styles.filterOptions}>
                                            {statusOptions.map(option => {
                                                const IconComponent = option.icon;
                                                return (
                                                    <label key={option.value} className={styles.filterOption}>
                                                        <input
                                                            type="checkbox"
                                                            checked={filters.status.includes(option.value as any)}
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
                                                        <IconComponent className={styles.optionIcon} style={{ color: option.color }} />
                                                        <span>{option.label}</span>
                                                    </label>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className={styles.filterGroup}>
                                        <label className={styles.filterLabel}>Report Type</label>
                                        <div className={styles.filterOptions}>
                                            {typeOptions.map(option => (
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
                                        <label className={styles.filterLabel}>Severity</label>
                                        <div className={styles.filterOptions}>
                                            {severityOptions.map(option => (
                                                <label key={option.value} className={styles.filterOption}>
                                                    <input
                                                        type="checkbox"
                                                        checked={filters.severity.includes(option.value)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setFilters(prev => ({
                                                                    ...prev,
                                                                    severity: [...prev.severity, option.value]
                                                                }));
                                                            } else {
                                                                setFilters(prev => ({
                                                                    ...prev,
                                                                    severity: prev.severity.filter(s => s !== option.value)
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

                                    <div className={styles.filterActions}>
                                        <button
                                            onClick={() => setFilters({
                                                status: [],
                                                type: [],
                                                severity: [],
                                                dateRange: { start: null, end: null },
                                                assigned: "all"
                                            })}
                                            className={styles.clearFilters}
                                        >
                                            Clear All
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Reports Table */}
                        <div className={styles.tableContainer}>
                            <div className={styles.tableHeader}>
                                <h2 className={styles.tableTitle}>
                                    Reports
                                    <span className={styles.tableCount}>({filteredReports.length})</span>
                                </h2>
                                <div className={styles.tableActions}>
                                    <span className={styles.sortLabel}>Sort by:</span>
                                    <select className={styles.sortSelect}>
                                        <option value="priority">Priority</option>
                                        <option value="newest">Newest First</option>
                                        <option value="oldest">Oldest First</option>
                                        <option value="severity">Severity</option>
                                    </select>
                                </div>
                            </div>

                            <div className={styles.tableWrapper}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Report</th>
                                            <th>Type</th>
                                            <th>Severity</th>
                                            <th>Status</th>
                                            <th>Reported User</th>
                                            <th>Date</th>
                                            <th>Assigned To</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredReports.map((report) => (
                                            <tr key={report.id} className={styles.tableRow}>
                                                <td>
                                                    <div className={styles.reportCell}>
                                                        <div className={styles.reportTitle}>
                                                            {report.title}
                                                        </div>
                                                        <div className={styles.reportDescription}>
                                                            {report.description.substring(0, 60)}...
                                                        </div>
                                                        <div className={styles.reportMeta}>
                                                            <MessageCircle className={styles.metaIcon} />
                                                            <span>{report.messageCount} messages</span>
                                                            <span className={styles.reportId}>#{report.id}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.typeBadge} ${styles[`type${report.type.charAt(0).toUpperCase() + report.type.slice(1)}`]}`}>
                                                        {report.type}
                                                    </span>
                                                </td>
                                                <td>
                                                    {getSeverityBadge(report.severity)}
                                                </td>
                                                <td>
                                                    <div className={styles.statusCell}>
                                                        {getStatusIcon(report.status)}
                                                        <span className={styles.statusText}>{report.status}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.userCell}>
                                                        <User className={styles.userIcon} />
                                                        <div>
                                                            <div className={styles.userName}>
                                                                {report.reportedUser.name}
                                                            </div>
                                                            <div className={styles.userEmail}>
                                                                {report.reportedUser.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className={styles.dateCell}>
                                                        <div className={styles.date}>
                                                            {report.createdAt.toLocaleDateString()}
                                                        </div>
                                                        <div className={styles.timeAgo}>
                                                            {getTimeAgo(report.createdAt)}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    {report.assignedModerator ? (
                                                        <div className={styles.assignedCell}>
                                                            <Shield className={styles.moderatorIcon} />
                                                            <span className={styles.moderatorName}>
                                                                {report.assignedModerator.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className={styles.unassigned}>Unassigned</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        {!report.assignedModerator && (
                                                            <button
                                                                onClick={() => handleAssignToMe(report.id)}
                                                                className={styles.assignButton}
                                                                title="Assign to me"
                                                            >
                                                                <User className={styles.actionIcon} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setSelectedReport(report)}
                                                            className={styles.viewButton}
                                                            title="View details"
                                                        >
                                                            <Eye className={styles.actionIcon} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleStatusChange(report.id, 'resolved')}
                                                            className={styles.resolveButton}
                                                            title="Mark as resolved"
                                                        >
                                                            <CheckCircle className={styles.actionIcon} />
                                                        </button>
                                                        <button className={styles.moreButton}>
                                                            <MoreVertical className={styles.actionIcon} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {filteredReports.length === 0 && !isLoading && (
                                <div className={styles.emptyState}>
                                    <Flag className={styles.emptyIcon} />
                                    <p className={styles.emptyTitle}>No reports found</p>
                                    <p className={styles.emptyDescription}>
                                        {searchTerm || filters.status.length > 0 || filters.type.length > 0
                                            ? "Try adjusting your search or filters"
                                            : "All reports have been processed"
                                        }
                                    </p>
                                </div>
                            )}

                            {isLoading && filteredReports.length === 0 && (
                                <div className={styles.loadingState}>
                                    <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                                    <p>Loading reports...</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ReportsPage;