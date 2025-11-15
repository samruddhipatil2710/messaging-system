import { useEffect } from 'react';
import './Toast.css';

const Toast = ({ message, type = 'success', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="fa-solid fa-circle-check"></i>;
      case 'error':
        return <i className="fa-solid fa-circle-xmark"></i>;
      case 'warning':
        return <i className="fa-solid fa-triangle-exclamation"></i>;
      case 'info':
        return <i className="fa-solid fa-circle-info"></i>;
      default:
        return <i className="fa-solid fa-circle-check"></i>;
    }
  };

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{getIcon()}</div>
      <div className="toast-message">{message}</div>
      <button className="toast-close" onClick={onClose}>
        <i className="fa-solid fa-xmark"></i>
      </button>
    </div>
  );
};

export default Toast;
