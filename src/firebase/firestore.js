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
  Timestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from './config';

// Collections - Hierarchical Structure
const MAIN_ADMIN_COLLECTION = 'mainAdmin';
const MAIN_ADMIN_DOC = 'mainAdmin';
const SUPER_ADMINS_COLLECTION = 'superadmins';
const ADMINS_COLLECTION = 'admins';
const USERS_COLLECTION = 'users';
const MESSAGES_COLLECTION = 'whatsapp_messages';
const ACTIVITY_LOGS_COLLECTION = 'activityLogs';
const DATA_ALLOCATIONS_COLLECTION = 'dataAllocations';
const CONSUMERS_COLLECTION = 'consumers';

// ==================== MAIN ADMIN ====================

export const getMainAdminProfile = async () => {
  try {
    const docRef = doc(db, 'mainAdmin', 'mainAdmin');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        success: true,
        data: {
          id: 'main_admin_1',
          email: data['Email'],
          name: data['Full Name'],
          password: data['Password'],
          mobile: data['Phone Number'],
          phone: data['Phone Number'],
          role: data['Role'],
          status: data['status'],
          createdAt: data['createdAt']
        }
      };
    } else {
      return { success: false, error: 'Main Admin profile not found' };
    }
  } catch (error) {
    console.error('Error getting Main Admin profile:', error);
    return { success: false, error: error.message };
  }
};

// ==================== USERS ====================

// Helper function to find a user's location in the nested structure
export const findUserLocation = async (userEmail) => {
  try {
    console.log('🔍 Finding location for user:', userEmail);
    
    // Check for main admin email - hardcoded check for common main admin emails
    const mainAdminEmails = ['mainadmin@demo.com', 'ruchita@gmail.com', 'ruchitawategoakar@gmail.com'];
    if (mainAdminEmails.includes(userEmail)) {
      console.log('✅ User is Main Admin (matched by email)');
      return {
        success: true,
        role: 'main_admin',
        userId: 'mainAdmin',
        superAdminId: null,
        adminId: null
      };
    }
    
    // Check if it's main admin in the database
    const mainAdminDoc = await getDoc(doc(db, 'mainAdmin', 'mainAdmin'));
    if (mainAdminDoc.exists() && mainAdminDoc.data()['Email'] === userEmail) {
      console.log('✅ User is Main Admin (matched in database)');
      return {
        success: true,
        role: 'main_admin',
        userId: 'mainAdmin',
        superAdminId: null,
        adminId: null
      };
    }

    // Check admins directly under mainAdmin (created by Main Admin)
    try {
      const mainAdminAdminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'admins')
      );
      
      console.log(`🔍 Checking ${mainAdminAdminsSnapshot.size} admins under mainAdmin/mainAdmin/admins`);
      
      for (const adminDoc of mainAdminAdminsSnapshot.docs) {
        const adminEmail = adminDoc.data()['Email'];
        console.log(`  Comparing admin email: "${adminEmail}" with search email: "${userEmail}"`);
        
        if (adminEmail === userEmail) {
          console.log('✅ User is Admin (created by Main Admin)');
          return {
            success: true,
            role: 'admin',
            userId: adminDoc.id,
            superAdminId: null, // No super admin parent
            adminId: adminDoc.id
          };
        }
        
        // Check users under this admin (users created by admins under Main Admin)
        try {
          const adminUsersSnapshot = await getDocs(
            collection(db, 'mainAdmin', 'mainAdmin', 'admins', adminDoc.id, 'users')
          );
          
          console.log(`  🔍 Checking ${adminUsersSnapshot.size} users under admin ${adminDoc.id}`);
          
          for (const userDoc of adminUsersSnapshot.docs) {
            const userDocEmail = userDoc.data()['Email'];
            console.log(`    Comparing user email: "${userDocEmail}" with search email: "${userEmail}"`);
            
            if (userDocEmail === userEmail) {
              console.log('✅ User found under Admin (Main Admin child)');
              return {
                success: true,
                role: 'user',
                userId: userDoc.id,
                superAdminId: null, // No super admin parent
                adminId: adminDoc.id // Admin ID who created this user
              };
            }
          }
        } catch (err) {
          console.log(`  No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
        }
      }
    } catch (err) {
      console.log('No admins found under mainAdmin/mainAdmin/admins or collection does not exist');
    }

    // Search in superadmins
    const superAdminsSnapshot = await getDocs(
      collection(db, 'mainAdmin', 'mainAdmin', 'superadmins')
    );
    
    console.log(`🔍 Checking ${superAdminsSnapshot.size} super admins`);
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      const superAdminEmail = superAdminDoc.data()['Email'];
      console.log(`  Comparing super admin email: "${superAdminEmail}" with search email: "${userEmail}"`);
      
      if (superAdminEmail === userEmail) {
        console.log('✅ User is Super Admin');
        return {
          success: true,
          role: 'super_admin',
          userId: superAdminDoc.id,
          superAdminId: superAdminDoc.id,
          adminId: null
        };
      }
      
      // Search in admins under this super admin
      const adminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
      );
      
      console.log(`  🔍 Checking ${adminsSnapshot.size} admins under super admin ${superAdminDoc.id}`);
      
      for (const adminDoc of adminsSnapshot.docs) {
        const adminEmail = adminDoc.data()['Email'];
        console.log(`    Comparing admin email: "${adminEmail}" with search email: "${userEmail}"`);
        
        if (adminEmail === userEmail) {
          console.log('✅ User is Admin (under Super Admin)');
          return {
            success: true,
            role: 'admin',
            userId: adminDoc.id,
            superAdminId: superAdminDoc.id,
            adminId: adminDoc.id
          };
        }
        
        // NEW: Search in users under this admin
        try {
          const adminUsersSnapshot = await getDocs(
            collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins', adminDoc.id, 'users')
          );
          
          console.log(`    🔍 Checking ${adminUsersSnapshot.size} users under admin ${adminDoc.id} (under super admin)`);
          
          for (const userDoc of adminUsersSnapshot.docs) {
            const userDocEmail = userDoc.data()['Email'];
            console.log(`      Comparing user email: "${userDocEmail}" with search email: "${userEmail}"`);
            
            if (userDocEmail === userEmail) {
              console.log('✅ User found under Admin (under Super Admin)');
              return {
                success: true,
                role: 'user',
                userId: userDoc.id,
                superAdminId: superAdminDoc.id,
                adminId: adminDoc.id
              };
            }
          }
        } catch (err) {
          // Users collection might not exist yet for this admin
          console.log(`    No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
        }
      }
      
      // Search in users directly under this super admin
      const usersSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'users')
      );
      
      console.log(`  🔍 Checking ${usersSnapshot.size} users under super admin ${superAdminDoc.id}`);
      
      for (const userDoc of usersSnapshot.docs) {
        const userDocEmail = userDoc.data()['Email'];
        console.log(`    Comparing user email: "${userDocEmail}" with search email: "${userEmail}"`);
        
        if (userDocEmail === userEmail) {
          console.log('✅ User found under Super Admin');
          return {
            success: true,
            role: 'user',
            userId: userDoc.id,
            superAdminId: superAdminDoc.id,
            adminId: null
          };
        }
      }
    }

    // Check users directly under mainAdmin (created by Main Admin)
    try {
      const mainAdminUsersSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'users')
      );
      
      console.log(`🔍 Checking ${mainAdminUsersSnapshot.size} users under mainAdmin/mainAdmin/users`);
      
      for (const userDoc of mainAdminUsersSnapshot.docs) {
        const userDocEmail = userDoc.data()['Email'];
        console.log(`  Comparing user email: "${userDocEmail}" with search email: "${userEmail}"`);
        
        if (userDocEmail === userEmail) {
          console.log('✅ User found directly under Main Admin');
          return {
            success: true,
            role: 'user',
            userId: userDoc.id,
            superAdminId: null, // No super admin parent
            adminId: null // No admin parent, directly under Main Admin
          };
        }
      }
    } catch (err) {
      console.log('No users found under mainAdmin/mainAdmin/users or collection does not exist');
    }

    // TEMPORARY: Check incorrect location for backwards compatibility
    try {
      const incorrectAdminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'admins')
      );
      
      for (const adminDoc of incorrectAdminsSnapshot.docs) {
        if (adminDoc.data()['Email'] === userEmail) {
          console.warn('⚠️ User found in INCORRECT location: mainAdmin/admins/');
          console.warn('⚠️ This user should be moved to: mainAdmin/mainAdmin/superadmins/');
          
          // For super_admin role in wrong location, treat as if they're in correct location
          // Use their document ID as superAdminId
          return {
            success: true,
            role: adminDoc.data()['Role'] || 'admin',
            userId: adminDoc.id,
            superAdminId: adminDoc.id, // Use their own ID as superAdminId
            adminId: null
          };
        }
      }
    } catch (e) {
      // Incorrect location doesn't exist, which is fine
    }
    
    console.log('❌ User not found in any location');
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error finding user location:', error);
    return { success: false, error: error.message };
  }
};

export const createUser = async (userData, creatorInfo = null) => {
  try {
    console.log('📌 Creating user with data:', userData);
    console.log('📌 Initial creatorInfo:', creatorInfo);
    
    // Special case for mainadmin@demo.com - always treat as Main Admin
    if (userData.createdBy === 'mainadmin@demo.com' || 
        userData.createdBy === 'ruchita@gmail.com' || 
        userData.createdBy === 'ruchitawategoakar@gmail.com') {
      console.log('✅ Creator is Main Admin (by email match), setting isMainAdmin flag');
      creatorInfo = {
        isMainAdmin: true,
        superAdminId: null,
        adminId: null
      };
    }
    // If creatorInfo not provided, find it using createdBy email
    else if (!creatorInfo && userData.createdBy) {
      console.log('🔍 Finding creator location for:', userData.createdBy);
      const creatorLocation = await findUserLocation(userData.createdBy);
      console.log('🔍 Creator location result:', creatorLocation);
      
      if (creatorLocation.success) {
        // Check if creator is main_admin - we'll handle this specially
        if (creatorLocation.role === 'main_admin') {
          creatorInfo = {
            isMainAdmin: true,
            superAdminId: null,
            adminId: null
          };
          console.log('✅ Creator is Main Admin, will create user directly under Main Admin');
        } else {
          creatorInfo = {
            superAdminId: creatorLocation.superAdminId,
            adminId: creatorLocation.adminId
          };
          console.log('✅ Found creator location:', creatorInfo);
        }
      } else {
        console.error('❌ Creator not found in database');
        throw new Error('Creator not found in database');
      }
    }

    const userDoc = {
      'Email': userData.email,
      'Full Name': userData.name,
      'Password': userData.password,
      'Phone Number': userData.phone || userData.mobile || '',
      'Role': userData.role,
      'createdat': serverTimestamp(),
      'status': userData.status || 'Active',
      'createdBy': userData.createdBy || ''
    };
    
    let docRef;
    let path;
    
    // Determine path based on role and creator
    if (userData.role === 'super_admin') {
      // Super admins go directly under mainAdmin/mainAdmin/superadmins
      path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${SUPER_ADMINS_COLLECTION}`;
      docRef = await addDoc(
        collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION), 
        userDoc
      );
    } else if (userData.role === 'admin') {
      // Check if creator is Main Admin
      if (creatorInfo && creatorInfo.isMainAdmin) {
        // If created by Main Admin, place directly under mainAdmin/mainAdmin/admins
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${ADMINS_COLLECTION}`;
        console.log('📍 Creating admin directly under Main Admin at path:', path);
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, ADMINS_COLLECTION),
          userDoc
        );
      } else {
        // Otherwise, admins go under their super admin
        if (!creatorInfo || !creatorInfo.superAdminId) {
          console.error('❌ Missing superAdminId in creatorInfo:', creatorInfo);
          throw new Error('Super Admin ID required to create admin. Creator must be a super admin.');
        }
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${SUPER_ADMINS_COLLECTION}/${creatorInfo.superAdminId}/${ADMINS_COLLECTION}`;
        console.log('📍 Creating admin at path:', path);
        console.log('📍 Creator info:', creatorInfo);
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION, creatorInfo.superAdminId, ADMINS_COLLECTION),
          userDoc
        );
      }
      console.log('✅ Admin created with ID:', docRef.id);
    } else if (userData.role === 'user') {
      // Check if creator is Main Admin
      if (creatorInfo && creatorInfo.isMainAdmin) {
        // If created by Main Admin, place directly under mainAdmin/mainAdmin/users
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${USERS_COLLECTION}`;
        console.log('📁 Creating user directly under Main Admin at path:', path);
        console.log('📁 With user data:', userDoc);
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, USERS_COLLECTION),
          userDoc
        );
      } 
      // Check if creator is Admin created directly by Main Admin (has adminId but no superAdminId)
      else if (creatorInfo && creatorInfo.adminId && !creatorInfo.superAdminId) {
        // If created by Admin (under Main Admin), place under mainAdmin/mainAdmin/admins/{adminId}/users
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${ADMINS_COLLECTION}/${creatorInfo.adminId}/${USERS_COLLECTION}`;
        console.log('📁 Creating user under Admin (Main Admin child) at path:', path);
        console.log('📁 With user data:', userDoc);
        
        // Create users subcollection under the admin if it doesn't exist
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, ADMINS_COLLECTION, creatorInfo.adminId, USERS_COLLECTION),
          userDoc
        );
      }
      // Check if creator is Admin under Super Admin (has both superAdminId and adminId)
      else if (creatorInfo && creatorInfo.superAdminId && creatorInfo.adminId) {
        // If created by Admin (under Super Admin), place under the admin's collection
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${SUPER_ADMINS_COLLECTION}/${creatorInfo.superAdminId}/${ADMINS_COLLECTION}/${creatorInfo.adminId}/${USERS_COLLECTION}`;
        console.log('📁 Creating user under Admin (Super Admin child) at path:', path);
        console.log('📁 With user data:', userDoc);
        
        // Create users subcollection under the admin if it doesn't exist
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION, creatorInfo.superAdminId, ADMINS_COLLECTION, creatorInfo.adminId, USERS_COLLECTION),
          userDoc
        );
      } else {
        // Otherwise, users go under their super admin (created by Super Admin)
        if (!creatorInfo || !creatorInfo.superAdminId) {
          console.error('❌ Missing superAdminId in creatorInfo:', creatorInfo);
          throw new Error('Super Admin ID required to create user.');
        }
        path = `${MAIN_ADMIN_COLLECTION}/${MAIN_ADMIN_DOC}/${SUPER_ADMINS_COLLECTION}/${creatorInfo.superAdminId}/${USERS_COLLECTION}`;
        console.log('📁 Creating user at path:', path);
        console.log('📁 With user data:', userDoc);
        
        docRef = await addDoc(
          collection(db, MAIN_ADMIN_COLLECTION, MAIN_ADMIN_DOC, SUPER_ADMINS_COLLECTION, creatorInfo.superAdminId, USERS_COLLECTION),
          userDoc
        );
      }
    }
    
    console.log(`✅ Created ${userData.role} in ${path}:`, docRef.id);
    
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
};

export const getUser = async (userId) => {
  try {
    const docRef = doc(db, USERS_COLLECTION, userId);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { success: true, data: { id: docSnap.id, ...docSnap.data() } };
    } else {
      return { success: false, error: 'User not found' };
    }
  } catch (error) {
    console.error('Error getting user:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByEmail = async (email) => {
  try {
    // First, check the main admin document
    const mainAdminDoc = await getDoc(doc(db, 'mainAdmin', 'mainAdmin'));
    if (mainAdminDoc.exists() && mainAdminDoc.data()['Email'] === email) {
      const data = mainAdminDoc.data();
      return {
        success: true,
        data: {
          id: 'mainAdmin',
          email: data['Email'],
          name: data['Full Name'],
          password: data['Password'],
          mobile: data['Phone Number'],
          phone: data['Phone Number'],
          role: data['Role'],
          status: data['status'],
          createdBy: '',
          createdAt: data['createdAt']
        }
      };
    }

    // Search in nested structure
    const allUsers = await getAllUsers();
    if (allUsers.success) {
      const user = allUsers.data.find(u => u.email === email);
      if (user) {
        return { success: true, data: user };
      }
    }

    // TEMPORARY: Also check incorrect locations for backwards compatibility
    try {
      const incorrectAdminsQuery = query(
        collection(db, 'mainAdmin', 'admins'),
        where('Email', '==', email)
      );
      const incorrectAdminsSnapshot = await getDocs(incorrectAdminsQuery);
      
      if (!incorrectAdminsSnapshot.empty) {
        const docData = incorrectAdminsSnapshot.docs[0].data();
        console.warn('⚠️ User found in INCORRECT location: mainAdmin/admins/');
        return {
          success: true,
          data: {
            id: incorrectAdminsSnapshot.docs[0].id,
            email: docData['Email'],
            name: docData['Full Name'],
            password: docData['Password'],
            mobile: docData['Phone Number'],
            phone: docData['Phone Number'],
            role: docData['Role'],
            status: docData['status'],
            createdBy: docData['createdBy'],
            createdAt: docData['createdat']
          }
        };
      }
    } catch (e) {
      // Incorrect location doesn't exist, which is fine
    }
    
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user by email:', error);
    return { success: false, error: error.message };
  }
};

export const getUserByMobile = async (mobile) => {
  try {
    // First, check the main admin document
    const mainAdminDoc = await getDoc(doc(db, 'mainAdmin', 'mainAdmin'));
    if (mainAdminDoc.exists() && mainAdminDoc.data()['Phone Number'] === mobile) {
      const data = mainAdminDoc.data();
      return {
        success: true,
        data: {
          id: 'mainAdmin',
          email: data['Email'],
          name: data['Full Name'],
          password: data['Password'],
          mobile: data['Phone Number'],
          phone: data['Phone Number'],
          role: data['Role'],
          status: data['status'],
          createdBy: '',
          createdAt: data['createdAt']
        }
      };
    }

    // Search in nested structure
    const allUsers = await getAllUsers();
    if (allUsers.success) {
      const user = allUsers.data.find(u => u.mobile === mobile || u.phone === mobile);
      if (user) {
        return { success: true, data: user };
      }
    }

    // TEMPORARY: Also check incorrect locations for backwards compatibility
    try {
      const incorrectAdminsQuery = query(
        collection(db, 'mainAdmin', 'admins'),
        where('Phone Number', '==', mobile)
      );
      const incorrectAdminsSnapshot = await getDocs(incorrectAdminsQuery);
      
      if (!incorrectAdminsSnapshot.empty) {
        const docData = incorrectAdminsSnapshot.docs[0].data();
        console.warn('⚠️ User found in INCORRECT location: mainAdmin/admins/');
        return {
          success: true,
          data: {
            id: incorrectAdminsSnapshot.docs[0].id,
            email: docData['Email'],
            name: docData['Full Name'],
            password: docData['Password'],
            mobile: docData['Phone Number'],
            phone: docData['Phone Number'],
            role: docData['Role'],
            status: docData['status'],
            createdBy: docData['createdBy'],
            createdAt: docData['createdat']
          }
        };
      }
    } catch (e) {
      // Incorrect location doesn't exist, which is fine
    }
    
    return { success: false, error: 'User not found' };
  } catch (error) {
    console.error('Error getting user by mobile:', error);
    return { success: false, error: error.message };
  }
};

export const getAllUsers = async () => {
  try {
    const users = [];
    
    // Get all super admins
    const superAdminsSnapshot = await getDocs(
      collection(db, 'mainAdmin', 'mainAdmin', 'superadmins')
    );
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      const superAdminData = superAdminDoc.data();
      
      // Add super admin to list
      users.push({
        id: superAdminDoc.id,
        email: superAdminData['Email'],
        name: superAdminData['Full Name'],
        password: superAdminData['Password'],
        mobile: superAdminData['Phone Number'],
        phone: superAdminData['Phone Number'],
        role: superAdminData['Role'],
        status: superAdminData['status'],
        createdBy: superAdminData['createdBy'],
        createdAt: superAdminData['createdat']
      });
      
      // Get admins under this super admin
      const adminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
      );
      
      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        
        // Add admin to list
        users.push({
          id: adminDoc.id,
          email: adminData['Email'],
          name: adminData['Full Name'],
          password: adminData['Password'],
          mobile: adminData['Phone Number'],
          phone: adminData['Phone Number'],
          role: adminData['Role'],
          status: adminData['status'],
          createdBy: adminData['createdBy'],
          createdAt: adminData['createdat']
        });
        
        // NEW: Get users under this admin
        try {
          const adminUsersSnapshot = await getDocs(
            collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins', adminDoc.id, 'users')
          );
          
          adminUsersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            users.push({
              id: userDoc.id,
              email: userData['Email'],
              name: userData['Full Name'],
              password: userData['Password'],
              mobile: userData['Phone Number'],
              phone: userData['Phone Number'],
              role: userData['Role'],
              status: userData['status'],
              createdBy: userData['createdBy'],
              createdAt: userData['createdat']
            });
          });
          console.log(`✅ Fetched ${adminUsersSnapshot.size} users from admin ${adminDoc.id}`);
        } catch (err) {
          // Users collection might not exist yet for this admin
          console.log(`No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
        }
      }
      
      // Get users directly under this super admin
      const usersSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'users')
      );
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        users.push({
          id: userDoc.id,
          email: userData['Email'],
          name: userData['Full Name'],
          password: userData['Password'],
          mobile: userData['Phone Number'],
          phone: userData['Phone Number'],
          role: userData['Role'],
          status: userData['status'],
          createdBy: userData['createdBy'],
          createdAt: userData['createdat']
        });
      });
    }
    
    // Get users directly under mainAdmin (created by Main Admin)
    try {
      console.log('🔍 Fetching users directly under mainAdmin/mainAdmin/users');
      const mainAdminUsersSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'users')
      );
      
      mainAdminUsersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        users.push({
          id: userDoc.id,
          email: userData['Email'],
          name: userData['Full Name'],
          password: userData['Password'],
          mobile: userData['Phone Number'],
          phone: userData['Phone Number'],
          role: userData['Role'],
          status: userData['status'],
          createdBy: userData['createdBy'],
          createdAt: userData['createdat']
        });
      });
      console.log(`✅ Fetched ${mainAdminUsersSnapshot.size} users from mainAdmin/mainAdmin/users`);
    } catch (error) {
      console.warn('⚠️ Error fetching users from mainAdmin/mainAdmin/users:', error);
      // Continue execution even if this fails
    }
    
    // Get admins directly under mainAdmin (created by Main Admin)
    try {
      console.log('🔍 Fetching admins directly under mainAdmin/mainAdmin/admins');
      const mainAdminAdminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'admins')
      );
      
      for (const adminDoc of mainAdminAdminsSnapshot.docs) {
        const adminData = adminDoc.data();
        users.push({
          id: adminDoc.id,
          email: adminData['Email'],
          name: adminData['Full Name'],
          password: adminData['Password'],
          mobile: adminData['Phone Number'],
          phone: adminData['Phone Number'],
          role: adminData['Role'],
          status: adminData['status'],
          createdBy: adminData['createdBy'],
          createdAt: adminData['createdat']
        });
        
        // Get users under this admin (admins created by Main Admin)
        try {
          const adminUsersSnapshot = await getDocs(
            collection(db, 'mainAdmin', 'mainAdmin', 'admins', adminDoc.id, 'users')
          );
          
          adminUsersSnapshot.forEach((userDoc) => {
            const userData = userDoc.data();
            users.push({
              id: userDoc.id,
              email: userData['Email'],
              name: userData['Full Name'],
              password: userData['Password'],
              mobile: userData['Phone Number'],
              phone: userData['Phone Number'],
              role: userData['Role'],
              status: userData['status'],
              createdBy: userData['createdBy'],
              createdAt: userData['createdat']
            });
          });
          console.log(`✅ Fetched ${adminUsersSnapshot.size} users from admin ${adminDoc.id} (Main Admin child)`);
        } catch (err) {
          console.log(`No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
        }
      }
      console.log(`✅ Fetched ${mainAdminAdminsSnapshot.size} admins from mainAdmin/mainAdmin/admins`);
    } catch (error) {
      console.warn('⚠️ Error fetching admins from mainAdmin/mainAdmin/admins:', error);
      // Continue execution even if this fails
    }
    
    console.log(`✅ Fetched ${users.length} total users from all locations`);
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting all users:', error);
    return { success: false, error: error.message };
  }
};

export const getUsersByCreator = async (creatorEmail) => {
  try {
    const users = [];
    
    // Get all super admins
    const superAdminsSnapshot = await getDocs(
      collection(db, 'mainAdmin', 'mainAdmin', 'superadmins')
    );
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      const superAdminData = superAdminDoc.data();
      
      // Check if this super admin was created by the creator
      if (superAdminData['createdBy'] === creatorEmail) {
        users.push({
          id: superAdminDoc.id,
          email: superAdminData['Email'],
          name: superAdminData['Full Name'],
          password: superAdminData['Password'],
          mobile: superAdminData['Phone Number'],
          phone: superAdminData['Phone Number'],
          role: superAdminData['Role'],
          status: superAdminData['status'],
          createdBy: superAdminData['createdBy'],
          createdAt: superAdminData['createdat']
        });
      }
      
      // Get admins under this super admin
      const adminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
      );
      
      for (const adminDoc of adminsSnapshot.docs) {
        const adminData = adminDoc.data();
        
        // Check if this admin was created by the creator
        if (adminData['createdBy'] === creatorEmail) {
          users.push({
            id: adminDoc.id,
            email: adminData['Email'],
            name: adminData['Full Name'],
            password: adminData['Password'],
            mobile: adminData['Phone Number'],
            phone: adminData['Phone Number'],
            role: adminData['Role'],
            status: adminData['status'],
            createdBy: adminData['createdBy'],
            createdAt: adminData['createdat']
          });
        }
        
        // NEW: Get users under this admin (for admins created by the creator)
        if (adminData['createdBy'] === creatorEmail || adminData['Email'] === creatorEmail) {
          try {
            const adminUsersSnapshot = await getDocs(
              collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins', adminDoc.id, 'users')
            );
            
            adminUsersSnapshot.forEach((userDoc) => {
              const userData = userDoc.data();
              users.push({
                id: userDoc.id,
                email: userData['Email'],
                name: userData['Full Name'],
                password: userData['Password'],
                mobile: userData['Phone Number'],
                phone: userData['Phone Number'],
                role: userData['Role'],
                status: userData['status'],
                createdBy: userData['createdBy'],
                createdAt: userData['createdat']
              });
            });
          } catch (err) {
            console.log(`No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
          }
        }
      }
      
      // Get users directly under this super admin
      const usersSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'users')
      );
      
      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        
        // Check if this user was created by the creator
        if (userData['createdBy'] === creatorEmail) {
          users.push({
            id: userDoc.id,
            email: userData['Email'],
            name: userData['Full Name'],
            password: userData['Password'],
            mobile: userData['Phone Number'],
            phone: userData['Phone Number'],
            role: userData['Role'],
            status: userData['status'],
            createdBy: userData['createdBy'],
            createdAt: userData['createdat']
          });
        }
      });
    }
    
    // Check admins directly under Main Admin (created by Main Admin)
    try {
      const mainAdminAdminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'admins')
      );
      
      for (const adminDoc of mainAdminAdminsSnapshot.docs) {
        const adminData = adminDoc.data();
        
        // Check if this admin was created by the creator
        if (adminData['createdBy'] === creatorEmail) {
          users.push({
            id: adminDoc.id,
            email: adminData['Email'],
            name: adminData['Full Name'],
            password: adminData['Password'],
            mobile: adminData['Phone Number'],
            phone: adminData['Phone Number'],
            role: adminData['Role'],
            status: adminData['status'],
            createdBy: adminData['createdBy'],
            createdAt: adminData['createdat']
          });
        }
        
        // Get users under this admin (for admins created by the creator or if admin is the creator)
        if (adminData['createdBy'] === creatorEmail || adminData['Email'] === creatorEmail) {
          try {
            const adminUsersSnapshot = await getDocs(
              collection(db, 'mainAdmin', 'mainAdmin', 'admins', adminDoc.id, 'users')
            );
            
            adminUsersSnapshot.forEach((userDoc) => {
              const userData = userDoc.data();
              users.push({
                id: userDoc.id,
                email: userData['Email'],
                name: userData['Full Name'],
                password: userData['Password'],
                mobile: userData['Phone Number'],
                phone: userData['Phone Number'],
                role: userData['Role'],
                status: userData['status'],
                createdBy: userData['createdBy'],
                createdAt: userData['createdat']
              });
            });
          } catch (err) {
            console.log(`No users found under admin ${adminDoc.id} or collection doesn't exist yet`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error fetching from mainAdmin/mainAdmin/admins:', error);
    }
    
    return { success: true, data: users };
  } catch (error) {
    console.error('Error getting users by creator:', error);
    return { success: false, error: error.message };
  }
};

export const getUserHierarchy = async (userEmail, userRole) => {
  try {
    const hierarchy = {
      superadmins: [],
      admins: [],
      users: []
    };

    if (userRole === 'main_admin') {
      // Main Admin sees everyone
      const allUsers = await getAllUsers();
      if (allUsers.success) {
        allUsers.data.forEach(user => {
          if (user.role === 'super_admin') hierarchy.superadmins.push(user);
          else if (user.role === 'admin') hierarchy.admins.push(user);
          else if (user.role === 'user') hierarchy.users.push(user);
        });
      }
    } else if (userRole === 'super_admin') {
      // Super Admin sees admins and users they created (directly or indirectly)
      const directCreations = await getUsersByCreator(userEmail);
      if (directCreations.success) {
        directCreations.data.forEach(user => {
          if (user.role === 'admin') hierarchy.admins.push(user);
          else if (user.role === 'user') hierarchy.users.push(user);
        });
      }
      
      // Get users created by their admins
      for (const admin of hierarchy.admins) {
        const adminUsers = await getUsersByCreator(admin.email);
        if (adminUsers.success) {
          adminUsers.data.forEach(user => {
            if (user.role === 'user') {
              // Check if this user is already in the hierarchy to avoid duplicates
              const isDuplicate = hierarchy.users.some(existingUser => existingUser.email === user.email);
              if (!isDuplicate) {
                hierarchy.users.push(user);
              }
            }
          });
        }
      }
    } else if (userRole === 'admin') {
      // Admin sees only users they created
      const myUsers = await getUsersByCreator(userEmail);
      if (myUsers.success) {
        myUsers.data.forEach(user => {
          if (user.role === 'user') {
            hierarchy.users.push(user);
          }
        });
      }
      
      // Also find the admin's location to get their superAdminId and adminId
      const adminLocation = await findUserLocation(userEmail);
      if (adminLocation.success) {
        // Check for users directly under this admin
        try {
          let adminUsersSnapshot;
          
          // Check if admin is under Super Admin or directly under Main Admin
          if (adminLocation.superAdminId && adminLocation.adminId) {
            // Admin under Super Admin
            adminUsersSnapshot = await getDocs(
              collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', adminLocation.superAdminId, 'admins', adminLocation.adminId, 'users')
            );
          } else if (adminLocation.adminId && !adminLocation.superAdminId) {
            // Admin directly under Main Admin
            adminUsersSnapshot = await getDocs(
              collection(db, 'mainAdmin', 'mainAdmin', 'admins', adminLocation.adminId, 'users')
            );
          }
          
          if (adminUsersSnapshot) {
            adminUsersSnapshot.forEach((userDoc) => {
              const userData = userDoc.data();
              const user = {
                id: userDoc.id,
                email: userData['Email'],
                name: userData['Full Name'],
                password: userData['Password'],
                mobile: userData['Phone Number'],
                phone: userData['Phone Number'],
                role: userData['Role'],
                status: userData['status'],
                createdBy: userData['createdBy'],
                createdAt: userData['createdat']
              };
              
              // Check if this user is already in the hierarchy to avoid duplicates
              const isDuplicate = hierarchy.users.some(existingUser => existingUser.email === user.email);
              if (!isDuplicate) {
                hierarchy.users.push(user);
              }
            });
          }
        } catch (err) {
          console.log(`No users found under admin ${adminLocation.adminId} or collection doesn't exist yet`);
        }
      }
    }

    return { success: true, data: hierarchy };
  } catch (error) {
    console.error('Error getting user hierarchy:', error);
    return { success: false, error: error.message };
  }
};

export const updateUser = async (userEmail, userData) => {
  try {
    console.log('🔍 updateUser called for:', userEmail);
    console.log('📝 Update data:', userData);
    
    // Find the user's location in the hierarchy
    const userLocation = await findUserLocation(userEmail);
    
    if (!userLocation.success) {
      console.error('❌ User not found in database:', userEmail);
      return { success: false, error: 'User not found in database' };
    }
    
    console.log('📍 User location:', userLocation);
    
    let docRef;
    let path;
    
    // Update based on role and location
    if (userLocation.role === 'main_admin') {
      // Update main admin
      path = 'mainAdmin/mainAdmin';
      docRef = doc(db, 'mainAdmin', 'mainAdmin');
    } else if (userLocation.role === 'super_admin') {
      // Update super admin
      path = `mainAdmin/mainAdmin/superadmins/${userLocation.userId}`;
      docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.userId);
    } else if (userLocation.role === 'admin') {
      // Check if admin is directly under Main Admin or under a Super Admin
      if (userLocation.superAdminId) {
        // Admin under Super Admin
        path = `mainAdmin/mainAdmin/superadmins/${userLocation.superAdminId}/admins/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'admins', userLocation.userId);
      } else {
        // Admin directly under Main Admin
        path = `mainAdmin/mainAdmin/admins/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'admins', userLocation.userId);
      }
    } else if (userLocation.role === 'user') {
      // Check if user is under Admin or directly under Super Admin or Main Admin
      if (userLocation.adminId && userLocation.superAdminId) {
        // User under Admin (who is under Super Admin)
        path = `mainAdmin/mainAdmin/superadmins/${userLocation.superAdminId}/admins/${userLocation.adminId}/users/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'admins', userLocation.adminId, 'users', userLocation.userId);
      } else if (userLocation.adminId && !userLocation.superAdminId) {
        // User under Admin (who is directly under Main Admin)
        path = `mainAdmin/mainAdmin/admins/${userLocation.adminId}/users/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'admins', userLocation.adminId, 'users', userLocation.userId);
      } else if (userLocation.superAdminId) {
        // User directly under Super Admin
        path = `mainAdmin/mainAdmin/superadmins/${userLocation.superAdminId}/users/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'users', userLocation.userId);
      } else {
        // User directly under Main Admin
        path = `mainAdmin/mainAdmin/users/${userLocation.userId}`;
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'users', userLocation.userId);
      }
    } else {
      console.error('❌ Invalid user role:', userLocation.role);
      return { success: false, error: 'Invalid user role' };
    }
    
    console.log('📍 Updating document at path:', path);
    console.log('📝 With data:', userData);
    
    await updateDoc(docRef, userData);
    console.log(`✅ Document update completed for ${userLocation.role} with email: ${userEmail}`);
    
    // Verify the update by reading the document back
    const verifyDoc = await getDoc(docRef);
    if (verifyDoc.exists()) {
      console.log('🔍 Verified document data after update:', verifyDoc.data());
    } else {
      console.error('❌ Document does not exist after update!');
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating user:', error);
    return { success: false, error: error.message };
  }
};

export const deleteUser = async (userId, userEmail) => {
  try {
    // First, find the user's location in the hierarchy
    const userLocation = await findUserLocation(userEmail);
    
    if (!userLocation.success) {
      return { success: false, error: 'User not found in database' };
    }
    
    let docRef;
    
    // Delete based on role and location
    if (userLocation.role === 'super_admin') {
      // Delete super admin
      docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userId);
    } else if (userLocation.role === 'admin') {
      // Check if admin is directly under Main Admin or under a Super Admin
      if (userLocation.superAdminId) {
        // Admin under Super Admin
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'admins', userId);
      } else {
        // Admin directly under Main Admin
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'admins', userId);
      }
    } else if (userLocation.role === 'user') {
      // Check if user is under Admin or directly under Super Admin or Main Admin
      if (userLocation.adminId && userLocation.superAdminId) {
        // User under Admin (who is under Super Admin)
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'admins', userLocation.adminId, 'users', userId);
      } else if (userLocation.adminId && !userLocation.superAdminId) {
        // User under Admin (who is directly under Main Admin)
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'admins', userLocation.adminId, 'users', userId);
      } else if (userLocation.superAdminId) {
        // User directly under Super Admin
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'superadmins', userLocation.superAdminId, 'users', userId);
      } else {
        // User directly under Main Admin
        docRef = doc(db, 'mainAdmin', 'mainAdmin', 'users', userId);
      }
    } else {
      return { success: false, error: 'Invalid user role' };
    }
    
    await deleteDoc(docRef);
    console.log(`✅ Deleted ${userLocation.role} with ID: ${userId}`);
    return { success: true };
  } catch (error) {
    console.error('Error deleting user:', error);
    return { success: false, error: error.message };
  }
};

// ==================== MESSAGES ====================

export const createMessage = async (messageData) => {
  try {
    const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
      ...messageData,
      timestamp: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating message:', error);
    return { success: false, error: error.message };
  }
};

export const getAllMessages = async () => {
  try {
    const q = query(collection(db, MESSAGES_COLLECTION), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const messages = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      messages.push({ 
        id: doc.id, 
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    return { success: true, data: messages };
  } catch (error) {
    console.error('Error getting all messages:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllMessages = async () => {
  try {
    // Get all messages
    const messagesRef = collection(db, MESSAGES_COLLECTION);
    const querySnapshot = await getDocs(messagesRef);
    
    // Use a batched write to delete all messages
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Deleted ${querySnapshot.size} messages`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('Error clearing all messages:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear messages for a specific user
 * @param {string} senderEmail - Email of the user whose messages should be cleared
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const clearMessagesBySender = async (senderEmail) => {
  try {
    console.log('🗑️ Clearing messages for user:', senderEmail);
    
    // Query messages by sender
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('sentBy', '==', senderEmail)
    );
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} messages to delete for ${senderEmail}`);
    
    // Use batched write to delete all matching messages
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`✅ Deleted ${querySnapshot.size} messages for ${senderEmail}`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error clearing user messages:', error);
    return { success: false, error: error.message };
  }
};

export const getMessagesBySender = async (senderEmail) => {
  try {
    // Try with index first (requires Firebase composite index)
    try {
      const q = query(
        collection(db, MESSAGES_COLLECTION), 
        where('sentBy', '==', senderEmail),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      return { success: true, data: messages };
    } catch (indexError) {
      // Fallback: Get all messages and filter/sort in memory (no index needed)
      console.warn('⚠️ Firebase index not found, using fallback query');
      console.warn('📝 Create index here:', indexError.message.match(/https:\/\/[^\s]+/)?.[0]);
      
      const q = query(collection(db, MESSAGES_COLLECTION), where('sentBy', '==', senderEmail));
      const querySnapshot = await getDocs(q);
      const messages = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        messages.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      // Sort in memory by timestamp (newest first)
      messages.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return { success: true, data: messages };
    }
  } catch (error) {
    console.error('Error getting messages by sender:', error);
    return { success: false, error: error.message };
  }
};

// ==================== ACTIVITY LOGS ====================

export const createActivityLog = async (logData) => {
  try {
    const docRef = await addDoc(collection(db, ACTIVITY_LOGS_COLLECTION), {
      ...logData,
      timestamp: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating activity log:', error);
    return { success: false, error: error.message };
  }
};

export const getAllActivityLogs = async () => {
  try {
    const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), orderBy('timestamp', 'desc'));
    const querySnapshot = await getDocs(q);
    const logs = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({ 
        id: doc.id, 
        ...data,
        timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
      });
    });
    return { success: true, data: logs };
  } catch (error) {
    console.error('Error getting activity logs:', error);
    return { success: false, error: error.message };
  }
};

export const clearAllActivityLogs = async () => {
  try {
    // Get all activity logs
    const logsRef = collection(db, ACTIVITY_LOGS_COLLECTION);
    const querySnapshot = await getDocs(logsRef);
    
    // Use a batched write to delete all logs
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`Deleted ${querySnapshot.size} activity logs`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('Error clearing activity logs:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Clear activity logs for a specific user
 * @param {string} userEmail - Email of the user whose logs should be cleared
 * @returns {Promise<{success: boolean, count?: number, error?: string}>}
 */
export const clearActivityLogsByUser = async (userEmail) => {
  try {
    console.log('🗑️ Clearing activity logs for user:', userEmail);
    
    // Query logs by user
    const q = query(
      collection(db, ACTIVITY_LOGS_COLLECTION),
      where('performedBy', '==', userEmail)
    );
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} logs to delete for ${userEmail}`);
    
    // Use batched write to delete all matching logs
    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    
    // Commit the batch
    await batch.commit();
    
    console.log(`✅ Deleted ${querySnapshot.size} activity logs for ${userEmail}`);
    return { success: true, count: querySnapshot.size };
  } catch (error) {
    console.error('❌ Error clearing user activity logs:', error);
    return { success: false, error: error.message };
  }
};

export const getActivityLogsByUser = async (userEmail) => {
  try {
    // Try with index first (requires Firebase composite index)
    try {
      const q = query(
        collection(db, ACTIVITY_LOGS_COLLECTION), 
        where('performedBy', '==', userEmail),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      return { success: true, data: logs };
    } catch (indexError) {
      // Fallback: Get all logs and filter/sort in memory (no index needed)
      console.warn('⚠️ Firebase index not found for activity logs, using fallback query');
      console.warn('📝 Create index here:', indexError.message.match(/https:\/\/[^\s]+/)?.[0]);
      
      const q = query(collection(db, ACTIVITY_LOGS_COLLECTION), where('performedBy', '==', userEmail));
      const querySnapshot = await getDocs(q);
      const logs = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logs.push({ 
          id: doc.id, 
          ...data,
          timestamp: data.timestamp?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
      
      // Sort in memory by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      
      return { success: true, data: logs };
    }
  } catch (error) {
    console.error('Error getting activity logs by user:', error);
    return { success: false, error: error.message };
  }
};

// ==================== DATA ALLOCATIONS ====================

export const createDataAllocation = async (allocationData) => {
  try {
    const docRef = await addDoc(collection(db, DATA_ALLOCATIONS_COLLECTION), {
      ...allocationData,
      createdAt: serverTimestamp()
    });
    return { success: true, id: docRef.id };
  } catch (error) {
    console.error('Error creating data allocation:', error);
    return { success: false, error: error.message };
  }
};

export const getDataAllocationsByUser = async (userId) => {
  try {
    const q = query(collection(db, DATA_ALLOCATIONS_COLLECTION), where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const allocations = [];
    querySnapshot.forEach((doc) => {
      allocations.push({ id: doc.id, ...doc.data() });
    });
    return { success: true, data: allocations };
  } catch (error) {
    console.error('Error getting data allocations:', error);
    return { success: false, error: error.message };
  }
};

export const updateDataAllocation = async (allocationId, allocationData) => {
  try {
    const docRef = doc(db, DATA_ALLOCATIONS_COLLECTION, allocationId);
    await updateDoc(docRef, allocationData);
    return { success: true };
  } catch (error) {
    console.error('Error updating data allocation:', error);
    return { success: false, error: error.message };
  }
};

export const deleteDataAllocation = async (allocationId) => {
  try {
    const docRef = doc(db, DATA_ALLOCATIONS_COLLECTION, allocationId);
    await deleteDoc(docRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting data allocation:', error);
    return { success: false, error: error.message };
  }
};

// ==================== CONSUMERS ====================
// Consumer data functions are now in consumerData.js
// Import them from: import { addConsumer, addConsumersBatch, etc. } from './consumerData';
