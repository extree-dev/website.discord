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
    Circle,
    LayoutDashboard,
    Key,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle/ThemeToggle.js";
import "../components/CSS/saidbar.css";

/**
 * Sidebar.tsx
 *
 * Minimalist, strict and accessible sidebar for moderator dashboard.
 * - Collapsible (persists state)
 * - Keyboard navigation (ArrowUp/ArrowDown, Home/End, Enter)
 * - Clear active item handling
 * - Compact mode shows only icons with tooltips
 *
 * Notes:
 * - This file intentionally verbose (comments + structure) to be
 *   easy to adapt to your project.
 */

/* ---------- Types ---------- */

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
    sr?: string; // screen-reader override text
    icon: React.ReactNode;
    badge?: string | number;
    disabled?: boolean;
};

/* ---------- Props ---------- */

interface SidebarProps {
    initialCollapsed?: boolean;
    onNavigate?: (id: SidebarId) => void;
    active?: SidebarId;
    className?: string;
}

/* ---------- Constants ---------- */

const STORAGE_KEY = "modpanel_sidebar_collapsed_v1";

/* Default menu — can be replaced by props or context in your app */
const DEFAULT_MENU: MenuItem[] = [
    { id: "dashboard", title: "Dashboard", icon: <LayoutDashboard size={18} /> }, // ← добавили
    { id: "overview", title: "Overview", icon: <Home size={18} /> },
    { id: "users", title: "Users", icon: <Users size={18} />, badge: "12" },
    { id: "channels", title: "Channels", icon: <MessageCircle size={18} /> },
    { id: "commands", title: "Commands", icon: <Zap size={18} /> },
    { id: "bot", title: "Bot", icon: <Server size={18} /> },
    { id: "settings", title: "Settings", icon: <Settings size={18} /> },
    { id: "notification", title: "Notifications", icon: <Bell size={18} />, badge: "3" },
    { id: "secret-codes", title: "Secret Codes", icon: <Key size={18} /> },
];


/* ---------- Component ---------- */

const Sidebars: React.FC<SidebarProps> = ({
    initialCollapsed,
    onNavigate,
    active: externalActive,
    className,
}) => {

    const navigate = useNavigate();
    // controlled active (if external provided) or internal
    const [active, setActive] = useState<SidebarId>(() => externalActive ?? "overview");
    useEffect(() => {
        if (externalActive) setActive(externalActive);
    }, [externalActive]);

    // collapsed state — persisted
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        const saved = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
        if (saved !== null) return saved === "1";
        if (typeof initialCollapsed === "boolean") return initialCollapsed;
        return false;
    });

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
        } catch {
            // ignore
        }
    }, [collapsed]);

    // menu items
    const menu = useMemo<MenuItem[]>(() => DEFAULT_MENU, []);

    // focus management for keyboard navigation
    const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // on navigate (internal + callback)
    function navigateTo(id: SidebarId) {
        if (externalActive === undefined) {
            setActive(id);
        }
        onNavigate?.(id);

        if (id === "dashboard") {
            window.location.href = "http://localhost:5173/dashboard/";
        } else if (id === "settings") {
            navigate("/dashboard/settings");
        } else if (id === "notification") {
            navigate("/dashboard/notification");
        } else if (id === "secret-codes") {
            navigate("/dashboard/secret-codes");
        } else {
            navigate(`/dashboard/${id}`);
        }
    }

    // keyboard handling
    useEffect(() => {
        function onKey(e: KeyboardEvent) {
            // when focus inside sidebar, we will handle arrow navigation
            const el = document.activeElement;
            if (!containerRef.current) return;
            if (!containerRef.current.contains(el)) return;

            const idx = itemRefs.current.findIndex((r) => r === el);
            if (e.key === "ArrowDown") {
                e.preventDefault();
                const next = Math.min(itemRefs.current.length - 1, Math.max(0, idx + 1));
                itemRefs.current[next]?.focus();
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const prev = Math.max(0, idx - 1);
                itemRefs.current[prev]?.focus();
            } else if (e.key === "Home") {
                e.preventDefault();
                itemRefs.current[0]?.focus();
            } else if (e.key === "End") {
                e.preventDefault();
                itemRefs.current[itemRefs.current.length - 1]?.focus();
            } else if (e.key === "Enter" || e.key === " ") {
                // activate
                if (idx >= 0) {
                    e.preventDefault();
                    const id = menu[idx].id;
                    navigateTo(id);
                }
            }
        }

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [menu, onNavigate, externalActive]);

    // tooltip visibility control when collapsed
    const [hoverTip, setHoverTip] = useState<string | null>(null);

    return (
        <div
            ref={containerRef}
            className={[
                "mp-sidebar",
                collapsed ? "mp-sidebar--collapsed" : "mp-sidebar--open",
                className || "",
            ].join(" ")}
            aria-label="Primary"
        >
            {/* Top: Brand */}
            <div className="mp-sidebar__top">
                <div className="mp-brand" title="Moderator Panel">
                    {!collapsed && (
                        <div className="mp-brand__meta">
                            <div className="mp-brand__title">Sentinel Dashboard</div>
                            <div className="mp-brand__subtitle">Moderator</div>
                        </div>
                    )}
                </div>

                <button
                    className="mp-collapse-btn"
                    onClick={() => setCollapsed((c) => !c)}
                    aria-pressed={collapsed}
                    aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    title={collapsed ? "Expand" : "Collapse"}
                >
                    <ChevronIcon collapsed={collapsed} />
                </button>
            </div>

            {/* Navigation list */}
            <nav className="mp-nav" role="navigation" aria-label="Main navigation">
                {menu.map((m, idx) => {
                    const isActive = active === m.id;
                    return (
                        <button
                            key={m.id}
                            ref={(r) => {
                                itemRefs.current[idx] = r;
                            }}
                            className={[
                                "mp-nav__item",
                                isActive ? "mp-nav__item--active" : "",
                                m.disabled ? "mp-nav__item--disabled" : "",
                            ].join(" ")}
                            onClick={() => !m.disabled && navigateTo(m.id)}
                            onMouseEnter={() => setHoverTip(m.title)}
                            onMouseLeave={() => setHoverTip(null)}
                            aria-current={isActive ? "page" : undefined}
                            aria-disabled={m.disabled ? true : undefined}
                            title={collapsed ? m.title : undefined}
                        >
                            <span className="mp-nav__icon" aria-hidden>
                                {m.icon}
                            </span>

                            {!collapsed && <span className="mp-nav__label">{m.title}</span>}

                            {m.badge !== undefined && (
                                <span className="mp-nav__badge" aria-hidden>
                                    {m.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Divider */}
            <div className="mp-divider" role="separator" />


            {/* Footer: profile & logout */}
            <div className="mp-sidebar__foot">
                <div
                    className="mp-profile"
                    tabIndex={0}
                    onMouseEnter={() => setHoverTip("Moderator")}
                    onMouseLeave={() => setHoverTip(null)}
                    title={collapsed ? "Moderator" : undefined}
                >
                    <img
                        src="https://i.pravatar.cc/40?img=12"
                        alt="Moderator avatar"
                        className="mp-profile__avatar"
                        width={36}
                        height={36}
                    />
                    {!collapsed && (
                        <div className="mp-profile__meta">
                            <div className="mp-profile__name">Moderator</div>
                            <div className="mp-profile__sub">myserver#1234</div>
                        </div>
                    )}
                </div>

                <button
                    className="mp-logout"
                    onClick={() => {
                        // default behavior: for now we simply log out to console.
                        // In your app, replace with real logout handler.
                        // eslint-disable-next-line no-console
                        console.log("logout clicked");
                        // you might call onNavigate?.("logout") or similar
                    }}
                    onMouseEnter={() => setHoverTip("Logout")}
                    onMouseLeave={() => setHoverTip(null)}
                    title={collapsed ? "Logout" : undefined}
                >
                    <LogOut size={16} />
                    {!collapsed && <span className="mp-logout__label">Logout</span>}
                </button>
            </div>

            {/* Floating tooltip when collapsed */}
            {collapsed && hoverTip && (
                <div className="mp-tooltip" role="status" aria-live="polite">
                    {hoverTip}
                </div>
            )}
        </div>
    );
};

export default Sidebars;

/* ---------- Small icon helper (inline) ---------- */

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
    // simple chevron that rotates based on collapsed state
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
