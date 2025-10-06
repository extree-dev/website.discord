import { useServerStore } from '@/stores/clientServer.js'
import { useEffect, useState } from 'react'
import Sidebars from "@/components/Saidbar.js";
import {
  Shield,
  Ban,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Clock,
  User,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import styles from "../module_pages/Moderation.module.scss";

interface Ban {
  id: number;
  user: string;
  reason: string;
  date: string;
  duration: string;
  moderator: string;
}

interface Kick {
  id: number;
  user: string;
  reason: string;
  date: string;
  moderator: string;
}

interface Warning {
  id: number;
  user: string;
  reason: string;
  date: string;
  moderator: string;
}

interface ModerationStore {
  bans: Ban[];
  kicks: Kick[];
  warnings: Warning[];
  isLoading: boolean;
  fetchModerationData: () => Promise<void>;
}


export default function Moderation() {
  const store = useServerStore() as unknown as {
  bans: string[];
  kicks: string[];
  warnings: string[];
  isLoading: boolean;
  fetchModerationData: () => Promise<void>;
};

// Если нужно работать с типизированными объектами, мапим:
const bans: Ban[] = store.bans.map((b, i) => ({
  id: i + 1,
  user: b,           // здесь пока только строка, можно заменить на реальные поля
  reason: 'Unknown',
  date: new Date().toISOString().split('T')[0],
  duration: 'Unknown',
  moderator: 'Unknown',
}));

const kicks: Kick[] = store.kicks.map((k, i) => ({
  id: i + 1,
  user: k,
  reason: 'Unknown',
  date: new Date().toISOString().split('T')[0],
  moderator: 'Unknown',
}));

const warnings: Warning[] = store.warnings.map((w, i) => ({
  id: i + 1,
  user: w,
  reason: 'Unknown',
  date: new Date().toISOString().split('T')[0],
  moderator: 'Unknown',
}));

const isLoading = store.isLoading;
const fetchModerationData = store.fetchModerationData;

  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);



  useEffect(() => {
    fetchModerationData().then(() => {
      setLastUpdated(new Date());
    });
  }, [fetchModerationData]);

  const handleRefresh = async () => {
    await fetchModerationData();
    setLastUpdated(new Date());
  };

  // Mock data for demonstration (заменится реальными данными из store)
  const mockBans: Ban[] = [
    { id: 1, user: 'User#1234', reason: 'Spamming', date: '2024-01-15', duration: '30 days', moderator: 'Admin#0001' },
    { id: 2, user: 'User#5678', reason: 'Harassment', date: '2024-01-14', duration: 'Permanent', moderator: 'Mod#0002' },
  ];

  const mockKicks: Kick[] = [
    { id: 1, user: 'User#9012', reason: 'Inappropriate name', date: '2024-01-15', moderator: 'Admin#0001' },
    { id: 2, user: 'User#3456', reason: 'Channel disruption', date: '2024-01-13', moderator: 'Mod#0003' },
  ];

  const mockWarnings: Warning[] = [
    { id: 1, user: 'User#7890', reason: 'Minor spam', date: '2024-01-15', moderator: 'Mod#0002' },
    { id: 2, user: 'User#2345', reason: 'Language violation', date: '2024-01-12', moderator: 'Admin#0001' },
  ];


  const displayBans = bans.length > 0 ? bans : mockBans;
  const displayKicks = kicks.length > 0 ? kicks : mockKicks;
  const displayWarnings = warnings.length > 0 ? warnings : mockWarnings;

  if (isLoading) {
    return (
      <div className={styles.container}>
        <Sidebars />
        <div className={styles.contentArea}>
          <div className={styles.fullscreen}>
            <div className={styles.loadingState}>
              <div className={styles.loadingSpinner}></div>
              <p className={styles.loadingText}>Loading moderation data...</p>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <h1 className={styles.title}>
                <Shield style={{ marginRight: '0.5rem' }} />
                Moderation
              </h1>
              <button
                onClick={handleRefresh}
                className={styles.refreshButton}
                disabled={isLoading}
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  color: 'var(--text-primary)'
                }}
              >
                <RefreshCw size={16} className={isLoading ? styles.loadingSpinner : ''} />
                Refresh
              </button>
            </div>
            <p className={styles.subtitle}>
              Manage and monitor server moderation actions
              {lastUpdated && (
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', display: 'block', marginTop: '0.25rem' }}>
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>

          {/* Statistics Cards */}
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.bans}`}>
                <Ban size={24} />
              </div>
              <div className={`${styles.statNumber} ${styles.bans}`}>
                {displayBans.length}
              </div>
              <div className={styles.statLabel}>Active Bans</div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.kicks}`}>
                <LogOut size={24} />
              </div>
              <div className={`${styles.statNumber} ${styles.kicks}`}>
                {displayKicks.length}
              </div>
              <div className={styles.statLabel}>Recent Kicks</div>
            </div>

            <div className={styles.statCard}>
              <div className={`${styles.statIcon} ${styles.warnings}`}>
                <AlertTriangle size={24} />
              </div>
              <div className={`${styles.statNumber} ${styles.warnings}`}>
                {displayWarnings.length}
              </div>
              <div className={styles.statLabel}>Active Warnings</div>
            </div>
          </div>

          {/* Additional Info */}
          <div className={styles.infoCard}>
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <div className={styles.infoItem__value}>24h</div>
                <div className={styles.infoItem__label}>Actions Today</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoItem__value}>3</div>
                <div className={styles.infoItem__label}>Active Moderators</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoItem__value}>98%</div>
                <div className={styles.infoItem__label}>Compliance Rate</div>
              </div>
              <div className={styles.infoItem}>
                <div className={styles.infoItem__value}>0</div>
                <div className={styles.infoItem__label}>Appeals Pending</div>
              </div>
            </div>
          </div>

          {/* Bans Table */}
          <div className={styles.dataSection}>
            <h2 className={styles.sectionTitle}>
              <Ban size={20} />
              Active Bans ({displayBans.length})
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Duration</th>
                    <th>Moderator</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayBans.map((ban) => (
                    <tr key={ban.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={14} />
                          {ban.user}
                        </div>
                      </td>
                      <td>{ban.reason}</td>
                      <td>{ban.date}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${ban.duration === 'Permanent' ? styles.permanent :
                          ban.duration.includes('days') ? styles.active : styles.expired
                          }`}>
                          {ban.duration}
                        </span>
                      </td>
                      <td>{ban.moderator}</td>
                      <td>
                        <div className={styles.actions}>
                          <button className={`${styles.actionButton} ${styles.viewButton}`}>
                            View
                          </button>
                          <button className={`${styles.actionButton} ${styles.appealButton}`}>
                            Appeal
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Kicks Table */}
          <div className={styles.dataSection}>
            <h2 className={styles.sectionTitle}>
              <LogOut size={20} />
              Recent Kicks ({displayKicks.length})
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Moderator</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayKicks.map((kick) => (
                    <tr key={kick.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={14} />
                          {kick.user}
                        </div>
                      </td>
                      <td>{kick.reason}</td>
                      <td>{kick.date}</td>
                      <td>{kick.moderator}</td>
                      <td>
                        <button className={`${styles.actionButton} ${styles.viewButton}`}>
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Warnings Table */}
          <div className={styles.dataSection}>
            <h2 className={styles.sectionTitle}>
              <AlertTriangle size={20} />
              Active Warnings ({displayWarnings.length})
            </h2>
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Reason</th>
                    <th>Date</th>
                    <th>Moderator</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {displayWarnings.map((warning) => (
                    <tr key={warning.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <User size={14} />
                          {warning.user}
                        </div>
                      </td>
                      <td>{warning.reason}</td>
                      <td>{warning.date}</td>
                      <td>{warning.moderator}</td>
                      <td>
                        <span className={`${styles.statusBadge} ${styles.active}`}>
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}