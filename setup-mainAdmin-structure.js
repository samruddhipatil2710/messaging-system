/**
 * Firebase Main Admin Structure Setup Script
 * 
 * This script creates the mainAdmin document and initializes the subcollections structure.
 * Structure: mainAdmin (collection) -> mainAdmin (document) -> {superadmins, admins, users} (subcollections)
 * 
 * Usage:
 * 1. Make sure your Firebase config is correct in src/firebase/config.js
 * 2. Run: node setup-mainAdmin-structure.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Your Firebase configuration
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
const db = getFirestore(app);

// Sample users for each subcollection - Hierarchical structure
const sampleUsers = {
  superadmins: [
    {
      'Email': 'superadmin1@demo.com',
      'Full Name': 'Bob Wilson',
      'Password': 'password',
      'Phone Number': '9991100002',
      'Role': 'super_admin',
      'status': 'Active',
      'createdBy': 'mainadmin@demo.com',
      'createdat': serverTimestamp()
    },
    {
      'Email': 'superadmin2@demo.com',
      'Full Name': 'Alice Johnson',
      'Password': 'password',
      'Phone Number': '9991100005',
      'Role': 'super_admin',
      'status': 'Active',
      'createdBy': 'mainadmin@demo.com',
      'createdat': serverTimestamp()
    }
  ],
  admins: [
    // Admins created by Bob Wilson (superadmin1)
    {
      'Email': 'admin1@demo.com',
      'Full Name': 'Michael Johnson',
      'Password': 'password',
      'Phone Number': '9991100003',
      'Role': 'admin',
      'status': 'Active',
      'createdBy': 'superadmin1@demo.com',
      'createdat': serverTimestamp()
    },
    {
      'Email': 'admin2@demo.com',
      'Full Name': 'Sarah Williams',
      'Password': 'password',
      'Phone Number': '9991100006',
      'Role': 'admin',
      'status': 'Active',
      'createdBy': 'superadmin1@demo.com',
      'createdat': serverTimestamp()
    },
    // Admin created by Alice Johnson (superadmin2)
    {
      'Email': 'admin3@demo.com',
      'Full Name': 'David Brown',
      'Password': 'password',
      'Phone Number': '9991100007',
      'Role': 'admin',
      'status': 'Active',
      'createdBy': 'superadmin2@demo.com',
      'createdat': serverTimestamp()
    }
  ],
  users: [
    // Users created by Michael Johnson (admin1)
    {
      'Email': 'user1@demo.com',
      'Full Name': 'Jennifer Lee',
      'Password': 'password',
      'Phone Number': '9991100004',
      'Role': 'user',
      'status': 'Active',
      'createdBy': 'admin1@demo.com',
      'createdat': serverTimestamp()
    },
    {
      'Email': 'user2@demo.com',
      'Full Name': 'Robert Garcia',
      'Password': 'password',
      'Phone Number': '9991100008',
      'Role': 'user',
      'status': 'Active',
      'createdBy': 'admin1@demo.com',
      'createdat': serverTimestamp()
    },
    // Users created by Sarah Williams (admin2)
    {
      'Email': 'user3@demo.com',
      'Full Name': 'Thomas Anderson',
      'Password': 'password',
      'Phone Number': '9991100009',
      'Role': 'user',
      'status': 'Active',
      'createdBy': 'admin2@demo.com',
      'createdat': serverTimestamp()
    },
    {
      'Email': 'user4@demo.com',
      'Full Name': 'Emily Taylor',
      'Password': 'password',
      'Phone Number': '9991100010',
      'Role': 'user',
      'status': 'Active',
      'createdBy': 'admin2@demo.com',
      'createdat': serverTimestamp()
    },
    // Users created by David Brown (admin3)
    {
      'Email': 'user5@demo.com',
      'Full Name': 'Patricia Moore',
      'Password': 'password',
      'Phone Number': '9991100011',
      'Role': 'user',
      'status': 'Active',
      'createdBy': 'admin3@demo.com',
      'createdat': serverTimestamp()
    }
  ]
};

/**
 * Setup the mainAdmin structure with nested hierarchy
 */
async function setupMainAdminStructure() {
  console.log('🚀 Starting mainAdmin structure setup with nested hierarchy...\n');

  try {
    // Step 1: Create the mainAdmin document with Main Admin profile
    console.log('📝 Creating mainAdmin document with Main Admin profile...');
    const mainAdminDocRef = doc(db, 'mainAdmin', 'mainAdmin');
    await setDoc(mainAdminDocRef, {
      // Main Admin Profile
      'Email': 'mainadmin@demo.com',
      'Full Name': 'Main Admin',
      'Password': 'password',
      'Phone Number': '9991100001',
      'Role': 'main_admin',
      'status': 'Active',
      'createdAt': serverTimestamp(),
      'description': 'Main admin document containing user subcollections'
    });
    console.log('✅ mainAdmin document created with Main Admin profile\n');

    // Step 2: Create Super Admins
    console.log('📂 Creating superadmins...');
    const superAdminIds = {};
    
    for (const superAdminData of sampleUsers.superadmins) {
      const superAdminRef = collection(db, 'mainAdmin', 'mainAdmin', 'superadmins');
      const superAdminDoc = await addDoc(superAdminRef, superAdminData);
      superAdminIds[superAdminData['Email']] = superAdminDoc.id;
      console.log(`  ✅ Added ${superAdminData['Full Name']} (ID: ${superAdminDoc.id})`);
    }
    console.log('');

    // Step 3: Create Admins under their Super Admins
    console.log('📂 Creating admins under super admins...');
    const adminIds = {};
    
    for (const adminData of sampleUsers.admins) {
      const createdBy = adminData['createdBy'];
      const superAdminId = superAdminIds[createdBy];
      
      if (superAdminId) {
        const adminRef = collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminId, 'admins');
        const adminDoc = await addDoc(adminRef, adminData);
        adminIds[adminData['Email']] = { superAdminId, adminId: adminDoc.id };
        console.log(`  ✅ Added ${adminData['Full Name']} under ${createdBy} (ID: ${adminDoc.id})`);
      }
    }
    console.log('');

    // Step 4: Create Users under their Admins
    console.log('📂 Creating users under admins...');
    
    for (const userData of sampleUsers.users) {
      const createdBy = userData['createdBy'];
      const adminInfo = adminIds[createdBy];
      
      if (adminInfo) {
        const userRef = collection(
          db, 
          'mainAdmin', 
          'mainAdmin', 
          'superadmins', 
          adminInfo.superAdminId, 
          'admins', 
          adminInfo.adminId, 
          'users'
        );
        const userDoc = await addDoc(userRef, userData);
        console.log(`  ✅ Added ${userData['Full Name']} under ${createdBy} (ID: ${userDoc.id})`);
      }
    }
    console.log('');

    console.log('✨ Setup complete!\n');
    console.log('📊 Nested Structure created:');
    console.log('mainAdmin (collection)');
    console.log('  └── mainAdmin (document) ← Main Admin Profile');
    console.log('      └── superadmins (subcollection)');
    console.log('          ├── Bob Wilson (document)');
    console.log('          │   └── admins (subcollection)');
    console.log('          │       ├── Michael Johnson (document)');
    console.log('          │       │   └── users (subcollection)');
    console.log('          │       │       ├── Jennifer Lee');
    console.log('          │       │       └── Robert Garcia');
    console.log('          │       └── Sarah Williams (document)');
    console.log('          │           └── users (subcollection)');
    console.log('          │               ├── Thomas Anderson');
    console.log('          │               └── Emily Taylor');
    console.log('          └── Alice Johnson (document)');
    console.log('              └── admins (subcollection)');
    console.log('                  └── David Brown (document)');
    console.log('                      └── users (subcollection)');
    console.log('                          └── Patricia Moore\n');
    
    console.log('👥 Hierarchy:');
    console.log('Main Admin');
    console.log('  ├── Bob Wilson (Super Admin)');
    console.log('  │   ├── Michael Johnson (Admin)');
    console.log('  │   │   ├── Jennifer Lee (User)');
    console.log('  │   │   └── Robert Garcia (User)');
    console.log('  │   └── Sarah Williams (Admin)');
    console.log('  │       ├── Thomas Anderson (User)');
    console.log('  │       └── Emily Taylor (User)');
    console.log('  └── Alice Johnson (Super Admin)');
    console.log('      └── David Brown (Admin)');
    console.log('          └── Patricia Moore (User)\n');
    
    console.log('🔑 Login credentials (all passwords: "password"):');
    console.log('\n📌 Main Admin (sees everyone):');
    console.log('   Email: mainadmin@demo.com | Mobile: 9991100001');
    console.log('\n📌 Super Admins (see their admins + users):');
    console.log('   Email: superadmin1@demo.com | Mobile: 9991100002 (Bob Wilson)');
    console.log('   Email: superadmin2@demo.com | Mobile: 9991100005 (Alice Johnson)');
    console.log('\n📌 Admins (see their users):');
    console.log('   Email: admin1@demo.com | Mobile: 9991100003 (Michael Johnson)');
    console.log('   Email: admin2@demo.com | Mobile: 9991100006 (Sarah Williams)');
    console.log('   Email: admin3@demo.com | Mobile: 9991100007 (David Brown)');
    console.log('\n📌 Users (see only their data):');
    console.log('   Email: user1@demo.com | Mobile: 9991100004 (Jennifer Lee)');
    console.log('   Email: user2@demo.com | Mobile: 9991100008 (Robert Garcia)');
    console.log('   Email: user3@demo.com | Mobile: 9991100009 (Thomas Anderson)');
    console.log('   Email: user4@demo.com | Mobile: 9991100010 (Emily Taylor)');
    console.log('   Email: user5@demo.com | Mobile: 9991100011 (Patricia Moore)\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup
setupMainAdminStructure();
