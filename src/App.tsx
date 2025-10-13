import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Сторы и провайдеры
import { AuthProvider } from "./stores/auth.js";
import { ThemeProvider } from "./stores/theme.js";

// Hooks
import { useDiscordAuth } from "./hooks/useDiscordAuth.js";

export const DiscordAuthHandler: React.FC = () => {
  useDiscordAuth();
  return null;
};

// Layout и страницы
import { Layout } from "./components/Layout/Layout.js";
import Dashboard from "@/pages/Dashboard.js";
import Home from "@/pages/Home.js";
import Moderation from "@/pages/Moderation.js";
import AuthCallback from "./pages/AuthCallback.js";
import SettingsPage from "./pages/Settings.js";
import BotDashboard from "./pages/BotDashboard.js";
import CommandsPage from "./pages/CommandsPage.js";
import DashboardOverview from "./pages/DashboardOverview.js";
import NotificationPage from "./pages/NotificationPage.js";

// Новые страницы
import { Login } from "@/pages/Login.js";
import { Register } from "@/pages/Register.js";
import { ForgotPassword } from "@/pages/ForgotPassword.js";
import { Support } from "@/pages/Support.js";
import { LockModal } from "@/components/LocalModal.js";
import Terms from "@/pages/Terms.js";
import Privacy from "@/pages/Privacy.js";
import { OAuthSuccess } from "@/pages/OAuthSuccess.js";
import { CompleteProfile } from "@/components/CompleteProfile.js";
import AdminLogs from "@/pages/AdminLogs.js";
import SecretCodesPage from "@/pages/SecretCodesPage.js";
import Profile from "@/pages/Profile.js";

// Стили
import styles from './App.module.scss';
import Users from "./pages/Users.js";
import AnalyticsPage from "./pages/AnalyticsPage.js";
import ReportsPage from "./pages/ReportsPage.js";
import NotificationsPage from "./pages/NotificationsPage.js";
import SupportPage from "./pages/SupportPage.js";
import Channels from "./pages/Channels.js";

// Context for sidebar
export const SidebarContext = React.createContext({
  isCollapsed: false,
  toggleSidebar: () => { }
});

function App() {
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockMessage, setLockMessage] = useState<string>("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const sidebarContextValue = {
    isCollapsed: isSidebarCollapsed,
    toggleSidebar
  };

  return (
    <div className={`${styles.app} ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <AuthProvider>
        <ThemeProvider>
          <SidebarContext.Provider value={sidebarContextValue}>
            <BrowserRouter>
              <DiscordAuthHandler />
              <div className={styles.mainContent}>
                <Routes>
                  {/* Страницы без Layout */}
                  <Route
                    path="/login"
                    element={
                      <Login
                        lockUntil={lockUntil}
                        lockMessage={lockMessage}
                        setLockUntil={setLockUntil}
                        setLockMessage={setLockMessage}
                      />
                    }
                  />
                  <Route path="/register" element={<Register />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/support" element={<Support />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/moderation" element={<Moderation />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/dashboard/settings" element={<SettingsPage />} />
                  <Route path="/dashboard/users" element={<Users />} />
                  <Route path="/dashboard/analytics" element={<AnalyticsPage />} />
                  <Route path="/dashboard/reports" element={<ReportsPage />} />
                  <Route path="/dashboard/notifications" element={<NotificationsPage />} />
                  <Route path="/dashboard/support" element={<SupportPage />} />
                  <Route path="/dashboard/bot" element={<BotDashboard />} />
                  <Route path="/dashboard/commands" element={<CommandsPage />} />
                  <Route path="/dashboard/overview" element={<DashboardOverview />} />
                  <Route path="/dashboard/notification" element={<NotificationPage />} />
                  <Route path="/dashboard/secret-codes" element={<SecretCodesPage />} />
                  <Route path="/dashboard/channels" element={<Channels />} />
                  <Route path="/terms" element={<Terms />} />
                  <Route path="/privacy" element={<Privacy />} />
                  <Route path="/oauth/success" element={<OAuthSuccess />} />
                  <Route path="/complete-profile" element={<CompleteProfile />} />
                  <Route path="/admin/logs" element={<AdminLogs />} />
                  <Route path="/dashboard/profile" element={<Profile />} />

                  {/* Страницы с Layout */}
                  <Route element={<Layout />}>
                    <Route path="/" element={<Home />} />
                  </Route>
                </Routes>
              </div>

              {/* LockModal глобально */}
              {lockUntil && (
                <LockModal
                  message={lockMessage}
                  lockUntil={lockUntil}
                  onClose={() => setLockUntil(null)}
                />
              )}
            </BrowserRouter>
          </SidebarContext.Provider>
        </ThemeProvider>
      </AuthProvider>
    </div>
  );
}

export default App;