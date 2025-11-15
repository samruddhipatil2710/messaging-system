/**
 * Cleanup Script - Remove Duplicate Fields in Firebase
 * 
 * This script removes lowercase duplicate fields (name, password, mobile)
 * and keeps only the capitalized versions (Full Name, Password, Phone Number)
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function cleanupDuplicateFields() {
  console.log('🧹 Starting cleanup of duplicate fields...\n');

  try {
    // Get mainAdmin document
    const mainAdminRef = db.collection('mainAdmin').doc('mainAdmin');
    const mainAdminDoc = await mainAdminRef.get();
    
    if (mainAdminDoc.exists) {
      const data = mainAdminDoc.data();
      
      // Check for duplicate fields
      if (data.name || data.password || data.mobile) {
        console.log('📋 Found duplicate fields in mainAdmin:');
        if (data.name) console.log('  - name:', data.name);
        if (data.password) console.log('  - password:', data.password);
        if (data.mobile) console.log('  - mobile:', data.mobile);
        
        // Remove lowercase fields
        await mainAdminRef.update({
          name: admin.firestore.FieldValue.delete(),
          password: admin.firestore.FieldValue.delete(),
          mobile: admin.firestore.FieldValue.delete()
        });
        
        console.log('✅ Cleaned mainAdmin\n');
      } else {
        console.log('✅ mainAdmin is clean\n');
      }
    }

    // Clean superadmins
    const superadminsRef = mainAdminRef.collection('superadmins');
    const superadminsSnapshot = await superadminsRef.get();
    
    console.log(`📂 Checking ${superadminsSnapshot.size} superadmins...`);
    
    for (const superAdminDoc of superadminsSnapshot.docs) {
      const data = superAdminDoc.data();
      
      if (data.name || data.password || data.mobile) {
        console.log(`  🔧 Cleaning superadmin: ${data['Email'] || data.email}`);
        
        await superAdminDoc.ref.update({
          name: admin.firestore.FieldValue.delete(),
          password: admin.firestore.FieldValue.delete(),
          mobile: admin.firestore.FieldValue.delete()
        });
      }
      
      // Clean admins under this superadmin
      const adminsRef = superAdminDoc.ref.collection('admins');
      const adminsSnapshot = await adminsRef.get();
      
      if (adminsSnapshot.size > 0) {
        console.log(`  📂 Checking ${adminsSnapshot.size} admins under ${data['Email'] || data.email}...`);
        
        for (const adminDoc of adminsSnapshot.docs) {
          const adminData = adminDoc.data();
          
          if (adminData.name || adminData.password || adminData.mobile) {
            console.log(`    🔧 Cleaning admin: ${adminData['Email'] || adminData.email}`);
            
            await adminDoc.ref.update({
              name: admin.firestore.FieldValue.delete(),
              password: admin.firestore.FieldValue.delete(),
              mobile: admin.firestore.FieldValue.delete()
            });
          }
          
          // Clean users under this admin
          const usersRef = adminDoc.ref.collection('users');
          const usersSnapshot = await usersRef.get();
          
          if (usersSnapshot.size > 0) {
            console.log(`    📂 Checking ${usersSnapshot.size} users under ${adminData['Email'] || adminData.email}...`);
            
            for (const userDoc of usersSnapshot.docs) {
              const userData = userDoc.data();
              
              if (userData.name || userData.password || userData.mobile) {
                console.log(`      🔧 Cleaning user: ${userData['Email'] || userData.email}`);
                
                await userDoc.ref.update({
                  name: admin.firestore.FieldValue.delete(),
                  password: admin.firestore.FieldValue.delete(),
                  mobile: admin.firestore.FieldValue.delete()
                });
              }
            }
          }
        }
      }
    }

    console.log('\n✅ Cleanup completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Removed lowercase fields: name, password, mobile');
    console.log('  - Kept capitalized fields: Full Name, Password, Phone Number');
    
  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
  
  process.exit(0);
}

cleanupDuplicateFields();
