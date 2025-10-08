import React, { useEffect, useState, useRef } from "react";
import styles from "@/module_pages/Profile.module.scss";
import Sidebars from "@/components/Saidbar.js";
import {
    User,
    Link,
    Bell,
    AlertTriangle,
    Mail,
    Smartphone,
    MessageCircle,
    Camera,
    CheckCircle2,
    Shield,
    Download,
    RefreshCw,
    Trash2,
    Save
} from "lucide-react";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";

// Определяем точный тип для уведомлений
type Notifications = {
    email: boolean;
    push: boolean;
    discord: boolean;
};

// Добавляем недостающие типы
interface StatusOption {
    value: string;
    label: string;
    color: string;
}

interface UserProfile {
    id: number;
    name: string;
    email: string;
    nickname: string;
    avatar?: string;
    highestRole: string;
    roleHexColor: string;
    discordConnected: boolean;
    discordId?: string;
    status?: "online" | "idle" | "dnd" | "offline";
    theme?: "light" | "dark" | "auto";
    socialLinks?: { twitter?: string; github?: string; linkedin?: string };
    notifications?: Notifications;
    // Discord-specific fields
    emailVerified?: boolean;
    discordCreatedAt?: string;
    roleColor?: number;
    allRoles?: string[];
    profileUrl?: string;
}

const StatusIndicator = ({ status }: { status: string }) => {
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return '#10b981'; // green
            case 'idle': return '#f59e0b';   // yellow
            case 'dnd': return '#ef4444';   // red
            case 'offline': return '#6b7280'; // gray
            default: return '#6b7280';
        }
    };

    return (
        <span
            style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(status),
                marginRight: '8px'
            }}
        />
    );
};

const statusOptions: StatusOption[] = [
    { value: 'online', label: 'Online', color: '#10b981' },
    { value: 'idle', label: 'Idle', color: '#f59e0b' },
    { value: 'dnd', label: 'Do Not Disturb', color: '#ef4444' },
    { value: 'offline', label: 'Offline', color: '#6b7280' }
];

const CustomSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const selectedOption = statusOptions.find(opt => opt.value === value) || statusOptions[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: StatusOption) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={styles.formField}>
            <label>Status</label>
            <div className={styles.selectContainer} ref={selectRef}>
                <div
                    className={`${styles.selectTrigger} ${isOpen ? styles.active : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <div className={`${styles.statusIndicator} ${styles[selectedOption.value]}`} />
                    <span className={styles.selectedText}>{selectedOption.label}</span>
                    <svg
                        className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className={`${styles.dropdownMenu} ${isOpen ? styles.open : ''}`}>
                    {statusOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`${styles.dropdownItem} ${value === option.value ? styles.selected : ''}`}
                            onClick={() => handleSelect(option)}
                        >
                            <div className={`${styles.statusIndicator} ${styles[option.value]}`} />
                            <span className={styles.itemText}>{option.label}</span>
                            {value === option.value && (
                                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const ThemeSelect = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const selectRef = useRef<HTMLDivElement>(null);

    const themeOptions = [
        { value: 'light', label: 'Light', icon: '☀️' },
        { value: 'dark', label: 'Dark', icon: '🌙' },
        { value: 'auto', label: 'Auto', icon: '⚙️' }
    ];

    const selectedOption = themeOptions.find(opt => opt.value === value) || themeOptions[0];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: typeof themeOptions[0]) => {
        onChange(option.value);
        setIsOpen(false);
    };

    return (
        <div className={styles.formField}>
            <label>Theme</label>
            <div className={styles.selectContainer} ref={selectRef}>
                <div
                    className={`${styles.selectTrigger} ${isOpen ? styles.active : ''}`}
                    onClick={() => setIsOpen(!isOpen)}
                >
                    <span className={styles.themeIcon}>{selectedOption.icon}</span>
                    <span className={styles.selectedText}>{selectedOption.label}</span>
                    <svg
                        className={`${styles.chevron} ${isOpen ? styles.open : ''}`}
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>

                <div className={`${styles.dropdownMenu} ${isOpen ? styles.open : ''}`}>
                    {themeOptions.map((option) => (
                        <div
                            key={option.value}
                            className={`${styles.dropdownItem} ${value === option.value ? styles.selected : ''}`}
                            onClick={() => handleSelect(option)}
                        >
                            <span className={styles.themeIcon}>{option.icon}</span>
                            <span className={styles.itemText}>{option.label}</span>
                            {value === option.value && (
                                <svg className={styles.checkIcon} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const themeOptions = ["light", "dark", "custom"] as const;

const Profile: React.FC = () => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [discordUser, setDiscordUser] = useState<UserProfile | null>(null);
    const [loadingDiscord, setLoadingDiscord] = useState(true);

    // Editable fields
    const [nickname, setNickname] = useState("");
    const [status, setStatus] = useState<UserProfile["status"]>("offline");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [theme, setTheme] = useState<UserProfile["theme"]>("dark");
    const [socialLinks, setSocialLinks] = useState<UserProfile["socialLinks"]>({});
    const [notifications, setNotifications] = useState<Notifications>({
        email: true,
        push: false,
        discord: true,
    });

    // Fetch Discord user data
    useEffect(() => {
        const fetchDiscordData = async () => {
            const userDataStr = localStorage.getItem('user_data');
            const userId = userDataStr ? JSON.parse(userDataStr).id : null;
            const token = localStorage.getItem('auth_token');

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

                const discordUserData: UserProfile = {
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
                    discordCreatedAt: data.discordCreatedAt,
                    theme: data.theme || "dark",
                    socialLinks: data.socialLinks || {},
                    notifications: data.notifications || {
                        email: true,
                        push: false,
                        discord: true,
                    }
                };

                setDiscordUser(discordUserData);

                // Update local state with Discord data
                setNickname(data.nickname || "");
                setStatus(data.status || "offline");
                setTheme(data.theme || "dark");
                setSocialLinks(data.socialLinks || {});
                setNotifications(data.notifications || {
                    email: true,
                    push: false,
                    discord: true,
                });

            } catch (err) {
                console.error("Error fetching Discord user:", err);
            } finally {
                setLoadingDiscord(false);
            }
        };

        fetchDiscordData();
    }, []);

    // Initialize from localStorage (fallback)
    useEffect(() => {
        const stored = localStorage.getItem("user_data");
        if (!stored) {
            setLoading(false);
            return;
        }

        try {
            const parsed = JSON.parse(stored);
            setUser(parsed);

            // Only set from localStorage if we don't have Discord data yet
            if (!discordUser) {
                setNickname(parsed.nickname || "");
                setStatus(parsed.status || "offline");
                setTheme(parsed.theme || "dark");
                setSocialLinks(parsed.socialLinks || {});
                setNotifications(parsed.notifications || {
                    email: true,
                    push: false,
                    discord: true,
                });
            }
        } catch {
            console.error("Failed to parse user data");
        } finally {
            setLoading(false);
        }
    }, [discordUser]);

    const handleSave = async () => {
        const currentUser = discordUser || user;
        if (!currentUser) return;

        const updated: UserProfile = {
            ...currentUser,
            nickname,
            status,
            theme,
            socialLinks,
            notifications,
        };

        try {
            // If we have Discord data, try to update via API
            if (discordUser) {
                const token = localStorage.getItem('auth_token');
                const response = await fetch(`http://localhost:4000/api/users/${currentUser.id}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        nickname,
                        status,
                        theme,
                        socialLinks,
                        notifications
                    })
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    setDiscordUser(updatedUser);
                } else {
                    console.warn('Failed to update via API, falling back to localStorage');
                }
            }

            // Handle avatar upload
            if (avatarFile) {
                const reader = new FileReader();
                reader.onloadend = () => {
                    updated.avatar = reader.result as string;
                    setUser(updated);
                    localStorage.setItem("user_data", JSON.stringify(updated));
                    alert("Profile updated successfully! 🎉");
                };
                reader.readAsDataURL(avatarFile);
            } else {
                setUser(updated);
                localStorage.setItem("user_data", JSON.stringify(updated));
                alert("Profile updated successfully! 🎉");
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert("Profile updated locally! 🎉");
        }
    };

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setAvatarFile(e.target.files[0]);
    };

    const handleDiscordConnect = () => {
        // Redirect to Discord OAuth
        window.location.href = 'http://localhost:4000/api/auth/discord';
    };

    const handleOAuthConnect = (provider: string) => {
        alert(`Redirect to ${provider} OAuth...`);
    };

    // Исправленная функция toggleNotification
    const toggleNotification = (key: keyof Notifications) => {
        setNotifications(prev => ({
            ...prev,
            [key]: !prev[key]
        }));
    };

    // Use Discord data if available, otherwise fallback to localStorage data
    const currentUser = discordUser || user;

    if (loading || loadingDiscord) return <div className={styles.message}>Loading profile...</div>;
    if (!currentUser) return <div className={styles.message}>No user data found</div>;

    // Calculate member since year from Discord creation date
    const getMemberSince = () => {
        if (currentUser.discordCreatedAt) {
            return new Date(currentUser.discordCreatedAt).getFullYear();
        }
        return 2024; // Fallback
    };

    return (
        <div className={styles.layout}>
            <Sidebars />
            <main className={styles.main}>

                <div className={styles.profileContainer}>
                    {/* Sidebar */}
                    <div className={styles.profileSidebar}>
                        <div className={styles.avatarSection}>
                            <div className={styles.avatarContainer}>
                                <img
                                    src={avatarFile ? URL.createObjectURL(avatarFile) : currentUser.avatar || "/default-avatar.png"}
                                    alt={nickname}
                                    className={styles.avatar}
                                />
                                <span className={`${styles.statusIndicator} ${styles[status || 'offline']}`} />
                                <button
                                    className={styles.avatarUpload}
                                    onClick={() => document.getElementById('avatarInput')?.click()}
                                >
                                    <Camera size={14} />
                                    Change
                                </button>
                                <input
                                    id="avatarInput"
                                    type="file"
                                    accept="image/*"
                                    className={styles.hidden}
                                    onChange={handleAvatarChange}
                                />
                            </div>
                            <div className={styles.userInfo}>
                                <h2 className={styles.displayName}>{nickname}</h2>
                                <p className={styles.email}>{currentUser.email}</p>
                                {currentUser.emailVerified && (
                                    <span className={styles.verifiedBadge}>
                                        <CheckCircle2 size={14} />
                                        Verified
                                    </span>
                                )}
                                <div
                                    className={styles.roleBadge}
                                    style={{ backgroundColor: currentUser.roleHexColor }}
                                >
                                    <Shield size={14} />
                                    {currentUser.highestRole}
                                </div>
                            </div>
                        </div>

                        <div className={styles.quickStats}>
                            <div className={styles.stat}>
                                <span className={styles.label}>Member Since</span>
                                <span className={styles.value}>{getMemberSince()}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.label}>Status</span>
                                <span className={styles.value}>{status || 'offline'}</span>
                            </div>
                            <div className={styles.stat}>
                                <span className={styles.label}>Theme</span>
                                <span className={styles.value}>{theme}</span>
                            </div>
                            {currentUser.discordId && (
                                <div className={styles.stat}>
                                    <span className={styles.label}>Discord ID</span>
                                    <span className={styles.value}>{currentUser.discordId}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={styles.profileContent}>
                        {/* Basic Information */}
                        <div className={styles.settingsSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.icon}>
                                    <User size={24} />
                                </div>
                                <div>
                                    <h3 className={styles.title}>Basic Information</h3>
                                    <p className={styles.description}>
                                        Update your personal details and preferences
                                    </p>
                                </div>
                            </div>

                            <div className={styles.formGrid}>
                                <div className={styles.formField}>
                                    <label>Display Name</label>
                                    <input
                                        className={styles.inputField + ' ' + styles.displayNameInput}
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="Enter your display name"
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <label>Email Address</label>
                                    <input
                                        type="email"
                                        className={styles.inputField + ' ' + styles.emailInput}
                                        value={currentUser.email}
                                        onChange={(e) => {
                                            const updatedUser = { ...currentUser, email: e.target.value };
                                            if (discordUser) {
                                                setDiscordUser(updatedUser);
                                            } else {
                                                setUser(updatedUser);
                                            }
                                        }}
                                        placeholder="your@email.com"
                                    />
                                </div>
                                <div className={styles.formField}>
                                    <CustomSelect
                                        value={status || "offline"}
                                        onChange={(value) => setStatus(value as UserProfile["status"])}
                                    />
                                </div>

                                <div className={styles.formField}>
                                    <ThemeSelect
                                        value={theme || "dark"}
                                        onChange={(value) => setTheme(value as UserProfile["theme"])}
                                    />
                                </div>
                            </div>
                        </div>


                        {/* Social Connections */}
                        <div className={styles.settingsSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.icon}>
                                    <Link size={24} />
                                </div>
                                <div>
                                    <h3 className={styles.title}>Social Connections</h3>
                                    <p className={styles.description}>Connect your social accounts</p>
                                </div>
                            </div>

                            <div className={styles.connectionsGrid}>
                                <div className={styles.connectionCard}>
                                    <div className={styles.platformIcon}>
                                        <FaDiscord size={32} />
                                    </div>
                                    <h4 className={styles.platformName}>Discord</h4>
                                    <p className={styles.status}>
                                        {currentUser.discordConnected ?
                                            `Connected: ${currentUser.discordId}` :
                                            'Not connected'
                                        }
                                    </p>
                                    <button
                                        className={styles.connectBtn}
                                        onClick={handleDiscordConnect}
                                    >
                                        {currentUser.discordConnected ? 'Manage' : 'Connect'}
                                    </button>
                                </div>

                                <div className={styles.connectionCard}>
                                    <div className={styles.platformIcon}>
                                        <FaGoogle size={32} />
                                    </div>
                                    <h4 className={styles.platformName}>Google</h4>
                                    <p className={styles.status}>Not connected</p>
                                    <button
                                        className={styles.connectBtn}
                                        onClick={() => handleOAuthConnect("Google")}
                                    >
                                        Connect
                                    </button>
                                </div>

                                <div className={styles.connectionCard}>
                                    <div className={styles.platformIcon}>
                                        <FaGithub size={32} />
                                    </div>
                                    <h4 className={styles.platformName}>GitHub</h4>
                                    <p className={styles.status}>Not connected</p>
                                    <button
                                        className={styles.connectBtn}
                                        onClick={() => handleOAuthConnect("GitHub")}
                                    >
                                        Connect
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Notifications */}
                        <div className={styles.settingsSection}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.icon}>
                                    <Bell size={24} />
                                </div>
                                <div>
                                    <h3 className={styles.title}>Notification Preferences</h3>
                                    <p className={styles.description}>Choose how you want to be notified</p>
                                </div>
                            </div>

                            <div className={styles.notificationsGrid}>
                                <div
                                    className={styles.notificationToggle}
                                    onClick={() => toggleNotification('email')}
                                >
                                    <div className={styles.label}>
                                        <div className={styles.icon}>
                                            <Mail size={20} />
                                        </div>
                                        <div className={styles.text}>
                                            <h4 className={styles.title}>Email Notifications</h4>
                                            <p className={styles.description}>Receive updates via email</p>
                                        </div>
                                    </div>
                                    <div className={`${styles.toggle} ${notifications.email ? styles.active : ''}`} />
                                </div>

                                <div
                                    className={styles.notificationToggle}
                                    onClick={() => toggleNotification('push')}
                                >
                                    <div className={styles.label}>
                                        <div className={styles.icon}>
                                            <Smartphone size={20} />
                                        </div>
                                        <div className={styles.text}>
                                            <h4 className={styles.title}>Push Notifications</h4>
                                            <p className={styles.description}>Browser push notifications</p>
                                        </div>
                                    </div>
                                    <div className={`${styles.toggle} ${notifications.push ? styles.active : ''}`} />
                                </div>

                                <div
                                    className={styles.notificationToggle}
                                    onClick={() => toggleNotification('discord')}
                                >
                                    <div className={styles.label}>
                                        <div className={styles.icon}>
                                            <MessageCircle size={20} />
                                        </div>
                                        <div className={styles.text}>
                                            <h4 className={styles.title}>Discord Notifications</h4>
                                            <p className={styles.description}>Direct messages on Discord</p>
                                        </div>
                                    </div>
                                    <div className={`${styles.toggle} ${notifications.discord ? styles.active : ''}`} />
                                </div>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className={`${styles.settingsSection} ${styles.dangerZone}`}>
                            <div className={styles.sectionHeader}>
                                <div className={styles.icon}>
                                    <AlertTriangle size={24} />
                                </div>
                                <div>
                                    <h3 className={styles.title}>Danger Zone</h3>
                                    <p className={styles.description}>Irreversible and destructive actions</p>
                                </div>
                            </div>

                            <div className={styles.dangerActions}>
                                <button className={styles.dangerBtn}>
                                    <Download size={16} />
                                    Export Data
                                </button>
                                <button className={styles.dangerBtn}>
                                    <RefreshCw size={16} />
                                    Reset Settings
                                </button>
                                <button
                                    className={`${styles.dangerBtn} ${styles.delete}`}
                                    onClick={() => {
                                        if (window.confirm("Are you absolutely sure? This will permanently delete your account and all data!")) {
                                            localStorage.removeItem("user_data");
                                            localStorage.removeItem("auth_token");
                                            alert("Account deleted! Redirecting...");
                                            window.location.href = '/';
                                        }
                                    }}
                                >
                                    <Trash2 size={16} />
                                    Delete Account
                                </button>
                            </div>
                        </div>

                        {/* Save Actions */}
                        <div className={styles.saveActions}>
                            <button className={styles.saveBtn} onClick={handleSave}>
                                <Save size={18} />
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Profile;