import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getAllocationsByCreator, getAllocationsByAllocator, getAllAllocations, getAllocationsByUserId, migrateUserAllocations } from '../../firebase/dataAllocation';
import '../Dashboard/DashBoard.css';
import ConfirmationModal from '../Common/ConfirmationModal';
import AlertModal from '../Common/AlertModal';

const ViewAllocatedData = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  // Set default view mode based on user role
  const getDefaultViewMode = () => {
    if (!user) return 'myAllocations'; // Default fallback
    if (user.role === 'admin') {
      return 'myAllocations'; // Admins default to seeing their own allocations first
    } else if (user.role === 'super_admin') {
      return 'myAllocations'; // Super admins default to seeing their own allocations first
    } else if (user.role === 'main_admin') {
      return 'myUsersAllocations'; // Main admin starts with users' allocations
    } else {
      return 'myAllocations'; // Default fallback
    }
  };
  
  const [viewMode, setViewMode] = useState(() => getDefaultViewMode()); // 'myAllocations', 'myUsersAllocations', or 'allAllocations'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('all');
  
  const [alertModal, setAlertModal] = useState({
    isOpen: false,
    message: '',
    type: 'info'
  });
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    allocationId: null,
    allocationDetails: null
  });

  useEffect(() => {
    loadAllocations();
  }, [viewMode, user]);

  // Function to handle delete allocation
  const handleDeleteAllocation = (allocation) => {
    setDeleteModal({
      isOpen: true,
      allocationId: allocation.id,
      allocationDetails: allocation
    });
  };

  // Function to confirm delete allocation
  const confirmDeleteAllocation = async () => {
    if (!deleteModal.allocationId || !deleteModal.allocationDetails) return;

    try {
      const { removeAllocation } = await import('../../firebase/dataAllocation');
      const { createActivityLog } = await import('../../firebase/firestore');

      // Get userId from allocation details
      const userId = deleteModal.allocationDetails.userId;
      
      if (!userId) {
        setAlertModal({
          isOpen: true,
          message: 'Cannot delete allocation: User ID not found',
          type: 'error'
        });
        setDeleteModal({ isOpen: false, allocationId: null, allocationDetails: null });
        return;
      }

      const result = await removeAllocation(userId, deleteModal.allocationId);

      if (result.success) {
        // Create activity log
        await createActivityLog({
          action: 'allocation_deleted',
          performedBy: user.email,
          details: `Deleted allocation: ${deleteModal.allocationDetails.district} - ${deleteModal.allocationDetails.city || deleteModal.allocationDetails.villages?.join(', ')}`
        });

        setAlertModal({
          isOpen: true,
          message: 'Data allocation deleted successfully!',
          type: 'success'
        });

        // Reload allocations
        await loadAllocations();
      } else {
        setAlertModal({
          isOpen: true,
          message: 'Failed to delete allocation: ' + result.error,
          type: 'error'
        });
      }
    } catch (error) {
      console.error('Error deleting allocation:', error);
      setAlertModal({
        isOpen: true,
        message: 'Error deleting allocation: ' + error.message,
        type: 'error'
      });
    } finally {
      setDeleteModal({ isOpen: false, allocationId: null, allocationDetails: null });
    }
  };

  const loadAllocations = async () => {
    setLoading(true);
    try {
      console.log('Loading allocations for:', user.email, 'Role:', user.role, 'Mode:', viewMode);
      console.log('User object:', { id: user.id, uid: user.uid, email: user.email, role: user.role });
      let result;
      
      // Handle different user roles
      if (user.role === 'user') {
        // Regular users can only see their own allocations
        console.log('User role: Fetching allocations for user ID:', user.uid);
        result = await getAllocationsByUserId(user.uid);
      } else if (user.role === 'admin') {
        // Admins can see allocations they made or for users they created
        if (viewMode === 'myAllocations') {
          console.log('Admin role: Fetching MY allocations (allocated TO me) for user ID:', user.id);
          // First try to migrate old allocations if any exist
          const migrationResult = await migrateUserAllocations(user.id);
          if (migrationResult.success && migrationResult.migrated > 0) {
            console.log(`Migrated ${migrationResult.migrated} old allocations for admin user`);
          }
          result = await getAllocationsByUserId(user.id);
        } else {
          console.log('Admin role: Fetching allocations by creator:', user.email);
          result = await getAllocationsByCreator(user.email);
        }
      } else if (user.role === 'super_admin') {
        // Super admins can see allocations they made or for users they created
        if (viewMode === 'myAllocations') {
          console.log('Super Admin role: Fetching MY allocations (allocated TO me) for user ID:', user.id);
          // First try to migrate old allocations if any exist
          const migrationResult = await migrateUserAllocations(user.id);
          if (migrationResult.success && migrationResult.migrated > 0) {
            console.log(`Migrated ${migrationResult.migrated} old allocations for super admin user`);
          }
          result = await getAllocationsByUserId(user.id);
        } else if (viewMode === 'myUsersAllocations') {
          console.log('Super Admin role: Fetching allocations by creator:', user.email);
          result = await getAllocationsByCreator(user.email);
        } else {
          console.log('Super Admin role: Fetching ALL allocations');
          result = await getAllAllocations();
        }
      } else if (user.role === 'main_admin') {
        // Main admins can see all allocations
        if (viewMode === 'myAllocations') {
          console.log('Main Admin role: Fetching MY allocations (allocated TO me) for user ID:', user.id);
          // First try to migrate old allocations if any exist
          const migrationResult = await migrateUserAllocations(user.id);
          if (migrationResult.success && migrationResult.migrated > 0) {
            console.log(`Migrated ${migrationResult.migrated} old allocations for main admin user`);
          }
          result = await getAllocationsByUserId(user.id);
        } else if (viewMode === 'myUsersAllocations') {
          console.log('Main Admin role: Fetching allocations by creator:', user.email);
          result = await getAllocationsByCreator(user.email);
        } else {
          console.log('Main Admin role: Fetching ALL allocations');
          result = await getAllAllocations();
        }
      }
      
      console.log('Allocations result:', result);
      
      if (result.success) {
        console.log('Found allocations:', result.data.length);
        console.log('Allocations data:', result.data);
        
        // Debug: Check each allocation for missing data
        result.data.forEach((allocation, index) => {
          console.log(`Allocation ${index + 1}:`, {
            id: allocation.id,
            userId: allocation.userId,
            userName: allocation.userName,
            userEmail: allocation.userEmail,
            district: allocation.district,
            city: allocation.city,
            villages: allocation.villages,
            allocatedBy: allocation.allocatedBy,
            allocatedAt: allocation.allocatedAt
          });
          
          // Check for potential issues
          if (!allocation.userId) {
            console.warn('⚠️ Allocation missing userId:', allocation);
          }
          if (!allocation.userName && !allocation.userEmail) {
            console.warn('⚠️ Allocation missing user info:', allocation);
          }
          if (!allocation.district) {
            console.warn('⚠️ Allocation missing district:', allocation);
          }
        });
        
        setAllocations(result.data);
        
        if (result.data.length === 0) {
          console.log('No allocations found for current view mode:', viewMode);
        }
      } else {
        console.error('Failed to load allocations:', result.error);
        setAllocations([]);
      }
    } catch (error) {
      console.error('Error loading allocations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get unique districts
  const districts = ['all', ...new Set(allocations.map(a => a.district).filter(Boolean))];

  // Filter allocations
  const filteredAllocations = allocations.filter(allocation => {
    // Handle both old and new allocation formats with null checks
    const userName = allocation.userName || allocation.userEmail || '';
    const userEmail = allocation.userEmail || '';
    const district = allocation.district || '';
    const villages = allocation.villages || (allocation.city ? [allocation.city] : []);
    
    const matchesSearch = 
      userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      villages.some(v => (v || '').toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDistrict = selectedDistrict === 'all' || allocation.district === selectedDistrict;
    
    const passes = matchesSearch && matchesDistrict;
    
    // Debug: Log filtering results
    if (!passes) {
      console.log('🚫 Allocation filtered out:', {
        id: allocation.id,
        userName,
        district,
        searchTerm,
        selectedDistrict,
        matchesSearch,
        matchesDistrict
      });
    }
    
    return passes;
  });
  
  console.log('📊 Filtering results:', {
    totalAllocations: allocations.length,
    filteredAllocations: filteredAllocations.length,
    searchTerm,
    selectedDistrict
  });

  // Group by user
  const allocationsByUser = filteredAllocations.reduce((acc, allocation) => {
    const userId = allocation.userId || 'unknown';
    
    console.log('👤 Grouping allocation:', {
      allocationId: allocation.id,
      userId,
      userName: allocation.userName,
      userEmail: allocation.userEmail,
      district: allocation.district
    });
    
    if (!acc[userId]) {
      acc[userId] = {
        userName: allocation.userName || allocation.userEmail || 'Unknown User',
        userEmail: allocation.userEmail || 'Unknown Email',
        userRole: allocation.userRole || 'user',
        allocations: []
      };
      console.log('🆕 Created new user group for:', userId, acc[userId].userName);
    }
    acc[userId].allocations.push(allocation);
    console.log('📝 User', userId, 'now has', acc[userId].allocations.length, 'allocations');
    return acc;
  }, {});
  
  console.log('👥 Final grouping results:', {
    totalUsers: Object.keys(allocationsByUser).length,
    userGroups: Object.entries(allocationsByUser).map(([userId, userData]) => ({
      userId,
      userName: userData.userName,
      allocationCount: userData.allocations.length
    }))
  });

  // Calculate statistics
  const stats = {
    totalUsers: Object.keys(allocationsByUser).length,
    totalAllocations: filteredAllocations.length,
    totalDistricts: new Set(filteredAllocations.map(a => a.district).filter(Boolean)).size,
    totalVillages: filteredAllocations.reduce((sum, a) => {
      // Handle both old and new formats
      const villageCount = a.villageCount || (a.villages ? a.villages.length : 1);
      return sum + villageCount;
    }, 0)
  };

  return (
    <>
      <AlertModal
        isOpen={alertModal.isOpen}
        message={alertModal.message}
        type={alertModal.type}
        onClose={() => setAlertModal(prev => ({ ...prev, isOpen: false }))}
      />

      <ConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, allocationId: null, allocationDetails: null })}
        onConfirm={confirmDeleteAllocation}
        title="Delete Data Allocation"
        message={`Are you sure you want to delete this allocation?\n\nDistrict: ${deleteModal.allocationDetails?.district}\nVillage: ${deleteModal.allocationDetails?.city || deleteModal.allocationDetails?.villages?.join(', ')}\n\nThis action cannot be undone and the user will lose access to this data.`}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <div className="page-header">
        <h1 className="page-title">📊 View Allocated Data</h1>
        <p className="page-subtitle">View all data allocations for your users</p>
      </div>

      {/* View Mode Toggle */}
      <div className="content-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {/* All Allocations - Only for super_admin and main_admin */}
          {(user?.role === 'super_admin' || user?.role === 'main_admin') && (
            <button
              onClick={() => setViewMode('allAllocations')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                background: viewMode === 'allAllocations' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e5e7eb',
                color: viewMode === 'allAllocations' ? 'white' : '#374151'
              }}
            >
              <i className="fa-solid fa-globe"></i> All Allocations
            </button>
          )}
          
          {/* My Allocations - For admin and super_admin roles */}
          {(user?.role === 'admin' || user?.role === 'super_admin') && (
            <button
              onClick={() => setViewMode('myAllocations')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                background: viewMode === 'myAllocations' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e5e7eb',
                color: viewMode === 'myAllocations' ? 'white' : '#374151'
              }}
            >
              <i className="fa-solid fa-user-check"></i> My Allocations
            </button>
          )}
          
          {/* My Users' Allocations - For admin, super_admin, and main_admin */}
          {(user?.role === 'admin' || user?.role === 'super_admin' || user?.role === 'main_admin') && (
            <button
              onClick={() => setViewMode('myUsersAllocations')}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: '600',
                background: viewMode === 'myUsersAllocations' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : '#e5e7eb',
                color: viewMode === 'myUsersAllocations' ? 'white' : '#374151'
              }}
            >
              <i className="fa-solid fa-users"></i> My Users' Allocations
            </button>
          )}
          
          <button
            onClick={loadAllocations}
            disabled={loading}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: '600',
              background: '#10b981',
              color: 'white',
              marginLeft: 'auto'
            }}
          >
            <i className={`fa-solid fa-refresh ${loading ? 'fa-spin' : ''}`}></i> Refresh
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '20px' }}>
        <div className="content-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#667eea' }}>{stats.totalUsers}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Users</div>
        </div>
        <div className="content-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#10b981' }}>{stats.totalAllocations}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Allocations</div>
        </div>
        <div className="content-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#f59e0b' }}>{stats.totalDistricts}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Districts</div>
        </div>
        <div className="content-card" style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '32px', fontWeight: '700', color: '#ef4444' }}>{stats.totalVillages}</div>
          <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>Villages</div>
        </div>
      </div>

      {/* Filters */}
      <div className="content-card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div>
            <label className="form-label">
              <i className="fa-solid fa-search"></i> Search
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Search by user, district, or village..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                width: '100%'
              }}
            />
          </div>
          <div>
            <label className="form-label">
              <i className="fa-solid fa-map-location-dot"></i> Filter by District
            </label>
            <select
              className="form-select"
              value={selectedDistrict}
              onChange={(e) => setSelectedDistrict(e.target.value)}
              style={{
                padding: '10px',
                border: '2px solid #e5e7eb',
                borderRadius: '8px',
                width: '100%'
              }}
            >
              {districts.map(district => (
                <option key={district} value={district}>
                  {district === 'all' ? 'All Districts' : district}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Allocations List */}
      {loading ? (
          <div className="content-card" style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '32px', color: '#667eea' }}></i>
            <p style={{ marginTop: '15px', color: '#666' }}>Loading allocations...</p>
          </div>
        ) : Object.keys(allocationsByUser).length === 0 ? (
          <div className="content-card" style={{ textAlign: 'center', padding: '40px' }}>
            <i className="fa-solid fa-inbox" style={{ fontSize: '48px', color: '#d1d5db' }}></i>
            <h3 style={{ marginTop: '15px', color: '#666' }}>No Allocations Found</h3>
            <p style={{ color: '#999', marginTop: '10px' }}>
              {viewMode === 'myAllocations' 
                ? 'You haven\'t allocated any data yet.'
                : 'No allocations found for your users.'}
            </p>
          </div>
        ) : (
          Object.entries(allocationsByUser).map(([userId, userData]) => {
            // Ensure userData has required properties
            const safeUserData = {
              userName: userData?.userName || 'Unknown User',
              userEmail: userData?.userEmail || 'Unknown Email',
              userRole: userData?.userRole || 'user',
              allocations: userData?.allocations || []
            };
            
            return (
              <div key={userId} className="content-card" style={{ marginBottom: '20px' }}>
                {/* User Header */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '15px',
                  paddingBottom: '15px',
                  borderBottom: '2px solid #e5e7eb'
                }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>
                      {safeUserData.userName}
                    </h3>
                    <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                      {safeUserData.userEmail} • <span style={{ 
                        padding: '2px 8px', 
                        borderRadius: '4px', 
                        background: '#e0e7ff', 
                        color: '#4f46e5',
                        fontSize: '12px',
                        fontWeight: '600'
                      }}>{safeUserData.userRole}</span>
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                      {safeUserData.allocations.length}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Allocations</div>
                  </div>
                </div>

                {/* Allocations */}
                <div style={{ display: 'grid', gap: '10px' }}>
                  {safeUserData.allocations.map(allocation => (
                    <div 
                      key={allocation.id}
                      style={{
                        padding: '15px',
                        background: '#f9fafb',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '8px' }}>
                            <i className="fa-solid fa-map-location-dot" style={{ color: '#667eea' }}></i> {allocation.district}
                          </div>
                          <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                            <i className="fa-solid fa-building"></i> 
                            {allocation.villages ? (
                              `${allocation.villages.length} village(s): ${allocation.villages.join(', ')}`
                            ) : allocation.city ? (
                              `1 village: ${allocation.city}`
                            ) : (
                              '1 village'
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            <i className="fa-solid fa-user"></i> Allocated by: {allocation.allocatedBy} • 
                            <i className="fa-solid fa-calendar" style={{ marginLeft: '10px' }}></i> {
                              allocation.allocatedAt ? (
                                allocation.allocatedAt.seconds ? 
                                  new Date(allocation.allocatedAt.seconds * 1000).toLocaleDateString() :
                                  new Date(allocation.allocatedAt).toLocaleDateString()
                              ) : 'N/A'
                            }
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteAllocation(allocation)}
                          style={{
                            padding: '8px 16px',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '500',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                          }}
                          onMouseOver={(e) => e.target.style.background = '#dc2626'}
                          onMouseOut={(e) => e.target.style.background = '#ef4444'}
                        >
                          <i className="fa-solid fa-trash"></i> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )
      }
    </>
  );
};

export default ViewAllocatedData;
