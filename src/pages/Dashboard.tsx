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
  Hash
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

const Dashboard: React.FC = () => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [notifications, setNotifications] = useState(3);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [commandStats, setCommandStats] = useState<{
    commandsToday: number;
    changeVsAverage: number;
  } | null>(null);

  const [messageStats, setMessageStats] = useState<{
    totalMessages: number;
    messagesToday: number;
    changeVsAverage: number;
  } | null>(null);

  const [activeModerators, setActiveModerators] = useState<number>(0);

  const mockActivities: Activity[] = [
    {
      id: "mock1",
      user: "user1",
      userName: "Alex",
      action: "banned",
      target: "user2",
      targetName: "spammer123",
      time: "2 min ago",
      status: "success",
      reason: "Spam"
    },
    {
      id: "mock2",
      user: "user3",
      userName: "Maria",
      action: "muted",
      target: "user4",
      targetName: "toxic_user",
      time: "5 min ago",
      status: "success",
      reason: "Toxic behavior"
    },
    {
      id: "mock3",
      user: "user5",
      userName: "John",
      action: "warned",
      target: "user6",
      targetName: "rule_breaker",
      time: "12 min ago",
      status: "warning"
    },
    {
      id: "mock4",
      user: "user7",
      userName: "Sarah",
      action: "kicked",
      target: "user8",
      targetName: "advertiser",
      time: "25 min ago",
      status: "success",
      reason: "Unauthorized advertising"
    },
    {
      id: "mock5",
      user: "user9",
      userName: "Mike",
      action: "cleared",
      target: "channel1",
      targetName: "#general (50 messages)",
      time: "1 hour ago",
      status: "success"
    }
  ];

  const [recentActivities, setRecentActivities] = useState<Activity[]>(mockActivities);

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

          // Загружаем audit log
          loadAuditLog(token);
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
      const API_BASE = 'http://localhost:4000/api';
      const response = await fetch(`${API_BASE}/discord/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const auditData = await response.json();
        setRecentActivities(auditData.recentActivities);
        console.log('✅ Audit log loaded:', auditData);
      } else {
        // Fallback на моковые данные
        console.log('❌ Audit log failed, using mock data');
        setRecentActivities(mockActivities);
      }
    } catch (error) {
      console.error('Error loading audit log:', error);
      // Fallback на моковые данные
      setRecentActivities(mockActivities);
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

  const calculateMemberChange = (currentTotal: number): number => {
    const baseValue = 1200;
    const change = ((currentTotal - baseValue) / baseValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const calculateOnlineChange = (currentOnline: number): number => {
    const baseValue = 300;
    const change = ((currentOnline - baseValue) / baseValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const calculateCommandChange = (currentCommands: number): number => {
    const baseValue = 50;
    const change = ((currentCommands - baseValue) / baseValue) * 100;
    return Math.round(change * 10) / 10;
  };

  const metricsData = {
    totalMembers: {
      value: serverStats?.members.total || 1250,
      change: serverStats ? calculateMemberChange(serverStats.members.total) : +12
    },
    onlineNow: {
      value: serverStats?.members.online || 312,
      change: serverStats ? calculateOnlineChange(serverStats.members.online) : +5
    },
    messagesToday: {
      value: messageStats?.messagesToday || 245,
      change: messageStats?.changeVsAverage || +8
    },
    activeModerators: {
      value: activeModerators || 8,
      change: 0
    }
  };

  useEffect(() => {
    loadDashboardData();

    const interval = setInterval(() => {
      if (!botStatus?.isOnServer) {
        console.log('🔄 Auto-checking bot status...');
        loadDashboardData();
      }
    }, 60000);

    return () => clearInterval(interval);
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
              {serverStats ? serverStats.members.total.toLocaleString() : 'Loading...'}
            </h3>
            <p className={styles.metricLabel}>Total Members</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>
                +{metricsData.totalMembers.change}%
              </span>
              <span className={styles.changeText}>from yesterday</span>
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
              {serverStats?.members.online ?? '0'}
            </h3>
            <p className={styles.metricLabel}>Online Now</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>
                +{metricsData.onlineNow.change}%
              </span>
              <span className={styles.changeText}>peak today</span>
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
              <h3 className={styles.cardTitle}>Recent Moderation Actions</h3>
              <button
                className={styles.viewAllBtn}
                onClick={() => loadAuditLog(localStorage.getItem('auth_token') || '')}
              >
                Refresh
              </button>
            </div>
            <div className={styles.activityList}>
              {recentActivities.length > 0 ? (
                recentActivities.map((activity, index) => (
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
                <Filter size={16} />
                <Download size={16} />
              </div>
            </div>
            <div className={styles.commandStats}>
              {topCommands.map((command, index) => (
                <div key={index} className={styles.commandStat}>
                  <div className={styles.commandInfo}>
                    <span className={styles.commandName}>{command.name}</span>
                    <span className={styles.commandUsage}>{command.usage} uses</span>
                  </div>
                  <div className={styles.successRate}>
                    <div className={styles.rateBar}>
                      <div
                        className={styles.rateFill}
                        style={{ width: `${command.success}%` }}
                      ></div>
                    </div>
                    <span className={styles.rateText}>{command.success}%</span>
                  </div>
                </div>
              ))}
            </div>
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