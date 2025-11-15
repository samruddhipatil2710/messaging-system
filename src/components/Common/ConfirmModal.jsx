import React from 'react';
import './ConfirmModal.css';

const ConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action",
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger" // danger, warning, info
}) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header modal-header-${type}`}>
          <div className="modal-icon">
            {type === 'danger' && <i className="fa-solid fa-triangle-exclamation"></i>}
            {type === 'warning' && <i className="fa-solid fa-exclamation-circle"></i>}
            {type === 'info' && <i className="fa-solid fa-info-circle"></i>}
          </div>
          <h2 className="modal-title">{title}</h2>
        </div>
        
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        
        <div className="modal-footer">
          <button 
            className="modal-btn modal-btn-cancel" 
            onClick={onClose}
          >
            <i className="fa-solid fa-times"></i> {cancelText}
          </button>
          <button 
            className={`modal-btn modal-btn-confirm modal-btn-${type}`}
            onClick={handleConfirm}
          >
            <i className="fa-solid fa-check"></i> {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
