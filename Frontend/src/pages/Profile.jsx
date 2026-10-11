import { User, Mail, Phone, Shield } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import './Profile.css';

export const Profile = () => {
  const { user } = useAuth();

  const joinedFormatted = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Active';

  return (
    <div className="profile-container">
      {/* Header */}
      <div className="profile-header">
        <div className="profile-title-group">
          <h1>
            <User size={26} color="var(--color-primary-blue)" />
            User Profile & Settings
          </h1>
          <p>
            Review your account credentials, security tier, and connected life management profile.
          </p>
        </div>
      </div>

      <div className="profile-card">
        {/* Profile Header Card */}
        <div className="profile-hero-row">
          <div className="profile-big-avatar">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="profile-hero-info">
            <h2>{user?.name || 'SmartLife User'}</h2>
            <p>{user?.email}</p>
            <div className="profile-badges-row">
              <span className="profile-role-pill">
                {user?.role || 'Personal Account'}
              </span>
              <span className="profile-joined-text">
                Member since {joinedFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Fields */}
        <div className="profile-fields-grid">
          <div className="profile-field-box">
            <div className="field-icon-wrapper">
              <User size={18} />
            </div>
            <div className="field-content-group">
              <span className="field-label">Full Legal Name</span>
              <span className="field-value">{user?.name || 'Not provided'}</span>
            </div>
          </div>

          <div className="profile-field-box">
            <div className="field-icon-wrapper">
              <Mail size={18} />
            </div>
            <div className="field-content-group">
              <span className="field-label">Email Address</span>
              <span className="field-value">{user?.email || 'Not provided'}</span>
            </div>
          </div>

          <div className="profile-field-box">
            <div className="field-icon-wrapper">
              <Phone size={18} />
            </div>
            <div className="field-content-group">
              <span className="field-label">Contact Phone</span>
              <span className="field-value">{user?.phone || 'Not provided'}</span>
            </div>
          </div>

          <div className="profile-field-box">
            <div className="field-icon-wrapper">
              <Shield size={18} />
            </div>
            <div className="field-content-group">
              <span className="field-label">Security & Authorization</span>
              <span className="field-value">
                {user?.role ? `${user.role.toUpperCase()} (Session Encrypted)` : 'Standard Tier'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
