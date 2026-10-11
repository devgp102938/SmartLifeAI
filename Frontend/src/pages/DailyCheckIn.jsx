import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Smile,
  Zap,
  TrendingUp,
  Trash2,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import checkInService from '../services/checkInService.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import './DailyCheckIn.css';

const MOOD_OPTIONS = [
  { value: 'happy', label: 'Happy' },
  { value: 'calm', label: 'Calm' },
  { value: 'excited', label: 'Excited' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'tired', label: 'Tired' },
  { value: 'stressed', label: 'Stressed' },
  { value: 'anxious', label: 'Anxious' },
  { value: 'sad', label: 'Sad' },
  { value: 'frustrated', label: 'Frustrated' },
];

export const DailyCheckIn = () => {
  const { showSuccess, showError } = useToast();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [moodScore, setMoodScore] = useState(4);
  const [mood, setMood] = useState('happy');
  const [energy, setEnergy] = useState(4);
  const [productivity, setProductivity] = useState(4);
  const [reflection, setReflection] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    confirmText: 'Confirm',
    onConfirm: () => {},
  });

  const fetchHistory = async () => {
    setError(null);
    try {
      const data = await checkInService.getHistory();
      setHistory(data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to fetch check-in history.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!date) {
      setFormError('Date is required.');
      return;
    }

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
      showSuccess(`Daily check-in for ${date} recorded successfully!`);
      setReflection('');
      fetchHistory();
    } catch (err) {
      if (err.response?.status === 409) {
        // Check-in already exists -> ask via ConfirmModal if user wants to update it
        setConfirmConfig({
          isOpen: true,
          title: 'Update Existing Check-In?',
          message: `A check-in already exists for ${date}. Would you like to overwrite it with these new ratings?`,
          type: 'warning',
          confirmText: 'Update Check-In',
          onConfirm: async () => {
            setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
            try {
              await checkInService.updateCheckIn(date, {
                moodScore: Number(moodScore),
                mood,
                energy: Number(energy),
                productivity: Number(productivity),
                reflection: reflection.trim(),
              });
              showSuccess(`Check-in for ${date} updated successfully!`);
              fetchHistory();
            } catch (updateErr) {
              showError(updateErr.friendlyMessage || 'Failed to update check-in.');
            }
          },
        });
      } else {
        setFormError(err.friendlyMessage || 'Failed to record check-in.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePrompt = (targetDate) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Daily Check-In',
      message: `Are you sure you want to delete the check-in record for ${targetDate}?`,
      type: 'danger',
      confirmText: 'Delete Record',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await checkInService.deleteCheckIn(targetDate);
          showSuccess('Daily check-in record deleted.');
          fetchHistory();
        } catch (err) {
          showError(err.friendlyMessage || 'Failed to delete check-in.');
        }
      },
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="checkin-container">
      {/* Header */}
      <div className="checkin-header">
        <div className="checkin-title-group">
          <h1>
            <CalendarCheck size={26} color="var(--color-primary-blue)" />
            Daily Well-Being Check-In
          </h1>
          <p>
            Log daily psychological mood, energy reserve, and self-reported productivity pacing.
          </p>
        </div>
      </div>

      {/* Main Layout */}
      <div className="checkin-layout">
        {/* Form Card */}
        <div className="checkin-form-card">
          <h2 className="card-heading">Log Today's State</h2>

          {formError && (
            <div className="form-error-alert">
              <AlertCircle size={16} />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="checkin-date">Check-In Date *</label>
              <input
                id="checkin-date"
                type="date"
                max={todayStr}
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="form-group">
              <div className="rating-slider-group">
                <div className="rating-slider-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Smile size={14} color="var(--color-primary-blue)" />
                    Mood Rating (1-5)
                  </span>
                  <span className="rating-slider-value">{moodScore} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={moodScore}
                  onChange={(e) => setMoodScore(e.target.value)}
                  className="rating-range-input"
                />
                <div className="rating-scale-ticks">
                  <span>1 (Lowest)</span>
                  <span>3 (Balanced)</span>
                  <span>5 (Optimal)</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="checkin-mood-tag">Primary Affect / Mood State</label>
              <select
                id="checkin-mood-tag"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
              >
                {MOOD_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <div className="rating-slider-group">
                <div className="rating-slider-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Zap size={14} color="var(--color-warning)" />
                    Energy Level (1-5)
                  </span>
                  <span className="rating-slider-value">{energy} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={energy}
                  onChange={(e) => setEnergy(e.target.value)}
                  className="rating-range-input"
                />
                <div className="rating-scale-ticks">
                  <span>1 (Depleted)</span>
                  <span>3 (Moderate)</span>
                  <span>5 (Vibrant)</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <div className="rating-slider-group">
                <div className="rating-slider-label">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={14} color="var(--color-health-green)" />
                    Productivity Pacing (1-5)
                  </span>
                  <span className="rating-slider-value">{productivity} / 5</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={productivity}
                  onChange={(e) => setProductivity(e.target.value)}
                  className="rating-range-input"
                />
                <div className="rating-scale-ticks">
                  <span>1 (Stalled)</span>
                  <span>3 (Steady)</span>
                  <span>5 (Peak)</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="checkin-reflection">Mindset & Journal Reflection</label>
              <textarea
                id="checkin-reflection"
                rows="3"
                placeholder="What went well? Any obstacles, fatigue cues, or wins?"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              {submitting ? 'Submitting...' : 'Save Check-In'}
            </button>
          </form>
        </div>

        {/* History List Card */}
        <div className="checkin-history-card">
          <h2 className="card-heading">Check-In History</h2>

          {loading ? (
            <div className="history-list">
              {[1, 2, 3].map((i) => (
                <div key={i} className="skeleton-card" style={{ height: '90px' }} />
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="habits-empty-state" style={{ marginTop: '16px' }}>
              <CalendarCheck size={40} className="habits-empty-icon" />
              <h3 className="habits-empty-title">No check-ins logged yet</h3>
              <p className="habits-empty-desc">
                Submit your first daily check-in using the form on the left to track trends.
              </p>
            </div>
          ) : (
            <div className="history-list">
              {history.map((item) => {
                const formattedDate = new Date(item.date).toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                });

                return (
                  <div key={item._id} className="history-item">
                    <div className="history-item-top">
                      <div className="history-date">
                        <Calendar size={14} color="var(--color-primary-blue)" />
                        <span>{formattedDate}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="history-mood-badge">
                          {item.mood || 'Balanced'}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeletePrompt(item.date)}
                          className="history-delete-btn"
                          title="Delete check-in"
                          aria-label="Delete check-in"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>

                    <div className="history-scores-row">
                      <div className="score-cell">
                        <span className="score-cell-label">Mood</span>
                        <span className="score-cell-num">{item.moodScore}/5</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-label">Energy</span>
                        <span className="score-cell-num">{item.energy}/5</span>
                      </div>
                      <div className="score-cell">
                        <span className="score-cell-label">Productivity</span>
                        <span className="score-cell-num">{item.productivity}/5</span>
                      </div>
                    </div>

                    {item.reflection && (
                      <p className="history-reflection-text">"{item.reflection}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* REUSABLE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={confirmConfig.isOpen}
        title={confirmConfig.title}
        message={confirmConfig.message}
        type={confirmConfig.type}
        confirmText={confirmConfig.confirmText}
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default DailyCheckIn;
