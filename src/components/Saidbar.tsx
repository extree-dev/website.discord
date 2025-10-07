import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
} from "lucide-react";
import ThemeToggle from "./ThemeToggle/ThemeToggle.js";
import styles from "../styles/components/Sidebar.module.scss";

export type SidebarId =
    | "dashboard"
    | "overview"
    | "users"
    | "channels"
    | "commands"
    | "bot"
    | "settings"
    | "notification"
    | "secret-codes";

type MenuItem = {
    id: SidebarId;
    title: string;
    sr?: string;
    icon: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
};

interface SidebarProps {
    initialCollapsed?: boolean;
    onNavigate?: (id: SidebarId) => void;
    active?: SidebarId;
    className?: string;
}

const STORAGE_KEY = "modpanel_sidebar_collapsed_v1";

const DEFAULT_MENU: MenuItem[] = [
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { id: "overview", title: "Overview", icon: <Home size={18} /> },
    { id: "users", title: "Users", icon: <Users size={18} />, badge: "12" },
    { id: "channels", title: "Channels", icon: <MessageCircle size={18} /> },
    { id: "commands", title: "Commands", icon: <Zap size={18} /> },
    { id: "bot", title: "Bot", icon: <Server size={18} /> },
    { id: "settings", title: "Settings", icon: <Settings size={18} /> },
    { id: "notification", title: "Notifications", icon: <Bell size={18} />, badge: "3" },
    { id: "secret-codes", title: "Secret Codes", icon: <Key size={18} /> },
];

const Sidebar: React.FC<SidebarProps> = ({
    initialCollapsed,
    onNavigate,
    active: externalActive,
    className,
}) => {
    const navigate = useNavigate();
    const [active, setActive] = useState<SidebarId>(() => externalActive ?? "overview");
    useEffect(() => {
        if (externalActive) setActive(externalActive);
    }, [externalActive]);

    const [collapsed, setCollapsed] = useState<boolean>(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved !== null) return saved === "1";
        if (typeof initialCollapsed === "boolean") return initialCollapsed;
        return false;
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
        } catch { }
    }, [collapsed]);

    const menu = useMemo<MenuItem[]>(() => DEFAULT_MENU, []);
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);

    function navigateTo(id: SidebarId) {
        if (externalActive === undefined) setActive(id);
        onNavigate?.(id);

        if (id === "dashboard") window.location.href = "http://localhost:5173/dashboard/";
        else navigate(`/dashboard/${id}`);
    }

    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            const el = document.activeElement;
            if (!containerRef.current?.contains(el)) return;

            const idx = itemRefs.current.findIndex((r) => r === el);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                itemRefs.current[Math.min(itemRefs.current.length - 1, idx + 1)]?.focus();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                itemRefs.current[Math.max(0, idx - 1)]?.focus();
            } else if (e.key === "Home") {
                e.preventDefault();
                itemRefs.current[0]?.focus();
            } else if (e.key === "End") {
                e.preventDefault();
                itemRefs.current[itemRefs.current.length - 1]?.focus();
            } else if (e.key === "Enter" || e.key === " ") {
                if (idx >= 0) {
                    e.preventDefault();
                    navigateTo(menu[idx].id);
                }
            }
        }
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [menu]);

    const [hoverTip, setHoverTip] = useState<string | null>(null);

    return (
        <div
            ref={containerRef}
            className={`${styles.sidebar} ${collapsed ? styles.collapsed : styles.open} ${className || ""}`}
            aria-label="Primary"
        >
            <div className={styles.top}>
                <div className={styles.brand} title="Moderator Panel">
                    {!collapsed && (
                        <div className={styles.brandMeta}>
                            <div className={styles.brandTitle}>Sentinel Dashboard</div>
                            <div className={styles.brandSubtitle}>Moderator</div>
                        </div>
                    )}
                </div>

                <button
                    className={styles.collapseBtn}
                    onClick={() => setCollapsed(c => !c)}
                    aria-pressed={collapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    <ChevronIcon collapsed={collapsed} />
                </button>
            </div>

            <nav className={styles.nav} role="navigation" aria-label="Main navigation">
                {menu.map((m, idx) => {
                    const isActive = active === m.id;
                    return (
                        <button
                            key={m.id}
                            ref={r => void (itemRefs.current[idx] = r)}
                            className={`${styles.navItem} ${isActive ? styles.active : ""} ${m.disabled ? styles.disabled : ""}`}
                            onClick={() => !m.disabled && navigateTo(m.id)}
                            onMouseEnter={() => setHoverTip(m.title)}
                            onMouseLeave={() => setHoverTip(null)}
                            aria-current={isActive ? "page" : undefined}
                            aria-disabled={m.disabled ? true : undefined}
                            title={collapsed ? m.title : undefined}
                        >
                            <span className={styles.icon}>{m.icon}</span>
                            {!collapsed && <span className={styles.label}>{m.title}</span>}
                            {m.badge !== undefined && <span className={styles.badge}>{m.badge}</span>}
                        </button>
                    );
                })}
            </nav>

            <div className={styles.divider} role="separator" />

            <div className={styles.footer}>
                <div
                    className={styles.profile}
                    tabIndex={0}
                    onMouseEnter={() => setHoverTip("Moderator")}
                    onMouseLeave={() => setHoverTip(null)}
                    title={collapsed ? "Moderator" : undefined}
                >
                    <img
                        src="https://i.pravatar.cc/40?img=12"
                        alt="Moderator avatar"
                        className={styles.avatar}
                        width={36}
                        height={36}
                    />
                    {!collapsed && (
                        <div className={styles.profileMeta}>
                            <div className={styles.profileName}>Moderator</div>
                            <div className={styles.profileSub}>myserver#1234</div>
                        </div>
                    )}
                </div>

                <button
                    className={styles.logout}
                    onClick={() => console.log("logout clicked")}
                    onMouseEnter={() => setHoverTip("Logout")}
                    onMouseLeave={() => setHoverTip(null)}
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut size={16} />
                    {!collapsed && <span className={styles.logoutLabel}>Logout</span>}
                </button>
            </div>

            {collapsed && hoverTip && <div className={styles.tooltip}>{hoverTip}</div>}
        </div>
    );
};

export default Sidebar;

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            style={{
                transform: collapsed ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 160ms ease",
            }}
            aria-hidden
        >
            <path
                d="M9.29 6.71a1 1 0 0 0 0 1.42L13.17 12l-3.88 3.88a1 1 0 0 0 1.42 1.42l4.59-4.59a1 1 0 0 0 0-1.42L10.71 6.7a1 1 0 0 0-1.42.01z"
                fill="currentColor"
            />
        </svg>
    );
}
