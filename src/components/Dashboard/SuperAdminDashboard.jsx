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

const SuperAdminDashboard = () => {
  const { user } = useAuth();

  const handleCreateUser = async (newUser) => {
    try {
      const { createUser, createActivityLog, findUserLocation, getAllUsers } = await import('../../firebase/firestore');
      
      // Find the current user's location in the hierarchy
      const userLocation = await findUserLocation(user.email);
      
      if (!userLocation.success) {
        alert('Error: Could not find your account in the database');
        return;
      }
      
      let creatorInfo = {
        superAdminId: userLocation.superAdminId,
        adminId: userLocation.adminId
      };
      
      // If creating a regular user and the Super Admin doesn't have an admin ID
      // (which happens when they try to create a user directly), we need to find an admin
      if (newUser.role === 'user' && !creatorInfo.adminId) {
        // Get all users to find a suitable admin
        const allUsersResult = await getAllUsers();
        if (allUsersResult.success) {
          // Find an admin created by this super admin
          const adminCreatedByMe = allUsersResult.data.find(u => 
            u.role === 'admin' && u.createdBy === user.email
          );
          
          if (adminCreatedByMe) {
            creatorInfo.adminId = adminCreatedByMe.id;
            console.log('✅ Found admin for user creation:', adminCreatedByMe.id);
          } else {
            // If no admin is found, we can't create a regular user
            throw new Error('Cannot create a regular user without an admin. Please create an Admin first.');
          }
        }
      }
      
      // Create the user with proper hierarchy info
      const result = await createUser(newUser, creatorInfo);
      
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
      <Sidebar role="super_admin" />
      
      <div className="main-content">
        <Routes>
          <Route index element={<SuperAdminHome />} />
          <Route path="hierarchical-view" element={<HierarchicalView />} />
          <Route path="hierarchy-detail/:type/:id" element={<HierarchyDetail />} />
          <Route path="create-user" element={<CreateUser role="super_admin" onSubmit={handleCreateUser} />} />
          <Route path="edit-user" element={<EditUser role="super_admin" />} />
          <Route path="users" element={<UserList />} />
          <Route path="data-allocation" element={<DataAllocation />} />
          <Route path="view-allocated-data" element={<ViewAllocatedData />} />
          <Route path="messages" element={<MessageComposer />} />
          <Route path="message-history" element={<MessageHistory />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="profile" element={<UserProfile />} />
        </Routes>
      </div>
    </div>
  );
};

const SuperAdminHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [userCounts, setUserCounts] = useState({
    admin: 0,
    user: 0,
    total: 0
  });

  useEffect(() => {
    const loadUserCounts = async () => {
      if (!user) return;
      
      try {
        const { getAllUsers } = await import('../../firebase/firestore');
        const result = await getAllUsers();
        
        if (!result.success) {
          console.error('Failed to load users:', result.error);
          return;
        }
        
        const allUsers = result.data;
        
        // Get users directly created by this super admin
        const directlyCreated = allUsers.filter(u => u.createdBy === user?.email);
        
        // Get emails of admins created by this super admin
        const adminEmails = directlyCreated
          .filter(u => u.role === 'admin')
          .map(u => u.email);
        
        // Get users created by those admins (hierarchical)
        const createdByTheirAdmins = allUsers.filter(u => adminEmails.includes(u.createdBy));
        
        // Combine all visible users
        const allVisibleUsers = [...directlyCreated, ...createdByTheirAdmins];
        
        // Count by role
        const counts = allVisibleUsers.reduce((acc, user) => {
          if (user.role === 'admin') acc.admin++;
          if (user.role === 'user') acc.user++;
          acc.total++;
          return acc;
        }, { admin: 0, user: 0, total: 0 });
        
        setUserCounts(counts);
      } catch (error) {
        console.error('Error loading user counts:', error);
      }
    };
    
    loadUserCounts();
  }, [user]);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Super Admin Dashboard</h1>
        <p className="page-subtitle">Manage admins and users</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">My Admins</span>
            <div className="stat-icon">👤</div>
          </div>
          <div className="stat-value">{userCounts.admin}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">My Users</span>
            <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="stat-value">{userCounts.user}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total</span>
            <div className="stat-icon"><i className="fa-solid fa-chart-line"></i></div>
          </div>
          <div className="stat-value">{userCounts.total}</div>
        </div>
      </div>

      <div className="content-card">
        <h2 className="card-title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '15px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/super-admin/create-user', { state: { preSelectedRole: 'admin' } })}>Create Admin</button>
          <button className="btn btn-primary" onClick={() => navigate('/super-admin/create-user', { state: { preSelectedRole: 'user' } })}>Create User</button>
          <button className="btn btn-secondary" onClick={() => navigate('/super-admin/users')}>View All Users</button>
        </div>
      </div>
    </>
  );
};

export default SuperAdminDashboard;