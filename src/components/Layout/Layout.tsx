import React from 'react';
import { Outlet } from 'react-router-dom';
import ThemeToggle from '../ThemeToggle/ThemeToggle.js';
import styles from './Layout.module.scss';

export const Layout = () => {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1>Discord App</h1>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <p>&copy; 2024 Discord App. All rights reserved.</p>
      </footer>
    </div>
  );
};