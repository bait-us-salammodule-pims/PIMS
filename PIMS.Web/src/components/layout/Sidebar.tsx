import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Lock, Boxes } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../config/navigation';
import { useAuth } from '../../context/AuthContext';
import type { NavItem } from '../../types/navigation';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const location = useLocation();
  const { hasPermission } = useAuth();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    // Automatically open group containing current path
    const initial: Record<string, boolean> = {};
    NAVIGATION_ITEMS.forEach((item) => {
      if (item.children?.some((child) => location.pathname.startsWith(child.path))) {
        initial[item.id] = true;
      }
    });
    return initial;
  });

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const isGroupActive = (item: NavItem): boolean => {
    if (location.pathname === item.path) return true;
    return item.children?.some((child) => location.pathname.startsWith(child.path)) ?? false;
  };

  return (
    <aside className={`app-sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Sidebar Header & Brand */}
      <div className="sidebar-header">
        <NavLink to="/dashboard" className="sidebar-brand">
          <div className="brand-logo-icon">
            <Boxes size={22} />
          </div>
          {!collapsed && (
            <div className="brand-text">
              <span className="brand-title">Bait-us-Salam</span>
              <span className="brand-subtitle">PIMS Enterprise</span>
            </div>
          )}
        </NavLink>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-nav-container">
        <div>
          {!collapsed && <div className="nav-group-title">Operations &amp; Master Data</div>}
          
          {NAVIGATION_ITEMS.map((item) => {
            const hasAccess = !item.permission || hasPermission(item.permission);
            const isGroup = !!item.children && item.children.length > 0;
            const isOpen = !!openGroups[item.id];
            const active = isGroupActive(item);

            if (!isGroup) {
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  className={`nav-item-btn ${active ? 'active' : ''}`}
                  title={collapsed ? item.title : undefined}
                >
                  <div className="nav-item-left">
                    <item.icon size={20} className="nav-item-icon" />
                    {!collapsed && <span className="nav-item-title">{item.title}</span>}
                  </div>
                  {!collapsed && !hasAccess && (
                    <span title="Permission restricted" style={{ display: 'flex', alignItems: 'center' }}>
                      <Lock size={14} className="text-muted" />
                    </span>
                  )}
                </NavLink>
              );
            }

            // Accordion Item with Sub-Navigation
            return (
              <div key={item.id} className="nav-group-wrapper">
                <button
                  type="button"
                  onClick={() => toggleGroup(item.id)}
                  className={`nav-item-btn ${active ? 'active' : ''}`}
                  title={collapsed ? item.title : undefined}
                >
                  <div className="nav-item-left">
                    <item.icon size={20} className="nav-item-icon" />
                    {!collapsed && <span className="nav-item-title">{item.title}</span>}
                  </div>
                  {!collapsed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      {!hasAccess && (
                        <span title="Limited access" style={{ display: 'flex', alignItems: 'center' }}>
                          <Lock size={13} className="text-muted" />
                        </span>
                      )}
                      {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </div>
                  )}
                </button>

                {/* Submenu links */}
                {!collapsed && isOpen && (
                  <div className="sub-nav-list">
                    {item.children?.map((child) => {
                      const childAccess = !child.permission || hasPermission(child.permission);
                      const isChildActive = location.pathname.startsWith(child.path);

                      return (
                        <NavLink
                          key={child.id}
                          to={child.path}
                          className={`sub-nav-item ${isChildActive ? 'active' : ''}`}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span>{child.title}</span>
                            {!childAccess && <Lock size={12} className="text-muted" />}
                          </div>
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Sidebar Footer info */}
      <div className="sidebar-footer">
        {!collapsed && (
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
            <span>Backend: </span>
            <span style={{ color: '#10b981', fontWeight: 600 }}>v10.0 (API Online)</span>
          </div>
        )}
      </div>
    </aside>
  );
};
