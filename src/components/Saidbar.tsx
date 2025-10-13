import React, { useCallback, useEffect, useMemo, useRef, useState, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Home, Users, MessageCircle, Zap, Settings, LogOut, Bell,
    LayoutDashboard, Search, Sparkles, Shield, Bot, Code,
    BarChart3, FileText, HelpCircle, Mail, User, AlertTriangle,
    Crown, ShieldCheck, Star,
    ChevronLeft,
    ChevronRight
} from "lucide-react";
import styles from "../styles/components/Sidebar.module.scss";
import DiscordProfileCard from "./DiscordProfileCard.js";
import { getUserFromToken, type UserFromToken } from "@/utils/jwtClient.js";
import {
    hasRoleAccess,
    ROLE_IDS,
    ROLE_MAPPING,
    convertRoleIdsToNames,
} from "@/utils/discordRoles.js";
import { SidebarContext } from "../App.js"; // Импортируем контекст

export type SidebarId =
    | "dashboard"
    | "overview"
    | "users"
    | "channels"
    | "commands"
    | "bot"
    | "settings"
    | "notifications"
    | "secret-codes"
    | "analytics"
    | "reports"
    | "support"
    | "profile";

interface MenuItem {
    id: SidebarId;
    title: string;
    icon: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
    path?: string;
    category?: string;
    isNew?: boolean;
    isPro?: boolean;
    requiredRoles?: string[];
    description?: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    nickname: string;
    discordId: string | null;
    emailVerified: boolean;
    discordCreatedAt?: string;
    avatar?: string;
    highestRole: string;
    roleColor: number;
    roleHexColor: string;
    allRoles: string[];
    profileUrl: string;
    status: "online" | "idle" | "dnd" | "offline";
    discordConnected: boolean;
}

// Расширяем тип UserFromToken чтобы включить недостающие поля
interface ExtendedUserFromToken extends UserFromToken {
    discordId?: string;
    avatar?: string;
    discordCreatedAt?: string;
}

interface SidebarProps {
    initialCollapsed?: boolean;
    onNavigate?: (id: SidebarId) => void;
    onLogout?: () => Promise<void>;
    active?: SidebarId;
    className?: string;
    user?: User | null;
    authToken?: string;
    onCollapseChange?: (collapsed: boolean) => void;
    collapsed?: boolean;
}

const STORAGE_KEY = "sentinel_sidebar_state_v2";

// Modern menu structure with Discord role-based access
const MENU_STRUCTURE: MenuItem[] = [
    // Core - доступно всем авторизованным пользователям
    {
        id: "dashboard",
        title: "Dashboard",
        icon: <LayoutDashboard size={20} />,
        category: "core",
        description: "Главная панель управления"
    },
    {
        id: "overview",
        title: "Overview",
        icon: <Home size={20} />,
        category: "core",
        description: "Обзор сервера"
    },

    // Management - требуется определенные роли Discord
    {
        id: "users",
        title: "User Management",
        icon: <Users size={20} />,
        badge: "12",
        category: "management",
        requiredRoles: [ROLE_IDS.MODERATOR, ROLE_IDS.SENIOR_MODERATOR, ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Управление пользователями"
    },
    {
        id: "channels",
        title: "Channels",
        icon: <MessageCircle size={20} />,
        category: "management",
        requiredRoles: [ROLE_IDS.MODERATOR, ROLE_IDS.SENIOR_MODERATOR, ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Управление каналами"
    },
    {
        id: "commands",
        title: "Commands",
        icon: <Zap size={20} />,
        isNew: true,
        category: "management",
        requiredRoles: [ROLE_IDS.SENIOR_MODERATOR, ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Управление командами бота"
    },

    // Bot - требуется высшие роли администратора
    {
        id: "bot",
        title: "Bot Settings",
        icon: <Bot size={20} />,
        category: "bot",
        requiredRoles: [ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Настройки бота"
    },
    {
        id: "secret-codes",
        title: "Secret Codes",
        icon: <Code size={20} />,
        category: "bot",
        requiredRoles: [ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Секретные коды и функции"
    },

    // Analytics - требуется доступ к аналитике
    {
        id: "analytics",
        title: "Analytics",
        icon: <BarChart3 size={20} />,
        category: "analytics",
        isPro: true,
        requiredRoles: [ROLE_IDS.SENIOR_MODERATOR, ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Аналитика сервера"
    },
    {
        id: "reports",
        title: "Reports",
        icon: <FileText size={20} />,
        category: "analytics",
        requiredRoles: [ROLE_IDS.MODERATOR, ROLE_IDS.SENIOR_MODERATOR, ROLE_IDS.CHIEF_ADMIN, ROLE_IDS.BOT_DEVELOPER],
        description: "Отчеты и статистика"
    },

    // System - доступно всем авторизованным пользователям
    {
        id: "notifications",
        title: "Notifications",
        icon: <Bell size={20} />,
        badge: "3",
        category: "system",
        description: "Уведомления системы"
    },
    {
        id: "settings",
        title: "Settings",
        icon: <Settings size={20} />,
        category: "system",
        description: "Настройки профиля"
    },
    {
        id: "support",
        title: "Support",
        icon: <HelpCircle size={20} />,
        category: "system",
        description: "Поддержка и помощь"
    },
];

const Sidebar: React.FC<SidebarProps> = ({
    initialCollapsed = false,
    onNavigate,
    onLogout,
    active: externalActive,
    className,
    user = null,
    authToken,
    onCollapseChange,
    collapsed: externalCollapsed
}) => {

    const navigate = useNavigate();
    const location = useLocation();

    // Используем контекст для глобального управления сайдбаром
    const sidebarContext = useContext(SidebarContext);
    const isGloballyCollapsed = sidebarContext?.isCollapsed || false;
    const toggleGlobalSidebar = sidebarContext?.toggleSidebar;

    const [internalCollapsed, setInternalCollapsed] = useState<boolean>(initialCollapsed);

    // Приоритет: внешний проп > глобальный контекст > внутреннее состояние
    const collapsed = externalCollapsed !== undefined
        ? externalCollapsed
        : isGloballyCollapsed !== undefined
            ? isGloballyCollapsed
            : internalCollapsed;

    const [searchQuery, setSearchQuery] = useState<string>("");
    const [hoverTip, setHoverTip] = useState<{ text: string; position: number } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);
    const [jwtUser, setJwtUser] = useState<ExtendedUserFromToken | null>(null);
    const [loadingUser, setLoadingUser] = useState<boolean>(true);

    const handleCollapse = (newCollapsed: boolean) => {
        if (externalCollapsed === undefined) {
            // Если есть глобальный контекст - используем его
            if (toggleGlobalSidebar) {
                // Переключаем глобальное состояние
                if (newCollapsed !== isGloballyCollapsed) {
                    toggleGlobalSidebar();
                }
            } else {
                // Если управление внутреннее
                setInternalCollapsed(newCollapsed);
            }
        } else {
            // Если управление внешнее - вызываем callback
            onCollapseChange?.(newCollapsed);
        }
    };

    const getActiveIdFromPath = useCallback((): SidebarId => {
        const path = location.pathname;

        // Извлекаем последнюю часть пути
        const pathSegments = path.split('/').filter(segment => segment);

        // Если путь заканчивается на /dashboard, то это dashboard
        if (pathSegments.length === 1 && pathSegments[0] === 'dashboard') {
            return 'dashboard';
        }

        const currentSection = pathSegments[pathSegments.length - 1] as SidebarId;

        // Проверяем, существует ли такой ID в нашем меню
        const isValidId = MENU_STRUCTURE.some(item => item.id === currentSection);

        const activeId = isValidId ? currentSection : 'overview';

        return activeId;
    }, [location.pathname]);

    const [active, setActive] = useState<SidebarId>(() => {
        // Если передан externalActive, используем его, иначе определяем из URL
        return externalActive ?? getActiveIdFromPath();
    });

    // Эффект для обновления активного состояния при изменении URL
    useEffect(() => {
        if (externalActive === undefined) {
            const newActive = getActiveIdFromPath();
            setActive(newActive);
        }
    }, [location.pathname, externalActive, getActiveIdFromPath]);

    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Получаем пользователя из JWT токена
    useEffect(() => {
        const token = authToken || localStorage.getItem('auth_token');

        if (token) {
            try {
                const userFromToken = getUserFromToken(token) as ExtendedUserFromToken;
                setJwtUser(userFromToken);
            } catch (error) {
                console.error('❌ Error parsing user from token:', error);
                setJwtUser(null);
            }
        } else {
            console.log('No token found');
        }
        setLoadingUser(false);
    }, [authToken]);

    // Приоритет: user из пропсов -> user из JWT -> null
    const currentUser = useMemo(() => {
        if (user) {
            return user;
        }
        if (jwtUser) {

            return {
                id: jwtUser.id,
                name: jwtUser.name,
                email: jwtUser.email,
                nickname: jwtUser.name,
                discordId: jwtUser.discordId || null,
                emailVerified: true,
                avatar: jwtUser.avatar || "https://cdn.discordapp.com/embed/avatars/0.png",
                highestRole: jwtUser.highestRole,
                roleColor: jwtUser.roleColor,
                roleHexColor: jwtUser.roleHexColor,
                allRoles: jwtUser.allRoles || ['@everyone'],
                profileUrl: "/dashboard/profile",
                status: "online" as const,
                discordConnected: !!jwtUser.discordId,
                discordCreatedAt: jwtUser.discordCreatedAt // Добавляем это поле
            };
        }

        return null;
    }, [user, jwtUser]);

    // Улучшенная проверка прав доступа
    const hasRequiredRole = useCallback((requiredRoles?: string[]): boolean => {
        // Если роли не требуются - доступ открыт
        if (!requiredRoles || requiredRoles.length === 0) return true;

        // Если пользователь не загружен или нет ролей - доступ закрыт
        if (!currentUser || !currentUser.allRoles || currentUser.allRoles.length === 0) {

            return false;
        }

        // Используем упрощенную логику проверки прав
        const hasAccess = hasRoleAccess(currentUser.allRoles, requiredRoles);

        return hasAccess;
    }, [currentUser]);

    // Filter menu items based on search and user roles
    const filteredMenu = useMemo(() => {
        let filtered = MENU_STRUCTURE;

        // Apply role-based filtering
        filtered = filtered.filter(item => {
            const hasAccess = hasRequiredRole(item.requiredRoles);
            return hasAccess;
        });

        // Apply search filtering
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query) ||
                item.description?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [searchQuery, hasRequiredRole]);

    // Debug эффект
    useEffect(() => {
    }, [currentUser, loadingUser, authToken, filteredMenu]);

    // Group menu items by category
    const groupedMenu = useMemo(() => {
        const groups: Record<string, MenuItem[]> = {};

        filteredMenu.forEach(item => {
            const category = item.category || 'uncategorized';
            if (!groups[category]) {
                groups[category] = [];
            }
            groups[category].push(item);
        });

        return groups;
    }, [filteredMenu]);

    // Navigation handler
    const navigateTo = useCallback((id: SidebarId, item: MenuItem) => {
        if (externalActive === undefined) {
            setActive(id);
        }

        onNavigate?.(id);

        if (item.path) {
            window.location.href = item.path;
        } else {
            // Исправляем логику навигации чтобы избежать дублирования
            const targetPath = id === 'dashboard' ? '/dashboard' : `/dashboard/${id}`;
            navigate(targetPath);
        }
    }, [externalActive, onNavigate, navigate]);

    // Get role badge color
    const getRoleBadgeColor = useCallback(() => {
        if (!currentUser) return '#99AAB5';
        return currentUser.roleHexColor;
    }, [currentUser]);

    // Render role icon based on highest role
    const renderRoleIcon = useCallback(() => {
        if (!currentUser) return <User size={14} />;

        const highestRole = currentUser.highestRole;
        switch (highestRole) {
            case "Bot Developer":
                return <Code size={14} />;
            case "Chief Administrator":
                return <Crown size={14} />;
            case "Senior Moderator":
                return <ShieldCheck size={14} />;
            case "Moderator":
                return <Star size={14} />;
            default:
                return <User size={14} />;
        }
    }, [currentUser]);

    const handleMouseEnter = useCallback((text: string, position: number) => {
        setHoverTip({ text, position });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverTip(null);
    }, []);

    // Enhanced logout handler with API integration
    const handleLogout = useCallback(async () => {
        if (!showLogoutConfirm) {
            setShowLogoutConfirm(true);

            logoutTimeoutRef.current = setTimeout(() => {
                setShowLogoutConfirm(false);
            }, 3000);

            return;
        }

        setIsLoggingOut(true);
        setShowLogoutConfirm(false);

        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current);
        }

        try {
            if (onLogout) {
                await onLogout();
            } else {
                await performLogout();
            }
        } catch (error) {
            console.error('Logout failed:', error);
            performClientSideLogout();
        } finally {
            setIsLoggingOut(false);
        }
    }, [showLogoutConfirm, onLogout]);

    // API-based logout
    const performLogout = async () => {
        const sessionToken = localStorage.getItem('session_token');

        if (sessionToken) {
            try {
                const response = await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({ sessionToken })
                });

                if (!response.ok) {
                    throw new Error('Logout API call failed');
                }
            } catch (error) {
                console.warn('API logout failed, falling back to client-side logout:', error);
            }
        }

        performClientSideLogout();
    };

    // Client-side logout cleanup
    const performClientSideLogout = () => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');
        localStorage.removeItem(STORAGE_KEY);
        window.location.href = '/login';
    };

    // Cancel logout confirmation
    const cancelLogout = useCallback(() => {
        setShowLogoutConfirm(false);
        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current);
        }
    }, []);

    // Render category section
    const renderCategory = useCallback((category: string, items: MenuItem[]) => {
        const categoryLabels: Record<string, string> = {
            core: "Core",
            management: "Management",
            bot: "Bot Controls",
            analytics: "Analytics",
            system: "System"
        };

        return (
            <div key={category} className={styles.category}>
                {!collapsed && (
                    <div className={styles.categoryLabel}>
                        {categoryLabels[category] || category}
                    </div>
                )}
                {items.map((item, index) => {
                    const isActive = active === item.id;
                    const globalIndex = MENU_STRUCTURE.findIndex(m => m.id === item.id);
                    const hasAccess = hasRequiredRole(item.requiredRoles);

                    return (
                        <button
                            key={item.id}
                            ref={(el) => {
                                itemRefs.current[globalIndex] = el;
                            }}
                            className={`${styles.navItem} ${isActive ? styles.active : ""} ${!hasAccess ? styles.disabled : ""}`}
                            onClick={() => hasAccess && !item.disabled && navigateTo(item.id, item)}
                            onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const description = item.description || item.title;
                                handleMouseEnter(description, rect.top);
                            }}
                            onMouseLeave={handleMouseLeave}
                            aria-current={isActive ? "page" : undefined}
                            aria-disabled={!hasAccess || item.disabled || undefined}
                            title={collapsed ? (item.description || item.title) : !hasAccess ? "Insufficient permissions" : (item.description || item.title)}
                            disabled={!hasAccess || item.disabled}
                        >
                            <span className={styles.icon}>
                                {item.icon}
                                {!hasAccess && (
                                    <span title="Insufficient permissions">
                                        <AlertTriangle size={12} className={styles.lockIcon} />
                                    </span>
                                )}
                            </span>

                            {!collapsed && (
                                <span className={styles.content}>
                                    <span className={styles.label}>
                                        {item.title}
                                        {loadingUser && item.requiredRoles && (
                                            <span className={styles.loadingDot}>...</span>
                                        )}
                                    </span>

                                    <span className={styles.meta}>
                                        {item.isNew && (
                                            <span className={styles.newBadge}>
                                                <Sparkles size={12} />
                                            </span>
                                        )}
                                        {item.isPro && (
                                            <span className={styles.proBadge}>
                                                PRO
                                            </span>
                                        )}
                                    </span>
                                </span>
                            )}

                            {item.badge !== undefined && (
                                <span className={styles.badge}>
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        );
    }, [active, collapsed, navigateTo, handleMouseEnter, handleMouseLeave, hasRequiredRole, loadingUser]);

    // Default user data for fallback
    const defaultUser: User = {
        id: 0,
        name: "Guest User",
        email: "guest@example.com",
        nickname: "guest",
        discordId: null,
        emailVerified: false,
        avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
        highestRole: "@everyone",
        roleColor: 0,
        roleHexColor: "#99AAB5",
        allRoles: ["@everyone"],
        profileUrl: "/dashboard/profile",
        status: "online",
        discordConnected: false
    };

    const displayUser = currentUser || defaultUser;

    return (
        <>
            {/* Mobile Overlay */}
            {!collapsed && (
                <div
                    className={styles.overlay}
                    onClick={() => handleCollapse(true)}
                    aria-hidden="true"
                />
            )}

            <aside
                ref={containerRef}
                className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.expanded} ${className || ""}`}
                aria-label="Main navigation"
            >
                {/* Header */}
                <header className={styles.header}>
                    {!collapsed && (
                        <div className={styles.brand}>
                            <div className={styles.logo}>
                                <Shield size={24} />
                                <span className={styles.logoText}>Sentinel</span>
                                {loadingUser && (
                                    <span className={styles.rolesLoading} title="Loading user...">
                                        ...
                                    </span>
                                )}
                            </div>
                            <div className={styles.brandSubtitle}>Discord Moderation Platform</div>
                            {currentUser && currentUser.highestRole !== '@everyone' && !collapsed && (
                                <div
                                    className={styles.roleBadge}
                                    style={{ backgroundColor: getRoleBadgeColor() }}
                                    title={`Your role: ${currentUser.highestRole}`}
                                >
                                    {renderRoleIcon()}
                                    <span>{currentUser.highestRole}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <button
                        className={styles.collapseBtn}
                        onClick={() => handleCollapse(!collapsed)}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        title={collapsed ? "Expand" : "Collapse"}
                    >
                        {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                </header>

                {/* Search */}
                {!collapsed && (
                    <div className={styles.search}>
                        <Search size={16} className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery("")}
                                className={styles.clearSearch}
                                aria-label="Clear search"
                            >
                                ×
                            </button>
                        )}
                    </div>
                )}

                {/* Navigation */}
                <nav className={styles.nav} aria-label="Main menu">
                    {loadingUser ? (
                        <div className={styles.loadingRoles}>
                            <div className={styles.loadingSpinner}></div>
                            Loading user data...
                        </div>
                    ) : (
                        <>
                            {Object.entries(groupedMenu).map(([category, items]) =>
                                renderCategory(category, items)
                            )}

                            {filteredMenu.length === 0 && (
                                <div className={styles.noResults}>
                                    {searchQuery ? `No results found for "${searchQuery}"` : "No accessible menu items"}
                                </div>
                            )}
                        </>
                    )}
                </nav>

                {/* Footer */}
                <footer className={styles.footer}>
                    {/* Profile card - теперь всегда кликабельный и ведет на профиль */}
                    <div
                        onClick={() => navigateTo("profile", {
                            id: "profile",
                            title: "My Profile",
                            icon: <User size={20} />,
                            category: "system",
                            description: "Мой профиль и настройки",
                            path: "/dashboard/profile"
                        })}
                        style={{ cursor: "pointer" }}
                        title="Click to view profile"
                    >
                        <DiscordProfileCard
                            nickname={displayUser.nickname}
                            discordId={displayUser.discordId || "0000"}
                            avatar={displayUser.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                            highestRole={displayUser.highestRole}
                            roleHexColor={getRoleBadgeColor()}
                            createdAt={displayUser.discordCreatedAt} // Теперь это поле существует
                            status={displayUser.status}
                        />
                    </div>

                    <div className={styles.footerActions}>
                        <button
                            className={styles.supportBtn}
                            aria-label="Get support"
                            title="Support"
                            onClick={(e) => {
                                e.stopPropagation();
                                navigateTo("support", {
                                    id: "support",
                                    title: "Support",
                                    icon: <HelpCircle size={20} />,
                                    category: "system",
                                    description: "Поддержка и помощь"
                                });
                            }}
                        >
                            <Mail size={16} />
                        </button>

                        <div className={styles.logoutContainer}>
                            <button
                                className={`${styles.logoutBtn} ${showLogoutConfirm ? styles.confirm : ""} ${isLoggingOut ? styles.loading : ""}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleLogout();
                                }}
                                disabled={isLoggingOut}
                                aria-label={showLogoutConfirm ? "Confirm logout" : "Logout"}
                                title={showLogoutConfirm ? "Click again to confirm" : "Logout"}
                            >
                                {isLoggingOut ? (
                                    <div className={styles.spinner} aria-label="Logging out...">
                                        <div className={styles.spinnerInner} />
                                    </div>
                                ) : (
                                    <LogOut size={16} />
                                )}
                                {!collapsed && (
                                    <span>
                                        {showLogoutConfirm ? "Confirm?" : "Logout"}
                                    </span>
                                )}
                            </button>

                            {showLogoutConfirm && !collapsed && (
                                <button
                                    className={styles.cancelLogoutBtn}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        cancelLogout();
                                    }}
                                    aria-label="Cancel logout"
                                    title="Cancel logout"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    </div>
                </footer>

                {/* Enhanced Tooltip */}
                {collapsed && hoverTip && (
                    <div
                        className={styles.tooltip}
                        style={{ top: hoverTip.position }}
                    >
                        {hoverTip.text}
                    </div>
                )}
            </aside>
        </>
    );
};

export default Sidebar;