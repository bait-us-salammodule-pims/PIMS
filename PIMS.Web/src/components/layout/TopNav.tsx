import React from 'react';
import { Menu, LogOut, Shield } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Breadcrumbs } from './Breadcrumbs';

interface TopNavProps {
  onToggleSidebar: () => void;
  collapsed: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  // Generate 2-letter initials from full name or username
  const getInitials = (name?: string): string => {
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const primaryRole = user?.roles?.[0] || 'User';

  return (
    <header className="app-topnav">
      {/* Left section: Toggle & Breadcrumbs */}
      <div className="topnav-left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="sidebar-toggle-btn"
          aria-label="Toggle navigation sidebar"
          title="Toggle Sidebar"
        >
          <Menu size={20} />
        </button>

        <Breadcrumbs />
      </div>

      {/* Right section: User Profile & Actions */}
      <div className="topnav-right">
        {/* User Scope Badges if assigned */}
        {user?.branchId && (
          <span className="badge badge-secondary" title="Assigned Branch ID">
            Branch #{user.branchId}
          </span>
        )}
        {user?.departmentId && (
          <span className="badge badge-secondary" title="Assigned Department ID">
            Dept #{user.departmentId}
          </span>
        )}
        {user?.storeId && (
          <span className="badge badge-primary" title="Assigned Store ID">
            Store #{user.storeId}
          </span>
        )}

        {/* User Card */}
        <div className="user-profile-menu">
          <div className="user-avatar" title={user?.email}>
            {getInitials(user?.fullName || user?.username)}
          </div>
          <div className="user-info-text">
            <span className="user-name">{user?.fullName || user?.username || 'User'}</span>
            <span className="user-role-badge" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <Shield size={11} />
              <span>{primaryRole}</span>
            </span>
          </div>
        </div>

        {/* Logout action */}
        <button
          type="button"
          onClick={logout}
          className="btn btn-secondary btn-sm"
          title="Sign Out of PIMS"
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#dc2626' }}
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </div>
    </header>
  );
};
