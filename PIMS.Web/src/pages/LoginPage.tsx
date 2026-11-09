import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { extractErrorMessage } from '../api/client';
import {
  Boxes,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if redirected due to session expiry
  const queryParams = new URLSearchParams(location.search);
  const isSessionExpired = queryParams.get('sessionExpired') === 'true';
  const returnUrl = queryParams.get('returnUrl') || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedUser = usernameOrEmail.trim();
    if (!trimmedUser) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Backend expects { usernameOrEmail, password }
      await login({
        usernameOrEmail: trimmedUser,
        password,
      });

      // Navigate to target return URL upon successful verification
      navigate(returnUrl, { replace: true });
    } catch (err: unknown) {
      const msg = extractErrorMessage(err, 'Failed to authenticate. Please check your credentials.');
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-split-container">
        {/* Left Branding Panel */}
        <div className="login-brand-panel">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '2.5rem' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                }}
              >
                <Boxes size={26} color="#ffffff" />
              </div>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.01em', color: '#ffffff' }}>
                  Bait-us-Salam
                </h2>
                <p style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Procurement &amp; Inventory Management System
                </p>
              </div>
            </div>

            <div style={{ maxWidth: '480px' }}>
              <h1 style={{ fontSize: '2.5rem', fontWeight: 800, lineHeight: 1.15, marginBottom: '1.25rem', letterSpacing: '-0.02em' }}>
                Enterprise Supply Chain &amp; Store Operations
              </h1>
              <p style={{ fontSize: '1rem', color: '#94a3b8', lineHeight: 1.6, marginBottom: '2.5rem' }}>
                Secure, end-to-end procurement workflows with multi-store inventory balances,
                vendor quotation comparisons, and rigorous audit trails.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>.NET 10 Web API Backend with PostgreSQL Engine</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>PBAC (Permission-Based Access Control) &amp; Role Claims</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#e2e8f0', fontSize: '0.875rem' }}>
                  <CheckCircle2 size={18} color="#10b981" />
                  <span>Automated Stock Movement &amp; Goods Receipt Ledger</span>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
            <span>API Target: http://localhost:5204/api</span>
            <span>PIMS Client v1.0.0</span>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="login-form-panel">
          <div className="login-form-box">
            <div className="login-header-group">
              <h2 className="login-header-title">Welcome Back</h2>
              <p className="login-header-subtitle">
                Sign in with your enterprise credentials to access your workspace.
              </p>
            </div>

            {/* Session Expiry Banner */}
            {isSessionExpired && (
              <div className="alert-box alert-info">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>Your session has expired. Please sign in again to continue.</span>
              </div>
            )}

            {/* Error Banner */}
            {errorMessage && (
              <div className="alert-box alert-error">
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="usernameOrEmail">
                  Username or Email
                </label>
                <div className="form-input-wrapper">
                  <User size={18} className="form-input-icon" />
                  <input
                    id="usernameOrEmail"
                    type="text"
                    className="form-input has-icon"
                    placeholder="Enter your username or email"
                    value={usernameOrEmail}
                    onChange={(e) => setUsernameOrEmail(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="username"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  Password
                </label>
                <div className="form-input-wrapper">
                  <Lock size={18} className="form-input-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    className="form-input has-icon"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isSubmitting}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '0.75rem',
                      color: '#94a3b8',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '0.75rem', padding: '0.75rem 1rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span
                      className="animate-spin"
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#ffffff',
                        borderRadius: '50%',
                        display: 'inline-block',
                      }}
                    />
                    Authenticating with Backend...
                  </span>
                ) : (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShieldCheck size={18} />
                    Sign In
                  </span>
                )}
              </button>
            </form>

            {/* Note about backend seeding & setup */}
            <div className="demo-credentials-box">
              <div style={{ fontWeight: 600, color: '#334155', marginBottom: '0.35rem' }}>
                Enterprise Authentication Note:
              </div>
              <p style={{ lineHeight: 1.5 }}>
                Authentication validates against <code>POST /api/auth/login</code> and requests user scopes from <code>GET /api/auth/me</code>.
                System roles and permissions are pre-seeded in the database via <code>AuthDataSeeder</code>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
