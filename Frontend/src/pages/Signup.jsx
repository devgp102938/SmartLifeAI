import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Lock, Mail, User, Phone, ArrowRight, AlertCircle } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import { useToast } from '../context/ToastContext.jsx';
import './Login.css';

export const Signup = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { signup } = useAuth();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !email.trim() || !password || !phone.trim()) {
      setFormError('All fields (Name, Email, Phone, Password) are required.');
      return;
    }

    if (!email.includes('@') || !email.includes('.')) {
      setFormError('Please enter a valid email address.');
      return;
    }

    try {
      setSubmitting(true);
      await signup({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        password,
      });
      showSuccess('Account created successfully! Welcome to SmartLife AI.');
      navigate('/');
    } catch (err) {
      const msg = err.friendlyMessage || 'Registration failed. Please check inputs.';
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
          Create your personal optimization account
        </p>
      </div>

      <div className="auth-card-container">
        <h3 className="auth-card-heading">Register New Profile</h3>

        {formError && (
          <div className="form-error-alert" style={{ marginBottom: '20px' }}>
            <AlertCircle size={16} />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="auth-label" htmlFor="signup-name">
              Full Name
            </label>
            <div className="auth-input-wrapper">
              <User size={16} className="auth-input-icon" />
              <input
                id="signup-name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Mercer"
                className="auth-input-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label" htmlFor="signup-email">
              Email Address
            </label>
            <div className="auth-input-wrapper">
              <Mail size={16} className="auth-input-icon" />
              <input
                id="signup-email"
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
            <label className="auth-label" htmlFor="signup-phone">
              Phone Number
            </label>
            <div className="auth-input-wrapper">
              <Phone size={16} className="auth-input-icon" />
              <input
                id="signup-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="auth-input-field"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="auth-label" htmlFor="signup-password">
              Password
            </label>
            <div className="auth-input-wrapper">
              <Lock size={16} className="auth-input-icon" />
              <input
                id="signup-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="auth-input-field"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="auth-submit-btn"
          >
            <span>{submitting ? 'Registering...' : 'Create Account'}</span>
            <ArrowRight size={16} />
          </button>
        </form>

        <div className="auth-footer-prompt">
          <span>Already registered? </span>
          <Link to="/login">Sign in here</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
