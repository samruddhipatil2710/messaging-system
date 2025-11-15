/**
 * Bulk Upload Script for All Sangli District Files
 * 
 * This script uploads all Excel files from a folder to Firebase Storage
 * and then processes them to Firestore
 * 
 * Usage: node uploadAllSangliFiles.js
 */

import { initializeApp } from 'firebase/app';
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { getFirestore, collection, writeBatch, doc, serverTimestamp, setDoc, getDoc } from 'firebase/firestore';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9KuV5Ef8EGAqZ321HmhFDKQ3S3Yh-3E4",
  authDomain: "messaging-system-s.firebaseapp.com",
  projectId: "messaging-system-s",
  storageBucket: "messaging-system-s.firebasestorage.app",
  messagingSenderId: "449926371629",
  appId: "1:449926371629:web:b46bf093fae3d6312cdba4"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const storage = getStorage(app);
const db = getFirestore(app);

// ==================== CONFIGURATION ====================

// Folder path containing all Excel files
const FOLDER_PATH = "D:\\MSEB Project\\MSEB_DATA 2025 NOV\\SANGLI..=";

// Your email
const UPLOADED_BY = "samruddhipatil415@gmail.com";

// District name
const DISTRICT_NAME = "Sangli";

// File extensions to process
const VALID_EXTENSIONS = ['.xls', '.xlsx', '.XLS', '.XLSX'];

// ==================== HELPER FUNCTIONS ====================

/**
 * Sanitize name for Firestore document ID (remove invalid characters)
 */
function sanitizeName(name) {
  if (!name) return 'UNKNOWN';
  // Replace forward slashes and other invalid characters with underscore
  return name
    .replace(/\//g, '_')  // Replace / with _
    .replace(/\\/g, '_')  // Replace \ with _
    .replace(/\./g, '_')  // Replace . with _
    .trim();
}

/**
 * Parse address to extract district and city
 */
function parseAddress(address) {
  if (!address) return { district: '', city: '' };
  
  const parts = address.split(',').map(part => part.trim());
  
  let district = '';
  let city = '';
  
  if (parts.length >= 2) {
    city = parts[0] || '';
    district = parts[1] || '';
  } else if (parts.length === 1) {
    city = parts[0] || '';
  }
  
  // Sanitize names for Firestore
  return { 
    district: sanitizeName(district), 
    city: sanitizeName(city) 
  };
}

/**
 * Get all Excel files from folder
 */
function getExcelFiles(folderPath) {
  try {
    const files = fs.readdirSync(folderPath);
    const excelFiles = files.filter(file => {
      const ext = path.extname(file);
      return VALID_EXTENSIONS.includes(ext);
    });
    
    return excelFiles.map(file => path.join(folderPath, file));
  } catch (error) {
    console.error('Error reading folder:', error);
    return [];
  }
}

/**
 * Upload file to Firebase Storage
 */
async function uploadToStorage(filePath, uploadedBy) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = path.basename(filePath);
    const timestamp = Date.now();
    const storagePath = `consumer-uploads/${uploadedBy.replace(/[@.]/g, '_')}_${timestamp}_${fileName}`;
    
    const storageRef = ref(storage, storagePath);
    
    console.log(`  Uploading: ${fileName}`);
    console.log(`  Size: ${(fileBuffer.length / (1024 * 1024)).toFixed(2)} MB`);
    
    const uploadTask = uploadBytesResumable(storageRef, fileBuffer);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          process.stdout.write(`\r  Upload Progress: ${progress.toFixed(2)}%`);
        },
        (error) => {
          console.error('\n  ❌ Upload Error:', error);
          reject(error);
        },
        async () => {
          console.log('\n  ✅ Upload Complete!\n');
          const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
          
          const statusDoc = {
            fileName: fileName,
            storagePath: storagePath,
            downloadURL: downloadURL,
            uploadedBy: uploadedBy,
            uploadedAt: serverTimestamp(),
            fileSize: fileBuffer.length,
            status: 'uploaded',
            processedRecords: 0,
            totalRecords: 0,
            district: DISTRICT_NAME,
            errors: []
          };
          
          const statusRef = doc(db, 'uploadProcessingStatus', `${timestamp}_${fileName}`);
          await setDoc(statusRef, statusDoc);
          
          resolve({
            downloadURL,
            storagePath,
            fileName,
            statusDocId: `${timestamp}_${fileName}`
          });
        }
      );
    });
  } catch (error) {
    console.error('  ❌ Error uploading to storage:', error);
    throw error;
  }
}

/**
 * Process Excel file to Firestore with hierarchical structure
 * Structure: excelData/{district}/cities/{city}/consumers/{consumerId}
 */
async function processToFirestore(filePath, uploadedBy, statusDocId) {
  try {
    console.log('  📊 Processing to Firestore...\n');
    
    // Read Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    const totalRecords = jsonData.length;
    console.log(`  ✅ Found ${totalRecords.toLocaleString('en-IN')} records\n`);
    
    if (totalRecords === 0) {
      console.log('  ⚠️  No records found in file, skipping...\n');
      return { success: true, totalRecords: 0, processedRecords: 0, errors: [], districts: [] };
    }
    
    // Update status with total records
    const statusRef = doc(db, 'uploadProcessingStatus', statusDocId);
    await setDoc(statusRef, {
      totalRecords: totalRecords,
      status: 'processing',
      startedProcessingAt: serverTimestamp()
    }, { merge: true });
    
    // Group data by district and city
    const hierarchicalData = new Map(); // district -> city -> consumers[]
    const errors = [];
    
    jsonData.forEach((row, index) => {
      try {
        // Parse address - handle multiple possible column names
        const addressField = row.address || row.Address || row.ADDRESS || 
                            row['Consumer Address'] || row['CONSUMER ADDRESS'] || '';
        const { district, city } = parseAddress(addressField);
        
        // Get consumer name - handle multiple possible column names
        const consumerName = row.consumerName || row['Consumer Name'] || row['CONSUMER NAME'] ||
                            row.name || row.Name || row.NAME || '';
        
        // Get consumer number - handle multiple possible column names
        const consumerNumber = row.consumerNumber || row['Consumer Number'] || row['CONSUMER NUMBER'] ||
                              row.number || row.Number || row.NUMBER || 
                              row['Consumer No'] || row['CONSUMER NO'] || '';
        
        // Get phone - handle multiple possible column names
        const phone = row.phone || row.Phone || row.PHONE || 
                     row['Phone Number'] || row['PHONE NUMBER'] || '';
        
        // Get taluka - handle multiple possible column names
        const taluka = row.taluka || row.Taluka || row.TALUKA || '';
        
        const districtKey = district || DISTRICT_NAME || 'UNKNOWN';
        const cityKey = city || 'UNKNOWN';
        
        // Create consumer document with all fields from image
        const consumerDoc = {
          name: String(consumerName).trim(),
          phone: String(phone).trim(),
          address: addressField,
          city: cityKey,
          district: districtKey,
          taluka: taluka || 'UNKNOWN',
          source: 'mseb_import',
          sourceDistrict: DISTRICT_NAME,
          sourceFile: path.basename(filePath),
          uploadedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        // Initialize district if not exists
        if (!hierarchicalData.has(districtKey)) {
          hierarchicalData.set(districtKey, new Map());
        }
        
        // Initialize city if not exists
        const districtData = hierarchicalData.get(districtKey);
        if (!districtData.has(cityKey)) {
          districtData.set(cityKey, []);
        }
        
        // Add consumer to city
        districtData.get(cityKey).push(consumerDoc);
        
      } catch (error) {
        errors.push({
          row: index,
          error: error.message,
          data: row
        });
      }
    });
    
    console.log(`  📊 Organized into ${hierarchicalData.size} districts\n`);
    
    // Process hierarchical data
    let processedCount = 0;
    const BATCH_SIZE = 500;
    
    for (const [districtName, citiesMap] of hierarchicalData.entries()) {
      console.log(`  📍 Processing District: ${districtName}`);
      
      // Create district document first
      const districtDocRef = doc(db, 'excelData', districtName);
      await setDoc(districtDocRef, {
        districtName: districtName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      for (const [cityName, consumers] of citiesMap.entries()) {
        console.log(`    🏙️  Processing City: ${cityName} (${consumers.length} consumers)`);
        
        // Create city document first
        const cityDocRef = doc(db, 'excelData', districtName, 'cities', cityName);
        await setDoc(cityDocRef, {
          cityName: cityName,
          consumerCount: consumers.length,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Process consumers in batches
        for (let i = 0; i < consumers.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const batchConsumers = consumers.slice(i, i + BATCH_SIZE);
          
          batchConsumers.forEach((consumer) => {
            // Create path: excelData/{district}/cities/{city}/consumers/{auto-id}
            const consumerRef = doc(collection(db, 'excelData', districtName, 'cities', cityName, 'consumers'));
            batch.set(consumerRef, consumer);
          });
          
          await batch.commit();
          processedCount += batchConsumers.length;
          
          const progress = (processedCount / totalRecords) * 100;
          process.stdout.write(
            `\r      Processed: ${processedCount.toLocaleString('en-IN')}/${totalRecords.toLocaleString('en-IN')} | ` +
            `Progress: ${progress.toFixed(2)}%`
          );
          
          // Small delay
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        
        console.log(''); // New line after city processing
      }
    }
    
    console.log('\n');
    
    // Update district statistics in separate collection
    for (const [district, citiesMap] of hierarchicalData.entries()) {
      const districtRef = doc(db, 'districts', district);
      const districtDoc = await getDoc(districtRef);
      
      let totalConsumers = 0;
      for (const consumers of citiesMap.values()) {
        totalConsumers += consumers.length;
      }
      
      if (districtDoc.exists()) {
        const currentData = districtDoc.data();
        const currentCount = currentData.totalConsumers || 0;
        const mlaUploads = currentData.mlaUploads || {};
        mlaUploads[uploadedBy] = (mlaUploads[uploadedBy] || 0) + totalConsumers;
        
        await setDoc(districtRef, {
          totalConsumers: currentCount + totalConsumers,
          mlaUploads: mlaUploads,
          lastUpdated: serverTimestamp()
        }, { merge: true });
      } else {
        await setDoc(districtRef, {
          districtName: district,
          totalConsumers: totalConsumers,
          mlaUploads: {
            [uploadedBy]: totalConsumers
          },
          createdAt: serverTimestamp(),
          lastUpdated: serverTimestamp()
        });
      }
    }
    
    // Mark as completed
    await setDoc(statusRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      processedRecords: processedCount,
      errors: errors
    }, { merge: true });
    
    console.log('  ✅ Processing Complete!\n');
    
    return {
      success: true,
      totalRecords: totalRecords,
      processedRecords: processedCount,
      errors: errors,
      districts: Array.from(hierarchicalData.keys())
    };
    
  } catch (error) {
    console.error('\n  ❌ Error processing file:', error);
    
    const statusRef = doc(db, 'uploadProcessingStatus', statusDocId);
    await setDoc(statusRef, {
      status: 'failed',
      completedAt: serverTimestamp(),
      errors: [{ error: error.message }]
    }, { merge: true });
    
    throw error;
  }
}

/**
 * Process single file
 */
async function processSingleFile(filePath, fileNumber, totalFiles) {
  const fileName = path.basename(filePath);
  
  console.log('\n' + '='.repeat(70));
  console.log(`📁 File ${fileNumber}/${totalFiles}: ${fileName}`);
  console.log('='.repeat(70) + '\n');
  
  try {
    // Step 1: Upload to Storage
    console.log('📤 Step 1: Uploading to Firebase Storage...\n');
    const uploadResult = await uploadToStorage(filePath, UPLOADED_BY);
    
    // Step 2: Process to Firestore
    console.log('📊 Step 2: Processing to Firestore...\n');
    const processResult = await processToFirestore(filePath, UPLOADED_BY, uploadResult.statusDocId);
    
    return {
      fileName: fileName,
      success: true,
      ...processResult
    };
    
  } catch (error) {
    console.error(`\n❌ Failed to process ${fileName}:`, error.message);
    return {
      fileName: fileName,
      success: false,
      error: error.message
    };
  }
}

/**
 * Main function
 */
async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════════════╗');
  console.log('║   Bulk Upload - All Sangli District Files to Firebase             ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝\n');
  
  try {
    // Check if folder exists
    if (!fs.existsSync(FOLDER_PATH)) {
      console.error(`❌ Folder not found: ${FOLDER_PATH}`);
      process.exit(1);
    }
    
    // Get all Excel files
    console.log('🔍 Scanning folder for Excel files...\n');
    const excelFiles = getExcelFiles(FOLDER_PATH);
    
    if (excelFiles.length === 0) {
      console.log('❌ No Excel files found in folder!');
      process.exit(1);
    }
    
    console.log(`✅ Found ${excelFiles.length} Excel files\n`);
    console.log(`📍 Folder: ${FOLDER_PATH}`);
    console.log(`👤 Uploaded By: ${UPLOADED_BY}`);
    console.log(`🏛️  District: ${DISTRICT_NAME}\n`);
    
    const startTime = Date.now();
    const results = [];
    
    // Process each file
    for (let i = 0; i < excelFiles.length; i++) {
      const result = await processSingleFile(excelFiles[i], i + 1, excelFiles.length);
      results.push(result);
      
      // Small delay between files
      if (i < excelFiles.length - 1) {
        console.log('\n⏳ Waiting 2 seconds before next file...\n');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const endTime = Date.now();
    const totalTime = ((endTime - startTime) / 1000 / 60).toFixed(2);
    
    // Final Summary
    console.log('\n' + '='.repeat(70));
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                        FINAL SUMMARY                               ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝\n');
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    const totalRecords = results.reduce((sum, r) => sum + (r.totalRecords || 0), 0);
    const totalProcessed = results.reduce((sum, r) => sum + (r.processedRecords || 0), 0);
    const totalErrors = results.reduce((sum, r) => sum + (r.errors?.length || 0), 0);
    
    console.log(`📊 Total Files: ${excelFiles.length}`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${failCount}`);
    console.log(`📈 Total Records: ${totalRecords.toLocaleString('en-IN')}`);
    console.log(`✅ Processed: ${totalProcessed.toLocaleString('en-IN')}`);
    console.log(`⚠️  Errors: ${totalErrors}`);
    console.log(`⏱️  Total Time: ${totalTime} minutes\n`);
    
    // Show individual file results
    console.log('📋 Individual File Results:\n');
    results.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      const records = result.processedRecords || 0;
      console.log(`  ${status} ${index + 1}. ${result.fileName} - ${records.toLocaleString('en-IN')} records`);
    });
    
    // Show failed files if any
    const failedFiles = results.filter(r => !r.success);
    if (failedFiles.length > 0) {
      console.log('\n⚠️  Failed Files:\n');
      failedFiles.forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.fileName}`);
        console.log(`     Error: ${result.error}\n`);
      });
    }
    
    console.log('\n✅ Bulk upload completed!\n');
    console.log('🔍 You can verify the data in Firebase Console:');
    console.log('   - Firestore → excelData collection (hierarchical structure)');
    console.log('   - Structure: excelData/{district}/cities/{city}/consumers/{consumerId}');
    console.log('   - Firestore → districts collection (statistics)');
    console.log('   - Storage → consumer-uploads folder\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Bulk Upload Failed:', error.message);
    console.error('\nFull Error:', error);
    process.exit(1);
  }
}

// Run the script
main();
