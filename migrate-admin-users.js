// Script to migrate users created by admins to the correct location
// This script will find users created by admins that are incorrectly placed under superadmins
// and move them to the correct location under the admin

const { initializeApp } = require('firebase/app');
const { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  query, 
  where,
  setDoc
} = require('firebase/firestore');

// Initialize Firebase (replace with your config)
const firebaseConfig = {
  // Your Firebase config here
  // apiKey, authDomain, projectId, etc.
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Path constants
const MAIN_ADMIN_PATH = 'mainAdmin';
const MAIN_ADMIN_DOC = 'mainAdmin';
const SUPER_ADMINS_COLLECTION = 'superadmins';
const ADMINS_COLLECTION = 'admins';
const USERS_COLLECTION = 'users';

async function findAdminByEmail(email) {
  try {
    // Search in all superadmins
    const superAdminsSnapshot = await getDocs(
      collection(db, 'mainAdmin', 'mainAdmin', 'superadmins')
    );
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      // Search in admins under this super admin
      const adminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
      );
      
      for (const adminDoc of adminsSnapshot.docs) {
        if (adminDoc.data()['Email'] === email) {
          return {
            success: true,
            superAdminId: superAdminDoc.id,
            adminId: adminDoc.id,
            adminData: adminDoc.data()
          };
        }
      }
    }
    
    return { success: false, error: 'Admin not found' };
  } catch (error) {
    console.error('Error finding admin:', error);
    return { success: false, error: error.message };
  }
}

async function migrateUsers() {
  try {
    console.log('🔄 Starting user migration...');
    let migratedCount = 0;
    let errorCount = 0;
    
    // Get all super admins
    const superAdminsSnapshot = await getDocs(
      collection(db, MAIN_ADMIN_PATH, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION)
    );
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      console.log(`📂 Checking superadmin: ${superAdminDoc.id}`);
      
      // Get users directly under this super admin
      const usersSnapshot = await getDocs(
        collection(db, MAIN_ADMIN_PATH, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION, superAdminDoc.id, USERS_COLLECTION)
      );
      
      // Check each user
      for (const userDoc of usersSnapshot.docs) {
        const userData = userDoc.data();
        const createdByEmail = userData['createdBy'];
        
        // Skip users created by the super admin
        if (!createdByEmail || createdByEmail === superAdminDoc.data()['Email']) {
          console.log(`✓ User ${userData['Email']} was created by superadmin ${superAdminDoc.data()['Email']}, leaving in place`);
          continue;
        }
        
        console.log(`🔍 Checking user ${userData['Full Name']} (${userData['Email']}) created by: ${createdByEmail}`);
        
        // Find the admin who created this user
        const adminResult = await findAdminByEmail(createdByEmail);
        
        if (adminResult.success) {
          console.log(`✅ Found admin ${createdByEmail} under superadmin ${adminResult.superAdminId}`);
          
          try {
            // Check if users collection exists under this admin, if not create it
            const adminUsersCollectionRef = collection(
              db, 
              MAIN_ADMIN_PATH, 
              MAIN_ADMIN_DOC, 
              SUPER_ADMINS_COLLECTION, 
              adminResult.superAdminId, 
              ADMINS_COLLECTION, 
              adminResult.adminId, 
              USERS_COLLECTION
            );
            
            // Create the user under the admin
            const newUserRef = await addDoc(adminUsersCollectionRef, userData);
            
            console.log(`✅ Created user ${userData['Email']} under admin ${adminResult.adminId}`);
            
            // Delete the user from the super admin's users collection
            await deleteDoc(
              doc(db, MAIN_ADMIN_PATH, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION, superAdminDoc.id, USERS_COLLECTION, userDoc.id)
            );
            
            console.log(`🚮 Deleted user ${userData['Email']} from superadmin ${superAdminDoc.id}`);
            migratedCount++;
          } catch (error) {
            console.error(`❌ Error migrating user ${userData['Email']}:`, error);
            errorCount++;
          }
        } else {
          console.log(`⚠️ Could not find admin ${createdByEmail} who created user ${userData['Email']}`);
        }
      }
    }
    
    // Also check for users directly under mainAdmin that should be under admins
    try {
      const mainAdminUsersSnapshot = await getDocs(
        collection(db, MAIN_ADMIN_PATH, MAIN_ADMIN_DOC, USERS_COLLECTION)
      );
      
      console.log(`🔍 Checking ${mainAdminUsersSnapshot.size} users directly under mainAdmin`);
      
      for (const userDoc of mainAdminUsersSnapshot.docs) {
        const userData = userDoc.data();
        const createdByEmail = userData['createdBy'];
        
        // Skip users created by main admin
        if (!createdByEmail || 
            createdByEmail === 'mainadmin@demo.com' || 
            createdByEmail === 'ruchita@gmail.com' || 
            createdByEmail === 'ruchitawategoakar@gmail.com') {
          console.log(`✓ User ${userData['Email']} was created by Main Admin, leaving in place`);
          continue;
        }
        
        // Find the admin who created this user
        const adminResult = await findAdminByEmail(createdByEmail);
        
        if (adminResult.success) {
          console.log(`✅ Found admin ${createdByEmail} who created user ${userData['Email']}`);
          
          try {
            // Create the user under the admin
            const newUserRef = await addDoc(
              collection(
                db, 
                MAIN_ADMIN_PATH, 
                MAIN_ADMIN_DOC, 
                SUPER_ADMINS_COLLECTION, 
                adminResult.superAdminId, 
                ADMINS_COLLECTION, 
                adminResult.adminId, 
                USERS_COLLECTION
              ),
              userData
            );
            
            console.log(`✅ Created user ${userData['Email']} under admin ${adminResult.adminId}`);
            
            // Delete the user from mainAdmin's users collection
            await deleteDoc(
              doc(db, MAIN_ADMIN_PATH, MAIN_ADMIN_DOC, USERS_COLLECTION, userDoc.id)
            );
            
            console.log(`🚮 Deleted user ${userData['Email']} from mainAdmin users`);
            migratedCount++;
          } catch (error) {
            console.error(`❌ Error migrating user ${userData['Email']}:`, error);
            errorCount++;
          }
        }
      }
    } catch (error) {
      console.error('Error checking mainAdmin users:', error);
    }
    
    console.log(`✅ Migration complete. Migrated ${migratedCount} users. Errors: ${errorCount}`);
  } catch (error) {
    console.error('Error in migration:', error);
  }
}

// Run the migration
migrateUsers().then(() => {
  console.log('Migration script finished');
}).catch(error => {
  console.error('Migration failed:', error);
});
