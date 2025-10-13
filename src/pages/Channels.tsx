import React, { useState, useEffect, useContext } from "react"; // Добавлен useContext
import Saidbar from "../components/Saidbar.js";
import styles from "../module_pages/Channels.module.scss";
import {
    Hash,
    Lock,
    Bell,
    BellOff,
    Users,
    MessageCircle,
    Edit,
    Trash2,
    Plus,
    Search,
    Filter,
    MoreHorizontal,
    Eye,
    EyeOff,
    CheckCircle,
    XCircle,
    Volume2,
    VolumeX
} from "lucide-react";
import { SidebarContext } from "@/App.js"; // Добавлен импорт контекста

interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    category: string;
    members: number;
    isPrivate: boolean;
    notifications: 'all' | 'mentions' | 'none';
    description?: string;
    lastActivity?: string;
}

const Channels: React.FC = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [channels, setChannels] = useState<Channel[]>([]);
    const [editingChannel, setEditingChannel] = useState<string | null>(null);

    // Получаем состояние сайдбара из контекста
    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

    // Mock data
    useEffect(() => {
        const mockChannels: Channel[] = [
            {
                id: '1',
                name: 'general',
                type: 'text',
                category: 'Main',
                members: 1247,
                isPrivate: false,
                notifications: 'all',
                description: 'General discussions and announcements',
                lastActivity: '2 min ago'
            },
            {
                id: '2',
                name: 'announcements',
                type: 'text',
                category: 'Main',
                members: 1247,
                isPrivate: false,
                notifications: 'mentions',
                description: 'Important server announcements',
                lastActivity: '1 hour ago'
            },
            {
                id: '3',
                name: 'gaming',
                type: 'voice',
                category: 'Entertainment',
                members: 89,
                isPrivate: false,
                notifications: 'all',
                lastActivity: 'Now'
            },
            {
                id: '4',
                name: 'moderators',
                type: 'text',
                category: 'Staff',
                members: 12,
                isPrivate: true,
                notifications: 'all',
                description: 'Moderator discussions',
                lastActivity: '5 min ago'
            },
            {
                id: '5',
                name: 'music',
                type: 'voice',
                category: 'Entertainment',
                members: 34,
                isPrivate: false,
                notifications: 'mentions',
                lastActivity: '15 min ago'
            },
            {
                id: '6',
                name: 'help-desk',
                type: 'text',
                category: 'Support',
                members: 567,
                isPrivate: false,
                notifications: 'all',
                description: 'Get help and support',
                lastActivity: 'Now'
            }
        ];
        setChannels(mockChannels);
    }, []);

    const categories = ['all', 'Main', 'Entertainment', 'Staff', 'Support'];
    const filteredChannels = channels.filter(channel => {
        const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const handleNotificationChange = (channelId: string, level: 'all' | 'mentions' | 'none') => {
        setChannels(prev => prev.map(channel =>
            channel.id === channelId ? { ...channel, notifications: level } : channel
        ));
    };

    const handlePrivacyToggle = (channelId: string) => {
        setChannels(prev => prev.map(channel =>
            channel.id === channelId ? { ...channel, isPrivate: !channel.isPrivate } : channel
        ));
    };

    const getNotificationIcon = (level: 'all' | 'mentions' | 'none') => {
        switch (level) {
            case 'all': return <Bell size={16} />;
            case 'mentions': return <Volume2 size={16} />;
            case 'none': return <BellOff size={16} />;
        }
    };

    const getChannelIcon = (type: 'text' | 'voice', isPrivate: boolean) => {
        if (isPrivate) return <Lock size={16} />;
        return type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />;
    };

    return (
        <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Saidbar />

            <main className="main">
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.header__left}>
                        <h1 className={styles.header__title}>Channel Management</h1>
                        <span className={styles.header__subtitle}>
                            Manage and organize your server channels
                        </span>
                    </div>
                    <div className={styles.header__right}>
                        <button className={styles.createBtn}>
                            <Plus size={20} />
                            Create Channel
                        </button>
                    </div>
                </header>

                {/* Controls */}
                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <Search size={20} />
                        <input
                            type="text"
                            placeholder="Search channels..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.categoryFilters}>
                        {categories.map(category => (
                            <button
                                key={category}
                                className={`${styles.categoryFilter} ${selectedCategory === category ? styles.active : ''}`}
                                onClick={() => setSelectedCategory(category)}
                            >
                                {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                    </div>

                    <div className={styles.viewControls}>
                        <Filter size={20} />
                        <span>Filter</span>
                    </div>
                </div>

                {/* Channels Grid */}
                <section className={styles.channelsGrid}>
                    {filteredChannels.map((channel, index) => (
                        <div key={channel.id} className={styles.channelCard} style={{ animationDelay: `${index * 0.1}s` }}>
                            <div className={styles.channelHeader}>
                                <div className={styles.channelInfo}>
                                    <div className={styles.channelIcon}>
                                        {getChannelIcon(channel.type, channel.isPrivate)}
                                    </div>
                                    <div>
                                        <h3 className={styles.channelName}>#{channel.name}</h3>
                                        <span className={styles.channelCategory}>{channel.category}</span>
                                    </div>
                                </div>
                                <div className={styles.channelActions}>
                                    <button className={styles.actionBtn}>
                                        <Edit size={16} />
                                    </button>
                                    <button className={styles.actionBtn}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            {channel.description && (
                                <p className={styles.channelDescription}>{channel.description}</p>
                            )}

                            <div className={styles.channelStats}>
                                <div className={styles.stat}>
                                    <Users size={14} />
                                    <span>{channel.members.toLocaleString()} members</span>
                                </div>
                                {channel.lastActivity && (
                                    <div className={styles.stat}>
                                        <MessageCircle size={14} />
                                        <span>Active {channel.lastActivity}</span>
                                    </div>
                                )}
                            </div>

                            <div className={styles.channelControls}>
                                {/* Privacy Toggle */}
                                <button
                                    className={`${styles.controlBtn} ${channel.isPrivate ? styles.active : ''}`}
                                    onClick={() => handlePrivacyToggle(channel.id)}
                                >
                                    {channel.isPrivate ? <Lock size={16} /> : <Eye size={16} />}
                                    {channel.isPrivate ? 'Private' : 'Public'}
                                </button>

                                {/* Notification Settings */}
                                <div className={styles.notificationControl}>
                                    <button className={styles.controlBtn}>
                                        {getNotificationIcon(channel.notifications)}
                                        {channel.notifications}
                                    </button>
                                    <div className={styles.notificationDropdown}>
                                        <button
                                            className={`${styles.notificationOption} ${channel.notifications === 'all' ? styles.active : ''}`}
                                            onClick={() => handleNotificationChange(channel.id, 'all')}
                                        >
                                            <Bell size={14} />
                                            All Messages
                                        </button>
                                        <button
                                            className={`${styles.notificationOption} ${channel.notifications === 'mentions' ? styles.active : ''}`}
                                            onClick={() => handleNotificationChange(channel.id, 'mentions')}
                                        >
                                            <Volume2 size={14} />
                                            Mentions Only
                                        </button>
                                        <button
                                            className={`${styles.notificationOption} ${channel.notifications === 'none' ? styles.active : ''}`}
                                            onClick={() => handleNotificationChange(channel.id, 'none')}
                                        >
                                            <BellOff size={14} />
                                            Mute
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.channelStatus}>
                                <div className={`${styles.statusIndicator} ${channel.lastActivity === 'Now' ? styles.online : styles.idle}`}></div>
                                <span>{channel.type === 'voice' ? 'Voice Channel' : 'Text Channel'}</span>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Quick Stats */}
                <div className={styles.quickStats}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Hash size={24} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{channels.filter(c => c.type === 'text').length}</h3>
                            <p>Text Channels</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Volume2 size={24} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{channels.filter(c => c.type === 'voice').length}</h3>
                            <p>Voice Channels</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Lock size={24} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{channels.filter(c => c.isPrivate).length}</h3>
                            <p>Private Channels</p>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Users size={24} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{channels.reduce((acc, channel) => acc + channel.members, 0).toLocaleString()}</h3>
                            <p>Total Members</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Channels;