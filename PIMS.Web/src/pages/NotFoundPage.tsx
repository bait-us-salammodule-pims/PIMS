import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="placeholder-container" style={{ margin: '4rem auto' }}>
      <div className="placeholder-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}>
        <FileQuestion size={36} />
      </div>
      <h1 className="placeholder-title">404 — Page Not Found</h1>
      <p className="placeholder-desc">
        The requested URL path was not recognized in the PIMS application router.
      </p>
      <Link to="/dashboard" className="btn btn-primary">
        <ArrowLeft size={16} />
        <span>Return to Dashboard</span>
      </Link>
    </div>
  );
};
