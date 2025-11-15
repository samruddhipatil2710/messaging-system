import React from 'react';
import './AlertModal.css';

const AlertModal = ({ isOpen, message, onClose, onConfirm, type = 'info', showCancelButton = false }) => {
  if (!isOpen) return null;

  return (
    <div className="custom-alert-overlay" onClick={onClose}>
      <div className="custom-alert-container" onClick={(e) => e.stopPropagation()}>
        <div className={`custom-alert-header ${type}`}>
          {type === 'success' && <i className="fa-solid fa-circle-check"></i>}
          {type === 'error' && <i className="fa-solid fa-circle-exclamation"></i>}
          {type === 'warning' && <i className="fa-solid fa-triangle-exclamation"></i>}
          {type === 'info' && <i className="fa-solid fa-circle-info"></i>}
          <span className="custom-alert-title">
            {type === 'success' ? 'Success' : 
             type === 'error' ? 'Error' : 
             type === 'warning' ? 'Warning' : 'Information'}
          </span>
        </div>
        <div className="custom-alert-body">
          <p>{message}</p>
        </div>
        <div className="custom-alert-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          {showCancelButton && (
            <button 
              className="custom-alert-button" 
              style={{ background: '#f3f4f6', color: '#374151' }}
              onClick={onClose}
            >
              Cancel
            </button>
          )}
          <button 
            className="custom-alert-button" 
            onClick={onConfirm || onClose}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
