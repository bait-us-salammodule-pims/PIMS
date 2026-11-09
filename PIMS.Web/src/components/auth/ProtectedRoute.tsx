import React, { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, RefreshCw } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredPermission?: string;
  requiredRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredPermission,
  requiredRole,
}) => {
  const { isAuthenticated, isLoading, hasPermission, hasRole } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="auth-loading-screen">
        <div className="auth-loading-card">
          <div className="auth-loading-spinner">
            <RefreshCw className="animate-spin text-primary" size={32} />
          </div>
          <h3 className="auth-loading-title">Bait-us-Salam PIMS</h3>
          <p className="auth-loading-subtitle">Verifying secure session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`}
        replace
      />
    );
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <ShieldAlert size={48} className="text-warning" />
          </div>
          <h2>Access Restricted</h2>
          <p>
            Your account does not possess the required permission:{' '}
            <code className="permission-badge">{requiredPermission}</code>
          </p>
          <div className="unauthorized-actions">
            <button
              onClick={() => window.history.back()}
              className="btn btn-secondary"
            >
              Go Back
            </button>
            <a href="/dashboard" className="btn btn-primary">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (requiredRole && !hasRole(requiredRole)) {
    return (
      <div className="unauthorized-container">
        <div className="unauthorized-card">
          <div className="unauthorized-icon-wrap">
            <ShieldAlert size={48} className="text-warning" />
          </div>
          <h2>Role Required</h2>
          <p>
            This area requires the <strong>{requiredRole}</strong> role.
          </p>
          <div className="unauthorized-actions">
            <a href="/dashboard" className="btn btn-primary">
              Return to Dashboard
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
