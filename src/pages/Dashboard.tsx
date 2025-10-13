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
  RefreshCw
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

const Dashboard: React.FC = () => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [notifications, setNotifications] = useState(3);
  const [botStatus, setBotStatus] = useState<BotStatus | null>(null);
  const [serverStats, setServerStats] = useState<ServerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

      console.log('🔑 Token from localStorage:', token.substring(0, 50) + '...');

      // Test with simple endpoint first
      const testResponse = await fetch('/api/discord/bot-status', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Response status:', testResponse.status);
      console.log('📊 Response headers:', Object.fromEntries(testResponse.headers.entries()));

      const responseText = await testResponse.text();
      console.log('📄 Response text:', responseText);

      if (!testResponse.ok) {
        console.error('❌ API returned error:', responseText);
        return;
      }

      try {
        const botData = JSON.parse(responseText);
        console.log('✅ Bot status data:', botData);
        setBotStatus(botData);

        // Continue with other endpoints...
      } catch (e) {
        console.error('❌ JSON parse failed:', e);
      }

    } catch (error) {
      console.error('💥 Error loading dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // ✅ Автоматическая проверка статуса каждые 3 секунды, если бот не на сервере
    const interval = setInterval(() => {
      if (!botStatus?.isOnServer) {
        console.log('🔄 Auto-checking bot status...');
        loadDashboardData();
      }
    }, 3000); // Проверяем каждые 3 секунды

    return () => clearInterval(interval);
  }, [botStatus?.isOnServer]); // ✅ Зависимость от статуса бота

  // Mock data для случая, когда нет реальных данных
  const mockStatsData = {
    totalMembers: { value: serverStats?.members.total || 1250, change: +12 },
    onlineNow: { value: serverStats?.members.online || 312, change: +5 },
    commandsToday: { value: 45, change: -2 },
    activeModerators: { value: 8, change: 0 }
  };

  const recentActivities = [
    { user: "Alex", action: "banned", target: "@spammer123", time: "2 min ago", status: "success" },
    { user: "Maria", action: "muted", target: "@toxic_user", time: "5 min ago", status: "success" },
    { user: "John", action: "warned", target: "@rule_breaker", time: "12 min ago", status: "warning" },
    { user: "Sarah", action: "kicked", target: "@advertiser", time: "25 min ago", status: "success" },
    { user: "Mike", action: "cleared", target: "#general (50 messages)", time: "1 hour ago", status: "success" }
  ];

  const topCommands = [
    { name: "/ban", usage: 45, success: 98 },
    { name: "/mute", usage: 32, success: 95 },
    { name: "/warn", usage: 28, success: 92 },
    { name: "/clear", usage: 25, success: 100 },
    { name: "/kick", usage: 18, success: 96 }
  ];

  // Если бот не на сервере, показываем компонент приглашения
  if (!loading && botStatus && !botStatus.isOnServer) {
    return (
      <div className={`layout ${styles.layout} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Saidbar />
        <main className={styles.main}>
          {/* ✅ Просто передаем serverId, onBotAdded не нужен */}
          <BotInvite serverId={botStatus.serverId} />
        </main>
      </div>
    );
  }

  // Показываем загрузку
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
        {/* Header with controls */}
        <header className={styles.header}>
          <div className={styles.header__left}>
            <h1 className={styles.header__title}>
              {serverStats ? `${serverStats.server.name} Dashboard` : 'Dashboard Overview'}
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

        {/* Key Metrics Grid */}
        <section className={styles.metricsGrid}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Users size={24} />
              </div>
              <TrendingUp size={16} className={styles.trendingUp} />
            </div>
            <h3 className={styles.metricValue}>{mockStatsData.totalMembers.value.toLocaleString()}</h3>
            <p className={styles.metricLabel}>Total Members</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>+{mockStatsData.totalMembers.change}%</span>
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
            <h3 className={styles.metricValue}>{mockStatsData.onlineNow.value}</h3>
            <p className={styles.metricLabel}>Online Now</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>+{mockStatsData.onlineNow.change}%</span>
              <span className={styles.changeText}>peak today</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Command size={24} />
              </div>
              <TrendingUp size={16} className={mockStatsData.commandsToday.change >= 0 ? styles.trendingUp : styles.trendingDown} />
            </div>
            <h3 className={styles.metricValue}>{mockStatsData.commandsToday.value}</h3>
            <p className={styles.metricLabel}>Commands Today</p>
            <div className={styles.metricChange}>
              <span className={mockStatsData.commandsToday.change >= 0 ? styles.changePositive : styles.changeNegative}>
                {mockStatsData.commandsToday.change >= 0 ? '+' : ''}{mockStatsData.commandsToday.change}%
              </span>
              <span className={styles.changeText}>vs average</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Shield size={24} />
              </div>
            </div>
            <h3 className={styles.metricValue}>{mockStatsData.activeModerators.value}</h3>
            <p className={styles.metricLabel}>Active Moderators</p>
            <div className={styles.metricChange}>
              <span className={styles.changeNeutral}>On duty</span>
            </div>
          </div>
        </section>

        {/* Charts and Main Content Grid */}
        <div className={styles.contentGrid}>
          {/* Recent Activity */}
          <div className={styles.activityCard}>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Recent Moderation Actions</h3>
              <button className={styles.viewAllBtn}>View All</button>
            </div>
            <div className={styles.activityList}>
              {recentActivities.map((activity, index) => (
                <div key={index} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    {activity.status === 'success' ? (
                      <CheckCircle size={16} className={styles.success} />
                    ) : (
                      <AlertTriangle size={16} className={styles.warning} />
                    )}
                  </div>
                  <div className={styles.activityContent}>
                    <div className={styles.activityText}>
                      <span className={styles.user}>{activity.user}</span>
                      <span className={styles.action}>{activity.action}</span>
                      <span className={styles.target}>{activity.target}</span>
                    </div>
                    <div className={styles.activityTime}>
                      <Clock size={12} />
                      {activity.time}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Command Analytics */}
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

          {/* Quick Stats */}
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

          {/* Recent Alerts */}
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