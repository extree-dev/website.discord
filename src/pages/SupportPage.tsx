import React, { useState, useEffect } from "react";
import {
    MessageCircle,
    Search,
    Filter,
    Plus,
    Clock,
    CheckCircle,
    AlertCircle,
    User,
    Mail,
    Calendar,
    Tag,
    ArrowUp,
    Download,
    RefreshCw,
    Phone,
    Video,
    FileText,
    HelpCircle,
    Bug,
    Lightbulb,
    ThumbsUp,
    ThumbsDown,
    Send,
    Paperclip,
    Smile,
    MoreVertical,
    Cpu
} from "lucide-react";
import Sidebars from "@/components/Saidbar.js";
import styles from "../module_pages/SupportPage.module.scss";

interface SupportTicket {
    id: string;
    subject: string;
    description: string;
    status: 'open' | 'pending' | 'resolved' | 'closed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    category: 'technical' | 'billing' | 'account' | 'feature' | 'bug' | 'other';
    user: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    assignedTo?: {
        id: string;
        name: string;
        email: string;
        avatar?: string;
    };
    createdAt: Date;
    updatedAt: Date;
    lastMessage?: string;
    messageCount: number;
    attachments: number;
}

interface SupportMessage {
    id: string;
    ticketId: string;
    content: string;
    sender: {
        id: string;
        name: string;
        email: string;
        type: 'user' | 'support';
        avatar?: string;
    };
    createdAt: Date;
    attachments: {
        name: string;
        url: string;
        size: number;
        type: string;
    }[];
    isInternal: boolean;
}

interface SupportStats {
    total: number;
    open: number;
    pending: number;
    resolved: number;
    highPriority: number;
    avgResponseTime: number;
}

export const SupportPage: React.FC = () => {
    const [tickets, setTickets] = useState<SupportTicket[]>([]);
    const [filteredTickets, setFilteredTickets] = useState<SupportTicket[]>([]);
    const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [stats, setStats] = useState<SupportStats>({
        total: 0,
        open: 0,
        pending: 0,
        resolved: 0,
        highPriority: 0,
        avgResponseTime: 2.5
    });
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeFilter, setActiveFilter] = useState('all');
    const [newMessage, setNewMessage] = useState("");
    const [isCreatingTicket, setIsCreatingTicket] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: '',
        description: '',
        category: 'technical' as SupportTicket['category'],
        priority: 'medium' as SupportTicket['priority']
    });

    const statusOptions = [
        { value: 'all', label: 'All Tickets', count: 0 },
        { value: 'open', label: 'Open', count: 0, color: '#3b82f6', icon: Clock },
        { value: 'pending', label: 'Pending', count: 0, color: '#f59e0b', icon: AlertCircle },
        { value: 'resolved', label: 'Resolved', count: 0, color: '#10b981', icon: CheckCircle },
        { value: 'closed', label: 'Closed', count: 0, color: '#6b7280', icon: CheckCircle }
    ];

    const priorityOptions = [
        { value: 'low', label: 'Low', color: '#10b981' },
        { value: 'medium', label: 'Medium', color: '#f59e0b' },
        { value: 'high', label: 'High', color: '#ef4444' },
        { value: 'urgent', label: 'Urgent', color: '#dc2626' }
    ];

    const categoryOptions = [
        { value: 'technical', label: 'Technical', icon: Cpu },
        { value: 'billing', label: 'Billing', icon: FileText },
        { value: 'account', label: 'Account', icon: User },
        { value: 'feature', label: 'Feature Request', icon: Lightbulb },
        { value: 'bug', label: 'Bug Report', icon: Bug },
        { value: 'other', label: 'Other', icon: HelpCircle }
    ];

    useEffect(() => {
        loadTickets();
    }, []);

    useEffect(() => {
        if (tickets.length > 0) {
            applyFilters();
            calculateStats();
        }
    }, [tickets, searchTerm, activeFilter]);

    useEffect(() => {
        if (selectedTicket) {
            loadMessages(selectedTicket.id);
        }
    }, [selectedTicket]);

    const loadTickets = async () => {
        setIsLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            const mockTickets = generateMockTickets();
            setTickets(mockTickets);
            setFilteredTickets(mockTickets);
        } catch (error) {
            console.error('Error loading tickets:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadMessages = async (ticketId: string) => {
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 500));
            const mockMessages = generateMockMessages(ticketId);
            setMessages(mockMessages);
        } catch (error) {
            console.error('Error loading messages:', error);
        }
    };

    const generateMockTickets = (): SupportTicket[] => {
        const mockTickets: SupportTicket[] = [];
        const statuses: SupportTicket['status'][] = ['open', 'pending', 'resolved', 'closed'];
        const priorities: SupportTicket['priority'][] = ['low', 'medium', 'high', 'urgent'];
        const categories: SupportTicket['category'][] = ['technical', 'billing', 'account', 'feature', 'bug', 'other'];

        for (let i = 1; i <= 25; i++) {
            const status = statuses[Math.floor(Math.random() * statuses.length)];
            const priority = priorities[Math.floor(Math.random() * priorities.length)];
            const category = categories[Math.floor(Math.random() * categories.length)];

            mockTickets.push({
                id: `TICKET-${1000 + i}`,
                subject: `Support Request #${i}: ${getMockSubject(category)}`,
                description: `I'm experiencing an issue with ${getMockDescription(category)}. This has been affecting my workflow and I would appreciate your assistance in resolving this matter as soon as possible.`,
                status,
                priority,
                category,
                user: {
                    id: `user-${i}`,
                    name: `User ${i}`,
                    email: `user${i}@example.com`
                },
                assignedTo: Math.random() > 0.3 ? {
                    id: 'support-1',
                    name: 'Support Agent',
                    email: 'support@example.com'
                } : undefined,
                createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
                updatedAt: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
                lastMessage: 'Looking into this issue for you...',
                messageCount: Math.floor(Math.random() * 10) + 1,
                attachments: Math.floor(Math.random() * 3)
            });
        }

        return mockTickets.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    };

    const generateMockMessages = (ticketId: string): SupportMessage[] => {
        const mockMessages: SupportMessage[] = [];
        const messageCount = Math.floor(Math.random() * 8) + 2;

        for (let i = 1; i <= messageCount; i++) {
            const isUser = i % 2 === 1;
            mockMessages.push({
                id: `msg-${ticketId}-${i}`,
                ticketId,
                content: getMockMessageContent(isUser, i),
                sender: {
                    id: isUser ? 'user-1' : 'support-1',
                    name: isUser ? 'You' : 'Support Agent',
                    email: isUser ? 'user@example.com' : 'support@example.com',
                    type: isUser ? 'user' : 'support'
                },
                createdAt: new Date(Date.now() - (messageCount - i) * 30 * 60 * 1000),
                attachments: Math.random() > 0.8 ? [
                    {
                        name: 'screenshot.png',
                        url: '#',
                        size: 2048,
                        type: 'image/png'
                    }
                ] : [],
                isInternal: false
            });
        }

        return mockMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    };

    const getMockSubject = (category: SupportTicket['category']): string => {
        const subjects = {
            technical: 'Login issues',
            billing: 'Payment problem',
            account: 'Profile update',
            feature: 'New feature suggestion',
            bug: 'System error',
            other: 'General inquiry'
        };
        return subjects[category];
    };

    const getMockDescription = (category: SupportTicket['category']): string => {
        const descriptions = {
            technical: 'the application performance',
            billing: 'my recent invoice',
            account: 'my account settings',
            feature: 'a potential improvement',
            bug: 'a system malfunction',
            other: 'a general platform question'
        };
        return descriptions[category];
    };

    const getMockMessageContent = (isUser: boolean, index: number): string => {
        const userMessages = [
            "Hello, I'm having an issue with the dashboard loading slowly.",
            "Could you please help me resolve this?",
            "That would be great, thank you!",
            "I've attached a screenshot of the error.",
            "When can I expect an update on this?"
        ];

        const supportMessages = [
            "Hi there! I'll be happy to help you with this issue.",
            "I've looked into the problem and found the root cause.",
            "We're working on a fix for this and will deploy it soon.",
            "Can you provide more details about when this occurs?",
            "The issue has been resolved in our latest update."
        ];

        const messages = isUser ? userMessages : supportMessages;
        return messages[Math.floor(Math.random() * messages.length)];
    };

    const calculateStats = () => {
        const statsData: SupportStats = {
            total: tickets.length,
            open: tickets.filter(t => t.status === 'open').length,
            pending: tickets.filter(t => t.status === 'pending').length,
            resolved: tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length,
            highPriority: tickets.filter(t => t.priority === 'high' || t.priority === 'urgent').length,
            avgResponseTime: 2.5
        };
        setStats(statsData);

        // Update status counts
        statusOptions[0].count = statsData.total;
        statusOptions[1].count = statsData.open;
        statusOptions[2].count = statsData.pending;
        statusOptions[3].count = statsData.resolved;
    };

    const applyFilters = () => {
        let filtered = tickets;

        // Search filter
        if (searchTerm) {
            filtered = filtered.filter(ticket =>
                ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                ticket.user.name.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        // Status filter
        if (activeFilter !== 'all') {
            filtered = filtered.filter(ticket => ticket.status === activeFilter);
        }

        setFilteredTickets(filtered);
    };

    const handleCreateTicket = async () => {
        if (!newTicket.subject || !newTicket.description) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            const ticket: SupportTicket = {
                id: `TICKET-${1000 + tickets.length + 1}`,
                subject: newTicket.subject,
                description: newTicket.description,
                status: 'open',
                priority: newTicket.priority,
                category: newTicket.category,
                user: {
                    id: 'current-user',
                    name: 'You',
                    email: 'user@example.com'
                },
                createdAt: new Date(),
                updatedAt: new Date(),
                messageCount: 1,
                attachments: 0
            };

            setTickets(prev => [ticket, ...prev]);
            setSelectedTicket(ticket);
            setIsCreatingTicket(false);
            setNewTicket({
                subject: '',
                description: '',
                category: 'technical',
                priority: 'medium'
            });

            // Add initial message
            const initialMessage: SupportMessage = {
                id: `msg-${ticket.id}-1`,
                ticketId: ticket.id,
                content: newTicket.description,
                sender: {
                    id: 'current-user',
                    name: 'You',
                    email: 'user@example.com',
                    type: 'user'
                },
                createdAt: new Date(),
                attachments: [],
                isInternal: false
            };
            setMessages([initialMessage]);

        } catch (error) {
            console.error('Error creating ticket:', error);
        }
    };

    const handleSendMessage = async () => {
        if (!newMessage.trim() || !selectedTicket) return;

        try {
            const message: SupportMessage = {
                id: `msg-${selectedTicket.id}-${messages.length + 1}`,
                ticketId: selectedTicket.id,
                content: newMessage,
                sender: {
                    id: 'current-user',
                    name: 'You',
                    email: 'user@example.com',
                    type: 'user'
                },
                createdAt: new Date(),
                attachments: [],
                isInternal: false
            };

            setMessages(prev => [...prev, message]);
            setNewMessage('');

            // Update ticket last message and timestamp
            setTickets(prev => prev.map(ticket =>
                ticket.id === selectedTicket.id
                    ? {
                        ...ticket,
                        lastMessage: newMessage,
                        updatedAt: new Date(),
                        messageCount: ticket.messageCount + 1
                    }
                    : ticket
            ));

        } catch (error) {
            console.error('Error sending message:', error);
        }
    };

    const updateTicketStatus = async (ticketId: string, status: SupportTicket['status']) => {
        setTickets(prev => prev.map(ticket =>
            ticket.id === ticketId ? { ...ticket, status, updatedAt: new Date() } : ticket
        ));

        if (selectedTicket?.id === ticketId) {
            setSelectedTicket(prev => prev ? { ...prev, status, updatedAt: new Date() } : null);
        }
    };

    const getStatusIcon = (status: SupportTicket['status']) => {
        const option = statusOptions.find(opt => opt.value === status);
        const IconComponent = option?.icon || Clock;
        return <IconComponent className={styles.statusIcon} style={{ color: option?.color }} />;
    };

    const getPriorityBadge = (priority: SupportTicket['priority']) => {
        const option = priorityOptions.find(opt => opt.value === priority);
        return (
            <span
                className={`${styles.priorityBadge} ${styles[`priority${priority.charAt(0).toUpperCase() + priority.slice(1)}`]}`}
            >
                {option?.label}
            </span>
        );
    };

    const getCategoryIcon = (category: SupportTicket['category']) => {
        const option = categoryOptions.find(opt => opt.value === category);
        const IconComponent = option?.icon || HelpCircle;
        return <IconComponent className={styles.categoryIcon} />;
    };

    const getTimeAgo = (date: Date) => {
        const now = new Date();
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

        if (diffInMinutes < 1) return 'Just now';
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
        return `${Math.floor(diffInMinutes / 1440)}d ago`;
    };

    const exportTickets = () => {
        const dataStr = JSON.stringify(tickets, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `support-tickets-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Sidebars />
                <div className={styles.contentArea}>
                    <div className={styles.fullscreen}>
                        <div className={styles.loadingState}>
                            <RefreshCw className={`${styles.loadingIcon} ${styles.animateSpin}`} />
                            <p>Loading support tickets...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Sidebars />
            <div className={styles.contentArea}>
                <div className={styles.fullscreen}>
                    {/* Header */}
                    <div className={styles.header}>
                        <div className={styles.headerTop}>
                            <div className={styles.headerTitle}>
                                <div>
                                    <h1 className={styles.title}>Support Center</h1>
                                    <p className={styles.subtitle}>
                                        Get help with your issues and manage support tickets
                                    </p>
                                </div>
                            </div>
                            <div className={styles.headerActions}>
                                <button
                                    onClick={exportTickets}
                                    className={styles.exportButton}
                                    disabled={tickets.length === 0}
                                >
                                    <Download className={styles.buttonIcon} />
                                    Export
                                </button>
                                <button
                                    onClick={() => setIsCreatingTicket(true)}
                                    className={styles.newTicketButton}
                                >
                                    <Plus className={styles.buttonIcon} />
                                    New Ticket
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <MessageCircle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>{stats.total}</div>
                                <div className={styles.statLabel}>Total Tickets</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Clock className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statOpen}`}>{stats.open}</div>
                                <div className={styles.statLabel}>Open</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <AlertCircle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statPending}`}>{stats.pending}</div>
                                <div className={styles.statLabel}>Pending</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <CheckCircle className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statResolved}`}>{stats.resolved}</div>
                                <div className={styles.statLabel}>Resolved</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <ArrowUp className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={`${styles.statNumber} ${styles.statCritical}`}>{stats.highPriority}</div>
                                <div className={styles.statLabel}>High Priority</div>
                            </div>
                        </div>

                        <div className={styles.statCard}>
                            <div className={styles.statIcon}>
                                <Clock className={styles.icon} />
                            </div>
                            <div className={styles.statContent}>
                                <div className={styles.statNumber}>{stats.avgResponseTime}h</div>
                                <div className={styles.statLabel}>Avg. Response</div>
                            </div>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className={styles.mainLayout}>
                        {/* Tickets List */}
                        <div className={styles.ticketsPanel}>
                            <div className={styles.panelHeader}>
                                <div className={styles.searchBox}>
                                    <Search className={styles.searchIcon} />
                                    <input
                                        type="text"
                                        placeholder="Search tickets..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className={styles.searchInput}
                                    />
                                </div>
                                <div className={styles.filterButtons}>
                                    {statusOptions.map(option => (
                                        <button
                                            key={option.value}
                                            onClick={() => setActiveFilter(option.value)}
                                            className={`${styles.filterButton} ${activeFilter === option.value ? styles.active : ''
                                                }`}
                                        >
                                            {option.label}
                                            <span className={styles.filterCount}>({option.count})</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className={styles.ticketsList}>
                                {filteredTickets.map(ticket => (
                                    <div
                                        key={ticket.id}
                                        className={`${styles.ticketItem} ${selectedTicket?.id === ticket.id ? styles.selected : ''
                                            }`}
                                        onClick={() => setSelectedTicket(ticket)}
                                    >
                                        <div className={styles.ticketHeader}>
                                            <div className={styles.ticketId}>{ticket.id}</div>
                                            <div className={styles.ticketMeta}>
                                                {getPriorityBadge(ticket.priority)}
                                                <span className={styles.timeAgo}>
                                                    {getTimeAgo(ticket.updatedAt)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className={styles.ticketContent}>
                                            <h3 className={styles.ticketSubject}>
                                                {ticket.subject}
                                            </h3>
                                            <p className={styles.ticketDescription}>
                                                {ticket.description}
                                            </p>
                                        </div>

                                        <div className={styles.ticketFooter}>
                                            <div className={styles.ticketCategory}>
                                                {getCategoryIcon(ticket.category)}
                                                <span>{ticket.category}</span>
                                            </div>
                                            <div className={styles.ticketStatus}>
                                                {getStatusIcon(ticket.status)}
                                                <span>{ticket.status}</span>
                                            </div>
                                            <div className={styles.ticketStats}>
                                                <MessageCircle className={styles.statIcon} />
                                                <span>{ticket.messageCount}</span>
                                                {ticket.attachments > 0 && (
                                                    <>
                                                        <Paperclip className={styles.statIcon} />
                                                        <span>{ticket.attachments}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {filteredTickets.length === 0 && (
                                <div className={styles.emptyState}>
                                    <MessageCircle className={styles.emptyIcon} />
                                    <p className={styles.emptyTitle}>No tickets found</p>
                                    <p className={styles.emptyDescription}>
                                        {searchTerm
                                            ? "Try adjusting your search terms"
                                            : "Create your first support ticket to get started"
                                        }
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Ticket Details */}
                        <div className={styles.detailsPanel}>
                            {selectedTicket ? (
                                <>
                                    <div className={styles.ticketHeader}>
                                        <div className={styles.headerTop}>
                                            <div>
                                                <h2 className={styles.ticketTitle}>
                                                    {selectedTicket.subject}
                                                </h2>
                                                <div className={styles.ticketMeta}>
                                                    <span className={styles.ticketId}>
                                                        {selectedTicket.id}
                                                    </span>
                                                    <span className={styles.dot}>•</span>
                                                    <span className={styles.ticketDate}>
                                                        Created {getTimeAgo(selectedTicket.createdAt)}
                                                    </span>
                                                    <span className={styles.dot}>•</span>
                                                    {getPriorityBadge(selectedTicket.priority)}
                                                </div>
                                            </div>
                                            <div className={styles.ticketActions}>
                                                <select
                                                    value={selectedTicket.status}
                                                    onChange={(e) => updateTicketStatus(selectedTicket.id, e.target.value as SupportTicket['status'])}
                                                    className={styles.statusSelect}
                                                >
                                                    <option value="open">Open</option>
                                                    <option value="pending">Pending</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                                <button className={styles.moreButton}>
                                                    <MoreVertical className={styles.buttonIcon} />
                                                </button>
                                            </div>
                                        </div>

                                        <div className={styles.ticketInfo}>
                                            <div className={styles.infoItem}>
                                                <User className={styles.infoIcon} />
                                                <span>{selectedTicket.user.name}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <Mail className={styles.infoIcon} />
                                                <span>{selectedTicket.user.email}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <Tag className={styles.infoIcon} />
                                                <span>{selectedTicket.category}</span>
                                            </div>
                                            <div className={styles.infoItem}>
                                                <Calendar className={styles.infoIcon} />
                                                <span>Updated {getTimeAgo(selectedTicket.updatedAt)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className={styles.messagesContainer}>
                                        <div className={styles.messagesList}>
                                            {messages.map(message => (
                                                <div
                                                    key={message.id}
                                                    className={`${styles.message} ${message.sender.type === 'user' ? styles.userMessage : styles.supportMessage
                                                        }`}
                                                >
                                                    <div className={styles.messageAvatar}>
                                                        {message.sender.name.charAt(0)}
                                                    </div>
                                                    <div className={styles.messageContent}>
                                                        <div className={styles.messageHeader}>
                                                            <span className={styles.senderName}>
                                                                {message.sender.name}
                                                            </span>
                                                            <span className={styles.messageTime}>
                                                                {getTimeAgo(message.createdAt)}
                                                            </span>
                                                        </div>
                                                        <div className={styles.messageText}>
                                                            {message.content}
                                                        </div>
                                                        {message.attachments.length > 0 && (
                                                            <div className={styles.messageAttachments}>
                                                                {message.attachments.map(attachment => (
                                                                    <a
                                                                        key={attachment.name}
                                                                        href={attachment.url}
                                                                        className={styles.attachment}
                                                                    >
                                                                        <FileText className={styles.attachmentIcon} />
                                                                        <span>{attachment.name}</span>
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className={styles.messageInput}>
                                            <div className={styles.inputToolbar}>
                                                <button className={styles.toolbarButton} title="Attach file">
                                                    <Paperclip className={styles.buttonIcon} />
                                                </button>
                                                <button className={styles.toolbarButton} title="Add emoji">
                                                    <Smile className={styles.buttonIcon} />
                                                </button>
                                            </div>
                                            <textarea
                                                value={newMessage}
                                                onChange={(e) => setNewMessage(e.target.value)}
                                                placeholder="Type your message..."
                                                className={styles.textInput}
                                                rows={2}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && !e.shiftKey) {
                                                        e.preventDefault();
                                                        handleSendMessage();
                                                    }
                                                }}
                                            />
                                            <div className={styles.inputActions}>
                                                <div className={styles.quickActions}>
                                                    <button className={styles.quickButton} title="Quick response: Thanks">
                                                        <ThumbsUp className={styles.buttonIcon} />
                                                    </button>
                                                    <button className={styles.quickButton} title="Quick response: Not helpful">
                                                        <ThumbsDown className={styles.buttonIcon} />
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={handleSendMessage}
                                                    className={styles.sendButton}
                                                    disabled={!newMessage.trim()}
                                                >
                                                    <Send className={styles.buttonIcon} />
                                                    Send
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className={styles.noSelection}>
                                    <MessageCircle className={styles.noSelectionIcon} />
                                    <h3>Select a ticket</h3>
                                    <p>Choose a support ticket from the list to view details and messages</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* New Ticket Modal */}
                    {isCreatingTicket && (
                        <div className={styles.modalOverlay}>
                            <div className={styles.modal}>
                                <div className={styles.modalHeader}>
                                    <h2>Create New Support Ticket</h2>
                                    <button
                                        onClick={() => setIsCreatingTicket(false)}
                                        className={styles.closeButton}
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className={styles.modalContent}>
                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Subject *</label>
                                        <input
                                            type="text"
                                            value={newTicket.subject}
                                            onChange={(e) => setNewTicket(prev => ({ ...prev, subject: e.target.value }))}
                                            placeholder="Brief description of your issue"
                                            className={styles.formInput}
                                        />
                                    </div>

                                    <div className={styles.formRow}>
                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Category</label>
                                            <select
                                                value={newTicket.category}
                                                onChange={(e) => setNewTicket(prev => ({ ...prev, category: e.target.value as any }))}
                                                className={styles.formSelect}
                                            >
                                                {categoryOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className={styles.formGroup}>
                                            <label className={styles.formLabel}>Priority</label>
                                            <select
                                                value={newTicket.priority}
                                                onChange={(e) => setNewTicket(prev => ({ ...prev, priority: e.target.value as any }))}
                                                className={styles.formSelect}
                                            >
                                                {priorityOptions.map(option => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className={styles.formGroup}>
                                        <label className={styles.formLabel}>Description *</label>
                                        <textarea
                                            value={newTicket.description}
                                            onChange={(e) => setNewTicket(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Please provide detailed information about your issue..."
                                            className={styles.formTextarea}
                                            rows={6}
                                        />
                                    </div>
                                </div>

                                <div className={styles.modalActions}>
                                    <button
                                        onClick={() => setIsCreatingTicket(false)}
                                        className={styles.cancelButton}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreateTicket}
                                        className={styles.submitButton}
                                        disabled={!newTicket.subject || !newTicket.description}
                                    >
                                        Create Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SupportPage;