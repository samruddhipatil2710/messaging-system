import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import ConfirmModal from '../Common/ConfirmModal';
import AlertModal from '../Common/AlertModal';
import './HierarchicalView.css';

const HierarchicalView = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [hierarchyData, setHierarchyData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [expandedSuperAdmins, setExpandedSuperAdmins] = useState({});
  const [expandedAdmins, setExpandedAdmins] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });

  const handleEdit = (userToEdit) => {
    if (userToEdit) {
      sessionStorage.setItem('editUser', JSON.stringify(userToEdit));
      const basePath = user.role === 'main_admin' ? '/main-admin' : 
                      user.role === 'super_admin' ? '/super-admin' : 
                      user.role === 'admin' ? '/admin' : '/user';
      navigate(`${basePath}/edit-user`);
    }
  };

  const handleDelete = (userToDeleteParam) => {
    if (userToDeleteParam) {
      setUserToDelete(userToDeleteParam);
      setShowDeleteModal(true);
    }
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;
    
    try {
      const { deleteUser, createActivityLog } = await import('../../firebase/firestore');
      
      // Delete user from Firebase
      const result = await deleteUser(userToDelete.id, userToDelete.email);
      
      if (result.success) {
        // Add activity log to Firebase
        await createActivityLog({
          action: 'user_deleted',
          performedBy: user.email,
          details: `Deleted ${userToDelete.role}: ${userToDelete.name} (${userToDelete.email})`
        });
        
        // Reload hierarchy
        await loadHierarchyData();
        
        console.log('✅ User deleted successfully');
        setAlertModal({
          isOpen: true,
          message: 'User deleted successfully!',
          type: 'success'
        });
      } else {
        setAlertModal({
          isOpen: true,
          message: 'Error deleting user: ' + result.error,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      setAlertModal({
        isOpen: true,
        message: 'Failed to delete user: ' + error.message,
        type: 'error'
      });
    }
  };

  useEffect(() => {
    if (user) {
      // Load hierarchy data from Firebase
      loadHierarchyData();
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const loadHierarchyData = async () => {
    if (!user) return;
    
    console.log('Loading hierarchy data for user:', user.email, user.role);
    
    try {
      const { getAllUsers } = await import('../../firebase/firestore');
      const result = await getAllUsers();
      
      if (!result.success) {
        console.error('Failed to load users:', result.error);
        return;
      }
      
      const allUsers = result.data;
      console.log('Total users in Firebase:', allUsers.length);
    
    if (user.role === 'main_admin') {
      // Main Admin: Show all Super Admins with expandable Admins → Users
    const superAdmins = allUsers.filter(u => u.role === 'super_admin');
      console.log('Super Admins found:', superAdmins.length);
    
    const hierarchy = superAdmins.map(superAdmin => {
      // Get Admins created by this Super Admin
      const admins = allUsers.filter(u => 
        u.role === 'admin' && u.createdBy === superAdmin.email
      );
        console.log(`Super Admin ${superAdmin.name} has ${admins.length} admins`);
      
      // For each Admin, get their Users
      const adminsWithUsers = admins.map(admin => {
        const users = allUsers.filter(u => 
          u.role === 'user' && u.createdBy === admin.email
        );
          console.log(`Admin ${admin.name} has ${users.length} users`);
          
          return {
            ...admin,
            users: users || [],
            userCount: (users || []).length
          };
        });
        
        const totalMembers = adminsWithUsers.reduce((sum, admin) => sum + (admin.userCount || 0), 0) + adminsWithUsers.length;
        
        const result = {
          ...superAdmin,
          admins: adminsWithUsers || [],
          totalMembers: totalMembers
        };
        console.log(`Super Admin ${superAdmin.name} - Total members: ${totalMembers}, Admins: ${adminsWithUsers.length}`);
        return result;
      });
      
      console.log('Final hierarchy data:', hierarchy);
      setHierarchyData(hierarchy);
    } else if (user.role === 'super_admin') {
      // Super Admin: Show Admins created by this Super Admin with expandable Users
      const admins = allUsers.filter(u => 
        u.role === 'admin' && u.createdBy === user.email
      );
      console.log(`Super Admin ${user.email} has ${admins.length} admins`);
      
      const hierarchy = admins.map(admin => {
        // Get Users created by this Admin
        const users = allUsers.filter(u => 
          u.role === 'user' && u.createdBy === admin.email
        );
        console.log(`Admin ${admin.name} has ${users.length} users`);
        
        return {
          ...admin,
          users: users || [],
          totalMembers: (users || []).length
        };
      });
      
      console.log('Final hierarchy data:', hierarchy);
      setHierarchyData(hierarchy);
    } else if (user.role === 'admin') {
      // Admin: Show Users created by this Admin
      const users = allUsers.filter(u => 
        u.role === 'user' && u.createdBy === user.email
      );
      console.log(`Admin ${user.email} has ${users.length} users`);
      
      const hierarchy = users.map(userObj => ({
        ...userObj,
        totalMembers: 0 // Users don't have members
      }));
    
      console.log('Final hierarchy data:', hierarchy);
      setHierarchyData(hierarchy);
    }
    // User role: No access (empty array)
    } catch (error) {
      console.error('Error loading hierarchy data:', error);
    }
  };

  // Filter and search logic
  useEffect(() => {
    let filtered = [...hierarchyData];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => 
        (item.status || 'Active').toLowerCase() === statusFilter.toLowerCase()
      );
    }

    setFilteredData(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [hierarchyData, searchTerm, statusFilter]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const toggleSuperAdmin = (superAdminId) => {
    console.log('Toggling Super Admin:', superAdminId);
    setExpandedSuperAdmins(prev => {
      const isExpanded = prev[superAdminId];
      const newState = {
        ...prev,
        [superAdminId]: !isExpanded
      };
      console.log('Super Admin expanded state:', newState);
      
      // Find the super admin in hierarchyData to check members
      const superAdmin = hierarchyData.find(sa => sa.id === superAdminId);
      if (superAdmin) {
        console.log(`Super Admin: ${superAdmin.name}`, {
          id: superAdmin.id,
          totalMembers: superAdmin.totalMembers,
          adminsCount: superAdmin.admins ? superAdmin.admins.length : 0,
          admins: superAdmin.admins
        });
      }
      
      return newState;
    });
  };

  const toggleAdmin = (adminId) => {
    console.log('Toggling Admin:', adminId);
    setExpandedAdmins(prev => {
      const isExpanded = prev[adminId];
      const newState = {
        ...prev,
        [adminId]: !isExpanded
      };
      console.log('Admin expanded state:', newState);
      
      // Find the admin in hierarchyData to check members
      let admin = null;
      hierarchyData.forEach(sa => {
        if (sa.admins) {
          const found = sa.admins.find(a => a.id === adminId);
          if (found) admin = found;
        }
        if (!admin && sa.id === adminId) admin = sa; // For super_admin role view
      });
      
      if (admin) {
        console.log(`Admin: ${admin.name}`, {
          id: admin.id,
          usersCount: admin.users ? admin.users.length : 0,
          users: admin.users
        });
      }
      
      return newState;
    });
  };

  // Debug: Log hierarchy data when it changes
  useEffect(() => {
    if (hierarchyData.length > 0) {
      console.log('Hierarchy Data Loaded:', hierarchyData);
      hierarchyData.forEach((item, index) => {
        console.log(`Item ${index + 1}:`, {
          name: item.name,
          role: item.role,
          totalMembers: item.totalMembers,
          adminsCount: item.admins ? item.admins.length : 0,
          usersCount: item.users ? item.users.length : 0
        });
      });
    } else {
      console.log('No hierarchy data loaded. Checking localStorage...');
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      console.log('All users in localStorage:', allUsers.length);
      if (user) {
        console.log('Current user:', user.email, user.role);
        const superAdmins = allUsers.filter(u => u.role === 'super_admin');
        console.log('Super Admins found:', superAdmins.length);
        superAdmins.forEach(sa => {
          console.log(`- ${sa.name} (${sa.email})`);
          const admins = allUsers.filter(u => u.role === 'admin' && u.createdBy === sa.email);
          console.log(`  Admins created by ${sa.name}:`, admins.length);
        });
      }
    }
  }, [hierarchyData, user]);

  const viewDetails = (itemId, itemRole) => {
    if (user?.role === 'main_admin') {
      // Main Admin clicks Preview → Navigate to detail page showing all Super Admins
      navigate(`/main-admin/hierarchy-detail/main-admin/view-all`);
    } else if (user?.role === 'super_admin') {
      // Super Admin clicks Preview on Admin → Show Admin detail page
      navigate(`/super-admin/hierarchy-detail/admin/${itemId}`);
    } else if (user?.role === 'admin') {
      // Admin clicks Preview on User → Show User detail page
      navigate(`/admin/hierarchy-detail/user/${itemId}`);
    }
  };

  const getRoleLabel = () => {
    if (user?.role === 'main_admin') return 'Super Admin';
    if (user?.role === 'super_admin') return 'Admin';
    if (user?.role === 'admin') return 'User';
    return 'Leader';
  };

  const getEmptyMessage = () => {
    if (user?.role === 'main_admin') return 'No Super Admins created yet';
    if (user?.role === 'super_admin') return 'No Admins created yet';
    if (user?.role === 'admin') return 'No Users created yet';
    return 'No data available';
  };

  const getRowClassName = () => {
    if (user?.role === 'main_admin') return 'super-admin-row';
    if (user?.role === 'super_admin') return 'admin-row';
    if (user?.role === 'admin') return 'user-row';
    return '';
  };

  const getStatusBadge = (status) => {
    return status === 'Active' ? 
      <span className="status-badge active">Active</span> : 
      <span className="status-badge inactive">Inactive</span>;
  };

  const handleResetData = () => {
    if (window.confirm('Reset all data and load fresh sample data? This will clear all existing data!')) {
      resetDummyData();
      // Reload the page to get fresh data
      window.location.reload();
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Hierarchical View</h1>
          <p className="page-subtitle">View complete organizational hierarchy and activities</p>
        </div>
        <button 
          className="btn btn-warning" 
          onClick={handleResetData}
          style={{ 
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fa-solid fa-rotate-right"></i>
          Reset & Load Fresh Data
        </button>
      </div>

      <div className="content-card">
        {/* Search and Filter Section */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
          gap: '15px', 
          marginBottom: '20px',
          padding: '20px',
          background: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}>
              <i className="fa-solid fa-search" style={{ marginRight: '8px', color: '#667eea' }}></i>
              Search
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                className="form-input"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: '12px 15px 12px 45px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  width: '100%',
                  transition: 'all 0.3s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
              <i className="fa-solid fa-search" style={{
                position: 'absolute',
                left: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                fontSize: '14px'
              }}></i>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '5px',
                    fontSize: '16px'
                  }}
                  title="Clear search"
                >
                  <i className="fa-solid fa-circle-xmark"></i>
                </button>
              )}
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" style={{ 
              fontSize: '13px', 
              fontWeight: '600', 
              color: '#374151',
              marginBottom: '8px',
              display: 'block'
            }}>
              <i className="fa-solid fa-filter" style={{ marginRight: '8px', color: '#667eea' }}></i>
              Filter by Status
            </label>
            <div style={{ position: 'relative' }}>
              <select 
                className="form-select" 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '12px 40px 12px 15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '500',
                  background: 'white',
                  cursor: 'pointer',
                  width: '100%',
                  appearance: 'none',
                  transition: 'all 0.3s',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                  color: statusFilter === 'all' ? '#6b7280' : statusFilter === 'active' ? '#059669' : '#dc2626'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="all">🔵 All Status</option>
                <option value="active">✅ Active Only</option>
                <option value="inactive">❌ Inactive Only</option>
              </select>
              <i className="fa-solid fa-chevron-down" style={{
                position: 'absolute',
                right: '15px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#9ca3af',
                pointerEvents: 'none',
                fontSize: '12px'
              }}></i>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'flex-end',
            gap: '10px'
          }}>
            <div style={{
              padding: '12px 20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '10px',
              fontWeight: '600',
              color: 'white',
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              transition: 'transform 0.2s',
              fontSize: '14px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
            >
              <i className="fa-solid fa-users"></i>
              <span>Total:</span>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>
                {filteredData.length}
              </span>
            </div>
          </div>
        </div>

        <div className="hierarchy-table-container">
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '48px', marginBottom: '20px' }}></i>
              <p>Loading hierarchy data...</p>
            </div>
          ) : (
          <table className="hierarchy-table">
            <thead>
              <tr>
                <th>SR. NO</th>
                <th>{getRoleLabel().toUpperCase()}</th>
                <th>MEMBERS</th>
                  <th>VIEW</th>
                <th>STATUS</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {user?.role === 'main_admin' && currentItems.map((superAdmin, superIndex) => (
                <React.Fragment key={superAdmin.id}>
                  {/* Super Admin Row */}
                  <tr className="super-admin-row">
                    <td>{superIndex + 1}</td>
                    <td>
                      <strong style={{ color: '#2563eb' }}>{superAdmin.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>Super Admin</small>
                    </td>
                    <td>
                      <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '14px' }}>
                        {superAdmin.totalMembers || 0}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-preview"
                        onClick={() => {
                          console.log('Clicking Preview button for Super Admin:', superAdmin.id, superAdmin.name);
                          // Navigate to Admin list page for this Super Admin
                          navigate(`/main-admin/hierarchy-detail/super-admin/${superAdmin.id}`);
                        }}
                        title="View Admins"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fa-solid fa-eye"></i> Preview
                      </button>
                    </td>
                    <td>{getStatusBadge(superAdmin.status || 'Active')}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(superAdmin)}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(superAdmin)}>
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Admin List when Super Admin is expanded */}
                  {expandedSuperAdmins[superAdmin.id] && (
                    <>
                      <tr key={`info-${superAdmin.id}`} className="info-row">
                        <td colSpan="6" style={{ 
                          background: '#f0f9ff', 
                          padding: '15px 40px',
                          fontWeight: '600',
                          color: '#0369a1',
                          borderTop: '2px solid #0369a1'
                        }}>
                          <i className="fa-solid fa-users" style={{ marginRight: '10px' }}></i>
                          Admins Added by {superAdmin.name} ({superAdmin.admins && superAdmin.admins.length > 0 ? superAdmin.admins.length : 0})
                        </td>
                      </tr>
                      {superAdmin.admins && superAdmin.admins.length > 0 ? (
                        <>
                          {superAdmin.admins.map((admin, adminIndex) => (
                            <React.Fragment key={admin.id}>
                              <tr className="admin-row">
                            <td style={{ paddingLeft: '40px' }}>{superIndex + 1}.{adminIndex + 1}</td>
                            <td style={{ paddingLeft: '40px' }}>
                              <strong style={{ color: '#059669' }}>{admin.name}</strong>
                              <br />
                              <small style={{ color: '#666' }}>Admin</small>
                            </td>
                            <td>
                              <span style={{ color: '#059669', fontWeight: '600', fontSize: '14px' }}>
                                {admin.userCount || 0}
                              </span>
                            </td>
                            <td>
                              <button 
                                className="btn-preview"
                                onClick={() => {
                                  console.log('Clicking Preview button for Admin:', admin.id, admin.name);
                                  // Navigate to Users page for this Admin
                                  navigate(`/main-admin/hierarchy-detail/admin/${admin.id}`);
                                }}
                                title="View Users"
                                style={{
                                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '8px 16px',
                                  borderRadius: '6px',
                                  cursor: 'pointer',
                                  transition: 'all 0.2s'
                                }}
                              >
                                <i className="fa-solid fa-eye"></i> Preview
                              </button>
                            </td>
                            <td>{getStatusBadge(admin.status || 'Active')}</td>
                            <td>
                              <div className="action-buttons">
                                <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(admin)}>
                                  <i className="fa-solid fa-pen-to-square"></i>
                                </button>
                                <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(admin)}>
                                  <i className="fa-solid fa-trash-can"></i>
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Users List when Admin is expanded */}
                          {expandedAdmins[admin.id] && (
                            <>
                              <tr key={`user-info-${admin.id}`} className="info-row">
                                <td colSpan="6" style={{ 
                                  background: '#f0fdf4', 
                                  padding: '15px 80px',
                                  fontWeight: '600',
                                  color: '#047857',
                                  borderTop: '2px solid #047857'
                                }}>
                                  <i className="fa-solid fa-users" style={{ marginRight: '10px' }}></i>
                                  Users Added by {admin.name} ({admin.users && admin.users.length > 0 ? admin.users.length : 0})
                                </td>
                              </tr>
                              {admin.users && admin.users.length > 0 ? (
                                <>
                                  {admin.users.map((user, userIndex) => (
                                    <tr key={user.id} className="user-row">
                                      <td style={{ paddingLeft: '80px' }}>{superIndex + 1}.{adminIndex + 1}.{userIndex + 1}</td>
                                  <td style={{ paddingLeft: '80px' }}>
                                    <strong>{user.name}</strong>
                                    <br />
                                    <small style={{ color: '#666' }}>User</small>
                                  </td>
                                  <td>
                                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                                      0
                                    </span>
                                  </td>
                                  <td>
                                    <button 
                                      className="btn-preview"
                                      onClick={() => {
                                        console.log('Clicking Preview button for User:', user.id, user.name);
                                        // Navigate to User Messages page
                                        navigate(`/main-admin/hierarchy-detail/user/${user.id}`);
                                      }}
                                      title="View Messages"
                                      style={{
                                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                        color: 'white',
                                        border: 'none',
                                        padding: '8px 16px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                      }}
                                    >
                                      <i className="fa-solid fa-eye"></i> Preview
                                    </button>
                                  </td>
                                  <td>{getStatusBadge(user.status || 'Active')}</td>
                                  <td>
                                    <div className="action-buttons">
                                      <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(user)}>
                                        <i className="fa-solid fa-pen-to-square"></i>
                                      </button>
                                      <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(user)}>
                                        <i className="fa-solid fa-trash-can"></i>
                                      </button>
                                    </div>
                                  </td>
                                    </tr>
                                  ))}
                                </>
                              ) : (
                                <tr key={`no-users-${admin.id}`}>
                                  <td colSpan="6" style={{ 
                                    background: '#fef3c7', 
                                    padding: '20px 80px',
                                    fontWeight: '400',
                                    color: '#92400e',
                                    fontStyle: 'italic',
                                    textAlign: 'center'
                                  }}>
                                    <i className="fa-solid fa-info-circle" style={{ marginRight: '10px' }}></i>
                                    <strong>No Users have been added by {admin.name} yet.</strong>
                                  </td>
                                </tr>
                              )}
                            </>
                          )}
                            </React.Fragment>
                          ))}
                        </>
                      ) : (
                        <tr key={`no-admins-${superAdmin.id}`}>
                          <td colSpan="6" style={{ 
                            background: '#fef3c7', 
                            padding: '20px 40px',
                            fontWeight: '400',
                            color: '#92400e',
                            fontStyle: 'italic',
                            textAlign: 'center'
                          }}>
                            <i className="fa-solid fa-info-circle" style={{ marginRight: '10px' }}></i>
                            <strong>No Admins have been added by {superAdmin.name} yet.</strong>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Super Admin View: Show Admins with expandable Users */}
              {user?.role === 'super_admin' && currentItems.map((admin, adminIndex) => (
                <React.Fragment key={admin.id}>
                  <tr className="admin-row">
                    <td>{adminIndex + 1}</td>
                    <td>
                      <strong style={{ color: '#2563eb' }}>{admin.name}</strong>
                      <br />
                      <small style={{ color: '#666' }}>Admin</small>
                    </td>
                    <td>
                      <span style={{ color: '#2563eb', fontWeight: '600', fontSize: '14px' }}>
                        {admin.totalMembers || 0}
                      </span>
                    </td>
                    <td>
                      <button 
                        className="btn-preview"
                        onClick={() => {
                          console.log('Clicking Preview button for Admin:', admin.id, admin.name);
                          // Navigate to Users page for this Admin
                          navigate(`/super-admin/hierarchy-detail/admin/${admin.id}`);
                        }}
                        title="View Users"
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <i className="fa-solid fa-eye"></i> Preview
                      </button>
                    </td>
                    <td>{getStatusBadge(admin.status || 'Active')}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(admin)}>
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(admin)}>
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Users List when Admin is expanded */}
                  {expandedAdmins[admin.id] && (
                    <>
                      <tr key={`admin-user-info-${admin.id}`} className="info-row">
                        <td colSpan="6" style={{ 
                          background: '#f0fdf4', 
                          padding: '15px 40px',
                          fontWeight: '600',
                          color: '#047857',
                          borderTop: '2px solid #047857'
                        }}>
                          <i className="fa-solid fa-users" style={{ marginRight: '10px' }}></i>
                          Users Added by {admin.name} ({admin.users && admin.users.length > 0 ? admin.users.length : 0})
                        </td>
                      </tr>
                      {admin.users && admin.users.length > 0 ? (
                        <>
                          {admin.users.map((user, userIndex) => (
                        <tr key={user.id} className="user-row">
                          <td style={{ paddingLeft: '40px' }}>{adminIndex + 1}.{userIndex + 1}</td>
                          <td style={{ paddingLeft: '40px' }}>
                            <strong>{user.name}</strong>
                            <br />
                            <small style={{ color: '#666' }}>User</small>
                          </td>
                          <td>
                            <span style={{ color: '#6b7280', fontSize: '13px' }}>
                              0
                            </span>
                          </td>
                          <td>
                            <button 
                              className="btn-preview"
                              onClick={() => {
                                console.log('Clicking Preview button for User:', user.id, user.name);
                                // Navigate to User Messages page
                                navigate(`/super-admin/hierarchy-detail/user/${user.id}`);
                              }}
                              title="View Messages"
                              style={{
                                background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '8px 16px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              <i className="fa-solid fa-eye"></i> Preview
                            </button>
                          </td>
                          <td>{getStatusBadge(user.status || 'Active')}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(user)}>
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(user)}>
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                        </>
                      ) : (
                        <tr key={`no-users-admin-${admin.id}`}>
                          <td colSpan="6" style={{ 
                            background: '#fef3c7', 
                            padding: '20px 40px',
                            fontWeight: '400',
                            color: '#92400e',
                            fontStyle: 'italic',
                            textAlign: 'center'
                          }}>
                            <i className="fa-solid fa-info-circle" style={{ marginRight: '10px' }}></i>
                            <strong>No Users have been added by {admin.name} yet.</strong>
                          </td>
                        </tr>
                      )}
                    </>
                  )}
                </React.Fragment>
              ))}

              {/* Admin View: Show Users directly */}
              {user?.role === 'admin' && currentItems.map((userItem, index) => (
                <tr key={userItem.id} className="user-row">
                  <td>{index + 1}</td>
                  <td>
                    <strong style={{ color: '#2563eb' }}>{userItem.name}</strong>
                    <br />
                    <small style={{ color: '#666' }}>User</small>
                  </td>
                  <td>
                    <span style={{ color: '#6b7280', fontSize: '13px' }}>
                      0
                    </span>
                  </td>
                  <td>
                    <button 
                      className="btn-preview"
                      onClick={() => {
                        console.log('Clicking Preview button for User:', userItem.id, userItem.name);
                        // Navigate to User Messages page
                        navigate(`/admin/hierarchy-detail/user/${userItem.id}`);
                      }}
                      title="View Messages"
                      style={{
                        background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <i className="fa-solid fa-eye"></i> Preview
                    </button>
                  </td>
                  <td>{getStatusBadge(userItem.status || 'Active')}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn-icon btn-edit" title="Edit" onClick={() => handleEdit(userItem)}>
                        <i className="fa-solid fa-pen-to-square"></i>
                      </button>
                      <button className="btn-icon btn-delete" title="Delete" onClick={() => handleDelete(userItem)}>
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}

          {!isLoading && hierarchyData.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
              <i className="fa-solid fa-users" style={{ fontSize: '48px', marginBottom: '20px' }}></i>
              <p>{getEmptyMessage()}</p>
              <p style={{ marginTop: '10px', fontSize: '14px' }}>Create users to see them here</p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && filteredData.length > itemsPerPage && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '20px',
            padding: '15px 20px',
            background: '#f8f9fa',
            borderRadius: '8px'
          }}>
            <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: '500' }}>
              Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredData.length)} of {filteredData.length} entries
            </div>
            
            <div style={{ display: 'flex', gap: '5px' }}>
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  background: currentPage === 1 ? '#f3f4f6' : 'white',
                  borderRadius: '6px',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  color: currentPage === 1 ? '#9ca3af' : '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              {[...Array(totalPages)].map((_, index) => {
                const pageNumber = index + 1;
                // Show first page, last page, current page, and pages around current
                if (
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNumber}
                      onClick={() => paginate(pageNumber)}
                      style={{
                        padding: '8px 14px',
                        border: '2px solid #e5e7eb',
                        background: currentPage === pageNumber ? '#667eea' : 'white',
                        color: currentPage === pageNumber ? 'white' : '#374151',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: '600',
                        transition: 'all 0.2s',
                        minWidth: '40px'
                      }}
                    >
                      {pageNumber}
                    </button>
                  );
                } else if (
                  pageNumber === currentPage - 2 ||
                  pageNumber === currentPage + 2
                ) {
                  return <span key={pageNumber} style={{ padding: '8px 4px', color: '#9ca3af' }}>...</span>;
                }
                return null;
              })}

              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '2px solid #e5e7eb',
                  background: currentPage === totalPages ? '#f3f4f6' : 'white',
                  borderRadius: '6px',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  color: currentPage === totalPages ? '#9ca3af' : '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setUserToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete User"
        message={`Are you sure you want to delete ${userToDelete?.name} (${userToDelete?.role?.replace('_', ' ')})? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      {/* Alert Modal */}
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  );
};

export default HierarchicalView;
