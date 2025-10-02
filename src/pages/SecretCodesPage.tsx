import React, { useState, useEffect } from "react";
import { Key, Copy, Trash2, Plus, CheckCircle, XCircle, Clock, User } from "lucide-react";
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
    userId?: string;
    sessionId?: string;
    user?: {
        email?: string;
        name?: string;
        discordId?: string;
        createdAt?: Date;
    };
}

export const SecretCodesPage: React.FC = () => {
    const [codes, setCodes] = useState<SecretCode[]>([]);
    const [newCode, setNewCode] = useState("");
    const [expiryDays, setExpiryDays] = useState<number>(30);
    const [copiedCode, setCopiedCode] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Загрузка кодов из базы данных с информацией о пользователях
    useEffect(() => {
        const loadCodesFromDatabase = async () => {
            try {
                const token = localStorage.getItem('authToken');
                if (!token) {
                    console.error("No auth token found");
                    return;
                }

                const response = await fetch("http://localhost:4000/api/secret-codes?include=user", { // ← добавили параметр
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    const dbCodes = await response.json();
                    const formattedCodes: SecretCode[] = dbCodes.map((code: any) => ({
                        ...code,
                        createdAt: new Date(code.createdAt),
                        usedAt: code.usedAt ? new Date(code.usedAt) : undefined,
                        expiresAt: code.expiresAt ? new Date(code.expiresAt) : undefined,
                        // Добавляем информацию о пользователе
                        user: code.user ? {
                            email: code.user.email,
                            name: code.user.name,
                            discordId: code.user.discordId,
                            createdAt: code.user.createdAt ? new Date(code.user.createdAt) : undefined
                        } : undefined
                    }));
                    setCodes(formattedCodes);
                    localStorage.setItem("moderator_secret_codes", JSON.stringify(formattedCodes));
                } else {
                    throw new Error(`Failed to load codes: ${response.status}`);
                }
            } catch (error) {
                console.error("Error loading codes from database:", error);
                // Fallback to localStorage...
            }
        };

        loadCodesFromDatabase();
    }, []);


    // Сохранение кодов в localStorage (для синхронизации)
    const saveCodes = (updatedCodes: SecretCode[]) => {
        setCodes(updatedCodes);
        localStorage.setItem("moderator_secret_codes", JSON.stringify(updatedCodes));
    };

    // Генерация случайного кода
    const generateSecureCode = () => {
        const length = 16; // Фиксированная длина
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

        // Используем crypto.getRandomValues для криптографической безопасности
        const randomValues = new Uint32Array(length);
        crypto.getRandomValues(randomValues);

        let result = "";

        for (let i = 0; i < length; i++) {
            const charIndex = randomValues[i] % chars.length;
            result += chars[charIndex];

            // Добавляем дефисы каждые 4 символа для читаемости
            if ((i + 1) % 4 === 0 && i !== length - 1) {
                result += "-";
            }
        }

        return result;
    };

    // Создание нового кода
    const handleCreateCode = async () => {
        if (codes.length >= 50) {
            alert("Maximum number of codes (50) reached");
            return;
        }

        if (!newCode.trim() && !window.confirm("Generate a random code?")) {
            return;
        }

        setIsLoading(true);

        const code = newCode.trim() || generateSecureCode();
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + expiryDays);

        try {
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("No authentication token found");
            }

            console.log("Creating code:", {
                code: code,
                expiresAt: expiryDays > 0 ? expiryDate.toISOString() : null,
                maxUses: 1
            });

            // 1. Сохраняем в базу данных
            const response = await fetch("http://localhost:4000/api/secret-codes", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    code: code,
                    expiresAt: expiryDays > 0 ? expiryDate.toISOString() : null,
                    maxUses: 1
                })
            });

            console.log("Response status:", response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Error response:", errorText);
                let errorData;
                try {
                    errorData = JSON.parse(errorText);
                } catch {
                    errorData = { error: errorText };
                }
                throw new Error(errorData.error || `Failed to save code: ${response.status}`);
            }

            const savedCode = await response.json();
            console.log("Saved code:", savedCode);

            // 2. Обновляем локальное состояние с ID из базы данных
            const codeWithDbId: SecretCode = {
                id: savedCode.id,
                code: savedCode.code,
                createdBy: savedCode.createdBy,
                createdAt: new Date(savedCode.createdAt),
                used: savedCode.used,
                usedBy: savedCode.usedBy,
                usedAt: savedCode.usedAt ? new Date(savedCode.usedAt) : undefined,
                expiresAt: savedCode.expiresAt ? new Date(savedCode.expiresAt) : undefined,
                user: savedCode.user
            };

            const updatedCodes = [codeWithDbId, ...codes];
            saveCodes(updatedCodes);
            setNewCode("");

        } catch (error) {
            console.error("Error creating secret code:", error);
            alert(error instanceof Error ? error.message : "Failed to create secret code. Please try again.");
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
            const token = localStorage.getItem('authToken');
            if (!token) {
                throw new Error("No authentication token found");
            }

            const response = await fetch(`http://localhost:4000/api/secret-codes/${id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error("Failed to delete code from database");
            }

            // Обновляем локальное состояние
            const updatedCodes = codes.filter(code => code.id !== id);
            saveCodes(updatedCodes);

        } catch (error) {
            console.error("Error deleting secret code:", error);
            alert("Failed to delete secret code. Please try again.");
        }
    };

    // Статистика
    const stats = {
        total: codes.length,
        active: codes.filter(code => !code.used && (!code.expiresAt || new Date() < code.expiresAt)).length,
        used: codes.filter(code => code.used).length,
        expired: codes.filter(code => code.expiresAt && new Date() > code.expiresAt && !code.used).length,
    };

    const getCodeStatus = (code: SecretCode) => {
        if (code.used) return "used";
        if (code.expiresAt && new Date() > code.expiresAt) return "expired";
        return "active";
    };

    const renderUserInfo = (code: SecretCode) => {
        // Используем code.user вместо code.userInfo
        if (!code.used || !code.user) {
            return "—";
        }

        return (
            <div className="user-info">
                <div className="user-info-main">
                    <User className="w-3 h-3" />
                    {code.user.name || code.user.email || code.usedBy}
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

    return (
        <div className="secret-codes-page-container">
            <Sidebars />
            <div className="secret-codes-content-area">
                <div className="secret-codes-fullscreen">
                    <div className="secret-codes-header">
                        <h1 className="secret-codes-title">
                            <Key className="w-8 h-8" />
                            Secret Codes Management
                        </h1>
                        <p className="secret-codes-subtitle">
                            Generate and manage secret codes for moderator registration
                        </p>
                    </div>

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
                                    Used & Expired Codes
                                </h2>
                            </div>
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Code</th>
                                            <th>Status</th>
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
                                                    {renderUserInfo(code)}
                                                </td>
                                                <td className="whitespace-nowrap text-sm">
                                                    {code.usedAt ? code.usedAt.toLocaleDateString() : "N/A"}
                                                </td>
                                                <td className="whitespace-nowrap text-sm">
                                                    {/* ИСПРАВЛЕНО: используем code.user вместо code.userInfo */}
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

                    {codes.length === 0 && (
                        <div className="empty-state">
                            <Key className="empty-icon" />
                            <p className="empty-title">No secret codes generated yet</p>
                            <p className="empty-description">Create your first code using the form above</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SecretCodesPage;