import { Outlet } from 'react-router-dom'
import { Footer } from '../Footer'
import '../CSS/Layout.css' // Создадим новый файл стилей

export const Layout = () => {
  return (
    <div className="layout">
      <main className="layout-content">
        <Outlet /> {/* Сюда подставляются страницы */}
      </main>
      <Footer />
    </div>
  )
}