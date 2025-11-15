import { useState, useEffect } from 'react';
import { useAuth } from '../Context/AuthContext';
import { getAllocationsByUserId } from '../../firebase/dataAllocation';

const LocationSelector = ({ onLocationChange, onCountChange, userRole }) => {
  const { user } = useAuth();
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [count, setCount] = useState(0);
  const [userAllocations, setUserAllocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load user allocations from Firebase
  useEffect(() => {
    const loadUserAllocations = async () => {
      if (user && user.id && userRole === 'user') {
        setLoading(true);
        try {
          const result = await getAllocationsByUserId(user.id);
          if (result.success) {
            setUserAllocations(result.data || []);
          } else {
            console.error('Failed to load user allocations:', result.error);
            setUserAllocations([]);
          }
        } catch (error) {
          console.error('Error loading user allocations:', error);
          setUserAllocations([]);
        } finally {
          setLoading(false);
        }
      } else {
        setUserAllocations([]);
      }
    };

    loadUserAllocations();
  }, [user, userRole]);

  // All Maharashtra districts data (fallback for non-user roles)
  const allDistricts = ['Mumbai', 'Pune', 'Nashik', 'Nagpur', 'Thane', 'Aurangabad', 'Solapur', 'Kolhapur', 'SANGLI'];
  
  // Filter districts based on user allocations
  const districts = userRole === 'user' && userAllocations.length > 0
    ? [...new Set(userAllocations.map(a => a.district).filter(Boolean))]
    : allDistricts;
  
  
  // Get available cities/villages based on selected district and user allocations
  const getAvailableCities = () => {
    if (!district) return [];
    
    if (userRole === 'user' && userAllocations.length > 0) {
      const filteredAllocations = userAllocations.filter(a => a.district === district);
      return [...new Set(filteredAllocations.map(a => a.city).filter(Boolean))];
    }
    
    // Fallback for non-user roles
    const cityMap = {
      'Mumbai': ['Colaba', 'Fort', 'Marine Lines', 'Churchgate', 'Dadar', 'Andheri', 'Borivali', 'Malad', 'Goregaon'],
      'Pune': ['Shivajinagar', 'Koregaon Park', 'Deccan', 'Kothrud'],
      'Nashik': ['Nasik Road', 'Panchavati', 'College Road'],
      'SANGLI': ['SANGLI CITY', 'MIRAJ CITY', 'KUPWAD CITY']
    };
    return cityMap[district] || [];
  };
  
  const availableCities = getAvailableCities();

  // Calculate count based on user allocations
  const calculateCount = (selectedDistrict, selectedCity) => {
    if (userRole === 'user' && userAllocations.length > 0) {
      let filteredAllocations = userAllocations;
      
      if (selectedDistrict) {
        filteredAllocations = filteredAllocations.filter(a => a.district === selectedDistrict);
      }
      if (selectedCity) {
        filteredAllocations = filteredAllocations.filter(a => a.city === selectedCity);
      }
      
      return filteredAllocations.reduce((sum, allocation) => sum + (allocation.count || 0), 0);
    }
    
    // Fallback for non-user roles (random numbers)
    if (selectedCity) return Math.floor(Math.random() * 2000) + 500;
    if (selectedDistrict) return Math.floor(Math.random() * 10000) + 5000;
    return 0;
  };

  const handleDistrictChange = (e) => {
    const selectedDistrict = e.target.value;
    setDistrict(selectedDistrict);
    if (district !== selectedDistrict) {
      setCity('');
    }
    const newCount = calculateCount(selectedDistrict, '');
    setCount(newCount);
    
    if (onLocationChange) {
      onLocationChange(selectedDistrict ? { district: selectedDistrict } : null);
    }
    if (onCountChange) {
      onCountChange(newCount);
    }
  };

  const handleCityChange = (e) => {
    const selectedCity = e.target.value;
    setCity(selectedCity);
    const newCount = calculateCount(district, selectedCity);
    setCount(newCount);
    
    if (onLocationChange) {
      onLocationChange({ district, city: selectedCity || null });
    }
    if (onCountChange) {
      onCountChange(newCount);
    }
  };


  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div>Loading your allocated locations...</div>
      </div>
    );
  }

  if (userRole === 'user' && userAllocations.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px' }}>
        <div style={{ color: '#666', fontSize: '16px' }}>
          <i className="fa-solid fa-info-circle" style={{ marginRight: '8px' }}></i>
          No data has been allocated to you yet.
        </div>
        <div style={{ color: '#999', fontSize: '14px', marginTop: '8px' }}>
          Please contact your administrator to get data allocated.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
      <div className="form-group">
        <label className="form-label">District</label>
        <select 
          className="form-select" 
          value={district} 
          onChange={handleDistrictChange}
          disabled={loading}
        >
          <option value="">
            {districts.length > 0 ? 'Select District' : 'No districts available'}
          </option>
          {districts.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Villages</label>
        <select 
          className="form-select" 
          value={city} 
          onChange={handleCityChange}
          disabled={!district || availableCities.length === 0}
        >
          <option value="">
            {availableCities.length > 0 ? 'Select Village' : 'No villages available'}
          </option>
          {availableCities.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {district && count > 0 ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            background: '#e8f5e8', 
            border: '2px solid #4caf50', 
            borderRadius: '12px', 
            padding: '20px',
            marginTop: '20px',
            boxShadow: '0 4px 12px rgba(76, 175, 80, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <div style={{ 
                background: '#4caf50', 
                borderRadius: '50%', 
                width: '50px', 
                height: '50px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center' 
              }}>
                <i className="fa-solid fa-users" style={{ color: 'white', fontSize: '22px' }}></i>
              </div>
              <div>
                <div style={{ fontWeight: '700', color: '#2e7d32', fontSize: '24px' }}>
                  {count.toLocaleString()} people available
                </div>
                <div style={{ fontSize: '16px', color: '#388e3c', marginTop: '4px' }}>
                  📍 {city ? `${city}, ${district}` : `All villages in ${district}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : district && count === 0 ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            background: '#fff3e0', 
            border: '2px solid #ff9800', 
            borderRadius: '12px', 
            padding: '20px',
            marginTop: '20px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <i className="fa-solid fa-exclamation-triangle" style={{ color: '#ff9800', fontSize: '24px' }}></i>
              <div>
                <div style={{ fontWeight: '600', color: '#e65100', fontSize: '18px' }}>
                  No data available
                </div>
                <div style={{ fontSize: '14px', color: '#f57c00', marginTop: '4px' }}>
                  No records found for {city ? `${city}, ${district}` : district}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : !district ? (
        <div style={{ gridColumn: '1 / -1' }}>
          <div style={{ 
            background: '#f5f5f5', 
            border: '1px solid #ddd', 
            borderRadius: '12px', 
            padding: '20px',
            marginTop: '20px',
            textAlign: 'center'
          }}>
            <div style={{ color: '#666', fontSize: '16px' }}>
              <i className="fa-solid fa-map-marker-alt" style={{ marginRight: '8px', color: '#999' }}></i>
              Select a district to see available records
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default LocationSelector;