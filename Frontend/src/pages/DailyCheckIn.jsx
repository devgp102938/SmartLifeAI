import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Smile,
  Zap,
  TrendingUp,
  FileText,
  AlertCircle,
  Calendar,
  Check,
  Trash2,
} from 'lucide-react';
import checkInService from '../services/checkInService.js';

const MOODS = [
  { label: 'Happy', value: 'happy', emoji: '😄' },
  { label: 'Calm', value: 'calm', emoji: '😌' },
  { label: 'Excited', value: 'excited', emoji: '🤩' },
  { label: 'Neutral', value: 'neutral', emoji: '😐' },
  { label: 'Tired', value: 'tired', emoji: '🥱' },
  { label: 'Stressed', value: 'stressed', emoji: '😫' },
  { label: 'Anxious', value: 'anxious', emoji: '😰' },
  { label: 'Sad', value: 'sad', emoji: '😢' },
  { label: 'Frustrated', value: 'frustrated', emoji: '😤' },
];

export const DailyCheckIn = () => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Form State
  const [date, setDate] = useState(todayStr);
  const [moodScore, setMoodScore] = useState(4);
  const [mood, setMood] = useState('happy');
  const [energy, setEnergy] = useState(4);
  const [productivity, setProductivity] = useState(4);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // History State
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await checkInService.getCheckIns({ page: 1, limit: 10 });
      setHistory(data.checkIns || []);
    } catch (err) {
      console.error('History load error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      setSubmitting(true);
      await checkInService.createCheckIn({
        date,
        moodScore: Number(moodScore),
        mood,
        energy: Number(energy),
        productivity: Number(productivity),
        reflection: reflection.trim(),
      });
      setFormSuccess(`Daily check-in for ${date} recorded successfully!`);
      setReflection('');
      fetchHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        // Already exists -> offer update
        if (window.confirm('A check-in already exists for this date. Would you like to update it?')) {
          try {
            await checkInService.updateCheckIn(date, {
              moodScore: Number(moodScore),
              mood,
              energy: Number(energy),
              productivity: Number(productivity),
              reflection: reflection.trim(),
            });
            setFormSuccess(`Check-in for ${date} updated successfully!`);
            fetchHistory();
          } catch (updateErr) {
            setFormError(updateErr.friendlyMessage || 'Failed to update check-in.');
          }
        }
      } else {
        setFormError(err.friendlyMessage || 'Failed to record check-in.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (targetDate) => {
    if (!window.confirm(`Delete check-in for ${targetDate}?`)) return;
    try {
      await checkInService.deleteCheckIn(targetDate);
      fetchHistory();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete check-in.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="pb-2 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <CalendarCheck className="w-6 h-6 text-indigo-600" />
          Daily Well-Being Check-In
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Reflect on your mood, mental energy, and daily output to power long-term pattern analytics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* CHECK-IN FORM (Left: 7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span>Log Check-In</span>
          </h2>

          {formSuccess && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Date Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Calendar Date *
              </label>
              <input
                type="date"
                required
                max={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-48 px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 block mt-1">
                Can log for today or up to 5 days back.
              </span>
            </div>

            {/* Mood Category Badges */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Primary Mood *
              </label>
              <div className="flex flex-wrap gap-2">
                {MOODS.map((m) => (
                  <button
                    type="button"
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      mood === m.value
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span>{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Sliders: Mood Score, Energy, Productivity */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Mood Score (1-5) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-1">
                    <Smile className="w-4 h-4 text-indigo-500" />
                    Mood Rating
                  </span>
                  <span className="text-indigo-600 text-sm">{moodScore}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={moodScore}
                  onChange={(e) => setMoodScore(e.target.value)}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              {/* Energy (1-5) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Energy Level
                  </span>
                  <span className="text-amber-600 text-sm">{energy}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
              </div>

              {/* Productivity (1-5) */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-2">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-cyan-500" />
                    Productivity
                  </span>
                  <span className="text-cyan-600 text-sm">{productivity}/5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={productivity}
                  onChange={(e) => setProductivity(e.target.value)}
                  className="w-full accent-cyan-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Reflection Textarea */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                Personal Reflection & Notes
              </label>
              <textarea
                rows="3"
                maxLength={1000}
                placeholder="What went well today? What challenges or triggers arose?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-[11px] text-slate-400 block text-right mt-0.5">
                {reflection.length}/1000
              </span>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all cursor-pointer"
            >
              {submitting ? 'Saving...' : 'Submit Daily Check-In'}
            </button>
          </form>
        </div>

        {/* RECENT CHECK-INS (Right: 5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <span>Recent Check-Ins</span>
            </h2>

            {loadingHistory ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : history.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                <Smile className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <span>No check-in history logged yet.</span>
              </div>
            ) : (
              <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                {history.map((item) => (
                  <div
                    key={item._id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800">{item.date}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md font-semibold bg-indigo-50 text-indigo-700 capitalize">
                          {item.mood}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                        <span>Mood: <strong>{item.moodScore}/5</strong></span>
                        <span>Energy: <strong>{item.energy}/5</strong></span>
                        <span>Output: <strong>{item.productivity}/5</strong></span>
                      </div>

                      {item.reflection && (
                        <p className="text-xs text-slate-600 italic mt-1.5 line-clamp-2">
                          "{item.reflection}"
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDelete(item.date)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Delete check-in"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyCheckIn;
