import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { uploadDistrictFile, MAHARASHTRA_DISTRICTS } from '../../firebase/storage';
import { createActivityLog } from '../../firebase/firestore';
import { uploadAndStoreExcelData, extractDistrictAndVillage, deleteDistrictData, getVillagesByDistrict, getFirestoreDistricts } from '../../firebase/excelStorage';
import ConfirmModal from '../Common/ConfirmModal';
import './DataManagement.css';

const UploadDistrictData = () => {
  const { user } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [month, setMonth] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [uploadDistricts, setUploadDistricts] = useState(MAHARASHTRA_DISTRICTS); // For upload section
  const [firestoreDistricts, setFirestoreDistricts] = useState([]); // For delete section - only districts in Firestore
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [villages, setVillages] = useState([]);
  const [selectedVillage, setSelectedVillage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    // Load districts from Firestore when component mounts
    loadFirestoreDistricts();
  }, []);

  useEffect(() => {
    if (selectedDistrict) {
      loadVillages(selectedDistrict);
    } else {
      setVillages([]);
      setSelectedVillage('');
    }
  }, [selectedDistrict]);
  
  const loadFirestoreDistricts = async () => {
    setLoadingDistricts(true);
    try {
      const result = await getFirestoreDistricts();
      if (result.success) {
        setFirestoreDistricts(result.data);
      } else {
        console.error('Failed to load Firestore districts:', result.error);
        setFirestoreDistricts([]);
      }
    } catch (error) {
      console.error('Error loading Firestore districts:', error);
      setFirestoreDistricts([]);
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadVillages = async (district) => {
    if (!district) return;
    
    setLoading(true);
    try {
      const result = await getVillagesByDistrict(district);
      if (result.success) {
        setVillages(result.data.map(v => v.id || v.villageName));
      } else {
        console.error('Failed to load villages:', result.error);
        setVillages([]);
      }
    } catch (error) {
      console.error('Error loading villages:', error);
      setVillages([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv'
      ];
      
      if (!validTypes.includes(file.type)) {
        setMessage({ type: 'error', text: 'Please select a valid Excel or CSV file' });
        return;
      }
      
      // Extract district and village from filename
      const { district: extractedDistrict, village: extractedVillage, error } = extractDistrictAndVillage(file.name);
      
      if (error) {
        setMessage({ type: 'warning', text: `⚠️ ${error}. Please rename your file as: DistrictName_VillageName.xlsx` });
        setDistrict('');
        setVillage('');
      } else {
        setDistrict(extractedDistrict);
        setVillage(extractedVillage);
        setMessage({ type: 'success', text: `✅ Detected: District="${extractedDistrict}", Village="${extractedVillage}"` });
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    
    if (!district || !village) {
      setMessage({ type: 'error', text: 'Could not extract district and village from filename. Please rename your file as: DistrictName_VillageName.xlsx' });
      return;
    }
    
    setUploading(true);
    setUploadProgress(0);
    setUploadStatus('Starting upload...');
    setMessage({ type: '', text: '' });
    
    try {
      // Upload and store data in Firestore with hierarchical structure
      const result = await uploadAndStoreExcelData(
        selectedFile,
        user.email,
        (progress, status) => {
          setUploadProgress(progress);
          setUploadStatus(status);
        }
      );
      
      if (result.success) {
        // Log activity
        await createActivityLog({
          action: 'data_uploaded',
          performedBy: user.email,
          details: `Uploaded ${result.recordCount} records for ${result.district} -> ${result.village} (${selectedFile.name})`
        });
        
        setMessage({ 
          type: 'success', 
          text: `✅ Successfully uploaded ${result.recordCount} records!\nDistrict: ${result.district}\nVillage: ${result.village}` 
        });
        
        // Reset form
        setSelectedFile(null);
        setDistrict('');
        setVillage('');
        setMonth('');
        setUploadProgress(0);
        setUploadStatus('');
        
        // Reset file input
        document.getElementById('fileInput').value = '';
        
        // Reload Firestore districts to update the delete section
        loadFirestoreDistricts();
      } else {
        setMessage({ type: 'error', text: `❌ Upload failed: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setUploading(false);
      setUploadStatus('');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDeleteData = () => {
    if (!selectedDistrict) {
      setMessage({ type: 'error', text: 'Please select a district' });
      return;
    }
    
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    setMessage({ type: '', text: '' });
    
    try {
      const result = await deleteDistrictData(selectedDistrict, selectedVillage || null);
      
      if (result.success) {
        // Log activity
        await createActivityLog({
          action: 'data_deleted',
          performedBy: user.email,
          details: `Deleted ${result.deletedCount} records from ${selectedDistrict}${selectedVillage ? '/' + selectedVillage : ' (all villages)'}`
        });
        
        // Check if the entire district was deleted
        const districtDeletedMessage = result.districtDeleted ? 
          ' District was completely removed from Firestore.' : '';
        
        setMessage({ 
          type: 'success', 
          text: `✅ Successfully deleted ${result.deletedCount} records from ${selectedDistrict}${selectedVillage ? '/' + selectedVillage : ' (all villages)'}${districtDeletedMessage}` 
        });
        
        // Reset selections if district was deleted
        if (result.districtDeleted) {
          setSelectedDistrict('');
        }
        
        // Always reset village selection
        setSelectedVillage('');
        
        // Reload villages for the selected district if it still exists
        if (selectedDistrict && !result.districtDeleted) {
          loadVillages(selectedDistrict);
        } else {
          setVillages([]);
        }
        
        // Reload Firestore districts to update the list
        loadFirestoreDistricts();
      } else {
        setMessage({ type: 'error', text: `❌ Delete failed: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">📤 Upload District Data</h1>
        <p className="page-subtitle">Upload Excel files for district-wise consumer data</p>
      </div>

      <div className="content-card">
        {/* Tabs for Upload and Delete */}
        <div className="tabs">
          <div className="tab-header">
            <div className="tab-title">Upload New Data</div>
          </div>
        </div>
        <form onSubmit={handleUpload}>
          <div className="form-grid">
            {/* District Display */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-map-location-dot"></i> District
              </label>
              <input
                type="text"
                className="form-input"
                value={district}
                readOnly
                placeholder="Auto-detected from filename"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>

            {/* Village Display */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-location-dot"></i> Village
              </label>
              <input
                type="text"
                className="form-input"
                value={village}
                readOnly
                placeholder="Auto-detected from filename"
                style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
              />
            </div>
          </div>

          {/* File Upload */}
          <div className="form-group">
            <label className="form-label">
              <i className="fa-solid fa-file-excel"></i> Excel File *
            </label>
            <div className="file-upload-container">
              <input
                id="fileInput"
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              <label 
                htmlFor="fileInput" 
                className="file-upload-label"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '15px',
                  border: '2px dashed #ddd',
                  borderRadius: '8px',
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  background: '#f9f9f9',
                  transition: 'all 0.2s'
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '24px', color: '#667eea' }}></i>
                <div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>
                    {selectedFile ? selectedFile.name : 'Click to select Excel file'}
                  </div>
                  {selectedFile && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Size: {formatFileSize(selectedFile.size)}
                    </div>
                  )}
                  {!selectedFile && (
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                      Supported: .xlsx, .xls, .csv
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="upload-progress">
              <div className="progress-bar-container">
                <div 
                  className="progress-bar"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="progress-text">
                {uploadStatus || `Uploading... ${Math.round(uploadProgress)}%`}
              </div>
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
              disabled={uploading || !selectedFile || !district || !village}
              style={{
                background: uploading ? '#ccc' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                cursor: uploading ? 'not-allowed' : 'pointer'
              }}
            >
              {uploading ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Processing...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-upload"></i> Upload & Store Data
                </>
              )}
            </button>
          </div>
        </form>

        {/* Delete Data Section */}
        <div className="tabs" style={{ marginTop: '30px' }}>
          <div className="tab-header">
            <div className="tab-title">Delete Existing Data</div>
          </div>
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
            <i className="fa-solid fa-info-circle" style={{ color: '#3498db', marginRight: '5px' }}></i>
            Only districts with data uploaded to Firestore are shown below. Static data from local storage is not included.
          </div>
        </div>

        <div className="delete-data-section">
          <div className="form-grid">
            {/* District Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-map-location-dot"></i> Select District *
              </label>
              <select
                className="form-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                disabled={deleting || loadingDistricts}
              >
                <option value="">Select a district</option>
                {firestoreDistricts.map((dist) => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
              {loadingDistricts && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading districts from Firestore...
                </div>
              )}
              {!loadingDistricts && firestoreDistricts.length === 0 && (
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#fff8e1', borderRadius: '4px', border: '1px solid #ffe082' }}>
                  <i className="fa-solid fa-exclamation-triangle" style={{ color: '#ff9800', marginRight: '5px' }}></i>
                  <span style={{ fontSize: '13px', color: '#795548' }}>No districts with uploaded data found in Firestore. Upload data first to enable deletion.</span>
                </div>
              )}
            </div>

            {/* Village Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-location-dot"></i> Select Village (Optional)
              </label>
              <select
                className="form-select"
                value={selectedVillage}
                onChange={(e) => setSelectedVillage(e.target.value)}
                disabled={!selectedDistrict || deleting || loading}
              >
                <option value="">All Villages</option>
                {villages.map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
              {loading && (
                <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                  <i className="fa-solid fa-spinner fa-spin"></i> Loading villages...
                </div>
              )}
              <div style={{ marginTop: '5px', fontSize: '12px', color: '#666' }}>
                Leave empty to delete all villages in the selected district
              </div>
            </div>
          </div>

          {/* Delete Button */}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteData}
              disabled={deleting || !selectedDistrict || firestoreDistricts.length === 0}
              style={{
                background: (deleting || firestoreDistricts.length === 0) ? '#ccc' : 'linear-gradient(135deg, #ff5252 0%, #d32f2f 100%)',
                cursor: (deleting || !selectedDistrict || firestoreDistricts.length === 0) ? 'not-allowed' : 'pointer'
              }}
            >
              {deleting ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Deleting...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-trash-can"></i> Delete Data
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        title="Delete District Data"
        message={
          selectedVillage
            ? `Are you sure you want to delete all data for ${selectedDistrict}/${selectedVillage}? This action cannot be undone.`
            : `Are you sure you want to delete ALL data for ${selectedDistrict} (all villages)? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

// Add CSS for the tabs and delete section
const styles = `
.tabs {
  margin-bottom: 20px;
}

.tab-header {
  display: flex;
  align-items: center;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
  margin-bottom: 20px;
}

.tab-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  padding: 8px 0;
  position: relative;
}

.tab-title:after {
  content: '';
  position: absolute;
  bottom: -12px;
  left: 0;
  width: 100%;
  height: 2px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.delete-data-section {
  background-color: #fff9f9;
  border: 1px solid #ffebee;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.btn-danger {
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-danger:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
`;

// Add the styles to the document
const styleSheet = document.createElement('style');
styleSheet.type = 'text/css';
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

export default UploadDistrictData;
