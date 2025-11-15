import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getAllUsers } from '../../firebase/firestore';
import { 
  getAllDistricts, 
  getVillagesByDistrict, 
  allocateDataToUser,
  getUserAllocations,
  removeAllocation,
  getUserAllocationSummary
} from '../../firebase/dataAllocation';
import { createActivityLog } from '../../firebase/firestore';
import '../Dashboard/DashBoard.css';

const DataAllocationNew = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // User selection
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  
  // District and village selection
  const [districts, setDistricts] = useState([]);
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [villages, setVillages] = useState([]);
  const [selectedVillages, setSelectedVillages] = useState([]);
  const [villageSearchTerm, setVillageSearchTerm] = useState('');
  
  // Date fields
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Allocations
  const [userAllocations, setUserAllocations] = useState([]);
  const [allocationSummary, setAllocationSummary] = useState(null);
  
  // UI states
  const [loading, setLoading] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(true);
  const [message, setMessage] = useState({ type: '', text: '' });

  // Load users on mount
  useEffect(() => {
    loadUsers();
    loadDistricts();
  }, [user]);

  // Load user allocations when user is selected
  useEffect(() => {
    if (selectedUser) {
      loadUserAllocations(selectedUser.id);
      loadAllocationSummary(selectedUser.id);
    }
  }, [selectedUser]);

  // Load villages when district is selected
  useEffect(() => {
    if (selectedDistrict) {
      loadVillages(selectedDistrict);
    }
  }, [selectedDistrict]);

  const loadUsers = async () => {
    try {
      const result = await getAllUsers();
      if (result.success) {
        // Filter users based on current user's role and hierarchy
        let filteredUsers = [];
        if (user.role === 'main_admin') {
          // Main Admin can allocate to all users (super_admin, admin, user)
          filteredUsers = result.data.filter(u => 
            u.role === 'super_admin' || u.role === 'admin' || u.role === 'user'
          );
        } else if (user.role === 'super_admin') {
          // Super Admin can allocate to admins they created and users under their hierarchy
          filteredUsers = result.data.filter(u => {
            // Include admins created by this super admin
            if (u.role === 'admin' && u.createdBy === user.email) {
              return true;
            }
            // Include users created by this super admin directly
            if (u.role === 'user' && u.createdBy === user.email) {
              return true;
            }
            // Include users created by admins under this super admin
            if (u.role === 'user') {
              const adminEmails = result.data
                .filter(admin => admin.role === 'admin' && admin.createdBy === user.email)
                .map(admin => admin.email);
              return adminEmails.includes(u.createdBy);
            }
            return false;
          });
        } else if (user.role === 'admin') {
          // Admin can only allocate to users they created
          filteredUsers = result.data.filter(u => 
            u.role === 'user' && u.createdBy === user.email
          );
        }
        setUsers(filteredUsers);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadDistricts = async () => {
    setLoadingDistricts(true);
    try {
      // Only show districts that are allocated to the current user based on their role
      const result = await getAllDistricts(user.id, user.role);
      
      if (result.success) {
        setDistricts(result.data);
        
        if (result.data.length === 0) {
          setMessage({ 
            type: 'warning', 
            text: '⚠️ No districts found. Either no data has been uploaded or no districts have been allocated to you.' 
          });
        }
      } else {
        setMessage({ type: 'error', text: `Error loading districts: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading districts: ${error.message}` });
    } finally {
      setLoadingDistricts(false);
    }
  };

  const loadVillages = async (district) => {
    setLoading(true);
    try {
      // Only show villages that are allocated to the current user based on their role
      const result = await getVillagesByDistrict(district, user.id, user.role);
      
      if (result.success) {
        setVillages(result.data);
        
        if (result.data.length === 0) {
          setMessage({ 
            type: 'warning', 
            text: `⚠️ No villages found for ${district}. Either no data has been uploaded or no villages have been allocated to you.` 
          });
        }
      } else {
        setMessage({ type: 'error', text: `Error loading villages: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `Error loading villages: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const loadUserAllocations = async (userId) => {
    try {
      const result = await getUserAllocations(userId);
      if (result.success) {
        setUserAllocations(result.data);
      }
    } catch (error) {
      console.error('Error loading allocations:', error);
    }
  };

  const loadAllocationSummary = async (userId) => {
    try {
      const result = await getUserAllocationSummary(userId);
      if (result.success) {
        setAllocationSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleUserSelect = (u) => {
    setSelectedUser(u);
    setUserSearchTerm('');
    setSelectedDistrict('');
    setSelectedVillages([]);
    setVillages([]);
    setMessage({ type: '', text: '' });
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedVillages([]);
    setVillages([]);
  };

  const toggleVillage = (village) => {
    setSelectedVillages(prev => {
      const exists = prev.find(v => v.name === village.name);
      if (exists) {
        return prev.filter(v => v.name !== village.name);
      } else {
        return [...prev, village];
      }
    });
  };

  const handleAllocate = async () => {
    if (!selectedUser || !selectedDistrict || selectedVillages.length === 0) {
      setMessage({ type: 'error', text: 'Please select user, district, and at least one village' });
      return;
    }

    // Validate dates
    if (!startDate || !endDate) {
      setMessage({ type: 'error', text: 'Please select both start date and end date' });
      return;
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      setMessage({ type: 'error', text: 'Start date cannot be after end date' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const villageNames = selectedVillages.map(v => v.name);
      const result = await allocateDataToUser(
        selectedUser.id,
        selectedUser.email,
        selectedDistrict,
        villageNames,
        user.email,
        startDate,
        endDate
      );

      if (result.success) {
        // Log activity
        await createActivityLog({
          action: 'data_allocated',
          performedBy: user.email,
          details: `Allocated ${villageNames.length} villages in ${selectedDistrict} to ${selectedUser.email}`
        });

        setMessage({ 
          type: 'success', 
          text: `✅ Successfully allocated ${villageNames.length} villages to ${selectedUser.name}` 
        });

        // Reload allocations
        await loadUserAllocations(selectedUser.id);
        await loadAllocationSummary(selectedUser.id);

        // Reset selection
        setSelectedDistrict('');
        setSelectedVillages([]);
        setVillages([]);
        setStartDate('');
        setEndDate('');
      } else {
        setMessage({ type: 'error', text: `❌ Allocation failed: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAllocation = async (allocationId) => {
    if (!window.confirm('Are you sure you want to remove this allocation?')) {
      return;
    }

    setLoading(true);
    try {
      const result = await removeAllocation(selectedUser.id, allocationId);

      if (result.success) {
        setMessage({ type: 'success', text: '✅ Allocation removed successfully' });
        await loadUserAllocations(selectedUser.id);
        await loadAllocationSummary(selectedUser.id);
      } else {
        setMessage({ type: 'error', text: `❌ Error: ${result.error}` });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `❌ Error: ${error.message}` });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const filteredVillages = villages.filter(v =>
    v.villageName.toLowerCase().includes(villageSearchTerm.toLowerCase())
  );

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">📍 Data Allocation</h1>
          <p className="page-subtitle">Assign district and village data to users</p>
        </div>
        
        {/* Upload Data Button removed as requested */}
      </div>

      {/* Message */}
      {message.text && (
        <div className={`alert alert-${message.type}`} style={{ marginBottom: '20px' }}>
          {message.text}
        </div>
      )}
      
      {/* No Districts Warning with Upload Button */}
      {districts.length === 0 && !loadingDistricts && (
        <div style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
          border: '2px solid #f59e0b',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '15px'
        }}>
          <div style={{ fontSize: '48px' }}>⚠️</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#92400e', fontSize: '18px', fontWeight: '600' }}>
              No Districts Found
            </h3>
            {user.role === 'main_admin' ? (
              <>
                <p style={{ margin: '0', color: '#78350f', fontSize: '14px' }}>
                  You need to upload Excel data first before you can allocate it to users.
                </p>
              </>
            ) : (
              <p style={{ margin: '0', color: '#78350f', fontSize: '14px' }}>
                No district data is available for allocation. Please contact the Main Admin to upload district data.
              </p>
            )}
          </div>
        </div>
      )}

      {/* User Selection */}
      <div className="content-card">
        <h2 className="card-title">Select User</h2>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search users by name or email..."
            value={userSearchTerm}
            onChange={(e) => setUserSearchTerm(e.target.value)}
            style={{
              padding: '12px 15px',
              border: '2px solid #e5e7eb',
              borderRadius: '10px',
              fontSize: '14px',
              width: '100%',
              marginBottom: '15px'
            }}
          />

          {userSearchTerm && filteredUsers.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: '-15px',
              border: '2px solid #667eea',
              borderRadius: '10px',
              padding: '8px',
              maxHeight: '300px',
              overflowY: 'auto',
              background: 'white',
              boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2)'
            }}>
              {filteredUsers.map(u => (
                <div
                  key={u.id}
                  onClick={() => handleUserSelect(u)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#eff6ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <div style={{ fontWeight: '600', color: '#374151', fontSize: '14px' }}>
                    {u.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                    {u.email} • {u.role.replace('_', ' ').toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedUser && (
          <div style={{
            padding: '15px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '10px',
            color: 'white',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '16px', fontWeight: '600' }}>
                <i className="fa-solid fa-user-check" style={{ marginRight: '8px' }}></i>
                {selectedUser.name}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                {selectedUser.email} • {selectedUser.role.replace('_', ' ').toUpperCase()}
              </div>
            </div>
            <button
              onClick={() => {
                setSelectedUser(null);
                setUserAllocations([]);
                setAllocationSummary(null);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: 'none',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Change User
            </button>
          </div>
        )}

        {/* Allocation Summary */}
        {allocationSummary && (
          <div style={{
            marginTop: '15px',
            padding: '15px',
            background: '#f0f4ff',
            borderRadius: '10px',
            border: '2px solid #667eea'
          }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '10px', color: '#667eea' }}>
              📊 Allocation Summary
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                  {allocationSummary.totalDistricts}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Districts</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                  {allocationSummary.totalVillages}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Villages</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '700', color: '#667eea' }}>
                  {allocationSummary.totalAllocations}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>Allocations</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add New Allocation */}
      {selectedUser && (
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="card-title" style={{ margin: 0 }}>Add New Allocation for {selectedUser.name}</h2>
            <button
              onClick={loadDistricts}
              disabled={loadingDistricts}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: loadingDistricts ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <i className={`fa-solid fa-refresh ${loadingDistricts ? 'fa-spin' : ''}`}></i>
              Refresh Districts
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
            {/* District Selection */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-map-location-dot"></i> Select District *
              </label>
              <select
                className="form-select"
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                disabled={loadingDistricts || loading || districts.length === 0}
                style={{
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  width: '100%'
                }}
              >
                <option value="">
                  {loadingDistricts ? 'Loading districts...' : 
                   districts.length === 0 ? 'No districts available - Upload data first' : 'Select District'}
                </option>
                {districts.map((district) => (
                  <option key={district.id} value={district.name}>
                    {district.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Village Count */}
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-check-circle"></i> Selected Villages
              </label>
              <div style={{
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                background: '#f9fafb',
                fontWeight: '600',
                color: '#667eea'
              }}>
                {selectedVillages.length} village(s) selected
              </div>
            </div>
          </div>

          {/* Village Selection */}
          {selectedDistrict && (
            <div className="form-group">
              <label className="form-label">
                <i className="fa-solid fa-location-dot"></i> Search & Select Villages *
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="🔍 Search villages..."
                value={villageSearchTerm}
                onChange={(e) => setVillageSearchTerm(e.target.value)}
                style={{
                  padding: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  fontSize: '14px',
                  width: '100%',
                  marginBottom: '15px'
                }}
              />

              {loading ? (
                <div style={{ textAlign: 'center', padding: '20px', color: '#666' }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
                  <p style={{ marginTop: '10px' }}>Loading villages...</p>
                </div>
              ) : (
                <div style={{
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  padding: '10px'
                }}>
                  {filteredVillages.length > 0 ? (
                    filteredVillages.map((village) => {
                      const isSelected = selectedVillages.some(v => v.name === village.name);
                      return (
                        <div
                          key={village.id}
                          onClick={() => toggleVillage(village)}
                          style={{
                            padding: '12px',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            marginBottom: '8px',
                            background: isSelected ? '#eff6ff' : 'white',
                            border: isSelected ? '2px solid #667eea' : '2px solid #e5e7eb',
                            transition: 'all 0.2s',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = '#f9fafb';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSelected) {
                              e.currentTarget.style.background = 'white';
                            }
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: '600', color: isSelected ? '#667eea' : '#374151' }}>
                              {village.villageName}
                            </div>
                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                              {village.recordCount} records
                            </div>
                          </div>
                          {isSelected && (
                            <i className="fa-solid fa-check-circle" style={{ color: '#667eea', fontSize: '18px' }}></i>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#9ca3af' }}>
                      <i className="fa-solid fa-inbox" style={{ fontSize: '30px', marginBottom: '10px' }}></i>
                      <p>No villages found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Date Fields - Show when district is selected and villages are selected */}
          {selectedDistrict && selectedVillages.length > 0 && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ 
                background: '#e3f2fd', 
                border: '2px solid #2196f3', 
                borderRadius: '10px', 
                padding: '12px 16px',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <i className="fa-solid fa-calendar-alt" style={{ color: '#2196f3', fontSize: '20px' }}></i>
                <div style={{ fontSize: '14px', color: '#1976d2' }}>
                  <strong>Select Date Range:</strong> This user will have access to data from the selected start date to the end date
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group">
                  <label className="form-label" style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    marginBottom: '10px', 
                    display: 'flex',
                    alignItems: 'center',
                    color: '#1f2937',
                    letterSpacing: '0.3px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '10px',
                      boxShadow: '0 4px 8px rgba(102, 126, 234, 0.25)'
                    }}>
                      <i className="fa-solid fa-calendar-day" style={{ 
                        color: 'white',
                        fontSize: '15px'
                      }}></i>
                    </div>
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    style={{
                      padding: '12px 15px',
                      border: startDate ? '2px solid #667eea' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      width: '100%',
                      boxShadow: startDate ? '0 2px 8px rgba(102, 126, 234, 0.15)' : 'none'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ 
                    fontSize: '14px', 
                    fontWeight: '700', 
                    marginBottom: '10px', 
                    display: 'flex',
                    alignItems: 'center',
                    color: '#1f2937',
                    letterSpacing: '0.3px'
                  }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '10px',
                      boxShadow: '0 4px 8px rgba(102, 126, 234, 0.25)'
                    }}>
                      <i className="fa-solid fa-calendar-check" style={{ 
                        color: 'white',
                        fontSize: '15px'
                      }}></i>
                    </div>
                    End Date *
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate}
                    style={{
                      padding: '12px 15px',
                      border: endDate ? '2px solid #667eea' : '2px solid #e5e7eb',
                      borderRadius: '10px',
                      fontSize: '14px',
                      width: '100%',
                      boxShadow: endDate ? '0 2px 8px rgba(102, 126, 234, 0.15)' : 'none'
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Allocate Button */}
          <button
            onClick={handleAllocate}
            disabled={loading || !selectedDistrict || selectedVillages.length === 0 || !startDate || !endDate}
            style={{
              width: '100%',
              padding: '14px',
              background: loading || !selectedDistrict || selectedVillages.length === 0 || !startDate || !endDate
                ? '#ccc' 
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: loading || !selectedDistrict || selectedVillages.length === 0 || !startDate || !endDate ? 'not-allowed' : 'pointer',
              marginTop: '20px'
            }}
          >
            {loading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Allocating...
              </>
            ) : !startDate || !endDate ? (
              <>
                <i className="fa-solid fa-calendar"></i> Select Dates to Allocate
              </>
            ) : (
              <>
                <i className="fa-solid fa-plus-circle"></i> Allocate Data
              </>
            )}
          </button>
        </div>
      )}

      {/* Current Allocations */}
      {selectedUser && userAllocations.length > 0 && (
        <div className="content-card">
          <h2 className="card-title">Current Allocations</h2>
          <div style={{ display: 'grid', gap: '15px' }}>
            {userAllocations.map((allocation) => (
              <div
                key={allocation.id}
                style={{
                  padding: '15px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '10px',
                  background: 'white'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>
                      <i className="fa-solid fa-map-location-dot" style={{ color: '#667eea', marginRight: '8px' }}></i>
                      {allocation.district}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                      <i className="fa-solid fa-location-dot" style={{ marginRight: '8px' }}></i>
                      {allocation.villages ? (
                        `${allocation.villages.length} village(s): ${allocation.villages.join(', ')}`
                      ) : allocation.city ? (
                        `1 village: ${allocation.city}`
                      ) : (
                        '1 village'
                      )}
                    </div>
                    {/* Date Range Display */}
                    {allocation.startDate && allocation.endDate && (
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#667eea', 
                        marginBottom: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#f0f4ff',
                        padding: '6px 10px',
                        borderRadius: '6px',
                        fontWeight: '600'
                      }}>
                        <i className="fa-solid fa-calendar-days"></i>
                        {allocation.startDate} to {allocation.endDate}
                      </div>
                    )}
                    <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                      Allocated by {allocation.allocatedBy} • {
                        allocation.allocatedAt ? (
                          allocation.allocatedAt.seconds ? 
                            new Date(allocation.allocatedAt.seconds * 1000).toLocaleDateString() :
                            new Date(allocation.allocatedAt).toLocaleDateString()
                        ) : 'N/A'
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveAllocation(allocation.id)}
                    disabled={loading}
                    style={{
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      padding: '8px 16px',
                      borderRadius: '6px',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}
                  >
                    <i className="fa-solid fa-trash"></i> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

export default DataAllocationNew;
