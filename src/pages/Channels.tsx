import React, { useState, useEffect, useContext, useCallback, useMemo } from "react";
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
import { SidebarContext } from "@/App.js";

// Интерфейсы
interface User {
    id: string;
    username: string;
}

// Обновляем интерфейс Channel
interface Channel {
    id: string;
    name: string;
    type: 'text' | 'voice';
    category: string;
    categoryId?: string;
    parent_id?: string;
    members: number; // Меняем на number вместо массива
    isPrivate: boolean;
    notifications: 'all' | 'mentions' | 'none';
    description?: string;
    lastActivity?: string;
    permissionOverwrites?: any[];
    _debug?: { // Добавляем опциональное поле _debug
        accessPercentage?: number;
        permissionCount?: number;
        totalMembers?: number;
    };
}

interface Category {
    id: string;
    name: string;
    type: 'category';
    position: number;
}

interface DiscordGuildChannel {
    id: string;
    name: string;
    type: number;
    parent_id?: string;
    permission_overwrites: any[];
    nsfw?: boolean;
    topic?: string;
    position?: number;
}

interface DiscordServerStats {
    server: {
        name: string;
        id: string;
        icon: string;
        owner: string;
        created: string;
    };
    members: {
        total: number;
        online: number;
        offline: number;
    };
    channels: {
        total: number;
        text: number;
        voice: number;
    };
    boosts: number;
    tier: number;
}

// Configuration
const CONFIG = {
    GUILD_ID: '1343586237868544052',
    API_BASE_URL: 'http://localhost:3002',
    EXPRESS_API_URL: 'http://localhost:4000/api'
};

// API Service (без изменений)
class DiscordChannelService {
    private static instance: DiscordChannelService;
    private baseUrl = CONFIG.API_BASE_URL;
    private cache = new Map<string, { data: any; timestamp: number }>();
    private cacheTimeout = 60000;

    static getInstance(): DiscordChannelService {
        if (!DiscordChannelService.instance) {
            DiscordChannelService.instance = new DiscordChannelService();
        }
        return DiscordChannelService.instance;
    }

    private async fetchWithCache(url: string): Promise<any> {
        const cached = this.cache.get(url);
        const now = Date.now();

        if (cached && now - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }

        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`API endpoint ${url} returned ${response.status}`);
                return null;
            }
            const data = await response.json();
            this.cache.set(url, { data, timestamp: now });
            return data;
        } catch (error) {
            console.error('API fetch error:', error);
            return null;
        }
    }

    async getGuildChannels(guildId: string): Promise<DiscordGuildChannel[]> {
        try {
            console.log('🔄 Fetching Discord server data...');
            const serverStats = await this.fetchWithCache(`${this.baseUrl}/api/discord/server-stats`);

            if (serverStats && serverStats.channels) {
                console.log('✅ Got server stats with channels info');
                const detailedChannels = await this.getDetailedChannels(guildId);
                return detailedChannels.length > 0 ? detailedChannels : this.getFallbackChannels();
            } else {
                console.log('❌ No server stats found, using fallback');
                return this.getFallbackChannels();
            }
        } catch (error) {
            console.error('Failed to fetch guild channels:', error);
            return this.getFallbackChannels();
        }
    }

    private async getDetailedChannels(guildId: string): Promise<DiscordGuildChannel[]> {
        try {
            const response = await fetch(`${this.baseUrl}/api/discord/channels?guildId=${guildId}`);
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.channels) {
                    console.log(`✅ Got real channels from API: ${data.channels.length} channels`);
                    return data.channels;
                }
            }
            console.log('❌ Real channels API not available, using fallback');
            return this.getFallbackChannels();
        } catch (error) {
            console.error('Error getting detailed channels:', error);
            return this.getFallbackChannels();
        }
    }

    async getServerInfo(guildId: string): Promise<DiscordServerStats | null> {
        return this.fetchWithCache(`${this.baseUrl}/api/discord/server-stats`);
    }

    public getFallbackChannels(): DiscordGuildChannel[] {
        console.log('🔄 Using fallback channels data');
        return [
            {
                id: '1',
                name: 'general',
                type: 0,
                permission_overwrites: [],
                topic: 'General discussions and announcements'
            },
            {
                id: '2',
                name: 'announcements',
                type: 0,
                permission_overwrites: [],
                topic: 'Important server announcements'
            },
            {
                id: '3',
                name: 'gaming',
                type: 2,
                permission_overwrites: []
            }
        ];
    }

    clearCache(): void {
        this.cache.clear();
    }
}

// Custom hooks
const useDiscordChannels = (guildId: string) => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const channelService = useMemo(() => DiscordChannelService.getInstance(), []);

    const fetchChannels = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const discordChannels = await channelService.getGuildChannels(guildId);
            const serverInfo = await channelService.getServerInfo(guildId);
            const totalMembers = serverInfo?.members?.total || 100;

            console.log('📨 === RAW API RESPONSE ===');
            console.log('Discord channels from API:', discordChannels);
            console.log('Server info:', serverInfo);

            const { channels: transformedChannels, categories: transformedCategories } =
                transformDiscordChannels(discordChannels, totalMembers);

            setChannels(transformedChannels);
            setCategories(transformedCategories);

            console.log('📁 Final categories:', transformedCategories);
            console.log('📊 Final channels count:', transformedChannels.length);

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch channels';
            setError(errorMessage);
            console.error('Error fetching channels:', err);

            const fallbackChannels = channelService.getFallbackChannels();
            const { channels: transformedChannels, categories: transformedCategories } =
                transformDiscordChannels(fallbackChannels, 100);
            setChannels(transformedChannels);
            setCategories(transformedCategories);
        } finally {
            setLoading(false);
        }
    }, [guildId, channelService]);

    useEffect(() => {
        fetchChannels();
    }, [fetchChannels]);

    const updateChannel = useCallback((channelId: string, updates: Partial<Channel> | ((prev: Channel) => Partial<Channel>)) => {
        setChannels(prev => prev.map(channel => {
            if (channel.id === channelId) {
                const updatedFields = typeof updates === 'function'
                    ? updates(channel)
                    : updates;
                return { ...channel, ...updatedFields };
            }
            return channel;
        }));
    }, []);

    const refetch = useCallback(() => {
        channelService.clearCache();
        fetchChannels();
    }, [fetchChannels, channelService]);

    return {
        channels,
        categories,
        loading,
        error,
        updateChannel,
        refetch
    };
};

const useChannelFilters = (channels: Channel[]) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const categories = useMemo(() => {
        const uniqueCategories = Array.from(new Set(channels.map(ch => ch.category)));
        return ['all', ...uniqueCategories];
    }, [channels]);

    const filteredChannels = useMemo(() => {
        return channels.filter(channel => {
            const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || channel.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [channels, searchTerm, selectedCategory]);

    return {
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        categories,
        filteredChannels
    };
};

// Utility functions
const transformDiscordChannels = (discordChannels: any[], totalMembers: number): { channels: Channel[], categories: Category[] } => {
    const categories: Category[] = [];
    const channels: Channel[] = [];

    console.log('🔍 === RAW DATA FROM DISCORD API ===');
    console.log('Total channels received:', discordChannels.length);

    // МАППИНГ ID КАТЕГОРИЙ НА РЕАЛЬНЫЕ НАЗВАНИЯ
    const categoryMapping: { [key: string]: string } = {
        '1395038124693786654': 'Welcome',
        '1395039857532993679': 'News',
        '1375390145317961778': 'New Rooms',
        '1375390437153439824': 'Admin',
        '1375390652744859688': 'Team A',
        '1375400470998155375': 'AFK',
        '1376910233930305617': 'Voice Channels'
    };

    // Сначала найдем ВСЕ parent_id чтобы создать категории
    const parentIds = new Set<string>();

    discordChannels.forEach((channel: any) => {
        if (channel.parent_id && typeof channel.parent_id === 'string') {
            parentIds.add(channel.parent_id);
        }
    });

    console.log('📁 Found parent IDs (potential categories):', Array.from(parentIds));

    // Создаем категории для каждого parent_id с РЕАЛЬНЫМИ названиями
    parentIds.forEach((parentId: string) => {
        const realCategoryName = categoryMapping[parentId];

        if (realCategoryName) {
            // Используем реальное название из маппинга
            categories.push({
                id: parentId,
                name: realCategoryName,
                type: 'category',
                position: 0 // Можно добавить логику для позиций если нужно
            });
            console.log(`✅ Created real category: ${realCategoryName} (${parentId})`);
        } else {
            // Ищем канал с этим ID чтобы получить название категории
            const parentChannel = discordChannels.find((c: any) => c.id === parentId);

            if (parentChannel) {
                // Если нашли канал с таким ID, используем его как категорию
                categories.push({
                    id: parentChannel.id,
                    name: parentChannel.name,
                    type: 'category',
                    position: parentChannel.position || 0
                });
                console.log(`✅ Created category from existing channel: ${parentChannel.name}`);
            } else {
                // Если не нашли, создаем категорию с generic именем
                categories.push({
                    id: parentId,
                    name: `Category ${parentId.slice(-4)}`,
                    type: 'category',
                    position: 0
                });
                console.log(`🆕 Created generic category for ID: ${parentId}`);
            }
        }
    });

    // Теперь обрабатываем каналы
    discordChannels.forEach((channel: any) => {
        // Пропускаем каналы которые мы использовали как категории
        if (parentIds.has(channel.id)) {
            console.log(`⏩ Skipping channel used as category: ${channel.name}`);
            return;
        }

        let categoryName = 'Uncategorized';
        let categoryId = '';

        if (channel.parent_id && typeof channel.parent_id === 'string') {
            const parentCategory = categories.find(c => c.id === channel.parent_id);
            if (parentCategory) {
                categoryName = parentCategory.name;
                categoryId = parentCategory.id;
                console.log(`📁 Channel ${channel.name} belongs to category: ${categoryName}`);
            } else {
                console.log(`❌ Parent category not found for channel ${channel.name}, parent_id: ${channel.parent_id}`);
                // Используем реальное название из маппинга если есть
                categoryName = categoryMapping[channel.parent_id] || `Category ${channel.parent_id.slice(-4)}`;
            }
        } else {
            console.log(`🚫 Channel ${channel.name} has no parent_id`);
        }

        const channelType: 'text' | 'voice' = channel.type === 2 ? 'voice' : 'text';
        const isPrivate = channel.name.includes('🔩') ||
            channel.permission_overwrites?.length > 0 ||
            (channel.member_access_percentage && channel.member_access_percentage < 100);

        // Вычисляем количество участников
        let memberCount = 9; // fallback
        if (channel.accessible_members) {
            memberCount = channel.accessible_members;
        } else if (channel.member_access_percentage) {
            memberCount = Math.floor(totalMembers * channel.member_access_percentage / 100);
        }

        channels.push({
            id: channel.id,
            name: channel.name,
            type: channelType,
            category: categoryName,
            categoryId: categoryId,
            parent_id: channel.parent_id,
            members: memberCount,
            isPrivate: isPrivate,
            notifications: 'all',
            description: channel.topic || `${channelType} channel for ${channel.name}`,
            lastActivity: 'Now',
            _debug: {
                accessPercentage: channel.member_access_percentage || 100,
                permissionCount: channel.permission_overwrites?.length || 0,
                totalMembers: totalMembers
            }
        });
    });

    console.log('📊 === TRANSFORMATION RESULTS ===');
    console.log('Categories found:', categories.length);
    console.log('Channels found:', channels.length);
    console.log('Categories:', categories.map(c => `${c.name} (${c.id})`));

    const channelsByCategory = channels.reduce((acc, ch) => {
        acc[ch.category] = (acc[ch.category] || 0) + 1;
        return acc;
    }, {} as { [key: string]: number });

    console.log('Channels by category:', channelsByCategory);

    // Сортируем категории в логическом порядке
    const categoryOrder = ['Welcome', 'News', 'New Rooms', 'Voice Channels', 'AFK', 'Admin', 'Team A'];
    categories.sort((a, b) => {
        const indexA = categoryOrder.indexOf(a.name);
        const indexB = categoryOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return (a.position || 0) - (b.position || 0);
    });

    return { channels, categories };
};

const getNotificationIcon = (level: 'all' | 'mentions' | 'none') => {
    switch (level) {
        case 'all': return <Bell size={16} />;
        case 'mentions': return <Volume2 size={16} />;
        case 'none': return <BellOff size={16} />;
        default: return <Bell size={16} />;
    }
};

const getChannelIcon = (type: 'text' | 'voice', isPrivate: boolean) => {
    if (isPrivate) return <Lock size={16} />;
    return type === 'text' ? <Hash size={16} /> : <Volume2 size={16} />;
};

// Memoized components
interface ChannelCardProps {
    channel: Channel;
    onPrivacyToggle: (id: string) => void;
    onNotificationChange: (id: string, level: 'all' | 'mentions' | 'none') => void;
}

const ChannelCard: React.FC<ChannelCardProps> = React.memo(({
    channel,
    onPrivacyToggle,
    onNotificationChange
}) => {
    return (
        <div className={styles.channelCard}>
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

            {channel._debug && (
                <div className={styles.channelDebug}>
                    <span>Access: {channel._debug.accessPercentage}%</span>
                    <span>Permissions: {channel._debug.permissionCount}</span>
                </div>
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
                <button
                    className={`${styles.controlBtn} ${channel.isPrivate ? styles.active : ''}`}
                    onClick={() => onPrivacyToggle(channel.id)}
                >
                    {channel.isPrivate ? <Lock size={16} /> : <Eye size={16} />}
                    {channel.isPrivate ? 'Private' : 'Public'}
                </button>

                <div className={styles.notificationControl}>
                    <button className={styles.controlBtn}>
                        {getNotificationIcon(channel.notifications)}
                        {channel.notifications}
                    </button>
                    <div className={styles.notificationDropdown}>
                        <button
                            className={`${styles.notificationOption} ${channel.notifications === 'all' ? styles.active : ''}`}
                            onClick={() => onNotificationChange(channel.id, 'all')}
                        >
                            <Bell size={14} />
                            All Messages
                        </button>
                        <button
                            className={`${styles.notificationOption} ${channel.notifications === 'mentions' ? styles.active : ''}`}
                            onClick={() => onNotificationChange(channel.id, 'mentions')}
                        >
                            <Volume2 size={14} />
                            Mentions Only
                        </button>
                        <button
                            className={`${styles.notificationOption} ${channel.notifications === 'none' ? styles.active : ''}`}
                            onClick={() => onNotificationChange(channel.id, 'none')}
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
    );
});

ChannelCard.displayName = 'ChannelCard';

const QuickStats: React.FC<{ channels: Channel[] }> = React.memo(({ channels }) => {
    useEffect(() => {
        console.log('📊 === КАНАЛЫ ДЛЯ СТАТИСТИКИ ===');
        console.log(`Всего каналов: ${channels.length}`);

        channels.forEach((channel, index) => {
            console.log(`--- Канал ${index + 1} ---`);
            console.log(`ID: ${channel.id}`);
            console.log(`Название: ${channel.name}`);
            console.log(`Тип: ${channel.type}`);
            console.log(`Приватный: ${channel.isPrivate}`);
            console.log(`Участники: ${channel.members}`);
            console.log(`Категория: ${channel.category}`);
            console.log('-------------------');
        });

        const textChannels = channels.filter(c => c.type === 'text').length;
        const voiceChannels = channels.filter(c => c.type === 'voice').length;
        const privateChannels = channels.filter(c => c.isPrivate).length;

        console.log('📈 === ИТОГОВАЯ СТАТИСТИКА ===');
        console.log(`Текстовые каналы: ${textChannels}`);
        console.log(`Голосовые каналы: ${voiceChannels}`);
        console.log(`Приватные каналы: ${privateChannels}`);
        console.log(`Всего каналов: ${channels.length}`);
        console.log('============================');
    }, [channels]);

    const stats = useMemo(() => {
        const textChannels = channels.filter(c => c.type === 'text').length;
        const voiceChannels = channels.filter(c => c.type === 'voice').length;
        const privateChannels = channels.filter(c => c.isPrivate).length;

        return {
            textChannels,
            voiceChannels,
            privateChannels,
            totalMembers: 9
        };
    }, [channels]);

    return (
        <div className={styles.quickStats}>
            <div className={styles.statCard}>
                <div className={styles.statIcon}>
                    <Hash size={24} />
                </div>
                <div className={styles.statContent}>
                    <h3>{stats.textChannels}</h3>
                    <p>Text Channels</p>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon}>
                    <Volume2 size={24} />
                </div>
                <div className={styles.statContent}>
                    <h3>{stats.voiceChannels}</h3>
                    <p>Voice Channels</p>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon}>
                    <Lock size={24} />
                </div>
                <div className={styles.statContent}>
                    <h3>{stats.privateChannels}</h3>
                    <p>Private Channels</p>
                </div>
            </div>

            <div className={styles.statCard}>
                <div className={styles.statIcon}>
                    <Users size={24} />
                </div>
                <div className={styles.statContent}>
                    <h3>{stats.totalMembers.toLocaleString()}</h3>
                    <p>Total Members</p>
                </div>
            </div>
        </div>
    );
});

QuickStats.displayName = 'QuickStats';

// Loading and Error components (без изменений)
const LoadingState: React.FC = () => (
    <div className={styles.loadingState}>
        <div className={styles.loadingSpinner}></div>
        <p>Loading channels...</p>
    </div>
);

const ErrorState: React.FC<{ error: string | null; onRetry: () => void }> = ({ error, onRetry }) => (
    <div className={styles.errorState}>
        <h3>Using Demo Data</h3>
        <p>Could not connect to Discord API: {error}</p>
        <button onClick={onRetry} className={styles.retryBtn}>
            Retry Connection
        </button>
    </div>
);

// Main component
const Channels: React.FC = () => {
    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;
    const guildId = CONFIG.GUILD_ID;

    const { channels, categories, loading, error, updateChannel, refetch } = useDiscordChannels(guildId);

    const channelsByCategory = useMemo(() => {
        const grouped: { [categoryName: string]: Channel[] } = {};

        categories.forEach((cat: Category) => {
            grouped[cat.name] = channels.filter(ch => ch.categoryId === cat.id);
        });

        const uncategorized = channels.filter(ch => !ch.categoryId);
        if (uncategorized.length > 0) {
            grouped['Uncategorized'] = uncategorized;
        }

        return grouped;
    }, [channels, categories]);

    const filterCategories = useMemo(() => {
        return ['all', ...categories.map((cat: Category) => cat.name), ...(channelsByCategory['Uncategorized'] ? ['Uncategorized'] : [])];
    }, [categories, channelsByCategory]);

    const {
        searchTerm,
        setSearchTerm,
        selectedCategory,
        setSelectedCategory,
        categories: filterCats,
        filteredChannels
    } = useChannelFilters(channels);

    const handleNotificationChange = useCallback((channelId: string, level: 'all' | 'mentions' | 'none') => {
        updateChannel(channelId, { notifications: level });
    }, [updateChannel]);

    const handlePrivacyToggle = useCallback((channelId: string) => {
        updateChannel(channelId, (prev: Channel) => ({
            isPrivate: !prev.isPrivate
        }));
    }, [updateChannel]);

    const getFilteredChannelsByCategory = useCallback((categoryChannels: Channel[]) => {
        return categoryChannels.filter(channel => {
            const matchesSearch = channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                channel.description?.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesCategory = selectedCategory === 'all' || selectedCategory === channel.category;
            return matchesSearch && matchesCategory;
        });
    }, [searchTerm, selectedCategory]);

    if (loading) {
        return (
            <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Saidbar />
                <main className="main">
                    <LoadingState />
                </main>
            </div>
        );
    }

    return (
        <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Saidbar />
            <main className="main">
                {error && (
                    <div className={styles.warningBanner}>
                        <div className={styles.warningContent}>
                            <span>⚠️ Using demo data - {error}</span>
                            <button onClick={refetch} className={styles.retryBtn}>
                                Retry
                            </button>
                        </div>
                    </div>
                )}

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
                        {filterCategories.map((category: string) => (
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

                <section className={styles.channelsSection}>
                    {categories.map((category: Category) => {
                        const categoryChannels = getFilteredChannelsByCategory(channelsByCategory[category.name] || []);
                        if (categoryChannels.length === 0) return null;

                        return (
                            <div key={category.id} className={styles.categorySection}>
                                <h2 className={styles.categoryTitle}>
                                    {category.name}
                                    <span className={styles.channelCount}>
                                        {categoryChannels.length} channels
                                    </span>
                                </h2>
                                <div className={styles.channelsGrid}>
                                    {categoryChannels.map((channel) => (
                                        <ChannelCard
                                            key={channel.id}
                                            channel={channel}
                                            onPrivacyToggle={handlePrivacyToggle}
                                            onNotificationChange={handleNotificationChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    {channelsByCategory['Uncategorized'] && (() => {
                        const uncategorizedChannels = getFilteredChannelsByCategory(channelsByCategory['Uncategorized']);
                        if (uncategorizedChannels.length === 0) return null;

                        return (
                            <div className={styles.categorySection}>
                                <h2 className={styles.categoryTitle}>
                                    Uncategorized
                                    <span className={styles.channelCount}>
                                        {uncategorizedChannels.length} channels
                                    </span>
                                </h2>
                                <div className={styles.channelsGrid}>
                                    {uncategorizedChannels.map((channel) => (
                                        <ChannelCard
                                            key={channel.id}
                                            channel={channel}
                                            onPrivacyToggle={handlePrivacyToggle}
                                            onNotificationChange={handleNotificationChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })()}
                </section>

                <QuickStats channels={channels} />
            </main>
        </div>
    );
};

export default Channels;