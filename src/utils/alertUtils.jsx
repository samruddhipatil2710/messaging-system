import React from 'react';
import { createRoot } from 'react-dom/client';
import AlertModal from '../components/Common/AlertModal';

// Create a container for the alert if it doesn't exist
const getAlertContainer = () => {
  let container = document.getElementById('alert-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'alert-container';
    document.body.appendChild(container);
  }
  return container;
};

// Root instances map to track and manage React roots
const rootInstances = new Map();

// Show a custom alert
export const showAlert = (message, type = 'info') => {
  return new Promise((resolve) => {
    const container = getAlertContainer();
    
    // Create or reuse root
    let root;
    if (rootInstances.has(container)) {
      root = rootInstances.get(container);
    } else {
      root = createRoot(container);
      rootInstances.set(container, root);
    }
    
    const handleClose = () => {
      // Unmount by rendering null
      root.render(null);
      resolve();
    };
    
    // Render the alert
    root.render(
      <AlertModal 
        isOpen={true} 
        message={message} 
        type={type} 
        onClose={handleClose} 
      />
    );
  });
};

// Confirmation dialog with OK and Cancel buttons
export const showConfirm = (message) => {
  return new Promise((resolve) => {
    const container = getAlertContainer();
    
    // Create or reuse root
    let root;
    if (rootInstances.has(container)) {
      root = rootInstances.get(container);
    } else {
      root = createRoot(container);
      rootInstances.set(container, root);
    }
    
    const handleConfirm = () => {
      root.render(null);
      resolve(true);
    };
    
    const handleCancel = () => {
      root.render(null);
      resolve(false);
    };
    
    // Render the confirmation dialog
    root.render(
      <AlertModal 
        isOpen={true} 
        message={message} 
        type="warning" 
        onClose={handleCancel}
        onConfirm={handleConfirm}
        showCancelButton={true}
      />
    );
  });
};
