import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import ConfirmModal from '../Common/ConfirmModal';
import AlertModal from '../Common/AlertModal';

const UserList = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(20);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });

  if (loading) {
    return <div>Loading...</div>;
  }

  useEffect(() => {
    loadUsers();
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    if (!user) return;
    
    try {
      const { getAllUsers } = await import('../../firebase/firestore');
      const result = await getAllUsers();
      
      if (!result.success) {
        console.error('Failed to load users:', result.error);
        setUsers([]);
        return;
      }
      
      const allUsers = result.data;
      
      // Hierarchical filtering based on current user's role
      let visibleUsers = allUsers;
      
      if (user.role === 'main_admin') {
        // Main Admin sees ALL users
        visibleUsers = allUsers;
      } else if (user.role === 'super_admin') {
        // Super Admin sees:
        // 1. Users they directly created
        // 2. Users created by admins they created (hierarchical)
        const directlyCreated = allUsers.filter(u => u.createdBy === user.email);
        const adminEmails = directlyCreated
          .filter(u => u.role === 'admin')
          .map(u => u.email);
        const createdByTheirAdmins = allUsers.filter(u => adminEmails.includes(u.createdBy));
        
        visibleUsers = [...directlyCreated, ...createdByTheirAdmins];
      } else if (user.role === 'admin') {
        // Admin sees only users they directly created
        visibleUsers = allUsers.filter(u => u.role === 'user' && u.createdBy === user.email);
      }
      
      setUsers(visibleUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      setUsers([]);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(u => u.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(u => u.status === statusFilter);
    }

    setFilteredUsers(filtered);
  };

  const getRoleBadgeClass = (role) => {
    // The class name should exactly match the CSS class (e.g., 'badge-super_admin')
    return `badge badge-${role}`;
  };

  const handleEdit = (userId) => {
    const userToEdit = users.find(u => u.id === userId);
    if (userToEdit) {
      // Store user data for editing
      sessionStorage.setItem('editUser', JSON.stringify(userToEdit));
      // Navigate to edit page
      const basePath = user.role === 'main_admin' ? '/main-admin' : 
                      user.role === 'super_admin' ? '/super-admin' : 
                      user.role === 'admin' ? '/admin' : '/user';
      navigate(`${basePath}/edit-user`);
    }
  };

  const handleDelete = (userId) => {
    const user = users.find(u => u.id === userId);
    if (user) {
      setUserToDelete(user);
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
        // Log the activity
        await createActivityLog({
          action: 'user_deleted',
          performedBy: user.email,
          details: `Deleted ${userToDelete.role}: ${userToDelete.name} (${userToDelete.email})`
        });
        
        // Reload users
        await loadUsers();
        
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

  const toggleStatus = (userId) => {
    // TODO: Implement Firebase update
    console.log('Toggle user status in Firebase:', userId);
    setAlertModal({
      isOpen: true,
      message: 'Toggle status functionality - implement with Firebase updateUser()',
      type: 'info'
    });
  };

  const exportToCSV = () => {
    if (filteredUsers.length === 0) {
      setAlertModal({
        isOpen: true,
        message: 'No users to export!',
        type: 'warning'
      });
      return;
    }

    const headers = ['ID', 'Name', 'Email', 'Role', 'Created By', 'Status', 'Phone', 'Created At'];
    const csvData = filteredUsers.map((u, index) => [
      index + 1,
      u.name,
      u.email,
      u.role,
      u.createdBy || '',
      u.status || 'Active',
      u.phone || '',
      u.createdAt ? new Date(u.createdAt).toLocaleDateString() : ''
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Pagination calculations
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  return (
    <>
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />

      <div className="page-header">
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">View and manage all users</p>
      </div>

      <div className="content-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Search</label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Role</label>
            <select className="form-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="all">All Roles</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Filter by Status</label>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
            <button className="btn btn-secondary" onClick={exportToCSV} style={{ width: '100%' }}>
              <i className="fa-solid fa-download"></i> Export CSV
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '15px', padding: '10px', background: '#f5f5f5', borderRadius: '5px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <strong>Total Users: {filteredUsers.length}</strong>
          {filteredUsers.length > 0 && (
            <span style={{ fontSize: '14px', color: '#666' }}>
              Showing {indexOfFirstUser + 1} - {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
            </span>
          )}
        </div>

        <div className="table-container">
          {filteredUsers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <i className="fa-solid fa-users" style={{ fontSize: '3rem', marginBottom: '15px', opacity: 0.3 }}></i>
              <p>No users found matching your criteria.</p>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Created By</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map((user, index) => (
                  <tr key={user.id}>
                    <td>{indexOfFirstUser + index + 1}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={getRoleBadgeClass(user.role)}>
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.85rem', color: '#666' }}>
                        {user.createdBy || 'System'}
                      </span>
                    </td>
                    <td>
                      <div className="status-toggle">
                        <input
                          type="checkbox"
                          id={`status-${user.id}`}
                          checked={user.status === 'Active'}
                          onChange={() => toggleStatus(user.id)}
                          className="status-checkbox"
                        />
                        <label 
                          htmlFor={`status-${user.id}`}
                          className={`status-label ${user.status === 'Active' ? 'active' : ''}`}
                        >
                          <span className="status-text">
                            {user.status}
                          </span>
                        </label>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="btn-icon btn-edit" 
                          title="Edit"
                          onClick={() => handleEdit(user.id)}
                        >
                          <i className="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button 
                          className="btn-icon btn-delete" 
                          title="Delete"
                          onClick={() => handleDelete(user.id)}
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            gap: '10px',
            marginTop: '20px',
            padding: '15px',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db', 
                background: currentPage === 1 ? '#f3f4f6' : 'white',
                color: currentPage === 1 ? '#9ca3af' : '#374151',
                cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== 1) {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== 1) {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
            >
              <i className="fa-solid fa-chevron-left"></i> Previous
            </button>

            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              {/* First page */}
              {currentPage > 2 && (
                <button 
                  onClick={() => paginate(1)} 
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  1
                </button>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage > 3 && (
                <span style={{ alignSelf: 'center' }}>...</span>
              )}
              
              {/* Page before current */}
              {currentPage > 1 && (
                <button 
                  onClick={() => paginate(currentPage - 1)} 
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {currentPage - 1}
                </button>
              )}
              
              {/* Current page */}
              <button 
                style={{
                  width: '36px',
                  height: '36px',
                  border: '1px solid #2196f3',
                  borderRadius: '4px',
                  background: '#2196f3',
                  color: 'white',
                  fontWeight: 'bold',
                  cursor: 'default'
                }}
              >
                {currentPage}
              </button>
              
              {/* Page after current */}
              {currentPage < totalPages && (
                <button 
                  onClick={() => paginate(currentPage + 1)} 
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {currentPage + 1}
                </button>
              )}
              
              {/* Ellipsis if needed */}
              {currentPage < totalPages - 2 && (
                <span style={{ alignSelf: 'center' }}>...</span>
              )}
              
              {/* Last page */}
              {currentPage < totalPages - 1 && (
                <button 
                  onClick={() => paginate(totalPages)} 
                  style={{
                    width: '36px',
                    height: '36px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: 'white',
                    cursor: 'pointer'
                  }}
                >
                  {totalPages}
                </button>
              )}
            </div>

            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: currentPage === totalPages ? '#f3f4f6' : 'white',
                color: currentPage === totalPages ? '#9ca3af' : '#374151',
                cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentPage !== totalPages) {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#667eea';
                }
              }}
              onMouseLeave={(e) => {
                if (currentPage !== totalPages) {
                  e.target.style.background = 'white';
                  e.target.style.borderColor = '#d1d5db';
                }
              }}
            >
              Next <i className="fa-solid fa-chevron-right"></i>
            </button>
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
        message={`Are you sure you want to delete ${userToDelete?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </>
  );
};

export default UserList;