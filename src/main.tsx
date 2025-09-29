import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import './assets/fonts/fonts.css'

// Инициализация мониторинга производительности
if (process.env.NODE_ENV === 'production') {
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      console.log(`${entry.name}: ${entry.value}`)
    })
  })
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)