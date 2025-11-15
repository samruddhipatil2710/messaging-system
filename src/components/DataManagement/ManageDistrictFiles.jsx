import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { 
  getAllDistrictFiles, 
  deleteDistrictFile, 
  getStorageStats,
  MAHARASHTRA_DISTRICTS 
} from '../../firebase/storage';
import { createActivityLog } from '../../firebase/firestore';
import ConfirmModal from '../Common/ConfirmModal';
import './DataManagement.css';

const ManageDistrictFiles = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterMonth, setFilterMonth] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);

  useEffect(() => {
    loadFiles();
    loadStats();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [files, filterDistrict, filterMonth, searchTerm]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await getAllDistrictFiles();
      if (result.success) {
        setFiles(result.data);
        setFilteredFiles(result.data);
      } else {
        console.error('Failed to load files:', result.error);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const result = await getStorageStats();
      if (result.success) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];

    // Filter by district
    if (filterDistrict !== 'all') {
      filtered = filtered.filter(file => file.district === filterDistrict);
    }

    // Filter by month
    if (filterMonth !== 'all') {
      filtered = filtered.filter(file => file.month === filterMonth);
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(file =>
        file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
        file.month.includes(searchTerm)
      );
    }

    setFilteredFiles(filtered);
  };

  const handleDelete = (file) => {
    setFileToDelete(file);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;

    try {
      const result = await deleteDistrictFile(fileToDelete.id);
      
      if (result.success) {
        // Log activity
        await createActivityLog({
          action: 'data_deleted',
          performedBy: user.email,
          details: `Deleted data file: ${fileToDelete.district} - ${fileToDelete.month}`
        });

        // Reload files
        await loadFiles();
        await loadStats();
        
        console.log('✅ File deleted successfully');
      } else {
        alert('Error deleting file: ' + result.error);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Failed to delete file: ' + error.message);
    }
  };

  const handleDownload = (file) => {
    window.open(file.downloadURL, '_blank');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get unique months from files
  const uniqueMonths = [...new Set(files.map(file => file.month))].sort().reverse();

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📁 Manage District Files</h1>
        <p className="page-subtitle">View and manage uploaded district data files</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e3f2fd', color: '#2196f3' }}>
              <i className="fa-solid fa-file-excel"></i>
            </div>
            <div className="stat-value">{stats.totalFiles}</div>
            <div className="stat-label">Total Files</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#f3e5f5', color: '#9c27b0' }}>
              <i className="fa-solid fa-database"></i>
            </div>
            <div className="stat-value">{stats.totalSizeFormatted}</div>
            <div className="stat-label">Total Storage</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
              <i className="fa-solid fa-map-location-dot"></i>
            </div>
            <div className="stat-value">{Object.keys(stats.byDistrict).length}</div>
            <div className="stat-label">Districts Covered</div>
          </div>

          <div className="stat-card">
            <div className="stat-icon" style={{ background: '#fff3e0', color: '#ff9800' }}>
              <i className="fa-solid fa-calendar"></i>
            </div>
            <div className="stat-value">{Object.keys(stats.byMonth).length}</div>
            <div className="stat-label">Months Available</div>
          </div>
        </div>
      )}

      <div className="content-card">
        {/* Filters */}
        <div className="filter-section">
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Filter by District</label>
            <select
              className="form-select"
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
            >
              <option value="all">All Districts</option>
              {MAHARASHTRA_DISTRICTS.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Month</label>
            <select
              className="form-select"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="all">All Months</option>
              {uniqueMonths.map((month) => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
          <strong>Showing {filteredFiles.length} of {files.length} files</strong>
        </div>

        {/* File List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#667eea' }}></i>
            <p style={{ marginTop: '15px', color: '#666' }}>Loading files...</p>
          </div>
        ) : filteredFiles.length > 0 ? (
          <div className="file-list">
            {filteredFiles.map((file) => (
              <div key={file.id} className="file-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flex: 1 }}>
                  <div style={{ 
                    width: '50px', 
                    height: '50px', 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontSize: '24px'
                  }}>
                    <i className="fa-solid fa-file-excel"></i>
                  </div>
                  
                  <div className="file-info">
                    <div className="file-name">{file.fileName}</div>
                    <div className="file-meta">
                      <span><i className="fa-solid fa-map-marker-alt"></i> {file.district}</span>
                      <span><i className="fa-solid fa-calendar"></i> {file.month}</span>
                      <span><i className="fa-solid fa-weight-hanging"></i> {file.fileSizeFormatted}</span>
                      <span><i className="fa-solid fa-user"></i> {file.uploadedBy}</span>
                      <span><i className="fa-solid fa-clock"></i> {formatDate(file.uploadedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="file-actions">
                  <button
                    className="btn-icon btn-download"
                    onClick={() => handleDownload(file)}
                    title="Download"
                  >
                    <i className="fa-solid fa-download"></i>
                  </button>
                  <button
                    className="btn-icon btn-delete"
                    onClick={() => handleDelete(file)}
                    title="Delete"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="fa-solid fa-folder-open" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '18px' }}>No files found</p>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Upload some files to get started</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setFileToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete File"
        message={`Are you sure you want to delete ${fileToDelete?.fileName}? This will also remove the file from storage. This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default ManageDistrictFiles;
