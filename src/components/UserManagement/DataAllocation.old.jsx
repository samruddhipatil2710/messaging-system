import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import '../Dashboard/DashBoard.css';

const DataAllocation = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [allocations, setAllocations] = useState({});
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedLocations, setSelectedLocations] = useState([]);
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Maharashtra districts with talukas and cities
  const maharashtraData = {
    'Mumbai': {
      talukas: {
        'Mumbai City': ['Colaba', 'Fort', 'Marine Lines', 'Churchgate', 'Dadar', 'Parel'],
        'Mumbai Suburban': ['Andheri', 'Borivali', 'Malad', 'Goregaon', 'Bandra', 'Kurla']
      }
    },
    'Pune': {
      talukas: {
        'Pune City': ['Shivajinagar', 'Koregaon Park', 'Deccan', 'Kothrud', 'Aundh'],
        'Pimpri-Chinchwad': ['Pimpri', 'Chinchwad', 'Akurdi'],
        'Haveli': ['Kharadi', 'Wagholi', 'Hadapsar']
      }
    },
    'Nashik': {
      talukas: {
        'Nashik City': ['Nasik Road', 'Panchavati', 'College Road', 'Satpur'],
        'Igatpuri': ['Igatpuri', 'Kasara'],
        'Dindori': ['Dindori', 'Peth']
      }
    },
    'Nagpur': {
      talukas: {
        'Nagpur City': ['Sitabuldi', 'Dharampeth', 'Civil Lines', 'Sadar'],
        'Kamptee': ['Kamptee', 'Kalmeshwar'],
        'Hingna': ['Hingna', 'Parseoni']
      }
    },
    'Thane': {
      talukas: {
        'Thane City': ['Kopri', 'Kolshet', 'Mira Road', 'Bhayander'],
        'Kalyan': ['Kalyan West', 'Kalyan East', 'Dombivli'],
        'Ulhasnagar': ['Ulhasnagar 1', 'Ulhasnagar 2', 'Ulhasnagar 3']
      }
    },
    'Aurangabad': {
      talukas: {
        'Aurangabad City': ['Kranti Chowk', 'CIDCO', 'Cantonment'],
        'Paithan': ['Paithan', 'Gangapur']
      }
    },
    'Solapur': {
      talukas: {
        'Solapur City': ['North Solapur', 'South Solapur'],
        'Pandharpur': ['Pandharpur', 'Malshiras']
      }
    },
    'Kolhapur': {
      talukas: {
        'Kolhapur City': ['Shahupuri', 'Rajarampuri', 'Tarabai Park'],
        'Ichalkaranji': ['Ichalkaranji', 'Hatkanangle']
      }
    }
  };

  // Load users and allocations from localStorage
  useEffect(() => {
    const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
    const savedAllocations = JSON.parse(localStorage.getItem('dataAllocations') || '{}');
    
    // Filter users based on current user's role
    let filteredUsers = [];
    if (user.role === 'main_admin') {
      filteredUsers = allUsers.filter(u => 
        u.role === 'super_admin' || u.role === 'admin' || u.role === 'user'
      );
    } else if (user.role === 'super_admin') {
      filteredUsers = allUsers.filter(u => 
        (u.role === 'admin' || u.role === 'user') && u.createdBy === user.email
      );
    } else if (user.role === 'admin') {
      filteredUsers = allUsers.filter(u => 
        u.role === 'user' && u.createdBy === user.email
      );
    }
    
    setUsers(filteredUsers);
    setAllocations(savedAllocations);
  }, [user]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownOpen && !event.target.closest('.user-dropdown-container')) {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userDropdownOpen]);

  const handleUserSelect = (userId) => {
    const scrollY = window.scrollY;
    
    const selectedUser = users.find(u => u.id === parseInt(userId));
    setSelectedUser(selectedUser);
    setSelectedDistrict('');
    setSelectedLocations([]);
    setLocationSearchTerm('');
    setLocationDropdownOpen(false);
    setStartDate('');
    setEndDate('');
    
    if (selectedUser) {
      setUserSearchTerm('');
    }
    
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 0);
  };

  const handleDistrictChange = (district) => {
    setSelectedDistrict(district);
    setSelectedLocations([]);
    setLocationSearchTerm('');
  };

  const toggleLocation = (location) => {
    setSelectedLocations(prev => 
      prev.includes(location) 
        ? prev.filter(l => l !== location)
        : [...prev, location]
    );
  };

  // Get all locations (talukas and cities) for selected district
  const getLocationsForDistrict = () => {
    if (!selectedDistrict || !maharashtraData[selectedDistrict]) return [];
    
    const locations = [];
    const talukas = maharashtraData[selectedDistrict].talukas;
    
    Object.keys(talukas).forEach(taluka => {
      // Add taluka
      locations.push({ type: 'taluka', name: taluka });
      // Add cities under this taluka
      talukas[taluka].forEach(city => {
        locations.push({ type: 'city', name: city, taluka: taluka });
      });
    });
    
    return locations;
  };

  // Filter locations based on search term
  const filteredLocations = getLocationsForDistrict().filter(location =>
    location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
  );

  const addAllocation = () => {
    if (!selectedUser || !selectedDistrict || selectedLocations.length === 0) return;

    const scrollY = window.scrollY;
    const userAllocations = allocations[selectedUser.id] || [];
    const newAllocations = [];

    // Create allocations for selected locations
    selectedLocations.forEach(location => {
      newAllocations.push({ 
        district: selectedDistrict,
        location: location.name,
        type: location.type,
        taluka: location.taluka || location.name,
        startDate: startDate || 'N/A',
        endDate: endDate || 'N/A'
      });
    });

    // Filter out duplicates
    const filtered = newAllocations.filter(newAlloc => {
      const key = `${newAlloc.district}-${newAlloc.location}`;
      return !userAllocations.some(a => `${a.district}-${a.location}` === key);
    });

    if (filtered.length > 0) {
      const updatedAllocations = {
        ...allocations,
        [selectedUser.id]: [...userAllocations, ...filtered]
      };
      setAllocations(updatedAllocations);
      localStorage.setItem('dataAllocations', JSON.stringify(updatedAllocations));
    }

    setSelectedLocations([]);
    setLocationSearchTerm('');
    setStartDate('');
    setEndDate('');
    
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 0);
  };

  const removeAllocation = (userId, index) => {
    // Save current scroll position
    const scrollY = window.scrollY;
    
    const userAllocations = allocations[userId] || [];
    const updatedUserAllocations = userAllocations.filter((_, i) => i !== index);
    
    const updatedAllocations = {
      ...allocations,
      [userId]: updatedUserAllocations
    };
    
    setAllocations(updatedAllocations);
    localStorage.setItem('dataAllocations', JSON.stringify(updatedAllocations));
    
    // Restore scroll position after state update
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 0);
  };

  // Get all talukas from selected districts
  const availableTalukas = selectedDistricts.length > 0
    ? selectedDistricts.flatMap(district => 
        maharashtraData[district] ? Object.keys(maharashtraData[district].talukas) : []
      )
    : [];

  // Get all cities from selected districts and talukas
  const availableCities = selectedDistricts.length > 0 && selectedTalukas.length > 0
    ? selectedDistricts.flatMap(district => 
        selectedTalukas.flatMap(taluka =>
          maharashtraData[district]?.talukas[taluka] || []
        )
      )
    : [];

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Data Allocation</h1>
        <p className="page-subtitle">Assign districts, talukas, and cities to users</p>
      </div>

      <div className="content-card">
        <h2 className="card-title">Select User</h2>
        
        <div className="form-group user-dropdown-container" style={{ position: 'relative', zIndex: userDropdownOpen ? 1000 : 1 }}>
          <label className="form-label">
            Search and Select User
            {userSearchTerm && (
              <span style={{ 
                marginLeft: '10px', 
                fontSize: '12px', 
                color: '#667eea',
                fontWeight: 'normal'
              }}>
                ({users.filter(u => {
                  const searchLower = userSearchTerm.toLowerCase();
                  return u.name.toLowerCase().includes(searchLower) ||
                         u.email.toLowerCase().includes(searchLower) ||
                         u.role.toLowerCase().includes(searchLower);
                }).length} found)
              </span>
            )}
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search by name, email, or role..."
              value={userSearchTerm}
              onChange={(e) => {
                setUserSearchTerm(e.target.value);
                setUserDropdownOpen(true);
              }}
              onFocus={() => setUserDropdownOpen(true)}
              style={{
                padding: '12px 16px',
                paddingRight: '40px',
                fontSize: '14px',
                border: userDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db',
                borderRadius: '8px',
                width: '100%',
                transition: 'all 0.2s',
                boxShadow: userDropdownOpen ? '0 4px 12px rgba(102, 126, 234, 0.15)' : 'none'
              }}
            />
            <button
              onClick={() => {
                setUserSearchTerm('');
                setUserDropdownOpen(false);
              }}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#9ca3af',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => e.target.style.color = '#667eea'}
              onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
              title="Clear search"
            >
              <i className={userSearchTerm ? "fa-solid fa-times-circle" : "fa-solid fa-chevron-down"}></i>
            </button>

            {/* Custom Dropdown List */}
            {userDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: '8px',
                background: 'white',
                border: '2px solid #667eea',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto',
                boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2)',
                zIndex: 1000
              }}>
                {selectedUser && (
                  <div
                    onClick={() => {
                      setSelectedUser(null);
                      setUserSearchTerm('');
                      setUserDropdownOpen(false);
                    }}
                    style={{
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: '#f9fafb',
                      borderBottom: '2px solid #e5e7eb',
                      color: '#dc2626',
                      fontWeight: '500',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = '#fee2e2'}
                    onMouseLeave={(e) => e.currentTarget.style.background = '#f9fafb'}
                  >
                    <i className="fa-solid fa-times-circle"></i> Clear Selection
                  </div>
                )}
                
                {users
                  .filter(u => {
                    if (!userSearchTerm) return true;
                    const searchLower = userSearchTerm.toLowerCase();
                    return u.name.toLowerCase().includes(searchLower) ||
                           u.email.toLowerCase().includes(searchLower) ||
                           u.role.toLowerCase().includes(searchLower);
                  })
                  .map(u => (
                    <div
                      key={u.id}
                      onClick={() => {
                        handleUserSelect(u.id.toString());
                        setUserDropdownOpen(false);
                      }}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f3f4f6',
                        background: selectedUser?.id === u.id ? '#eff6ff' : 'white',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (selectedUser?.id !== u.id) {
                          e.currentTarget.style.background = '#f9fafb';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedUser?.id !== u.id) {
                          e.currentTarget.style.background = 'white';
                        }
                      }}
                    >
                      <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                        {u.name}
                        {selectedUser?.id === u.id && (
                          <i className="fa-solid fa-check-circle" style={{ color: '#667eea', marginLeft: '8px' }}></i>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {u.email} • <span style={{ 
                          padding: '2px 8px', 
                          background: '#e0e7ff', 
                          borderRadius: '4px',
                          color: '#4338ca',
                          fontWeight: '500'
                        }}>
                          {u.role.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>
                  ))}
                
                {users.filter(u => {
                  if (!userSearchTerm) return true;
                  const searchLower = userSearchTerm.toLowerCase();
                  return u.name.toLowerCase().includes(searchLower) ||
                         u.email.toLowerCase().includes(searchLower) ||
                         u.role.toLowerCase().includes(searchLower);
                }).length === 0 && (
                  <div style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#9ca3af',
                    fontSize: '14px'
                  }}>
                    <i className="fa-solid fa-search" style={{ fontSize: '24px', marginBottom: '10px', display: 'block' }}></i>
                    No users found matching "{userSearchTerm}"
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Selected User Display */}
          {selectedUser && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              background: '#eff6ff',
              border: '2px solid #667eea',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: '600', color: '#1e40af' }}>
                  <i className="fa-solid fa-user-check"></i> {selectedUser.name}
                </div>
                <div style={{ fontSize: '12px', color: '#4338ca', marginTop: '2px' }}>
                  {selectedUser.email} • {selectedUser.role.replace('_', ' ').toUpperCase()}
                </div>
              </div>
              <button
                onClick={() => {
                  setSelectedUser(null);
                  setUserSearchTerm('');
                }}
                style={{
                  background: '#dc2626',
                  color: 'white',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                onMouseLeave={(e) => e.target.style.background = '#dc2626'}
              >
                <i className="fa-solid fa-times"></i> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {selectedUser && (
        <>
          <div className="content-card" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
            <h2 className="card-title">Add New Allocation for {selectedUser.name}</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '15px' }}>
              Select a district, then choose villages and cities from the list below
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', position: 'relative' }}>
              {/* District Selection Dropdown */}
              <div className="form-group">
                <label className="form-label">Select District *</label>
                <div 
                  onClick={() => {
                    setDistrictDropdownOpen(!districtDropdownOpen);
                    setTalukaDropdownOpen(false);
                    setCityDropdownOpen(false);
                  }}
                  style={{ 
                    border: districtDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db', 
                    borderRadius: '8px', 
                    padding: '12px 16px',
                    background: 'white',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s',
                    boxShadow: districtDropdownOpen ? '0 4px 12px rgba(102, 126, 234, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span style={{ 
                    color: selectedDistricts.length === 0 ? '#9ca3af' : '#1f2937',
                    fontWeight: selectedDistricts.length > 0 ? '500' : '400',
                    fontSize: '14px'
                  }}>
                    {selectedDistricts.length === 0 
                      ? '🏙️ Select Districts...' 
                      : `✅ ${selectedDistricts.length} district${selectedDistricts.length > 1 ? 's' : ''} selected`
                    }
                  </span>
                  <i 
                    className={`fa-solid fa-chevron-${districtDropdownOpen ? 'up' : 'down'}`}
                    style={{ 
                      color: districtDropdownOpen ? '#667eea' : '#6b7280',
                      transition: 'transform 0.2s'
                    }}
                  ></i>
                </div>
                
                {districtDropdownOpen && (
                  <div style={{ 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    border: '2px solid #667eea', 
                    borderRadius: '8px', 
                    padding: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    background: 'white',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1)',
                    animation: 'slideDown 0.2s ease-out'
                  }}>
                    {Object.keys(maharashtraData).map(district => (
                      <label key={district} style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        marginBottom: '4px',
                        fontSize: '14px',
                        fontWeight: selectedDistricts.includes(district) ? '500' : '400'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedDistricts.includes(district)}
                          onChange={() => toggleDistrict(district)}
                          style={{ 
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#667eea'
                          }}
                        />
                        <span style={{ 
                          color: selectedDistricts.includes(district) ? '#667eea' : '#374151'
                        }}>
                          {district}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Talukas Multi-Select Dropdown */}
              <div className="form-group" style={{ position: 'relative', zIndex: talukaDropdownOpen ? 1000 : 1 }}>
                <label className="form-label">Talukas ({selectedTalukas.length} selected) - Optional</label>
                <div 
                  onClick={() => {
                    if (selectedDistricts.length > 0) {
                      setTalukaDropdownOpen(!talukaDropdownOpen);
                      setDistrictDropdownOpen(false);
                      setCityDropdownOpen(false);
                    }
                  }}
                  style={{ 
                    border: talukaDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db',
                    borderRadius: '8px', 
                    padding: '12px 16px',
                    background: selectedDistricts.length === 0 ? '#f9fafb' : 'white',
                    cursor: selectedDistricts.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: selectedDistricts.length === 0 ? 0.6 : 1,
                    transition: 'all 0.2s',
                    boxShadow: talukaDropdownOpen ? '0 4px 12px rgba(102, 126, 234, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span style={{ 
                    color: selectedDistricts.length === 0 || selectedTalukas.length === 0 ? '#9ca3af' : '#1f2937',
                    fontWeight: selectedTalukas.length > 0 ? '500' : '400',
                    fontSize: '14px'
                  }}>
                    {selectedDistricts.length === 0 
                      ? '🏘️ Select districts first...'
                      : selectedTalukas.length === 0 
                      ? '🏘️ Select Talukas...' 
                      : `✅ ${selectedTalukas.length} taluka${selectedTalukas.length > 1 ? 's' : ''} selected`
                    }
                  </span>
                  {selectedDistricts.length > 0 && (
                    <i 
                      className={`fa-solid fa-chevron-${talukaDropdownOpen ? 'up' : 'down'}`}
                      style={{ 
                        color: talukaDropdownOpen ? '#667eea' : '#6b7280',
                        transition: 'transform 0.2s'
                      }}
                    ></i>
                  )}
                </div>
                
                {talukaDropdownOpen && availableTalukas.length > 0 && (
                  <div style={{ 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    border: '2px solid #667eea', 
                    borderRadius: '8px', 
                    padding: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    background: 'white',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1)',
                    animation: 'slideDown 0.2s ease-out'
                  }}>
                    {[...new Set(availableTalukas)].map(taluka => (
                      <label key={taluka} style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        marginBottom: '4px',
                        fontSize: '14px',
                        fontWeight: selectedTalukas.includes(taluka) ? '500' : '400'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTalukas.includes(taluka)}
                          onChange={() => toggleTaluka(taluka)}
                          style={{ 
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#667eea'
                          }}
                        />
                        <span style={{ 
                          color: selectedTalukas.includes(taluka) ? '#667eea' : '#374151'
                        }}>
                          {taluka}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Cities Multi-Select Dropdown */}
              <div className="form-group" style={{ position: 'relative', zIndex: cityDropdownOpen ? 1000 : 1 }}>
                <label className="form-label">Cities ({selectedCities.length} selected) - Optional</label>
                <div 
                  onClick={() => {
                    if (selectedTalukas.length > 0) {
                      setCityDropdownOpen(!cityDropdownOpen);
                      setDistrictDropdownOpen(false);
                      setTalukaDropdownOpen(false);
                    }
                  }}
                  style={{ 
                    border: cityDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db',
                    borderRadius: '8px', 
                    padding: '12px 16px',
                    background: selectedTalukas.length === 0 ? '#f9fafb' : 'white',
                    cursor: selectedTalukas.length === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: selectedTalukas.length === 0 ? 0.6 : 1,
                    transition: 'all 0.2s',
                    boxShadow: cityDropdownOpen ? '0 4px 12px rgba(102, 126, 234, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <span style={{ 
                    color: selectedTalukas.length === 0 || selectedCities.length === 0 ? '#9ca3af' : '#1f2937',
                    fontWeight: selectedCities.length > 0 ? '500' : '400',
                    fontSize: '14px'
                  }}>
                    {selectedTalukas.length === 0 
                      ? '🏭 Select talukas first...'
                      : selectedCities.length === 0 
                      ? '🏭 Select Cities...' 
                      : `✅ ${selectedCities.length} ${selectedCities.length > 1 ? 'cities' : 'city'} selected`
                    }
                  </span>
                  {selectedTalukas.length > 0 && (
                    <i 
                      className={`fa-solid fa-chevron-${cityDropdownOpen ? 'up' : 'down'}`}
                      style={{ 
                        color: cityDropdownOpen ? '#667eea' : '#6b7280',
                        transition: 'transform 0.2s'
                      }}
                    ></i>
                  )}
                </div>
                
                {cityDropdownOpen && availableCities.length > 0 && (
                  <div style={{ 
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    border: '2px solid #667eea', 
                    borderRadius: '8px', 
                    padding: '8px',
                    maxHeight: '250px',
                    overflowY: 'auto',
                    background: 'white',
                    boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2), 0 4px 10px rgba(0, 0, 0, 0.1)',
                    animation: 'slideDown 0.2s ease-out'
                  }}>
                    {[...new Set(availableCities)].map(city => (
                      <label key={city} style={{ 
                        display: 'flex',
                        alignItems: 'center',
                        padding: '10px 12px',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        transition: 'all 0.2s',
                        marginBottom: '4px',
                        fontSize: '14px',
                        fontWeight: selectedCities.includes(city) ? '500' : '400'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#eff6ff';
                        e.currentTarget.style.transform = 'translateX(4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.transform = 'translateX(0)';
                      }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedCities.includes(city)}
                          onChange={() => toggleCity(city)}
                          style={{ 
                            marginRight: '12px',
                            width: '18px',
                            height: '18px',
                            cursor: 'pointer',
                            accentColor: '#667eea'
                          }}
                        />
                        <span style={{ 
                          color: selectedCities.includes(city) ? '#667eea' : '#374151'
                        }}>
                          {city}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Date Fields */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    width: '100%',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">End Date *</label>
                <input
                  type="date"
                  className="form-control"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{
                    border: '2px solid #d1d5db',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    width: '100%',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#667eea'}
                  onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                />
              </div>
            </div>

            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  const scrollY = window.scrollY;
                  setSelectedDistricts([]);
                  setSelectedTalukas([]);
                  setSelectedCities([]);
                  setDistrictDropdownOpen(false);
                  setTalukaDropdownOpen(false);
                  setCityDropdownOpen(false);
                  setStartDate('');
                  setEndDate('');
                  setTimeout(() => window.scrollTo(0, scrollY), 0);
                }}
              >
                Clear All
              </button>
              <button 
                className="btn btn-primary" 
                onClick={addAllocation}
                disabled={selectedDistricts.length === 0}
              >
                <i className="fa-solid fa-plus" style={{ color: 'white', marginRight: '8px' }}></i>
                Add Allocation ({selectedDistricts.length} district{selectedDistricts.length !== 1 ? 's' : ''})
              </button>
            </div>
          </div>

          <div className="content-card">
            <h2 className="card-title">Current Allocations for {selectedUser.name}</h2>
            {allocations[selectedUser.id] && allocations[selectedUser.id].length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>DISTRICT</th>
                      <th>TALUKA</th>
                      <th>CITY</th>
                      <th>START DATE</th>
                      <th>END DATE</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations[selectedUser.id].map((allocation, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{allocation.district}</td>
                        <td>{allocation.taluka}</td>
                        <td>{allocation.city}</td>
                        <td>{allocation.startDate || 'N/A'}</td>
                        <td>{allocation.endDate || 'N/A'}</td>
                        <td>
                          <button 
                            className="btn-icon btn-delete"
                            onClick={() => removeAllocation(selectedUser.id, index)}
                            title="Remove"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
                No data allocated yet. Add allocations above.
              </p>
            )}
          </div>
        </>
      )}

      {users.length === 0 && (
        <div className="content-card">
          <p style={{ color: '#666', textAlign: 'center', padding: '20px' }}>
            No users available. Create users first to allocate data.
          </p>
        </div>
      )}
    </>
  );
};

export default DataAllocation;