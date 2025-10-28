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
                            <button className={styles.primaryBtn}>
                                <Plus size={16} />
                                Add User
                            </button>
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
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Status</option>
                            <option value="online">Online</option>
                            <option value="idle">Idle</option>
                            <option value="dnd">Do Not Disturb</option>
                            <option value="offline">Offline</option>
                        </select>

                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className={styles.filterSelect}
                        >
                            <option value="all">All Roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Moderator">Moderator</option>
                            <option value="Developer">Developer</option>
                            <option value="VIP">VIP</option>
                            <option value="Member">Member</option>
                        </select>

                        <button className={styles.filterBtn}>
                            <Filter size={16} />
                            More Filters
                        </button>
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
            </main>
        </div>
    );
}