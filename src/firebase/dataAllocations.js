import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc,
  doc,
  query, 
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './config';

const DATA_ALLOCATIONS_COLLECTION = 'dataAllocations';

/**
 * Create a new data allocation
 * @param {Object} allocationData - Allocation details
 * @returns {Promise<{success: boolean, id?: string, error?: string}>}
 */
export const createDataAllocation = async (allocationData) => {
  try {
    const allocation = {
      ...allocationData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, DATA_ALLOCATIONS_COLLECTION), allocation);
    
    console.log('✅ Data allocation created:', docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating data allocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all data allocations
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllDataAllocations = async () => {
  try {
    const q = query(
      collection(db, DATA_ALLOCATIONS_COLLECTION),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const allocations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allocations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting data allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocations for a specific user
 * @param {string} userEmail - User's email
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getUserAllocations = async (userEmail) => {
  try {
    const q = query(
      collection(db, DATA_ALLOCATIONS_COLLECTION),
      where('allocatedTo', '==', userEmail),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const allocations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allocations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting user allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocations by allocator (who allocated)
 * @param {string} allocatorEmail - Allocator's email
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllocationsByAllocator = async (allocatorEmail) => {
  try {
    const q = query(
      collection(db, DATA_ALLOCATIONS_COLLECTION),
      where('allocatedBy', '==', allocatorEmail),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    const allocations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allocations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting allocations by allocator:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocations by district
 * @param {string} district - District name
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllocationsByDistrict = async (district) => {
  try {
    const q = query(
      collection(db, DATA_ALLOCATIONS_COLLECTION),
      where('district', '==', district),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const allocations = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      allocations.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting allocations by district:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Update allocation status
 * @param {string} allocationId - Allocation document ID
 * @param {string} status - New status ('active', 'expired', 'revoked')
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const updateAllocationStatus = async (allocationId, status) => {
  try {
    await updateDoc(doc(db, DATA_ALLOCATIONS_COLLECTION, allocationId), {
      status,
      updatedAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating allocation status:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Delete allocation
 * @param {string} allocationId - Allocation document ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteAllocation = async (allocationId) => {
  try {
    await deleteDoc(doc(db, DATA_ALLOCATIONS_COLLECTION, allocationId));
    
    console.log('✅ Allocation deleted:', allocationId);
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting allocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocation by ID
 * @param {string} allocationId - Allocation document ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getAllocationById = async (allocationId) => {
  try {
    const allocationDoc = await getDoc(doc(db, DATA_ALLOCATIONS_COLLECTION, allocationId));
    
    if (!allocationDoc.exists()) {
      return { success: false, error: 'Allocation not found' };
    }
    
    const data = allocationDoc.data();
    return {
      success: true,
      data: {
        id: allocationDoc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      }
    };
  } catch (error) {
    console.error('Error getting allocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's allocated files with details
 * @param {string} userEmail - User's email
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getUserAllocatedFilesWithDetails = async (userEmail) => {
  try {
    // Get user's allocations
    const allocationsResult = await getUserAllocations(userEmail);
    
    if (!allocationsResult.success) {
      return allocationsResult;
    }
    
    // Get file details for each allocation
    const { getFileById } = await import('./storage');
    
    const filesWithDetails = [];
    
    for (const allocation of allocationsResult.data) {
      for (const fileId of allocation.fileIds || []) {
        const fileResult = await getFileById(fileId);
        if (fileResult.success) {
          filesWithDetails.push({
            ...fileResult.data,
            allocationId: allocation.id,
            allocatedBy: allocation.allocatedBy,
            startDate: allocation.startDate,
            endDate: allocation.endDate
          });
        }
      }
    }
    
    return { success: true, data: filesWithDetails };
  } catch (error) {
    console.error('Error getting user allocated files:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if user has access to a specific file
 * @param {string} userEmail - User's email
 * @param {string} fileId - File ID
 * @returns {Promise<{success: boolean, hasAccess: boolean, error?: string}>}
 */
export const checkUserFileAccess = async (userEmail, fileId) => {
  try {
    const allocationsResult = await getUserAllocations(userEmail);
    
    if (!allocationsResult.success) {
      return { success: false, hasAccess: false, error: allocationsResult.error };
    }
    
    // Check if any allocation includes this file
    const hasAccess = allocationsResult.data.some(allocation => 
      allocation.fileIds?.includes(fileId)
    );
    
    return { success: true, hasAccess };
  } catch (error) {
    console.error('Error checking file access:', error);
    return { success: false, hasAccess: false, error: error.message };
  }
};
