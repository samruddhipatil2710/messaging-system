// Test Activity Logs Firebase Connection
// Run this with: node test-activity-logs.js

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp 
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyD9KuV5Ef8EGAqZ321HmhFDKQ3S3Yh-3E4",
  authDomain: "messaging-system-s.firebaseapp.com",
  projectId: "messaging-system-s",
  storageBucket: "messaging-system-s.firebasestorage.app",
  messagingSenderId: "1085032095537",
  appId: "1:1085032095537:web:6e1a6f5f3b8e5f8e5f8e5f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function testActivityLogs() {
  console.log('🧪 Testing Activity Logs Firebase Connection...\n');

  try {
    // Test 1: Get all activity logs
    console.log('📋 Test 1: Fetching all activity logs...');
    const logsQuery = query(
      collection(db, 'activityLogs'),
      orderBy('timestamp', 'desc')
    );
    const logsSnapshot = await getDocs(logsQuery);
    console.log(`✅ Found ${logsSnapshot.size} activity logs\n`);

    if (logsSnapshot.size > 0) {
      console.log('📝 Sample logs:');
      logsSnapshot.docs.slice(0, 5).forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.action} - ${data.details}`);
        console.log(`      By: ${data.performedBy}`);
        console.log(`      Time: ${data.timestamp?.toDate?.()?.toLocaleString() || 'N/A'}\n`);
      });
    }

    // Test 2: Create a test activity log
    console.log('📝 Test 2: Creating a test activity log...');
    const testLog = {
      action: 'test_action',
      performedBy: 'test@demo.com',
      details: 'Test activity log created by verification script',
      timestamp: serverTimestamp()
    };
    
    const docRef = await addDoc(collection(db, 'activityLogs'), testLog);
    console.log(`✅ Test log created with ID: ${docRef.id}\n`);

    // Test 3: Get logs by specific user
    console.log('📋 Test 3: Fetching logs by specific user...');
    const userLogsQuery = query(
      collection(db, 'activityLogs'),
      where('performedBy', '==', 'admin@demo.com'),
      orderBy('timestamp', 'desc')
    );
    const userLogsSnapshot = await getDocs(userLogsQuery);
    console.log(`✅ Found ${userLogsSnapshot.size} logs for admin@demo.com\n`);

    // Test 4: Check for different action types
    console.log('📊 Test 4: Analyzing activity types...');
    const allLogs = [];
    logsSnapshot.forEach(doc => allLogs.push(doc.data()));
    
    const actionCounts = allLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    console.log('Activity breakdown:');
    Object.entries(actionCounts).forEach(([action, count]) => {
      console.log(`   ${action}: ${count}`);
    });

    console.log('\n✅ All activity log tests passed!');
    console.log('\n📊 Summary:');
    console.log(`   Total Logs: ${logsSnapshot.size}`);
    console.log(`   Collection: activityLogs`);
    console.log(`   Status: ✅ Connected to Firebase`);

  } catch (error) {
    console.error('❌ Error testing activity logs:', error);
    console.error('Error details:', error.message);
  }

  process.exit(0);
}

testActivityLogs();
