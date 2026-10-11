import { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Trash2,
  Clock,
  RotateCcw,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Info,
} from 'lucide-react';
import medicineService from '../services/medicineService.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import './Medicine.css';

const ALL_WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const Medicine = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionDoseKey, setActionDoseKey] = useState(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [times, setTimes] = useState(['08:00']);
  const [newTime, setNewTime] = useState('');
  const [scheduleType, setScheduleType] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState(['monday', 'wednesday', 'friday']);
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(() => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    return getLocalDateString(end);
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const fetchMedicines = async () => {
    setError(null);
    try {
      const data = await medicineService.getMedicines();
      setMedicines(data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to fetch medicines.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, []);

  const handleAddTime = () => {
    if (!newTime) return;
    if (!times.includes(newTime)) {
      setTimes([...times, newTime].sort());
      setNewTime('');
    }
  };

  const handleRemoveTime = (timeToRemove) => {
    if (times.length <= 1) {
      setFormError('At least one dose time is required.');
      return;
    }
    setTimes(times.filter((t) => t !== timeToRemove));
  };

  const handleToggleWeekday = (day) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length <= 1) {
        setFormError('Please select at least one weekday for this schedule.');
        return;
      }
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !dosage.trim() || times.length === 0 || !startDate || !endDate) {
      setFormError('Name, dosage, scheduled times, start date, and end date are required.');
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      setFormError('End date cannot be before start date.');
      return;
    }

    if (scheduleType === 'specific-days' && daysOfWeek.length === 0) {
      setFormError('Please select at least one weekday.');
      return;
    }

    try {
      setSubmitting(true);
      await medicineService.createMedicine({
        name: name.trim(),
        dosage: dosage.trim(),
        notes: notes.trim(),
        times,
        scheduleType,
        daysOfWeek: scheduleType === 'specific-days' ? daysOfWeek : [],
        startDate,
        endDate,
      });
      setShowModal(false);
      setName('');
      setDosage('');
      setNotes('');
      setTimes(['08:00']);
      setScheduleType('daily');
      showSuccess('Medication profile & schedule created successfully!');
      fetchMedicines();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Failed to create medicine schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeDose = async (medId, time) => {
    const today = getLocalDateString();
    const key = `${medId}-${time}`;
    setActionDoseKey(key);
    try {
      await medicineService.takeDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      showSuccess(`Dose for ${time} marked as taken.`);
      fetchMedicines();
    } catch (err) {
      showError(err.friendlyMessage || 'Unable to log dose. Please try again.');
    } finally {
      setActionDoseKey(null);
    }
  };

  const handleSkipDose = async (medId, time) => {
    const today = getLocalDateString();
    const key = `${medId}-${time}`;
    setActionDoseKey(key);
    try {
      await medicineService.skipDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      showWarning(`Dose for ${time} skipped.`);
      fetchMedicines();
    } catch (err) {
      showError(err.friendlyMessage || 'Unable to skip dose. Please try again.');
    } finally {
      setActionDoseKey(null);
    }
  };

  const handleUndoDose = async (medId, time) => {
    const today = getLocalDateString();
    const key = `${medId}-${time}`;
    setActionDoseKey(key);
    try {
      await medicineService.undoDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      showInfo(`Dose action for ${time} undone.`);
      fetchMedicines();
    } catch (err) {
      showError(err.friendlyMessage || 'Unable to undo dose action.');
    } finally {
      setActionDoseKey(null);
    }
  };

  const handleDeletePrompt = (med) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Medication',
      message: `Are you sure you want to delete "${med.name}" (${med.dosage})? This will archive future schedules.`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await medicineService.deleteMedicine(med._id);
          showSuccess('Medication profile deleted.');
          fetchMedicines();
        } catch (err) {
          showError(err.friendlyMessage || 'Failed to delete medicine.');
        }
      },
    });
  };

  // Determine today's weekday
  const weekDayMap = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayName = weekDayMap[new Date().getDay()];

  return (
    <div className="medicine-container">
      {/* Header */}
      <div className="medicine-header">
        <div className="medicine-title-group">
          <h1>
            <Pill size={26} color="var(--color-health-green)" />
            Medicine Management
          </h1>
          <p>
            Track pharmaceutical adherence, manage dose schedules, and log daily compliance.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>New Medication</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="form-error-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Medicine Grid */}
      {loading ? (
        <div className="medicine-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: '240px' }} />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <div className="habits-empty-state">
          <Pill size={44} className="habits-empty-icon" />
          <h3 className="habits-empty-title">No medication profiles active</h3>
          <p className="habits-empty-desc">
            Add your daily vitamins, prescriptions, or therapies to begin tracking adherence.
          </p>
        </div>
      ) : (
        <div className="medicine-grid">
          {medicines.map((med) => {
            const startFormatted = new Date(med.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const endFormatted = med.endDate
              ? new Date(med.endDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : 'Ongoing';

            const todayLogs = med.todayLogs || {};
            const hasSchedule = med.times && med.times.length > 0;
            const isSpecificDays = med.scheduleType === 'specific-days';
            const isScheduledToday =
              !isSpecificDays || (med.daysOfWeek && med.daysOfWeek.includes(todayDayName));

            const daysLabel =
              isSpecificDays && med.daysOfWeek?.length > 0
                ? med.daysOfWeek.map((d) => d.slice(0, 3).toUpperCase()).join(', ')
                : 'Daily';

            return (
              <div key={med._id} className="medicine-card">
                <div>
                  <div className="medicine-card-top">
                    <div className="medicine-badges-group">
                      <span className="medicine-badge-dosage">{med.dosage}</span>
                      {hasSchedule && (
                        <span className="medicine-badge-schedule">
                          {med.scheduleType === 'daily' ? 'Daily' : daysLabel}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeletePrompt(med)}
                      className="medicine-delete-btn"
                      title="Delete medicine"
                      aria-label="Delete medicine"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <h3 className="medicine-name">{med.name}</h3>
                  {med.notes && <p className="medicine-notes">{med.notes}</p>}

                  <div className="medicine-dates-row">
                    <Calendar size={13} color="var(--color-text-muted)" />
                    <span>
                      {startFormatted} &ndash; {endFormatted}
                    </span>
                  </div>
                </div>

                {/* Dose schedule items */}
                <div className="medicine-doses-section">
                  <div className="medicine-doses-header-row">
                    <span className="medicine-doses-header">Scheduled Dose Times</span>
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Today ({todayDayName.slice(0, 3).toUpperCase()})
                    </span>
                  </div>

                  {!isScheduledToday && (
                    <div className="medicine-off-day-notice">
                      <Info size={14} />
                      <span>Not scheduled for today ({daysLabel})</span>
                    </div>
                  )}

                  {!hasSchedule ? (
                    <div className="medicine-empty-schedule-box">
                      No active schedule configured
                    </div>
                  ) : (
                    med.times.map((time) => {
                      const doseKey = `${med._id}-${time}`;
                      const isActing = actionDoseKey === doseKey;
                      const logStatus = todayLogs[time] || null;

                      return (
                        <div key={time} className="dose-time-row">
                          <div className="dose-time-label">
                            <Clock size={14} color="var(--color-primary-blue)" />
                            <span>{time}</span>
                            {logStatus && (
                              <span
                                className={`dose-status-pill ${
                                  logStatus === 'taken'
                                    ? 'status-taken'
                                    : 'status-skipped'
                                }`}
                              >
                                {logStatus === 'taken' && <CheckCircle2 size={11} />}
                                {logStatus}
                              </span>
                            )}
                          </div>

                          <div className="dose-action-buttons">
                            {logStatus ? (
                              <button
                                type="button"
                                onClick={() => handleUndoDose(med._id, time)}
                                disabled={isActing}
                                className="dose-btn-undo"
                                title="Undo dose log"
                              >
                                <RotateCcw size={12} />
                                <span>Undo</span>
                              </button>
                            ) : isScheduledToday ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleTakeDose(med._id, time)}
                                  disabled={isActing}
                                  className="dose-btn-take"
                                  title="Log dose as taken"
                                >
                                  Take
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSkipDose(med._id, time)}
                                  disabled={isActing}
                                  className="dose-btn-skip"
                                  title="Log dose as skipped"
                                >
                                  Skip
                                </button>
                              </>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                                Off schedule
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
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
              <h3>Add Medication Profile</h3>
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

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="med-name">Medicine Name *</label>
                    <input
                      id="med-name"
                      type="text"
                      required
                      placeholder="e.g., Lisinopril"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="med-dosage">Dosage *</label>
                    <input
                      id="med-dosage"
                      type="text"
                      required
                      placeholder="e.g., 10mg once daily"
                      value={dosage}
                      onChange={(e) => setDosage(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Schedule Frequency *</label>
                  <div className="schedule-type-toggle">
                    <button
                      type="button"
                      className={`schedule-type-btn ${scheduleType === 'daily' ? 'active' : ''}`}
                      onClick={() => setScheduleType('daily')}
                    >
                      Daily
                    </button>
                    <button
                      type="button"
                      className={`schedule-type-btn ${scheduleType === 'specific-days' ? 'active' : ''}`}
                      onClick={() => setScheduleType('specific-days')}
                    >
                      Specific Weekdays
                    </button>
                  </div>

                  {scheduleType === 'specific-days' && (
                    <div className="weekdays-selector-grid">
                      {ALL_WEEKDAYS.map((day) => (
                        <button
                          key={day}
                          type="button"
                          onClick={() => handleToggleWeekday(day)}
                          className={`weekday-btn ${daysOfWeek.includes(day) ? 'selected' : ''}`}
                        >
                          {day.slice(0, 3)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Scheduled Dose Times (24h) *</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      style={{ maxWidth: '140px' }}
                    />
                    <button
                      type="button"
                      onClick={handleAddTime}
                      className="btn-secondary"
                      style={{ padding: '6px 13px', fontSize: '13px' }}
                    >
                      Add Time
                    </button>
                  </div>

                  <div className="time-tags-container">
                    {times.map((t) => (
                      <span key={t} className="time-tag-item">
                        <span>{t}</span>
                        <X
                          size={14}
                          className="time-tag-remove-btn"
                          onClick={() => handleRemoveTime(t)}
                        />
                      </span>
                    ))}
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="med-start-date">Start Date *</label>
                    <input
                      id="med-start-date"
                      type="date"
                      required
                      min={getLocalDateString()}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="med-end-date">End Date *</label>
                    <input
                      id="med-end-date"
                      type="date"
                      required
                      min={startDate}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="med-notes">Physician Instructions / Notes</label>
                  <textarea
                    id="med-notes"
                    rows="2"
                    placeholder="e.g., Take with morning meal and full glass of water."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? 'Creating...' : 'Save Medication'}
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
        type="danger"
        confirmText="Delete Medication"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Medicine;
