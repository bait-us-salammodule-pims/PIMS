import React from 'react';
import { Link } from 'react-router-dom';
import { Construction, ArrowLeft, Shield, Terminal } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface PlaceholderPageProps {
  title: string;
  category: string;
  description: string;
  requiredPermission?: string;
  apiRoute?: string;
}

export const PlaceholderPage: React.FC<PlaceholderPageProps> = ({
  title,
  category,
  description,
  requiredPermission,
  apiRoute,
}) => {
  const { hasPermission } = useAuth();
  const userHasPermission = !requiredPermission || hasPermission(requiredPermission);

  return (
    <div className="placeholder-container">
      <div className="placeholder-icon-wrap">
        <Construction size={36} />
      </div>

      <div style={{ marginBottom: '0.75rem' }}>
        <span className="badge badge-primary">{category}</span>
      </div>

      <h1 className="placeholder-title">{title}</h1>
      <p className="placeholder-desc">{description}</p>

      {/* Backend Integration Contract Info */}
      <div className="placeholder-specs" style={{ marginBottom: '1.75rem' }}>
        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Terminal size={14} className="text-primary" />
          <span>Backend Integration Specification</span>
        </div>

        {apiRoute && (
          <div className="placeholder-specs-item">
            <span style={{ color: '#64748b' }}>Target API Route</span>
            <code style={{ color: '#2563eb', fontWeight: 600 }}>{apiRoute}</code>
          </div>
        )}

        {requiredPermission && (
          <div className="placeholder-specs-item">
            <span style={{ color: '#64748b' }}>Required Permission</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={12} color={userHasPermission ? '#10b981' : '#dc2626'} />
              <code style={{ color: userHasPermission ? '#059669' : '#b91c1c' }}>
                {requiredPermission}
              </code>
            </span>
          </div>
        )}

        <div className="placeholder-specs-item">
          <span style={{ color: '#64748b' }}>Current Status</span>
          <span className="badge badge-warning">Foundation Ready — CRUD Pending Phase C</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <Link to="/dashboard" className="btn btn-secondary">
          <ArrowLeft size={16} />
          <span>Back to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
