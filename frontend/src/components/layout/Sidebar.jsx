import React, { useState } from "react";
import "./Sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar = ({ open = false }) => {
  const navigate = useNavigate();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <aside
      className={`app-sidebar ${open ? "open" : ""}`}
      role="navigation"
      aria-hidden={!open}
      aria-expanded={open}
      aria-label="Navegação principal"
    >
      <nav>
        <NavLink
          to="/dashboard"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">🏠</span>
          <span className="label">Dashboard</span>
        </NavLink>
        {/* Lancamentos */}
        <NavLink
          to="/lancamentos"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">🕒</span>
          <span className="label">Lançamentos</span>
        </NavLink>
        <div className="nav-item disabled" aria-disabled="true" title="Desativado">
          <span className="icon">✅</span>
          <span className="label">Tasks</span>
        </div>
        <NavLink
          to="/notes"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">📝</span>
          <span className="label">Notes</span>
        </NavLink>
        {/* Configurações (collapsible) at bottom */}
        <button
          type="button"
          className={`nav-item settings-toggle ${settingsOpen ? "active" : ""}`}
          aria-haspopup="true"
          aria-expanded={settingsOpen}
          aria-controls="settings-submenu"
          onClick={() => setSettingsOpen(v => !v)}
        >
          <span className="icon">⚙️</span>
          <span className="label">Configurações</span>
          <span className="spacer" />
          <span className="chevron" aria-hidden>▾</span>
        </button>
        <div
          id="settings-submenu"
          className={`submenu ${settingsOpen ? "open" : ""}`}
          role="group"
          aria-label="Submenu de configurações"
        >
          <NavLink
            to="/activities"
            className={({ isActive }) => `nav-item sub ${isActive ? "active" : ""}`}
          >
            <span className="icon">📜</span>
            <span className="label">Activities</span>
          </NavLink>
          <NavLink
            to="/categories"
            className={({ isActive }) => `nav-item sub ${isActive ? "active" : ""}`}
          >
            <span className="icon">🗂️</span>
            <span className="label">Categories</span>
          </NavLink>
          <NavLink
            to="/attributes"
            className={({ isActive }) => `nav-item sub ${isActive ? "active" : ""}`}
          >
            <span className="icon">🧩</span>
            <span className="label">Attributes</span>
          </NavLink>
        </div>
      </nav>
      {/* Mobile-only actions pinned to bottom */}
      <div className="sidebar-actions" aria-hidden={!open}>
        <button className="icon-btn" aria-label="Pesquisar">🔍</button>
        <button className="icon-btn" aria-label="Comandos">⌘K</button>
        <button className="icon-btn" aria-label="Notificações">🔔</button>
        <button className="avatar" aria-label="Sair" title="Sair" onClick={handleLogout}>
          <span>U</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
