import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';

const LocationSelectorMulti = ({ onLocationChange, onCountChange, userRole }) => {
  const { user } = useAuth();
  const [selectedDistricts, setSelectedDistricts] = useState([]);
  const [selectedTalukas, setSelectedTalukas] = useState([]);
  const [selectedCities, setSelectedCities] = useState([]);
  const [districtDropdownOpen, setDistrictDropdownOpen] = useState(false);
  const [talukaDropdownOpen, setTalukaDropdownOpen] = useState(false);
  const [cityDropdownOpen, setCityDropdownOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [userAllocations, setUserAllocations] = useState([]);

  // Load user allocations if user role is 'user'
  useEffect(() => {
    if (user && userRole === 'user') {
      const allUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const currentUser = allUsers.find(u => u.email === user.email);
      if (currentUser) {
        const allocations = JSON.parse(localStorage.getItem('dataAllocations') || '{}');
        setUserAllocations(allocations[currentUser.id] || []);
      }
    }
  }, [user, userRole]);

  // All Maharashtra districts data
  const allDistricts = ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur'];
  
  // Filter districts based on user allocations
  const districts = userRole === 'user' && userAllocations.length > 0
    ? [...new Set(userAllocations.map(a => a.district))]
    : allDistricts;
  
  const talukas = {
    Mumbai: ['Mumbai City', 'Mumbai Suburban', 'Thane'],
    Pune: ['Pune City', 'Pimpri-Chinchwad', 'Haveli'],
    Nashik: ['Nashik City', 'Igatpuri', 'Dindori'],
    Nagpur: ['Nagpur City', 'Kamptee', 'Hingna'],
    Thane: ['Thane City', 'Kalyan', 'Ulhasnagar'],
    Aurangabad: ['Aurangabad City', 'Paithan'],
    Solapur: ['Solapur City', 'Pandharpur'],
    Kolhapur: ['Kolhapur City', 'Ichalkaranji']
  };
  
  const cities = {
    'Mumbai City': ['Colaba', 'Fort', 'Marine Lines', 'Churchgate', 'Dadar'],
    'Mumbai Suburban': ['Andheri', 'Borivali', 'Malad', 'Goregaon'],
    'Pune City': ['Shivajinagar', 'Koregaon Park', 'Deccan', 'Kothrud'],
    'Nashik City': ['Nasik Road', 'Panchavati', 'College Road'],
    'Aurangabad City': ['Kranti Chowk', 'CIDCO', 'Cantonment'],
    'Paithan': ['Paithan', 'Gangapur'],
    'Solapur City': ['North Solapur', 'South Solapur'],
    'Pandharpur': ['Pandharpur', 'Malshiras'],
    'Kolhapur City': ['Shahupuri', 'Rajarampuri', 'Tarabai Park'],
    'Ichalkaranji': ['Ichalkaranji', 'Hatkanangle'],
    'Kalyan': ['Kalyan West', 'Kalyan East', 'Dombivli'],
    'Ulhasnagar': ['Ulhasnagar 1', 'Ulhasnagar 2', 'Ulhasnagar 3']
  };

  const toggleDistrict = (district) => {
    const newDistricts = selectedDistricts.includes(district)
      ? selectedDistricts.filter(d => d !== district)
      : [...selectedDistricts, district];
    
    setSelectedDistricts(newDistricts);
    setSelectedTalukas([]);
    setSelectedCities([]);
    updateLocation(newDistricts, [], []);
  };

  const toggleTaluka = (taluka) => {
    const newTalukas = selectedTalukas.includes(taluka)
      ? selectedTalukas.filter(t => t !== taluka)
      : [...selectedTalukas, taluka];
    
    setSelectedTalukas(newTalukas);
    setSelectedCities([]);
    updateLocation(selectedDistricts, newTalukas, []);
  };

  const toggleCity = (city) => {
    const newCities = selectedCities.includes(city)
      ? selectedCities.filter(c => c !== city)
      : [...selectedCities, city];
    
    setSelectedCities(newCities);
    updateLocation(selectedDistricts, selectedTalukas, newCities);
  };

  const updateLocation = (dists, tals, cits) => {
    let newCount = 0;
    
    if (cits.length > 0) {
      newCount = cits.length * (Math.floor(Math.random() * 2000) + 500);
    } else if (tals.length > 0) {
      newCount = tals.length * (Math.floor(Math.random() * 5000) + 1000);
    } else if (dists.length > 0) {
      newCount = dists.length * (Math.floor(Math.random() * 10000) + 5000);
    }
    
    setCount(newCount);
    
    if (onLocationChange) {
      onLocationChange({ 
        districts: dists, 
        talukas: tals, 
        cities: cits 
      });
    }
    if (onCountChange) {
      onCountChange(newCount);
    }
  };

  // Get available talukas from selected districts
  const availableTalukas = selectedDistricts.length > 0
    ? selectedDistricts.flatMap(district => talukas[district] || [])
    : [];

  // Get available cities from selected talukas
  const availableCities = selectedTalukas.length > 0
    ? selectedTalukas.flatMap(taluka => cities[taluka] || [])
    : [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', position: 'relative', overflow: 'visible' }}>
      {/* Districts Multi-Select */}
      <div className="form-group" style={{ position: 'relative', zIndex: districtDropdownOpen ? 1000 : 1, overflow: 'visible' }}>
        <label className="form-label">Districts ({selectedDistricts.length} selected)</label>
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
            style={{ color: districtDropdownOpen ? '#667eea' : '#6b7280' }}
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
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2)'
          }}>
            {districts.map(district => (
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
              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                <span style={{ color: selectedDistricts.includes(district) ? '#667eea' : '#374151' }}>
                  {district}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Talukas Multi-Select */}
      <div className="form-group" style={{ position: 'relative', zIndex: talukaDropdownOpen ? 1000 : 1, overflow: 'visible' }}>
        <label className="form-label">Talukas ({selectedTalukas.length} selected)</label>
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
              style={{ color: talukaDropdownOpen ? '#667eea' : '#6b7280' }}
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
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2)'
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
              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                <span style={{ color: selectedTalukas.includes(taluka) ? '#667eea' : '#374151' }}>
                  {taluka}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Cities Multi-Select */}
      <div className="form-group" style={{ position: 'relative', zIndex: cityDropdownOpen ? 1000 : 1, overflow: 'visible' }}>
        <label className="form-label">Cities ({selectedCities.length} selected)</label>
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
              style={{ color: cityDropdownOpen ? '#667eea' : '#6b7280' }}
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
            boxShadow: '0 10px 25px rgba(102, 126, 234, 0.2)'
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
              onMouseEnter={(e) => e.currentTarget.style.background = '#eff6ff'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
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
                <span style={{ color: selectedCities.includes(city) ? '#667eea' : '#374151' }}>
                  {city}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {count > 0 && (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            padding: '15px', 
            background: '#e3f2fd', 
            borderRadius: '8px',
            borderLeft: '4px solid #2196F3'
          }}>
            <strong><i className="fa-solid fa-users"></i> Target Recipients: {count.toLocaleString()}</strong>
            <div style={{ fontSize: '14px', marginTop: '5px', color: '#666' }}>
              {selectedCities.length > 0 && `${selectedCities.length} cities, `}
              {selectedTalukas.length > 0 && `${selectedTalukas.length} talukas, `}
              {selectedDistricts.length} districts selected
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationSelectorMulti;
