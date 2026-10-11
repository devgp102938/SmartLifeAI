import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Calendar, Clock, Menu, Sun, Moon } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';
import { useTheme } from '../context/ThemeContext.jsx';
import './Navbar.css';

export const Navbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const todayStr = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <header className="app-navbar">
      {/* Left: Mobile toggle & Date */}
      <div className="navbar-left">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="navbar-menu-toggle"
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <div className="navbar-datetime">
          <div className="navbar-date-badge">
            <Calendar size={15} color="var(--color-text-secondary)" />
            <span>{todayStr}</span>
          </div>
          <div className="navbar-timezone">
            <Clock size={13} />
            <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
          </div>
        </div>
      </div>

      {/* Right: Theme Toggle, User profile & Logout */}
      <div className="navbar-right">
        <button
          type="button"
          onClick={toggleTheme}
          className="navbar-theme-toggle"
          aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
          title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
        >
          {isDark ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <div className="navbar-user-profile">
          <div className="navbar-user-avatar">
            <Link to="/profile">D</Link>
          </div>
          <div className="navbar-user-details">
            <div className="navbar-user-name">
              {user?.name || 'User'}
            </div>
            <div className="navbar-user-role">
              {user?.role || 'Personal Account'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="navbar-logout-btn"
          title="Sign out of SmartLife AI"
        >
          <LogOut size={15} />
          <span className="navbar-logout-label">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
