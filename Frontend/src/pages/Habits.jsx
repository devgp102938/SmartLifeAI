import React, { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Clock,
  Award,
} from 'lucide-react';
import habitService from '../services/habitService.js';

export const Habits = () => {
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchHabits = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await habitService.getHabits();
      setHabits(data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to load habits.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHabits();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !durationDays || !startDate) {
      setFormError('Title, duration, and start date are required.');
      return;
    }

    try {
      setSubmitting(true);
      await habitService.createHabit({
        title: title.trim(),
        durationDays: Number(durationDays),
        startDate,
        description: description.trim(),
      });
      setShowModal(false);
      setTitle('');
      setDurationDays(30);
      setDescription('');
      fetchHabits();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Failed to create habit challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteToday = async (habitId) => {
    try {
      await habitService.completeHabit(habitId);
      fetchHabits();
    } catch (err) {
      // If already completed today, try uncompleting
      if (err.response?.data?.message?.includes('already completed')) {
        if (window.confirm('Mark this habit as incomplete for today?')) {
          try {
            await habitService.uncompleteHabit(habitId);
            fetchHabits();
          } catch (uncompleteErr) {
            alert(uncompleteErr.friendlyMessage || 'Failed to update habit.');
          }
        }
      } else {
        alert(err.friendlyMessage || 'Could not complete habit today.');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this habit?')) return;
    try {
      await habitService.deleteHabit(id);
      fetchHabits();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete habit.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Flame className="w-6 h-6 text-amber-500" />
            Habit Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Build consistency, log daily completions, and track challenge durations.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Habit Challenge</span>
        </button>
      </div>

      {/* Habits List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-44 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Flame className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No habit routines active</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Create a 21-day, 30-day, or custom habit challenge to start tracking your daily progress.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {habits.map((habit) => {
            const startFormatted = new Date(habit.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const endFormatted = new Date(habit.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            const statusColors = {
              active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
              upcoming: 'bg-indigo-50 text-indigo-700 border-indigo-200',
              finished: 'bg-slate-100 text-slate-600 border-slate-200',
            }[habit.status || 'active'];

            return (
              <div
                key={habit._id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-semibold border capitalize ${statusColors}`}
                    >
                      {habit.status || 'Active'}
                    </span>
                    <button
                      onClick={() => handleDelete(habit._id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Delete habit"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{habit.title}</h3>
                  {habit.description && (
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{habit.description}</p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {habit.durationDays} Days Goal
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {startFormatted} – {endFormatted}
                    </span>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => handleCompleteToday(habit._id)}
                    disabled={habit.status !== 'active'}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:hover:bg-amber-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Log Today's Completion</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Create Habit Routine</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Habit Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Morning 20m Meditation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    min={todayStr}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Description / Motivation
                </label>
                <textarea
                  rows="3"
                  placeholder="Why is this habit important to you?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer"
                >
                  {submitting ? 'Creating...' : 'Start Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Habits;
