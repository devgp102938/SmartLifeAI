import { NavLink, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  Pill,
  CalendarCheck,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import './Sidebar.css';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Task Management', path: '/tasks', icon: CheckSquare },
  { name: 'Habit Management', path: '/habits', icon: Flame },
  { name: 'Medicine Management', path: '/medicine', icon: Pill },
  { name: 'Daily Check-In', path: '/check-ins', icon: CalendarCheck },
  { name: 'ORION AI', path: '/orion-ai', icon: Sparkles, badge: 'AI' },
  { name: 'Profile', path: '/profile', icon: User },
];

export const Sidebar = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`app-sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        {/* Brand Header */}
        <div className="sidebar-brand">
          <div className="sidebar-brand-logo-wrapper">
            <Link to ="/">
            <img src="/logo.png" alt="SmartLife AI Logo" className="sidebar-brand-logo" />
            </Link>
          </div>
          <div className="sidebar-brand-text">
             <Link to ="/">
            <span className="sidebar-brand-title">
              SmartLife <span className="brand-ai">AI</span>
            </span>
            </Link>
            <span className="sidebar-brand-subtitle">Life Management</span>
          </div>
          {isOpen && (
            <button
              onClick={onClose}
              className="sidebar-close-btn"
              style={{ marginLeft: 'auto', color: '#94A3B8', padding: '4px' }}
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          <div className="sidebar-section-title">Main Modules</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={({ isActive }) =>
                  `sidebar-nav-item ${isActive ? 'active' : ''}`
                }
              >
                <Icon className="sidebar-nav-icon" />
                <span className="sidebar-nav-label">{item.name}</span>
                {item.badge && (
                  <span className="sidebar-badge-ai">{item.badge}</span>
                )}
              </NavLink>
            );
          })}
        </nav>

          <div className="footer">
            <div className="footer-text">
              <span className='text'>Your Life. Organized Intelligently</span>
            </div>
          </div>
      </aside>
    </>
  );
};

export default Sidebar;
