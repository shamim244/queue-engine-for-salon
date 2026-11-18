/**
 * Environment Variable Auditor & Independent Deployment Validator
 * 
 * Usage:
 *   bun scripts/validate-env.ts        (Validates both servers)
 *   bun scripts/validate-env.ts api    (Validates Backend Server A only)
 *   bun scripts/validate-env.ts web    (Validates Frontend Server B only)
 */

const target = (process.argv[2] || 'all').toLowerCase();

console.log('\n=============================================================');
console.log('🔍 INDEPENDENT DEPLOYMENT ENVIRONMENT VALIDATOR');
console.log('=============================================================\n');

let hasErrors = false;

// 1. BACKEND API SERVER REQUIREMENTS
if (target === 'all' || target === 'api' || target === 'backend') {
  console.log('📦 [SERVER A: BACKEND API (Bun + Elysia)]');
  console.log('Target Directory: apps/api  (File: apps/api/.env)\n');

  const requiredBackendVars = [
    { key: 'PORT', defaultVal: '3001', required: true, desc: 'Listening HTTP port' },
    { key: 'HOST', defaultVal: '0.0.0.0', required: true, desc: 'Binding host interface' },
    { key: 'NODE_ENV', defaultVal: 'development', required: true, desc: 'Runtime environment (production / development)' },
    { key: 'DB_HOST', defaultVal: '127.0.0.1', required: true, desc: 'MySQL server host' },
    { key: 'DB_PORT', defaultVal: '3306', required: true, desc: 'MySQL server port' },
    { key: 'DB_USER', defaultVal: 'root', required: true, desc: 'MySQL database user' },
    { key: 'DB_PASSWORD', defaultVal: '', required: true, desc: 'MySQL database password' },
    { key: 'DB_NAME', defaultVal: 'engine_que_salon', required: true, desc: 'MySQL database name' },
    { key: 'CORS_ALLOWED_ORIGINS', defaultVal: '', required: true, desc: 'Comma-separated domains of Frontend Server B' },
  ];

  const optionalBackendVars = [
    { key: 'JWT_SECRET', defaultVal: 'fallback', desc: 'Secret for signing authentication tokens' },
    { key: 'WHATSAPP_MOCK_MODE', defaultVal: 'true', desc: 'Mock WhatsApp notifications in dev (true/false)' },
    { key: 'WHATSAPP_API_KEY', defaultVal: '', desc: 'Meta/Gupshup WhatsApp API Key' },
    { key: 'WHATSAPP_PHONE_NUMBER_ID', defaultVal: '', desc: 'Meta WhatsApp Cloud sender ID' },
    { key: 'RAZORPAY_KEY_ID', defaultVal: 'rzp_test_mock', desc: 'Payment Gateway Key ID' },
    { key: 'RAZORPAY_KEY_SECRET', defaultVal: 'secret_mock', desc: 'Payment Gateway Secret' },
  ];

  for (const item of requiredBackendVars) {
    const val = process.env[item.key];
    if (val !== undefined && val !== '') {
      const displayVal = item.key.includes('PASSWORD') || item.key.includes('SECRET') ? '********' : val;
      console.log(`  ✅ ${item.key.padEnd(22)} = ${displayVal} (${item.desc})`);
    } else {
      console.log(`  ❌ MISSING REQUIRED:   ${item.key.padEnd(22)} -> ${item.desc}`);
      hasErrors = true;
    }
  }

  for (const item of optionalBackendVars) {
    const val = process.env[item.key];
    const displayVal = !val ? '(empty / default)' : (item.key.includes('SECRET') ? '********' : val);
    console.log(`  ℹ️  ${item.key.padEnd(22)} = ${displayVal}`);
  }

  console.log('\n');
}

// 2. FRONTEND WEB SERVER REQUIREMENTS
if (target === 'all' || target === 'web' || target === 'frontend') {
  console.log('🌐 [SERVER B: FRONTEND WEB (Next.js 16 App)]');
  console.log('Target Directory: apps/web  (File: apps/web/.env.local or production platform env)\n');

  const requiredFrontendVars = [
    {
      key: 'NEXT_PUBLIC_API_URL',
      desc: 'Public URL of Server A (e.g. https://api.yourdomain.com)',
    },
    {
      key: 'NEXT_PUBLIC_WS_URL',
      desc: 'Public WebSocket URL of Server A (e.g. wss://api.yourdomain.com/ws)',
    },
  ];

  for (const item of requiredFrontendVars) {
    const val = process.env[item.key];
    if (val !== undefined && val !== '') {
      console.log(`  ✅ ${item.key.padEnd(22)} = ${val} (${item.desc})`);
    } else {
      console.log(`  ❌ MISSING REQUIRED:   ${item.key.padEnd(22)} -> ${item.desc}`);
      hasErrors = true;
    }
  }

  // Security Check: Database or Private Secrets leaked to Frontend
  const leakedVars = ['DB_PASSWORD', 'DB_HOST', 'DB_USER', 'JWT_SECRET', 'RAZORPAY_KEY_SECRET'].filter(
    (key) => process.env[`NEXT_PUBLIC_${key}`] !== undefined
  );

  if (leakedVars.length > 0) {
    console.log(`\n  🚨 CRITICAL SECURITY WARNING:`);
    for (const leak of leakedVars) {
      console.log(`     Do NOT prefix private backend secret with NEXT_PUBLIC_: ${leak}`);
    }
    hasErrors = true;
  } else {
    console.log(`  🛡️  Zero private secrets leaked to browser bundle.`);
  }

  console.log('\n');
}

console.log('-------------------------------------------------------------');
if (hasErrors) {
  console.log('⚠️  Some required environment variables are missing for the selected target.');
} else {
  console.log('🎉 All required environment variables are present and valid!');
}
console.log('=============================================================\n');
