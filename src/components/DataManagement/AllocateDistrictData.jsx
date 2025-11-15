import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { getAllUsers } from '../../firebase/firestore';
import { 
  getFilesByDistrict, 
  MAHARASHTRA_DISTRICTS 
} from '../../firebase/storage';
import { 
  createDataAllocation, 
  getUserAllocations 
} from '../../firebase/dataAllocations';
import { createActivityLog } from '../../firebase/firestore';
import './DataManagement.css';

const AllocateDistrictData = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [district, setDistrict] = useState('');
  const [availableFiles, setAvailableFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingAllocations, setExistingAllocations] = useState([]);

  useEffect(() => {
    loadUsers();
  }, [user]);

  useEffect(() => {
    if (district) {
      loadDistrictFiles();
    } else {
      setAvailableFiles([]);
      setSelectedFiles([]);
    }
  }, [district]);

  useEffect(() => {
    if (selectedUser) {
      loadUserAllocations();
    }
  }, [selectedUser]);

  const loadUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result.success) {
        // Filter users based on current user's role
        let filteredUsers = result.data;
        
        if (user.role === 'super_admin') {
          // Super admin can allocate to admins and users they created
          filteredUsers = result.data.filter(u => 
            u.createdBy === user.email && (u.role === 'admin' || u.role === 'user')
          );
        } else if (user.role === 'admin') {
          // Admin can allocate to users they created
          filteredUsers = result.data.filter(u => 
            u.createdBy === user.email && u.role === 'user'
          );
        }
        
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDistrictFiles = async () => {
    try {
      const result = await getFilesByDistrict(district);
      if (result.success) {
        setAvailableFiles(result.data);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    }
  };

  const loadUserAllocations = async () => {
    try {
      const selectedUserData = users.find(u => u.id === selectedUser);
      if (selectedUserData) {
        const result = await getUserAllocations(selectedUserData.email);
        if (result.success) {
          setExistingAllocations(result.data);
        }
      }
    } catch (error) {
      console.error('Error loading allocations:', error);
    }
  };

  const handleFileToggle = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId);
      } else {
        return [...prev, fileId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedFiles.length === availableFiles.length) {
      setSelectedFiles([]);
    } else {
      setSelectedFiles(availableFiles.map(f => f.id));
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    
    if (!selectedUser || !district || selectedFiles.length === 0) {
      setMessage({ type: 'error', text: 'Please select user, district, and at least one file' });
      return;
    }
    
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const selectedUserData = users.find(u => u.id === selectedUser);
      
      const allocationData = {
        allocatedTo: selectedUserData.email,
        allocatedToName: selectedUserData.name,
        allocatedBy: user.email,
        district,
        fileIds: selectedFiles,
        startDate: startDate || null,
        endDate: endDate || null,
        status: 'active'
      };
      
      const result = await createDataAllocation(allocationData);
      
      if (result.success) {
        // Log activity
        await createActivityLog({
          action: 'data_allocated',
          performedBy: user.email,
          details: `Allocated ${selectedFiles.length} file(s) from ${district} to ${selectedUserData.name}`
        });
        
        setMessage({ 
          type: 'success', 
          text: `✅ Successfully allocated ${selectedFiles.length} file(s) to ${selectedUserData.name}` 
        });
        
        // Reset form
        setSelectedFiles([]);
        setStartDate('');
        setEndDate('');
        
        // Reload allocations
        loadUserAllocations();
      } else {
        setMessage({ type: 'error', text: `❌ Allocation failed: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📊 Allocate District Data</h1>
        <p className="page-subtitle">Allocate district data files to users</p>
      </div>

      <div className="content-card">
        <form onSubmit={handleAllocate} className="allocation-form">
          <div className="form-grid">
            {/* User Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-user"></i> Select User *
              </label>
              <select
                className="form-select"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Choose User</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email}) - {u.role}
                  </option>
                ))}
              </select>
            </div>

            {/* District Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-map-location-dot"></i> District *
              </label>
              <select
                className="form-select"
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                required
                disabled={loading}
              >
                <option value="">Select District</option>
                {MAHARASHTRA_DISTRICTS.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range (Optional) */}
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-calendar-days"></i> Access Start Date (Optional)
              </label>
              <input
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-calendar-days"></i> Access End Date (Optional)
              </label>
              <input
                type="date"
                className="form-input"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                disabled={loading}
              />
            </div>
          </div>

          {/* Available Files */}
          {district && availableFiles.length > 0 && (
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label className="form-label">
                  <i className="fa-solid fa-file-excel"></i> Select Files to Allocate *
                </label>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleSelectAll}
                  style={{ padding: '8px 16px', fontSize: '14px' }}
                >
                  {selectedFiles.length === availableFiles.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>
              
              <div className="checkbox-group">
                {availableFiles.map((file) => (
                  <div key={file.id} className="checkbox-item">
                    <input
                      type="checkbox"
                      id={`file-${file.id}`}
                      checked={selectedFiles.includes(file.id)}
                      onChange={() => handleFileToggle(file.id)}
                    />
                    <label htmlFor={`file-${file.id}`}>
                      <div style={{ fontWeight: '500' }}>{file.month}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {file.fileSizeFormatted}
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              
              <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                Selected: {selectedFiles.length} of {availableFiles.length} files
              </div>
            </div>
          )}

          {district && availableFiles.length === 0 && (
            <div className="alert alert-warning">
              ⚠️ No files available for {district}. Please upload files first.
            </div>
          )}

          {/* Message */}
          {message.text && (
            <div className={`alert alert-${message.type}`}>
              {message.text}
            </div>
          )}

          {/* Submit Button */}
          <div className="form-actions">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !selectedUser || !district || selectedFiles.length === 0}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Allocating...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-share-nodes"></i> Allocate Data
                </>
              )}
            </button>
          </div>
        </form>

        {/* Existing Allocations */}
        {selectedUser && existingAllocations.length > 0 && (
          <div style={{ marginTop: '40px' }}>
            <h3 style={{ marginBottom: '20px', color: '#667eea' }}>
              <i className="fa-solid fa-list"></i> Existing Allocations
            </h3>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {existingAllocations.map((alloc) => (
                <div key={alloc.id} style={{
                  padding: '15px',
                  background: '#f9f9f9',
                  borderRadius: '8px',
                  marginBottom: '10px',
                  border: '1px solid #e0e0e0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '5px' }}>
                        📍 {alloc.district}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666' }}>
                        Files: {alloc.fileIds?.length || 0} | 
                        Allocated: {formatDate(alloc.createdAt)} |
                        Status: <span style={{ 
                          color: alloc.status === 'active' ? '#4caf50' : '#f44336',
                          fontWeight: '600'
                        }}>{alloc.status}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AllocateDistrictData;
