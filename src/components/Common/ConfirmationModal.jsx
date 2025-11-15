import React from 'react';
import '../Common/AlertModal.css';

const ConfirmationModal = ({ isOpen, onClose, onConfirm, message, confirmText = 'OK', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div className="custom-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className="custom-alert-header warning">
          <i className="fa-solid fa-triangle-exclamation"></i>
          <span className="custom-alert-title">Confirmation</span>
        </div>
        <div className="custom-alert-body">
          <p>{message}</p>
        </div>
        <div className="custom-alert-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button 
            className="custom-alert-button" 
            style={{ background: '#f3f4f6', color: '#374151' }}
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className="custom-alert-button"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
