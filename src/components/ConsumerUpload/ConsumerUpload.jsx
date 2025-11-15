import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { 
  addConsumersBatch, 
  processExcelData,
  getAllDistricts,
  getConsumersByDistrict 
} from '../../firebase/consumerData';
import './ConsumerUpload.css';

const ConsumerUpload = ({ userEmail }) => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [previewData, setPreviewData] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [districtConsumers, setDistrictConsumers] = useState([]);
  const [showDistrictView, setShowDistrictView] = useState(false);

  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setUploadStatus(null);
      previewExcelFile(selectedFile);
    }
  };

  // Preview Excel file data
  const previewExcelFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        // Show first 5 rows as preview
        setPreviewData(jsonData.slice(0, 5));
      } catch (error) {
        console.error('Error reading Excel file:', error);
        setUploadStatus({
          success: false,
          message: 'Error reading Excel file. Please check the file format.'
        });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!file) {
      setUploadStatus({
        success: false,
        message: 'Please select a file first'
      });
      return;
    }

    if (!userEmail) {
      setUploadStatus({
        success: false,
        message: 'User email not found. Please log in again.'
      });
      return;
    }

    setUploading(true);
    setUploadStatus(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          // Process the Excel data
          const processedData = processExcelData(jsonData);

          // Upload to Firebase
          const result = await addConsumersBatch(processedData, userEmail);

          if (result.success) {
            setUploadStatus({
              success: true,
              message: `Successfully uploaded ${result.count} consumers across ${result.districts.length} districts`,
              details: {
                count: result.count,
                districts: result.districts
              }
            });
            
            // Clear file input
            setFile(null);
            setPreviewData([]);
            
            // Refresh districts list
            loadDistricts();
          } else {
            setUploadStatus({
              success: false,
              message: `Upload failed: ${result.error}`
            });
          }
        } catch (error) {
          console.error('Error processing file:', error);
          setUploadStatus({
            success: false,
            message: `Error processing file: ${error.message}`
          });
        } finally {
          setUploading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      console.error('Error uploading file:', error);
      setUploadStatus({
        success: false,
        message: `Upload error: ${error.message}`
      });
      setUploading(false);
    }
  };

  // Load all districts
  const loadDistricts = async () => {
    try {
      const result = await getAllDistricts();
      if (result.success) {
        setDistricts(result.data);
      }
    } catch (error) {
      console.error('Error loading districts:', error);
    }
  };

  // Load consumers for selected district
  const handleDistrictSelect = async (districtName) => {
    setSelectedDistrict(districtName);
    try {
      const result = await getConsumersByDistrict(districtName);
      if (result.success) {
        setDistrictConsumers(result.data);
        setShowDistrictView(true);
      }
    } catch (error) {
      console.error('Error loading district consumers:', error);
    }
  };

  // Load districts on component mount
  React.useEffect(() => {
    loadDistricts();
  }, []);

  return (
    <div className="consumer-upload-container">
      <div className="upload-section">
        <h2>Upload Consumer Data</h2>
        
        <div className="upload-instructions">
          <h3>Excel File Requirements:</h3>
          <ul>
            <li><strong>Name</strong> - Name of the person</li>
            <li><strong>Mobile Number</strong> - Contact mobile number</li>
            <li><strong>Address</strong> - Full address</li>
          </ul>
          <p style={{fontSize: '12px', color: '#666', marginTop: '10px'}}>
            Note: Only these three fields will be extracted and stored from your Excel file.
          </p>
        </div>

        <div className="file-input-section">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            disabled={uploading}
            className="file-input"
          />
          
          {file && (
            <div className="file-info">
              <p>Selected file: <strong>{file.name}</strong></p>
            </div>
          )}
        </div>

        {previewData.length > 0 && (
          <div className="preview-section">
            <h3>Preview (First 5 rows):</h3>
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Mobile Number</th>
                    <th>Address</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index}>
                      <td>{row.name || row.Name || row['Full Name'] || row.consumerName || row['Consumer Name'] || '-'}</td>
                      <td>{row.mobile || row.Mobile || row.mobileNumber || row['Mobile Number'] || row.phone || row.Phone || row.contact || row.Contact || '-'}</td>
                      <td>{row.address || row.Address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="upload-button"
        >
          {uploading ? 'Uploading...' : 'Upload to Firebase'}
        </button>

        {uploadStatus && (
          <div className={`upload-status ${uploadStatus.success ? 'success' : 'error'}`}>
            <p>{uploadStatus.message}</p>
            {uploadStatus.details && (
              <div className="upload-details">
                <p>Total Consumers: {uploadStatus.details.count}</p>
                <p>Districts: {uploadStatus.details.districts.join(', ')}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="districts-section">
        <h2>Districts Overview</h2>
        
        {districts.length === 0 ? (
          <p className="no-data">No districts found. Upload consumer data to get started.</p>
        ) : (
          <div className="districts-grid">
            {districts.map((district) => (
              <div 
                key={district.id} 
                className="district-card"
                onClick={() => handleDistrictSelect(district.id)}
              >
                <h3>{district.districtName}</h3>
                <div className="district-stats">
                  <p><strong>Total Consumers:</strong> {district.totalConsumers}</p>
                  <p><strong>MLAs Contributed:</strong> {Object.keys(district.mlaUploads || {}).length}</p>
                  <p className="last-updated">
                    Last Updated: {new Date(district.lastUpdated).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDistrictView && (
        <div className="district-detail-modal">
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedDistrict} - Consumers</h2>
              <button 
                className="close-button"
                onClick={() => setShowDistrictView(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p className="total-count">Total: {districtConsumers.length} consumers</p>
              
              <div className="consumers-table-container">
                <table className="consumers-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Mobile Number</th>
                      <th>Address</th>
                      <th>Uploaded By</th>
                      <th>Upload Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districtConsumers.map((consumer) => (
                      <tr key={consumer.id}>
                        <td>{consumer.name}</td>
                        <td>{consumer.mobileNumber}</td>
                        <td>{consumer.address}</td>
                        <td>{consumer.uploadedBy}</td>
                        <td>{new Date(consumer.uploadedAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsumerUpload;
