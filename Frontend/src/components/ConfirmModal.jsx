import { useEffect } from 'react';
import { AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import './ConfirmModal.css';

export const ConfirmModal = ({
  isOpen,
  title = 'Confirmation',
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'danger', // 'danger' | 'warning' | 'primary'
  onConfirm,
  onCancel,
  loading = false,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onCancel();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  const renderIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <div className="confirm-modal-icon icon-danger">
            <AlertCircle size={22} />
          </div>
        );
      case 'warning':
        return (
          <div className="confirm-modal-icon icon-warning">
            <AlertTriangle size={22} />
          </div>
        );
      default:
        return (
          <div className="confirm-modal-icon icon-primary">
            <HelpCircle size={22} />
          </div>
        );
    }
  };

  const getConfirmButtonClass = () => {
    if (type === 'danger') return 'btn-danger';
    return 'btn-primary';
  };

  return (
    <div
      className="confirm-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      onClick={() => {
        if (!loading) onCancel();
      }}
    >
      <div
        className="confirm-modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="confirm-modal-header">
          {renderIcon()}
          <h3 id="confirm-modal-title" className="confirm-modal-title">
            {title}
          </h3>
        </div>
        <div className="confirm-modal-body">
          <p>{message}</p>
        </div>
        <div className="confirm-modal-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className={getConfirmButtonClass()}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Processing...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
