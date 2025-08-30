import React, { useEffect, useRef, useState } from 'react'
import './Header.css'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import logoImg from '../../assets/images/logo/1-EvoGem.png'

const Header = ({ onToggleSidebar, isSidebarOpen = false }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [openByClick, setOpenByClick] = useState(false)
  const menuRef = useRef(null)
  const avatarRef = useRef(null)

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

  const toggleMenu = () => {
    setMenuOpen(v => {
      const next = !v
      setOpenByClick(next) // if user toggled by click, lock until outside/Escape
      return next
    })
  }

  // Close on outside click / escape
  useEffect(() => {
    if (!menuOpen) return
    const onClick = (e) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(e.target) && !avatarRef.current?.contains(e.target)) {
        setMenuOpen(false)
        setOpenByClick(false)
      }
    }
    const onKey = (e) => {
      if (e.key === 'Escape') { setMenuOpen(false); setOpenByClick(false) }
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

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
        <div
          className="user-menu"
          ref={menuRef}
          onMouseEnter={() => setMenuOpen(true)}
          onMouseLeave={() => { if (!openByClick) setMenuOpen(false) }}
        >
          <button
            ref={avatarRef}
            className="avatar"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Abrir menu do usuário"
            title="Conta"
            onClick={toggleMenu}
          >
            <span>U</span>
          </button>
          {menuOpen && (
            <div className="user-menu-content" role="menu">
              <div className="user-info"><span>User: 99189535-ae19-4b33-8605-9f0c2dad4bec</span></div>
              <div className="menu-sep" aria-hidden="true" />
              <button className="logout-btn" role="menuitem" onClick={handleLogout}>Sair</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
