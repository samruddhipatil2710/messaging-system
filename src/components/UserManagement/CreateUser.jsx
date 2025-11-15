import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const CreateUser = ({ role, onSubmit }) => {
  const getRoleOptions = () => {
    if (role === 'main_admin') {
      return [
        { value: 'super_admin', label: 'Super Admin' },
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ];
    }
    if (role === 'super_admin') {
      return [
        { value: 'admin', label: 'Admin' },
        { value: 'user', label: 'User' },
      ];
    }
    return [{ value: 'user', label: 'User' }];
  };

  const roleOptions = getRoleOptions();
  // No default role - we'll use a placeholder

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    phone: ''
  });
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-select role if passed via navigation state
  useEffect(() => {
    if (location.state?.preSelectedRole) {
      setFormData(prev => ({ ...prev, role: location.state.preSelectedRole }));
    }
  }, [location.state]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Role validation based on creator's role
    if (role === 'admin' && formData.role !== 'user') {
      alert('As an Admin, you can only create regular users');
      return;
    }
    
    if (role === 'super_admin' && formData.role === 'super_admin') {
      alert('As a Super Admin, you can only create Admin or User accounts');
      return;
    }
    
    // Create user object
    const newUser = {
      name: formData.name,
      email: formData.email,
      role: formData.role,
      phone: formData.phone,
      password: formData.password,
      createdBy: role === 'main_admin' ? 'mainadmin@demo.com' : user?.email, // For main admin, use hardcoded email
      createdAt: new Date().toISOString()
    };
    
    // Call parent's create function (which handles Firebase save and activity log)
    onSubmit(newUser);
    
    // Show success message
    setSuccess(true);
    
    // After 1 second, redirect to users list
    setTimeout(() => {
      const basePath = `/${user?.role.replace('_', '-')}`;
      navigate(`${basePath}/users`);
    }, 1000);
    
    // Reset form
    setFormData({ name: '', email: '', password: '', role: '', phone: '' });
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Create New User</h1>
        <p className="page-subtitle">Add a new user to the system</p>
      </div>

      {success && (
        <div className="success-message">
          <i className="fa-solid fa-circle-check"></i> User created successfully!
        </div>
      )}

      <div className="content-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name *</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter full name"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-input"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="Enter email address"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password *</label>
            <input
              type="password"
              className="form-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Enter password"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role *</label>
            <select
              className="form-select"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              required
            >
              <option value="" disabled>Select Role</option>
              {getRoleOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <button type="submit" className="btn btn-primary">
            <i className="fa-solid fa-plus"></i> Create
          </button>
        </form>
      </div>
    </>
  );
};

export default CreateUser;