import React, { useState, useEffect } from "react";
import { Key, Copy, Trash2, Plus, CheckCircle, XCircle, Clock, User, AlertCircle, RefreshCw } from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import "../components/CSS/SecretCodesPage.css";

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

export const SecretCodesPage: React.FC = () => {
    const [codes, setCodes] = useState<SecretCode[]>([]);
    const [newCode, setNewCode] = useState("");
    const [expiryDays, setExpiryDays] = useState<number>(30);
    const [maxUses, setMaxUses] = useState<number>(1);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        used: 0,
        expired: 0,
        usageRate: 0
    });

    // Получение токена
    const getAuthToken = (): string => {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
            throw new Error("No authentication token found");
        }
        return token;
    };

    // Загрузка кодов из базы данных
    const loadCodesFromDatabase = async () => {
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
            localStorage.setItem("moderator_secret_codes", JSON.stringify(formattedCodes));
            
        } catch (error) {
            console.error("Error loading codes from database:", error);
            setError(error instanceof Error ? error.message : "Failed to load codes from database");
            
            // Fallback to localStorage
            const localCodes = localStorage.getItem("moderator_secret_codes");
            if (localCodes) {
                const parsedCodes = JSON.parse(localCodes);
                setCodes(parsedCodes.map((code: any) => ({
                    ...code,
                    createdAt: new Date(code.createdAt),
                    usedAt: code.usedAt ? new Date(code.usedAt) : undefined,
                    expiresAt: code.expiresAt ? new Date(code.expiresAt) : undefined
                })));
            }
        } finally {
            setIsLoading(false);
        }
    };

    // Загрузка статистики
    const loadStats = async () => {
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
            const localStats = {
                total: codes.length,
                active: codes.filter(code => !code.used && (!code.expiresAt || new Date() < code.expiresAt)).length,
                used: codes.filter(code => code.used).length,
                expired: codes.filter(code => code.expiresAt && new Date() > code.expiresAt && !code.used).length,
                usageRate: codes.length > 0 ? (codes.filter(code => code.used).length / codes.length) * 100 : 0
            };
            setStats(localStats);
        }
    };

    useEffect(() => {
        loadCodesFromDatabase();
    }, []);

    useEffect(() => {
        if (codes.length > 0) {
            loadStats();
        }
    }, [codes]);

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
        const length = 12;
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
        if (codes.length >= 100) {
            alert("Maximum number of codes (100) reached");
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

            console.log("Creating code:", codeData);

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
            console.log("Saved code:", savedCode);

            // Обновляем локальное состояние
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
            
            // Обновляем статистику
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
        if (!window.confirm("Are you sure you want to delete this code?")) {
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

            // Обновляем локальное состояние
            const updatedCodes = codes.filter(code => code.id !== id);
            setCodes(updatedCodes);
            localStorage.setItem("moderator_secret_codes", JSON.stringify(updatedCodes));
            
            // Обновляем статистику
            loadStats();

        } catch (error) {
            console.error("Error deleting secret code:", error);
            setError(error instanceof Error ? error.message : "Failed to delete secret code");
        }
    };

    const getCodeStatus = (code: SecretCode) => {
        if (code.used) return "used";
        if (code.expiresAt && new Date() > code.expiresAt) return "expired";
        return "active";
    };

    const renderUserInfo = (code: SecretCode) => {
        if (!code.used || !code.user) {
            return "—";
        }

        return (
            <div className="user-info">
                <div className="user-info-main">
                    <User className="w-3 h-3" />
                    {code.user.name || code.user.nickname || code.user.email || code.usedBy}
                </div>
                {code.user.discordId && (
                    <div className="user-info-discord">
                        Discord: {code.user.discordId}
                    </div>
                )}
                {code.user.createdAt && (
                    <div className="user-info-date">
                        Registered: {new Date(code.user.createdAt).toLocaleDateString()}
                    </div>
                )}
            </div>
        );
    };

    const formatUsage = (code: SecretCode) => {
        if (!code.maxUses && !code.uses) return "1/1";
        return `${code.uses || 0}/${code.maxUses || 1}`;
    };

    return (
        <div className="secret-codes-page-container">
            <Sidebars />
            <div className="secret-codes-content-area">
                <div className="secret-codes-fullscreen">
                    <div className="secret-codes-header">
                        <div className="header-top">
                            <h1 className="secret-codes-title">
                                <Key className="w-8 h-8" />
                                Secret Codes Management
                            </h1>
                            <button 
                                onClick={loadCodesFromDatabase} 
                                className="refresh-button"
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </button>
                        </div>
                        <p className="secret-codes-subtitle">
                            Generate and manage secret codes for moderator registration
                        </p>
                    </div>

                    {/* Отображение ошибок */}
                    {error && (
                        <div className="error-banner">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                            <button onClick={() => setError(null)} className="error-close">
                                ×
                            </button>
                        </div>
                    )}

                    {/* Статистика */}
                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-number">{stats.total}</div>
                            <div className="stat-label">Total Codes</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number stat-active">{stats.active}</div>
                            <div className="stat-label">Active</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number stat-used">{stats.used}</div>
                            <div className="stat-label">Used</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number stat-expired">{stats.expired}</div>
                            <div className="stat-label">Expired</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-number">
                                {stats.usageRate.toFixed(1)}%
                            </div>
                            <div className="stat-label">Usage Rate</div>
                        </div>
                    </div>

                    {/* Генератор кодов */}
                    <div className="code-generator">
                        <h2 className="generator-title">
                            Generate New Code
                        </h2>
                        <div className="generator-grid">
                            <div className="form-group">
                                <label className="form-label">
                                    Custom Code (optional)
                                </label>
                                <input
                                    type="text"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                    placeholder="Leave empty for auto-generation"
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Expiry Days (0 = never)
                                </label>
                                <input
                                    type="number"
                                    value={expiryDays}
                                    onChange={(e) => setExpiryDays(parseInt(e.target.value) || 0)}
                                    min="0"
                                    max="365"
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">
                                    Max Uses
                                </label>
                                <input
                                    type="number"
                                    value={maxUses}
                                    onChange={(e) => setMaxUses(parseInt(e.target.value) || 1)}
                                    min="1"
                                    max="100"
                                    className="form-input"
                                    disabled={isLoading}
                                />
                            </div>
                            <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                                <button
                                    onClick={handleCreateCode}
                                    className="generate-button"
                                    disabled={isLoading}
                                >
                                    {isLoading ? (
                                        <Clock className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Plus className="w-4 h-4" />
                                    )}
                                    {isLoading ? "Creating..." : "Generate Code"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Список активных кодов */}
                    <div className="codes-table-container">
                        <div className="table-header">
                            <h2 className="table-title">
                                Active Codes ({stats.active})
                            </h2>
                        </div>
                        <div className="table-container">
                            <table className="table">
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
                                    {codes.filter(code => getCodeStatus(code) === "active").map((code) => (
                                        <tr key={code.id}>
                                            <td>
                                                <code className="code-display">
                                                    {code.code}
                                                </code>
                                            </td>
                                            <td>
                                                <span className="status-badge status-active">
                                                    <CheckCircle className="w-3 h-3" />
                                                    Active
                                                </span>
                                            </td>
                                            <td>
                                                <span className="usage-badge">
                                                    {formatUsage(code)}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap text-sm">
                                                {code.createdAt.toLocaleDateString()}
                                            </td>
                                            <td className="whitespace-nowrap text-sm">
                                                {code.expiresAt ? code.expiresAt.toLocaleDateString() : "Never"}
                                            </td>
                                            <td>
                                                {renderUserInfo(code)}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button
                                                        onClick={() => handleCopyCode(code.code)}
                                                        className="action-button copy-button"
                                                    >
                                                        {copiedCode === code.code ? (
                                                            <>Copied!</>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" />
                                                                Copy
                                                            </>
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteCode(code.id)}
                                                        className="action-button delete-button"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Использованные/просроченные коды */}
                    {(stats.used > 0 || stats.expired > 0) && (
                        <div className="codes-table-container">
                            <div className="table-header">
                                <h2 className="table-title">
                                    Used & Expired Codes ({stats.used + stats.expired})
                                </h2>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Status</th>
                                            <th>Usage</th>
                                            <th>Used By</th>
                                            <th>Used At</th>
                                            <th>Registration Date</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {codes.filter(code => getCodeStatus(code) !== "active").map((code) => (
                                            <tr key={code.id}>
                                                <td>
                                                    <code className="code-display used">
                                                        {code.code}
                                                    </code>
                                                </td>
                                                <td>
                                                    {getCodeStatus(code) === "used" ? (
                                                        <span className="status-badge status-used">
                                                            <CheckCircle className="w-3 h-3" />
                                                            Used
                                                        </span>
                                                    ) : (
                                                        <span className="status-badge status-expired">
                                                            <XCircle className="w-3 h-3" />
                                                            Expired
                                                        </span>
                                                    )}
                                                </td>
                                                <td>
                                                    <span className="usage-badge">
                                                        {formatUsage(code)}
                                                    </span>
                                                </td>
                                                <td>
                                                    {renderUserInfo(code)}
                                                </td>
                                                <td className="whitespace-nowrap text-sm">
                                                    {code.usedAt ? code.usedAt.toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap text-sm">
                                                    {code.user?.createdAt ? new Date(code.user.createdAt).toLocaleDateString() : "N/A"}
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => handleDeleteCode(code.id)}
                                                        className="action-button delete-button"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {codes.length === 0 && !isLoading && (
                        <div className="empty-state">
                            <Key className="empty-icon" />
                            <p className="empty-title">No secret codes generated yet</p>
                            <p className="empty-description">Create your first code using the form above</p>
                        </div>
                    )}

                    {isLoading && codes.length === 0 && (
                        <div className="loading-state">
                            <RefreshCw className="loading-icon animate-spin" />
                            <p>Loading codes...</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecretCodesPage;