import React from "react";
import Saidbar from "../components/Saidbar.js";
import styles from "../module_pages/Dashboard.module.scss";

const Dashboard: React.FC = () => {
  return (
    <div className={styles.layout}>
      {/* Sidebar */}
      <Saidbar />

      {/* Main content */}
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.header__title}>Moderator Panel</h1>
          <span className={styles.header__subtitle}>
            Manage Discord server and bot
          </span>
        </header>

        {/* Statistics cards */}
        <section className={styles.stats}>
          <div className={styles.card}>
            <h3 className={styles.card__title}>Total Members</h3>
            <p className={styles.card__value}>1250</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.card__title}>Online</h3>
            <p className={styles.card__value}>312</p>
          </div>
          <div className={styles.card}>
            <h3 className={styles.card__title}>Commands Today</h3>
            <p className={styles.card__value}>45</p>
          </div>
        </section>

        {/* Tables */}
        <section className={styles.tables}>
          <div className={styles.table__block}>
            <h2 className={styles.table__title}>Users</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Join Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alex</td>
                  <td>Admin</td>
                  <td>Online</td>
                  <td>2024-08-01</td>
                </tr>
                <tr>
                  <td>Maria</td>
                  <td>Moderator</td>
                  <td>Idle</td>
                  <td>2024-09-10</td>
                </tr>
                <tr>
                  <td>Ivan</td>
                  <td>Member</td>
                  <td>Offline</td>
                  <td>2024-10-20</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className={styles.table__block}>
            <h2 className={styles.table__title}>Command Log</h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Command</th>
                  <th>Arguments</th>
                  <th>Time</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Alex</td>
                  <td>/ban</td>
                  <td>@User123</td>
                  <td>14:20</td>
                  <td>OK</td>
                </tr>
                <tr>
                  <td>Maria</td>
                  <td>/mute</td>
                  <td>@User456 10m</td>
                  <td>14:25</td>
                  <td>Queued</td>
                </tr>
                <tr>
                  <td>Ivan</td>
                  <td>/kick</td>
                  <td>@User789</td>
                  <td>14:30</td>
                  <td>Error</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;