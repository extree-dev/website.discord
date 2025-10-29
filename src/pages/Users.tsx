import React, { useState, useEffect, useContext } from "react"; // Добавлен useContext
import Sidebars from "@/components/Saidbar.js";
import {
    Search,
    Filter,
    MoreHorizontal,
    Mail,
    Shield,
    Ban,
    Crown,
    Star,
    User,
    UserCheck,
    UserX,
    Clock,
    Edit,
    Trash2,
    Download,
    Upload,
    Plus,
    Eye,
    MessageCircle,
    AlertTriangle,
    CheckCircle,
    XCircle,
    RefreshCw,
    Users as UsersIcon
} from "lucide-react";
import styles from "../module_pages/Users.module.scss";
import { SidebarContext } from "@/App.js"; // Добавлен импорт контекста

interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string;
    status: 'online' | 'idle' | 'dnd' | 'offline';
    roles: (string | { id: string; name: string; color: string })[]; // Обновленный тип
    joinedAt: string;
    lastActive: string;
    warnings: number;
    isBanned: boolean;
    isMuted: boolean;
    bot?: boolean;
}

export default function Users() {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [roleFilter, setRoleFilter] = useState<string>('all');
    const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 10;
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [isMoreFiltersOpen, setIsMoreFiltersOpen] = useState(false);
    const [filters, setFilters] = useState({
        hasWarnings: false,
        isBanned: false,
        isMuted: false,
        isBot: false,
        joinedDate: '',
        lastActive: ''
    });
    const [isLastActiveOpen, setIsLastActiveOpen] = useState(false);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState('');
    const statusOptions = [
        { value: 'all', label: 'All Status', displayLabel: 'All', color: '#888' },
        { value: 'online', label: 'Online', displayLabel: 'Online', color: '#22c55e' },
        { value: 'idle', label: 'Idle', displayLabel: 'Idle', color: '#f59e0b' },
        { value: 'dnd', label: 'Do Not Disturb', displayLabel: 'Do Not Disturb', color: '#ef4444' },
        { value: 'offline', label: 'Offline', displayLabel: 'Offline', color: '#6b7280' }
    ];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element).closest(`.${styles.selectContainer}`)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const roleOptions = [
        { value: 'all', label: 'All Roles', displayLabel: 'All', color: '#888' },
        { value: 'Admin', label: 'Admin', displayLabel: 'Admin', color: '#ef4444' },
        { value: 'Moderator', label: 'Moderator', displayLabel: 'Moderator', color: '#8b5cf6' },
        { value: 'Developer', label: 'Developer', displayLabel: 'Developer', color: '#3b82f6' },
        { value: 'VIP', label: 'VIP', displayLabel: 'VIP', color: '#f59e0b' },
        { value: 'Member', label: 'Member', displayLabel: 'Member', color: '#22c55e' }
    ];

    // Обновите обработчик клика вне области
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (!(event.target as Element).closest(`.${styles.selectContainer}`) &&
                !(event.target as Element).closest(`.${styles.moreFiltersContainer}`) &&
                !(event.target as Element).closest(`.${styles.lastActiveContainer}`) &&
                !(event.target as Element).closest(`.${styles.calendarContainer}`)) {
                // Закрываем все дропдауны
                handleDropdownToggle('close');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Функции для календаря
    const navigateMonth = (direction: number) => {
        setCurrentDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(prev.getMonth() + direction);
            return newDate;
        });
    };

    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const formatDateForInput = (date: Date) => {
        return date.toISOString().split('T')[0];
    };

    const handleDateSelect = (day: number) => {
        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        const dateString = formatDateForInput(newDate);

        setSelectedDate(dateString);
        setFilters(prev => ({
            ...prev,
            joinedDate: dateString
        }));
        setIsCalendarOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const todayString = formatDateForInput(today);

        setSelectedDate(todayString);
        setFilters(prev => ({
            ...prev,
            joinedDate: todayString
        }));
        setIsCalendarOpen(false);
    };

    const handleClearDate = () => {
        setSelectedDate('');
        setFilters(prev => ({
            ...prev,
            joinedDate: ''
        }));
        setIsCalendarOpen(false);
    };

    // Получение данных для календаря
    const getCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentDate);
        const firstDay = getFirstDayOfMonth(currentDate);
        const days = [];

        // Добавляем пустые ячейки для дней предыдущего месяца
        for (let i = 0; i < firstDay; i++) {
            days.push(null);
        }

        // Добавляем дни текущего месяца
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i);
        }

        return days;
    };

    const handleDropdownToggle = (dropdownType: 'status' | 'role' | 'moreFilters' | 'lastActive' | 'calendar' | 'close', isNested: boolean = false) => {
        // Если это вложенный дропдаун (inside More Filters), не закрываем More Filters
        if (!isNested) {
            // Закрываем все основные дропдауны
            setIsDropdownOpen(false);
            setIsRoleDropdownOpen(false);
            setIsMoreFiltersOpen(false);
            setIsLastActiveOpen(false);
            setIsCalendarOpen(false);
        } else {
            // Для вложенных дропдаунов закрываем только другие вложенные
            // Делаем календарь и Last Active взаимоисключающими
            if (dropdownType === 'lastActive') {
                setIsCalendarOpen(false);
            } else if (dropdownType === 'calendar') {
                setIsLastActiveOpen(false);
            }
        }

        // Открываем нужный дропдаун
        switch (dropdownType) {
            case 'status':
                setIsDropdownOpen(true);
                break;
            case 'role':
                setIsRoleDropdownOpen(true);
                break;
            case 'moreFilters':
                setIsMoreFiltersOpen(true);
                break;
            case 'lastActive':
                setIsLastActiveOpen(prev => !prev); // Переключаем состояние
                break;
            case 'calendar':
                setIsCalendarOpen(prev => !prev); // Переключаем состояние
                break;
            default:
                // Если передано что-то другое, закрываем все
                break;
        }
    };

    // Получаем состояние сайдбара из контекста
    const sidebarContext = useContext(SidebarContext);
    const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

    // Mock data
    useEffect(() => {
        console.log('🔍 VITE_GUILD_ID:', import.meta.env.VITE_GUILD_ID);
        console.log('🔍 All env vars:', import.meta.env);
        const fetchUsers = async () => {
            setIsLoading(true);
            try {
                // Для Vite используем import.meta.env
                const guildId = import.meta.env.VITE_GUILD_ID || '1343586237868544052';

                console.log('🔄 Fetching users for guild:', guildId);
                const response = await fetch(`/api/auth/system/discord/users?guildId=${guildId}`);
                const data = await response.json();

                if (data.success && data.users && data.users.length > 0) {
                    console.log('✅ Real Discord users loaded:', data.users.length);
                    setUsers(data.users);
                    setFilteredUsers(data.users);
                } else {
                    console.log('❌ No real users available');
                    setUsers([]);
                    setFilteredUsers([]);
                }
            } catch (error) {
                console.error('❌ Error fetching real users:', error);
                setUsers([]);
                setFilteredUsers([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUsers();
    }, []);

    // Filter users
    useEffect(() => {
        let filtered = users;

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(user =>
                user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
                user.id.includes(searchQuery)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(user => user.status === statusFilter);
        }

        // Role filter
        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.roles.includes(roleFilter));
        }

        setFilteredUsers(filtered);
        setCurrentPage(1);
    }, [searchQuery, statusFilter, roleFilter, users]);

    // Pagination
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

    const handleSelectUser = (userId: string) => {
        setSelectedUsers(prev =>
            prev.includes(userId)
                ? prev.filter(id => id !== userId)
                : [...prev, userId]
        );
    };

    const handleSelectAll = () => {
        setSelectedUsers(
            selectedUsers.length === currentUsers.length
                ? []
                : currentUsers.map(user => user.id)
        );
    };

    const getStatusIcon = (status: string) => {
        return null; // Просто возвращаем null вместо точек
    };


    const getStatusText = (status: string, lastActive: string) => {
        const statusText = {
            'online': 'Online',
            'idle': 'Idle',
            'dnd': 'Do Not Disturb',
            'offline': 'Offline'
        }[status] || 'Offline';

        return `${statusText} • ${lastActive}`;
    };

    const getRoleIcon = (role: string | any) => {
        const roleName = typeof role === 'string' ? role : role.name;

        switch (roleName) {
            case 'Admin': return <Crown size={14} />;
            case 'Moderator': return <Shield size={14} />;
            case 'Developer': return <Star size={14} />;
            case 'VIP': return <Star size={14} />;
            default: return <User size={14} />;
        }
    };

    const getRoleColor = (role: string | any): string => {
        const roleName = typeof role === 'string' ? role : role.name;

        switch (roleName) {
            case 'Admin': return '#ef4444';
            case 'Moderator': return '#f59e0b';
            case 'Developer': return '#3b82f6';
            case 'VIP': return '#8b5cf6';
            default: return '#6b7280';
        }
    };

    const handleAction = (action: string, userId: string) => {
        console.log(`${action} user ${userId}`);
        // Implement action logic here
    };

    if (isLoading) {
        return (
            <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                <Sidebars />
                <div className={styles.loadingContainer}>
                    <RefreshCw size={32} className={styles.loadingSpinner} />
                    <p>Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={`layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <Sidebars />

            <main className="main">
                {/* Header */}
                <header className={styles.header}>
                    <div className={styles.headerContent}>
                        <div className={styles.headerText}>
                            <h1>User Management</h1>
                            <span className={styles.subtitle}>
                                Manage and monitor server members
                            </span>
                        </div>
                        <div className={styles.headerActions}>
                            <button className={styles.secondaryBtn}>
                                <Download size={16} />
                                Export
                            </button>
                        </div>
                    </div>
                </header>

                {/* Stats Overview */}
                <section className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <UsersIcon size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{users.length}</h3>
                            <p>Total Users</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <UserCheck size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{users.filter(u => u.status === 'online').length}</h3>
                            <p>Online Now</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <Ban size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{users.filter(u => u.isBanned).length}</h3>
                            <p>Banned Users</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statIcon}>
                            <AlertTriangle size={20} />
                        </div>
                        <div className={styles.statContent}>
                            <h3>{users.filter(u => u.warnings > 0).length}</h3>
                            <p>Active Warnings</p>
                        </div>
                    </div>
                </section>

                {/* Filters and Search */}
                <div className={styles.controls}>
                    <div className={styles.searchBox}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search users by name or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.searchInput}
                        />
                    </div>

                    <div className={styles.filters}>
                        {/* Status Dropdown */}
                        <div className={styles.selectContainer}>
                            <div
                                className={styles.dropdownTrigger}
                                onClick={() => handleDropdownToggle('status')}
                            >
                                <div className={styles.selectedValue}>
                                    <div className={styles.statusIndicator + ' ' + styles[statusFilter]} />
                                    <span>{statusOptions.find(opt => opt.value === statusFilter)?.label}</span>
                                </div>
                                <svg
                                    className={`${styles.selectArrow} ${isDropdownOpen ? styles.rotated : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {isDropdownOpen && (
                                <div className={styles.customDropdown}>
                                    {statusOptions.map(option => (
                                        <div
                                            key={option.value}
                                            className={`${styles.dropdownOption} ${statusFilter === option.value ? styles.active : ''}`}
                                            onClick={() => {
                                                setStatusFilter(option.value);
                                                setIsDropdownOpen(false);
                                            }}
                                        >
                                            <div className={styles.optionContent}>
                                                <div
                                                    className={styles.optionIndicator}
                                                    style={{ backgroundColor: option.color }}
                                                />
                                                <span className={styles.optionText}>{option.displayLabel}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Role Dropdown */}
                        <div className={styles.selectContainer}>
                            <div
                                className={styles.dropdownTrigger}
                                onClick={() => handleDropdownToggle('role')}
                            >
                                <div className={styles.selectedValue}>
                                    <div className={styles.roleIndicator + ' ' + styles[roleFilter]} />
                                    <span>{roleOptions.find(opt => opt.value === roleFilter)?.label}</span>
                                </div>
                                <svg
                                    className={`${styles.selectArrow} ${isRoleDropdownOpen ? styles.rotated : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </div>

                            {isRoleDropdownOpen && (
                                <div className={styles.customDropdown}>
                                    {roleOptions.map(option => (
                                        <div
                                            key={option.value}
                                            className={`${styles.dropdownOption} ${roleFilter === option.value ? styles.active : ''}`}
                                            onClick={() => {
                                                setRoleFilter(option.value);
                                                setIsRoleDropdownOpen(false);
                                            }}
                                        >
                                            <div className={styles.optionContent}>
                                                <div
                                                    className={styles.roleOptionIndicator}
                                                    style={{ backgroundColor: option.color }}
                                                />
                                                <span className={styles.optionText}>{option.displayLabel}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* More Filters */}
                        <div className={styles.moreFiltersContainer}>
                            <button
                                className={`${styles.filterBtn} ${isMoreFiltersOpen ? styles.active : ''}`}
                                onClick={() => handleDropdownToggle('moreFilters')}
                            >
                                <Filter size={16} />
                                More Filters
                                <svg
                                    className={`${styles.selectArrow} ${isMoreFiltersOpen ? styles.rotated : ''}`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                            </button>

                            {isMoreFiltersOpen && (
                                <div className={styles.moreFiltersDropdown}>
                                    <div className={styles.filtersHeader}>
                                        <h3>Advanced Filters</h3>
                                        <button
                                            className={styles.clearAllBtn}
                                            onClick={() => setFilters({
                                                hasWarnings: false,
                                                isBanned: false,
                                                isMuted: false,
                                                isBot: false,
                                                joinedDate: '',
                                                lastActive: ''
                                            })}
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    <div className={styles.filterSection}>
                                        <h4>User Status</h4>
                                        <div className={styles.checkboxGroup}>
                                            <label className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.hasWarnings}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        hasWarnings: e.target.checked
                                                    }))}
                                                    className={styles.filterCheckbox}
                                                />
                                                <span className={styles.checkboxCustom}></span>
                                                Has Warnings
                                            </label>
                                            <label className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.isBanned}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        isBanned: e.target.checked
                                                    }))}
                                                    className={styles.filterCheckbox}
                                                />
                                                <span className={styles.checkboxCustom}></span>
                                                Banned Users
                                            </label>
                                            <label className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.isMuted}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        isMuted: e.target.checked
                                                    }))}
                                                    className={styles.filterCheckbox}
                                                />
                                                <span className={styles.checkboxCustom}></span>
                                                Muted Users
                                            </label>
                                            <label className={styles.checkboxLabel}>
                                                <input
                                                    type="checkbox"
                                                    checked={filters.isBot}
                                                    onChange={(e) => setFilters(prev => ({
                                                        ...prev,
                                                        isBot: e.target.checked
                                                    }))}
                                                    className={styles.filterCheckbox}
                                                />
                                                <span className={styles.checkboxCustom}></span>
                                                Bot Accounts
                                            </label>
                                        </div>
                                    </div>

                                    <div className={styles.filterSection}>
                                        <h4>Date Filters</h4>
                                        <div className={styles.inputGroup}>
                                            <label>Joined After</label>
                                            <div className={styles.calendarContainer}>
                                                <div
                                                    className={styles.dateInputTrigger}
                                                    onClick={() => handleDropdownToggle('calendar', true)}
                                                >
                                                    <span>
                                                        {filters.joinedDate ? new Date(filters.joinedDate).toLocaleDateString() : 'Select date'}
                                                    </span>
                                                    <svg
                                                        className={`${styles.selectArrow} ${isCalendarOpen ? styles.rotated : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>

                                                {isCalendarOpen && (
                                                    <div className={styles.calendarDropdown}>
                                                        {/* Header календаря */}
                                                        <div className={styles.calendarHeader}>
                                                            <button
                                                                className={styles.calendarNavButton}
                                                                onClick={() => navigateMonth(-1)}
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                                </svg>
                                                            </button>

                                                            <div className={styles.calendarTitle}>
                                                                {currentDate.toLocaleString('default', { month: 'long' })} {currentDate.getFullYear()}
                                                            </div>

                                                            <button
                                                                className={styles.calendarNavButton}
                                                                onClick={() => navigateMonth(1)}
                                                            >
                                                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Дни недели */}
                                                        <div className={styles.calendarWeekDays}>
                                                            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                                                                <div key={day} className={styles.weekDay}>
                                                                    {day}
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Дни месяца */}
                                                        <div className={styles.calendarDays}>
                                                            {getCalendarDays().map((day, index) => {
                                                                if (day === null) {
                                                                    return <div key={`empty-${index}`} className={styles.calendarDayEmpty} />;
                                                                }

                                                                const isSelected = filters.joinedDate &&
                                                                    new Date(filters.joinedDate).getDate() === day &&
                                                                    new Date(filters.joinedDate).getMonth() === currentDate.getMonth() &&
                                                                    new Date(filters.joinedDate).getFullYear() === currentDate.getFullYear();

                                                                const isToday = new Date().getDate() === day &&
                                                                    new Date().getMonth() === currentDate.getMonth() &&
                                                                    new Date().getFullYear() === currentDate.getFullYear();

                                                                return (
                                                                    <div
                                                                        key={day}
                                                                        className={`${styles.calendarDay} ${isSelected ? styles.calendarDaySelected : ''
                                                                            } ${isToday ? styles.calendarDayToday : ''}`}
                                                                        onClick={() => handleDateSelect(day)}
                                                                    >
                                                                        {day}
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Actions */}
                                                        <div className={styles.calendarActions}>
                                                            <button
                                                                className={styles.calendarActionBtn}
                                                                onClick={handleClearDate}
                                                            >
                                                                Clear
                                                            </button>
                                                            <button
                                                                className={styles.calendarActionBtn}
                                                                onClick={handleToday}
                                                            >
                                                                Today
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className={styles.inputGroup}>
                                            <label>Last Active</label>
                                            <div className={styles.lastActiveContainer}>
                                                <div
                                                    className={styles.dropdownTrigger}
                                                    onClick={() => handleDropdownToggle('lastActive', true)}
                                                >
                                                    <div className={styles.selectedValue}>
                                                        <span>
                                                            {filters.lastActive === '' ? 'Any time' :
                                                                filters.lastActive === 'day' ? 'Last 24 hours' :
                                                                    filters.lastActive === 'week' ? 'Last week' :
                                                                        filters.lastActive === 'month' ? 'Last month' : 'Last 3 months'}
                                                        </span>
                                                    </div>
                                                    <svg
                                                        className={`${styles.selectArrow} ${isLastActiveOpen ? styles.rotated : ''}`}
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>

                                                {isLastActiveOpen && (
                                                    <div className={styles.customDropdown}>
                                                        {[
                                                            { value: '', label: 'Any time' },
                                                            { value: 'day', label: 'Last 24 hours' },
                                                            { value: 'week', label: 'Last week' },
                                                            { value: 'month', label: 'Last month' },
                                                            { value: '3months', label: 'Last 3 months' }
                                                        ].map(option => (
                                                            <div
                                                                key={option.value}
                                                                className={`${styles.dropdownOption} ${filters.lastActive === option.value ? styles.active : ''}`}
                                                                onClick={() => {
                                                                    setFilters(prev => ({
                                                                        ...prev,
                                                                        lastActive: option.value
                                                                    }));
                                                                    setIsLastActiveOpen(false);
                                                                }}
                                                            >
                                                                <div className={styles.optionContent}>
                                                                    <span className={styles.optionText}>{option.label}</span>
                                                                </div>
                                                                {filters.lastActive === option.value && (
                                                                    <svg
                                                                        className={styles.checkIcon}
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        viewBox="0 0 24 24"
                                                                    >
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                                    </svg>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.filterActions}>
                                        <button
                                            className={styles.applyBtn}
                                            onClick={() => {
                                                // Применить фильтры
                                                console.log('Applied filters:', filters);
                                                setIsMoreFiltersOpen(false);
                                            }}
                                        >
                                            Apply Filters
                                        </button>
                                        <button
                                            className={styles.cancelBtn}
                                            onClick={() => setIsMoreFiltersOpen(false)}
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className={styles.tableContainer}>
                    <div className={styles.tableHeader}>
                        <div className={styles.tableInfo}>
                            <span>
                                Showing {indexOfFirstUser + 1}-{Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length} users
                            </span>
                            {selectedUsers.length > 0 && (
                                <span className={styles.selectedCount}>
                                    {selectedUsers.length} selected
                                </span>
                            )}
                        </div>

                        <div className={styles.tableActions}>
                            {selectedUsers.length > 0 && (
                                <>
                                    <button className={styles.actionBtn}>
                                        <Mail size={16} />
                                        Message
                                    </button>
                                    <button className={styles.actionBtn}>
                                        <Ban size={16} />
                                        Ban
                                    </button>
                                    <button className={styles.actionBtn}>
                                        <Trash2 size={16} />
                                        Remove
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className={styles.table}>
                        <div className={styles.tableRow + ' ' + styles.tableHeaderRow}>
                            <div className={styles.tableCell + ' ' + styles.checkboxCell}>
                                <input
                                    type="checkbox"
                                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                                    onChange={handleSelectAll}
                                    className={styles.checkbox}
                                />
                            </div>
                            <div className={styles.tableCell + ' ' + styles.userCell}>User</div>
                            <div className={styles.tableCell + ' ' + styles.rolesCell}>Roles</div>
                            <div className={styles.tableCell + ' ' + styles.statusCell}>Status</div>
                            <div className={styles.tableCell + ' ' + styles.joinedCell}>Joined</div>
                            <div className={styles.tableCell + ' ' + styles.warningsCell}>Warnings</div>
                            <div className={styles.tableCell + ' ' + styles.actionsCell}>Actions</div>
                        </div>

                        {currentUsers.map((user) => (
                            <div key={user.id} className={styles.tableRow + ' ' + (selectedUsers.includes(user.id) ? styles.selected : '')}>
                                <div className={styles.tableCell + ' ' + styles.checkboxCell}>
                                    <input
                                        type="checkbox"
                                        checked={selectedUsers.includes(user.id)}
                                        onChange={() => handleSelectUser(user.id)}
                                        className={styles.checkbox}
                                    />
                                </div>

                                <div className={styles.tableCell + ' ' + styles.userCell}>
                                    <div className={styles.userInfo}>
                                        <div className={styles.avatar}>
                                            {user.avatar ? (
                                                <img src={user.avatar} alt={user.username} />
                                            ) : (
                                                <User size={20} />
                                            )}
                                            {getStatusIcon(user.status)}
                                        </div>
                                        <div className={styles.userDetails}>
                                            <div className={styles.username}>
                                                {user.username}
                                                <span className={styles.discriminator}>#{user.discriminator}</span>
                                            </div>
                                            <div className={styles.userId}>ID: {user.id}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.rolesCell}>
                                    <div className={styles.roles}>
                                        {user.roles.map((role, index) => {
                                            // Обрабатываем как строку, так и объект
                                            const roleName = typeof role === 'string' ? role : role.name;
                                            const roleColor = typeof role === 'string' ? getRoleColor(role) : role.color;

                                            return (
                                                <span
                                                    key={index}
                                                    className={styles.roleBadge}
                                                    style={{ backgroundColor: roleColor }}
                                                >
                                                    {getRoleIcon(roleName)}
                                                    {roleName}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.statusCell}>
                                    <div className={styles.status}>
                                        <span className={styles.statusText}>
                                            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                                        </span>
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.joinedCell}>
                                    <div className={styles.joinedDate}>
                                        {new Date(user.joinedAt).toLocaleDateString()}
                                    </div>
                                    <div className={styles.lastActive}>
                                        <Clock size={12} />
                                        {user.lastActive}
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.warningsCell}>
                                    <div className={styles.warnings}>
                                        {user.warnings > 0 ? (
                                            <span className={styles.warningCount}>
                                                {user.warnings} warning{user.warnings !== 1 ? 's' : ''}
                                            </span>
                                        ) : (
                                            <span className={styles.noWarnings}>No warnings</span>
                                        )}
                                    </div>
                                </div>

                                <div className={styles.tableCell + ' ' + styles.actionsCell}>
                                    <div className={styles.actions}>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => handleAction('view', user.id)}
                                            title="View Profile"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => handleAction('message', user.id)}
                                            title="Send Message"
                                        >
                                            <MessageCircle size={16} />
                                        </button>
                                        <button
                                            className={styles.iconBtn}
                                            onClick={() => handleAction('edit', user.id)}
                                            title="Edit User"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        {user.isBanned ? (
                                            <button
                                                className={styles.iconBtn}
                                                onClick={() => handleAction('unban', user.id)}
                                                title="Unban User"
                                            >
                                                <CheckCircle size={16} />
                                            </button>
                                        ) : (
                                            <button
                                                className={styles.iconBtn + ' ' + styles.danger}
                                                onClick={() => handleAction('ban', user.id)}
                                                title="Ban User"
                                            >
                                                <Ban size={16} />
                                            </button>
                                        )}
                                        <button
                                            className={styles.iconBtn + ' ' + styles.danger}
                                            onClick={() => handleAction('delete', user.id)}
                                            title="Remove User"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className={styles.pagination}>
                            <button
                                className={styles.paginationBtn}
                                disabled={currentPage === 1}
                                onClick={() => setCurrentPage(currentPage - 1)}
                            >
                                Previous
                            </button>

                            <div className={styles.paginationPages}>
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(page =>
                                        page === 1 ||
                                        page === totalPages ||
                                        Math.abs(page - currentPage) <= 1
                                    )
                                    .map((page, index, array) => (
                                        <React.Fragment key={page}>
                                            {index > 0 && array[index - 1] !== page - 1 && (
                                                <span className={styles.paginationEllipsis}>...</span>
                                            )}
                                            <button
                                                className={`${styles.paginationPage} ${currentPage === page ? styles.active : ''}`}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </button>
                                        </React.Fragment>
                                    ))
                                }
                            </div>

                            <button
                                className={styles.paginationBtn}
                                disabled={currentPage === totalPages}
                                onClick={() => setCurrentPage(currentPage + 1)}
                            >
                                Next
                            </button>
                        </div>
                    )}
                </div>
            </main >
        </div >
    );
}