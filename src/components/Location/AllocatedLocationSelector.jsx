import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../Context/AuthContext';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { getAccurateRecordCount } from '../../firebase/excelStorage';

const AllocatedLocationSelector = ({ allocations = [], onLocationChange, onCountChange, userRole, preselectedLocation }) => {
  const { user } = useAuth();
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('');
  const [count, setCount] = useState(0);
  const [validDistricts, setValidDistricts] = useState([]);
  // Use ref to avoid showing warning multiple times
  const warningShownRef = useRef(false);
  
  // Handle preselected location if provided
  useEffect(() => {
    if (preselectedLocation) {
      setDistrict(preselectedLocation.district || '');
      setCity(preselectedLocation.city || '');
    }
  }, [preselectedLocation]);

  // Fetch valid districts directly from Firestore but only those allocated to the user
  useEffect(() => {
    const fetchValidDistricts = async () => {
      try {
        console.log('AllocatedLocationSelector: Fetching valid districts for user');
        
        if (allocations.length > 0) {
          // We already have the allocations passed from parent, just extract the districts
          console.log('AllocatedLocationSelector: Using provided allocations');
          
          // First get all valid districts from Firestore
          const districtsRef = collection(db, 'districts');
          const snapshot = await getDocs(districtsRef);
          
          const allValidDistricts = new Set();
          snapshot.forEach(doc => {
            allValidDistricts.add(doc.id);
          });
          
          // Filter allocations to only include valid districts
          const userAllocatedDistricts = [...new Set(allocations
            .filter(a => allValidDistricts.has(a.district))
            .map(a => a.district)
            .filter(Boolean))];
          
          console.log('AllocatedLocationSelector: User allocated districts from props:', userAllocatedDistricts);
          setValidDistricts(userAllocatedDistricts.sort());
        } else if (user) {
          // We need to fetch the allocations for this user using the updated function
          console.log('AllocatedLocationSelector: Fetching districts with user role:', user.role);
          
          const { getAllDistricts } = await import('../../firebase/dataAllocation');
          const result = await getAllDistricts(user.id, user.role);
          
          if (result.success) {
            const userAllocatedDistricts = result.data.map(d => d.name);
            console.log('AllocatedLocationSelector: User allocated districts from API:', userAllocatedDistricts);
            setValidDistricts(userAllocatedDistricts);
          } else {
            console.error('AllocatedLocationSelector: Error fetching districts:', result.error);
            setValidDistricts([]);
          }
        } else {
          console.warn('AllocatedLocationSelector: No user or allocations available');
          setValidDistricts([]);
        }
      } catch (error) {
        console.error('AllocatedLocationSelector: Error fetching districts:', error);
        setValidDistricts([]);
      }
    };
    
    fetchValidDistricts();
  }, [allocations, user]);

  // Filter allocations to only include valid districts AND active date ranges
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
  const todayStr = today.toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  
  console.log('🔍 Date Filtering - Today:', todayStr, 'Timestamp:', today.getTime());
  
  const filteredAllocations = allocations.filter(a => {
    // Check if district is valid
    if (!validDistricts.includes(a.district)) {
      console.log(`❌ Filtering out: ${a.district} - ${a.city || a.village} (district not in validDistricts)`);
      return false;
    }
    
    // Check date range if BOTH dates are provided
    if (a.startDate && a.endDate) {
      // Normalize dates for comparison (remove time component)
      const startDate = new Date(a.startDate);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(a.endDate);
      endDate.setHours(23, 59, 59, 999); // Set to end of day
      
      // Check if today is within the allocation period
      const isWithinDateRange = today >= startDate && today <= endDate;
      
      console.log(`📅 Date Check for ${a.district} - ${a.city || a.village}:`);
      console.log(`   Start: ${a.startDate} (${startDate.getTime()})`);
      console.log(`   End: ${a.endDate} (${endDate.getTime()})`);
      console.log(`   Today: ${todayStr} (${today.getTime()})`);
      console.log(`   Within Range: ${isWithinDateRange ? '✅' : '❌'}`);
      
      if (!isWithinDateRange) {
        console.log(`❌ Filtering out: ${a.district} - ${a.city || a.village} is outside date range (${a.startDate} to ${a.endDate})`);
        return false;
      }
    } else {
      console.log(`⚠️ No date range for ${a.district} - ${a.city || a.village}, including by default (always visible)`);
    }
    
    console.log(`✅ Including: ${a.district} - ${a.city || a.village}`);
    return true;
  });
  
  // Get unique districts from filtered allocations
  const districts = filteredAllocations.length > 0
    ? [...new Set(filteredAllocations.map(a => a.district).filter(Boolean))]
    : [];

  // Track if any allocations were filtered by date
  const [dateFilteredCount, setDateFilteredCount] = useState(0);
  
  // Debug: Log available districts and user info
  useEffect(() => {
    // Count how many allocations were filtered out by date
    const originalCount = allocations.filter(a => validDistricts.includes(a.district)).length;
    const filteredCount = filteredAllocations.length;
    const filtered = originalCount - filteredCount;
    
    setDateFilteredCount(filtered);
    
    // Only log once to prevent console spam
    if (!warningShownRef.current) {
      console.log('🔍 AllocatedLocationSelector Debug:');
      console.log('  User:', user?.email, 'Role:', user?.role);
      console.log('  Allocations received:', allocations.length);
      console.log('  Filtered by date:', filtered);
      console.log('  Available districts:', districts);
      console.log('  All allocations:', allocations);
      
      if (allocations.length === 0) {
        console.warn('⚠️ AllocatedLocationSelector: No allocations provided! User should only see their allocated areas.');
      } else {
        console.log('✅ AllocatedLocationSelector: User should see only these districts:', districts);
      }
      
      warningShownRef.current = true;
    }
  }, [districts, allocations, user, filteredAllocations, validDistricts]);

  // State for storing villages fetched from Firebase
  const [villagesFromFirebase, setVillagesFromFirebase] = useState([]);
  
  // Fetch villages from Firebase when district changes
  useEffect(() => {
    const fetchVillages = async () => {
      if (!district) {
        setVillagesFromFirebase([]);
        return;
      }
      
      try {
        console.log(`AllocatedLocationSelector: Fetching villages for district ${district}`);
        const { getVillagesByDistrict } = await import('../../firebase/dataAllocation');
        const result = await getVillagesByDistrict(district, user?.id, user?.role);
        
        if (result.success) {
          const villageNames = result.data.map(v => v.name || v.villageName || v.id);
          console.log(`AllocatedLocationSelector: Found ${villageNames.length} villages in Firebase for district ${district}:`, villageNames);
          setVillagesFromFirebase(villageNames);
        } else {
          console.error(`AllocatedLocationSelector: Error fetching villages:`, result.error);
          setVillagesFromFirebase([]);
        }
      } catch (error) {
        console.error(`AllocatedLocationSelector: Error fetching villages:`, error);
        setVillagesFromFirebase([]);
      }
    };
    
    fetchVillages();
  }, [district, user]);
  
  // Combine villages from allocations and Firebase
  const allocatedVillages = district && filteredAllocations.length > 0
    ? [...new Set(filteredAllocations
        .filter(a => a.district === district)
        .flatMap(a => {
          // Handle both old format (villages array) and new format (city field)
          if (a.villages && Array.isArray(a.villages)) {
            return a.villages;
          } else if (a.city) {
            return [a.city];
          } else if (a.village) {
            return [a.village];
          }
          return [];
        })
        .filter(Boolean))]
    : [];
    
  // Combine both sources of villages and remove duplicates
  const cities = [...new Set([...allocatedVillages, ...villagesFromFirebase])].sort();

  // Calculate count based on selections
  useEffect(() => {
    const fetchAccurateCount = async () => {
      // Avoid excessive logging
      if (process.env.NODE_ENV === 'development') {
        console.log('AllocatedLocationSelector: Calculating count', {
          district,
          city
        });
      }

      if (!district) {
        setCount(0);
        if (onCountChange) {
          onCountChange(0);
        }
        return;
      }

      try {
        // Get accurate count directly from Firebase
        const result = await getAccurateRecordCount(district, city);
        
        if (result.success) {
          const accurateCount = result.count;
          
          if (process.env.NODE_ENV === 'development') {
            console.log('AllocatedLocationSelector: Accurate count from Firebase:', accurateCount);
          }
          
          setCount(accurateCount);
          
          if (onCountChange) {
            onCountChange(accurateCount);
          }
        } else {
          console.error('Error getting accurate count:', result.error);
          setCount(0);
          if (onCountChange) {
            onCountChange(0);
          }
        }
      } catch (error) {
        console.error('Error in fetchAccurateCount:', error);
        setCount(0);
        if (onCountChange) {
          onCountChange(0);
        }
      }
    };
    
    fetchAccurateCount();
  }, [district, city, onCountChange]);

  // Notify parent of location changes
  useEffect(() => {
    if (onLocationChange) {
      // Pass both city and village properties to ensure compatibility
      onLocationChange({ 
        district, 
        city, 
        village: city // Add village property to ensure it's available for display
      });
    }
  }, [district, city, onLocationChange]);

  const handleDistrictChange = (e) => {
    const newDistrict = e.target.value;
    setDistrict(newDistrict);
    setCity(''); // Reset city when district changes
  };

  const handleCityChange = (e) => {
    setCity(e.target.value);
  };

  return (
    <div className="location-selector">
      {/* Date Filter Info Banner */}
      {dateFilteredCount > 0 && (
        <div style={{ 
          background: 'linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)', 
          border: '2px solid #ff9800', 
          borderRadius: '10px', 
          padding: '12px 16px',
          marginBottom: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <i className="fa-solid fa-calendar-times" style={{ color: '#f57c00', fontSize: '20px' }}></i>
          <div style={{ fontSize: '14px', color: '#e65100' }}>
            <strong>{dateFilteredCount} allocation(s)</strong> have expired and will not appear in the dropdown
          </div>
        </div>
      )}
      
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
        <i className="fa-solid fa-info-circle" style={{ color: '#2196f3', fontSize: '20px' }}></i>
        <div style={{ fontSize: '14px', color: '#1976d2' }}>
          You will only see <strong>active allocations</strong> based on today's date (between start date and end date)
        </div>
      </div>
      
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">District</label>
          <select 
            className="form-select" 
            value={district} 
            onChange={handleDistrictChange}
          >
            <option value="">All Districts</option>
            {validDistricts.map(d => {
              // Check if this district has any allocations
              const hasAllocations = filteredAllocations.some(a => a.district === d);
              
              let displayName = d;
              if (hasAllocations) {
                displayName = `${d} (✅ Allocated)`;
              }
              
              return <option key={d} value={d}>{displayName}</option>;
            })}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Villages</label>
          <select 
            className="form-select" 
            value={city} 
            onChange={handleCityChange}
            disabled={!district}
          >
            <option value="">All Villages</option>
            {cities.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Count Display */}
        {district && count > 0 ? (
          <div className="form-group">
            <div style={{ 
              background: '#e8f5e8', 
              border: '2px solid #4caf50', 
              borderRadius: '12px', 
              padding: '16px 20px',
              marginTop: '20px',
              boxShadow: '0 2px 8px rgba(76, 175, 80, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ 
                  background: '#4caf50', 
                  borderRadius: '50%', 
                  width: '40px', 
                  height: '40px', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <i className="fa-solid fa-users" style={{ color: 'white', fontSize: '18px' }}></i>
                </div>
                <div>
                  <div style={{ fontWeight: '700', color: '#2e7d32', fontSize: '20px' }}>
                    {count.toLocaleString()} people available
                  </div>
                  <div style={{ fontSize: '14px', color: '#388e3c', marginTop: '2px' }}>
                    📍 {city && city !== 'All Villages' ? `${city} village, ${district} district` : `All villages in ${district} district`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : district && count === 0 ? (
          <div className="form-group">
            <div style={{ 
              background: '#fff3e0', 
              border: '2px solid #ff9800', 
              borderRadius: '12px', 
              padding: '16px 20px',
              marginTop: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <i className="fa-solid fa-exclamation-triangle" style={{ color: '#ff9800', fontSize: '20px' }}></i>
                <div>
                  <div style={{ fontWeight: '600', color: '#e65100' }}>
                    No data available
                  </div>
                  <div style={{ fontSize: '14px', color: '#f57c00', marginTop: '2px' }}>
                    No records found for {city && city !== 'All Villages' ? `${city}, ${district}` : district}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : !district ? (
          <div className="form-group">
            <div style={{ 
              background: '#f5f5f5', 
              border: '1px solid #ddd', 
              borderRadius: '12px', 
              padding: '16px 20px',
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
    </div>
  );
};

export default AllocatedLocationSelector;
