import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Custom Telemetry Metrics
export const cacheHitRate = new Rate('cache_hits');
export const checkinSuccessRate = new Rate('checkin_success');
export const checkinLatency = new Trend('checkin_duration_ms');
export const totalTicketsCreated = new Counter('total_tickets_created');

/**
 * Default Configuration:
 * Configurable dynamically from CLI:
 *   k6 run load-tests/k6-simulation.js
 *   k6 run -u 20 -d 30s load-tests/k6-simulation.js
 *   k6 run -u 50 -d 1m -e SALON_SLUG=royal load-tests/k6-simulation.js
 */
export const options = {
  vus: __ENV.VUS ? parseInt(__ENV.VUS) : 10,
  duration: __ENV.DURATION || '30s',
  thresholds: {
    http_req_duration: ['p(95)<400'], // 95% of requests under 400ms
    http_req_failed: ['rate<0.02'],   // Error rate under 2%
    checkin_success: ['rate>0.98'],   // 98%+ check-in success
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:3001';
const SALON_SLUG = __ENV.SALON_SLUG || 'royal';

const INDIAN_NAMES = [
  'Rahul Sharma', 'Amit Verma', 'Vikram Singh', 'Rohan Gupta',
  'Priya Patel', 'Sunil Yadav', 'Arjun Verma', 'Deepak Kumar',
  'Manish Tiwari', 'Karan Mehra', 'Sanjay Rathore', 'Aakash Verma',
  'Sameer Khan', 'Naveen Joshi', 'Abhishek Dubey', 'Rajesh Nair'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomPhone() {
  // Valid Indian 10-digit mobile number starting with 98 / 97 / 96 / 99
  const prefix = getRandomItem(['98', '97', '96', '99', '95']);
  const rest = Math.floor(10000000 + Math.random() * 90000000);
  return `${prefix}${rest}`.slice(0, 10);
}

export default function () {
  // Generate realistic simulated client IP to bypass single-IP rate limits in distributed load
  const clientIp = `103.21.${(__VU % 200) + 1}.${(__ITER % 250) + 1}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36',
    'Accept-Encoding': 'gzip, deflate, br',
    'X-Forwarded-For': clientIp,
  };

  let salonId = null;
  let services = [];

  // ==========================================
  // Step 1: Browse Salon Storefront / Catalog
  // ==========================================
  group('1. Browse Salon Storefront (Cached)', function () {
    const res = http.get(`${BASE_URL}/api/salons/${SALON_SLUG}`, { headers: defaultHeaders });
    
    const isOk = check(res, {
      'catalog status is 200': (r) => r.status === 200,
      'has salon data': (r) => {
        try {
          const json = r.json();
          return json && json.salon && json.salon.slug === SALON_SLUG;
        } catch {
          return false;
        }
      },
    });

    if (isOk) {
      try {
        const body = res.json();
        salonId = body.salon.id;
        services = body.salon.services || [];
        
        // Track cache engine telemetry
        const cacheEngine = res.headers['X-Cache-Engine'] || res.headers['x-cache-engine'];
        if (cacheEngine === 'REDIS' || cacheEngine === 'IN_MEMORY_FALLBACK') {
          cacheHitRate.add(1);
        }
      } catch (e) {}
    }
  });

  sleep(0.5); // User reading menu

  // ==========================================
  // Step 2: Fetch Live Waiting Queue
  // ==========================================
  if (salonId) {
    group('2. Fetch Live Queue', function () {
      const res = http.get(`${BASE_URL}/api/queue/active/${salonId}`, { headers: defaultHeaders });
      check(res, {
        'queue status is 200': (r) => r.status === 200,
        'queue has count': (r) => {
          try {
            return typeof r.json().count === 'number';
          } catch {
            return false;
          }
        },
      });
    });
  }

  sleep(1); // User deciding to join queue

  // ==========================================
  // Step 3: Check-in / Join Live Queue
  // ==========================================
  let customerPhone = getRandomPhone();
  let customerName = getRandomItem(INDIAN_NAMES);
  let serviceId = services.length > 0 ? getRandomItem(services).id : null;
  let ticketId = null;

  if (serviceId) {
    group('3. Customer Check-In', function () {
      const payload = JSON.stringify({
        salonSlug: SALON_SLUG,
        customerName: customerName,
        customerPhone: customerPhone,
        serviceId: serviceId,
        stylistId: null, // Any Barber
      });

      const startTime = new Date().getTime();
      const res = http.post(`${BASE_URL}/api/queue/checkin`, payload, { headers: defaultHeaders });
      const duration = new Date().getTime() - startTime;
      checkinLatency.add(duration);

      const success = check(res, {
        'checkin status is 200': (r) => r.status === 200,
        'ticket created': (r) => {
          try {
            const json = r.json();
            return json.success === true && Boolean(json.ticket?.id);
          } catch {
            return false;
          }
        },
      });

      checkinSuccessRate.add(success);

      if (success) {
        totalTicketsCreated.add(1);
        try {
          ticketId = res.json().ticket.id;
        } catch (e) {}
      }
    });
  }

  sleep(1.5); // User checking their ticket

  // ==========================================
  // Step 4: Track Active Ticket (/me portal view)
  // ==========================================
  group('4. Live Ticket Tracker', function () {
    const res = http.get(`${BASE_URL}/api/queue/customer/${customerPhone}`, { headers: defaultHeaders });
    check(res, {
      'customer tickets 200': (r) => r.status === 200,
    });
  });

  sleep(1);
}
