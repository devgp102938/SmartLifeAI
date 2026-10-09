import React from 'react';
import { User, Mail, Phone, Shield, Calendar, Clock, HeartHandshake } from 'lucide-react';
import useAuth from '../hooks/useAuth.js';

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
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <User className="w-6 h-6 text-indigo-600" />
          User Profile & Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your account credentials, security tier, and connected life management profile.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
        {/* Profile Header Card */}
        <div className="flex flex-col sm:flex-row items-center gap-5 pb-6 border-b border-slate-100">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 text-white font-extrabold text-3xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="text-center sm:text-left">
            <h2 className="text-xl font-bold text-slate-900">{user?.name || 'SmartLife User'}</h2>
            <p className="text-sm text-slate-500">{user?.email}</p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                {user?.role || 'Personal Account'}
              </span>
              <span className="text-xs text-slate-400">
                Member since {joinedFormatted}
              </span>
            </div>
          </div>
        </div>

        {/* Detailed Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-indigo-600 shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Full Legal Name
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                {user?.name}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-indigo-600 shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Email Address
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                {user?.email}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-indigo-600 shadow-xs">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Contact Phone
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                {user?.phone || 'Not provided'}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
            <div className="p-2 rounded-lg bg-white text-indigo-600 shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block">
                Security & Authorization
              </span>
              <span className="text-sm font-bold text-slate-800 mt-0.5 block capitalize">
                {user?.role} Tier (HTTP-Only Secure Cookie)
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
