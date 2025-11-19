import { Routes, Route, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { getAllocationsByUserId, migrateUserAllocations } from '../../firebase/dataAllocation';
import Sidebar from './Sidebar';
import MessageComposer from '../Messaging/MessageComposer';
import MessageHistory from '../Messaging/MessageHistory';
import ActivityLogs from './ActivityLogs';
import UserProfile from './UserProfile';
import './NewTheme.css';

const UserDashboard = () => {
  return (
    <div className="dashboard-container">
      <Sidebar role="user" />
      
      <div className="main-content">
        <Routes>
          <Route index element={<UserHome />} />
          <Route path="my-areas" element={<MyAreas />} />
                    <Route path="view-allocated-data" element={<ViewAllocatedData />} />
          <Route path="send-messages" element={<MessageComposer />} />
          <Route path="messages" element={<MessageComposer />} />
          <Route path="message-history" element={<MessageHistory />} />
          <Route path="activity-logs" element={<ActivityLogs />} />
          <Route path="profile" element={<UserProfile />} />
        </Routes>
      </div>
    </div>
  );
};

const UserHome = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allocatedAreas, setAllocatedAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalPeople, setTotalPeople] = useState(0);

  useEffect(() => {
    const loadAllocations = async () => {
      if (user && user.id) {
        setLoading(true);
        try {
          console.log('UserHome: Loading allocations for user:', user.id, 'User object:', user);
          
          // First try to migrate old allocations if any exist
          console.log('UserHome: Checking for old allocations to migrate...');
          const migrationResult = await migrateUserAllocations(user.id);
          if (migrationResult.success && migrationResult.migrated > 0) {
            console.log(`UserHome: Migrated ${migrationResult.migrated} old allocations`);
          }
          
          const result = await getAllocationsByUserId(user.id);
          console.log('UserHome: getAllocationsByUserId result:', result);
          
          if (result.success) {
            const allocations = result.data || [];
            console.log('UserHome: Allocations data:', allocations);
            
            // Get today's date for filtering
            const today = new Date().toISOString().split('T')[0];
            
            // Filter allocations by date range (only active allocations)
            const activeAllocations = allocations.filter(a => {
              if (a.startDate && a.endDate) {
                const isWithinDateRange = today >= a.startDate && today <= a.endDate;
                console.log(`📅 UserHome: ${a.district} - ${a.city}: ${a.startDate} to ${a.endDate} = ${isWithinDateRange ? '✅ ACTIVE' : '❌ EXPIRED'}`);
                return isWithinDateRange;
              }
              // If no dates, include by default
              return true;
            });
            
            console.log(`UserHome: Filtered ${activeAllocations.length} active allocations out of ${allocations.length} total`);
            
            // Import getVillageData to fetch actual record counts
            const { getVillageData } = await import('../../firebase/excelStorage');
            
            // Fetch actual record counts for each active allocation
            const allocationsWithRealCounts = await Promise.all(
              activeAllocations.map(async (allocation) => {
                try {
                  const villageDataResult = await getVillageData(
                    allocation.district,
                    allocation.city || allocation.village
                  );
                  const actualCount = villageDataResult.success ? (villageDataResult.data?.length || 0) : 0;
                  return {
                    ...allocation,
                    count: actualCount
                  };
                } catch (error) {
                  console.error(`Error fetching count for ${allocation.district} - ${allocation.city}:`, error);
                  return { ...allocation, count: 0 };
                }
              })
            );
            
            setAllocatedAreas(allocationsWithRealCounts);
            
            // Calculate total people count from actual records
            const total = allocationsWithRealCounts.reduce((sum, allocation) => sum + (allocation.count || 0), 0);
            setTotalPeople(total);
            console.log('UserHome: Loaded allocations:', allocationsWithRealCounts.length, 'Total people (actual):', total);
            
            // Debug each allocation
            allocationsWithRealCounts.forEach((allocation, index) => {
              console.log(`UserHome: Allocation ${index + 1}:`, {
                district: allocation.district,
                city: allocation.city,
                count: allocation.count,
                allocatedBy: allocation.allocatedBy,
                allocatedAt: allocation.allocatedAt
              });
            });
          } else {
            console.error('UserHome: Failed to load allocations:', result.error);
            setAllocatedAreas([]);
            setTotalPeople(0);
          }
        } catch (error) {
          console.error('Error loading allocations:', error);
          setAllocatedAreas([]);
          setTotalPeople(0);
        } finally {
          setLoading(false);
        }
      } else if (user && !user.id) {
        console.warn('User object exists but id is missing:', user);
        setLoading(false);
        setAllocatedAreas([]);
        setTotalPeople(0);
      }
    };

    loadAllocations();
  }, [user]);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading your allocated data...</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Welcome, {user?.displayName || user?.email}</h1>
        <p className="page-subtitle">Manage your allocated data and send messages</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Allocated Areas</span>
            <div className="stat-icon">📍</div>
          </div>
          <div className="stat-value">{allocatedAreas.length}</div>
          <div className="stat-description">
            {allocatedAreas.length > 0 ? 'Areas you can send messages to' : 'No areas allocated yet'}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Total People</span>
            <div className="stat-icon"><i className="fa-solid fa-users"></i></div>
          </div>
          <div className="stat-value">{totalPeople.toLocaleString()}</div>
          <div className="stat-description">People in your allocated areas</div>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <span className="stat-title">Messages Sent</span>
            <div className="stat-icon"><i className="fa-solid fa-paper-plane"></i></div>
          </div>
          <div className="stat-value">0</div>
          <div className="stat-description">Messages sent this month</div>
        </div>
      </div>

      {allocatedAreas.length > 0 ? (
        <div className="content-card">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => navigate('/user/messages')}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', padding: '15px 30px' }}
            >
              <i className="fa-solid fa-paper-plane"></i>
              Send Message
            </button>
          </div>
        </div>
      ) : (
        <div className="content-card">
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
            <h3 style={{ marginBottom: '10px', color: '#333' }}>No Data Allocated Yet</h3>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              You don't have any allocated data to send messages to.
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Please contact your administrator to get data allocated to your account.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

const MyAreas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allocatedAreas, setAllocatedAreas] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [paginatedAreas, setPaginatedAreas] = useState([]);

  useEffect(() => {
    const loadAllocations = async () => {
      if (user && user.id) {
        setLoading(true);
        try {
          console.log('MyAreas: Loading allocations for user:', user.id, 'User object:', user);
          const result = await getAllocationsByUserId(user.id);
          console.log('MyAreas: getAllocationsByUserId result:', result);
          
          if (result.success) {
            const allocations = result.data || [];
            
            // Get today's date for filtering
            const today = new Date().toISOString().split('T')[0];
            
            // Filter allocations by date range (only active allocations)
            const activeAllocations = allocations.filter(a => {
              if (a.startDate && a.endDate) {
                const isWithinDateRange = today >= a.startDate && today <= a.endDate;
                console.log(`📅 MyAreas: ${a.district} - ${a.city}: ${a.startDate} to ${a.endDate} = ${isWithinDateRange ? '✅ ACTIVE' : '❌ EXPIRED'}`);
                return isWithinDateRange;
              }
              // If no dates, include by default
              return true;
            });
            
            console.log(`MyAreas: Filtered ${activeAllocations.length} active allocations out of ${allocations.length} total`);
            
            // Import getVillageData to fetch actual record counts
            const { getVillageData } = await import('../../firebase/excelStorage');
            
            // Fetch actual record counts for each active allocation
            const allocationsWithRealCounts = await Promise.all(
              activeAllocations.map(async (allocation) => {
                try {
                  const villageDataResult = await getVillageData(
                    allocation.district,
                    allocation.city || allocation.village
                  );
                  const actualCount = villageDataResult.success ? (villageDataResult.data?.length || 0) : 0;
                  return {
                    ...allocation,
                    count: actualCount
                  };
                } catch (error) {
                  console.error(`Error fetching count for ${allocation.district} - ${allocation.city}:`, error);
                  return { ...allocation, count: 0 };
                }
              })
            );
            
            setAllocatedAreas(allocationsWithRealCounts);
            console.log('MyAreas: Loaded allocations:', allocationsWithRealCounts.length);
            console.log('MyAreas: Allocations data with actual counts:', allocationsWithRealCounts);
          } else {
            console.error('MyAreas: Failed to load allocations:', result.error);
            setAllocatedAreas([]);
          }
        } catch (error) {
          console.error('MyAreas: Error loading allocations:', error);
          setAllocatedAreas([]);
        } finally {
          setLoading(false);
        }
      } else if (user && !user.id) {
        console.warn('MyAreas: User object exists but id is missing:', user);
        setLoading(false);
        setAllocatedAreas([]);
      }
    };

    loadAllocations();
  }, [user]);
  
  // Handle pagination
  useEffect(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    setPaginatedAreas(allocatedAreas.slice(startIndex, endIndex));
  }, [allocatedAreas, currentPage, itemsPerPage]);
  
  const totalPages = Math.ceil(allocatedAreas.length / itemsPerPage);
  
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <div>Loading your allocated areas...</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">My Allocated Areas</h1>
        <p className="page-subtitle">Areas you can send messages to</p>
      </div>

      <div className="content-card">
        {allocatedAreas.length > 0 ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h3>Total Areas: {allocatedAreas.length}</h3>
                <p style={{ color: '#666', margin: '5px 0' }}>
                  Total People: {allocatedAreas.reduce((sum, area) => sum + (area.count || 0), 0).toLocaleString()}
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                onClick={() => navigate('/user/messages')}
                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <i className="fa-solid fa-paper-plane"></i>
                Send Message to All
              </button>
            </div>
            
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>District</th>
                    <th>Village</th>
                    <th>Allocated By</th>
                    <th>Allocated Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedAreas.map((area, index) => (
                    <tr key={area.id || index}>
                      <td>{((currentPage - 1) * itemsPerPage) + index + 1}</td>
                      <td><strong>{area.district}</strong></td>
                      <td>{area.city || 'All Villages'}</td>
                      <td>{area.allocatedBy || 'Admin'}</td>
                      <td>
                        {area.startDate || 'N/A'}
                      </td>
                      <td>
                        <button 
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate('/user/messages', { 
                            state: { 
                              preselectedLocation: {
                                district: area.district,
                                city: area.city
                              }
                            }
                          })}
                          style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <i className="fa-solid fa-paper-plane" style={{ fontSize: '12px' }}></i>
                          Send
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
                <button 
                  onClick={() => goToPage(currentPage - 1)} 
                  disabled={currentPage === 1}
                  className="pagination-btn"
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#f5f5f5' : 'white',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    color: currentPage === 1 ? '#aaa' : '#333'
                  }}
                >
                  <i className="fa-solid fa-chevron-left"></i> Previous
                </button>
                
                <div style={{ display: 'flex', gap: '5px' }}>
                  {currentPage > 2 && (
                    <button 
                      onClick={() => goToPage(1)} 
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      1
                    </button>
                  )}
                  
                  {currentPage > 3 && <span style={{ alignSelf: 'center' }}>...</span>}
                  
                  {currentPage > 1 && (
                    <button 
                      onClick={() => goToPage(currentPage - 1)} 
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {currentPage - 1}
                    </button>
                  )}
                  
                  <button 
                    style={{
                      width: '36px',
                      height: '36px',
                      border: '1px solid #2196f3',
                      borderRadius: '4px',
                      background: '#2196f3',
                      color: 'white',
                      fontWeight: 'bold'
                    }}
                  >
                    {currentPage}
                  </button>
                  
                  {currentPage < totalPages && (
                    <button 
                      onClick={() => goToPage(currentPage + 1)} 
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {currentPage + 1}
                    </button>
                  )}
                  
                  {currentPage < totalPages - 2 && <span style={{ alignSelf: 'center' }}>...</span>}
                  
                  {currentPage < totalPages - 1 && (
                    <button 
                      onClick={() => goToPage(totalPages)} 
                      style={{
                        width: '36px',
                        height: '36px',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        background: 'white'
                      }}
                    >
                      {totalPages}
                    </button>
                  )}
                </div>
                
                <button 
                  onClick={() => goToPage(currentPage + 1)} 
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ddd',
                    borderRadius: '4px',
                    background: currentPage === totalPages ? '#f5f5f5' : 'white',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    color: currentPage === totalPages ? '#aaa' : '#333'
                  }}
                >
                  Next <i className="fa-solid fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
            <h3 style={{ marginBottom: '10px', color: '#333' }}>No Areas Allocated Yet</h3>
            <p style={{ fontSize: '16px', marginBottom: '20px' }}>
              You don't have any allocated areas to send messages to.
            </p>
            <p style={{ fontSize: '14px', color: '#999' }}>
              Please contact your administrator to get area access.
            </p>
          </div>
        )}
      </div>
    </>
  );
};

export default UserDashboard;