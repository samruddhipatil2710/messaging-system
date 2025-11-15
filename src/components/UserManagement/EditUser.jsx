import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';

const EditUser = ({ role }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    password: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user data from sessionStorage
    const userToEdit = sessionStorage.getItem('editUser');
    if (userToEdit) {
      const userData = JSON.parse(userToEdit);
      setEditingUser(userData);
      setFormData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        role: userData.role || 'user',
        password: '' // Don't show existing password
      });
    }
    setLoading(false);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email) {
      alert('Name and Email are required!');
      return;
    }

    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if email already exists (excluding current user)
    const emailExists = allUsers.some(u => 
      u.email === formData.email && u.id !== editingUser.id
    );
    
    if (emailExists) {
      alert('Email already exists!');
      return;
    }

    // Update user
    const updatedUsers = allUsers.map(u => {
      if (u.id === editingUser.id) {
        return {
          ...u,
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          role: formData.role,
          // Only update password if provided
          ...(formData.password && { password: formData.password })
        };
      }
      return u;
    });

    localStorage.setItem('users', JSON.stringify(updatedUsers));

    // Add activity log
    const logs = JSON.parse(localStorage.getItem('activityLogs') || '[]');
    logs.push({
      action: 'user_updated',
      performedBy: user.email,
      details: `Updated user: ${formData.name} (${formData.email})`,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('activityLogs', JSON.stringify(logs));

    // Clear session storage
    sessionStorage.removeItem('editUser');

    alert('User updated successfully!');
    navigate(-1); // Go back to previous page
  };

  const handleCancel = () => {
    sessionStorage.removeItem('editUser');
    navigate(-1);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!editingUser) {
    return (
      <div className="content-card">
        <h2>No user selected for editing</h2>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>
          Go Back
        </button>
      </div>
    );
  }

  const getRoleOptions = () => {
    if (role === 'main_admin') {
      return ['super_admin', 'admin', 'user'];
    } else if (role === 'super_admin') {
      return ['admin', 'user'];
    } else if (role === 'admin') {
      return ['user'];
    }
    return [];
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Edit User</h1>
        <p className="page-subtitle">Update user information</p>
      </div>

      <div className="content-card">
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-user"></i> Full Name *
              </label>
              <input
                type="text"
                name="name"
                className="form-input"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-envelope"></i> Email *
              </label>
              <input
                type="email"
                name="email"
                className="form-input"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter email address"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-phone"></i> Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                className="form-input"
                value={formData.phone}
                onChange={handleChange}
                placeholder="Enter phone number"
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-user-tag"></i> Role *
              </label>
              <select
                name="role"
                className="form-select"
                value={formData.role}
                onChange={handleChange}
                required
              >
                {getRoleOptions().map(r => (
                  <option key={r} value={r}>
                    {r.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label className="form-label">
                <i className="fa-solid fa-lock"></i> New Password (leave blank to keep current)
              </label>
              <input
                type="password"
                name="password"
                className="form-input"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter new password or leave blank"
              />
              <small style={{ color: '#666', fontSize: '12px', marginTop: '5px', display: 'block' }}>
                Only enter a password if you want to change it
              </small>
            </div>
          </div>

          <div style={{ 
            display: 'flex', 
            gap: '15px', 
            marginTop: '30px',
            justifyContent: 'flex-end'
          }}>
            <button 
              type="button" 
              className="btn btn-secondary"
              onClick={handleCancel}
            >
              <i className="fa-solid fa-times"></i> Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <i className="fa-solid fa-check"></i> Update User
            </button>
          </div>
        </form>
      </div>

      <div className="content-card" style={{ background: '#fff3cd', borderLeft: '4px solid #ffc107' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#856404' }}>
          <i className="fa-solid fa-info-circle"></i> User Information
        </h3>
        <div style={{ fontSize: '14px', color: '#856404' }}>
          <p><strong>Current Status:</strong> {editingUser.status || 'Active'}</p>
          <p><strong>Created By:</strong> {editingUser.createdBy || 'System'}</p>
          <p><strong>User ID:</strong> {editingUser.id}</p>
        </div>
      </div>
    </>
  );
};

export default EditUser;
