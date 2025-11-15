import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { getUserAllocatedFilesWithDetails } from '../../firebase/dataAllocations';
import { MAHARASHTRA_DISTRICTS } from '../../firebase/storage';
import './DataManagement.css';

const MyAllocatedData = () => {
  const { user } = useAuth();
  const [files, setFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadAllocatedFiles();
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [files, filterDistrict, searchTerm]);

  const loadAllocatedFiles = async () => {
    setLoading(true);
    try {
      const result = await getUserAllocatedFilesWithDetails(user.email);
      if (result.success) {
        setFiles(result.data);
        setFilteredFiles(result.data);
        console.log('✅ Loaded allocated files:', result.data.length);
      } else {
        console.error('Failed to load files:', result.error);
      }
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...files];

    // Filter by district
    if (filterDistrict !== 'all') {
      filtered = filtered.filter(file => file.district === filterDistrict);
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

  const handleDownload = (file) => {
    // Open download URL in new tab
    window.open(file.downloadURL, '_blank');
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

  // Get unique districts from allocated files
  const allocatedDistricts = [...new Set(files.map(file => file.district))].sort();

  // Group files by district
  const filesByDistrict = filteredFiles.reduce((acc, file) => {
    if (!acc[file.district]) {
      acc[file.district] = [];
    }
    acc[file.district].push(file);
    return acc;
  }, {});

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📥 My Allocated Data</h1>
        <p className="page-subtitle">Download district data files allocated to you</p>
      </div>

      {/* Statistics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd', color: '#2196f3' }}>
            <i className="fa-solid fa-file-excel"></i>
          </div>
          <div className="stat-value">{files.length}</div>
          <div className="stat-label">Total Files</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9', color: '#4caf50' }}>
            <i className="fa-solid fa-map-location-dot"></i>
          </div>
          <div className="stat-value">{allocatedDistricts.length}</div>
          <div className="stat-label">Districts</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#f3e5f5', color: '#9c27b0' }}>
            <i className="fa-solid fa-database"></i>
          </div>
          <div className="stat-value">
            {(files.reduce((sum, f) => sum + (f.fileSize || 0), 0) / (1024 * 1024)).toFixed(2)} MB
          </div>
          <div className="stat-label">Total Size</div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0', color: '#ff9800' }}>
            <i className="fa-solid fa-download"></i>
          </div>
          <div className="stat-value">{filteredFiles.length}</div>
          <div className="stat-label">Available Now</div>
        </div>
      </div>

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
              {allocatedDistricts.map((dist) => (
                <option key={dist} value={dist}>{dist}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Count */}
        <div style={{ marginBottom: '20px', padding: '10px', background: '#f5f5f5', borderRadius: '5px' }}>
          <strong>Showing {filteredFiles.length} of {files.length} files</strong>
        </div>

        {/* File List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#667eea' }}></i>
            <p style={{ marginTop: '15px', color: '#666' }}>Loading your allocated files...</p>
          </div>
        ) : files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '18px' }}>No data allocated yet</p>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Contact your admin to get access to district data</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <i className="fa-solid fa-filter" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}></i>
            <p style={{ fontSize: '18px' }}>No files match your filters</p>
            <p style={{ marginTop: '10px', fontSize: '14px' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <div>
            {Object.entries(filesByDistrict).map(([district, districtFiles]) => (
              <div key={district} style={{ marginBottom: '30px' }}>
                <h3 style={{ 
                  marginBottom: '15px', 
                  color: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <i className="fa-solid fa-map-marker-alt"></i>
                  {district} ({districtFiles.length} files)
                </h3>
                
                <div className="file-list">
                  {districtFiles.map((file) => (
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
                            <span><i className="fa-solid fa-calendar"></i> {file.month}</span>
                            <span><i className="fa-solid fa-weight-hanging"></i> {file.fileSizeFormatted}</span>
                            <span><i className="fa-solid fa-user"></i> Allocated by: {file.allocatedBy}</span>
                            {file.startDate && (
                              <span><i className="fa-solid fa-clock"></i> Access: {formatDate(file.startDate)} - {formatDate(file.endDate)}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="file-actions">
                        <button
                          className="btn-icon btn-download"
                          onClick={() => handleDownload(file)}
                          title="Download"
                          style={{
                            width: 'auto',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '14px',
                            fontWeight: '600'
                          }}
                        >
                          <i className="fa-solid fa-download"></i>
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Box */}
        {files.length > 0 && (
          <div className="info-box" style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px', color: '#667eea' }}>
              <i className="fa-solid fa-circle-info"></i> Download Instructions
            </h3>
            <ul style={{ lineHeight: '2', color: '#666' }}>
              <li>✅ Click "Download" button to download Excel files</li>
              <li>✅ Files will open in a new tab or download automatically</li>
              <li>✅ You can download the same file multiple times</li>
              <li>✅ Files are organized by district for easy access</li>
              <li>⚠️ If a file doesn't download, contact your admin</li>
            </ul>
          </div>
        )}
      </div>
    </>
  );
};

export default MyAllocatedData;
