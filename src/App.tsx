import React, { useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

// Сторы и провайдеры
import { AuthProvider } from "./stores/auth.js";
import { ThemeProvider } from "./stores/theme.js";

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
import { LockModal } from "@/components/LocalModal.js";
import Terms from "@/pages/Terms.js";
import Privacy from "@/pages/Privacy.js";
import { OAuthSuccess } from "@/pages/OAuthSuccess.js";
import { CompleteProfile } from "@/components/CompleteProfile.js";
import AdminLogs from "@/pages/AdminLogs.js";

function App() {
  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [lockMessage, setLockMessage] = useState<string>("");

  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
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

            {/* Страницы с Layout */}
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/moderation" element={<Moderation />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
              <Route path="/dashboard/bot" element={<BotDashboard />} />
              <Route path="/dashboard/commands" element={<CommandsPage />} />
              <Route path="/dashboard/overview" element={<DashboardOverview />} />
              <Route path="/dashboard/notification" element={<NotificationPage />} />
              <Route path="/terms" element={<Terms />} />
              <Route path="/privacy" element={<Privacy />} />
              <Route path="/oauth/success" element={<OAuthSuccess />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />
              <Route path="/admin/logs" element={<AdminLogs />} />
            </Route>
          </Routes>

          {/* LockModal глобально */}
          {lockUntil && (
            <LockModal
              message={lockMessage}
              onClose={() => setLockUntil(null)}
            />
          )}
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
