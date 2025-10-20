import React, { useState, useEffect, useContext } from "react";
import Saidbar from "../components/Saidbar.js";
import BotInvite from "../components/BotInvite.js";
import styles from "../module_pages/Dashboard.module.scss";
import {
  Users,
  Eye,
  Command,
  Shield,
  AlertTriangle,
  TrendingUp,
  MessageCircle,
  Clock,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Bell,
  Calendar,
  RefreshCw,
  Zap,
  Hash,
  Activity,
  Play,
  StopCircle,
  BarChart3,
  ChevronDown,
  Check,
  Settings,
} from "lucide-react";
import { SidebarContext } from "@/App.js";

interface BotStatus {
  isOnServer: boolean;
  serverName: string | null;
  serverId: string;
  lastChecked: string;
}

interface ServerStats {
  server: {
    name: string;
    id: string;
    icon: string | null;
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

interface Activity {
  id?: string;
  user: string;
  userName?: string;
  action: string;
  target: string;
  targetName?: string;
  time: string;
  status: 'success' | 'warning';
  reason?: string;
  timestamp?: string;
}

interface CommandStats {
  name: string;
  usage: number;
  success: number;
  failures: number;
  successRate: number;
  avgResponseTime: number;
  totalExecutionTime: number;
  lastUsed?: string;
}

const Dashboard: React.FC = () => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [notifications, setNotifications] = useState(3);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshingAudit, setRefreshingAudit] = useState(false);
  const [memberHistory, setMemberHistory] = useState<{ date: string, count: number }[]>([]);
  const [commandStats, setCommandStats] = useState<CommandStats[]>([]);
  const [loadingCommands, setLoadingCommands] = useState(false);
  const [commandFilter, setCommandFilter] = useState<'all' | 'moderation' | 'utility'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const [nextRefreshTime, setNextRefreshTime] = useState<Date | null>(null);
  const [realTimeStats, setRealTimeStats] = useState<{
    totalMembers: number;
    onlineMembers: number;
    memberGrowth: any;
  } | null>(null);
  const [liveStats, setLiveStats] = useState<{
    totalMembers: number;
    onlineMembers: number;
    voiceMembers: number;
    yesterdayComparison: any;
  } | null>(null);

  // Функция загрузки реальной статистики
  const loadRealTimeStats = async (token: string) => {
    // Проверяем что botStatus загружен
    if (!botStatus?.serverId) {
      console.log('⏳ Waiting for bot status...');
      return;
    }

    try {
      const API_BASE = 'http://localhost:3002';

      // Загружаем статистику роста
      const growthResponse = await fetch(`${API_BASE}/api/member-growth?guildId=${botStatus.serverId}&period=7d`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Загружаем живую статистику
      const liveResponse = await fetch(`${API_BASE}/api/live-stats?guildId=${botStatus.serverId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (growthResponse.ok && liveResponse.ok) {
        const growthData = await growthResponse.json();
        const liveData = await liveResponse.json();

        setRealTimeStats({
          totalMembers: growthData.currentMembers,
          onlineMembers: liveData.onlineMembers,
          memberGrowth: growthData.growth
        });

        setLiveStats(liveData);

        console.log('✅ Real-time stats loaded:', { growthData, liveData });
      } else {
        console.log('❌ Real-time stats failed:', {
          growthStatus: growthResponse.status,
          liveStatus: liveResponse.status
        });
      }
    } catch (error) {
      console.error('Error loading real-time stats:', error);
    }
  };

  // Обновляем функцию calculateMemberChange для работы с реальными данными
  const calculateRealMemberChange = (): { change: number; isPositive: boolean; period: string; actualChange: number } => {
    if (!realTimeStats?.memberGrowth || realTimeStats.memberGrowth.length < 2) {
      return { change: 0, isPositive: true, period: 'recently', actualChange: 0 };
    }

    const current = realTimeStats.memberGrowth[realTimeStats.memberGrowth.length - 1];
    const previous = realTimeStats.memberGrowth[realTimeStats.memberGrowth.length - 2];

    const change = ((current.memberCount - previous.memberCount) / previous.memberCount) * 100;
    const actualChange = current.memberCount - previous.memberCount;

    return {
      change: Math.round(change * 10) / 10,
      isPositive: change >= 0,
      period: 'last check',
      actualChange
    };
  };

  const calculateRealOnlineChange = (): { change: number; isPositive: boolean; period: string } => {
    if (!liveStats?.yesterdayComparison || liveStats.yesterdayComparison.onlineCount === 0) {
      return { change: 0, isPositive: true, period: 'average' };
    }

    const change = ((liveStats.onlineMembers - liveStats.yesterdayComparison.onlineCount) / liveStats.yesterdayComparison.onlineCount) * 100;

    return {
      change: Math.round(change * 10) / 10,
      isPositive: change >= 0,
      period: 'yesterday'
    };
  };



  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      // Обновляем только если прошло больше 1 часа с последнего обновления
      if (!lastRefreshTime || lastRefreshTime < oneHourAgo) {
        console.log('🔄 Auto-refreshing audit log (1 hour interval)...');
        loadAuditLog(localStorage.getItem('auth_token') || '');
        setLastRefreshTime(now);
        setNextRefreshTime(new Date(now.getTime() + 60 * 60 * 1000));
      } else {
        const nextRefresh = new Date(lastRefreshTime.getTime() + 60 * 60 * 1000);
        setNextRefreshTime(nextRefresh);
        const minutesLeft = Math.ceil((nextRefresh.getTime() - now.getTime()) / (60 * 1000));
        console.log(`⏳ Next auto-refresh in ${minutesLeft} minutes`);
      }
    }, 5 * 60 * 1000); // Проверяем каждые 5 минут

    return () => clearInterval(interval);
  }, [autoRefresh, lastRefreshTime]);

  const [messageStats, setMessageStats] = useState<{
    totalMessages: number;
    messagesToday: number;
    changeVsAverage: number;
  } | null>(null);

  const [activeModerators, setActiveModerators] = useState<number>(0);

  const loadCommandStats = async (token: string) => {
    try {
      setLoadingCommands(true);
      const API_BASE = 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/discord/command-stats?period=${activeTimeRange}&filter=${commandFilter}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setCommandStats(statsData.commands);
        console.log('✅ Command stats loaded:', statsData);
      } else {
        console.log('❌ Command stats failed, using mock data');
        setCommandStats(getMockCommandStats());
      }
    } catch (error) {
      console.error('Error loading command stats:', error);
      setCommandStats(getMockCommandStats());
    } finally {
      setLoadingCommands(false);
    }
  };

  const getMockCommandStats = (): CommandStats[] => {
    const baseStats = [
      { name: "/ban", usage: 45, success: 44, failures: 1, successRate: 98, avgResponseTime: 120, totalExecutionTime: 5400, lastUsed: "2 hours ago" },
      { name: "/mute", usage: 32, success: 30, failures: 2, successRate: 94, avgResponseTime: 80, totalExecutionTime: 2560, lastUsed: "1 hour ago" },
      { name: "/warn", usage: 28, success: 26, failures: 2, successRate: 93, avgResponseTime: 70, totalExecutionTime: 1960, lastUsed: "30 minutes ago" },
      { name: "/clear", usage: 25, success: 25, failures: 0, successRate: 100, avgResponseTime: 150, totalExecutionTime: 3750, lastUsed: "15 minutes ago" },
      { name: "/kick", usage: 18, success: 17, failures: 1, successRate: 94, avgResponseTime: 100, totalExecutionTime: 1800, lastUsed: "5 hours ago" },
      { name: "/slowmode", usage: 12, success: 11, failures: 1, successRate: 92, avgResponseTime: 60, totalExecutionTime: 720, lastUsed: "2 days ago" },
      { name: "/lock", usage: 8, success: 8, failures: 0, successRate: 100, avgResponseTime: 90, totalExecutionTime: 720, lastUsed: "1 day ago" },
      { name: "/userinfo", usage: 56, success: 56, failures: 0, successRate: 100, avgResponseTime: 45, totalExecutionTime: 2520, lastUsed: "10 minutes ago" },
      { name: "/serverinfo", usage: 34, success: 34, failures: 0, successRate: 100, avgResponseTime: 35, totalExecutionTime: 1190, lastUsed: "25 minutes ago" },
      { name: "/avatar", usage: 67, success: 67, failures: 0, successRate: 100, avgResponseTime: 40, totalExecutionTime: 2680, lastUsed: "5 minutes ago" }
    ];

    // Фильтрация по типу команд
    if (commandFilter === 'moderation') {
      return baseStats.filter(cmd =>
        ['/ban', '/mute', '/warn', '/clear', '/kick', '/slowmode', '/lock'].includes(cmd.name)
      );
    } else if (commandFilter === 'utility') {
      return baseStats.filter(cmd =>
        ['/userinfo', '/serverinfo', '/avatar'].includes(cmd.name)
      );
    }

    return baseStats;
  };

  const exportCommandData = () => {
    const data = {
      period: activeTimeRange,
      filter: commandFilter,
      generatedAt: new Date().toISOString(),
      commands: commandStats
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `command-stats-${activeTimeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getPerformanceIcon = (successRate: number) => {
    if (successRate >= 95) return <Activity size={12} className={styles.high} />;
    if (successRate >= 85) return <Play size={12} className={styles.medium} />;
    return <StopCircle size={12} className={styles.low} />;
  };

  const getResponseTimeColor = (responseTime: number) => {
    if (responseTime <= 50) return styles.fast;
    if (responseTime <= 100) return styles.medium;
    return styles.slow;
  };

  useEffect(() => {
    if (botStatus?.isOnServer) {
      loadCommandStats(localStorage.getItem('auth_token') || '');
    }
  }, [activeTimeRange, commandFilter, botStatus?.isOnServer]);

  // Инициализируем пустым массивом вместо undefined
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  const sidebarContext = useContext(SidebarContext);
  const isSidebarCollapsed = sidebarContext?.isCollapsed || false;

  // Функция загрузки данных
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const token = localStorage.getItem('auth_token');

      if (!token) {
        console.error('❌ No auth token found in localStorage');
        return;
      }

      const API_BASE = 'http://localhost:4000/api';

      // Загружаем статус бота
      const botResponse = await fetch(`${API_BASE}/discord/bot-status`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (botResponse.ok) {
        const botData = await botResponse.json();
        setBotStatus(botData);

        // Если бот на сервере, загружаем статистику
        if (botData.isOnServer) {
          // Загружаем статистику сервера
          const statsResponse = await fetch(`${API_BASE}/discord/server-stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (statsResponse.ok) {
            const statsData = await statsResponse.json();
            setServerStats(statsData);
          }

          // Загружаем статистику модераторов
          loadModeratorStats(token);

          // Загружаем audit log с ограничением
          loadAuditLog(token);

          // ⚠️ ВАЖНО: Загружаем реальную статистику ПОСЛЕ установки botStatus
          loadRealTimeStats(token);
        }
      }

    } catch (error) {
      console.error('💥 Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadAuditLog = async (token: string) => {
    try {
      setRefreshingAudit(true);
      const API_BASE = 'http://localhost:4000/api';

      // ⚠️ ИЗМЕНЕНИЕ: Ограничиваем лимит 10 записями
      const response = await fetch(`${API_BASE}/discord/audit-logs?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const auditData = await response.json();

        // ДЕБАГ: посмотрим что приходит
        console.log('🔍 DEBUG Audit data:', {
          total: auditData.total,
          source: auditData.source,
          activitiesCount: auditData.recentActivities?.length
        });

        // Всегда передаем массив (даже пустой)
        setRecentActivities(auditData.recentActivities || []);
        setLastRefreshTime(new Date());
        setNextRefreshTime(new Date(new Date().getTime() + 60 * 60 * 1000));
        console.log('✅ Audit log loaded with', auditData.recentActivities?.length || 0, 'activities');
      } else {
        console.log('❌ Audit log failed');
        setRecentActivities([]);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      setRecentActivities([]);
    } finally {
      setRefreshingAudit(false);
    }
  };

  const loadModeratorStats = async (token: string) => {
    try {
      const API_BASE = 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/discord/moderator-stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const statsData = await response.json();
        setActiveModerators(statsData.activeModerators);
        console.log('✅ Moderator stats loaded:', statsData);
      } else {
        // Fallback на моковые данные
        setActiveModerators(8);
      }
    } catch (error) {
      console.error('Error loading moderator stats:', error);
      setActiveModerators(8); // Fallback
    }
  };

  const calculateMemberChange = (currentTotal: number): { change: number, isPositive: boolean, period: string } => {
    if (!serverStats || memberHistory.length === 0) {
      return { change: 12, isPositive: true, period: 'yesterday' };
    }

    // Получаем данные за последние 7 дней
    const lastWeekData = memberHistory.slice(-7);

    if (lastWeekData.length < 2) {
      return { change: 0, isPositive: true, period: 'recently' };
    }

    // Среднее значение за предыдущую неделю (исключая сегодня)
    const previousWeekAverage = lastWeekData
      .slice(0, -1)
      .reduce((sum, day) => sum + day.count, 0) / (lastWeekData.length - 1);

    // Текущее значение
    const currentValue = currentTotal;

    // Расчет процентного изменения
    const change = ((currentValue - previousWeekAverage) / previousWeekAverage) * 100;

    // Определяем период для отображения
    const period = lastWeekData.length >= 7 ? 'last week' : 'recently';

    return {
      change: Math.round(change * 10) / 10,
      isPositive: change >= 0,
      period
    };
  };

  const calculateOnlineChange = (currentOnline: number): { change: number, isPositive: boolean, period: string } => {
    // Базовый расчет для онлайн пользователей
    const baseOnline = 250; // среднее онлайн пользователей

    const change = ((currentOnline - baseOnline) / baseOnline) * 100;

    return {
      change: Math.round(change * 10) / 10,
      isPositive: change >= 0,
      period: 'average'
    };
  };

  const calculateCommandChange = (currentCommands: number): number => {
    const baseValue = 50;
    const change = ((currentCommands - baseValue) / baseValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const metricsData = {
    totalMembers: {
      value: realTimeStats?.totalMembers || serverStats?.members.total || 1250,
      ...calculateRealMemberChange()
    },
    onlineNow: {
      value: realTimeStats?.onlineMembers || serverStats?.members.online || 312,
      ...calculateRealOnlineChange()
    },
    messagesToday: {
      value: messageStats?.messagesToday || 245,
      change: messageStats?.changeVsAverage || +8,
      isPositive: (messageStats?.changeVsAverage || 0) >= 0,
      period: 'average'
    },
    activeModerators: {
      value: activeModerators || 8,
      change: 0,
      isPositive: true,
      period: 'current'
    }
  };

  const loadMemberHistory = async (token: string) => {
    try {
      const API_BASE = 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/discord/member-history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const historyData = await response.json();
        setMemberHistory(historyData);
      } else {
        // Fallback: создаем демо-данные
        const demoHistory = [
          { date: '2024-01-01', count: 1180 },
          { date: '2024-01-02', count: 1195 },
          { date: '2024-01-03', count: 1210 },
          { date: '2024-01-04', count: 1225 },
          { date: '2024-01-05', count: 1240 },
          { date: '2024-01-06', count: 1255 },
          { date: '2024-01-07', count: 1270 },
        ];
        setMemberHistory(demoHistory);
      }
    } catch (error) {
      console.error('Error loading member history:', error);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Перезагрузить данные через 15 секунд после запуска (когда бот готов)
    const timeout = setTimeout(() => {
      console.log('Reloading data after bot startup...');
      loadDashboardData();
    }, 15000);

    return () => clearTimeout(timeout);
  }, []);

  const mockStatsData = {
    totalMembers: { value: serverStats?.members.total || 1250, change: +12 },
    onlineNow: { value: serverStats?.members.online || 312, change: +5 },
    commandsToday: { value: 45, change: -2 },
    activeModerators: { value: 8, change: 0 }
  };

  const topCommands = [
    { name: "/ban", usage: 45, success: 98 },
    { name: "/mute", usage: 32, success: 95 },
    { name: "/warn", usage: 28, success: 92 },
    { name: "/clear", usage: 25, success: 100 },
    { name: "/kick", usage: 18, success: 96 }
  ];

  // Функция для форматирования времени до следующего обновления
  const formatTimeUntilRefresh = () => {
    if (!nextRefreshTime) return '';

    const now = new Date();
    const diffMs = nextRefreshTime.getTime() - now.getTime();
    const diffMins = Math.max(0, Math.ceil(diffMs / (60 * 1000)));

    if (diffMins === 0) return 'soon';
    if (diffMins < 60) return `in ${diffMins} min`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `in ${hours}h ${mins}m`;
  };

  if (!loading && botStatus && !botStatus.isOnServer) {
    return (
      <div className={`layout ${styles.layout} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Saidbar />
        <main className={styles.main}>
          <BotInvite serverId={botStatus.serverId} />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`layout ${styles.layout} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Saidbar />
        <main className={styles.main}>
          <div className={styles.loading}>
            <RefreshCw size={32} className={styles.spinner} />
            <p>Loading dashboard data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={`layout ${styles.layout} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <Saidbar />

      <main className={styles.main}>
        <header className={styles.header}>
          <div className={styles.header__left}>
            <h1 className={styles.header__title}>
              Dashboard Overview
            </h1>
            <span className={styles.header__subtitle}>
              Real-time insights and moderation analytics
              {botStatus?.serverName && ` • ${botStatus.serverName}`}
              {lastRefreshTime && ` • Updated: ${lastRefreshTime.toLocaleTimeString()}`}
            </span>
          </div>
          <div className={styles.header__right}>
            <div className={styles.timeFilters}>
              {['24h', '7d', '30d'].map((range) => (
                <button
                  key={range}
                  className={`${styles.timeFilter} ${activeTimeRange === range ? styles.active : ''}`}
                  onClick={() => setActiveTimeRange(range as any)}
                >
                  {range}
                </button>
              ))}
            </div>
            <button
              className={styles.refreshBtn}
              onClick={loadDashboardData}
              disabled={refreshing}
              title="Refresh dashboard data"
            >
              <RefreshCw size={20} className={refreshing ? styles.spinning : ''} />
            </button>
            <button className={styles.notificationBtn}>
              <Bell size={20} />
              {notifications > 0 && <span className={styles.notificationBadge}>{notifications}</span>}
            </button>
          </div>
        </header>

        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Users size={24} />
              </div>
              <TrendingUp size={16} className={styles.trendingUp} />
            </div>
            <h3 className={styles.metricValue}>
              {realTimeStats?.totalMembers?.toLocaleString() || serverStats?.members.total.toLocaleString() || 'Loading...'}
            </h3>
            <p className={styles.metricLabel}>Total Members</p>
            <div className={styles.metricChange}>
              <span className={metricsData.totalMembers.isPositive ? styles.changePositive : styles.changeNegative}>
                {metricsData.totalMembers.isPositive ? '+' : ''}{metricsData.totalMembers.change}%
                {metricsData.totalMembers.actualChange !== 0 && (
                  <span className={styles.actualChange}>
                    ({metricsData.totalMembers.actualChange > 0 ? '+' : ''}{metricsData.totalMembers.actualChange})
                  </span>
                )}
              </span>
              <span className={styles.changeText}>
                vs. {metricsData.totalMembers.period}
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Eye size={24} />
              </div>
              <TrendingUp size={16} className={styles.trendingUp} />
            </div>
            <h3 className={styles.metricValue}>
              {realTimeStats?.onlineMembers ?? serverStats?.members.online ?? '0'}
            </h3>
            <p className={styles.metricLabel}>Online Now</p>
            <div className={styles.metricChange}>
              <span className={metricsData.onlineNow.isPositive ? styles.changePositive : styles.changeNegative}>
                {metricsData.onlineNow.isPositive ? '+' : ''}{metricsData.onlineNow.change}%
              </span>
              <span className={styles.changeText}>
                vs. {metricsData.onlineNow.period}
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Hash size={24} />
              </div>
            </div>
            <h3 className={styles.metricValue}>
              {serverStats?.channels.total || 0}
            </h3>
            <p className={styles.metricLabel}>Total Channels</p>
            <div className={styles.metricChange}>
              <span className={styles.changeText}>
                {serverStats?.channels.text || 0} text • {serverStats?.channels.voice || 0} voice
              </span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Shield size={24} />
              </div>
            </div>
            <h3 className={styles.metricValue}>
              {activeModerators || '0'}
            </h3>
            <p className={styles.metricLabel}>Active Moderators</p>
            <div className={styles.metricChange}>
              <span className={styles.changeNeutral}>On duty</span>
            </div>
          </div>
        </section>

        <div className={styles.contentGrid}>
          <div className={styles.activityCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>
                Recent Moderation Actions
                <span className={styles.limitBadge}>Last 10 actions</span>
              </h3>
              <div className={styles.headerActions}>
                <button
                  className={styles.viewAllBtn}
                  onClick={() => loadAuditLog(localStorage.getItem('auth_token') || '')}
                  disabled={refreshingAudit}
                  title="Refresh audit log (updates hourly)"
                >
                  <RefreshCw size={14} className={refreshingAudit ? styles.spinning : ''} />
                  {refreshingAudit ? 'Refreshing...' : 'Refresh'}
                </button>
                {nextRefreshTime && (
                  <span className={styles.refreshInfo}>
                    Auto-refresh {formatTimeUntilRefresh()}
                  </span>
                )}
              </div>
            </div>
            <div className={styles.activityList}>
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 10).map((activity, index) => ( // ⚠️ Ограничиваем 10 записями
                  <div key={activity.id || `activity-${index}`} className={styles.activityItem}>
                    <div className={styles.activityIcon}>
                      {activity.status === 'success' ? (
                        <CheckCircle size={16} className={styles.success} />
                      ) : (
                        <AlertTriangle size={16} className={styles.warning} />
                      )}
                    </div>
                    <div className={styles.activityContent}>
                      <div className={styles.activityText}>
                        <span className={styles.user}>@{activity.userName || `User${activity.user}`}</span>
                        <span className={styles.action}>{activity.action}</span>
                        <span className={styles.target}>@{activity.targetName || `User${activity.target}`}</span>
                      </div>
                      <div className={styles.activityTime}>
                        <Clock size={12} />
                        {activity.time}
                      </div>
                      {activity.reason && (
                        <div className={styles.activityReason}>
                          Reason: {activity.reason}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className={styles.emptyState}>
                  <AlertTriangle size={24} />
                  <p>No moderation actions found</p>
                  <small>Moderation actions will appear here</small>
                </div>
              )}
            </div>
          </div>

          <div className={styles.analyticsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Command Performance</h3>
              <div className={styles.cardActions}>

                <button
                  className={styles.iconBtn}
                  onClick={() => loadCommandStats(localStorage.getItem('auth_token') || '')}
                  disabled={loadingCommands}
                  title="Refresh command stats"
                >
                  <RefreshCw size={16} className={loadingCommands ? styles.spinning : ''} />
                </button>

                <div className={styles.filterDropdown}>
                  <div className={styles.dropdownTrigger}>
                    <Filter size={16} className={styles.filterIcon} />
                    <span>Filters</span>
                    <ChevronDown size={14} className={styles.chevron} />
                  </div>

                  <div className={styles.dropdownMenu}>
                    <div className={styles.menuSection}>
                      <div className={styles.sectionTitle}>Type Commands</div>
                      <button
                        className={`${styles.menuItem} ${commandFilter === 'all' ? styles.active : ''}`}
                        onClick={() => setCommandFilter('all')}
                      >
                        <Check size={16} className={styles.checkIcon} />
                        All Commands
                      </button>
                      <button
                        className={`${styles.menuItem} ${commandFilter === 'moderation' ? styles.active : ''}`}
                        onClick={() => setCommandFilter('moderation')}
                      >
                        <Shield size={16} className={styles.menuIcon} />
                        Moderation
                      </button>
                      <button
                        className={`${styles.menuItem} ${commandFilter === 'utility' ? styles.active : ''}`}
                        onClick={() => setCommandFilter('utility')}
                      >
                        <Settings size={16} className={styles.menuIcon} />
                        Utilities
                      </button>
                    </div>

                    <div className={styles.menuDivider}></div>

                    <div className={styles.menuSection}>
                      <div className={styles.sectionTitle}>Time Period</div>
                      <button
                        className={`${styles.menuItem} ${activeTimeRange === '24h' ? styles.active : ''}`}
                        onClick={() => setActiveTimeRange('24h')}
                      >
                        <Clock size={16} className={styles.menuIcon} />
                        Last 24 hours
                        {activeTimeRange === '24h' && <div className={styles.activeDot}></div>}
                      </button>
                      <button
                        className={`${styles.menuItem} ${activeTimeRange === '7d' ? styles.active : ''}`}
                        onClick={() => setActiveTimeRange('7d')}
                      >
                        <Calendar size={16} className={styles.menuIcon} />
                        Last 7 days
                        {activeTimeRange === '7d' && <div className={styles.activeDot}></div>}
                      </button>
                      <button
                        className={`${styles.menuItem} ${activeTimeRange === '30d' ? styles.active : ''}`}
                        onClick={() => setActiveTimeRange('30d')}
                      >
                        <BarChart3 size={16} className={styles.menuIcon} />
                        Last 30 days
                        {activeTimeRange === '30d' && <div className={styles.activeDot}></div>}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  className={styles.iconBtn}
                  onClick={exportCommandData}
                  title="Export data as JSON"
                >
                  <Download size={16} />
                </button>
              </div>
            </div>

            <div className={styles.commandStats}>
              {loadingCommands ? (
                <div className={styles.loadingState}>
                  <RefreshCw size={24} className={styles.spinning} />
                  <p>Loading command statistics...</p>
                </div>
              ) : commandStats.length > 0 ? (
                commandStats.map((command, index) => {
                  const performanceLevel = command.successRate >= 95 ? 'optimal' :
                    command.successRate >= 85 ? 'good' :
                      command.successRate >= 70 ? 'warning' : 'critical';

                  const responseTimeClass = command.avgResponseTime < 500 ? 'fast' :
                    command.avgResponseTime < 1000 ? 'medium' : 'slow';

                  const successRateClass = command.successRate >= 95 ? 'high' :
                    command.successRate >= 85 ? 'medium' : 'low';

                  return (
                    <div key={index} className={styles.commandStat}>
                      {/* Command Info */}
                      <div className={styles.commandInfo}>
                        <div className={styles.commandHeader}>
                          <span className={styles.commandName}>/{command.name}</span>
                          <span className={`${styles.performanceBadge} ${styles[performanceLevel]}`}>
                            {performanceLevel}
                          </span>
                        </div>

                        <div className={styles.commandDetails}>
                          <div className={`${styles.commandMetric} ${styles.usage}`}>
                            <span className={styles.metricIcon}>
                              <TrendingUp size={14} />
                            </span>
                            <span className={styles.metricValue}>{command.usage}</span>
                            <span>uses</span>
                          </div>

                          <div className={`${styles.commandMetric} ${styles.response}`}>
                            <span className={styles.metricIcon}>
                              <Zap size={14} />
                            </span>
                            <span className={`${styles.responseTime} ${styles[responseTimeClass]}`}>
                              {command.avgResponseTime}ms
                            </span>
                          </div>

                          {command.lastUsed && (
                            <div className={`${styles.commandMetric} ${styles.time}`}>
                              <span className={styles.metricIcon}>
                                <Clock size={14} />
                              </span>
                              <span className={styles.lastUsed}>{command.lastUsed}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Success Rate */}
                      <div className={styles.successRate}>
                        <div className={styles.rateHeader}>
                          <span className={`${styles.rateValue} ${styles[successRateClass]}`}>
                            {command.successRate}%
                          </span>
                          <span className={styles.rateDetails}>
                            {command.success}/{command.usage} successful
                          </span>
                        </div>

                        <div className={styles.rateVisual}>
                          <div className={styles.rateBar}>
                            <div
                              className={`${styles.rateFill} ${styles[successRateClass]}`}
                              style={{ width: `${command.successRate}%` }}
                            ></div>
                          </div>
                          <div className={styles.rateLabels}>
                            <span>0%</span>
                            <span>50%</span>
                            <span>100%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>
                  <p>This section is under development. We apologize for any inconvenience.</p>
                  <small>Command usage statistics will appear here</small>
                  <button
                    className={styles.retryBtn}
                    onClick={() => loadCommandStats(localStorage.getItem('auth_token') || '')}
                  >
                    Try Again
                  </button>
                </div>
              )}
            </div>

            {commandStats.length > 0 && (
              <div className={styles.cardFooter}>
                <div className={styles.footerStats}>
                  <div className={styles.footerStat}>
                    <div className={styles.footerIcon}>
                      <BarChart3 size={16} />
                    </div>
                    <span className={styles.footerValue}>
                      {commandStats.reduce((sum, cmd) => sum + cmd.usage, 0)}
                    </span>
                    <span className={styles.footerLabel}>Total Commands</span>
                  </div>

                  <div className={styles.footerStat}>
                    <div className={styles.footerIcon}>
                      <CheckCircle size={16} />
                    </div>
                    <span className={styles.footerValue}>
                      {commandStats.length > 0
                        ? Math.round(commandStats.reduce((sum, cmd) => sum + cmd.successRate, 0) / commandStats.length)
                        : 0
                      }%
                    </span>
                    <span className={styles.footerLabel}>Success Rate</span>
                  </div>

                  <div className={styles.footerStat}>
                    <div className={styles.footerIcon}>
                      <Zap size={16} />
                    </div>
                    <span className={styles.footerValue}>
                      {commandStats.length > 0
                        ? Math.round(commandStats.reduce((sum, cmd) => sum + cmd.avgResponseTime, 0) / commandStats.length)
                        : 0
                      }ms
                    </span>
                    <span className={styles.footerLabel}>Avg Response</span>
                  </div>
                </div>

                <span className={styles.periodInfo}>
                  <Calendar size={12} style={{ marginRight: '4px' }} />
                  Showing {commandFilter} commands for {activeTimeRange}
                </span>
              </div>
            )}
          </div>

          <div className={styles.statsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Server Health</h3>
              <Calendar size={16} />
            </div>
            <div className={styles.healthStats}>
              <div className={styles.healthStat}>
                <div className={styles.healthLabel}>Response Time</div>
                <div className={styles.healthValue}>128ms</div>
                <div className={styles.healthStatus}>
                  <div className={`${styles.statusDot} ${styles.optimal}`}></div>
                  Optimal
                </div>
              </div>
              <div className={styles.healthStat}>
                <div className={styles.healthLabel}>Uptime</div>
                <div className={styles.healthValue}>99.98%</div>
                <div className={styles.healthStatus}>
                  <div className={`${styles.statusDot} ${styles.optimal}`}></div>
                  Stable
                </div>
              </div>
              <div className={styles.healthStat}>
                <div className={styles.healthLabel}>Active Issues</div>
                <div className={styles.healthValue}>2</div>
                <div className={styles.healthStatus}>
                  <div className={`${styles.statusDot} ${styles.warning}`}></div>
                  Monitoring
                </div>
              </div>
            </div>
          </div>

          <div className={styles.alertsCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Active Alerts</h3>
              <AlertTriangle size={16} className={styles.alertIcon} />
            </div>
            <div className={styles.alertList}>
              <div className={styles.alertItem}>
                <div className={styles.alertSeverity}>
                  <div className={`${styles.severityDot} ${styles.high}`}></div>
                </div>
                <div className={styles.alertContent}>
                  <div className={styles.alertTitle}>Spam attack detected</div>
                  <div className={styles.alertDescription}>Multiple spam accounts joining</div>
                  <div className={styles.alertTime}>5 minutes ago</div>
                </div>
                <button className={styles.alertAction}>Review</button>
              </div>
              <div className={styles.alertItem}>
                <div className={styles.alertSeverity}>
                  <div className={`${styles.severityDot} ${styles.medium}`}></div>
                </div>
                <div className={styles.alertContent}>
                  <div className={styles.alertTitle}>High message rate</div>
                  <div className={styles.alertDescription}>Unusual activity in #general</div>
                  <div className={styles.alertTime}>15 minutes ago</div>
                </div>
                <button className={styles.alertAction}>Monitor</button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;