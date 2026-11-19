export const config = {
  port: Number(process.env.PORT || 3001),
  host: process.env.HOST || '0.0.0.0',
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // MySQL 8.0 Settings
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || process.env.DB_PASS || '',
    database: process.env.DB_NAME || process.env.DB_DATABASE || 'engine_que_salon',
    connectionLimit: 10,
    ssl: (
      process.env.DB_SSL === 'true' ||
      process.env.DB_PORT === '4000' ||
      (process.env.DB_HOST || '').includes('tidbcloud.com')
    )
      ? { minVersion: 'TLSv1.2', rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' }
      : undefined,
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

  // CORS Configuration
  cors: {
    allowedOrigins: (process.env.CORS_ALLOWED_ORIGINS || '')
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .filter(Boolean),
  },
};
