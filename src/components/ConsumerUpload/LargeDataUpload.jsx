import React, { useState, useEffect } from 'react';
import { 
  uploadAndProcessExcel,
  getProcessingStatus,
  getUploadHistory,
  listUploadedFiles 
} from '../../firebase/storageToFirestore';
import './LargeDataUpload.css';

const LargeDataUpload = ({ userEmail }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [processProgress, setProcessProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(''); // upload, process, complete
  const [result, setResult] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);

  // Load upload history on mount
  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const historyResult = await getUploadHistory();
    if (historyResult.success) {
      setUploadHistory(historyResult.data.sort((a, b) => 
        new Date(b.uploadedAt) - new Date(a.uploadedAt)
      ));
    }
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResult(null);
      setUploadProgress(0);
      setProcessProgress(0);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      alert('कृपया फाईल निवडा / Please select a file');
      return;
    }

    if (!userEmail) {
      alert('User email not found');
      return;
    }

    setUploading(true);
    setProcessing(false);
    setCurrentStep('upload');
    setResult(null);

    try {
      const uploadResult = await uploadAndProcessExcel(
        file,
        userEmail,
        // Upload progress callback
        (uploadProgressData) => {
          setUploadProgress(uploadProgressData.progress);
          console.log('Upload:', uploadProgressData);
        },
        // Process progress callback
        (processProgressData) => {
          setCurrentStep('process');
          setUploading(false);
          setProcessing(true);
          setProcessProgress(processProgressData.progress);
          console.log('Process:', processProgressData);
        }
      );

      if (uploadResult.success) {
        setCurrentStep('complete');
        setResult({
          success: true,
          message: 'डेटा यशस्वीरित्या अपलोड झाला! / Data uploaded successfully!',
          details: uploadResult.processResult
        });
        
        // Reload history
        loadHistory();
      } else {
        setResult({
          success: false,
          message: `Error: ${uploadResult.error}`
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      setResult({
        success: false,
        message: `Error: ${error.message}`
      });
    } finally {
      setUploading(false);
      setProcessing(false);
      setFile(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('en-IN').format(num);
  };

  const getStatusBadge = (status) => {
    const badges = {
      uploaded: { text: 'Uploaded', class: 'status-uploaded' },
      processing: { text: 'Processing', class: 'status-processing' },
      completed: { text: 'Completed', class: 'status-completed' },
      failed: { text: 'Failed', class: 'status-failed' }
    };
    return badges[status] || badges.uploaded;
  };

  return (
    <div className="large-data-upload-container">
      {/* Header */}
      <div className="upload-header">
        <h1>🚀 Large Data Upload System</h1>
        <p className="subtitle">2 करोड (20 Million) Records साठी / For 2 Crore Records</p>
      </div>

      {/* Info Cards */}
      <div className="info-cards">
        <div className="info-card">
          <div className="info-icon">📤</div>
          <h3>Step 1: Storage Upload</h3>
          <p>Excel file Storage मध्ये upload होईल</p>
        </div>
        <div className="info-card">
          <div className="info-icon">⚙️</div>
          <h3>Step 2: Processing</h3>
          <p>Data Firestore मध्ये process होईल</p>
        </div>
        <div className="info-card">
          <div className="info-icon">✅</div>
          <h3>Step 3: Complete</h3>
          <p>District-wise data ready होईल</p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="upload-section">
        <h2>📁 Upload Excel File</h2>
        
        <div className="file-input-wrapper">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading || processing}
            className="file-input"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="file-label">
            {file ? (
              <div className="file-selected">
                <span className="file-icon">📄</span>
                <div className="file-details">
                  <strong>{file.name}</strong>
                  <span className="file-size">{formatFileSize(file.size)}</span>
                </div>
              </div>
            ) : (
              <div className="file-placeholder">
                <span className="upload-icon">☁️</span>
                <span>Click to select Excel file</span>
              </div>
            )}
          </label>
        </div>

        <button
          onClick={handleUpload}
          disabled={!file || uploading || processing}
          className="upload-button"
        >
          {uploading ? '📤 Uploading...' : processing ? '⚙️ Processing...' : '🚀 Upload & Process'}
        </button>

        {/* Progress Section */}
        {(uploading || processing || currentStep === 'complete') && (
          <div className="progress-section">
            {/* Upload Progress */}
            {(uploading || currentStep !== 'upload') && (
              <div className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">
                    {uploading ? '📤 Uploading to Storage...' : '✅ Upload Complete'}
                  </span>
                  <span className="progress-percentage">{uploadProgress.toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill upload-progress"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Processing Progress */}
            {(processing || currentStep === 'complete') && (
              <div className="progress-item">
                <div className="progress-header">
                  <span className="progress-label">
                    {processing ? '⚙️ Processing to Firestore...' : '✅ Processing Complete'}
                  </span>
                  <span className="progress-percentage">{processProgress.toFixed(1)}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill process-progress"
                    style={{ width: `${processProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Current Step Indicator */}
            <div className="step-indicator">
              <div className={`step ${currentStep === 'upload' || uploading ? 'active' : currentStep !== 'upload' ? 'completed' : ''}`}>
                <div className="step-number">1</div>
                <div className="step-label">Upload</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep === 'process' || processing ? 'active' : currentStep === 'complete' ? 'completed' : ''}`}>
                <div className="step-number">2</div>
                <div className="step-label">Process</div>
              </div>
              <div className="step-line"></div>
              <div className={`step ${currentStep === 'complete' ? 'completed' : ''}`}>
                <div className="step-number">3</div>
                <div className="step-label">Complete</div>
              </div>
            </div>
          </div>
        )}

        {/* Result Section */}
        {result && (
          <div className={`result-section ${result.success ? 'success' : 'error'}`}>
            <div className="result-icon">
              {result.success ? '✅' : '❌'}
            </div>
            <div className="result-content">
              <h3>{result.message}</h3>
              {result.success && result.details && (
                <div className="result-details">
                  <div className="detail-item">
                    <span className="detail-label">Total Records:</span>
                    <span className="detail-value">{formatNumber(result.details.totalRecords)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Processed:</span>
                    <span className="detail-value">{formatNumber(result.details.processedRecords)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Districts:</span>
                    <span className="detail-value">{result.details.districts?.length || 0}</span>
                  </div>
                  {result.details.errors?.length > 0 && (
                    <div className="detail-item error">
                      <span className="detail-label">Errors:</span>
                      <span className="detail-value">{result.details.errors.length}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload History */}
      <div className="history-section">
        <div className="history-header">
          <h2>📊 Upload History</h2>
          <button 
            className="toggle-history-btn"
            onClick={() => setShowHistory(!showHistory)}
          >
            {showHistory ? 'Hide' : 'Show'} History
          </button>
        </div>

        {showHistory && (
          <div className="history-list">
            {uploadHistory.length === 0 ? (
              <p className="no-history">No upload history found</p>
            ) : (
              uploadHistory.map((item) => {
                const statusBadge = getStatusBadge(item.status);
                return (
                  <div key={item.id} className="history-item">
                    <div className="history-item-header">
                      <span className="history-filename">{item.fileName}</span>
                      <span className={`status-badge ${statusBadge.class}`}>
                        {statusBadge.text}
                      </span>
                    </div>
                    <div className="history-item-details">
                      <span>📅 {new Date(item.uploadedAt).toLocaleString('en-IN')}</span>
                      <span>👤 {item.uploadedBy}</span>
                      <span>📦 {formatFileSize(item.fileSize)}</span>
                    </div>
                    {item.status === 'completed' && (
                      <div className="history-item-stats">
                        <span>✅ {formatNumber(item.processedRecords)} / {formatNumber(item.totalRecords)} records</span>
                        {item.errors?.length > 0 && (
                          <span className="error-count">⚠️ {item.errors.length} errors</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="instructions-section">
        <h3>📝 Instructions / सूचना</h3>
        <div className="instructions-grid">
          <div className="instruction-item">
            <strong>1. Excel Format:</strong>
            <p>Consumer Name, Consumer Number, Address columns असणे आवश्यक</p>
          </div>
          <div className="instruction-item">
            <strong>2. File Size:</strong>
            <p>2 करोड records साठी सुद्धा काम करेल (Large files supported)</p>
          </div>
          <div className="instruction-item">
            <strong>3. Processing Time:</strong>
            <p>Large files साठी काही मिनिटे लागू शकतात</p>
          </div>
          <div className="instruction-item">
            <strong>4. Storage:</strong>
            <p>File Storage मध्ये save होईल, data Firestore मध्ये जाईल</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LargeDataUpload;
