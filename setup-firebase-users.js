/**
 * Firebase User Setup Script
 * 
 * This script creates initial users in Firebase Authentication and Firestore.
 * Run this after setting up your Firebase project.
 * 
 * Usage:
 * 1. Update the firebaseConfig below with your Firebase credentials
 * 2. Run: node setup-firebase-users.js
 */

import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

// Initial users to create
const initialUsers = [
  {
    email: 'mainadmin@demo.com',
    password: 'password123',
    name: 'Main Admin',
    mobile: '9991100001',
    phone: '9991100001',
    role: 'main_admin',
    status: 'Active',
    createdBy: ''
  },
  {
    email: 'superadmin@demo.com',
    password: 'password123',
    name: 'Super Admin',
    mobile: '9991100002',
    phone: '9991100002',
    role: 'super_admin',
    status: 'Active',
    createdBy: 'mainadmin@demo.com'
  },
  {
    email: 'admin@demo.com',
    password: 'password123',
    name: 'Admin',
    mobile: '9991100003',
    phone: '9991100003',
    role: 'admin',
    status: 'Active',
    createdBy: 'superadmin@demo.com'
  },
  {
    email: 'user@demo.com',
    password: 'password123',
    name: 'User',
    mobile: '9991100004',
    phone: '9991100004',
    role: 'user',
    status: 'Active',
    createdBy: 'admin@demo.com'
  }
];

/**
 * Create users in Firebase Authentication and Firestore
 */
async function setupUsers() {
  console.log('🚀 Starting Firebase user setup...\n');

  for (const userData of initialUsers) {
    try {
      // Create user in Firebase Authentication
      console.log(`Creating auth user: ${userData.email}...`);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      // Add user document to Firestore
      console.log(`Adding user to Firestore...`);
      await addDoc(collection(db, 'users'), {
        email: userData.email,
        name: userData.name,
        mobile: userData.mobile,
        phone: userData.phone,
        role: userData.role,
        status: userData.status,
        createdBy: userData.createdBy,
        createdAt: serverTimestamp(),
        firebaseUid: userCredential.user.uid
      });
      
      console.log(`✅ Successfully created: ${userData.email} (${userData.role})\n`);
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  User already exists: ${userData.email}\n`);
      } else {
        console.error(`❌ Error creating ${userData.email}:`, error.message, '\n');
      }
    }
  }
  
  console.log('✨ Setup complete!\n');
  console.log('You can now login with:');
  console.log('- Main Admin: mainadmin@demo.com / password123');
  console.log('- Super Admin: superadmin@demo.com / password123');
  console.log('- Admin: admin@demo.com / password123');
  console.log('- User: user@demo.com / password123');
  console.log('\nOr use mobile numbers:');
  console.log('- Main Admin: 9991100001 / password123');
  console.log('- Super Admin: 9991100002 / password123');
  console.log('- Admin: 9991100003 / password123');
  console.log('- User: 9991100004 / password123');
  
  process.exit(0);
}

// Run the setup
setupUsers().catch((error) => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});
