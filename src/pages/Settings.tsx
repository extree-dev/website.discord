import React, { useState, useEffect, useContext } from "react";
import {
    Settings,
    Save,
    RefreshCw,
    Palette,
    Bell,
    Shield,
    Globe,
    Monitor,
    Moon,
    Sun,
    Eye,
    EyeOff,
    Download,
    Upload,
    Trash2,
    User,
    Key,
    Database,
    Cpu,
    Network,
    Zap,
    CheckCircle,
    AlertTriangle
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import { useTheme } from "@/stores/theme.js";
import styles from "../module_pages/Settings.module.scss";
import { SidebarContext } from "@/App.js";

interface SettingsState {
    appearance: {
        theme: 'light' | 'dark' | 'auto';
        accentColor: string;
        fontSize: number;
        reducedMotion: boolean;
        highContrast: boolean;
    };
    notifications: {
        enabled: boolean;
        sounds: boolean;
        desktop: boolean;
        email: boolean;
        push: boolean;
        frequency: 'instant' | 'hourly' | 'daily';
        quietHours: {
            enabled: boolean;
            start: string;
            end: string;
        };
    };
    privacy: {
        hideOnlineStatus: boolean;
        dataCollection: boolean;
        analytics: boolean;
        saveHistory: boolean;
        autoDelete: number; // days
    };
    language: {
        language: string;
        timezone: string;
        dateFormat: string;
        timeFormat: '12h' | '24h';
    };
    security: {
        twoFactor: boolean;
        sessionTimeout: number;
        loginAlerts: boolean;
        passwordAge: number;
    };
    performance: {
        cacheSize: number;
        autoOptimize: boolean;
        hardwareAcceleration: boolean;
        backgroundProcesses: boolean;
    };
}

const SettingsPage: React.FC = () => {
    const { theme, setTheme } = useTheme();

    const [settings, setSettings] = useState<SettingsState>({
        appearance: {
            theme: 'auto',
            accentColor: '#4b7cff',
            fontSize: 16,
            reducedMotion: false,
            highContrast: false
        },
        notifications: {
            enabled: true,
            sounds: true,
            desktop: true,
            email: false,
            push: true,
            frequency: 'instant',
            quietHours: {
                enabled: false,
                start: '22:00',
                end: '08:00'
            }
        },
        privacy: {
            hideOnlineStatus: false,
            dataCollection: true,
            analytics: true,
            saveHistory: true,
            autoDelete: 90
        },
        language: {
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h'
        },
        security: {
            twoFactor: false,
            sessionTimeout: 60,
            loginAlerts: true,
            passwordAge: 90
        },
        performance: {
            cacheSize: 500,
            autoOptimize: true,
            hardwareAcceleration: true,
            backgroundProcesses: true
        }
    });

    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [activeSection, setActiveSection] = useState('appearance');

    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

    const languageOptions = [
        { value: 'en', label: 'English' },
        { value: 'es', label: 'Español' },
        { value: 'fr', label: 'Français' },
        { value: 'de', label: 'Deutsch' },
        { value: 'ru', label: 'Русский' },
        { value: 'zh', label: '中文' },
        { value: 'ja', label: '日本語' }
    ];

    const timezoneOptions = [
        'America/New_York',
        'America/Los_Angeles',
        'Europe/London',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Australia/Sydney'
    ];

    const accentColors = [
        '#4b7cff', // Blue
        '#10b981', // Green
        '#f59e0b', // Amber
        '#ef4444', // Red
        '#8b5cf6', // Violet
        '#ec4899', // Pink
        '#06b6d4'  // Cyan
    ];

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = () => {
        setIsLoading(true);
        try {
            const savedSettings = localStorage.getItem('dashboard-settings');
            if (savedSettings) {
                setSettings(JSON.parse(savedSettings));
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const saveSettings = async () => {
        setIsSaving(true);
        setSaveStatus('idle');

        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));

            localStorage.setItem('dashboard-settings', JSON.stringify(settings));

            // Преобразуем 'auto' в 'light' или 'dark' на основе системных настроек
            let themeToSet = settings.appearance.theme;
            if (themeToSet === 'auto') {
                themeToSet = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
            }

            setTheme(themeToSet as any); // или приведите к правильному типу

            setSaveStatus('success');
            setTimeout(() => setSaveStatus('idle'), 3000);
        } catch (error) {
            console.error('Error saving settings:', error);
            setSaveStatus('error');
        } finally {
            setIsSaving(false);
        }
    };

    const resetSettings = () => {
        if (window.confirm('Are you sure you want to reset all settings to default? This action cannot be undone.')) {
            localStorage.removeItem('dashboard-settings');
            loadSettings();
        }
    };

    const exportSettings = () => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `dashboard-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const importSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedSettings = JSON.parse(e.target?.result as string);
                    setSettings(importedSettings);
                } catch (error) {
                    alert('Error importing settings: Invalid file format');
                }
            };
            reader.readAsText(file);
        }
    };

    const updateSettings = <K extends keyof SettingsState>(
        category: K,
        updates: Partial<SettingsState[K]>
    ) => {
        setSettings(prev => ({
            ...prev,
            [category]: { ...prev[category], ...updates }
        }));
    };

    const navigationSections = [
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Privacy & Data', icon: Shield },
        { id: 'language', label: 'Language & Region', icon: Globe },
        { id: 'security', label: 'Security', icon: Key },
        { id: 'performance', label: 'Performance', icon: Zap }
    ];

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.loadingState}>
                            <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                            <p>Loading settings...</p>
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
                                    <div>
                                        <h1 className={styles.title}>Settings</h1>
                                        <p className={styles.subtitle}>
                                            Customize your dashboard experience and preferences
                                        </p>
                                    </div>
                                </div>
                                <div className={styles.headerActions}>
                                    <button
                                        onClick={resetSettings}
                                        className={styles.resetButton}
                                    >
                                        <RefreshCw className={styles.buttonIcon} />
                                        Reset
                                    </button>
                                    <button
                                        onClick={saveSettings}
                                        className={styles.saveButton}
                                        disabled={isSaving}
                                    >
                                        {isSaving ? (
                                            <RefreshCw className={`${styles.buttonIcon} ${styles.animateSpin}`} />
                                        ) : (
                                            <Save className={styles.buttonIcon} />
                                        )}
                                        {isSaving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>

                            {/* Save Status */}
                            {saveStatus === 'success' && (
                                <div className={styles.saveStatus}>
                                    <CheckCircle className={styles.statusIcon} />
                                    Settings saved successfully!
                                </div>
                            )}
                            {saveStatus === 'error' && (
                                <div className={`${styles.saveStatus} ${styles.error}`}>
                                    <AlertTriangle className={styles.statusIcon} />
                                    Failed to save settings. Please try again.
                                </div>
                            )}
                        </div>

                        <div className={styles.settingsLayout}>
                            {/* Navigation */}
                            <nav className={styles.navigation}>
                                {navigationSections.map(section => {
                                    const IconComponent = section.icon;
                                    return (
                                        <button
                                            key={section.id}
                                            onClick={() => setActiveSection(section.id)}
                                            className={`${styles.navItem} ${activeSection === section.id ? styles.active : ''
                                                }`}
                                        >
                                            <IconComponent className={styles.navIcon} />
                                            <span>{section.label}</span>
                                        </button>
                                    );
                                })}

                                <div className={styles.navDivider} />

                                <button className={styles.navItem} onClick={exportSettings}>
                                    <Download className={styles.navIcon} />
                                    <span>Export Settings</span>
                                </button>

                                <label className={styles.navItem}>
                                    <Upload className={styles.navIcon} />
                                    <span>Import Settings</span>
                                    <input
                                        type="file"
                                        accept=".json"
                                        onChange={importSettings}
                                        className={styles.fileInput}
                                    />
                                </label>
                            </nav>

                            {/* Settings Content */}
                            <div className={styles.settingsContent}>
                                {/* Appearance Settings */}
                                {activeSection === 'appearance' && (
                                    <div className={styles.section}>
                                        <h2 className={styles.sectionTitle}>
                                            <Palette className={styles.sectionIcon} />
                                            Appearance
                                        </h2>

                                        <div className={styles.settingsGrid}>
                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Theme</label>
                                                <div className={styles.themeOptions}>
                                                    {[
                                                        { value: 'light', label: 'Light', icon: Sun },
                                                        { value: 'dark', label: 'Dark', icon: Moon },
                                                        { value: 'auto', label: 'System', icon: Monitor }
                                                    ].map(themeOption => {
                                                        const IconComponent = themeOption.icon;
                                                        return (
                                                            <label key={themeOption.value} className={styles.themeOption}>
                                                                <input
                                                                    type="radio"
                                                                    name="theme"
                                                                    value={themeOption.value}
                                                                    checked={settings.appearance.theme === themeOption.value}
                                                                    onChange={(e) => updateSettings('appearance', { theme: e.target.value as any })}
                                                                />
                                                                <div className={styles.themeCard}>
                                                                    <IconComponent className={styles.themeIcon} />
                                                                    <span>{themeOption.label}</span>
                                                                </div>
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Accent Color</label>
                                                <div className={styles.colorOptions}>
                                                    {accentColors.map(color => (
                                                        <label key={color} className={styles.colorOption}>
                                                            <input
                                                                type="radio"
                                                                name="accentColor"
                                                                value={color}
                                                                checked={settings.appearance.accentColor === color}
                                                                onChange={(e) => updateSettings('appearance', { accentColor: e.target.value })}
                                                            />
                                                            <div
                                                                className={styles.colorSwatch}
                                                                style={{ backgroundColor: color }}
                                                            />
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>
                                                    Font Size
                                                    <span className={styles.settingValue}>
                                                        {settings.appearance.fontSize}px
                                                    </span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="12"
                                                    max="24"
                                                    value={settings.appearance.fontSize}
                                                    onChange={(e) => updateSettings('appearance', { fontSize: parseInt(e.target.value) })}
                                                    className={styles.slider}
                                                />
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Accessibility</label>
                                                <div className={styles.checkboxGroup}>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.appearance.reducedMotion}
                                                            onChange={(e) => updateSettings('appearance', { reducedMotion: e.target.checked })}
                                                        />
                                                        <span>Reduce motion</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.appearance.highContrast}
                                                            onChange={(e) => updateSettings('appearance', { highContrast: e.target.checked })}
                                                        />
                                                        <span>High contrast mode</span>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Notifications Settings */}
                                {activeSection === 'notifications' && (
                                    <div className={styles.section}>
                                        <h2 className={styles.sectionTitle}>
                                            <Bell className={styles.sectionIcon} />
                                            Notifications
                                        </h2>

                                        <div className={styles.settingsGrid}>
                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Notification Preferences</label>
                                                <div className={styles.checkboxGroup}>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.enabled}
                                                            onChange={(e) => updateSettings('notifications', { enabled: e.target.checked })}
                                                        />
                                                        <span>Enable notifications</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.sounds}
                                                            onChange={(e) => updateSettings('notifications', { sounds: e.target.checked })}
                                                        />
                                                        <span>Play sounds</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.desktop}
                                                            onChange={(e) => updateSettings('notifications', { desktop: e.target.checked })}
                                                        />
                                                        <span>Desktop notifications</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.email}
                                                            onChange={(e) => updateSettings('notifications', { email: e.target.checked })}
                                                        />
                                                        <span>Email notifications</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.push}
                                                            onChange={(e) => updateSettings('notifications', { push: e.target.checked })}
                                                        />
                                                        <span>Push notifications</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Frequency</label>
                                                <select
                                                    value={settings.notifications.frequency}
                                                    onChange={(e) => updateSettings('notifications', { frequency: e.target.value as any })}
                                                    className={styles.select}
                                                >
                                                    <option value="instant">Instant</option>
                                                    <option value="hourly">Hourly digest</option>
                                                    <option value="daily">Daily digest</option>
                                                </select>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Quiet Hours</label>
                                                <div className={styles.checkboxGroup}>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.notifications.quietHours.enabled}
                                                            onChange={(e) => updateSettings('notifications', {
                                                                quietHours: { ...settings.notifications.quietHours, enabled: e.target.checked }
                                                            })}
                                                        />
                                                        <span>Enable quiet hours</span>
                                                    </label>
                                                </div>
                                                {settings.notifications.quietHours.enabled && (
                                                    <div className={styles.timeRange}>
                                                        <input
                                                            type="time"
                                                            value={settings.notifications.quietHours.start}
                                                            onChange={(e) => updateSettings('notifications', {
                                                                quietHours: { ...settings.notifications.quietHours, start: e.target.value }
                                                            })}
                                                            className={styles.timeInput}
                                                        />
                                                        <span>to</span>
                                                        <input
                                                            type="time"
                                                            value={settings.notifications.quietHours.end}
                                                            onChange={(e) => updateSettings('notifications', {
                                                                quietHours: { ...settings.notifications.quietHours, end: e.target.value }
                                                            })}
                                                            className={styles.timeInput}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Privacy Settings */}
                                {activeSection === 'privacy' && (
                                    <div className={styles.section}>
                                        <h2 className={styles.sectionTitle}>
                                            <Shield className={styles.sectionIcon} />
                                            Privacy & Data
                                        </h2>

                                        <div className={styles.settingsGrid}>
                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Privacy</label>
                                                <div className={styles.checkboxGroup}>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.privacy.hideOnlineStatus}
                                                            onChange={(e) => updateSettings('privacy', { hideOnlineStatus: e.target.checked })}
                                                        />
                                                        <span>Hide online status</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.privacy.dataCollection}
                                                            onChange={(e) => updateSettings('privacy', { dataCollection: e.target.checked })}
                                                        />
                                                        <span>Allow data collection for improvements</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.privacy.analytics}
                                                            onChange={(e) => updateSettings('privacy', { analytics: e.target.checked })}
                                                        />
                                                        <span>Share analytics data</span>
                                                    </label>
                                                    <label className={styles.checkboxLabel}>
                                                        <input
                                                            type="checkbox"
                                                            checked={settings.privacy.saveHistory}
                                                            onChange={(e) => updateSettings('privacy', { saveHistory: e.target.checked })}
                                                        />
                                                        <span>Save search and activity history</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>
                                                    Auto-delete History
                                                    <span className={styles.settingValue}>
                                                        {settings.privacy.autoDelete} days
                                                    </span>
                                                </label>
                                                <input
                                                    type="range"
                                                    min="1"
                                                    max="365"
                                                    value={settings.privacy.autoDelete}
                                                    onChange={(e) => updateSettings('privacy', { autoDelete: parseInt(e.target.value) })}
                                                    className={styles.slider}
                                                />
                                                <div className={styles.sliderLabels}>
                                                    <span>1 day</span>
                                                    <span>1 year</span>
                                                </div>
                                            </div>

                                            <div className={styles.settingGroup}>
                                                <label className={styles.settingLabel}>Data Management</label>
                                                <div className={styles.buttonGroup}>
                                                    <button className={styles.secondaryButton}>
                                                        <Download className={styles.buttonIcon} />
                                                        Export My Data
                                                    </button>
                                                    <button className={styles.dangerButton}>
                                                        <Trash2 className={styles.buttonIcon} />
                                                        Delete All Data
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Add other sections similarly... */}

                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default SettingsPage;