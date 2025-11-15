import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import './DashBoard.css';
import ConfirmationModal from '../Common/ConfirmationModal'; // Make sure this component exists

const ActivityLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState('');

  useEffect(() => {
    const loadActivityLogs = async () => {
      try {
        const { getAllActivityLogs, getActivityLogsByUser } = await import('../../firebase/firestore');
        
        let result;
        if (user.role === 'main_admin') {
          // Main admin sees all logs
          result = await getAllActivityLogs();
        } else {
          // Other users see only their own logs
          result = await getActivityLogsByUser(user.email);
        }
        
        if (result.success) {
          console.log('✅ Loaded activity logs:', result.data.length);
          setLogs(result.data); // Already sorted by timestamp desc
          setFilteredLogs(result.data);
        } else {
          console.error('Failed to load activity logs:', result.error);
        }
      } catch (error) {
        console.error('Error loading activity logs:', error);
      }
    };
    
    if (user) {
      loadActivityLogs();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...logs];

    if (filterType !== 'all') {
      filtered = filtered.filter(log => log.action === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.performedBy.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filterType, searchTerm]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActionIcon = (action) => {
    switch(action) {
      case 'user_created': return <i className="fa-solid fa-user-plus" style={{color: '#4CAF50'}}></i>;
      case 'data_allocated': return <i className="fa-solid fa-database" style={{color: '#2196F3'}}></i>;
      case 'message_sent': return <i className="fa-solid fa-paper-plane" style={{color: '#9C27B0'}}></i>;
      case 'user_deleted': return <i className="fa-solid fa-trash-can" style={{color: '#f44336'}}></i>;
      case 'user_updated': return <i className="fa-solid fa-pen-to-square" style={{color: '#FF9800'}}></i>;
      case 'profile_updated': return <i className="fa-solid fa-user-pen" style={{color: '#3b82f6'}}></i>;
      case 'password_changed': return <i className="fa-solid fa-key" style={{color: '#8b5cf6'}}></i>;
      default: return <i className="fa-solid fa-circle-dot" style={{color: '#666'}}></i>;
    }
  };

  const getActionColor = (action) => {
    switch(action) {
      case 'user_created': return '#4CAF50';
      case 'data_allocated': return '#2196F3';
      case 'message_sent': return '#9C27B0';
      case 'user_deleted': return '#f44336';
      case 'user_updated': return '#FF9800';
      case 'profile_updated': return '#3b82f6';
      case 'password_changed': return '#8b5cf6';
      default: return '#666';
    }
  };

  const handleClearLogs = async () => {
    if (!user) return;
    
    setIsClearing(true);
    setClearError('');
    
    try {
      let result;
      
      if (user.role === 'main_admin') {
        // Main admin clears all logs
        const { clearAllActivityLogs } = await import('../../firebase/firestore');
        result = await clearAllActivityLogs();
      } else {
        // Other users clear only their own logs
        const { clearActivityLogsByUser } = await import('../../firebase/firestore');
        result = await clearActivityLogsByUser(user.email);
      }
      
      if (result.success) {
        console.log(`✅ Cleared ${result.count} logs`);
        
        // If main admin, clear all logs from state
        if (user.role === 'main_admin') {
          setLogs([]);
          setFilteredLogs([]);
        } else {
          // For other users, remove only their logs from state
          const remainingLogs = logs.filter(log => log.performedBy !== user.email);
          setLogs(remainingLogs);
          setFilteredLogs(remainingLogs);
        }
      } else {
        setClearError(result.error || 'Failed to clear logs');
      }
    } catch (error) {
      console.error('Error clearing logs:', error);
      setClearError(error.message || 'An error occurred while clearing logs');
    } finally {
      setIsClearing(false);
      setShowClearConfirm(false);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Activity Logs</h1>
          <p className="page-subtitle">
            {user?.role === 'main_admin' 
              ? 'Track all system activities and changes' 
              : 'Track your activities and changes'}
          </p>
        </div>
        {user && logs.length > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            style={{
              padding: '8px 16px',
              backgroundColor: '#EF4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              height: 'fit-content',
              fontWeight: '500',
              fontSize: '14px',
              transition: 'background-color 0.2s',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              ':hover:not(:disabled)': {
                backgroundColor: '#dc2626'
              },
              ':active:not(:disabled)': {
                backgroundColor: '#b91c1c',
                transform: 'translateY(1px)'
              },
              ':disabled': {
                opacity: 0.6,
                cursor: 'not-allowed'
              }
            }}
            disabled={isClearing}
          >
            <i className="fa-solid fa-trash" style={{ color: 'white' }}></i>
            {isClearing ? 'Clearing...' : 'Clear'}
          </button>
        )}
      </div>

      <ConfirmationModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirm={handleClearLogs}
        title={user?.role === 'main_admin' ? 'Clear All Activity Logs' : 'Clear Your Activity Logs'}
        message={
          user?.role === 'main_admin' 
            ? 'Are you sure you want to delete all activity logs from the system? This action cannot be undone.'
            : 'Are you sure you want to delete all your activity logs? This action cannot be undone.'
        }
        confirmText={isClearing ? 'Clearing...' : user?.role === 'main_admin' ? 'Yes, Clear All' : 'Yes, Clear My Logs'}
        cancelText="Cancel"
        isProcessing={isClearing}
      />

      {clearError && (
        <div className="error-message" style={{ color: '#dc3545', margin: '10px 0', textAlign: 'center' }}>
          {clearError}
        </div>
      )}

      <div className="content-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Action</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Actions</option>
              <option value="user_created">User Created</option>
              <option value="user_updated">User Updated</option>
              <option value="user_deleted">User Deleted</option>
              <option value="profile_updated">Profile Updated</option>
              <option value="password_changed">Password Changed</option>
              <option value="data_allocated">Data Allocated</option>
              <option value="message_sent">Message Sent</option>
            </select>
          </div>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
          <strong>Total Activities: {filteredLogs.length}</strong>
        </div>

        {filteredLogs.length > 0 ? (
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            {filteredLogs.map((log, index) => (
              <div 
                key={index} 
                style={{ 
                  padding: '15px', 
                  marginBottom: '10px', 
                  background: '#fff', 
                  border: '1px solid #e0e0e0',
                  borderLeft: `4px solid ${getActionColor(log.action)}`,
                  borderRadius: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '15px'
                }}
              >
                <div style={{ fontSize: '24px' }}>{getActionIcon(log.action)}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {log.details}
                  </div>
                  <div style={{ fontSize: '13px', color: '#666' }}>
                    By: {log.performedBy} • {formatDate(log.timestamp)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}>📋 No activity logs found</p>
          </div>
        )}
      </div>
    </>
  );
};

export default ActivityLogs;