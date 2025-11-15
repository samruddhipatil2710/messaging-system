import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { showAlert, showConfirm } from '../../utils/alertUtils.jsx';
import '../Dashboard/DashBoard.css';

// Pagination constants
const ITEMS_PER_PAGE = 20;

const MessageHistory = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [filteredMessages, setFilteredMessages] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedMessages, setPaginatedMessages] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { getAllMessages, getMessagesBySender } = await import('../../firebase/firestore');
        const { getUsersByCreator } = await import('../../firebase/firestore');
        
        let userMessages = [];
        
        if (user.role === 'user') {
          // Regular users see only their own messages
          const result = await getMessagesBySender(user.email);
          if (result.success) {
            userMessages = result.data;
          }
        } else if (user.role === 'admin' || user.role === 'super_admin') {
          // Admins and super admins see their messages and their subordinates' messages
          const allMessagesResult = await getAllMessages();
          const myUsersResult = await getUsersByCreator(user.email);
          
          if (allMessagesResult.success) {
            const allMessages = allMessagesResult.data;
            const myUserEmails = myUsersResult.success 
              ? myUsersResult.data.map(u => u.email) 
              : [];
            
            userMessages = allMessages.filter(m => 
              m.sentBy === user.email || myUserEmails.includes(m.sentBy)
            );
          }
        } else if (user.role === 'main_admin') {
          // Main admin sees all messages
          const result = await getAllMessages();
          if (result.success) {
            userMessages = result.data;
          }
        }
        
        setMessages(userMessages);
        setFilteredMessages(userMessages);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    
    if (user) {
      fetchMessages();
    }
  }, [user]);

  useEffect(() => {
    let filtered = [...messages];

    if (filterType !== 'all') {
      filtered = filtered.filter(m => m.type === filterType);
    }

    if (searchTerm) {
      filtered = filtered.filter(m => 
        (m.area?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (m.sentBy?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (m.message?.toLowerCase() || '').includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(m => {
        const msgDate = new Date(m.timestamp);
        if (dateFilter === 'today') {
          return msgDate.toDateString() === now.toDateString();
        } else if (dateFilter === 'week') {
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return msgDate >= weekAgo;
        } else if (dateFilter === 'month') {
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return msgDate >= monthAgo;
        }
        return true;
      });
    }

    setFilteredMessages(filtered);
    // Reset to first page when filters change
    setCurrentPage(1);
  }, [messages, filterType, searchTerm, dateFilter]);
  
  // Handle pagination
  useEffect(() => {
    // Calculate total pages
    const total = Math.ceil(filteredMessages.length / ITEMS_PER_PAGE);
    setTotalPages(total || 1); // Ensure at least 1 page even when empty
    
    // Get current page items
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = filteredMessages.slice(startIndex, endIndex);
    setPaginatedMessages(paginatedItems);
  }, [filteredMessages, currentPage]);

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

  const exportToCSV = () => {
    if (filteredMessages.length === 0) {
      showAlert('No messages to export!', 'warning');
      return;
    }

    const headers = ['Date', 'Sent By', 'Type', 'Area', 'Recipients', 'Message'];
    const csvData = filteredMessages.map(m => [
      formatDate(m.timestamp),
      m.sentBy,
      m.type.toUpperCase(),
      m.area,
      m.recipientCount,
      `"${m.message.replace(/"/g, '""')}"`
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `message-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination navigation functions
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const clearHistory = async () => {
    const confirmMessage = user.role === 'main_admin' 
      ? 'Are you sure you want to clear all message history from the system? This cannot be undone.'
      : 'Are you sure you want to clear your message history? This cannot be undone.';
    
    const confirmed = await showConfirm(confirmMessage);
    if (confirmed) {
      try {
        // Show loading message
        showAlert('Clearing message history...', 'info');
        
        let result;
        
        if (user.role === 'main_admin') {
          // Main admin clears all messages
          const { clearAllMessages } = await import('../../firebase/firestore');
          result = await clearAllMessages();
        } else {
          // Other users clear only their own messages
          const { clearMessagesBySender } = await import('../../firebase/firestore');
          result = await clearMessagesBySender(user.email);
        }
        
        if (result.success) {
          console.log(`✅ Cleared ${result.count} messages`);
          
          // If main admin, clear all messages from state
          if (user.role === 'main_admin') {
            setMessages([]);
            setFilteredMessages([]);
          } else {
            // For other users, remove only their messages from state
            const remainingMessages = messages.filter(m => m.sentBy !== user.email);
            setMessages(remainingMessages);
            setFilteredMessages(remainingMessages);
          }
          
          showAlert(`Message history cleared successfully. Deleted ${result.count} messages.`, 'success');
        } else {
          showAlert(`Failed to clear message history: ${result.error}`, 'error');
        }
      } catch (error) {
        console.error('Error clearing message history:', error);
        showAlert(`Error clearing message history: ${error.message}`, 'error');
      }
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Message History</h1>
        <p className="page-subtitle">View all sent messages and export records</p>
      </div>

      <div className="content-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by area or sender..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Message Type</label>
            <select className="form-select" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="all">All Types</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="text">SMS</option>
              <option value="voice">Voice</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Date Range</label>
            <select className="form-select" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">Last 30 Days</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={exportToCSV} style={{ flex: 1 }}>
              <i className="fa-solid fa-download"></i> Export CSV
            </button>
            {messages.length > 0 && (
              <button className="btn btn-danger" onClick={clearHistory} style={{ flex: 1, background: '#f44336' }}>
                <i className="fa-solid fa-trash-can"></i> Clear
              </button>
            )}
          </div>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Total Messages: {filteredMessages.length}</strong>
            {filteredMessages.length > 0 && (
              <span style={{ marginLeft: '20px' }}>
                Recipients: {filteredMessages.reduce((sum, m) => sum + m.recipientCount, 0).toLocaleString()}
              </span>
            )}
          </div>
          <div>
            {totalPages > 1 && (
              <span>Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredMessages.length)} of {filteredMessages.length}</span>
            )}
          </div>
        </div>

        {filteredMessages.length > 0 ? (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Date & Time</th>
                  <th>Sent By</th>
                  <th>Type</th>
                  <th>Area</th>
                  <th>Recipients</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {paginatedMessages.map((msg, index) => (
                  <tr key={msg.id || index}>
                    <td>{((currentPage - 1) * ITEMS_PER_PAGE) + index + 1}</td>
                    <td>{formatDate(msg.timestamp)}</td>
                    <td>{msg.sentBy || 'N/A'}</td>
                    <td>
                      {msg.type === 'whatsapp' ? <i className="fa-brands fa-whatsapp"></i> : msg.type === 'text' ? <i className="fa-solid fa-message"></i> : <i className="fa-solid fa-phone-volume"></i>}
                      {' '}{msg.type?.toUpperCase() || 'N/A'}
                    </td>
                    <td>{msg.area || 'N/A'}</td>
                    <td>{msg.recipientCount || 0}</td>
                    <td>{msg.message || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={goToPreviousPage} 
                  disabled={currentPage === 1}
                  className="pagination-btn"
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#f5f5f5' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#aaa' : '#333'
                  }}
                >
                  <i className="fa-solid fa-chevron-left"></i> Previous
                </button>
                
                <div style={{ display: 'flex', gap: '5px' }}>
                  {/* First page */}
                  {currentPage > 2 && (
                    <button 
                      onClick={() => goToPage(1)} 
                      className="pagination-btn"
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      1
                    </button>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage > 3 && (
                    <span style={{ alignSelf: 'center' }}>...</span>
                  )}
                  
                  {/* Page before current */}
                  {currentPage > 1 && (
                    <button 
                      onClick={() => goToPage(currentPage - 1)} 
                      className="pagination-btn"
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {currentPage - 1}
                    </button>
                  )}
                  
                  {/* Current page */}
                  <button 
                    className="pagination-btn"
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #2196f3',
                      borderRadius: '4px',
                      background: '#2196f3',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {currentPage}
                  </button>
                  
                  {/* Page after current */}
                  {currentPage < totalPages && (
                    <button 
                      onClick={() => goToPage(currentPage + 1)} 
                      className="pagination-btn"
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {currentPage + 1}
                    </button>
                  )}
                  
                  {/* Ellipsis if needed */}
                  {currentPage < totalPages - 2 && (
                    <span style={{ alignSelf: 'center' }}>...</span>
                  )}
                  
                  {/* Last page */}
                  {currentPage < totalPages - 1 && (
                    <button 
                      onClick={() => goToPage(totalPages)} 
                      className="pagination-btn"
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={goToNextPage} 
                  disabled={currentPage === totalPages}
                  className="pagination-btn"
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === totalPages ? '#f5f5f5' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#aaa' : '#333'
                  }}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <p style={{ fontSize: '18px' }}><i className="fa-solid fa-inbox" style={{fontSize: '48px', opacity: 0.3}}></i></p>
            <p>No messages found</p>
            <p>Send some messages to see them here!</p>
          </div>
        )}
      </div>
    </>
  );
};

export default MessageHistory;