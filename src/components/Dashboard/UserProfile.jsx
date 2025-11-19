import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import Toast from '../Common/Toast';
import './DashBoard.css';

const UserProfile = () => {
  const { user, updateUser: updateAuthContext } = useAuth();
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
    console.log('🚀 handleSaveProfile called!');
    console.log('👤 Current user:', user);
    console.log('📋 Form data:', formData);
    
    try {
      console.log('📦 Importing Firebase functions...');
      const { updateUser: updateFirebaseUser, createActivityLog, getUserByEmail } = await import('../../firebase/firestore');
      console.log('✅ Firebase functions imported');
      
      console.log('🔄 Updating profile for:', user.email);
      console.log('📝 New data:', { name: formData.name, phone: formData.phone });
      
      // Update user in Firebase with correct field names
      console.log('📤 Calling updateFirebaseUser...');
      const result = await updateFirebaseUser(user.email, {
        'Full Name': formData.name,
        'Phone Number': formData.phone
      });
      
      console.log('📥 Update result:', result);
      
      if (result.success) {
        console.log('✅ Firebase update successful');
        
        // Log the activity
        console.log('📝 Creating activity log...');
        await createActivityLog({
          action: 'profile_updated',
          performedBy: user.email,
          details: `Updated profile information`
        });
        console.log('✅ Activity log created');
        
        // Fetch the updated user from Firebase to confirm changes
        console.log('🔍 Fetching updated user from Firebase...');
        const updatedUserResult = await getUserByEmail(user.email);
        console.log('📥 getUserByEmail result:', updatedUserResult);
        
        if (updatedUserResult.success) {
          console.log('📥 Fetched updated user from Firebase:', updatedUserResult.data);
          
          // Update AuthContext with fetched data
          const updatedUserData = { 
            name: updatedUserResult.data.name,
            phone: updatedUserResult.data.phone || updatedUserResult.data.mobile,
            mobile: updatedUserResult.data.mobile
          };
          
          console.log('🔄 Updating AuthContext with:', updatedUserData);
          updateAuthContext(updatedUserData);
          
          // Update local form data to match
          setFormData({
            ...formData,
            name: updatedUserResult.data.name,
            phone: updatedUserResult.data.phone || updatedUserResult.data.mobile
          });
          
          setToast({ message: 'Profile updated successfully!', type: 'success' });
        } else {
          console.error('❌ Failed to fetch updated user:', updatedUserResult.error);
          setToast({ message: 'Updated but could not reload: ' + updatedUserResult.error, type: 'warning' });
        }
        
        setIsEditing(false);
      } else {
        console.error('❌ Firebase update failed:', result.error);
        setToast({ message: 'Failed to update profile: ' + result.error, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Error updating profile:', error);
      console.error('❌ Error stack:', error.stack);
      setToast({ message: 'Failed to update profile: ' + error.message, type: 'error' });
    }
  };

  const handleChangePassword = async () => {
    console.log('🔐 handleChangePassword called!');
    
    if (formData.newPassword !== formData.confirmPassword) {
      console.log('❌ Passwords do not match');
      setToast({ message: 'New passwords do not match!', type: 'error' });
      return;
    }

    if (formData.newPassword.length < 6) {
      console.log('❌ Password too short');
      setToast({ message: 'Password must be at least 6 characters!', type: 'warning' });
      return;
    }

    try {
      console.log('📦 Importing Firebase functions...');
      const { getUserByEmail, updateUser: updateFirebaseUser, createActivityLog } = await import('../../firebase/firestore');
      
      // Get current user from Firebase
      console.log('🔍 Fetching current user from Firebase...');
      const result = await getUserByEmail(user.email);
      console.log('📥 Get user result:', result);
      
      if (!result.success) {
        console.error('❌ Failed to verify current user');
        setToast({ message: 'Failed to verify current user', type: 'error' });
        return;
      }
      
      const currentUser = result.data;
      console.log('👤 Current user data:', currentUser);
      
      // Verify current password
      console.log('🔑 Verifying current password...');
      console.log('🔑 Stored password:', currentUser.password);
      console.log('🔑 Entered password:', formData.currentPassword);
      
      if (currentUser.password !== formData.currentPassword) {
        console.error('❌ Current password is incorrect');
        setToast({ message: 'Current password is incorrect!', type: 'error' });
        return;
      }
      
      console.log('✅ Password verified');
      
      // Update password in Firebase with correct field name
      console.log('📤 Updating password in Firebase...');
      const updateResult = await updateFirebaseUser(user.email, {
        'Password': formData.newPassword
      });
      
      console.log('📥 Password update result:', updateResult);
      
      if (updateResult.success) {
        console.log('✅ Password update successful');
        
        // Log the activity
        console.log('📝 Creating activity log...');
        await createActivityLog({
          action: 'password_changed',
          performedBy: user.email,
          details: `Changed password`
        });
        
        // Update AuthContext with new password
        console.log('🔄 Updating AuthContext with new password');
        updateAuthContext({ password: formData.newPassword });
        
        setFormData({ ...formData, currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordChange(false);
        setToast({ message: 'Password changed successfully!', type: 'success' });
      } else {
        console.error('❌ Password update failed:', updateResult.error);
        setToast({ message: 'Failed to change password: ' + updateResult.error, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Error changing password:', error);
      console.error('❌ Error stack:', error.stack);
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
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  console.log('📝 Edit Profile button clicked');
                  setIsEditing(true);
                }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit Profile
              </button>
            ) : (
              <>
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    console.log('💾 Save Changes button clicked');
                    handleSaveProfile();
                  }}
                >
                  <i className="fa-solid fa-floppy-disk"></i> Save Changes
                </button>
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    console.log('❌ Cancel button clicked');
                    setIsEditing(false);
                  }}
                >
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