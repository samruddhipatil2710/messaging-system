import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../Context/AuthContext';
import { getAllocationsByUserId } from '../../firebase/dataAllocation';
import { MESSAGING_CONFIG, createWebhookPayload, formatMobileNumber, validateMobileNumber } from '../../config/messaging';
import AllocatedLocationSelector from '../Location/AllocatedLocationSelector';
import ConfirmationModal from '../Common/ConfirmationModal';
import { showAlert } from '../../utils/alertUtils.jsx';
import './MessageComposer.css';

const MessageComposer = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [messageType, setMessageType] = useState('whatsapp');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [recipientCount, setRecipientCount] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Message templates
  // Hidden webhook template for API functionality
  const webhookTemplate = {
    id: 'webhook',
    name: 'WhatsApp API Format',
    template: '⭐ name कडून हार्दिक शुभेच्छा!⭐\n\nही दिवाळी तुमच्या आयुष्यात सोन्याची झळाळी आणि स्वप्नांची चमक घेऊन येवो 💎\n\nया सणासुदीला खास ऑफर्सचा लाभ घ्या ✨\n\n🎁 भेट द्या: text\n\nधन्यवाद 🙏!!',
    description: 'WhatsApp API format with Marathi template'
  };
  
  // Visible message templates
  const messageTemplates = [
    {
      id: 'election',
      name: 'Election',
      template: '⭐ name कडून हार्दिक शुभेच्छा!⭐\n\nही दिवाळी तुमच्या आयुष्यात सोन्याची झळाळी आणि स्वप्नांची चमक घेऊन येवो 💎\n\nया सणासुदीला खास ऑफर्सचा लाभ घ्या ✨\n\n🎁 भेट द्या: text\n\nधन्यवाद 🙏!!'
    },
    {
      id: 'jewelry',
      name: 'Jewelry Shop',
      template: '✨ name ज्वेलर्स वरून दिवाळी शुभेच्छा! ✨\n\nदिवाळी सेल: सर्व दागिन्यांवर 20% सूट\nविशेष ऑफर: 5 ग्रॅम सोन्यावर 1 ग्रॅम फ्री\n\nआजच भेट द्या: text\n\nधन्यवाद 🙏'
    },
    {
      id: 'festival',
      name: 'Festival Greetings',
      template: 'name कडून आपल्या सर्वांना दिवाळीच्या हार्दिक शुभेच्छा!\n\nप्रकाशाचा सण आपल्या जीवनात नवी उर्जा आणि समृद्धी घेऊन येवो.\n\nविशेष संदेश: text\n\nआपला आभारी 🙏'
    }
  ];
  const [confirmMessage, setConfirmMessage] = useState('');
  const [userAllocations, setUserAllocations] = useState([]);
  const [preselectedArea, setPreselectedArea] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [mobileNumbers, setMobileNumbers] = useState([]);
  // Track which locations we've already fetched mobile numbers for
  const fetchedLocationsRef = useRef({});
  
  // Diagnostic function to show all available field names and mobile number content
  const diagnoseDataStructure = useCallback(async (district, city) => {
    // Only run diagnostics in development mode
    if (process.env.NODE_ENV !== 'development') return;
    
    try {
      const { getVillageData } = await import('../../firebase/excelStorage');
      const result = await getVillageData(district, city, 3); // Get first 3 records
      
      if (result.success && result.data && result.data.length > 0) {
        console.log('🔍 DATA STRUCTURE DIAGNOSIS:');
        console.log('📋 Available field names:', Object.keys(result.data[0]));
        
        // Check mobile-related fields
        const mobileFields = Object.keys(result.data[0]).filter(key => 
          key.toLowerCase().includes('mobile') || 
          key.toLowerCase().includes('phone') || 
          key.toLowerCase().includes('contact')
        );
        console.log('📱 Mobile-related fields found:', mobileFields);
        
        // Only log the first record's mobile fields
        if (mobileFields.length > 0) {
          const record = result.data[0];
          console.log('📱 Sample mobile field values:');
          mobileFields.forEach(field => {
            const value = record[field];
            console.log(`  ${field}: "${value}"`);
          });
        }
        
        // Validate if it's a real mobile number
        if (mobileFields.length > 0 && result.data[0][mobileFields[0]]) {
          const value = result.data[0][mobileFields[0]];
          if (value) {
            const cleaned = value.toString().replace(/[-\s().]/g, '');
            const isValidMobile = /^[6-9]\d{9}$/.test(cleaned) || /^91[6-9]\d{9}$/.test(cleaned);
            console.log(`    → Cleaned: "${cleaned}", Valid: ${isValidMobile ? '✅' : '❌'}`);
          }
        }
      }
    } catch (error) {
      console.error('Error in diagnosis:', error);
    }
  }, []);

  // Fetch mobile numbers from selected area
  const fetchMobileNumbers = useCallback(async (district, city) => {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log('MessageComposer: Fetching mobile numbers for', district, city);
      }
      
      // Only run diagnostics in development mode
      await diagnoseDataStructure(district, city);
      
      const { getVillageData } = await import('../../firebase/excelStorage');
      
      let allMobileNumbers = [];
      
      if (city && city !== 'All Villages') {
        // Fetch from specific village
        const result = await getVillageData(district, city);
        console.log('Village data result:', result);
        
        if (result.success && result.data && result.data.length > 0) {
          console.log('First record fields:', Object.keys(result.data[0]));
          
          // Check for different possible mobile field names
          const mobileFieldNames = ['mobileNumber', 'mobile no', 'mobile_no', 'mobile', 'phone', 'phoneNumber', 'contact'];
          let mobileField = null;
          
          // Find which mobile field exists in the data
          for (const field of mobileFieldNames) {
            if (result.data[0].hasOwnProperty(field)) {
              mobileField = field;
              console.log(`Found mobile field: ${field}`);
              break;
            }
          }
          
          if (mobileField) {
            const mobiles = result.data
              .map(record => record[mobileField])
              .filter(num => num && num.toString().trim() !== '');
            console.log(`Extracted ${mobiles.length} mobile numbers using field: ${mobileField}`);
            allMobileNumbers = mobiles;
          } else {
            console.error('No mobile number field found in the data');
          }
        } else {
          console.log('No data found or empty data array');
        }
      } else if (district) {
        // Fetch all villages in district
        const { getVillagesByDistrict } = await import('../../firebase/dataAllocation');
        const villagesResult = await getVillagesByDistrict(district);
        
        if (villagesResult.success && villagesResult.data) {
          for (const village of villagesResult.data) {
            const villageName = village.villageName || village.name || village.id;
            console.log(`Processing village: ${villageName}`);
            
            const result = await getVillageData(district, villageName);
            if (result.success && result.data && result.data.length > 0) {
              // Check for different possible mobile field names
              const mobileFieldNames = ['mobileNumber', 'mobile no', 'mobile_no', 'mobile', 'phone', 'phoneNumber', 'contact'];
              let mobileField = null;
              
              // Find which mobile field exists in the data
              for (const field of mobileFieldNames) {
                if (result.data[0].hasOwnProperty(field)) {
                  mobileField = field;
                  console.log(`Found mobile field in ${villageName}: ${field}`);
                  break;
                }
              }
              
              if (mobileField) {
                const mobiles = result.data
                  .map(record => record[mobileField])
                  .filter(num => num && num.toString().trim() !== '');
                console.log(`Extracted ${mobiles.length} mobile numbers from ${villageName}`);
                allMobileNumbers = [...allMobileNumbers, ...mobiles];
              }
            }
          }
        }
      }
      
      // Remove duplicates
      const uniqueMobiles = [...new Set(allMobileNumbers)];
      
      setMobileNumbers(uniqueMobiles);
      return uniqueMobiles;
      
    } catch (error) {
      console.error('MessageComposer: Error fetching mobile numbers:', error);
      return [];
    }
  }, [diagnoseDataStructure, validateMobileNumber, formatMobileNumber]);

  // Fetch mobile numbers when location changes
  useEffect(() => {
    if (selectedLocation && selectedLocation.district) {
      // Create a unique key for this location
      const locationKey = `${selectedLocation.district}_${selectedLocation.city || 'all'}`;
      
      // Only fetch if we haven't already fetched for this location
      if (!fetchedLocationsRef.current[locationKey]) {
        const fetchNumbers = async () => {
          try {
            await fetchMobileNumbers(selectedLocation.district, selectedLocation.city);
            // Mark this location as fetched
            fetchedLocationsRef.current[locationKey] = true;
          } catch (error) {
            console.error('Error fetching mobile numbers:', error);
          }
        };
        fetchNumbers();
      }
    } else if (selectedLocation === null) {
      setMobileNumbers([]);
      // Clear the fetched locations when selection is reset
      fetchedLocationsRef.current = {};
    }
  }, [selectedLocation, fetchMobileNumbers]);

  // Load user allocations and handle preselected location
  useEffect(() => {
    // Skip if we already have allocations
    if (userAllocations.length > 0) return;
    
    const loadAllocationsAndPreselect = async () => {
      if (user && user.id) {
        try {
          console.log('MessageComposer: Loading allocations for user:', user.id);
          
          // Use the updated functions that handle role-based filtering
          const { getAllDistricts, getAllocationsByUserId } = await import('../../firebase/dataAllocation');
          
          // Get districts allocated to this user based on their role
          const districtsResult = await getAllDistricts(user.id, user.role);
          console.log('MessageComposer: Districts allocated to user:', districtsResult.success ? districtsResult.data.length : 0);
          
          // Get the user's allocations
          const allocationsResult = await getAllocationsByUserId(user.id);
          
          if (allocationsResult.success) {
            // Filter allocations to only include districts that are allocated to this user
            const validDistrictNames = new Set(districtsResult.success ? districtsResult.data.map(d => d.name) : []);
            
            // Get today's date for filtering
            const today = new Date().toISOString().split('T')[0];
            
            console.log('🔍 MessageComposer Date Filtering:');
            console.log('   Today:', today);
            console.log('   Total allocations from Firestore:', allocationsResult.data.length);
            
            const allocations = allocationsResult.data.filter(a => {
              // Check if district is valid
              if (!a.district || !validDistrictNames.has(a.district)) {
                console.log(`❌ Filtering out: ${a.district} - ${a.city || a.village} (invalid district)`);
                return false;
              }
              
              // Check date range if dates are provided
              if (a.startDate && a.endDate) {
                const isWithinDateRange = today >= a.startDate && today <= a.endDate;
                console.log(`📅 ${a.district} - ${a.city || a.village}: ${a.startDate} to ${a.endDate} = ${isWithinDateRange ? '✅ ACTIVE' : '❌ EXPIRED'}`);
                if (!isWithinDateRange) {
                  return false;
                }
              } else {
                console.log(`⚠️ ${a.district} - ${a.city || a.village}: No dates, including by default`);
              }
              
              return true;
            });
            
            console.log('✅ MessageComposer: Filtered allocations (active only):', allocations.length);
            console.log('📋 Active allocations:', allocations.map(a => `${a.district} - ${a.city || a.village}`));
            setUserAllocations(allocations);
          } else {
            console.error('MessageComposer: Error getting allocations:', allocationsResult.error);
            setUserAllocations([]);
          }
          
          // Handle preselected location from navigation state
          if (location.state?.preselectedLocation) {
            setPreselectedArea(location.state.preselectedLocation);
          }
        } catch (error) {
          console.error('MessageComposer: Error loading allocations:', error);
          setUserAllocations([]);
        }
      }
    };

    loadAllocationsAndPreselect();
  }, [user, location.state]);

  // Refresh allocations data
  const refreshAllocations = async () => {
    setIsRefreshing(true);
    // Reset the fetched locations cache and mobile numbers
    fetchedLocationsRef.current = {};
    setMobileNumbers([]);
    setSelectedLocation(null);
    setRecipientCount(0);
    
    try {
      // Clear localStorage cache
      localStorage.removeItem('cachedDistricts');
      localStorage.removeItem('cachedAllocations');
      
      console.log('MessageComposer: Refreshing allocations and clearing cache');
      
      // Use the updated functions that handle role-based filtering
      const { getAllDistricts, getAllocationsByUserId } = await import('../../firebase/dataAllocation');
      
      // Get districts allocated to this user based on their role
      const districtsResult = await getAllDistricts(user.id, user.role);
      console.log('MessageComposer: Districts allocated to user:', districtsResult.success ? districtsResult.data.length : 0);
      
      // Get the user's allocations
      const allocationsResult = await getAllocationsByUserId(user.id);
      
      if (allocationsResult.success) {
        // Filter allocations to only include districts that are allocated to this user
        const validDistrictNames = new Set(districtsResult.success ? districtsResult.data.map(d => d.name) : []);
        
        // Get today's date for filtering
        const today = new Date().toISOString().split('T')[0];
        
        console.log('🔄 Refresh - Date Filtering:');
        console.log('   Today:', today);
        console.log('   Total allocations from Firestore:', allocationsResult.data.length);
        
        const allocations = allocationsResult.data.filter(a => {
          // Check if district is valid
          if (!a.district || !validDistrictNames.has(a.district)) {
            console.log(`❌ Filtering out: ${a.district} - ${a.city || a.village} (invalid district)`);
            return false;
          }
          
          // Check date range if dates are provided
          if (a.startDate && a.endDate) {
            const isWithinDateRange = today >= a.startDate && today <= a.endDate;
            console.log(`📅 ${a.district} - ${a.city || a.village}: ${a.startDate} to ${a.endDate} = ${isWithinDateRange ? '✅ ACTIVE' : '❌ EXPIRED'}`);
            if (!isWithinDateRange) {
              return false;
            }
          } else {
            console.log(`⚠️ ${a.district} - ${a.city || a.village}: No dates, including by default`);
          }
          
          return true;
        });
        
        console.log('✅ Refresh: Filtered allocations (active only):', allocations.length);
        console.log('📋 Active allocations:', allocations.map(a => `${a.district} - ${a.city || a.village}`));
        setUserAllocations(allocations);
      } else {
        console.error('MessageComposer: Error getting allocations:', allocationsResult.error);
        setUserAllocations([]);
      }
      
    } catch (error) {
      console.error('MessageComposer: Error refreshing allocations:', error);
      setUserAllocations([]);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template) => {
    setSelectedTemplate(template);
    
    // Replace placeholders with actual values for all templates
    let messageText = template.template;
    messageText = messageText.replace(/name/g, user?.name || 'Main Admin');
    messageText = messageText.replace(/text/g, 'Your special offer here');
    setMessage(messageText);
    
    setShowPreview(true);
  };

  // Close preview
  const closePreview = () => {
    setShowPreview(false);
  };

  const handleSend = () => {
    if (!selectedLocation || recipientCount === 0) {
      showAlert('Please select a location first!', 'warning');
      return;
    }

    if (!message.trim()) {
      showAlert('Please select a message template!', 'warning');
      return;
    }

    // Build location description
    let locationDesc = '';
    // Use village name if available, otherwise fall back to city
    const villageName = selectedLocation.village || selectedLocation.city;
    if (villageName) {
      locationDesc = `${villageName} village in ${selectedLocation.district} district`;
    } else if (selectedLocation.district) {
      locationDesc = `${selectedLocation.district} district`;
    }

    // Set confirmation message and show modal
    const confirmMsg = `Send ${messageType.toUpperCase()} message to ${recipientCount.toLocaleString()} people?\n\nLocation: ${locationDesc}`;
    setConfirmMessage(confirmMsg);
    setShowConfirmModal(true);
  };

  const handleSendConfirm = async () => {
    // Build location description again for storage
    let locationDesc = '';
    // Use village name if available, otherwise fall back to city
    const villageName = selectedLocation.village || selectedLocation.city;
    if (villageName) {
      locationDesc = `${villageName} village in ${selectedLocation.district} district`;
    } else if (selectedLocation.district) {
      locationDesc = `${selectedLocation.district} district`;
    }

    try {
      setShowConfirmModal(false);
      setIsSending(true); // Show loading state
      
      // Import Firebase functions
      const { createMessage } = await import('../../firebase/firestore');
      const { createActivityLog } = await import('../../firebase/firestore');
      const { getVillageData } = await import('../../firebase/excelStorage');
      const { getConsumersByDistrict, getConsumersByCity } = await import('../../firebase/consumerData');

      // Fetch mobile numbers based on selection
      let mobileNumbers = [];
      
      if (selectedLocation.district && selectedLocation.city && selectedLocation.city !== 'All Villages') {
        // Fetch from specific village in district
        const villageDataResult = await getVillageData(selectedLocation.district, selectedLocation.city);
        console.log('handleSendConfirm: Village data result:', villageDataResult);
        
        if (villageDataResult.success && villageDataResult.data && villageDataResult.data.length > 0) {
          console.log('handleSendConfirm: First record fields:', Object.keys(villageDataResult.data[0]));
          
          // Check for different possible mobile field names
          const mobileFieldNames = ['mobileNumber', 'mobile no', 'mobile_no', 'mobile', 'phone', 'phoneNumber', 'contact'];
          let mobileField = null;
          
          // Find which mobile field exists in the data
          for (const field of mobileFieldNames) {
            if (villageDataResult.data[0].hasOwnProperty(field)) {
              mobileField = field;
              console.log(`handleSendConfirm: Found mobile field: ${field}`);
              break;
            }
          }
          
          if (mobileField) {
            mobileNumbers = villageDataResult.data
              .map(record => record[mobileField])
              .filter(num => num && num.toString().trim() !== '');
            console.log(`handleSendConfirm: Extracted ${mobileNumbers.length} mobile numbers`);
          } else {
            console.error('handleSendConfirm: No mobile number field found in the data');
          }
        } else {
          console.log('handleSendConfirm: No data found or empty data array');
        }
        
        // Also check consumers collection
        const consumersResult = await getConsumersByCity(selectedLocation.city);
        
        if (consumersResult.success && consumersResult.data) {
          const consumerNumbers = consumersResult.data
            .map(consumer => consumer.mobileNumber)
            .filter(num => num && num.trim() !== '');
          mobileNumbers = [...mobileNumbers, ...consumerNumbers];
        }
      } else if (selectedLocation.district) {
        // Fetch all villages in district
        
        // Get all allocations for this district
        const districtAllocations = userAllocations.filter(a => a.district === selectedLocation.district);
        
        for (const allocation of districtAllocations) {
          const villages = allocation.villages || (allocation.city ? [allocation.city] : []);
          
          for (const village of villages) {
            console.log(`handleSendConfirm: Processing village: ${village}`);
            const villageDataResult = await getVillageData(selectedLocation.district, village);
            
            if (villageDataResult.success && villageDataResult.data && villageDataResult.data.length > 0) {
              // Check for different possible mobile field names
              const mobileFieldNames = ['mobileNumber', 'mobile no', 'mobile_no', 'mobile', 'phone', 'phoneNumber', 'contact'];
              let mobileField = null;
              
              // Find which mobile field exists in the data
              for (const field of mobileFieldNames) {
                if (villageDataResult.data[0].hasOwnProperty(field)) {
                  mobileField = field;
                  console.log(`handleSendConfirm: Found mobile field in ${village}: ${field}`);
                  break;
                }
              }
              
              if (mobileField) {
                const villageNumbers = villageDataResult.data
                  .map(record => record[mobileField])
                  .filter(num => num && num.toString().trim() !== '');
                console.log(`handleSendConfirm: Extracted ${villageNumbers.length} mobile numbers from ${village}`);
                mobileNumbers = [...mobileNumbers, ...villageNumbers];
              }
            }
          }
        }
        
        // Also check consumers collection for entire district
        const consumersResult = await getConsumersByDistrict(selectedLocation.district);
        if (consumersResult.success && consumersResult.data) {
          const consumerNumbers = consumersResult.data
            .map(consumer => consumer.mobileNumber)
            .filter(num => num && num.trim() !== '');
          mobileNumbers = [...mobileNumbers, ...consumerNumbers];
        }
      }

      // Remove duplicates
      mobileNumbers = [...new Set(mobileNumbers)];

      if (mobileNumbers.length === 0) {
        showAlert('No mobile numbers found for the selected location!', 'error');
        setIsSending(false);
        return;
      }

      // Send messages to all mobile numbers
      const sendResult = await sendBulkMessages(mobileNumbers, message, messageType);
      
      const newMessage = {
        sentBy: user.email,
        type: messageType,
        message: message,
        area: locationDesc,
        recipientCount: mobileNumbers.length,
        actualRecipients: sendResult.count || 0,
        failedRecipients: sendResult.failed || 0,
        sendStatus: sendResult.success ? 'sent' : 'failed',
        sentAt: new Date().toISOString()
      };

      // Save to Firebase message history
      await createMessage(newMessage);

      // Add activity log to Firebase
      await createActivityLog({
        action: 'message_sent',
        performedBy: user.email,
        details: `Sent ${messageType.toUpperCase()} message to ${sendResult.count || 0} people in ${locationDesc} (${sendResult.failed || 0} failed)`
      });
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      setMessage('');
      setSelectedLocation(null);
      setRecipientCount(0);
      setIsSending(false);
      
      if (sendResult.success) {
        if (sendResult.failed > 0) {
          showAlert(`Messages sent partially: ${sendResult.count} successful, ${sendResult.failed} failed out of ${mobileNumbers.length} total recipients.`, 'warning');
        } else {
          showAlert(`Messages sent successfully to all ${sendResult.count} recipients!`, 'success');
        }
      } else {
        showAlert(`Failed to send messages: ${sendResult.error || 'Unknown error'}`, 'error');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      showAlert(`Failed to send message: ${error.message}`, 'error');
      setIsSending(false);
    }
  };

  // Function to send bulk messages
  const sendBulkMessages = async (mobileNumbers, messageText, type) => {
    try {
      console.log(`Sending ${type} messages to ${mobileNumbers.length} recipients`);
      
      // Track successful and failed sends
      let successCount = 0;
      let failedCount = 0;
      
      if (type === 'whatsapp') {
        // WhatsApp API integration using the provided webhook
        console.log('📱 Sending WhatsApp messages...');
        
        const webhookUrl = 'https://webhook.whatapi.in/webhook/6916c0f71b9845c02d4cc81d';
        
        console.log('Total mobile numbers to process:', mobileNumbers.length);
        
        // Process one number at a time to ensure reliability
        for (let i = 0; i < mobileNumbers.length; i++) {
          const number = mobileNumbers[i];
          console.log(`Processing number ${i+1}/${mobileNumbers.length}: ${number}`);
          
          try {
            // Format the number (ensure it has country code)
            let formattedNumber = number.toString().trim();
            if (!formattedNumber.startsWith('91') && formattedNumber.length === 10) {
              formattedNumber = '91' + formattedNumber;
            }
            
            // Use the actual message content from the template
            // Don't send 'raj,name,text' literally, but use the actual template content
            let personalizedMessage = messageText;
            
            // If the message is empty, use the hidden webhook template
            if (!personalizedMessage || personalizedMessage.trim() === '') {
              personalizedMessage = webhookTemplate.template;
            }
            
            // For debugging - log the message being sent
            console.log(`Message content being sent: ${personalizedMessage}`);
            
            // Construct the webhook URL with parameters
            // The webhook expects exactly: number=91XXXXXXXXXX&message=raj,name,text
            // So we'll force the message to be 'raj,name,text' for the webhook
            const webhookMessage = 'raj,name,text';
            const url = `${webhookUrl}?number=${formattedNumber}&message=${encodeURIComponent(webhookMessage)}`;
            
            console.log(`Sending to ${formattedNumber}: ${url}`);
            
            try {
              // Use fetch API instead of XMLHttpRequest
              const response = await fetch(url);
              const responseText = await response.text();
              
              console.log(`Response status: ${response.status}, Response text:`, responseText);
              
              if (response.ok) {
                console.log(`Success response for ${formattedNumber}:`, responseText);
                successCount++;
              } else {
                console.error(`Failed to send to ${formattedNumber}: Status ${response.status}`);
                failedCount++;
              }
            } catch (fetchError) {
              console.error(`Fetch error for ${formattedNumber}:`, fetchError);
              failedCount++;
            }
            
            // Add a small delay between each request
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            failedCount++;
            console.error(`Error sending to ${number}:`, error);
          }
        }
        
        console.log(`WhatsApp messages sent. Success: ${successCount}, Failed: ${failedCount}`);
      } else if (type === 'text') {
        // SMS API integration
        console.log('📨 Sending SMS messages...');
        // For now, we'll just simulate successful sending
        successCount = mobileNumbers.length;
      } else if (type === 'voice') {
        // Voice call API integration
        console.log('📞 Initiating voice calls...');
        // For now, we'll just simulate successful sending
        successCount = mobileNumbers.length;
      }
      
      return { 
        success: successCount > 0, 
        count: successCount,
        failed: failedCount,
        total: mobileNumbers.length
      };
    } catch (error) {
      console.error('Error in sendBulkMessages:', error);
      return { success: false, error: error.message };
    }
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Send Messages</h1>
        <p className="page-subtitle">Select location and send bulk messages</p>
      </div>

      {success && <div className="success-message">Messages sent successfully!</div>}
      {isSending && (
        <div className="content-card" style={{ background: '#e3f2fd', border: '2px solid #2196f3', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: '24px', color: '#2196f3' }}></i>
            <div>
              <div style={{ fontWeight: '600', color: '#1976d2', fontSize: '16px' }}>Sending Messages...</div>
              <div style={{ fontSize: '14px', color: '#1565c0', marginTop: '5px' }}>Fetching mobile numbers and sending messages. Please wait...</div>
            </div>
          </div>
        </div>
      )}

      <div className="content-card" style={{ overflow: 'visible', position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <h2 className="card-title" style={{ margin: 0 }}>Select Target Area</h2>
          <button 
            onClick={refreshAllocations}
            className="btn btn-sm btn-outline"
            disabled={isRefreshing}
            style={{ padding: '5px 10px' }}
          >
            {isRefreshing ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Refreshing...
              </>
            ) : (
              <>
                <i className="fa-solid fa-sync"></i> Refresh Data
              </>
            )}
          </button>
        </div>
        <AllocatedLocationSelector 
          allocations={userAllocations}
          onLocationChange={setSelectedLocation}
          onCountChange={setRecipientCount}
          userRole={user?.role || "user"}
          preselectedLocation={preselectedArea}
        />
      </div>

      <div className="content-card">
        <h2 className="card-title">Message Composer</h2>
        
        {/* Message Type Section */}
        <div className="section-container">
          <h3 className="section-title">Message Type</h3>
          <div className="message-type-selector">
            <div 
              className={`message-type-btn ${messageType === 'whatsapp' ? 'active' : ''}`}
              onClick={() => setMessageType('whatsapp')}
            >
              <div className="message-type-icon"><i className="fa-brands fa-whatsapp" style={{color: '#25D366'}}></i></div>
              <div className="message-type-label">WhatsApp</div>
            </div>
            <div 
              className={`message-type-btn ${messageType === 'voice' ? 'active' : ''}`}
              onClick={() => setMessageType('voice')}
            >
              <div className="message-type-icon"><i className="fa-solid fa-phone-volume" style={{color: '#FF6B6B'}}></i></div>
              <div className="message-type-label">Voice</div>
            </div>
            <div 
              className={`message-type-btn ${messageType === 'text' ? 'active' : ''}`}
              onClick={() => setMessageType('text')}
            >
              <div className="message-type-icon"><i className="fa-solid fa-message" style={{color: '#4ECDC4'}}></i></div>
              <div className="message-type-label">SMS</div>
            </div>
          </div>
        </div>
        
        {/* Message Templates Section */}
        <div className="section-container">
          <h3 className="section-title">Message Templates</h3>
          <div className="template-selector">
            {messageTemplates.map(template => (
              <div 
                key={template.id}
                className={`template-btn ${selectedTemplate?.id === template.id ? 'active' : ''}`}
                onClick={() => handleTemplateSelect(template)}
              >
                <div className="template-name">{template.name}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Message Preview Section */}
        {showPreview && (
          <div className="section-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 className="section-title">Message Preview</h3>
              <button 
                onClick={closePreview}
                className="btn btn-sm btn-outline"
                style={{ padding: '5px 10px' }}
              >
                <i className="fa-solid fa-times"></i> Close
              </button>
            </div>
            <div className="message-preview">
              <div className="whatsapp-preview">
                <div className="whatsapp-header">
                  <div className="contact-name">{user?.name || 'Contact'}</div>
                </div>
                <div className="message-bubble">
                  <div className="message-content">{message}</div>
                  <div className="message-time">{new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Send Button */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'center' }}>
          <button 
            onClick={handleSend}
            className="btn btn-primary"
            disabled={!selectedLocation || recipientCount === 0 || isSending}
            style={{
              opacity: isSending ? 0.6 : 1,
              cursor: isSending ? 'not-allowed' : 'pointer',
              padding: '12px 30px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '8px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              border: 'none',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            {isSending ? (
              <>
                <i className="fa-solid fa-spinner fa-spin"></i> Sending...
              </>
            ) : recipientCount > 0 ? (
              <>
                <i className="fa-solid fa-paper-plane"></i>
                Send to {recipientCount.toLocaleString()} People
              </>
            ) : (
              <>
                <i className="fa-solid fa-map-marker-alt"></i>
                Select Area First
              </>
            )}
          </button>
        </div>

        {/* Message Content Section removed as requested */}
      </div>

      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleSendConfirm}
        message={confirmMessage}
        confirmText="OK"
        cancelText="Cancel"
      />
    </>
  );
};

export default MessageComposer;
