import React from "react";
import "./Sidebar.css";
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";

const Sidebar = ({ open = false }) => {
  const navigate = useNavigate();
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
        <NavLink
          to="/activities"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">📜</span>
          <span className="label">Activities</span>
        </NavLink>
        <NavLink
          to="/categories"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">🗂️</span>
          <span className="label">Categories</span>
        </NavLink>
        <NavLink
          to="/attributes"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">🧩</span>
          <span className="label">Attributes</span>
        </NavLink>
        <NavLink
          to="/tasks"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">✅</span>
          <span className="label">Tasks</span>
        </NavLink>
        <NavLink
          to="/notes"
          className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
        >
          <span className="icon">📝</span>
          <span className="label">Notes</span>
        </NavLink>
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
