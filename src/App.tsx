import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Dashboard from '@/pages/Dashboard'
import Home from '@/pages/Home'
import Moderation from '@/pages/Moderation'
import { AuthProvider } from './stores/auth'
import AuthCallback from './pages/AuthCallback'
import { Layout } from './components/Layout/Layout'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/moderation" element={<Moderation />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App