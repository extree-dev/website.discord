import React, { useState, useEffect, useCallback } from "react";
import {
    Key,
    Copy,
    Trash2,
    Plus,
    CheckCircle,
    XCircle,
    Clock,
    User,
    AlertCircle,
    RefreshCw,
    BarChart3,
    Zap,
    Shield,
    Download,
    Filter,
    Search,
    MoreVertical,
    Edit3
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/SecretCodesPage.module.scss";

interface SecretCode {
    id: string;
    code: string;
    createdBy: string;
    createdAt: Date;
    used: boolean;
    usedBy?: string;
    usedAt?: Date;
    expiresAt?: Date;
    maxUses?: number;
    uses?: number;
    userId?: number;
    user?: {
        id?: number;
        email?: string;
        name?: string;
        nickname?: string;
        discordId?: string;
        createdAt?: Date;
    };
}

interface ApiError {
    error: string;
    details?: string;
}

interface Stats {
    total: number;
    active: number;
    used: number;
    expired: number;
    usageRate: number;
    recentActivity: number;
}

export const SecretCodesPage: React.FC = () => {
    const [codes, setCodes] = useState<SecretCode[]>([]);
    const [filteredCodes, setFilteredCodes] = useState<SecretCode[]>([]);
    const [newCode, setNewCode] = useState("");
    const [expiryDays, setExpiryDays] = useState<number>(30);
    const [maxUses, setMaxUses] = useState<number>(1);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
        usageRate: 0,
        recentActivity: 0
    });
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [showAdvanced, setShowAdvanced] = useState(false);

    // Получение токена
    const getAuthToken = useCallback((): string => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error("No authentication token found");
        }
        return token;
    }, []);

    // Загрузка кодов из базы данных
    const loadCodesFromDatabase = useCallback(async () => {
        try {
            setIsLoading(true);
            setError(null);

            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/secret-codes?include=user", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errorData: ApiError = await response.json();
                throw new Error(errorData.error || `Failed to load codes: ${response.status}`);
            }

            const dbCodes = await response.json();
            const formattedCodes: SecretCode[] = dbCodes.map((code: any) => ({
                ...code,
                createdAt: new Date(code.createdAt),
                usedAt: code.usedAt ? new Date(code.usedAt) : undefined,
                expiresAt: code.expiresAt ? new Date(code.expiresAt) : undefined,
                user: code.user ? {
                    id: code.user.id,
                    email: code.user.email,
                    name: code.user.name,
                    nickname: code.user.nickname,
                    discordId: code.user.discordId,
                    createdAt: code.user.createdAt ? new Date(code.user.createdAt) : undefined
                } : undefined
            }));

            setCodes(formattedCodes);
            setFilteredCodes(formattedCodes);
            localStorage.setItem("moderator_secret_codes", JSON.stringify(formattedCodes));

        } catch (error) {
            console.error("Error loading codes from database:", error);
            setError(error instanceof Error ? error.message : "Failed to load codes from database");

            // Fallback to localStorage
            const localCodes = localStorage.getItem("moderator_secret_codes");
            if (localCodes) {
                const parsedCodes = JSON.parse(localCodes);
                setCodes(parsedCodes);
                setFilteredCodes(parsedCodes);
            }
        } finally {
            setIsLoading(false);
        }
    }, [getAuthToken]);

    // Загрузка статистики
    const loadStats = useCallback(async () => {
        try {
            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/secret-codes/stats", {
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
            // Calculate stats locally if API fails
            const now = new Date();
            const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

            const localStats: Stats = {
                total: codes.length,
                active: codes.filter(code => !code.used && (!code.expiresAt || new Date() < code.expiresAt)).length,
                used: codes.filter(code => code.used).length,
                expired: codes.filter(code => code.expiresAt && new Date() > code.expiresAt && !code.used).length,
                usageRate: codes.length > 0 ? (codes.filter(code => code.used).length / codes.length) * 100 : 0,
                recentActivity: codes.filter(code => code.createdAt > last24Hours).length
            };
            setStats(localStats);
        }
    }, [codes, getAuthToken]);

    // Фильтрация кодов
    useEffect(() => {
        let filtered = codes;

        if (searchTerm) {
            filtered = filtered.filter(code =>
                code.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                code.user?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                code.user?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                code.user?.discordId?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (statusFilter !== "all") {
            filtered = filtered.filter(code => getCodeStatus(code) === statusFilter);
        }

        setFilteredCodes(filtered);
    }, [codes, searchTerm, statusFilter]);

    useEffect(() => {
        loadCodesFromDatabase();
    }, [loadCodesFromDatabase]);

    useEffect(() => {
        if (codes.length > 0) {
            loadStats();
        }
    }, [codes, loadStats]);

    // Генерация случайного кода
    const generateSecureCode = async (): Promise<string> => {
        try {
            const token = getAuthToken();
            const response = await fetch("http://localhost:4000/api/secret-codes/generate", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.code;
            }
        } catch (error) {
            console.error("Error generating code via API:", error);
        }

        // Fallback local generation
        const length = 16;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        let result = "";
        for (let i = 0; i < length; i++) {
            const charIndex = randomValues[i] % chars.length;
            result += chars[charIndex];
            if ((i + 1) % 4 === 0 && i !== length - 1) {
                result += "-";
            }
        }
        return result;
    };

    // Создание нового кода
    const handleCreateCode = async () => {
        if (codes.length >= 500) {
            alert("Maximum number of codes (500) reached");
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const token = getAuthToken();
            let codeToCreate = newCode.trim();

            if (!codeToCreate) {
                codeToCreate = await generateSecureCode();
            }

            const expiryDate = expiryDays > 0 ? new Date() : null;
            if (expiryDate) {
                expiryDate.setDate(expiryDate.getDate() + expiryDays);
            }

            const codeData = {
                code: codeToCreate,
                expiresAt: expiryDate ? expiryDate.toISOString() : null,
                maxUses: maxUses || 1
            };

            const response = await fetch("http://localhost:4000/api/secret-codes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(codeData)
            });

            if (!response.ok) {
                const errorData: ApiError = await response.json();
                throw new Error(errorData.error || `Failed to create code: ${response.status}`);
            }

            const savedCode = await response.json();

            const codeWithDbId: SecretCode = {
                ...savedCode,
                createdAt: new Date(savedCode.createdAt),
                usedAt: savedCode.usedAt ? new Date(savedCode.usedAt) : undefined,
                expiresAt: savedCode.expiresAt ? new Date(savedCode.expiresAt) : undefined
            };

            const updatedCodes = [codeWithDbId, ...codes];
            setCodes(updatedCodes);
            localStorage.setItem("moderator_secret_codes", JSON.stringify(updatedCodes));
            setNewCode("");
            setShowAdvanced(false);

            loadStats();

        } catch (error) {
            console.error("Error creating secret code:", error);
            setError(error instanceof Error ? error.message : "Failed to create secret code");
        } finally {
            setIsLoading(false);
        }
    };

    // Копирование кода в буфер обмена
    const handleCopyCode = (code: string) => {
        navigator.clipboard.writeText(code);
        setCopiedCode(code);
        setTimeout(() => setCopiedCode(null), 2000);
    };

    // Удаление кода
    const handleDeleteCode = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this code? This action cannot be undone.")) {
            return;
        }

        try {
            const token = getAuthToken();
            const response = await fetch(`http://localhost:4000/api/secret-codes/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            if (!response.ok) {
                const errorData: ApiError = await response.json();
                throw new Error(errorData.error || "Failed to delete code from database");
            }

            const updatedCodes = codes.filter(code => code.id !== id);
            setCodes(updatedCodes);
            localStorage.setItem("moderator_secret_codes", JSON.stringify(updatedCodes));

            loadStats();

        } catch (error) {
            console.error("Error deleting secret code:", error);
            setError(error instanceof Error ? error.message : "Failed to delete secret code");
        }
    };

    // Экспорт кодов
    const handleExportCodes = () => {
        const dataStr = JSON.stringify(codes, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `secret-codes-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const getCodeStatus = (code: SecretCode) => {
        if (code.used) return "used";
        if (code.expiresAt && new Date() > code.expiresAt) return "expired";
        if (code.maxUses && code.uses && code.uses >= code.maxUses) return "used";
        return "active";
    };

    const renderUserInfo = (code: SecretCode) => {
        if (!code.used || !code.user) {
            return <span className={styles.emptyValue}>—</span>;
        }

        return (
            <div className={styles.userInfo}>
                <div className={styles.userInfoMain}>
                    <User className={styles.userIcon} />
                    <span className={styles.userName}>
                        {code.user.name || code.user.nickname || code.user.email || code.usedBy}
                    </span>
                </div>
                {code.user.discordId && (
                    <div className={styles.userInfoMeta}>
                        Discord: {code.user.discordId}
                    </div>
                )}
            </div>
        );
    };

    const formatUsage = (code: SecretCode) => {
        if (!code.maxUses && !code.uses) return "1/1";
        return `${code.uses || 0}/${code.maxUses || 1}`;
    };

    const getStatusCount = (status: string) => {
        return codes.filter(code => getCodeStatus(code) === status).length;
    };

    return (
        <div className={styles.container}>
            <Sidebars />
            <div className={styles.contentArea}>
                <div className={styles.fullscreen}>
                    {/* Header Section */}
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <div className={styles.headerTitle}>
                                <div className={styles.titleIcon}>
                                    <Key className={styles.icon} />
                                </div>
                                <div>
                                    <h1 className={styles.title}>Secret Codes</h1>
                                    <p className={styles.subtitle}>
                                        Generate and manage moderator registration codes
                                    </p>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                <button
                                    onClick={handleExportCodes}
                                    className={styles.exportButton}
                                    disabled={codes.length === 0}
                                >
                                    <Download className={styles.buttonIcon} />
                                    Export
                                </button>
                                <button
                                    onClick={loadCodesFromDatabase}
                                    className={styles.refreshButton}
                                    disabled={isLoading}
                                >
                                    <RefreshCw className={`${styles.buttonIcon} ${isLoading ? styles.animateSpin : ''}`} />
                                    Refresh
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <BarChart3 className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>{stats.total}</div>
                                <div className={styles.statLabel}>Total Codes</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Zap className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statActive}`}>{stats.active}</div>
                                <div className={styles.statLabel}>Active</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <CheckCircle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statUsed}`}>{stats.used}</div>
                                <div className={styles.statLabel}>Used</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Shield className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statExpired}`}>{stats.expired}</div>
                                <div className={styles.statLabel}>Expired</div>
                            </div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <BarChart3 className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>
                                    {stats.usageRate.toFixed(1)}%
                                </div>
                                <div className={styles.statLabel}>Usage Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Error Banner */}
                    {error && (
                        <div className={styles.errorBanner}>
                            <div className={styles.errorContent}>
                                <AlertCircle className={styles.errorIcon} />
                                <span className={styles.errorText}>{error}</span>
                            </div>
                            <button onClick={() => setError(null)} className={styles.errorClose}>
                                ×
                            </button>
                        </div>
                    )}

                    {/* Code Generator */}
                    <div className={styles.codeGenerator}>
                        <div className={styles.generatorHeader}>
                            <h2 className={styles.generatorTitle}>Generate New Code</h2>
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className={styles.advancedToggle}
                            >
                                <Edit3 className={styles.buttonIcon} />
                                {showAdvanced ? 'Simple' : 'Advanced'}
                            </button>
                        </div>

                        <div className={styles.generatorGrid}>
                            <div className={styles.formGroup}>
                                <label className={styles.formLabel}>
                                    Code
                                    <span className={styles.optional}>(optional)</span>
                                </label>
                                <input
                                    type="text"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, ''))}
                                    placeholder="Auto-generate secure code"
                                    className={styles.formInput}
                                    disabled={isLoading}
                                />
                            </div>

                            {showAdvanced && (
                                <>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            Expiry Days
                                        </label>
                                        <input
                                            type="number"
                                            value={expiryDays}
                                            onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
                                            min="0"
                                            max="365"
                                            className={styles.formInput}
                                            disabled={isLoading}
                                        />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>
                                            Max Uses
                                        </label>
                                        <input
                                            type="number"
                                            value={maxUses}
                                            onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                            min="1"
                                            max="100"
                                            className={styles.formInput}
                                            disabled={isLoading}
                                        />
                                    </div>
                                </>
                            )}

                            <div className={styles.formGroup}>
                                <button
                                    onClick={handleCreateCode}
                                    className={styles.generateButton}
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Clock className={`${styles.buttonIcon} ${styles.animateSpin}`} />
                                    ) : (
                                        <Plus className={styles.buttonIcon} />
                                    )}
                                    {isLoading ? "Creating..." : "Generate Code"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className={styles.filtersSection}>
                        <div className={styles.searchBox}>
                            <Search className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="Search codes, users, emails..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.filterButtons}>
                            <button
                                onClick={() => setStatusFilter("all")}
                                className={`${styles.filterButton} ${statusFilter === "all" ? styles.active : ''}`}
                            >
                                All ({codes.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter("active")}
                                className={`${styles.filterButton} ${statusFilter === "active" ? styles.active : ''}`}
                            >
                                Active ({getStatusCount("active")})
                            </button>
                            <button
                                onClick={() => setStatusFilter("used")}
                                className={`${styles.filterButton} ${statusFilter === "used" ? styles.active : ''}`}
                            >
                                Used ({getStatusCount("used")})
                            </button>
                            <button
                                onClick={() => setStatusFilter("expired")}
                                className={`${styles.filterButton} ${statusFilter === "expired" ? styles.active : ''}`}
                            >
                                Expired ({getStatusCount("expired")})
                            </button>
                        </div>
                    </div>

                    {/* Codes Table */}
                    <div className={styles.tableContainer}>
                        <div className={styles.tableHeader}>
                            <h2 className={styles.tableTitle}>
                                Secret Codes
                                <span className={styles.tableCount}>({filteredCodes.length})</span>
                            </h2>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Code</th>
                                        <th>Status</th>
                                        <th>Usage</th>
                                        <th>Created</th>
                                        <th>Expires</th>
                                        <th>Used By</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCodes.map((code) => {
                                        const status = getCodeStatus(code);
                                        return (
                                            <tr key={code.id} className={styles.tableRow}>
                                                <td>
                                                    <div className={styles.codeCell}>
                                                        <code className={styles.codeDisplay}>
                                                            {code.code}
                                                        </code>
                                                        <button
                                                            onClick={() => handleCopyCode(code.code)}
                                                            className={styles.copyButton}
                                                        >
                                                            {copiedCode === code.code ? (
                                                                <CheckCircle className={styles.copyIcon} />
                                                            ) : (
                                                                <Copy className={styles.copyIcon} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`${styles.statusBadge} ${styles[`status${status.charAt(0).toUpperCase() + status.slice(1)}`]}`}>
                                                        {status === "active" && <CheckCircle className={styles.statusIcon} />}
                                                        {status === "used" && <CheckCircle className={styles.statusIcon} />}
                                                        {status === "expired" && <XCircle className={styles.statusIcon} />}
                                                        {status}
                                                    </span>
                                                </td>
                                                <td>
                                                    <span className={styles.usageBadge}>
                                                        {formatUsage(code)}
                                                    </span>
                                                </td>
                                                <td>
                                                    <div className={styles.dateCell}>
                                                        {code.createdAt.toLocaleDateString()}
                                                        <span className={styles.timeText}>
                                                            {code.createdAt.toLocaleTimeString()}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    {code.expiresAt ? (
                                                        <div className={styles.dateCell}>
                                                            {code.expiresAt.toLocaleDateString()}
                                                            <span className={styles.timeText}>
                                                                {code.expiresAt.toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className={styles.emptyValue}>Never</span>
                                                    )}
                                                </td>
                                                <td>
                                                    {renderUserInfo(code)}
                                                </td>
                                                <td>
                                                    <div className={styles.actionButtons}>
                                                        <button
                                                            onClick={() => handleCopyCode(code.code)}
                                                            className={styles.actionButton}
                                                            title="Copy code"
                                                        >
                                                            <Copy className={styles.actionIcon} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteCode(code.id)}
                                                            className={`${styles.actionButton} ${styles.deleteButton}`}
                                                            title="Delete code"
                                                        >
                                                            <Trash2 className={styles.actionIcon} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {filteredCodes.length === 0 && !isLoading && (
                            <div className={styles.emptyState}>
                                <Key className={styles.emptyIcon} />
                                <p className={styles.emptyTitle}>No codes found</p>
                                <p className={styles.emptyDescription}>
                                    {searchTerm || statusFilter !== "all"
                                        ? "Try adjusting your search or filters"
                                        : "Generate your first code to get started"
                                    }
                                </p>
                            </div>
                        )}

                        {isLoading && filteredCodes.length === 0 && (
                            <div className={styles.loadingState}>
                                <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                                <p>Loading codes...</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecretCodesPage;