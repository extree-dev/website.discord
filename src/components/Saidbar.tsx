import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
    Home,
    Users,
    MessageCircle,
    Zap,
    Settings,
    LogOut,
    Server,
    Bell,
    LayoutDashboard,
    Key,
    ChevronLeft,
    ChevronRight,
    Search,
    Sparkles,
    Shield,
    Bot,
    Code,
    BarChart3,
    FileText,
    HelpCircle,
    Mail,
    User,
    AlertTriangle
} from "lucide-react";
import styles from "../styles/components/Sidebar.module.scss";
import DiscordProfileCard from "./DiscordProfileCard.js";
import { verifyToken } from "@/utils/jwt.js";

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
    requiredRole?: string[];
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

interface SidebarProps {
    initialCollapsed?: boolean;
    onNavigate?: (id: SidebarId) => void;
    onLogout?: () => Promise<void>;
    active?: SidebarId;
    className?: string;
    user?: User | null;
    authToken?: string;
}

const STORAGE_KEY = "sentinel_sidebar_state_v2";

// Modern menu structure with role-based access
const MENU_STRUCTURE: MenuItem[] = [
    // Core - доступно всем
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={20} />, category: "core" },
    { id: "overview", title: "Overview", icon: <Home size={20} />, category: "core" },

    // Management - требуется роль модератора или выше
    {
        id: "users",
        title: "User Management",
        icon: <Users size={20} />,
        badge: "12",
        category: "management",
        requiredRole: ["Moderator", "Admin", "Owner"]
    },
    {
        id: "channels",
        title: "Channels",
        icon: <MessageCircle size={20} />,
        category: "management",
        requiredRole: ["Moderator", "Admin", "Owner"]
    },
    {
        id: "commands",
        title: "Commands",
        icon: <Zap size={20} />,
        isNew: true,
        category: "management",
        requiredRole: ["Moderator", "Admin", "Owner"]
    },

    // Bot - требуется роль администратора или выше
    {
        id: "bot",
        title: "Bot Settings",
        icon: <Bot size={20} />,
        category: "bot",
        requiredRole: ["Admin", "Owner"]
    },
    {
        id: "secret-codes",
        title: "Secret Codes",
        icon: <Code size={20} />,
        category: "bot",
        requiredRole: ["Admin", "Owner"]
    },

    // Analytics - PRO функция
    {
        id: "analytics",
        title: "Analytics",
        icon: <BarChart3 size={20} />,
        category: "analytics",
        isPro: true,
        requiredRole: ["Moderator", "Admin", "Owner"]
    },
    {
        id: "reports",
        title: "Reports",
        icon: <FileText size={20} />,
        category: "analytics",
        requiredRole: ["Moderator", "Admin", "Owner"]
    },

    // System - доступно всем авторизованным пользователям
    {
        id: "notifications",
        title: "Notifications",
        icon: <Bell size={20} />,
        badge: "3",
        category: "system"
    },
    { id: "settings", title: "Settings", icon: <Settings size={20} />, category: "system" },
    { id: "support", title: "Support", icon: <HelpCircle size={20} />, category: "system" },
];

const Sidebar: React.FC<SidebarProps> = ({
    initialCollapsed = false,
    onNavigate,
    onLogout,
    active: externalActive,
    className,
    user = null,
    authToken
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [active, setActive] = useState<SidebarId>(externalActive ?? "overview");
    const [collapsed, setCollapsed] = useState<boolean>(initialCollapsed);
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [hoverTip, setHoverTip] = useState<{ text: string; position: number } | null>(null);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
    const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

    const containerRef = useRef<HTMLDivElement>(null);
    const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [discordUser, setDiscordUser] = useState<User | null>(null);
    const [loadingDiscord, setLoadingDiscord] = useState(true);

    const handleFooterClick = () => {
        navigate("/dashboard/profile");
        onNavigate?.("profile"); // если нужна синхронизация активного элемента
    };

    useEffect(() => {
        const fetchDiscordData = async () => {
            const userDataStr = localStorage.getItem('user_data');
            const userId = userDataStr ? JSON.parse(userDataStr).id : null;
            const token = authToken || localStorage.getItem('auth_token');

            if (!userId || !token) {
                setLoadingDiscord(false);
                return;
            }

            try {
                const res = await fetch(`http://localhost:4000/api/users/${userId}/basic`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (!res.ok) {
                    console.warn("Failed to fetch Discord user info");
                    setLoadingDiscord(false);
                    return;
                }

                const data = await res.json();

                setDiscordUser({
                    id: data.id,
                    name: data.name,
                    email: data.email,
                    nickname: data.nickname,
                    discordId: data.discordId,
                    emailVerified: data.emailVerified,
                    avatar: data.avatar || "https://cdn.discordapp.com/embed/avatars/0.png",
                    highestRole: data.highestRole || "@everyone",
                    roleColor: data.roleColor || 0,
                    roleHexColor: data.roleHexColor || "#99AAB5",
                    allRoles: data.allRoles || ["@everyone"],
                    profileUrl: `/dashboard/profile`,
                    status: "online",
                    discordConnected: !!data.discordId,
                    discordCreatedAt: data.discordCreatedAt
                });
            } catch (err) {
                console.error("Error fetching Discord user:", err);
            } finally {
                setLoadingDiscord(false);
            }
        };

        fetchDiscordData();
    }, [authToken]);

    // Initialize from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const state = JSON.parse(saved);
                setCollapsed(state.collapsed ?? initialCollapsed);
            }
        } catch (error) {
            console.warn("Failed to read sidebar state:", error);
        }
    }, [initialCollapsed]);

    // Save state to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                collapsed,
                timestamp: Date.now()
            }));
        } catch (error) {
            console.warn("Failed to save sidebar state:", error);
        }
    }, [collapsed]);

    // Sync active item with route
    useEffect(() => {
        const currentPath = location.pathname.split('/').pop();
        if (currentPath && MENU_STRUCTURE.some(item => item.id === currentPath)) {
            setActive(currentPath as SidebarId);
        }
    }, [location]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (logoutTimeoutRef.current) {
                clearTimeout(logoutTimeoutRef.current);
            }
        };
    }, []);

    // Check if user has required role for menu item
    const hasRequiredRole = useCallback((requiredRoles?: string[]): boolean => {
        if (!requiredRoles || requiredRoles.length === 0) return true;
        if (!user) return false;

        return requiredRoles.some(role =>
            user.allRoles.includes(role) ||
            user.highestRole === role
        );
    }, [user]);

    // Filter menu items based on search and user roles
    const filteredMenu = useMemo(() => {
        let filtered = MENU_STRUCTURE;

        // Apply role-based filtering
        filtered = filtered.filter(item => hasRequiredRole(item.requiredRole));

        // Apply search filtering
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(item =>
                item.title.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query)
            );
        }

        return filtered;
    }, [searchQuery, hasRequiredRole]);

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
            navigate(`/dashboard/${id}`);
        }
    }, [externalActive, onNavigate, navigate]);

    // Navigate to user profile
    const navigateToProfile = useCallback(() => {
        if (user) {
            navigate(user.profileUrl);
            onNavigate?.("profile");
        }
    }, [user, navigate, onNavigate]);

    // Enhanced logout handler with API integration
    const handleLogout = useCallback(async () => {
        if (!showLogoutConfirm) {
            // First click - show confirmation
            setShowLogoutConfirm(true);

            // Auto hide confirmation after 3 seconds
            logoutTimeoutRef.current = setTimeout(() => {
                setShowLogoutConfirm(false);
            }, 3000);

            return;
        }

        // Second click - perform logout
        setIsLoggingOut(true);
        setShowLogoutConfirm(false);

        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current);
        }

        try {
            // Call the custom logout handler if provided
            if (onLogout) {
                await onLogout();
            } else {
                // Default logout behavior with API call
                await performLogout();
            }
        } catch (error) {
            console.error('Logout failed:', error);
            // Fallback to client-side logout
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

        // Always perform client-side cleanup
        performClientSideLogout();
    };

    // Client-side logout cleanup
    const performClientSideLogout = () => {
        // Clear all auth-related storage
        localStorage.removeItem('auth_token');
        localStorage.removeItem('session_token');
        localStorage.removeItem('user_data');
        sessionStorage.removeItem('auth_token');

        // Clear sidebar state
        localStorage.removeItem(STORAGE_KEY);

        // Redirect to login page
        window.location.href = '/auth/login';
    };

    // Cancel logout confirmation
    const cancelLogout = useCallback(() => {
        setShowLogoutConfirm(false);
        if (logoutTimeoutRef.current) {
            clearTimeout(logoutTimeoutRef.current);
        }
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!containerRef.current?.contains(document.activeElement)) return;

            const currentIndex = itemRefs.current.findIndex(ref => ref === document.activeElement);

            switch (e.key) {
                case "ArrowDown":
                    e.preventDefault();
                    const nextIndex = Math.min(itemRefs.current.length - 1, currentIndex + 1);
                    itemRefs.current[nextIndex]?.focus();
                    break;

                case "ArrowUp":
                    e.preventDefault();
                    const prevIndex = Math.max(0, currentIndex - 1);
                    itemRefs.current[prevIndex]?.focus();
                    break;

                case "Home":
                    e.preventDefault();
                    itemRefs.current[0]?.focus();
                    break;

                case "End":
                    e.preventDefault();
                    itemRefs.current[itemRefs.current.length - 1]?.focus();
                    break;

                case "Escape":
                    if (searchQuery) {
                        e.preventDefault();
                        setSearchQuery("");
                    }
                    if (showLogoutConfirm) {
                        e.preventDefault();
                        cancelLogout();
                    }
                    break;
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [searchQuery, showLogoutConfirm, cancelLogout]);

    const toggleCollapse = useCallback(() => {
        setCollapsed(prev => !prev);
    }, []);

    const handleMouseEnter = useCallback((text: string, position: number) => {
        setHoverTip({ text, position });
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHoverTip(null);
    }, []);

    // Get role badge color
    const getRoleBadgeColor = useCallback(() => {
        if (!user) return '#99AAB5';
        return user.roleHexColor || '#99AAB5';
    }, [user]);

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
                    const hasAccess = hasRequiredRole(item.requiredRole);

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
                                handleMouseEnter(item.title, rect.top);
                            }}
                            onMouseLeave={handleMouseLeave}
                            aria-current={isActive ? "page" : undefined}
                            aria-disabled={!hasAccess || item.disabled || undefined}
                            title={collapsed ? item.title : !hasAccess ? "Insufficient permissions" : item.title}
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
    }, [active, collapsed, navigateTo, handleMouseEnter, handleMouseLeave, hasRequiredRole]);

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

    const currentUser: User = discordUser || user || defaultUser;

    return (
        <>
            {/* Mobile Overlay */}
            {!collapsed && (
                <div
                    className={styles.overlay}
                    onClick={toggleCollapse}
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
                            </div>
                            <div className={styles.brandSubtitle}>Moderation Platform</div>
                        </div>
                    )}

                    <button
                        className={styles.collapseBtn}
                        onClick={toggleCollapse}
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
                    {Object.entries(groupedMenu).map(([category, items]) =>
                        renderCategory(category, items)
                    )}

                    {filteredMenu.length === 0 && (
                        <div className={styles.noResults}>
                            {searchQuery ? `No results found for "${searchQuery}"` : "No accessible menu items"}
                        </div>
                    )}
                </nav>

                {/* Footer */}
                <footer className={styles.footer} style={{ cursor: "pointer" }}>
                    {currentUser.discordConnected && (
                        <div onClick={() => navigate("/dashboard/profile")}>
                            <DiscordProfileCard
                                nickname={currentUser.nickname}
                                discordId={currentUser.discordId || "0000"}
                                avatar={currentUser.avatar || "https://cdn.discordapp.com/embed/avatars/0.png"}
                                highestRole={currentUser.highestRole}
                                roleHexColor={currentUser.roleHexColor}
                                createdAt={currentUser.discordCreatedAt}
                                status={currentUser.status}
                            />
                        </div>
                    )}

                    <div className={styles.footerActions}>
                        <button
                            className={styles.supportBtn}
                            aria-label="Get support"
                            title="Support"
                            onClick={(e) => {
                                e.stopPropagation(); // предотвращаем срабатывание handleFooterClick
                                navigateTo("support", {
                                    id: "support",
                                    title: "Support",
                                    icon: <HelpCircle size={20} />,
                                    category: "system"
                                });
                            }}
                        >
                            <Mail size={16} />
                        </button>

                        <div className={styles.logoutContainer}>
                            <button
                                className={`${styles.logoutBtn} ${showLogoutConfirm ? styles.confirm : ""} ${isLoggingOut ? styles.loading : ""}`}
                                onClick={(e) => {
                                    e.stopPropagation(); // предотвращаем переход при клике
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