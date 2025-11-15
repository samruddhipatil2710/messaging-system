import * as XLSX from 'xlsx';
import { 
  collection, 
  doc,
  setDoc,
  serverTimestamp,
  writeBatch,
  getDocs,
  query,
  limit as firestoreLimit,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

/**
 * Extract district and village name from Excel filename
 * Expected format: "DistrictName_VillageName.xlsx" or "DistrictName-VillageName.xlsx"
 * @param {string} filename - The Excel filename
 * @returns {{district: string, village: string, error?: string}}
 */
export const extractDistrictAndVillage = (filename) => {
  try {
    // Remove file extension
    const nameWithoutExt = filename.replace(/\.(xlsx|xls|csv)$/i, '');
    
    // Special handling for hyphen-separated filenames
    if (nameWithoutExt.includes('-')) {
      // Split only at the first hyphen to handle cases like "Akola-Akola_4"
      const firstHyphenIndex = nameWithoutExt.indexOf('-');
      const district = nameWithoutExt.substring(0, firstHyphenIndex).trim();
      const village = nameWithoutExt.substring(firstHyphenIndex + 1).trim();
      
      if (!district || !village) {
        return { 
          district: '', 
          village: '', 
          error: 'District and village names cannot be empty' 
        };
      }
      
      return { district, village };
    }
    
    // Try other separators: underscore or space
    let parts;
    if (nameWithoutExt.includes('_')) {
      parts = nameWithoutExt.split('_');
    } else if (nameWithoutExt.includes(' ')) {
      parts = nameWithoutExt.split(' ');
    } else {
      return { 
        district: '', 
        village: '', 
        error: 'Filename must contain district and village separated by _, -, or space' 
      };
    }
    
    if (parts.length < 2) {
      return { 
        district: '', 
        village: '', 
        error: 'Filename must contain both district and village name' 
      };
    }
    
    // First part is district, second part is village
    const district = parts[0].trim();
    const village = parts[1].trim();
    
    if (!district || !village) {
      return { 
        district: '', 
        village: '', 
        error: 'District and village names cannot be empty' 
      };
    }
    
    return { district, village };
  } catch (error) {
    return { 
      district: '', 
      village: '', 
      error: `Error parsing filename: ${error.message}` 
    };
  }
};

/**
 * Parse Excel file and extract data
 * @param {File} file - The Excel file
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const parseExcelFile = async (file) => {
  try {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          
          // Get the first sheet
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '' 
          });
          
          if (jsonData.length === 0) {
            resolve({ success: false, error: 'Excel file is empty' });
            return;
          }
          
          // First row is headers
          const headers = jsonData[0];
          const rows = jsonData.slice(1);
          
          // Convert to array of objects - ONLY extract name, mobile number, and address
          const records = rows
            .filter(row => row.some(cell => cell !== '')) // Filter out empty rows
            .map((row, index) => {
              const record = { rowNumber: index + 2 }; // +2 because of header and 0-index
              
              // Find and extract only the required fields
              let name = '';
              let mobileNumber = '';
              let address = '';
              
              headers.forEach((header, i) => {
                if (!header) return;
                
                const cellValue = row[i] !== undefined ? row[i] : '';
                const headerLower = header.toLowerCase();
                
                // Extract NAME field - accept any column containing 'name'
                if (!name && headerLower.includes('name')) {
                  name = cellValue;
                  console.log(`👤 Name field found: "${header}" = "${cellValue}"`);
                }
                
                // Extract MOBILE NUMBER field - prioritize mobile/phone specific columns
                if (!mobileNumber && (
                  headerLower.includes('mobile') || 
                  headerLower.includes('phone') || 
                  headerLower.includes('contact')
                )) {
                  mobileNumber = cellValue;
                  console.log(`📱 Mobile field found: "${header}" = "${cellValue}"`);
                }
                
                // Extract ADDRESS field
                if (!address && headerLower.includes('address')) {
                  address = cellValue;
                }
              });
              
              // Only store the three required fields
              record.name = name.toString().trim();
              record.mobileNumber = mobileNumber.toString().trim();
              record.address = address.toString().trim();
              
              return record;
            });
          
          resolve({ success: true, data: records, headers });
        } catch (error) {
          resolve({ success: false, error: `Error parsing Excel: ${error.message}` });
        }
      };
      
      reader.onerror = () => {
        resolve({ success: false, error: 'Error reading file' });
      };
      
      reader.readAsArrayBuffer(file);
    });
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Store Excel data in Firestore with hierarchical structure
 * Structure: districts/{districtName}/villages/{villageName}/data/{recordId}
 * @param {string} district - District name
 * @param {string} village - Village name
 * @param {Array} records - Array of data records
 * @param {string} uploadedBy - Email of uploader
 * @param {Object} metadata - Additional metadata (filename, fileSize, etc.)
 * @returns {Promise<{success: boolean, recordCount?: number, error?: string}>}
 */
export const storeExcelDataInFirestore = async (district, village, records, uploadedBy, metadata = {}) => {
  try {
    if (!district || !village) {
      return { success: false, error: 'District and village names are required' };
    }
    
    if (!records || records.length === 0) {
      return { success: false, error: 'No data records to store' };
    }
    
    // IMPORTANT: Create district document first to make it queryable
    const districtRef = doc(db, 'districts', district);
    await setDoc(districtRef, {
      name: district,
      lastUpdated: serverTimestamp(),
      hasVillages: true
    }, { merge: true });
    
    // Store village metadata
    const villageRef = doc(db, 'districts', district, 'villages', village);
    await setDoc(villageRef, {
      villageName: village,
      districtName: district,
      recordCount: records.length,
      uploadedBy,
      uploadedAt: serverTimestamp(),
      lastUpdated: serverTimestamp(),
      fileName: metadata.fileName || '',
      fileSize: metadata.fileSize || 0,
      headers: metadata.headers || []
    }, { merge: true });
    
    // Debug: Log the headers and sample data
    console.log('📊 Excel Headers:', metadata.headers);
    console.log('📱 Mobile-related headers:', metadata.headers?.filter(h => 
      h.toLowerCase().includes('mobile') || 
      h.toLowerCase().includes('phone') || 
      h.toLowerCase().includes('contact') ||
      h.toLowerCase().includes('number')
    ));
    console.log('📄 Sample record:', records[0]);
    
    // Use batched writes for better performance (max 500 per batch)
    const batchSize = 500;
    let successCount = 0;
    
    for (let i = 0; i < records.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchRecords = records.slice(i, i + batchSize);
      
      batchRecords.forEach((record, index) => {
        const recordId = `record_${Date.now()}_${i + index}`;
        const recordRef = doc(db, 'districts', district, 'villages', village, 'data', recordId);
        
        // Only store the three required fields: name, mobileNumber, address
        batch.set(recordRef, {
          name: record.name || '',
          mobileNumber: record.mobileNumber || '',
          address: record.address || '',
          uploadedBy,
          uploadedAt: serverTimestamp(),
          districtName: district,
          villageName: village
        });
      });
      
      await batch.commit();
      successCount += batchRecords.length;
    }
    
    return { 
      success: true, 
      recordCount: successCount,
      district,
      village
    };
  } catch (error) {
    console.error('Error storing data in Firestore:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Complete upload process: parse Excel and store in Firestore
 * @param {File} file - The Excel file
 * @param {string} uploadedBy - Email of uploader
 * @param {function} onProgress - Progress callback (optional)
 * @returns {Promise<{success: boolean, district?: string, village?: string, recordCount?: number, error?: string}>}
 */
export const uploadAndStoreExcelData = async (file, uploadedBy, onProgress = null) => {
  try {
    // Step 1: Extract district and village from filename
    if (onProgress) onProgress(10, 'Extracting district and village from filename...');
    const { district, village, error: extractError } = extractDistrictAndVillage(file.name);
    
    if (extractError) {
      return { success: false, error: extractError };
    }
    
    console.log(`📍 Extracted: District="${district}", Village="${village}"`);
    
    // Step 2: Parse Excel file
    if (onProgress) onProgress(30, 'Parsing Excel file...');
    const parseResult = await parseExcelFile(file);
    
    if (!parseResult.success) {
      return { success: false, error: parseResult.error };
    }
    
    console.log(`📊 Parsed ${parseResult.data.length} records from Excel`);
    
    // Step 3: Store in Firestore
    if (onProgress) onProgress(50, `Storing ${parseResult.data.length} records in Firestore...`);
    const storeResult = await storeExcelDataInFirestore(
      district,
      village,
      parseResult.data,
      uploadedBy,
      {
        fileName: file.name,
        fileSize: file.size,
        headers: parseResult.headers
      }
    );
    
    if (!storeResult.success) {
      return { success: false, error: storeResult.error };
    }
    
    if (onProgress) onProgress(100, 'Upload complete!');
    
    return {
      success: true,
      district,
      village,
      recordCount: storeResult.recordCount
    };
  } catch (error) {
    console.error('Error in upload process:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all villages for a district
 * @param {string} district - District name
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getVillagesByDistrict = async (district) => {
  try {
    const villagesRef = collection(db, 'districts', district, 'villages');
    const snapshot = await getDocs(villagesRef);
    
    const villages = [];
    snapshot.forEach(doc => {
      villages.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: villages };
  } catch (error) {
    console.error('Error getting villages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get data for a specific village
 * @param {string} district - District name
 * @param {string} village - Village name
 * @param {number} limit - Maximum number of records to fetch (optional)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getVillageData = async (district, village, limit = null) => {
  try {
    console.log(`Fetching village data for district: ${district}, village: ${village}`);
    
    // Check if village is provided
    let dataRef;
    if (village && village !== 'All Villages') {
      // Get data from a specific village document
      const villageDocRef = doc(db, 'districts', district, 'villages', village);
      dataRef = collection(villageDocRef, 'data');
    } else {
      // Get data from all villages in the district
      dataRef = collection(db, 'districts', district, 'villages');
    }
    let q = dataRef;
    
    if (limit) {
      q = query(dataRef, firestoreLimit(limit));
    }
    
    const snapshot = await getDocs(q);
    
    const data = [];
    snapshot.forEach(doc => {
      data.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data, count: data.length };
  } catch (error) {
    console.error('Error getting village data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get accurate count of records for a district or village
 * @param {string} district - District name
 * @param {string} village - Village name (optional)
 * @returns {Promise<{success: boolean, count: number, error?: string}>}
 */
/**
 * Get all districts that have data in Firestore
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getFirestoreDistricts = async () => {
  try {
    const districtsRef = collection(db, 'districts');
    const snapshot = await getDocs(districtsRef);
    
    const districts = [];
    snapshot.forEach(doc => {
      districts.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Sort alphabetically
    districts.sort((a, b) => a.id.localeCompare(b.id));
    
    return { success: true, data: districts.map(d => d.id) };
  } catch (error) {
    console.error('Error getting Firestore districts:', error);
    return { success: false, error: error.message };
  }
};

export const getAccurateRecordCount = async (district, village = null) => {
  try {
    if (!district) {
      return { success: false, count: 0, error: 'District is required' };
    }

    if (village && village !== 'All Villages') {
      // Get count for specific village
      const villageDocRef = doc(db, 'districts', district, 'villages', village);
      const dataRef = collection(villageDocRef, 'data');
      const snapshot = await getDocs(dataRef);
      return { success: true, count: snapshot.size };
    } else {
      // Get count for all villages in district
      const villagesRef = collection(db, 'districts', district, 'villages');
      const villagesSnapshot = await getDocs(villagesRef);
      
      let totalCount = 0;
      
      // For each village, get the count of its data subcollection
      const countPromises = [];
      villagesSnapshot.forEach(villageDoc => {
        const dataRef = collection(villageDoc.ref, 'data');
        const countPromise = getDocs(dataRef).then(snapshot => snapshot.size);
        countPromises.push(countPromise);
      });
      
      // Wait for all count operations to complete
      const counts = await Promise.all(countPromises);
      totalCount = counts.reduce((sum, count) => sum + count, 0);
      
      return { success: true, count: totalCount };
    }
  } catch (error) {
    console.error('Error getting accurate record count:', error);
    return { success: false, count: 0, error: error.message };
  }
};

/**
 * Delete district data from Firestore
 * @param {string} district - District name
 * @param {string} village - Village name (optional, if not provided will delete all villages in district)
 * @returns {Promise<{success: boolean, deletedCount?: number, error?: string}>}
 */
export const deleteDistrictData = async (district, village = null) => {
  try {
    if (!district) {
      return { success: false, error: 'District name is required' };
    }
    
    let deletedCount = 0;
    
    if (village && village !== 'All Villages') {
      // Delete specific village data
      const villageDocRef = doc(db, 'districts', district, 'villages', village);
      
      // First, delete all records in the village
      const dataRef = collection(villageDocRef, 'data');
      const dataSnapshot = await getDocs(dataRef);
      
      // Count records to be deleted
      deletedCount = dataSnapshot.size;
      
      // Delete each record in batches
      const batchSize = 500;
      const batches = [];
      let batch = writeBatch(db);
      let operationCount = 0;
      
      dataSnapshot.forEach((dataDoc) => {
        batch.delete(dataDoc.ref);
        operationCount++;
        
        if (operationCount === batchSize) {
          batches.push(batch.commit());
          batch = writeBatch(db);
          operationCount = 0;
        }
      });
      
      if (operationCount > 0) {
        batches.push(batch.commit());
      }
      
      // Execute all batches
      await Promise.all(batches);
      
      // Finally delete the village document
      await deleteDoc(villageDocRef);
      
      // Check if there are any villages left in the district
      const checkVillagesRef = collection(db, 'districts', district, 'villages');
      const checkVillagesSnapshot = await getDocs(checkVillagesRef);
      
      let districtDeleted = false;
      
      // If no villages left, delete the district document itself
      if (checkVillagesSnapshot.empty) {
        const districtRef = doc(db, 'districts', district);
        await deleteDoc(districtRef);
        console.log(`✅ Deleted district document for ${district} as it has no more villages`);
        districtDeleted = true;
      }
      
      console.log(`✅ Deleted ${deletedCount} records from ${district}/${village}`);
      
      return { success: true, deletedCount, districtDeleted };
    } else {
      // Delete all villages in the district
      const villagesRef = collection(db, 'districts', district, 'villages');
      const villagesSnapshot = await getDocs(villagesRef);
      
      // For each village, delete all its data
      const deletePromises = [];
      
      villagesSnapshot.forEach(villageDoc => {
        const villageName = villageDoc.id;
        const deletePromise = (async () => {
          // Delete all records in the village
          const dataRef = collection(villageDoc.ref, 'data');
          const dataSnapshot = await getDocs(dataRef);
          
          // Count records
          const villageCount = dataSnapshot.size;
          deletedCount += villageCount;
          
          // Delete each record in batches
          const batchSize = 500;
          const batches = [];
          let batch = writeBatch(db);
          let operationCount = 0;
          
          dataSnapshot.forEach((dataDoc) => {
            batch.delete(dataDoc.ref);
            operationCount++;
            
            if (operationCount === batchSize) {
              batches.push(batch.commit());
              batch = writeBatch(db);
              operationCount = 0;
            }
          });
          
          if (operationCount > 0) {
            batches.push(batch.commit());
          }
          
          // Execute all batches
          await Promise.all(batches);
          
          // Delete the village document
          await deleteDoc(villageDoc.ref);
          
          console.log(`✅ Deleted ${villageCount} records from ${district}/${villageName}`);
        })();
        
        deletePromises.push(deletePromise);
      });
      
      // Wait for all villages to be deleted
      await Promise.all(deletePromises);
      
      // Check if there are any villages left
      const checkVillagesRef = collection(db, 'districts', district, 'villages');
      const checkVillagesSnapshot = await getDocs(checkVillagesRef);
      
      // If no villages left, delete the district document itself
      if (checkVillagesSnapshot.empty) {
        const districtRef = doc(db, 'districts', district);
        await deleteDoc(districtRef);
        console.log(`✅ Deleted district document for ${district} as it has no more villages`);
      }
      
      console.log(`✅ Deleted ${deletedCount} records from ${district} (all villages)`);
      
      return { success: true, deletedCount, districtDeleted: checkVillagesSnapshot.empty };
    }
  } catch (error) {
    console.error('Error deleting district data:', error);
    return { success: false, error: error.message };
  }
};
