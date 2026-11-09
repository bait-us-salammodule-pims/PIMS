import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

export const AppLayout: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <div className="app-shell">
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

      <div className={`app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <TopNav onToggleSidebar={handleToggleSidebar} collapsed={sidebarCollapsed} />

        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
