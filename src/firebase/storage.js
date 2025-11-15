import { 
  ref, 
  uploadBytes, 
  uploadBytesResumable,
  getDownloadURL, 
  deleteObject,
  listAll 
} from 'firebase/storage';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query, 
  where,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { storage, db } from './config';

const DISTRICT_FILES_COLLECTION = 'districtFiles';

// List of 36 districts in Maharashtra
export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Aurangabad', 'Beed', 'Bhandara',
  'Buldhana', 'Chandrapur', 'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli',
  'Jalgaon', 'Jalna', 'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban',
  'Nagpur', 'Nanded', 'Nandurbar', 'Nashik', 'Osmanabad', 'Palghar',
  'Parbhani', 'Pune', 'Raigad', 'Ratnagiri', 'Sangli', 'Satara',
  'Sindhudurg', 'Solapur', 'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

/**
 * Upload Excel file to Firebase Storage
 * @param {File} file - Excel file to upload
 * @param {string} district - District name
 * @param {string} month - Month in YYYY-MM format
 * @param {string} uploadedBy - Email of uploader
 * @param {function} onProgress - Progress callback (optional)
 * @returns {Promise<{success: boolean, fileId?: string, error?: string}>}
 */
export const uploadDistrictFile = async (file, district, month, uploadedBy, onProgress = null) => {
  try {
    // Validate file type
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/csv'
    ];
    
    if (!validTypes.includes(file.type)) {
      return { success: false, error: 'Invalid file type. Please upload Excel or CSV file.' };
    }

    // Create storage path
    const fileName = `${district}_${month}_${Date.now()}.xlsx`;
    const filePath = `districts/${district}/${fileName}`;
    const storageRef = ref(storage, filePath);
    
    console.log('📤 Uploading file to:', filePath);

    // Upload with progress tracking
    if (onProgress) {
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            onProgress(progress);
          },
          (error) => reject(error),
          () => resolve()
        );
      });
    } else {
      await uploadBytes(storageRef, file);
    }
    
    // Get download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('✅ File uploaded, getting download URL...');
    
    // Store metadata in Firestore
    const metadata = {
      district,
      month,
      fileName: file.name,
      originalFileName: file.name,
      storedFileName: fileName,
      fileSize: file.size,
      fileSizeFormatted: formatFileSize(file.size),
      storagePath: filePath,
      downloadURL,
      uploadedBy,
      uploadedAt: serverTimestamp(),
      status: 'available',
      recordCount: 0, // Will be updated after processing
      allocatedCount: 0
    };
    
    const docRef = await addDoc(collection(db, DISTRICT_FILES_COLLECTION), metadata);
    
    console.log('✅ Metadata stored with ID:', docRef.id);
    
    return { success: true, fileId: docRef.id, downloadURL };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all district files
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllDistrictFiles = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, DISTRICT_FILES_COLLECTION));
    const files = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      files.push({
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    // Sort by upload date (newest first)
    files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    
    return { success: true, data: files };
  } catch (error) {
    console.error('Error getting district files:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get files by district
 * @param {string} district - District name
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getFilesByDistrict = async (district) => {
  try {
    const q = query(
      collection(db, DISTRICT_FILES_COLLECTION),
      where('district', '==', district),
      where('status', '==', 'available')
    );
    
    const querySnapshot = await getDocs(q);
    const files = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      files.push({
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: files };
  } catch (error) {
    console.error('Error getting files by district:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get files by district and date range
 * @param {string} district - District name
 * @param {string} startMonth - Start month (YYYY-MM)
 * @param {string} endMonth - End month (YYYY-MM)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getFilesByDistrictAndDateRange = async (district, startMonth, endMonth) => {
  try {
    const q = query(
      collection(db, DISTRICT_FILES_COLLECTION),
      where('district', '==', district),
      where('month', '>=', startMonth),
      where('month', '<=', endMonth),
      where('status', '==', 'available')
    );
    
    const querySnapshot = await getDocs(q);
    const files = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      files.push({
        id: doc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: files };
  } catch (error) {
    console.error('Error getting files by district and date range:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete district file (both storage and metadata)
 * @param {string} fileId - File document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteDistrictFile = async (fileId) => {
  try {
    // Get file metadata
    const fileDoc = await getDoc(doc(db, DISTRICT_FILES_COLLECTION, fileId));
    
    if (!fileDoc.exists()) {
      return { success: false, error: 'File not found' };
    }
    
    const fileData = fileDoc.data();
    
    // Delete from storage
    const storageRef = ref(storage, fileData.storagePath);
    await deleteObject(storageRef);
    
    // Delete metadata from Firestore
    await deleteDoc(doc(db, DISTRICT_FILES_COLLECTION, fileId));
    
    console.log('✅ File deleted:', fileId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update file metadata
 * @param {string} fileId - File document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateDistrictFile = async (fileId, updates) => {
  try {
    await updateDoc(doc(db, DISTRICT_FILES_COLLECTION, fileId), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get file by ID
 * @param {string} fileId - File document ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getFileById = async (fileId) => {
  try {
    const fileDoc = await getDoc(doc(db, DISTRICT_FILES_COLLECTION, fileId));
    
    if (!fileDoc.exists()) {
      return { success: false, error: 'File not found' };
    }
    
    const data = fileDoc.data();
    return {
      success: true,
      data: {
        id: fileDoc.id,
        ...data,
        uploadedAt: data.uploadedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error getting file:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Format file size to human readable format
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted size
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Get storage statistics
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getStorageStats = async () => {
  try {
    const files = await getAllDistrictFiles();
    
    if (!files.success) {
      return files;
    }
    
    const stats = {
      totalFiles: files.data.length,
      totalSize: files.data.reduce((sum, file) => sum + (file.fileSize || 0), 0),
      totalSizeFormatted: formatFileSize(files.data.reduce((sum, file) => sum + (file.fileSize || 0), 0)),
      byDistrict: {},
      byMonth: {}
    };
    
    // Group by district
    files.data.forEach(file => {
      if (!stats.byDistrict[file.district]) {
        stats.byDistrict[file.district] = {
          count: 0,
          size: 0
        };
      }
      stats.byDistrict[file.district].count++;
      stats.byDistrict[file.district].size += file.fileSize || 0;
    });
    
    // Group by month
    files.data.forEach(file => {
      if (!stats.byMonth[file.month]) {
        stats.byMonth[file.month] = {
          count: 0,
          size: 0
        };
      }
      stats.byMonth[file.month].count++;
      stats.byMonth[file.month].size += file.fileSize || 0;
    });
    
    return { success: true, data: stats };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return { success: false, error: error.message };
  }
};
