import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.js'
import './styles/main.scss' // Заменяем index.css на main.scss
import './assets/fonts/fonts.css'
import { AuthProvider } from './context/AuthContext.js'

// Инициализация мониторинга производительности
if (process.env.NODE_ENV === 'production') {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      const value = (entry as any).value !== undefined ? (entry as any).value : entry.duration;
      console.log(`${entry.name}: ${value}`)
    })
  })
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
)