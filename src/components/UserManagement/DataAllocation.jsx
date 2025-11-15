import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../Context/AuthContext';
import { collection, doc, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config';
import * as XLSX from 'xlsx';
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
  const [districtSearchTerm, setDistrictSearchTerm] = useState('');
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const fileInputRef = useRef(null);

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
    setDistrictSearchTerm('');
    setDistrictDropdownOpen(false);
  };

  // Filter districts based on search term
  const filteredDistricts = Object.keys(maharashtraData).filter(district =>
    district.toLowerCase().includes(districtSearchTerm.toLowerCase())
  );

  const toggleLocation = (location) => {
    setSelectedLocations(prev => {
      const exists = prev.find(l => l.name === location.name);
      if (exists) {
        return prev.filter(l => l.name !== location.name);
      } else {
        return [...prev, location];
      }
    });
  };

  // Get all cities/villages for selected district (no talukas)
  const getLocationsForDistrict = () => {
    if (!selectedDistrict || !maharashtraData[selectedDistrict]) return [];
    
    const locations = [];
    const talukas = maharashtraData[selectedDistrict].talukas;
    
    Object.keys(talukas).forEach(taluka => {
      // Add only cities under this taluka (no taluka itself)
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

  const addAllocation = async () => {
    if (!selectedUser || !selectedDistrict || selectedLocations.length === 0) return;

    // Validate dates
    if (!startDate || !endDate) {
      alert('Please select both start date and end date!');
      return;
    }

    // Validate date range
    if (new Date(startDate) > new Date(endDate)) {
      alert('Start date cannot be after end date!');
      return;
    }

    const scrollY = window.scrollY;
    const userAllocations = allocations[selectedUser.id] || [];
    const newAllocations = [];

    // Create allocations for selected locations
    selectedLocations.forEach(location => {
      newAllocations.push({ 
        district: selectedDistrict,
        location: location.name,
        city: location.name, // Add city for consistency
        type: location.type,
        taluka: location.taluka || location.name,
        startDate: startDate,
        endDate: endDate
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

      // Also save to Firestore
      try {
        const { allocateDataToUser } = await import('../../firebase/dataAllocation');
        
        // Group by district for batch allocation
        const locationsByDistrict = filtered.reduce((acc, alloc) => {
          if (!acc[alloc.district]) {
            acc[alloc.district] = [];
          }
          acc[alloc.district].push({
            name: alloc.location,
            startDate: alloc.startDate,
            endDate: alloc.endDate
          });
          return acc;
        }, {});

        // Allocate to Firestore
        for (const [district, locations] of Object.entries(locationsByDistrict)) {
          await allocateDataToUser(
            selectedUser.id, 
            selectedUser.email, 
            district, 
            locations, 
            user.email,
            startDate,
            endDate
          );
        }
      } catch (error) {
        console.error('Error saving allocation to Firestore:', error);
      }
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
    const scrollY = window.scrollY;
    
    const userAllocations = allocations[userId] || [];
    const updated = userAllocations.filter((_, i) => i !== index);
    
    const updatedAllocations = {
      ...allocations,
      [userId]: updated
    };
    
    setAllocations(updatedAllocations);
    localStorage.setItem('dataAllocations', JSON.stringify(updatedAllocations));
    
    setTimeout(() => {
      window.scrollTo(0, scrollY);
    }, 0);
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  // Sanitize name for Firestore document ID (remove invalid characters)
  const sanitizeName = (name) => {
    if (!name) return 'UNKNOWN';
    // Replace forward slashes and other invalid characters with underscore
    return name
      .replace(/\//g, '_')  // Replace / with _
      .replace(/\\/g, '_')  // Replace \ with _
      .replace(/\./g, '_')  // Replace . with _
      .trim();
  };

  // Parse address to extract district and city
  const parseAddress = (address) => {
    if (!address) return { district: '', city: '' };
    const parts = address.split(',').map(part => part.trim());
    let district = '';
    let city = '';
    if (parts.length >= 2) {
      city = parts[0] || '';
      district = parts[1] || '';
    } else if (parts.length === 1) {
      city = parts[0] || '';
    }
    // Sanitize names for Firestore
    return { 
      district: sanitizeName(district), 
      city: sanitizeName(city) 
    };
  };

  // Handle Excel file upload with hierarchical structure
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress('Reading file...');

    try {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          setUploadProgress('Parsing Excel data...');
          
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);

          setUploadProgress(`Found ${jsonData.length} records. Organizing by district and city...`);

          // Group data by district and city
          const hierarchicalData = new Map();

          jsonData.forEach((row) => {
            const addressField = row.address || row.Address || row.ADDRESS || '';
            const { district, city } = parseAddress(addressField);
            
            const consumerName = row.consumerName || row['Consumer Name'] || row.name || row.Name || '';
            const phone = row.phone || row.Phone || row['Phone Number'] || '';
            const taluka = row.taluka || row.Taluka || '';
            
            const districtKey = district || 'UNKNOWN';
            const cityKey = city || 'UNKNOWN';
            
            const consumerDoc = {
              name: String(consumerName).trim(),
              phone: String(phone).trim(),
              address: addressField,
              city: cityKey,
              district: districtKey,
              taluka: taluka || 'UNKNOWN',
              source: 'mseb_import',
              sourceFile: file.name,
              uploadedAt: serverTimestamp(),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            };
            
            if (!hierarchicalData.has(districtKey)) {
              hierarchicalData.set(districtKey, new Map());
            }
            
            const districtData = hierarchicalData.get(districtKey);
            if (!districtData.has(cityKey)) {
              districtData.set(cityKey, []);
            }
            
            districtData.get(cityKey).push(consumerDoc);
          });

          setUploadProgress(`Organized into ${hierarchicalData.size} districts. Uploading to Firestore...`);

          // Upload to Firestore with hierarchical structure
          let processedCount = 0;
          const totalRecords = jsonData.length;
          const BATCH_SIZE = 500;

          for (const [districtName, citiesMap] of hierarchicalData.entries()) {
            // Create district document
            const districtDocRef = doc(db, 'excelData', districtName);
            await setDoc(districtDocRef, {
              districtName: districtName,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            }, { merge: true });

            for (const [cityName, consumers] of citiesMap.entries()) {
              // Create city document
              const cityDocRef = doc(db, 'excelData', districtName, 'cities', cityName);
              await setDoc(cityDocRef, {
                cityName: cityName,
                consumerCount: consumers.length,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
              }, { merge: true });

              // Upload consumers in batches
              for (let i = 0; i < consumers.length; i += BATCH_SIZE) {
                const batch = writeBatch(db);
                const batchConsumers = consumers.slice(i, i + BATCH_SIZE);
                
                batchConsumers.forEach((consumer) => {
                  const consumerRef = doc(collection(db, 'excelData', districtName, 'cities', cityName, 'consumers'));
                  batch.set(consumerRef, consumer);
                });
                
                await batch.commit();
                processedCount += batchConsumers.length;
                
                setUploadProgress(`Uploaded ${processedCount}/${totalRecords} records...`);
                await new Promise(resolve => setTimeout(resolve, 50));
              }
            }
          }

          setUploadProgress(`✅ Successfully uploaded ${totalRecords} records!`);
          
          setTimeout(() => {
            setUploading(false);
            setUploadProgress('');
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }, 3000);

        } catch (error) {
          console.error('Error processing file:', error);
          setUploadProgress(`❌ Error: ${error.message}`);
          setTimeout(() => {
            setUploading(false);
            setUploadProgress('');
          }, 3000);
        }
      };

      reader.readAsArrayBuffer(file);

    } catch (error) {
      console.error('Error reading file:', error);
      setUploadProgress(`❌ Error: ${error.message}`);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress('');
      }, 3000);
    }
  };

  return (
    <>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="page-title">Data Allocation</h1>
          <p className="page-subtitle">Assign geographical areas to users</p>
        </div>
        
        {/* Upload button - Only for Main Admin */}
        {user.role === 'main_admin' && (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
              id="excel-upload"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              style={{
                background: uploading ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: uploading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                transition: 'all 0.3s'
              }}
              onMouseEnter={(e) => {
                if (!uploading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
              }}
            >
              <i className={`fa-solid ${uploading ? 'fa-spinner fa-spin' : 'fa-upload'}`}></i>
              {uploading ? 'Uploading...' : 'Upload Data'}
            </button>
          </div>
        )}
      </div>

      {/* Progress indicator */}
      {uploadProgress && (
        <div style={{
          background: uploadProgress.includes('✅') ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 
                     uploadProgress.includes('❌') ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)' :
                     'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          animation: 'slideDown 0.3s ease'
        }}>
          <i className={`fa-solid ${
            uploadProgress.includes('✅') ? 'fa-check-circle' :
            uploadProgress.includes('❌') ? 'fa-exclamation-circle' :
            'fa-spinner fa-spin'
          }`} style={{ fontSize: '20px' }}></i>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>{uploadProgress}</span>
        </div>
      )}

      <div className="content-card">
        <h2 className="card-title">Select User</h2>
        <div className="user-dropdown-container" style={{ position: 'relative' }}>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              className="form-input"
              placeholder="🔍 Search users by name or email..."
              value={userSearchTerm}
              onChange={(e) => setUserSearchTerm(e.target.value)}
              onFocus={() => setUserDropdownOpen(true)}
              style={{
                padding: '12px 15px 12px 45px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                fontSize: '14px',
                width: '100%',
                transition: 'all 0.3s',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)'
              }}
            />
            <i className="fa-solid fa-search" style={{
              position: 'absolute',
              left: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: '14px'
            }}></i>
          </div>

          {userDropdownOpen && filteredUsers.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 1000,
              marginTop: '8px',
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
                  onClick={() => {
                    handleUserSelect(u.id);
                    setUserDropdownOpen(false);
                  }}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    borderRadius: '8px',
                    transition: 'all 0.2s',
                    marginBottom: '4px'
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
            marginTop: '15px',
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
              onClick={() => setSelectedUser(null)}
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
      </div>

      {selectedUser && (
        <>
          <div className="content-card">
            <h2 className="card-title">Add New Allocation for {selectedUser.name}</h2>
            <p style={{ fontSize: '13px', color: '#666', marginBottom: '20px' }}>
              Select a district, then choose villages and cities from the list below
            </p>

            {/* District and City Selection - Side by Side */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* District Selection */}
              <div className="form-group" style={{ position: 'relative' }}>
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
                    <i className="fa-solid fa-map-location-dot" style={{ 
                      color: 'white',
                      fontSize: '15px'
                    }}></i>
                  </div>
                  Select District *
                </label>
                
                {/* Search Input with Dropdown */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={selectedDistrict || 'Search districts...'}
                    value={districtSearchTerm}
                    onChange={(e) => {
                      setDistrictSearchTerm(e.target.value);
                      if (!districtDropdownOpen) {
                        setDistrictDropdownOpen(true);
                      }
                    }}
                    onFocus={() => setDistrictDropdownOpen(true)}
                    onBlur={(e) => {
                      e.target.style.transform = 'translateY(0)';
                    }}
                    style={{
                      padding: '14px 45px 14px 16px',
                      border: districtDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '14px',
                      width: '100%',
                      cursor: 'text',
                      background: selectedDistrict 
                        ? 'linear-gradient(to right, #ffffff 0%, #f0f4ff 100%)' 
                        : 'white',
                      transition: 'all 0.3s ease',
                      boxShadow: districtDropdownOpen ? '0 8px 16px rgba(102, 126, 234, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.06)',
                      outline: 'none',
                      color: selectedDistrict ? '#667eea' : '#374151',
                      fontWeight: selectedDistrict ? '600' : '500'
                    }}
                  />
                  <i 
                    className={`fa-solid fa-chevron-${districtDropdownOpen ? 'up' : 'down'}`}
                    onClick={() => setDistrictDropdownOpen(!districtDropdownOpen)}
                    style={{ 
                      position: 'absolute',
                      right: '16px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: districtDropdownOpen ? '#667eea' : '#9ca3af', 
                      transition: 'all 0.3s',
                      fontSize: '14px',
                      cursor: 'pointer',
                      padding: '4px'
                    }}
                  ></i>
                </div>

                {/* Dropdown Content */}
                {districtDropdownOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    border: '2px solid #667eea',
                    borderRadius: '12px',
                    background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9ff 100%)',
                    boxShadow: '0 12px 30px rgba(102, 126, 234, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1)',
                    maxHeight: '350px',
                    overflowY: 'auto',
                    padding: '12px'
                  }}>
                    {filteredDistricts.length > 0 ? (
                      filteredDistricts.map((district, index) => {
                        const isSelected = selectedDistrict === district;
                        return (
                          <div
                            key={index}
                            onClick={() => handleDistrictChange(district)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              padding: '12px 14px',
                              cursor: 'pointer',
                              borderRadius: '10px',
                              transition: 'all 0.3s ease',
                              marginBottom: '6px',
                              background: isSelected 
                                ? 'linear-gradient(135deg, #e0e7ff 0%, #eff6ff 100%)' 
                                : 'white',
                              border: isSelected ? '2px solid #667eea' : '2px solid #e5e7eb',
                              boxShadow: isSelected 
                                ? '0 4px 12px rgba(102, 126, 234, 0.2)' 
                                : '0 1px 3px rgba(0, 0, 0, 0.05)',
                              transform: isSelected ? 'translateX(4px)' : 'translateX(0)'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';
                                e.currentTarget.style.borderColor = '#9ca3af';
                                e.currentTarget.style.transform = 'translateX(4px)';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'white';
                                e.currentTarget.style.borderColor = '#e5e7eb';
                                e.currentTarget.style.transform = 'translateX(0)';
                                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                              }
                            }}
                          >
                            <div style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '6px',
                              background: isSelected 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                : '#f3f4f6',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              marginRight: '12px',
                              transition: 'all 0.3s',
                              boxShadow: isSelected ? '0 2px 6px rgba(102, 126, 234, 0.3)' : 'none'
                            }}>
                              {isSelected && (
                                <i className="fa-solid fa-check" style={{
                                  color: 'white',
                                  fontSize: '12px'
                                }}></i>
                              )}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{
                                fontSize: '14px',
                                fontWeight: isSelected ? '600' : '500',
                                color: isSelected ? '#667eea' : '#374151'
                              }}>
                                {district}
                              </div>
                            </div>
                            {isSelected && (
                              <i className="fa-solid fa-check-circle" style={{
                                color: '#667eea',
                                fontSize: '16px',
                                marginLeft: '8px'
                              }}></i>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                        <i className="fa-solid fa-search" style={{ fontSize: '30px', marginBottom: '8px' }}></i>
                        <p style={{ fontSize: '13px' }}>No districts found</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Cities Dropdown */}
              <div className="form-group" style={{ position: 'relative' }}>
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
                    <i className="fa-solid fa-city" style={{ 
                      color: 'white',
                      fontSize: '15px'
                    }}></i>
                  </div>
                  Search & Select Cities ({selectedLocations.length} selected)
                </label>
                
                {/* Search Input with Dropdown */}
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={!selectedDistrict 
                      ? 'Select district first...' 
                      : selectedLocations.length === 0 
                      ? 'Search cities...' 
                      : `✅ ${selectedLocations.length} cit${selectedLocations.length > 1 ? 'ies' : 'y'} selected`
                    }
                    value={locationSearchTerm}
                    onChange={(e) => {
                      setLocationSearchTerm(e.target.value);
                      if (selectedDistrict && !locationDropdownOpen) {
                        setLocationDropdownOpen(true);
                      }
                    }}
                    onFocus={(e) => {
                      if (selectedDistrict) {
                        setLocationDropdownOpen(true);
                        e.target.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onBlur={(e) => {
                      e.target.style.transform = 'translateY(0)';
                    }}
                    disabled={!selectedDistrict}
                    style={{
                      padding: '14px 45px 14px 16px',
                      border: locationDropdownOpen ? '2px solid #667eea' : '2px solid #d1d5db',
                      borderRadius: '12px',
                      fontSize: '14px',
                      width: '100%',
                      cursor: selectedDistrict ? 'text' : 'not-allowed',
                      background: selectedDistrict 
                        ? (selectedLocations.length > 0 
                          ? 'linear-gradient(to right, #ffffff 0%, #f0f4ff 100%)' 
                          : 'white')
                        : '#f9fafb',
                      transition: 'all 0.3s ease',
                      opacity: selectedDistrict ? 1 : 0.6,
                      boxShadow: locationDropdownOpen ? '0 8px 16px rgba(102, 126, 234, 0.2)' : '0 2px 4px rgba(0, 0, 0, 0.06)',
                      outline: 'none',
                      color: selectedLocations.length > 0 ? '#667eea' : '#374151',
                      fontWeight: selectedLocations.length > 0 ? '600' : '500'
                    }}
                  />
                  {selectedDistrict && (
                    <i 
                      className={`fa-solid fa-chevron-${locationDropdownOpen ? 'up' : 'down'}`}
                      onClick={() => setLocationDropdownOpen(!locationDropdownOpen)}
                      style={{ 
                        position: 'absolute',
                        right: '16px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: locationDropdownOpen ? '#667eea' : '#9ca3af', 
                        transition: 'all 0.3s',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    ></i>
                  )}
                </div>

                {/* Dropdown Content */}
                {locationDropdownOpen && selectedDistrict && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    marginTop: '8px',
                    border: '2px solid #667eea',
                    borderRadius: '12px',
                    background: 'linear-gradient(to bottom, #ffffff 0%, #f8f9ff 100%)',
                    boxShadow: '0 12px 30px rgba(102, 126, 234, 0.25), 0 4px 10px rgba(0, 0, 0, 0.1)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    padding: '12px'
                  }}>
                      {filteredLocations.length > 0 ? (
                        filteredLocations.map((location, index) => {
                          const isSelected = selectedLocations.find(l => l.name === location.name);
                          return (
                            <label
                              key={index}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                padding: '12px 14px',
                                cursor: 'pointer',
                                borderRadius: '10px',
                                transition: 'all 0.3s ease',
                                marginBottom: '6px',
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #e0e7ff 0%, #eff6ff 100%)' 
                                  : 'white',
                                border: isSelected ? '2px solid #667eea' : '2px solid #e5e7eb',
                                boxShadow: isSelected 
                                  ? '0 4px 12px rgba(102, 126, 234, 0.2)' 
                                  : '0 1px 3px rgba(0, 0, 0, 0.05)',
                                transform: isSelected ? 'translateX(4px)' : 'translateX(0)'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)';
                                  e.currentTarget.style.borderColor = '#9ca3af';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.1)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = 'white';
                                  e.currentTarget.style.borderColor = '#e5e7eb';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                  e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
                                }
                              }}
                            >
                              <div style={{
                                width: '24px',
                                height: '24px',
                                borderRadius: '6px',
                                background: isSelected 
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' 
                                  : '#f3f4f6',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: '12px',
                                transition: 'all 0.3s',
                                boxShadow: isSelected ? '0 2px 6px rgba(102, 126, 234, 0.3)' : 'none'
                              }}>
                                <input
                                  type="checkbox"
                                  checked={!!isSelected}
                                  onChange={() => toggleLocation(location)}
                                  onClick={(e) => e.stopPropagation()}
                                  style={{
                                    width: '16px',
                                    height: '16px',
                                    cursor: 'pointer',
                                    accentColor: '#667eea',
                                    margin: 0
                                  }}
                                />
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '14px',
                                  fontWeight: isSelected ? '600' : '500',
                                  color: isSelected ? '#667eea' : '#374151'
                                }}>
                                  {location.name}
                                </div>
                              </div>
                              {isSelected && (
                                <i className="fa-solid fa-check-circle" style={{
                                  color: '#667eea',
                                  fontSize: '16px',
                                  marginLeft: '8px'
                                }}></i>
                              )}
                            </label>
                          );
                        })
                      ) : (
                        <div style={{ textAlign: 'center', padding: '30px', color: '#9ca3af' }}>
                          <i className="fa-solid fa-search" style={{ fontSize: '30px', marginBottom: '8px' }}></i>
                          <p style={{ fontSize: '13px' }}>No cities found</p>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Date Fields */}
            {selectedDistrict && selectedLocations.length > 0 && (
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
                      min={startDate} // Ensure end date is after start date
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

            {/* Add Button */}
            {selectedDistrict && selectedLocations.length > 0 && (
              <div style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setSelectedLocations([]);
                    setLocationSearchTerm('');
                    setStartDate('');
                    setEndDate('');
                  }}
                >
                  Clear Selection
                </button>
                <button
                  className="btn btn-primary"
                  onClick={addAllocation}
                  disabled={!startDate || !endDate}
                  style={{
                    background: (!startDate || !endDate) ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    cursor: (!startDate || !endDate) ? 'not-allowed' : 'pointer'
                  }}
                >
                  <i className="fa-solid fa-plus" style={{ marginRight: '8px' }}></i>
                  Add {selectedLocations.length} Cit{selectedLocations.length !== 1 ? 'ies' : 'y'}
                </button>
              </div>
            )}
          </div>

          {/* Current Allocations */}
          <div className="content-card">
            <h2 className="card-title">Current Allocations for {selectedUser.name}</h2>
            {allocations[selectedUser.id] && allocations[selectedUser.id].length > 0 ? (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>District</th>
                      <th>City</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocations[selectedUser.id].map((alloc, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{alloc.district}</td>
                        <td>{alloc.location}</td>
                        <td>{alloc.startDate}</td>
                        <td>{alloc.endDate}</td>
                        <td>
                          <button
                            className="btn-icon btn-delete"
                            onClick={() => removeAllocation(selectedUser.id, index)}
                            title="Remove"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
                <i className="fa-solid fa-inbox" style={{ fontSize: '48px', marginBottom: '15px' }}></i>
                <p>No allocations yet</p>
                <p style={{ fontSize: '13px', marginTop: '8px' }}>Add locations to get started</p>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
};

export default DataAllocation;
