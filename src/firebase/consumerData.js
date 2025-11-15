import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  writeBatch,
  setDoc
} from 'firebase/firestore';
import { db } from './config';

// Collections
const CONSUMERS_COLLECTION = 'consumers';
const DISTRICTS_COLLECTION = 'districts';

// ==================== CONSUMER DATA ====================

/**
 * Add a single consumer to Firebase
 * @param {Object} consumerData - Consumer data from Excel
 * @param {string} consumerData.consumerName - Name from Excel
 * @param {string} consumerData.consumerNumber - Consumer Number from Excel
 * @param {string} consumerData.district - District from address field
 * @param {string} consumerData.city - City from address field
 * @param {string} uploadedBy - Email of MLA who uploaded the data
 * @returns {Promise<Object>} - Success status and consumer ID
 */
export const addConsumer = async (consumerData, uploadedBy) => {
  try {
    const consumerDoc = {
      name: consumerData.name || '',
      mobileNumber: consumerData.mobileNumber || '',
      address: consumerData.address || '',
      district: consumerData.district || '',
      city: consumerData.city || '',
      uploadedBy: uploadedBy || '',
      uploadedAt: serverTimestamp(),
      status: 'active'
    };
    
    const docRef = await addDoc(collection(db, CONSUMERS_COLLECTION), consumerDoc);
    
    // Update district statistics
    await updateDistrictStats(consumerData.district, uploadedBy);
    
    console.log(`✅ Consumer added with ID: ${docRef.id}`);
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error adding consumer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Add multiple consumers in batch (for bulk upload)
 * @param {Array} consumersArray - Array of consumer objects
 * @param {string} uploadedBy - Email of MLA who uploaded the data
 * @returns {Promise<Object>} - Success status and count of added consumers
 */
export const addConsumersBatch = async (consumersArray, uploadedBy) => {
  try {
    const batch = writeBatch(db);
    const consumerIds = [];
    const districtMap = new Map(); // Track consumers per district
    
    // Add all consumers to batch
    consumersArray.forEach((consumerData) => {
      const consumerRef = doc(collection(db, CONSUMERS_COLLECTION));
      const consumerDoc = {
        name: consumerData.name || '',
        mobileNumber: consumerData.mobileNumber || '',
        address: consumerData.address || '',
        district: consumerData.district || '',
        city: consumerData.city || '',
        uploadedBy: uploadedBy || '',
        uploadedAt: serverTimestamp(),
        status: 'active'
      };
      
      batch.set(consumerRef, consumerDoc);
      consumerIds.push(consumerRef.id);
      
      // Track district counts
      const district = consumerData.district || 'Unknown';
      districtMap.set(district, (districtMap.get(district) || 0) + 1);
    });
    
    // Commit the batch
    await batch.commit();
    
    // Update district statistics for each district
    for (const [district, count] of districtMap.entries()) {
      await updateDistrictStats(district, uploadedBy, count);
    }
    
    console.log(`✅ Added ${consumerIds.length} consumers in batch`);
    return { 
      success: true, 
      count: consumerIds.length,
      consumerIds: consumerIds,
      districts: Array.from(districtMap.keys())
    };
  } catch (error) {
    console.error('Error adding consumers in batch:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all consumers
 * @returns {Promise<Object>} - Success status and array of consumers
 */
export const getAllConsumers = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, CONSUMERS_COLLECTION));
    const consumers = [];
    
    querySnapshot.forEach((doc) => {
      consumers.push({ 
        id: doc.id, 
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log(`✅ Fetched ${consumers.length} consumers`);
    return { success: true, data: consumers };
  } catch (error) {
    console.error('Error getting all consumers:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get consumers by district
 * @param {string} district - District name
 * @returns {Promise<Object>} - Success status and array of consumers
 */
export const getConsumersByDistrict = async (district) => {
  try {
    const q = query(
      collection(db, CONSUMERS_COLLECTION), 
      where('district', '==', district)
    );
    const querySnapshot = await getDocs(q);
    const consumers = [];
    
    querySnapshot.forEach((doc) => {
      consumers.push({ 
        id: doc.id, 
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log(`✅ Fetched ${consumers.length} consumers for district: ${district}`);
    return { success: true, data: consumers };
  } catch (error) {
    console.error('Error getting consumers by district:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get consumers by city
 * @param {string} city - City name
 * @returns {Promise<Object>} - Success status and array of consumers
 */
export const getConsumersByCity = async (city) => {
  try {
    const q = query(
      collection(db, CONSUMERS_COLLECTION), 
      where('city', '==', city)
    );
    const querySnapshot = await getDocs(q);
    const consumers = [];
    
    querySnapshot.forEach((doc) => {
      consumers.push({ 
        id: doc.id, 
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log(`✅ Fetched ${consumers.length} consumers for city: ${city}`);
    return { success: true, data: consumers };
  } catch (error) {
    console.error('Error getting consumers by city:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get consumers uploaded by specific MLA
 * @param {string} mlaEmail - Email of MLA
 * @returns {Promise<Object>} - Success status and array of consumers
 */
export const getConsumersByMLA = async (mlaEmail) => {
  try {
    const q = query(
      collection(db, CONSUMERS_COLLECTION), 
      where('uploadedBy', '==', mlaEmail)
    );
    const querySnapshot = await getDocs(q);
    const consumers = [];
    
    querySnapshot.forEach((doc) => {
      consumers.push({ 
        id: doc.id, 
        ...doc.data(),
        uploadedAt: doc.data().uploadedAt?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log(`✅ Fetched ${consumers.length} consumers uploaded by: ${mlaEmail}`);
    return { success: true, data: consumers };
  } catch (error) {
    console.error('Error getting consumers by MLA:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update consumer data
 * @param {string} consumerId - Consumer document ID
 * @param {Object} updateData - Data to update
 * @returns {Promise<Object>} - Success status
 */
export const updateConsumer = async (consumerId, updateData) => {
  try {
    const docRef = doc(db, CONSUMERS_COLLECTION, consumerId);
    await updateDoc(docRef, {
      ...updateData,
      updatedAt: serverTimestamp()
    });
    
    console.log(`✅ Updated consumer: ${consumerId}`);
    return { success: true };
  } catch (error) {
    console.error('Error updating consumer:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete consumer
 * @param {string} consumerId - Consumer document ID
 * @returns {Promise<Object>} - Success status
 */
export const deleteConsumer = async (consumerId) => {
  try {
    const docRef = doc(db, CONSUMERS_COLLECTION, consumerId);
    await deleteDoc(docRef);
    
    console.log(`✅ Deleted consumer: ${consumerId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting consumer:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DISTRICT MANAGEMENT ====================

/**
 * Update district statistics
 * @param {string} districtName - Name of district
 * @param {string} uploadedBy - Email of MLA
 * @param {number} count - Number of consumers to add (default: 1)
 * @returns {Promise<Object>} - Success status
 */
const updateDistrictStats = async (districtName, uploadedBy, count = 1) => {
  try {
    if (!districtName) return { success: false, error: 'District name required' };
    
    const districtRef = doc(db, DISTRICTS_COLLECTION, districtName);
    const districtDoc = await getDoc(districtRef);
    
    if (districtDoc.exists()) {
      // Update existing district
      const currentData = districtDoc.data();
      const currentCount = currentData.totalConsumers || 0;
      const mlaUploads = currentData.mlaUploads || {};
      
      // Update MLA upload count
      mlaUploads[uploadedBy] = (mlaUploads[uploadedBy] || 0) + count;
      
      await updateDoc(districtRef, {
        totalConsumers: currentCount + count,
        mlaUploads: mlaUploads,
        lastUpdated: serverTimestamp()
      });
    } else {
      // Create new district document
      await setDoc(districtRef, {
        districtName: districtName,
        totalConsumers: count,
        mlaUploads: {
          [uploadedBy]: count
        },
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error updating district stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all districts with statistics
 * @returns {Promise<Object>} - Success status and array of districts
 */
export const getAllDistricts = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, DISTRICTS_COLLECTION));
    const districts = [];
    
    querySnapshot.forEach((doc) => {
      districts.push({ 
        id: doc.id, 
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        lastUpdated: doc.data().lastUpdated?.toDate?.()?.toISOString() || null
      });
    });
    
    console.log(`✅ Fetched ${districts.length} districts`);
    return { success: true, data: districts };
  } catch (error) {
    console.error('Error getting all districts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get district statistics by name
 * @param {string} districtName - Name of district
 * @returns {Promise<Object>} - Success status and district data
 */
export const getDistrictStats = async (districtName) => {
  try {
    const districtRef = doc(db, DISTRICTS_COLLECTION, districtName);
    const districtDoc = await getDoc(districtRef);
    
    if (districtDoc.exists()) {
      return { 
        success: true, 
        data: {
          id: districtDoc.id,
          ...districtDoc.data(),
          createdAt: districtDoc.data().createdAt?.toDate?.()?.toISOString() || null,
          lastUpdated: districtDoc.data().lastUpdated?.toDate?.()?.toISOString() || null
        }
      };
    } else {
      return { success: false, error: 'District not found' };
    }
  } catch (error) {
    console.error('Error getting district stats:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get districts where specific MLA has uploaded data
 * @param {string} mlaEmail - Email of MLA
 * @returns {Promise<Object>} - Success status and array of districts
 */
export const getDistrictsByMLA = async (mlaEmail) => {
  try {
    const querySnapshot = await getDocs(collection(db, DISTRICTS_COLLECTION));
    const districts = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const mlaUploads = data.mlaUploads || {};
      
      // Check if this MLA has uploaded data to this district
      if (mlaUploads[mlaEmail]) {
        districts.push({ 
          id: doc.id, 
          ...data,
          mlaUploadCount: mlaUploads[mlaEmail],
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          lastUpdated: data.lastUpdated?.toDate?.()?.toISOString() || null
        });
      }
    });
    
    console.log(`✅ Fetched ${districts.length} districts for MLA: ${mlaEmail}`);
    return { success: true, data: districts };
  } catch (error) {
    console.error('Error getting districts by MLA:', error);
    return { success: false, error: error.message };
  }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Parse address field to extract district and city
 * @param {string} address - Full address string
 * @returns {Object} - Object with district and city
 */
export const parseAddress = (address) => {
  if (!address) return { district: '', city: '' };
  
  // Common patterns in Indian addresses
  // Example: "City Name, District Name, State, PIN"
  const parts = address.split(',').map(part => part.trim());
  
  let district = '';
  let city = '';
  
  if (parts.length >= 2) {
    city = parts[0] || '';
    district = parts[1] || '';
  } else if (parts.length === 1) {
    city = parts[0] || '';
  }
  
  return { district, city };
};

/**
 * Process Excel data and prepare for upload
 * Only extracts name, mobile number, and address fields
 * @param {Array} excelData - Array of rows from Excel
 * @returns {Array} - Processed consumer data array
 */
export const processExcelData = (excelData) => {
  return excelData.map(row => {
    // Extract name - support multiple column name variations (prioritize non-consumer name fields)
    const name = row.name || row.Name || row['Full Name'] || row.fullName || 
                 row.consumerName || row['Consumer Name'] || '';
    
    // Extract mobile number - prioritize mobile/phone/contact over generic 'number'
    const mobileNumber = row.mobile || row.Mobile || row.mobileNumber || row['Mobile Number'] || 
                        row.phone || row.Phone || row.contact || row.Contact || 
                        row['Contact Number'] || row.contactNumber || '';
    
    // Extract address - support multiple column name variations
    const address = row.address || row.Address || row.fullAddress || row['Full Address'] || '';
    
    // Extract district and city from address for filtering purposes
    const { district, city } = parseAddress(address);
    
    return {
      name: name.toString().trim(),
      mobileNumber: mobileNumber.toString().trim(),
      address: address.toString().trim(),
      district: district,
      city: city
    };
  });
};
