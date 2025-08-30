import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import "./Layout.css";
import Header from "./Header";
import Sidebar from "./Sidebar";
import Footer from "./Footer";
import Background from "./Background";

const Layout = ({
  children,
  showHeader = true,
  showSidebar = true,
  showFooter = true,
  fullBleed = false,
  centered = false,
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bodyClass = `app-body${fullBleed ? " full-bleed" : ""}${
    centered ? " centered" : ""
  }`;
  return (
    <div className="app-shell">
      <Background />
      {showHeader && (
        <Header
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          isSidebarOpen={sidebarOpen}
        />
      )}
      <div className={bodyClass} role="presentation">
        {showSidebar && (
          <>
            {/* Backdrop only on mobile when sidebar is open */}
            {sidebarOpen && (
              <div
                className="sidebar-backdrop"
                role="button"
                aria-label="Fechar menu"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            <Sidebar open={sidebarOpen} />
          </>
        )}
        <main className="app-content" role="main" tabIndex={-1}>
          {children ?? <Outlet />}
        </main>
      </div>
      {showFooter && <Footer />}
    </div>
  );
};

export default Layout;
