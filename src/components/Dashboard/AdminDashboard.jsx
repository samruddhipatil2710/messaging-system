import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import Sidebar from './Sidebar';
import CreateUser from '../UserManagement/CreateUser';
import EditUser from '../UserManagement/EditUser';
import UserList from '../UserManagement/UserList';
import HierarchicalView from '../UserManagement/HierarchicalView';
import HierarchyDetail from '../UserManagement/HierarchyDetail';
import DataAllocation from '../UserManagement/DataAllocationNew';
import ViewAllocatedData from '../UserManagement/ViewAllocatedData';
import MessageComposer from '../Messaging/MessageComposer';
import MessageHistory from '../Messaging/MessageHistory';
import ActivityLogs from './ActivityLogs';
import UserProfile from './UserProfile';
import './NewTheme.css';

const AdminDashboard = () => {
  const { user } = useAuth();

  const handleCreateUser = async (newUser) => {
    try {
      const { createUser, createActivityLog, findUserLocation } = await import('../../firebase/firestore');
      
      // Find the current user's location in the hierarchy
      const userLocation = await findUserLocation(user.email);
      
      if (!userLocation.success) {
        alert('Error: Could not find your account in the database');
        return;
      }
      
      // Ensure we're only creating users (not admins or super admins)
      if (newUser.role !== 'user') {
        alert('Error: As an Admin, you can only create regular users');
        return;
      }
      
      // Create the user with proper hierarchy info
      const result = await createUser(newUser, {
        superAdminId: userLocation.superAdminId,
        adminId: userLocation.userId // Use the admin's own ID
      });
      
      if (result.success) {
        // Log the activity
        await createActivityLog({
          action: 'user_created',
          performedBy: user.email,
          details: `Created ${newUser.role}: ${newUser.name} (${newUser.email})`
        });
        
        console.log('✅ User created successfully in Firebase');
      } else {
        alert('Error creating user: ' + result.error);
      }
    } catch (error) {
      console.error('Error in handleCreateUser:', error);
      alert('Failed to create user: ' + error.message);
    }
  };

  return (
    <div className="dashboard-container">
      <Sidebar role="admin" />
      
      <div className="main-content">
        <Routes>
          <Route index element={<AdminHome />} />
          <Route path="hierarchical-view" element={<HierarchicalView />} />
          <Route path="hierarchy-detail/:type/:id" element={<HierarchyDetail />} />
          <Route path="create-user" element={<CreateUser role="admin" onSubmit={handleCreateUser} />} />
          <Route path="edit-user" element={<EditUser role="admin" />} />
          <Route path="users" element={<UserList />} />
          <Route path="data-allocation" element={<DataAllocation />} />
          <Route path="view-allocated-data" element={<ViewAllocatedData />} />
          <Route path="send-messages" element={<MessageComposer />} />
          <Route path="messages" element={<MessageComposer />} />
          <Route path="message-history" element={<MessageHistory />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="profile" element={<UserProfile />} />
        </Routes>
      </div>
    </div>
  );
};

const AdminHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [allocatedAreaCount, setAllocatedAreaCount] = useState(0);

  useEffect(() => {
    const loadCounts = async () => {
      if (!user) return;
      
      try {
        const { getAllUsers, findUserLocation } = await import('../../firebase/firestore');
        const { getAllocationsByCreator } = await import('../../firebase/dataAllocation');
        
        // Find the admin's location in the hierarchy
        const adminLocation = await findUserLocation(user.email);
        
        if (!adminLocation.success) {
          console.error('Failed to find admin location:', adminLocation.error);
          return;
        }
        
        // Get all users
        const result = await getAllUsers();
        
        if (!result.success) {
          console.error('Failed to load users:', result.error);
          return;
        }
        
        const allUsers = result.data;
        // Count users created by this admin
        const myUsers = allUsers.filter(u => u.role === 'user' && u.createdBy === user?.email);
        setUserCount(myUsers.length);
        
        // Count allocated areas/locations made by this admin
        const allocationsResult = await getAllocationsByCreator(user.email);
        if (allocationsResult.success) {
          // Count total number of allocations (each allocation represents one or more locations)
          const totalAllocations = allocationsResult.data.length;
          setAllocatedAreaCount(totalAllocations);
          
          console.log(`✅ Admin ${user.email} has ${myUsers.length} users and ${totalAllocations} allocations`);
        } else {
          console.error('Failed to load allocations:', allocationsResult.error);
          setAllocatedAreaCount(0);
        }
        
      } catch (error) {
        console.error('Error loading counts:', error);
      }
    };
    
    loadCounts();
  }, [user]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Admin Dashboard</h1>
        <p className="page-subtitle">Manage users and send messages</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">My Users</span>
            <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="stat-value">{userCount}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Allocated Areas</span>
            <div className="stat-icon">📍</div>
          </div>
          <div className="stat-value">{allocatedAreaCount}</div>
        </div>
      </div>

      <div className="content-card">
        <h2 className="card-title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/admin/create-user', { state: { preSelectedRole: 'user' } })}>Create User</button>
          <button className="btn btn-primary" onClick={() => navigate('/admin/data-allocation')}>Allocate Data</button>
          <button className="btn btn-secondary" onClick={() => navigate('/admin/users')}>View All Users</button>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;