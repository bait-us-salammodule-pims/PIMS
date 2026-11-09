import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../config/navigation';

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathSegments = location.pathname.split('/').filter(Boolean);

  // Map path segments to friendly titles
  const getSegmentTitle = (segment: string): string => {
    // Check navigation items first
    for (const item of NAVIGATION_ITEMS) {
      if (item.path.includes(segment)) return item.title;
      if (item.children) {
        for (const child of item.children) {
          if (child.path.includes(segment)) return child.title;
        }
      }
    }

    // Fallback: capitalize hyphenated segment
    return segment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (pathSegments.length === 0 || location.pathname === '/dashboard') {
    return (
      <div className="breadcrumbs">
        <span className="breadcrumb-item current" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Home size={15} />
          <span>Dashboard</span>
        </span>
      </div>
    );
  }

  let accumulatedPath = '';

  return (
    <nav className="breadcrumbs" aria-label="Breadcrumb">
      <Link to="/dashboard" className="breadcrumb-item" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <Home size={14} />
        <span>Home</span>
      </Link>

      {pathSegments.map((segment, index) => {
        accumulatedPath += `/${segment}`;
        const isLast = index === pathSegments.length - 1;
        const title = getSegmentTitle(segment);

        return (
          <React.Fragment key={accumulatedPath}>
            <ChevronRight size={14} className="breadcrumb-separator" />
            {isLast ? (
              <span className="breadcrumb-item current" aria-current="page">
                {title}
              </span>
            ) : (
              <Link to={accumulatedPath} className="breadcrumb-item">
                {title}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
