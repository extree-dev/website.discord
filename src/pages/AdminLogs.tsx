import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Sidebars from "@/components/Saidbar.js";
import {
  FiSearch,
  FiFilter,
  FiDownload,
  FiRefreshCw,
  FiAlertTriangle,
  FiShield,
  FiUser,
  FiClock,
  FiActivity
} from "react-icons/fi";
import styles from "../module_pages/AdminLogs.module.scss";

interface SecurityLog {
  id: number;
  type: string;
  message: string;
  metadata: any;
  createdAt: string;
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<SecurityLog[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data for demonstration
  const mockLogs: SecurityLog[] = [
    {
      id: 1,
      type: "error",
      message: "Failed authentication attempt from suspicious IP",
      metadata: { ip: "192.168.1.100", userAgent: "Mozilla/5.0", country: "RU" },
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    },
    {
      id: 2,
      type: "suspicious",
      message: "Multiple failed login attempts for user admin",
      metadata: { username: "admin", attempts: 5, lockout: true },
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 minutes ago
    },
    {
      id: 3,
      type: "auth",
      message: "User successfully logged in",
      metadata: { username: "john_doe", method: "oauth", provider: "discord" },
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    },
    {
      id: 4,
      type: "info",
      message: "System backup completed successfully",
      metadata: { size: "2.4GB", duration: "45s", files: 1245 },
      createdAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour ago
    },
    {
      id: 5,
      type: "warning",
      message: "High memory usage detected",
      metadata: { usage: "87%", process: "node", recommendation: "restart" },
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(), // 2 hours ago
    },
  ];

  useEffect(() => {
    // Simulate API call
    const loadLogs = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLogs(mockLogs);
      setFilteredLogs(mockLogs);
      setIsLoading(false);
    };

    loadLogs();
  }, []);

  // Filter logs based on search and type
  useEffect(() => {
    let filtered = logs;

    if (searchTerm) {
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(log => log.type === typeFilter);
    }

    setFilteredLogs(filtered);
  }, [logs, searchTerm, typeFilter]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    // In a real app, this would refetch from the API
    setIsRefreshing(false);
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(logs, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `security-logs-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <FiAlertTriangle size={12} />;
      case 'warning': return <FiAlertTriangle size={12} />;
      case 'info': return <FiActivity size={12} />;
      case 'auth': return <FiUser size={12} />;
      case 'suspicious': return <FiShield size={12} />;
      default: return <FiActivity size={12} />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return styles.error;
      case 'warning': return styles.warning;
      case 'info': return styles.info;
      case 'auth': return styles.auth;
      case 'suspicious': return styles.suspicious;
      default: return styles.info;
    }
  };

  // Calculate statistics
  const stats = {
    total: logs.length,
    errors: logs.filter(log => log.type === 'error').length,
    warnings: logs.filter(log => log.type === 'warning').length,
    suspicious: logs.filter(log => log.type === 'suspicious').length,
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={styles.layout}>
      <Sidebars />
      <div className={styles.adminLogs}>
        {/* Header */}
        <div className={styles.header}>
          <h1>
            <FiShield style={{ marginRight: '0.5rem' }} />
            Security Logs
          </h1>
          <p className={styles.headerSubtitle}>
            Monitor system security events and activities
          </p>
        </div>

        {/* Statistics Overview */}
        <div className={styles.statsOverview}>
          <div className={styles.statCard}>
            <div className={`${styles.statCard__value} ${styles.info}`}>
              {stats.total}
            </div>
            <div className={styles.statCard__label}>Total Events</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statCard__value} ${styles.error}`}>
              {stats.errors}
            </div>
            <div className={styles.statCard__label}>Errors</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statCard__value} ${styles.warning}`}>
              {stats.warnings}
            </div>
            <div className={styles.statCard__label}>Warnings</div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statCard__value} ${styles.success}`}>
              {stats.suspicious}
            </div>
            <div className={styles.statCard__label}>Suspicious</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div style={{ display: 'flex', gap: '1rem', flex: 1, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
              <FiSearch style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={styles.searchInput}
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">All Types</option>
              <option value="error">Errors</option>
              <option value="warning">Warnings</option>
              <option value="info">Info</option>
              <option value="auth">Authentication</option>
              <option value="suspicious">Suspicious</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              className={`${styles.actionButton} ${styles.secondary}`}
              onClick={handleExport}
            >
              <FiDownload />
              Export
            </button>
            <button
              className={`${styles.actionButton} ${isRefreshing ? styles.loading : ''}`}
              onClick={handleRefresh}
              disabled={isRefreshing}
            >
              <FiRefreshCw />
              Refresh
            </button>
          </div>
        </div>

        {/* Logs List */}
        <div className={styles.logsContainer}>
          {isLoading ? (
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
              <p>Loading security logs...</p>
            </div>
          ) : filteredLogs.length > 0 ? (
            <div className={styles.scrollArea}>
              <div className={styles.logsList}>
                <AnimatePresence>
                  {filteredLogs.map((log) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                      className={styles.logItem}
                    >
                      <div className={styles.logHeader}>
                        <span className={`${styles.logBadge} ${getTypeColor(log.type)}`}>
                          {getTypeIcon(log.type)}
                          {log.type.toUpperCase()}
                        </span>
                        <span className={styles.logTime}>
                          <FiClock size={12} style={{ marginRight: '0.25rem' }} />
                          {formatTime(log.createdAt)}
                        </span>
                      </div>
                      <p className={styles.logMessage}>{log.message}</p>
                      {log.metadata && (
                        <div className={styles.logMetadata}>
                          <pre>{JSON.stringify(log.metadata, null, 2)}</pre>
                        </div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ) : (
            <div className={styles.emptyState}>
              <FiActivity className={styles.emptyStateIcon} />
              <div className={styles.emptyStateTitle}>
                {searchTerm || typeFilter !== "all" ? "No logs found" : "No security logs"}
              </div>
              <div className={styles.emptyStateDescription}>
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your search or filter criteria."
                  : "Security events will appear here as they occur."
                }
              </div>
              {(searchTerm || typeFilter !== "all") && (
                <button
                  className={styles.actionButton}
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                  }}
                >
                  Clear Filters
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}