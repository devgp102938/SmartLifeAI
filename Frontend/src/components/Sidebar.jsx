import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Flame,
  Pill,
  CalendarCheck,
  Sparkles,
  User,
  HeartHandshake
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Task Management', path: '/tasks', icon: CheckSquare },
  { name: 'Habit Management', path: '/habits', icon: Flame },
  { name: 'Medicine Management', path: '/medicine', icon: Pill },
  { name: 'Daily Check-In', path: '/check-ins', icon: CalendarCheck },
  { name: 'ORION AI', path: '/orion-ai', icon: Sparkles, badge: 'AI' },
  { name: 'Profile', path: '/profile', icon: User },
];

export const Sidebar = () => {
  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen border-r border-slate-800">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-slate-800 bg-slate-950/40">
         <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <img src="/logo.png" alt="" />
        </div> 
        <div>
          <span className="font-bold text-lg tracking-tight text-white block leading-tight">
            SmartLife <span className="text-indigo-400">AI</span>
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold block">
            Life Management
          </span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Main Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{item.name}</span>
              {item.badge && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {item.badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer info badge */}
      <div className="p-4 m-3 rounded-2xl bg-slate-800/50 border border-slate-800/80 text-xs text-slate-400">
        <div className="flex items-center gap-2 mb-1 text-slate-300 font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          System Active
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Version 1.0 &bull; Analytics engine connected
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;
