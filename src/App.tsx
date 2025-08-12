import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Moderation from '@/pages/Moderation'
import { AuthProvider } from './stores/auth'
import AuthCallback from './pages/AuthCallback'
import { Layout } from './components/Layout/Layout'
import SettingsPage from './pages/Settings'
import { ThemeProvider } from './stores/theme'

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              <Route path="/moderation" element={<Moderation />} />
              <Route path='/dashboard' element={<Dashboard />} />
              <Route path="/dashboard/settings" element={<SettingsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App