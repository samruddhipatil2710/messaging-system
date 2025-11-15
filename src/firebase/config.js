import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD9KuV5Ef8EGAqZ321HmhFDKQ3S3Yh-3E4",
  authDomain: "messaging-system-s.firebaseapp.com",
  projectId: "messaging-system-s",
  storageBucket: "messaging-system-s.firebasestorage.app",
  messagingSenderId: "449926371629",
  appId: "1:449926371629:web:b46bf093fae3d6312cdba4"
};

// Initialize Firebase (prevent duplicate initialization)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

console.log('✅ Firebase initialized:', app.name);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
