import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User as UserIcon, Calendar, Clock } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';

export const Navbar = () => {
  const { user, logout } = useAuth();
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
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Date & Time Info */}
      <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-100 text-slate-700">
          <Calendar className="w-4 h-4 text-slate-500" />
          <span>{todayStr}</span>
        </div>
        <div className="hidden sm:flex items-center gap-1 text-xs text-slate-400">
          <Clock className="w-3.5 h-3.5" />
          <span>{Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
        </div>
      </div>

      {/* Right: User info & Logout */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold flex items-center justify-center text-sm shadow-sm">
            {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
          </div>
          <div className="hidden md:block text-left">
            <div className="text-sm font-semibold text-slate-800 leading-tight">
              {user?.name || 'User'}
            </div>
            <div className="text-xs text-slate-400 capitalize">
              {user?.role || 'Personal Account'}
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-all cursor-pointer"
          title="Sign out of SmartLife AI"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
};

export default Navbar;
