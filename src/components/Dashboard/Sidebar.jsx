import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';

const Sidebar = ({ role }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileOpen(false);
  }, [location.pathname]);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isMobileOpen && !event.target.closest('.sidebar') && !event.target.closest('.mobile-menu-toggle')) {
        setIsMobileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobileOpen]);

  const getMenuItems = () => {
    const baseItems = [
      { path: '', label: 'Dashboard', icon: 'fa-solid fa-gauge-high' },
    ];

    if (role === 'main_admin') {
      return [
        ...baseItems,
        { path: 'hierarchical-view', label: 'Hierarchical View', icon: 'fa-solid fa-sitemap' },
        { path: 'create-user', label: 'Create User', icon: 'fa-solid fa-user-plus' },
        { path: 'users', label: 'All Users', icon: 'fa-solid fa-users' },
        { path: 'upload-district-data', label: 'Upload District Data', icon: 'fa-solid fa-upload' },
        { path: 'data-allocation', label: 'Data Allocation', icon: 'fa-solid fa-database' },
        { path: 'view-allocated-data', label: 'View Allocated Data', icon: 'fa-solid fa-chart-pie' },
        { path: 'messages', label: 'Send Messages', icon: 'fa-solid fa-paper-plane' },
        { path: 'message-history', label: 'Message History', icon: 'fa-solid fa-clock-rotate-left' },
        { path: 'activity-logs', label: 'Activity Logs', icon: 'fa-solid fa-list-check' },
        { path: 'profile', label: 'Profile', icon: 'fa-solid fa-user-circle' },
      ];
    }

    if (role === 'super_admin') {
      return [
        ...baseItems,
        { path: 'hierarchical-view', label: 'Hierarchical View', icon: 'fa-solid fa-sitemap' },
        { path: 'create-user', label: 'Create User', icon: 'fa-solid fa-user-plus' },
        { path: 'users', label: 'Manage Users', icon: 'fa-solid fa-users-gear' },
        { path: 'data-allocation', label: 'Data Allocation', icon: 'fa-solid fa-database' },
        { path: 'view-allocated-data', label: 'View Allocated Data', icon: 'fa-solid fa-chart-pie' },
        { path: 'messages', label: 'Send Messages', icon: 'fa-solid fa-paper-plane' },
        { path: 'message-history', label: 'Message History', icon: 'fa-solid fa-clock-rotate-left' },
        { path: 'activity-logs', label: 'Activity Logs', icon: 'fa-solid fa-list-check' },
        { path: 'profile', label: 'Profile', icon: 'fa-solid fa-user-circle' },
      ];
    }

    if (role === 'admin') {
      return [
        ...baseItems,
        { path: 'hierarchical-view', label: 'Hierarchical View', icon: 'fa-solid fa-sitemap' },
        { path: 'create-user', label: 'Create User', icon: 'fa-solid fa-user-plus' },
        { path: 'users', label: 'View Users', icon: 'fa-solid fa-users' },
        { path: 'data-allocation', label: 'Data Allocation', icon: 'fa-solid fa-database' },
        { path: 'view-allocated-data', label: 'View Allocated Data', icon: 'fa-solid fa-chart-pie' },
        { path: 'messages', label: 'Send Messages', icon: 'fa-solid fa-paper-plane' },
        { path: 'message-history', label: 'Message History', icon: 'fa-solid fa-clock-rotate-left' },
        { path: 'activity-logs', label: 'Activity Logs', icon: 'fa-solid fa-list-check' },
        { path: 'profile', label: 'Profile', icon: 'fa-solid fa-user-circle' },
      ];
    }

    // For main_admin, don't show 'My Allocated Areas' tab
    if (role === 'main_admin') {
      return [
        ...baseItems,
        { path: 'messages', label: 'Send Messages', icon: 'fa-solid fa-paper-plane' },
        { path: 'message-history', label: 'Message History', icon: 'fa-solid fa-clock-rotate-left' },
        { path: 'activity-logs', label: 'Activity Logs', icon: 'fa-solid fa-list-check' },
        { path: 'profile', label: 'Profile', icon: 'fa-solid fa-user-circle' },
      ];
    }
    
    // For other roles, show the tab
    return [
      ...baseItems,
      { path: 'my-areas', label: 'My Allocated Areas', icon: 'fa-solid fa-map-location-dot' },
      { path: 'messages', label: 'Send Messages', icon: 'fa-solid fa-paper-plane' },
      { path: 'message-history', label: 'Message History', icon: 'fa-solid fa-clock-rotate-left' },
      { path: 'activity-logs', label: 'Activity Logs', icon: 'fa-solid fa-list-check' },
      { path: 'profile', label: 'Profile', icon: 'fa-solid fa-user-circle' },
    ];
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = getMenuItems();
  const basePath = `/${role.replace('_', '-')}`;

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle mobile menu"
      >
        <i className={`fa-solid ${isMobileOpen ? 'fa-times' : 'fa-bars'}`}></i>
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-overlay ${isMobileOpen ? 'active' : ''}`}
        onClick={() => setIsMobileOpen(false)}
      ></div>

      {/* Sidebar */}
      <div className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">Messaging-System</div>
          <div className="sidebar-role">{user?.role.replace('_', ' ').toUpperCase()}</div>
          <div style={{ fontSize: '14px', marginTop: '5px', opacity: 0.9, fontWeight: '500' }}>{user?.name}</div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const fullPath = `${basePath}/${item.path}`;
            const isActive = location.pathname === fullPath || 
                            (item.path === '' && location.pathname === basePath);
            
            return (
              <Link
                key={item.path}
                to={fullPath}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => setIsMobileOpen(false)}
              >
                <i className={`nav-icon ${item.icon}`}></i>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <button onClick={handleLogout} className="logout-btn">
          <i className="fa-solid fa-right-from-bracket"></i> Logout
        </button>
      </div>
    </>
  );
};

export default Sidebar;