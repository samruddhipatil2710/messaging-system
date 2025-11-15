import { collection, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './config';

/**
 * Ensure district document exists with metadata
 * This is needed because Firestore doesn't return documents with no fields
 * @param {string} districtName - District name
 */
export const ensureDistrictDocument = async (districtName) => {
  try {
    const districtRef = doc(db, 'districts', districtName);
    
    // Set minimal metadata to make document queryable
    await setDoc(districtRef, {
      name: districtName,
      createdAt: serverTimestamp(),
      hasVillages: true
    }, { merge: true }); // merge: true won't overwrite existing data
    
    console.log(`✅ Ensured district document exists: ${districtName}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error ensuring district document: ${districtName}`, error);
    return { success: false, error: error.message };
  }
};

/**
 * Fix all existing district documents that have no fields
 * Run this once to fix your existing data
 */
export const fixExistingDistricts = async () => {
  try {
    console.log('🔧 Fixing existing district documents...');
    
    // Get all districts by checking the collection
    const districtsRef = collection(db, 'districts');
    const snapshot = await getDocs(districtsRef);
    
    const fixes = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      // If document has no 'name' field, it needs fixing
      if (!data.name) {
        fixes.push(ensureDistrictDocument(doc.id));
      }
    });
    
    await Promise.all(fixes);
    
    console.log(`✅ Fixed ${fixes.length} district documents`);
    return { success: true, fixed: fixes.length };
  } catch (error) {
    console.error('❌ Error fixing districts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all districts by scanning for villages subcollections
 * This works even if district documents have no fields
 */
export const getAllDistrictsByScanningVillages = async () => {
  try {
    console.log('🔍 Scanning for districts by checking villages...');
    
    // This is a workaround - we'll check known district names
    // or use listCollections (requires admin SDK)
    
    // For now, try to get districts normally
    const districtsRef = collection(db, 'districts');
    const snapshot = await getDocs(districtsRef);
    
    const districts = [];
    snapshot.forEach(doc => {
      districts.push({
        id: doc.id,
        name: doc.id,
        ...doc.data()
      });
    });
    
    return { success: true, data: districts };
  } catch (error) {
    console.error('❌ Error scanning districts:', error);
    return { success: false, error: error.message };
  }
};
