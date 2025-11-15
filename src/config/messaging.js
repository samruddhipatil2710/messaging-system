// Messaging Configuration
export const MESSAGING_CONFIG = {
  // Webhook URLs - Replace with your actual webhook endpoints
  WEBHOOKS: {
    SMS: 'YOUR_SMS_WEBHOOK_URL_HERE',
    VOICE: 'YOUR_VOICE_WEBHOOK_URL_HERE',
    WHATSAPP: 'YOUR_WHATSAPP_WEBHOOK_URL_HERE' // Optional if using WhatsApp Business API
  },
  
  // Message limits and delays
  LIMITS: {
    MAX_RECIPIENTS_PER_BATCH: 1000,
    DELAY_BETWEEN_MESSAGES: 100, // milliseconds
    MAX_MESSAGE_LENGTH: 1600
  },
  
  // Mobile number formatting
  MOBILE_FORMAT: {
    COUNTRY_CODE: '91', // India
    MIN_LENGTH: 10,
    MAX_LENGTH: 12
  },
  
  // Message templates
  TEMPLATES: {
    SMS_HEADER: 'Message from Government:',
    VOICE_INTRO: 'This is an important message from the government.',
    WHATSAPP_FOOTER: '\n\n- Government of Maharashtra'
  }
};

// Webhook payload structure
export const createWebhookPayload = (messageType, message, recipients, location, sender) => {
  return {
    messageType,
    message,
    recipients,
    location,
    sender,
    timestamp: new Date().toISOString(),
    batchId: `batch_${Date.now()}`,
    totalRecipients: recipients.length
  };
};

// Validate mobile number
export const validateMobileNumber = (mobile) => {
  const cleaned = mobile.toString().replace(/\D/g, '');
  return cleaned.length >= MESSAGING_CONFIG.MOBILE_FORMAT.MIN_LENGTH && 
         cleaned.length <= MESSAGING_CONFIG.MOBILE_FORMAT.MAX_LENGTH;
};

// Format mobile number
export const formatMobileNumber = (mobile) => {
  let formatted = mobile.toString().replace(/\D/g, '');
  if (formatted.length === 10) {
    formatted = MESSAGING_CONFIG.MOBILE_FORMAT.COUNTRY_CODE + formatted;
  }
  return formatted;
};
