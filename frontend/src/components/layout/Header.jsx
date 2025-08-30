import React from 'react'
import './Header.css'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoImg from '../../assets/images/logo/1-EvoGem.png'

const Header = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()

  const pathToTitle = (path) => {
    const clean = path.replace(/\/+/g, '/').replace(/\/$/, '') || '/'
    const map = {
      '/': 'Início',
      '/dashboard': 'Dashboard',
      '/activities': 'Atividades',
      '/tasks': 'Tarefas',
      '/login': 'Login',
      '/register': 'Criar conta'
    }
    if (map[clean]) return map[clean]
    // Deriva do último segmento
    const seg = clean.split('/').filter(Boolean).pop() || 'Página'
    return seg.charAt(0).toUpperCase() + seg.slice(1)
  }

  const currentTitle = pathToTitle(location.pathname)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="app-header glass" role="banner">
      <div className="header-left">
        <button
          className="icon-btn menu-btn"
          aria-label={isSidebarOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-pressed={isSidebarOpen}
          onClick={onToggleSidebar}
        >
          ☰
        </button>
        <Link to="/dashboard" className="brand" aria-label="Ir para o dashboard">
          <img src={logoImg} alt="Personal Leveling logo" className="brand-logo" />
          <span className="brand-title">Personal Leveling</span>
        </Link>
        <div className="section-title" aria-live="polite">{currentTitle}</div>
      </div>
      <div className="header-actions">
        <button className="icon-btn" aria-label="Pesquisar">
          🔍
        </button>
        <button className="icon-btn" aria-label="Comandos">
          ⌘K
        </button>
        <button className="icon-btn" aria-label="Notificações">
          🔔
        </button>
        <button className="avatar" aria-label="Sair" title="Sair" onClick={handleLogout}>
          <span>U</span>
        </button>
      </div>
    </header>
  )
}

export default Header
