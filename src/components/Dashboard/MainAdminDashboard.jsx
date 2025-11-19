import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import CreateUser from '../UserManagement/CreateUser';
import EditUser from '../UserManagement/EditUser';
import UserList from '../UserManagement/UserList';
import HierarchicalView from '../UserManagement/HierarchicalView';
import HierarchyDetail from '../UserManagement/HierarchyDetail';
import DataAllocation from '../UserManagement/DataAllocationNew';
import UploadDistrictData from '../DataManagement/UploadDistrictData';
import ViewAllocatedData from '../UserManagement/ViewAllocatedData';
import MessageComposer from '../Messaging/MessageComposer';
import MessageHistory from '../Messaging/MessageHistory';
import ActivityLogs from './ActivityLogs';
import UserProfile from './UserProfile';
import LocationSelector from '../Location/LocationSelector';
import './NewTheme.css';

const DataAccessManagement = () => {
  // State for users, districts, and permissions
  const [users, setUsers] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [permissions, setPermissions] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [selectedUserData, setSelectedUserData] = useState(null);

  // Default permissions for each district
  const defaultDistrictPermissions = {
    canView: false,
    canEdit: false,
    canExport: false
  };

  // Load mock data on component mount
  useEffect(() => {
    // Mock users data
    const mockUsers = [
      { _id: '1', name: 'Super Admin', email: 'super@example.com', role: 'super_admin' },
      { _id: '2', name: 'Admin User', email: 'admin@example.com', role: 'admin' },
      { _id: '3', name: 'Regular User', email: 'user@example.com', role: 'user' },
    ];

    // Mock districts data
    const mockDistricts = [
      { _id: 'd1', name: 'Mumbai', state: 'Maharashtra' },
      { _id: 'd2', name: 'Pune', state: 'Maharashtra' },
      { _id: 'd3', name: 'Nashik', state: 'Maharashtra' },
      { _id: 'd4', name: 'Nagpur', state: 'Maharashtra' },
    ];

    // Mock permissions
    const mockPermissions = {
      '1': { // Super Admin has full access
        d1: { canView: true, canEdit: true, canExport: true },
        d2: { canView: true, canEdit: true, canExport: true },
        d3: { canView: true, canEdit: true, canExport: true },
        d4: { canView: true, canEdit: true, canExport: true }
      },
      '2': { // Admin has limited access
        d1: { canView: true, canEdit: true, canExport: false },
        d2: { canView: true, canEdit: false, canExport: false }
      },
      '3': { // Regular user has view-only access to one district
        d1: { canView: true, canEdit: false, canExport: false }
      }
    };

    setUsers(mockUsers);
    setDistricts(mockDistricts);
    setPermissions(mockPermissions);
  }, []);

  // Handle user selection
  const handleUserSelect = (e) => {
    const userId = e.target.value;
    setSelectedUser(userId);

    if (userId) {
      const user = users.find(u => u._id === userId);
      setSelectedUserData(user);
    } else {
      setSelectedUserData(null);
    }
  };

  // Handle permission toggle for a district
  const handlePermissionChange = (districtId, permissionType) => {
    setPermissions(prev => ({
      ...prev,
      [selectedUser]: {
        ...(prev[selectedUser] || {}),
        [districtId]: {
          ...(prev[selectedUser]?.[districtId] || defaultDistrictPermissions),
          [permissionType]: !(prev[selectedUser]?.[districtId]?.[permissionType] || false)
        }
      }
    }));
  };

  // Save permissions to localStorage
  const savePermissions = () => {
    if (!selectedUser) return;

    setIsLoading(true);

    // Simulate API call
    setTimeout(() => {
      const savedPermissions = JSON.parse(localStorage.getItem('districtPermissions') || '{}');
      savedPermissions[selectedUser] = permissions[selectedUser] || {};
      localStorage.setItem('districtPermissions', JSON.stringify(savedPermissions));

      setIsLoading(false);
      alert('Permissions saved successfully!');
    }, 500);
  };

  return (
    <div className="data-access-management">
      <div className="content-card">
        <h2 className="card-title">Data Access Management</h2>
        <p className="card-subtitle">Manage district data access permissions</p>

        <div className="form-group" style={{ marginBottom: '30px' }}>
          <label className="form-label">Select User</label>
          <select
            className="form-select"
            value={selectedUser}
            onChange={handleUserSelect}
          >
            <option value="">-- Select a user --</option>
            {users.map(user => (
              <option key={user._id} value={user._id}>
                {user.name} ({user.email}) - {user.role.replace('_', ' ')}
              </option>
            ))}
          </select>
        </div>

        {selectedUserData && (
          <div className="permissions-container">
            <div className="user-info">
              <h3>Managing Permissions for: {selectedUserData.name}</h3>
              <p>Role: <span className="role-badge">{selectedUserData.role.replace('_', ' ')}</span></p>
            </div>

            <div className="permissions-table">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>District</th>
                    <th>State</th>
                    <th>View</th>
                    <th>Edit</th>
                    <th>Export</th>
                  </tr>
                </thead>
                <tbody>
                  {districts.map(district => {
                    const districtPerms = permissions[selectedUser]?.[district._id] || defaultDistrictPermissions;
                    return (
                      <tr key={district._id}>
                        <td>{district.name}</td>
                        <td>{district.state}</td>
                        <td>
                          <label className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={districtPerms.canView || false}
                              onChange={() => handlePermissionChange(district._id, 'canView')}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </td>
                        <td>
                          <label className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={districtPerms.canEdit || false}
                              onChange={() => handlePermissionChange(district._id, 'canEdit')}
                              disabled={!districtPerms.canView}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </td>
                        <td>
                          <label className="permission-checkbox">
                            <input
                              type="checkbox"
                              checked={districtPerms.canExport || false}
                              onChange={() => handlePermissionChange(district._id, 'canExport')}
                              disabled={!districtPerms.canView}
                            />
                            <span className="checkmark"></span>
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="action-buttons">
              <button
                className="btn btn-primary"
                onClick={savePermissions}
                disabled={isLoading}
              >
                {isLoading ? 'Saving...' : 'Save Permissions'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MainAdminDashboard = () => {
  const [users, setUsers] = useState([]);

  const handleCreateUser = async (newUser) => {
    try {
      const { createUser, createActivityLog, getAllUsers, findUserLocation } = await import('../../firebase/firestore');
      
      console.log('🚀 Starting user creation for:', newUser.name, newUser.email);
      
      // Prepare user data for Firebase
      const userToAdd = {
        ...newUser,
        mobile: newUser.phone || newUser.mobile || '',
        status: 'Active'
      };
      
      console.log('📋 User data prepared:', userToAdd);
      
      // IMPORTANT: For Main Admin dashboard, we're explicitly setting isMainAdmin flag
      // This ensures users are created directly under Main Admin
      const creatorInfo = {
        isMainAdmin: true,
        superAdminId: null,
        adminId: null
      };
      
      console.log('✅ Setting creator as Main Admin with info:', creatorInfo);
      
      // We don't need to find super admins anymore since we're explicitly creating under Main Admin
      // But we'll keep the logging for debugging purposes
      console.log('🔍 Checking existing users in the system...');
      const allUsersResult = await getAllUsers();
      
      if (!allUsersResult.success) {
        console.error('❌ Failed to get users list:', allUsersResult.error);
        // We can continue even if this fails, since we're not using the result
        console.log('✅ Continuing with user creation anyway...');
      } else {
        console.log(`✅ Found ${allUsersResult.data.length} total users in system`);
        
        // Log all super admins found (just for information)
        const superAdmins = allUsersResult.data.filter(u => u.role === 'super_admin');
        console.log(`📊 Found ${superAdmins.length} super admins:`, 
          superAdmins.map(sa => ({ id: sa.id, name: sa.name, email: sa.email })));
      }
      
      // For all roles, we'll use the same creatorInfo with isMainAdmin=true
      // This ensures all users created by Main Admin go directly under Main Admin
      if (newUser.role === 'user') {
        console.log('✅ Creating user directly under Main Admin');
      } else if (newUser.role === 'admin') {
        console.log('✅ Creating admin directly under Main Admin');
      } else if (newUser.role === 'super_admin') {
        console.log('✅ Creating super admin directly under Main Admin');
      }
      
      console.log('🔄 Final creator info before user creation:', creatorInfo);
      
      // Create user in Firestore with proper hierarchy info
      const result = await createUser(userToAdd, creatorInfo);
      
      if (result.success) {
        console.log('✅ User created in Firebase with ID:', result.id);
        
        // Create activity log
        await createActivityLog({
          action: 'user_created',
          performedBy: newUser.createdBy,
          details: `Created new ${newUser.role.replace('_', ' ')} user: ${newUser.name} (${newUser.email})`,
          timestamp: new Date()
        });
        
        // Update local state
        setUsers(prev => [...prev, { ...userToAdd, id: result.id }]);
        
        // Verify the user was created by trying to find them
        console.log('🔍 Verifying user creation by fetching updated user list...');
        const updatedUsers = await getAllUsers();
        if (updatedUsers.success) {
          const createdUser = updatedUsers.data.find(u => u.email === newUser.email);
          if (createdUser) {
            console.log('✅ User verification successful! User found in database:', createdUser);
          } else {
            console.warn('⚠️ User verification failed! User not found in database after creation');
          }
        }
      } else {
        console.error('❌ Failed to create user:', result.error);
        alert('Failed to create user: ' + result.error);
      }
    } catch (error) {
      console.error('❌ Error creating user:', error);
      alert('Error creating user: ' + error.message);
    }
  };

  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <Sidebar role="main_admin" />
      
      <div className="main-content">
        <Routes>
          <Route index element={<MainAdminHome />} />
          <Route 
            path="create-user" 
            element={
              <CreateUser 
                onSubmit={handleCreateUser} 
                role="main_admin"
              />
            } 
          />
          <Route path="edit-user" element={<EditUser role="main_admin" />} />
          <Route 
            path="users" 
            element={
              <UserList 
                users={users} 
                onUpdateUser={(updatedUser) => {
                  setUsers(users.map(u => 
                    u.id === updatedUser.id ? updatedUser : u
                  ));
                }}
                onDeleteUser={(userId) => {
                  setUsers(users.filter(u => u.id !== userId));
                }}
              />
            } 
          />
          <Route path="hierarchical-view" element={<HierarchicalView />} />
          <Route path="hierarchy-detail/:type/:id" element={<HierarchyDetail />} />
          <Route path="locations" element={<LocationManagementPage />} />
          <Route path="upload-district-data" element={<UploadDistrictData />} />
          <Route path="data-allocation" element={<DataAllocation />} />
          <Route path="view-allocated-data" element={<ViewAllocatedData />} />
          <Route path="send-messages" element={<MessageComposer />} />
          <Route path="messages" element={<MessageComposer />} />
          <Route path="data" element={<DataAccessManagement />} />
          <Route path="message-history" element={<MessageHistory />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="profile" element={<UserProfile />} />
        </Routes>
      </div>
    </div>
  );
};

const MainAdminHome = () => {
  const navigate = useNavigate();
  const [userCounts, setUserCounts] = useState({
    super_admin: 0,
    admin: 0,
    user: 0,
    total: 0,
    activeAdmins: 0
  });
  const [messagesSent, setMessagesSent] = useState(0);

  useEffect(() => {
    // Load user counts and messages from Firebase
    const loadDashboardData = async () => {
      try {
        const { getAllUsers, getAllMessages } = await import('../../firebase/firestore');
        
        // Get user counts
        const usersResult = await getAllUsers();
        
        if (usersResult.success) {
          const users = usersResult.data;
          const counts = users.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            acc.total++;
            return acc;
          }, { super_admin: 0, admin: 0, user: 0, total: 0, activeAdmins: 0 });
          
          // Calculate active admins (super_admin + admin roles combined)
          counts.activeAdmins = counts.super_admin + counts.admin;
          
          setUserCounts(counts);
        }
        
        // Get messages count
        const messagesResult = await getAllMessages();
        if (messagesResult.success) {
          setMessagesSent(messagesResult.data.length);
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      }
    };
    
    loadDashboardData();
  }, []);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Main Admin Dashboard</h1>
        <p className="page-subtitle">Manage all users and system settings</p>
      </div>

      <div className="stats-grid" style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        width: '100%',
        margin: '0 auto'
      }}>
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Super Admins</span>
            <div className="stat-icon">👑</div>
          </div>
          <div className="stat-value">{userCounts.super_admin}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Admins</span>
            <div className="stat-icon">👨‍💼</div>
          </div>
          <div className="stat-value">{userCounts.admin}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Users</span>
            <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="stat-value">{userCounts.user}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total Users</span>
            <div className="stat-icon"><i className="fa-solid fa-chart-line"></i></div>
          </div>
          <div className="stat-value">{userCounts.total}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Messages Sent</span>
            <div className="stat-icon"><i className="fa-solid fa-paper-plane"></i></div>
          </div>
          <div className="stat-value">{messagesSent.toLocaleString()}</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Active Admins</span>
            <div className="stat-icon"><i className="fa-solid fa-user-check"></i></div>
          </div>
          <div className="stat-value">{userCounts.activeAdmins}</div>
        </div>
      </div>

      <div className="content-card" style={{ marginTop: '50px' }}>
        <h2 className="card-title">Quick Actions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
          <button className="btn btn-primary" onClick={() => navigate('/main-admin/create-user', { state: { preSelectedRole: 'super_admin' } })}>Create Super Admin</button>
          <button className="btn btn-primary" onClick={() => navigate('/main-admin/create-user', { state: { preSelectedRole: 'admin' } })}>Create Admin</button>
          <button className="btn btn-primary" onClick={() => navigate('/main-admin/create-user', { state: { preSelectedRole: 'user' } })}>Create User</button>
          <button className="btn btn-secondary" onClick={() => navigate('/main-admin/users')}>View Reports</button>
        </div>
      </div>
    </>
  );
};

const LocationManagementPage = () => {
  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Location Management</h1>
        <p className="page-subtitle">Select and view location data</p>
      </div>
      <div className="content-card">
        <LocationSelector />
      </div>
    </>
  );
};

export default MainAdminDashboard;