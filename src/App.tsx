import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Moderation from '@/pages/Moderation'
import { AuthProvider } from './stores/auth'
import AuthCallback from './pages/AuthCallback'
import { Layout } from './components/Layout/Layout'
import SettingsPage from './pages/Settings'
import { ThemeProvider } from './stores/theme'
import BotDashboard from './pages/BotDashboard'
import CommandsPage from './pages/CommandsPage'
import DashboardOverview from './pages/DashboardOverview'

// Новые страницы
import { Login } from './pages/Login'
import { Register}  from './pages/Register'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* Страницы без Layout */}
            <Route path="/login" element={<Login />} />
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
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App
