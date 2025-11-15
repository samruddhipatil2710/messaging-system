/**
 * Firebase Structure Verification Script
 * 
 * This script checks your Firebase database structure and shows:
 * - All Super Admins and their admins
 * - All Admins and their users
 * - Any users in incorrect locations
 * 
 * Usage: node verify-firebase-structure.js
 */

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

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

async function verifyStructure() {
  console.log('🔍 Verifying Firebase Structure...\n');
  
  try {
    // Check Main Admin document
    console.log('📋 Checking Main Admin Document...');
    const mainAdminDoc = await getDoc(doc(db, 'mainAdmin', 'mainAdmin'));
    
    if (mainAdminDoc.exists()) {
      const data = mainAdminDoc.data();
      console.log('✅ Main Admin Found:');
      console.log(`   Email: ${data['Email']}`);
      console.log(`   Name: ${data['Full Name']}`);
      console.log(`   Role: ${data['Role']}`);
      console.log('');
    } else {
      console.log('❌ Main Admin document not found!\n');
    }
    
    // Check Super Admins
    console.log('📋 Checking Super Admins...');
    const superAdminsSnapshot = await getDocs(
      collection(db, 'mainAdmin', 'mainAdmin', 'superadmins')
    );
    
    if (superAdminsSnapshot.empty) {
      console.log('❌ No Super Admins found!\n');
    } else {
      console.log(`✅ Found ${superAdminsSnapshot.size} Super Admin(s):\n`);
      
      for (const superAdminDoc of superAdminsSnapshot.docs) {
        const superAdminData = superAdminDoc.data();
        console.log(`   🔹 ${superAdminData['Full Name']} (${superAdminData['Email']})`);
        console.log(`      ID: ${superAdminDoc.id}`);
        console.log(`      Created By: ${superAdminData['createdBy'] || 'System'}`);
        
        // Check admins under this super admin
        const adminsSnapshot = await getDocs(
          collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
        );
        
        if (adminsSnapshot.empty) {
          console.log(`      ⚠️  No admins created yet`);
        } else {
          console.log(`      ✅ Has ${adminsSnapshot.size} admin(s):`);
          
          for (const adminDoc of adminsSnapshot.docs) {
            const adminData = adminDoc.data();
            console.log(`         • ${adminData['Full Name']} (${adminData['Email']})`);
            console.log(`           ID: ${adminDoc.id}`);
            
            // Check users under this admin
            const usersSnapshot = await getDocs(
              collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins', adminDoc.id, 'users')
            );
            
            if (usersSnapshot.empty) {
              console.log(`           ⚠️  No users created yet`);
            } else {
              console.log(`           ✅ Has ${usersSnapshot.size} user(s):`);
              usersSnapshot.forEach((userDoc) => {
                const userData = userDoc.data();
                console.log(`              - ${userData['Full Name']} (${userData['Email']})`);
              });
            }
          }
        }
        console.log('');
      }
    }
    
    // Check for incorrectly placed collections
    console.log('🔍 Checking for incorrectly placed collections...\n');
    
    try {
      const incorrectAdmins = await getDocs(collection(db, 'mainAdmin', 'admins'));
      if (!incorrectAdmins.empty) {
        console.log(`⚠️  WARNING: Found ${incorrectAdmins.size} document(s) in INCORRECT location: mainAdmin/admins/`);
        console.log('   These should be moved to: mainAdmin/mainAdmin/superadmins/{superAdminId}/admins/');
        incorrectAdmins.forEach(doc => {
          const data = doc.data();
          console.log(`   - ${data['Full Name'] || data['Email']} (ID: ${doc.id})`);
        });
        console.log('');
      }
    } catch (e) {
      // Collection doesn't exist, which is good
    }
    
    try {
      const incorrectUsers = await getDocs(collection(db, 'mainAdmin', 'users'));
      if (!incorrectUsers.empty) {
        console.log(`⚠️  WARNING: Found ${incorrectUsers.size} document(s) in INCORRECT location: mainAdmin/users/`);
        console.log('   These should be moved to: mainAdmin/mainAdmin/superadmins/{superAdminId}/admins/{adminId}/users/');
        incorrectUsers.forEach(doc => {
          const data = doc.data();
          console.log(`   - ${data['Full Name'] || data['Email']} (ID: ${doc.id})`);
        });
        console.log('');
      }
    } catch (e) {
      // Collection doesn't exist, which is good
    }
    
    console.log('✨ Verification Complete!\n');
    console.log('📊 Summary:');
    console.log(`   Super Admins: ${superAdminsSnapshot.size}`);
    
    let totalAdmins = 0;
    let totalUsers = 0;
    
    for (const superAdminDoc of superAdminsSnapshot.docs) {
      const adminsSnapshot = await getDocs(
        collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins')
      );
      totalAdmins += adminsSnapshot.size;
      
      for (const adminDoc of adminsSnapshot.docs) {
        const usersSnapshot = await getDocs(
          collection(db, 'mainAdmin', 'mainAdmin', 'superadmins', superAdminDoc.id, 'admins', adminDoc.id, 'users')
        );
        totalUsers += usersSnapshot.size;
      }
    }
    
    console.log(`   Total Admins: ${totalAdmins}`);
    console.log(`   Total Users: ${totalUsers}`);
    console.log(`   Grand Total: ${superAdminsSnapshot.size + totalAdmins + totalUsers} users in hierarchy\n`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run verification
verifyStructure();
