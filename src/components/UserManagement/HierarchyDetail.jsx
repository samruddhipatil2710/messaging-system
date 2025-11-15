import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import './HierarchicalView.css';

const HierarchyDetail = () => {
  const { id, type } = useParams(); // id = user id, type = 'super-admin' or 'admin'
  const navigate = useNavigate();
  const [detailData, setDetailData] = useState(null);
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    loadDetailData();
  }, [id, type]);

  const loadDetailData = async () => {
    try {
      const { getAllUsers, getAllActivityLogs, getAllMessages } = await import('../../firebase/firestore');
      
      // Fetch all data from Firebase
      const [usersResult, logsResult, messagesResult] = await Promise.all([
        getAllUsers(),
        getAllActivityLogs(),
        getAllMessages()
      ]);
      
      if (!usersResult.success) {
        console.error('Failed to load users:', usersResult.error);
        return;
      }
      
      const allUsers = usersResult.data;
      const activityLogs = logsResult.success ? logsResult.data : [];
      const allMessages = messagesResult.success ? messagesResult.data : [];
      
      // Find the main user by ID (Firebase document ID)
      const mainUser = allUsers.find(u => u.id === id);
      
      if (!mainUser) {
        console.error('User not found with ID:', id);
        return;
      }

      if (type === 'super-admin') {
        // Get all admins created by this super admin
        const admins = allUsers.filter(u => 
          u.role === 'admin' && u.createdBy === mainUser.email
        );
        
        // For each admin, get their users
        const adminsWithUsers = admins.map(admin => {
          const users = allUsers.filter(u => 
            u.role === 'user' && u.createdBy === admin.email
          );
          
          const adminActivity = activityLogs.filter(log => 
            log.performedBy === admin.email
          );
          
          return {
            ...admin,
            users: users,
            activityCount: adminActivity.length,
            activities: adminActivity
          };
        });
        
        const superAdminActivity = activityLogs.filter(log => 
          log.performedBy === mainUser.email
        );
        
        setDetailData({
          ...mainUser,
          admins: adminsWithUsers,
          activities: superAdminActivity
        });
      } else if (type === 'admin') {
        // Get all users created by this admin
        const users = allUsers.filter(u => 
          u.role === 'user' && u.createdBy === mainUser.email
        );
        
        const adminActivity = activityLogs.filter(log => 
          log.performedBy === mainUser.email
        );
        
        setDetailData({
          ...mainUser,
          users: users,
          activities: adminActivity
        });
      } else if (type === 'user') {
        // Get messages sent by this user
        const userMessages = allMessages.filter(m => m.sentBy === mainUser.email);
        
        setDetailData({
          ...mainUser,
          messages: userMessages
        });
      }
    } catch (error) {
      console.error('Error loading detail data:', error);
    }
  };

  const toggleItem = (itemId) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const getStatusBadge = (status) => {
    return status === 'Active' ? 
      <span className="status-badge active">Active</span> : 
      <span className="status-badge inactive">Inactive</span>;
  };

  if (!detailData) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <div className="page-header">
        <button className="btn btn-secondary" onClick={() => navigate(-1)} style={{ marginBottom: '10px' }}>
          <i className="fa-solid fa-arrow-left"></i> Back
        </button>
        <h1 className="page-title">{detailData.name}</h1>
        <p className="page-subtitle">
          {detailData.role.replace('_', ' ').toUpperCase()} - {detailData.email}
        </p>
      </div>

      <div className="content-card">
        {/* User Info Card */}
        <div style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 10px 0' }}>{detailData.name}</h3>
          <p style={{ margin: '5px 0' }}>📧 {detailData.email}</p>
          <p style={{ margin: '5px 0' }}>📱 {detailData.phone || detailData.mobile}</p>
          <p style={{ margin: '5px 0' }}>
            Status: {getStatusBadge(detailData.status)}
          </p>
        </div>

        {/* Show Admins if Super Admin */}
        {type === 'super-admin' && detailData.admins && (
          <div className="hierarchy-table-container">
            <h3 style={{ marginBottom: '15px' }}>Admins ({detailData.admins.length})</h3>
            <table className="hierarchy-table">
              <thead>
                <tr>
                  <th>SR. NO</th>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>USERS</th>
                  <th>STATUS</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {detailData.admins.map((admin, index) => (
                  <>
                    <tr key={admin.id} className="admin-row">
                      <td>{index + 1}</td>
                      <td>
                        <strong>{admin.name}</strong>
                        <br />
                        <small style={{ color: '#666' }}>Admin</small>
                      </td>
                      <td>{admin.email}</td>
                      <td>{admin.users.length}</td>
                      <td>{getStatusBadge(admin.status)}</td>
                      <td>
                        <button 
                          className="btn-preview"
                          onClick={() => {
                            // Navigate to Users page for this Admin
                            const basePath = window.location.pathname.includes('/main-admin') 
                              ? '/main-admin' 
                              : '/super-admin';
                            navigate(`${basePath}/hierarchy-detail/admin/${admin.id}`);
                          }}
                          title="View Users"
                          style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <i className="fa-solid fa-users"></i> View Users
                        </button>
                      </td>
                    </tr>
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Show Users if Admin */}
        {type === 'admin' && detailData.users && (
          <div className="hierarchy-table-container">
            <h3 style={{ marginBottom: '15px' }}>Users ({detailData.users.length})</h3>
            {detailData.users.length > 0 ? (
              <table className="hierarchy-table">
                <thead>
                  <tr>
                    <th>SR. NO</th>
                    <th>NAME</th>
                    <th>EMAIL</th>
                    <th>PHONE</th>
                    <th>STATUS</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {detailData.users.map((user, index) => (
                    <tr key={user.id} className="user-row" style={{ cursor: 'pointer' }}>
                      <td>{index + 1}</td>
                      <td><strong>{user.name}</strong></td>
                      <td>{user.email}</td>
                      <td>{user.phone || user.mobile}</td>
                      <td>{getStatusBadge(user.status)}</td>
                      <td>
                        <button 
                          className="btn-preview"
                          onClick={() => {
                            // Navigate to User Messages page
                            const basePath = window.location.pathname.includes('/main-admin') 
                              ? '/main-admin' 
                              : window.location.pathname.includes('/super-admin')
                              ? '/super-admin'
                              : '/admin';
                            navigate(`${basePath}/hierarchy-detail/user/${user.id}`);
                          }}
                          title="View Messages"
                          style={{
                            background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
                            color: 'white',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            whiteSpace: 'nowrap',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: '14px',
                            fontWeight: '500'
                          }}
                        >
                          <i className="fa-solid fa-eye"></i> View Messages
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                <i className="fa-solid fa-users" style={{ fontSize: '48px', marginBottom: '20px' }}></i>
                <p>No users created yet</p>
              </div>
            )}
          </div>
        )}

        {/* Show User Messages if type is 'user' */}
        {type === 'user' && detailData && (
          <>
            <div className="hierarchy-table-container" style={{ marginBottom: '20px' }}>
              <h3 style={{ marginBottom: '15px' }}>User Details</h3>
              <table className="hierarchy-table">
                <thead>
                  <tr>
                    <th>FIELD</th>
                    <th>VALUE</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Name</strong></td>
                    <td>{detailData.name}</td>
                  </tr>
                  <tr>
                    <td><strong>Email</strong></td>
                    <td>{detailData.email}</td>
                  </tr>
                  <tr>
                    <td><strong>Phone</strong></td>
                    <td>{detailData.phone || detailData.mobile || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td><strong>Status</strong></td>
                    <td>{getStatusBadge(detailData.status)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Messages Section */}
            <div className="hierarchy-table-container">
              <h3 style={{ marginBottom: '15px' }}>
                Messages Sent by {detailData.name} ({detailData.messages ? detailData.messages.length : 0})
              </h3>
              {detailData.messages && detailData.messages.length > 0 ? (
                <table className="hierarchy-table">
                  <thead>
                    <tr>
                      <th>SR. NO</th>
                      <th>DATE & TIME</th>
                      <th>TYPE</th>
                      <th>AREA</th>
                      <th>RECIPIENTS</th>
                      <th>MESSAGE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailData.messages.map((msg, index) => {
                      const msgDate = new Date(msg.timestamp);
                      const formattedDate = msgDate.toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      
                      return (
                        <tr key={msg.id || index} className="user-row">
                          <td>{index + 1}</td>
                          <td>{formattedDate}</td>
                          <td>
                            {msg.type === 'whatsapp' ? (
                              <span style={{ color: '#25D366' }}>
                                <i className="fa-brands fa-whatsapp"></i> WhatsApp
                              </span>
                            ) : msg.type === 'text' ? (
                              <span style={{ color: '#2563eb' }}>
                                <i className="fa-solid fa-message"></i> SMS
                              </span>
                            ) : (
                              <span style={{ color: '#059669' }}>
                                <i className="fa-solid fa-phone-volume"></i> Voice
                              </span>
                            )}
                          </td>
                          <td>{msg.area}</td>
                          <td>{msg.recipientCount || 0}</td>
                          <td style={{ maxWidth: '300px', wordWrap: 'break-word' }}>{msg.message}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
                  <i className="fa-solid fa-inbox" style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.3 }}></i>
                  <p>No messages sent by this user yet</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Activities Section */}
        {detailData.activities && detailData.activities.length > 0 && (
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ marginBottom: '15px' }}>Recent Activities</h3>
            <div className="activity-section">
              <ul className="activity-list">
                {detailData.activities.map((activity, idx) => (
                  <li key={idx}>
                    <i className="fa-solid fa-circle-dot"></i>
                    {activity.details}
                    <small> - {new Date(activity.timestamp).toLocaleString()}</small>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HierarchyDetail;
