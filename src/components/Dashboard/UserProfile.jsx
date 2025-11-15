import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import Toast from '../Common/Toast';
import './DashBoard.css';

const UserProfile = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSaveProfile = async () => {
    try {
      const { updateUser, createActivityLog } = await import('../../firebase/firestore');
      
      // Update user in Firebase with correct field names
      const result = await updateUser(user.email, {
        'Full Name': formData.name,
        'Phone Number': formData.phone
      });
      
      if (result.success) {
        // Log the activity
        await createActivityLog({
          action: 'profile_updated',
          performedBy: user.email,
          details: `Updated profile information`
        });
        
        // Update sessionStorage with new data
        const updatedUser = { ...user, name: formData.name, phone: formData.phone };
        sessionStorage.setItem('currentUser', JSON.stringify(updatedUser));
        
        setIsEditing(false);
        setToast({ message: 'Profile updated successfully!', type: 'success' });
      } else {
        setToast({ message: 'Failed to update profile: ' + result.error, type: 'error' });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setToast({ message: 'Failed to update profile: ' + error.message, type: 'error' });
    }
  };

  const handleChangePassword = async () => {
    if (formData.newPassword !== formData.confirmPassword) {
      setToast({ message: 'New passwords do not match!', type: 'error' });
      return;
    }

    if (formData.newPassword.length < 6) {
      setToast({ message: 'Password must be at least 6 characters!', type: 'warning' });
      return;
    }

    try {
      const { getUserByEmail, updateUser, createActivityLog } = await import('../../firebase/firestore');
      
      // Get current user from Firebase
      const result = await getUserByEmail(user.email);
      
      if (!result.success) {
        setToast({ message: 'Failed to verify current user', type: 'error' });
        return;
      }
      
      const currentUser = result.data;
      
      // Verify current password
      if (currentUser.password !== formData.currentPassword) {
        setToast({ message: 'Current password is incorrect!', type: 'error' });
        return;
      }
      
      // Update password in Firebase with correct field name
      const updateResult = await updateUser(user.email, {
        'Password': formData.newPassword
      });
      
      if (updateResult.success) {
        // Log the activity
        await createActivityLog({
          action: 'password_changed',
          performedBy: user.email,
          details: `Changed password`
        });
        
        setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
        setToast({ message: 'Password changed successfully!', type: 'success' });
      } else {
        setToast({ message: 'Failed to change password: ' + updateResult.error, type: 'error' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setToast({ message: 'Failed to change password: ' + error.message, type: 'error' });
    }
  };

  return (
    <>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      
      <div className="page-header">
        <h1 className="page-title">My Profile</h1>
        <p className="page-subtitle">Manage your account settings</p>
      </div>

      <div className="content-card">
        <h2 className="card-title">Profile Information</h2>
        
        <div style={{ maxWidth: '500px' }}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email (Cannot be changed)</label>
            <input
              type="email"
              className="form-input"
              value={user?.email}
              disabled
              style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              type="tel"
              className="form-input"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              disabled={!isEditing}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Role</label>
            <input
              type="text"
              className="form-input"
              value={user?.role.replace('_', ' ').toUpperCase()}
              disabled
              style={{ background: '#f5f5f5', cursor: 'not-allowed' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {!isEditing ? (
              <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
                <i className="fa-solid fa-pen-to-square"></i> Edit Profile
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleSaveProfile}>
                  <i className="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
                <button className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  <i className="fa-solid fa-xmark"></i> Cancel
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="content-card">
        <h2 className="card-title">Change Password</h2>
        
        {!showPasswordChange ? (
          <button className="btn btn-secondary" onClick={() => setShowPasswordChange(true)}>
            <i className="fa-solid fa-lock"></i> Change Password
          </button>
        ) : (
          <div style={{ maxWidth: '500px' }}>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-primary" onClick={handleChangePassword}>
                <i className="fa-solid fa-floppy-disk"></i> Update Password
              </button>
              <button className="btn btn-secondary" onClick={() => {
                setShowPasswordChange(false);
                setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
              }}>
                <i className="fa-solid fa-xmark"></i> Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default UserProfile;