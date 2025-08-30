import React from "react";
import "./Sidebar.css";
import { NavLink } from "react-router-dom";

const Sidebar = ({ open = false }) => {
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
    </aside>
  );
};

export default Sidebar;
