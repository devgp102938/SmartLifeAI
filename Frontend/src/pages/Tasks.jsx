import { useState, useEffect } from 'react';
import {
  CheckSquare,
  Plus,
  Trash2,
  CheckCircle,
  Circle,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  X,
} from 'lucide-react';
import taskService from '../services/taskService.js';
import { useToast } from '../context/ToastContext.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import './Tasks.css';

export const Tasks = () => {
  const { showSuccess, showError } = useToast();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form modal state
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Confirmation modal state
  const [confirmConfig, setConfirmConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Filter state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, completed
  const [priorityFilter, setPriorityFilter] = useState('all');

  const fetchTasks = async () => {
    setError(null);
    try {
      const data = await taskService.getTasks();
      setTasks(data || []);
    } catch (err) {
      setError(err.friendlyMessage || 'Failed to fetch tasks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!title.trim() || !dueDate) {
      setFormError('Title and due date are required.');
      return;
    }

    try {
      setSubmitting(true);
      await taskService.createTask({
        title: title.trim(),
        dueDate,
        description: description.trim(),
        priority,
      });
      setShowModal(false);
      setTitle('');
      setDueDate('');
      setDescription('');
      setPriority('medium');
      showSuccess('Task created successfully.');
      fetchTasks();
    } catch (err) {
      setFormError(err.friendlyMessage || 'Failed to set task.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleComplete = async (task) => {
    try {
      if (task.status === 'completed') {
        await taskService.uncompleteTask(task._id);
        showSuccess('Task marked as pending.');
      } else {
        await taskService.completeTask(task._id);
        showSuccess('Task marked as completed!');
      }
      fetchTasks();
    } catch (err) {
      showError(err.friendlyMessage || 'Failed to update task status.');
    }
  };

  const handleDeletePrompt = (task) => {
    setConfirmConfig({
      isOpen: true,
      title: 'Delete Task',
      message: `Are you sure you want to delete "${task.title}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmConfig((prev) => ({ ...prev, isOpen: false }));
        try {
          await taskService.deleteTask(task._id);
          showSuccess('Task deleted successfully.');
          fetchTasks();
        } catch (err) {
          showError(err.friendlyMessage || 'Failed to delete task.');
        }
      },
    });
  };

  // Filter logic
  const filteredTasks = tasks.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const todayStr = new Date().toISOString().split('T')[0];

  return (
    <div className="tasks-container">
      {/* Header */}
      <div className="tasks-header">
        <div className="tasks-title-group">
          <h1>
            <CheckSquare size={26} color="var(--color-primary-blue)" />
            Task Management
          </h1>
          <p>
            Organize, prioritize, and track completion of your actionable commitments.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="btn-primary"
        >
          <Plus size={18} />
          <span>New Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="tasks-filter-bar">
        <div className="tasks-search-wrapper">
          <Search size={16} className="tasks-search-icon" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="tasks-search-input"
          />
        </div>

        <div className="tasks-filter-group">
          <div className="filter-select-wrapper">
            <Filter size={14} color="var(--color-text-muted)" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="filter-select"
              aria-label="Filter by status"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className="filter-select-wrapper">
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="filter-select"
              aria-label="Filter by priority"
            >
              <option value="all">All Priorities</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="form-error-alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Tasks List */}
      {loading ? (
        <div className="tasks-list">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card" style={{ height: '72px' }} />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="tasks-empty-state">
          <CheckSquare size={44} className="tasks-empty-icon" />
          <h3 className="tasks-empty-title">No tasks found</h3>
          <p className="tasks-empty-desc">
            {tasks.length === 0
              ? 'Get started by creating your first task above.'
              : 'Try clearing your filters or search query.'}
          </p>
        </div>
      ) : (
        <div className="tasks-list">
          {filteredTasks.map((task) => {
            const isCompleted = task.status === 'completed';
            const isOverdue =
              !isCompleted && task.dueDate && new Date(task.dueDate) < new Date(todayStr);

            const priorityClass = {
              high: 'priority-high',
              medium: 'priority-medium',
              low: 'priority-low',
            }[task.priority || 'medium'];

            const formattedDueDate = task.dueDate
              ? new Date(task.dueDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : null;

            return (
              <div
                key={task._id}
                className={`task-item-card ${isCompleted ? 'is-completed' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleComplete(task)}
                  className={`task-checkbox-btn ${isCompleted ? 'checked' : ''}`}
                  aria-label={isCompleted ? 'Mark incomplete' : 'Mark completed'}
                >
                  {isCompleted ? <CheckCircle size={22} /> : <Circle size={22} />}
                </button>

                <div className="task-content">
                  <div className="task-title-row">
                    <span className="task-title">{task.title}</span>
                    <span className={`priority-badge ${priorityClass}`}>
                      {task.priority || 'Medium'}
                    </span>
                  </div>

                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}

                  <div className="task-meta-row">
                    {formattedDueDate && (
                      <span className={`task-due-info ${isOverdue ? 'is-overdue' : ''}`}>
                        <Calendar size={13} />
                        <span>Due {formattedDueDate}</span>
                        {isOverdue && <span> (Overdue)</span>}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeletePrompt(task)}
                  className="task-delete-btn"
                  title="Delete task"
                  aria-label="Delete task"
                >
                  <Trash2 size={16} />
                </button>
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
              <h3>Create New Task</h3>
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
                  <label htmlFor="task-title">Task Title *</label>
                  <input
                    id="task-title"
                    type="text"
                    required
                    placeholder="e.g., Review laboratory bloodwork results"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="task-due-date">Due Date *</label>
                    <input
                      id="task-due-date"
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>
                    <select
                      id="task-priority"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value)}
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="task-description">Description</label>
                  <textarea
                    id="task-description"
                    rows="3"
                    placeholder="Additional context, action steps or notes"
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
                  {submitting ? 'Creating...' : 'Create Task'}
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
        confirmText="Delete Task"
        onConfirm={confirmConfig.onConfirm}
        onCancel={() => setConfirmConfig((prev) => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

export default Tasks;
