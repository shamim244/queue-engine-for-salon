export const config = {
  port: Number(process.env.PORT || 3000),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MySQL 8.0 Settings
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'engine_que_salon',
    connectionLimit: 10,
  },

  // WhatsApp / SMS
  whatsapp: {
    mockMode: process.env.WHATSAPP_MOCK_MODE !== 'false',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
  },

  // Defaults
  defaultCurrency: process.env.DEFAULT_CURRENCY || 'INR',
  defaultCountryCode: process.env.DEFAULT_COUNTRY_CODE || '+91',
};
