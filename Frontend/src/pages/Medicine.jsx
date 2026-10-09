import React, { useState, useEffect } from 'react';
import {
  Pill,
  Plus,
  Trash2,
  Check,
  X,
  RotateCcw,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
} from 'lucide-react';
import medicineService from '../services/medicineService.js';

const WEEKDAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
];

export const Medicine = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Create Modal
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [notes, setNotes] = useState('');
  const [timeInput, setTimeInput] = useState('08:00');
  const [times, setTimes] = useState(['08:00']);
  const [scheduleType, setScheduleType] = useState('daily');
  const [daysOfWeek, setDaysOfWeek] = useState(['monday', 'wednesday', 'friday']);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchMedicines = async () => {
    setLoading(true);
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
    if (timeInput && !times.includes(timeInput)) {
      setTimes([...times, timeInput].sort());
    }
  };

  const handleRemoveTime = (t) => {
    if (times.length > 1) {
      setTimes(times.filter((item) => item !== t));
    }
  };

  const toggleDay = (day) => {
    if (daysOfWeek.includes(day)) {
      if (daysOfWeek.length > 1) {
        setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
      }
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim() || !dosage.trim() || !startDate || !endDate) {
      setFormError('Name, dosage, start date, and end date are required.');
      return;
    }

    if (times.length === 0) {
      setFormError('At least one dose time is required.');
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
      fetchMedicines();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Failed to create medicine schedule.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTakeDose = async (medId, time) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await medicineService.takeDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      alert('Dose logged as taken!');
      fetchMedicines();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to log dose.');
    }
  };

  const handleSkipDose = async (medId, time) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await medicineService.skipDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      alert('Dose logged as skipped.');
      fetchMedicines();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to skip dose.');
    }
  };

  const handleUndoDose = async (medId, time) => {
    const today = new Date().toISOString().split('T')[0];
    try {
      await medicineService.undoDose(medId, {
        scheduledDate: today,
        scheduledTime: time,
      });
      alert('Dose action undone.');
      fetchMedicines();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to undo dose action.');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this medication profile?')) return;
    try {
      await medicineService.deleteMedicine(id);
      fetchMedicines();
    } catch (err) {
      alert(err.friendlyMessage || 'Failed to delete medicine.');
    }
  };

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Pill className="w-6 h-6 text-emerald-600" />
            Medicine Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track prescriptions, versioned schedules, and log daily dosage compliance.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Prescription</span>
        </button>
      </div>

      {/* Medicines List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2].map((i) => (
            <div key={i} className="h-52 bg-white rounded-2xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : medicines.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Pill className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-700">No active medications registered</h3>
          <p className="text-sm text-slate-400 mt-1 max-w-sm mx-auto">
            Add your daily or weekly medicine prescriptions to track adherence rates and dose logs.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {medicines.map((med) => {
            const startFormatted = new Date(med.startDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            });
            const endFormatted = new Date(med.endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });

            return (
              <div
                key={med._id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Dosage: {med.dosage}
                    </span>
                    <button
                      onClick={() => handleDelete(med._id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded-lg transition-colors cursor-pointer"
                      title="Delete prescription"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <h3 className="text-lg font-bold text-slate-900 leading-snug">{med.name}</h3>

                  {med.notes && (
                    <p className="text-xs text-slate-500 mt-1 flex items-start gap-1">
                      <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span>{med.notes}</span>
                    </p>
                  )}

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {startFormatted} – {endFormatted}
                    </span>
                  </div>
                </div>

                {/* Dose Logging Quick Actions for today */}
                <div className="mt-5 pt-4 border-t border-slate-100">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2.5">
                    Today's Dose Check ({todayStr})
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleTakeDose(med._id, '08:00')}
                      className="flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Take Dose</span>
                    </button>

                    <button
                      onClick={() => handleSkipDose(med._id, '08:00')}
                      className="flex items-center gap-1.5 py-1.5 px-3 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Skip Dose</span>
                    </button>

                    <button
                      onClick={() => handleUndoDose(med._id, '08:00')}
                      className="flex items-center gap-1.5 py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-all cursor-pointer"
                      title="Undo dose action"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Undo</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Add Medication Schedule</h3>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Medicine Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Amoxicillin"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Dosage *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., 500mg or 1 Tablet"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Time slots */}
              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Scheduled Dose Times *
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="time"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTime}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    + Add Time
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {times.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200"
                    >
                      <Clock className="w-3 h-3" />
                      {t}
                      {times.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveTime(t)}
                          className="hover:text-red-600 ml-1 cursor-pointer"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              {/* Schedule Type */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Frequency
                  </label>
                  <select
                    value={scheduleType}
                    onChange={(e) => setScheduleType(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="specific-days">Specific Days</option>
                  </select>
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

              {scheduleType === 'specific-days' && (
                <div>
                  <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                    Select Weekdays
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((d) => (
                      <button
                        type="button"
                        key={d}
                        onClick={() => toggleDay(d)}
                        className={`px-2.5 py-1 text-xs rounded-lg font-medium capitalize cursor-pointer transition-colors ${
                          daysOfWeek.includes(d)
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {d.slice(0, 3)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  End Date *
                </label>
                <input
                  type="date"
                  required
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                  Instructions / Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g., Take after meals with plenty of water"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  {submitting ? 'Saving...' : 'Add Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Medicine;
