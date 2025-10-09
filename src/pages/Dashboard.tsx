import React, { useState, useEffect } from "react";
import Saidbar from "../components/Saidbar.js";
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
  Calendar
} from "lucide-react";

const Dashboard: React.FC = () => {
  const [activeTimeRange, setActiveTimeRange] = useState<'24h' | '7d' | '30d'>('24h');
  const [notifications, setNotifications] = useState(3);

  // Mock data for charts and stats
  const statsData = {
    totalMembers: { value: 1250, change: +12 },
    onlineNow: { value: 312, change: +5 },
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

  return (
    <div className={styles.layout}>
      <Saidbar />

      <main className={styles.main}>
        {/* Header with controls */}
        <header className={styles.header}>
          <div className={styles.header__left}>
            <h1 className={styles.header__title}>Dashboard Overview</h1>
            <span className={styles.header__subtitle}>
              Real-time insights and moderation analytics
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
            <h3 className={styles.metricValue}>{statsData.totalMembers.value.toLocaleString()}</h3>
            <p className={styles.metricLabel}>Total Members</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>+{statsData.totalMembers.change}%</span>
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
            <h3 className={styles.metricValue}>{statsData.onlineNow.value}</h3>
            <p className={styles.metricLabel}>Online Now</p>
            <div className={styles.metricChange}>
              <span className={styles.changePositive}>+{statsData.onlineNow.change}%</span>
              <span className={styles.changeText}>peak today</span>
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <Command size={24} />
              </div>
              <TrendingUp size={16} className={statsData.commandsToday.change >= 0 ? styles.trendingUp : styles.trendingDown} />
            </div>
            <h3 className={styles.metricValue}>{statsData.commandsToday.value}</h3>
            <p className={styles.metricLabel}>Commands Today</p>
            <div className={styles.metricChange}>
              <span className={statsData.commandsToday.change >= 0 ? styles.changePositive : styles.changeNegative}>
                {statsData.commandsToday.change >= 0 ? '+' : ''}{statsData.commandsToday.change}%
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
            <h3 className={styles.metricValue}>{statsData.activeModerators.value}</h3>
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