import { useState, useEffect } from 'react';
import {
  Flame,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Calendar,
  AlertCircle,
  Clock,
  X,
} from 'lucide-react';
import habitService from '../services/habitService.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import './Habits.css';

export const Habits = () => {
  const { showSuccess, showError, showInfo } = useToast();
  const [habits, setHabits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [durationDays, setDurationDays] = useState(30);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: () => {},
  });

  const fetchHabits = async () => {
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
      showSuccess('Habit routine created successfully!');
      fetchHabits();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Failed to create habit challenge.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleHabitCompletion = async (habit) => {
    if (actionLoadingId === habit._id) return;

    if (habit.completedToday) {
      // If already completed today, prompt confirmation to uncomplete
      setConfirmConfig({
        isOpen: true,
        title: 'Mark Incomplete?',
        message: `Would you like to remove today's completion for "${habit.title}"?`,
        type: 'warning',
        confirmText: 'Mark Incomplete',
        onConfirm: async () => {
          setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
          setActionLoadingId(habit._id);
          try {
            await habitService.uncompleteHabit(habit._id);
            setHabits((prev) =>
              prev.map((h) => (h._id === habit._id ? { ...h, completedToday: false } : h))
            );
            showInfo('Habit marked as incomplete for today.');
            fetchHabits();
          } catch (err) {
            showError(err.friendlyMessage || 'Failed to update habit.');
          } finally {
            setActionLoadingId(null);
          }
        },
      });
      return;
    }

    // Mark habit as complete
    setActionLoadingId(habit._id);
    try {
      await habitService.completeHabit(habit._id);
      // Immediately reflect completion in state
      setHabits((prev) =>
        prev.map((h) => (h._id === habit._id ? { ...h, completedToday: true } : h))
      );
      showSuccess('Habit completed for today!');
      fetchHabits();
    } catch (err) {
      showError(err.friendlyMessage || 'Could not complete habit today.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePrompt = (habit) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Habit Routine',
      message: `Are you sure you want to delete "${habit.title}"? This action cannot be undone.`,
      type: 'danger',
      confirmText: 'Delete Habit',
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await habitService.deleteHabit(habit._id);
          showSuccess('Habit deleted successfully.');
          fetchHabits();
        } catch (err) {
          showError(err.friendlyMessage || 'Failed to delete habit.');
        }
      },
    });
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="habits-container">
      {/* Header */}
      <div className="habits-header">
        <div className="habits-title-group">
          <h1>
            <Flame size={26} color="var(--color-warning)" />
            Habit Management
          </h1>
          <p>
            Build consistency, log daily completions, and track challenge durations.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>New Habit Challenge</span>
        </button>
      </div>

      {/* Error state banner */}
      {error && (
        <div className="form-error-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Habits List */}
      {loading ? (
        <div className="habits-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: '220px' }} />
          ))}
        </div>
      ) : habits.length === 0 ? (
        <div className="habits-empty-state">
          <Flame size={44} className="habits-empty-icon" />
          <h3 className="habits-empty-title">No habit routines active</h3>
          <p className="habits-empty-desc">
            Create a 21-day, 30-day, or custom habit challenge to start tracking your daily progress.
          </p>
        </div>
      ) : (
        <div className="habits-grid">
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

            const statusClass = {
              active: 'habit-status-active',
              upcoming: 'habit-status-upcoming',
              finished: 'habit-status-finished',
            }[habit.status || 'active'];

            const isCompleted = Boolean(habit.completedToday);
            const isActing = actionLoadingId === habit._id;

            return (
              <div
                key={habit._id}
                className={`habit-card ${isCompleted ? 'is-completed' : ''}`}
              >
                <div>
                  <div className="habit-card-top">
                    <span className={`habit-status-pill ${statusClass}`}>
                      {habit.status || 'Active'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeletePrompt(habit)}
                      className="habit-delete-btn"
                      title="Delete habit"
                      aria-label="Delete habit"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="habit-title">{habit.title}</h3>
                  {habit.description && (
                    <p className="habit-description">{habit.description}</p>
                  )}

                  <div className="habit-meta-details">
                    <span className="habit-meta-item">
                      <Clock size={14} color="var(--color-text-muted)" />
                      {habit.durationDays} Days Goal
                    </span>
                    <span className="habit-meta-item">
                      <Calendar size={14} color="var(--color-text-muted)" />
                      {startFormatted} – {endFormatted}
                    </span>
                  </div>
                </div>

                <div className="habit-card-actions">
                  <button
                    type="button"
                    onClick={() => handleToggleHabitCompletion(habit)}
                    disabled={habit.status !== 'active' || isActing}
                    className={`habit-completion-btn ${
                      isCompleted ? 'btn-completed' : 'btn-pending'
                    }`}
                    title={
                      isCompleted
                        ? 'Click to mark as incomplete for today'
                        : 'Log completion for today'
                    }
                  >
                    {isActing ? (
                      <span>Updating...</span>
                    ) : isCompleted ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Completed Today</span>
                      </>
                    ) : (
                      <>
                        <Circle size={16} />
                        <span>Mark Complete</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Create Habit Routine</h3>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setShowModal(false)}
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && (
                  <div className="form-error-alert">
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="habit-title">Habit Title *</label>
                  <input
                    id="habit-title"
                    type="text"
                    required
                    placeholder="e.g., Morning 20m Meditation"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="habit-duration">Duration (Days) *</label>
                    <input
                      id="habit-duration"
                      type="number"
                      min="1"
                      max="365"
                      required
                      value={durationDays}
                      onChange={(e) => setDurationDays(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="habit-start-date">Start Date *</label>
                    <input
                      id="habit-start-date"
                      type="date"
                      required
                      min={todayStr}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="habit-desc">Description / Motivation</label>
                  <textarea
                    id="habit-desc"
                    rows="3"
                    placeholder="Why is this habit important to you?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? 'Creating...' : 'Start Routine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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

export default Habits;
