import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, ArrowRight, AlertCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import './Login.css';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { login } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!email.trim() || !password) {
      setFormError('Please enter both email and password.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      await login({ email: email.trim(), password });
      showSuccess('Welcome back to SmartLife AI!');
      navigate('/');
    } catch (err) {
      const msg = err.friendlyMessage || 'Invalid credentials. Please try again.';
      setFormError(msg);
      showError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page-root">
      <div className="auth-ambient-glow" />

      <div className="auth-brand-header">
        <div className="auth-logo-badge">
          <img src="/logo.png" alt="SmartLife AI" className="auth-logo-img" />
        </div>
        <h2 className="auth-brand-title">
          SmartLife <span className="brand-ai">AI</span>
        </h2>
        <p className="auth-brand-subtitle">
          Personal Life, Health & Productivity Platform
        </p>
      </div>

      <div className="auth-card-container">
        <h3 className="auth-card-heading">Sign in to your account</h3>

        {formError && (
          <div className="form-error-alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="auth-label" htmlFor="login-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="auth-input-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label" htmlFor="login-password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="auth-input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-submit-btn"
          >
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Don't have an account yet? </span>
          <Link to="/signup">Create one now</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
