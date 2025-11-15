import { 
  collection, 
  doc,
  getDocs,
  setDoc,
  getDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './config';

/**
 * Get districts from Firestore based on user role and allocations
 * @param {string} [userId] - Optional user ID to filter districts by allocation
 * @param {string} [userRole] - Optional user role to filter districts by hierarchy
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllDistricts = async (userId, userRole) => {
  try {
    console.log(`Fetching districts for user ${userId || 'unknown'} with role ${userRole || 'unknown'}`);
    
    // Get all district documents that exist in Firestore first
    const districtsRef = collection(db, 'districts');
    const snapshot = await getDocs(districtsRef);
    
    // Create a set of all valid district names
    const allValidDistricts = new Set();
    snapshot.forEach(doc => {
      allValidDistricts.add(doc.id);
    });
    
    console.log(`Found ${allValidDistricts.size} total district documents in Firestore`);
    
    let userAllocatedDistricts = new Set();
    
    // If no userId or role provided, return all districts (for main_admin)
    if (!userId && !userRole) {
      console.log('No user ID or role provided, returning all districts');
      
      // Convert Set to array of district objects
      const districts = Array.from(allValidDistricts).map(districtName => ({
        id: districtName,
        name: districtName
      }));
      
      // Sort districts alphabetically
      districts.sort((a, b) => a.name.localeCompare(b.name));
      
      return { success: true, data: districts };
    }
    
    // For main_admin, return all districts
    if (userRole === 'main_admin') {
      console.log('User is main_admin, returning all districts');
      
      // Convert Set to array of district objects
      const districts = Array.from(allValidDistricts).map(districtName => ({
        id: districtName,
        name: districtName
      }));
      
      // Sort districts alphabetically
      districts.sort((a, b) => a.name.localeCompare(b.name));
      
      return { success: true, data: districts };
    }
    
    // For other roles, get their allocations
    if (userId) {
      console.log(`Getting allocated districts for user ${userId}`);
      
      // Get user's direct allocations
      const userAllocationsResult = await getAllocationsByUserId(userId);
      
      if (userAllocationsResult.success) {
        userAllocationsResult.data.forEach(allocation => {
          if (allocation.district && allValidDistricts.has(allocation.district)) {
            userAllocatedDistricts.add(allocation.district);
          }
        });
      }
      
      console.log(`User has ${userAllocatedDistricts.size} directly allocated districts`);
    }
    
    // Convert Set to array of district objects
    const districts = Array.from(userAllocatedDistricts).map(districtName => ({
      id: districtName,
      name: districtName
    }));
    
    // Sort districts alphabetically
    districts.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Returning ${districts.length} districts for user: ${districts.map(d => d.name).join(', ')}`);
    
    return { success: true, data: districts };
  } catch (error) {
    console.error('Error getting districts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get villages for a specific district based on user role and allocations
 * @param {string} district - District name
 * @param {string} [userId] - Optional user ID to filter villages by allocation
 * @param {string} [userRole] - Optional user role to filter villages by hierarchy
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getVillagesByDistrict = async (district, userId, userRole) => {
  try {
    console.log(`Fetching villages for district: ${district} for user ${userId || 'unknown'} with role ${userRole || 'unknown'}`);
    
    // First get all villages that exist in this district
    const villagesRef = collection(db, 'districts', district, 'villages');
    const snapshot = await getDocs(villagesRef);
    
    // Create a set of all valid village names in this district
    const allValidVillages = new Set();
    snapshot.forEach(doc => {
      allValidVillages.add(doc.id);
    });
    
    console.log(`Found ${allValidVillages.size} total villages in district ${district}`);
    
    // If no userId or role provided, or if user is main_admin, return all villages
    if (!userId || !userRole || userRole === 'main_admin') {
      console.log(`Returning all villages for ${userRole || 'unknown'} role`);
      
      // Convert Set to array of village objects
      const villages = Array.from(allValidVillages).map(villageName => ({
        id: villageName,
        name: villageName,
        villageName: villageName
      }));
      
      // Sort villages alphabetically
      villages.sort((a, b) => a.name.localeCompare(b.name));
      return { success: true, data: villages };
    }
    
    // For other roles, get their allocations for this district
    console.log(`Getting allocated villages for user ${userId} in district ${district}`);
    
    // Get user's direct allocations
    const userAllocationsResult = await getAllocationsByUserId(userId);
    
    // Filter allocations to only include this district
    const districtAllocations = userAllocationsResult.success 
      ? userAllocationsResult.data.filter(a => a.district === district)
      : [];
    
    console.log(`User has ${districtAllocations.length} allocations for district ${district}`);
    
    // Extract villages from allocations
    const userAllocatedVillages = new Set();
    
    districtAllocations.forEach(allocation => {
      // Handle both old format (villages array) and new format (city/village field)
      if (allocation.villages && Array.isArray(allocation.villages)) {
        allocation.villages.forEach(village => {
          if (allValidVillages.has(village)) {
            userAllocatedVillages.add(village);
          }
        });
      } else if (allocation.city && allValidVillages.has(allocation.city)) {
        userAllocatedVillages.add(allocation.city);
      } else if (allocation.village && allValidVillages.has(allocation.village)) {
        userAllocatedVillages.add(allocation.village);
      }
    });
    
    console.log(`User has ${userAllocatedVillages.size} allocated villages in district ${district}`);
    
    // Convert Set to array of village objects
    const villages = Array.from(userAllocatedVillages).map(villageName => ({
      id: villageName,
      name: villageName,
      villageName: villageName
    }));
    
    // Sort villages alphabetically
    villages.sort((a, b) => a.name.localeCompare(b.name));
    
    // If we found no allocated villages but there are valid villages, check old structure
    if (villages.length === 0 && allValidVillages.size > 0) {
      console.log('No villages found in new structure, checking old structure...');
      
      // Check if district exists in the old structure
      const districtFilesRef = collection(db, 'districtFiles');
      const q = query(districtFilesRef, where('district', '==', district));
      const filesSnapshot = await getDocs(q);
      
      // Group by location (village/taluka)
      const locationMap = new Map();
      filesSnapshot.forEach(doc => {
        const data = doc.data();
        const location = data.location || data.taluka || data.village || 'Unknown';
        
        if (!locationMap.has(location)) {
          locationMap.set(location, {
            id: location,
            name: location,
            villageName: location,
            recordCount: 0,
            uploadedAt: data.uploadedAt,
            uploadedBy: data.uploadedBy,
            files: []
          });
        }
        
        const locationData = locationMap.get(location);
        locationData.files.push({
          id: doc.id,
          fileName: data.fileName,
          month: data.month
        });
      });
      
      // Convert Map to array
      const oldStructureVillages = [];
      locationMap.forEach(location => {
        oldStructureVillages.push(location);
      });
      
      // Filter old structure villages by user allocations if needed
      if (userId && userRole !== 'main_admin') {
        // Only return villages that are allocated to this user
        const allocatedVillageNames = new Set(Array.from(userAllocatedVillages));
        return { 
          success: true, 
          data: oldStructureVillages.filter(v => allocatedVillageNames.has(v.name))
        };
      }
      
      return { success: true, data: oldStructureVillages };
    }
    
    return { success: true, data: villages };
  } catch (error) {
    console.error('Error getting villages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Allocate district and villages to a user
 * Structure: userAllocations/{userId}/allocations/{allocationId}
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} district - District name
 * @param {Array<string|Object>} villages - Array of village names or objects with {name, startDate, endDate}
 * @param {string} allocatedBy - Email of person allocating
 * @param {string} startDate - Optional start date for the allocation
 * @param {string} endDate - Optional end date for the allocation
 * @returns {Promise<{success: boolean, allocationId?: string, error?: string}>}
 */
export const allocateDataToUser = async (userId, userEmail, district, villages, allocatedBy, startDate = null, endDate = null) => {
  try {
    if (!userId || !district || !villages || villages.length === 0) {
      return { success: false, error: 'Missing required fields' };
    }
    
    console.log(`🔄 Allocating data to user ${userEmail}:`, { district, villages, allocatedBy, startDate, endDate });
    
    // Get village data to calculate counts
    const { getVillageData } = await import('./excelStorage');
    const allocationIds = [];
    
    // Create individual allocation for each village
    for (const village of villages) {
      try {
        // Handle both string and object format for villages
        const villageName = typeof village === 'string' ? village : village.name;
        const villageStartDate = typeof village === 'object' && village.startDate ? village.startDate : startDate;
        const villageEndDate = typeof village === 'object' && village.endDate ? village.endDate : endDate;
        
        // Get village data to calculate count
        const villageDataResult = await getVillageData(district, villageName);
        const count = villageDataResult.success ? (villageDataResult.data?.length || 0) : 0;
        
        const allocationId = `${district}_${villageName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const allocationRef = doc(db, 'userAllocations', userId, 'allocations', allocationId);
        
        const allocationData = {
          userId,
          userEmail,
          district,
          city: villageName, // Store as 'city' to match expected structure
          village: villageName, // Keep village for backward compatibility
          count: count,
          allocatedBy,
          allocatedAt: serverTimestamp(),
          status: 'active'
        };

        // Add date fields if provided
        if (villageStartDate) {
          allocationData.startDate = villageStartDate;
        }
        if (villageEndDate) {
          allocationData.endDate = villageEndDate;
        }
        
        await setDoc(allocationRef, allocationData);
        
        allocationIds.push(allocationId);
        console.log(`✅ Allocated village ${villageName} (${count} people) in ${district} to user ${userEmail}${villageStartDate && villageEndDate ? ` from ${villageStartDate} to ${villageEndDate}` : ''}`);
        
      } catch (villageError) {
        console.error(`Error allocating village ${typeof village === 'string' ? village : village.name}:`, villageError);
        // Continue with other villages even if one fails
      }
    }
    
    console.log(`✅ Successfully allocated ${allocationIds.length}/${villages.length} villages to user ${userEmail}`);
    
    return { success: true, allocationIds, allocatedCount: allocationIds.length };
  } catch (error) {
    console.error('Error allocating data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all allocations for a user
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getUserAllocations = async (userId) => {
  try {
    const allocationsRef = collection(db, 'userAllocations', userId, 'allocations');
    const snapshot = await getDocs(allocationsRef);
    
    const allocations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      allocations.push({
        id: doc.id,
        ...data,
        allocatedAt: data.allocatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    
    // Sort by allocation date (newest first)
    allocations.sort((a, b) => new Date(b.allocatedAt) - new Date(a.allocatedAt));
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting user allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all users who have allocations
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllUsersWithAllocations = async () => {
  try {
    const usersRef = collection(db, 'userAllocations');
    const snapshot = await getDocs(usersRef);
    
    const users = [];
    for (const userDoc of snapshot.docs) {
      const userId = userDoc.id;
      const allocationsResult = await getUserAllocations(userId);
      
      if (allocationsResult.success && allocationsResult.data.length > 0) {
        users.push({
          userId,
          allocations: allocationsResult.data,
          totalAllocations: allocationsResult.data.length
        });
      }
    }
    
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting users with allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Remove an allocation
 * @param {string} userId - User ID
 * @param {string} allocationId - Allocation ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const removeAllocation = async (userId, allocationId) => {
  try {
    const allocationRef = doc(db, 'userAllocations', userId, 'allocations', allocationId);
    await deleteDoc(allocationRef);
    
    console.log(`✅ Removed allocation ${allocationId} for user ${userId}`);
    
    return { success: true };
  } catch (error) {
    console.error('Error removing allocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get data for allocated villages
 * @param {string} district - District name
 * @param {Array<string>} villages - Array of village names
 * @param {number} limit - Maximum records per village (optional)
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getAllocatedData = async (district, villages, limit = null) => {
  try {
    const data = {};
    
    for (const village of villages) {
      const dataRef = collection(db, 'districts', district, 'villages', village, 'data');
      let q = dataRef;
      
      if (limit) {
        q = query(dataRef, limit(limit));
      }
      
      const snapshot = await getDocs(q);
      
      const records = [];
      snapshot.forEach(doc => {
        records.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      data[village] = records;
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Error getting allocated data:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if a village is already allocated to a user
 * @param {string} userId - User ID
 * @param {string} district - District name
 * @param {string} village - Village name
 * @returns {Promise<{success: boolean, isAllocated?: boolean, error?: string}>}
 */
export const isVillageAllocated = async (userId, district, village) => {
  try {
    const allocationsResult = await getUserAllocations(userId);
    
    if (!allocationsResult.success) {
      return allocationsResult;
    }
    
    const isAllocated = allocationsResult.data.some(allocation => {
      if (allocation.district !== district) return false;
      
      // Handle both old and new allocation formats
      if (allocation.villages && Array.isArray(allocation.villages)) {
        return allocation.villages.includes(village);
      } else if (allocation.city) {
        return allocation.city === village;
      }
      return false;
    });
    
    return { success: true, isAllocated };
  } catch (error) {
    console.error('Error checking village allocation:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocation summary for a user
 * @param {string} userId - User ID
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const getUserAllocationSummary = async (userId) => {
  try {
    const allocationsResult = await getUserAllocations(userId);
    
    if (!allocationsResult.success) {
      return allocationsResult;
    }
    
    const summary = {
      totalAllocations: allocationsResult.data.length,
      totalDistricts: new Set(allocationsResult.data.map(a => a.district)).size,
      totalVillages: allocationsResult.data.reduce((sum, a) => sum + a.villageCount, 0),
      byDistrict: {}
    };
    
    allocationsResult.data.forEach(allocation => {
      if (!summary.byDistrict[allocation.district]) {
        summary.byDistrict[allocation.district] = {
          villages: [],
          count: 0
        };
      }
      
      // Handle both old and new allocation formats
      if (allocation.villages && Array.isArray(allocation.villages)) {
        // Old format: villages array
        summary.byDistrict[allocation.district].villages.push(...allocation.villages);
        summary.byDistrict[allocation.district].count += allocation.villageCount || allocation.villages.length;
      } else if (allocation.city) {
        // New format: single city
        summary.byDistrict[allocation.district].villages.push(allocation.city);
        summary.byDistrict[allocation.district].count += allocation.count || 1;
      }
    });
    
    return { success: true, data: summary };
  } catch (error) {
    console.error('Error getting allocation summary:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all allocations for users created by a specific user (for Super Admin/Admin)
 * @param {string} creatorEmail - Email of the user who created the users
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllocationsByCreator = async (creatorEmail) => {
  try {
    console.log('getAllocationsByCreator called with:', creatorEmail);
    
    // Get all users and find creator's role
    const { getAllUsers, getUserByEmail } = await import('./firestore');
    const usersResult = await getAllUsers();
    const creatorResult = await getUserByEmail(creatorEmail);
    
    console.log('Total users fetched:', usersResult.data?.length);
    
    if (!usersResult.success || !creatorResult.success) {
      return { success: false, error: 'Failed to fetch users or creator info' };
    }
    
    const creatorRole = creatorResult.data.role;
    console.log('Creator role:', creatorRole);
    
    let targetUsers = [];
    
    if (creatorRole === 'main_admin') {
      // Main Admin sees allocations for all users
      targetUsers = usersResult.data.filter(u => u.role === 'user');
    } else if (creatorRole === 'super_admin') {
      // Super Admin sees allocations for:
      // 1. Users created directly by them
      // 2. Users created by admins under them
      const directUsers = usersResult.data.filter(u => u.createdBy === creatorEmail);
      const adminEmails = usersResult.data
        .filter(u => u.role === 'admin' && u.createdBy === creatorEmail)
        .map(u => u.email);
      const indirectUsers = usersResult.data.filter(u => 
        u.role === 'user' && adminEmails.includes(u.createdBy)
      );
      targetUsers = [...directUsers, ...indirectUsers];
    } else if (creatorRole === 'admin') {
      // Admin sees allocations only for users they created
      targetUsers = usersResult.data.filter(u => u.createdBy === creatorEmail);
    }
    
    console.log('Target users for allocations:', targetUsers.length);
    console.log('Target users:', targetUsers.map(u => ({ id: u.id, name: u.name, email: u.email })));
    
    // Get allocations for each target user
    const allAllocations = [];
    
    for (const user of targetUsers) {
      console.log('Checking allocations for user:', user.id, user.email);
      const allocationsRef = collection(db, 'userAllocations', user.id, 'allocations');
      const snapshot = await getDocs(allocationsRef);
      
      console.log('Found', snapshot.size, 'allocations for', user.email);
      
      snapshot.forEach(doc => {
        const allocation = {
          id: doc.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          ...doc.data()
        };
        console.log('Allocation:', allocation);
        allAllocations.push(allocation);
      });
    }
    
    console.log('Total allocations found:', allAllocations.length);
    return { success: true, data: allAllocations };
  } catch (error) {
    console.error('Error getting allocations by creator:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocations for a specific user
 * @param {string} userId - ID of the user
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllocationsByUserId = async (userId) => {
  try {
    console.log('🔍 getAllocationsByUserId called with:', userId);
    
    if (!userId) {
      console.error('❌ getAllocationsByUserId: User ID is required');
      return { success: false, error: 'User ID is required' };
    }
    
    const allocationsRef = collection(db, 'userAllocations', userId, 'allocations');
    console.log('🔍 Querying collection path:', `userAllocations/${userId}/allocations`);
    
    const snapshot = await getDocs(allocationsRef);
    console.log('📊 Found', snapshot.size, 'allocation documents for user ID:', userId);
    
    const allocations = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      console.log('📄 Allocation document:', doc.id, data);
      
      allocations.push({
        id: doc.id,
        userId: userId,
        ...data,
        // Ensure proper timestamp conversion
        allocatedAt: data.allocatedAt?.toDate ? data.allocatedAt.toDate() : data.allocatedAt
      });
    });
    
    console.log('✅ getAllocationsByUserId returning:', allocations.length, 'allocations');
    console.log('📋 Allocations summary:', allocations.map(a => ({
      id: a.id,
      district: a.district,
      city: a.city,
      village: a.village,
      count: a.count,
      allocatedBy: a.allocatedBy
    })));
    
    return { success: true, data: allocations };
  } catch (error) {
    console.error('❌ Error getting allocations by user ID:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Migrate old allocation format to new format (individual village records)
 * @param {string} userId - User ID to migrate
 * @returns {Promise<{success: boolean, migrated?: number, error?: string}>}
 */
export const migrateUserAllocations = async (userId) => {
  try {
    console.log('🔄 Migrating allocations for user:', userId);
    
    const allocationsRef = collection(db, 'userAllocations', userId, 'allocations');
    const snapshot = await getDocs(allocationsRef);
    
    let migratedCount = 0;
    const { getVillageData } = await import('./excelStorage');
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      
      // Check if this is old format (has villages array)
      if (data.villages && Array.isArray(data.villages) && !data.city) {
        console.log('🔄 Migrating old allocation:', docSnapshot.id, data);
        
        // Create individual records for each village
        for (const village of data.villages) {
          try {
            // Get village data to calculate count
            const villageDataResult = await getVillageData(data.district, village);
            const count = villageDataResult.success ? (villageDataResult.data?.length || 0) : 0;
            
            const newAllocationId = `${data.district}_${village}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const newAllocationRef = doc(db, 'userAllocations', userId, 'allocations', newAllocationId);
            
            await setDoc(newAllocationRef, {
              userId: data.userId,
              userEmail: data.userEmail,
              district: data.district,
              city: village,
              village: village,
              count: count,
              allocatedBy: data.allocatedBy,
              allocatedAt: data.allocatedAt,
              status: data.status || 'active',
              migratedFrom: docSnapshot.id
            });
            
            migratedCount++;
            console.log(`✅ Migrated village ${village} (${count} people) from old allocation`);
            
          } catch (villageError) {
            console.error(`Error migrating village ${village}:`, villageError);
          }
        }
        
        // Delete old allocation document
        await deleteDoc(docSnapshot.ref);
        console.log('🗑️ Deleted old allocation document:', docSnapshot.id);
      }
    }
    
    console.log(`✅ Migration complete. Migrated ${migratedCount} village allocations for user ${userId}`);
    return { success: true, migrated: migratedCount };
    
  } catch (error) {
    console.error('❌ Error migrating user allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all allocations in the system (for Super Admin)
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllAllocations = async () => {
  try {
    console.log('getAllAllocations called - fetching ALL allocations');
    
    // First, get the list of valid districts that actually exist in Firestore
    const districtsRef = collection(db, 'districts');
    const districtsSnapshot = await getDocs(districtsRef);
    const validDistricts = new Set();
    
    districtsSnapshot.forEach(doc => {
      validDistricts.add(doc.id);
    });
    
    console.log('Valid districts found:', Array.from(validDistricts));
    
    const { getAllUsers } = await import('./firestore');
    const usersResult = await getAllUsers();
    
    console.log('Total users fetched:', usersResult.data?.length);
    
    if (!usersResult.success) {
      return { success: false, error: 'Failed to fetch users' };
    }
    
    const allAllocations = [];
    
    for (const user of usersResult.data) {
      const allocationsRef = collection(db, 'userAllocations', user.id, 'allocations');
      const snapshot = await getDocs(allocationsRef);
      
      console.log('Found', snapshot.size, 'allocations for user:', user.email);
      
      snapshot.forEach(doc => {
        const allocation = {
          id: doc.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          ...doc.data()
        };
        
        // Only include allocations for districts that actually exist
        if (allocation.district && validDistricts.has(allocation.district)) {
          console.log('Valid allocation:', allocation.district);
          allAllocations.push(allocation);
        } else {
          console.log('Skipping allocation for non-existent district:', allocation.district);
        }
      });
    }
    
    console.log('Total valid allocations in system:', allAllocations.length);
    return { success: true, data: allAllocations };
  } catch (error) {
    console.error('Error getting all allocations:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get allocations that were allocated by a specific user
 * @param {string} allocatorEmail - Email of the user who allocated the data
 * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
 */
export const getAllocationsByAllocator = async (allocatorEmail) => {
  try {
    console.log('getAllocationsByAllocator called with:', allocatorEmail);
    
    // This requires querying all user allocations
    const { getAllUsers } = await import('./firestore');
    const usersResult = await getAllUsers();
    
    console.log('Total users fetched:', usersResult.data?.length);
    
    if (!usersResult.success) {
      return { success: false, error: 'Failed to fetch users' };
    }
    
    const allAllocations = [];
    
    for (const user of usersResult.data) {
      const allocationsRef = collection(db, 'userAllocations', user.id, 'allocations');
      const q = query(allocationsRef, where('allocatedBy', '==', allocatorEmail));
      const snapshot = await getDocs(q);
      
      console.log('Found', snapshot.size, 'allocations by', allocatorEmail, 'for user:', user.email);
      
      snapshot.forEach(doc => {
        const allocation = {
          id: doc.id,
          userId: user.id,
          userName: user.name,
          userEmail: user.email,
          userRole: user.role,
          ...doc.data()
        };
        console.log('Allocation:', allocation);
        allAllocations.push(allocation);
      });
    }
    
    console.log('Total allocations by', allocatorEmail, ':', allAllocations.length);
    return { success: true, data: allAllocations };
  } catch (error) {
    console.error('Error getting allocations by allocator:', error);
    return { success: false, error: error.message };
  }
};
