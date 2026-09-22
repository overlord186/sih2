import http from 'http';

const TEST_QUERIES = [
  {
    name: 'Monsoon Regimes',
    prompt: 'Explain the four synoptic monsoon regimes: Active, Break, Normal, and Post-Monsoon.',
    expectedKeywords: ['Active', 'Break', 'Trough', 'circulation']
  },
  {
    name: 'QRF Bias Correction',
    prompt: 'How does SAMVARTAKA AI use Quantile Regression Forests (QRF) to remove NWP systematic bias?',
    expectedKeywords: ['Quantile', 'bias', 'Pinball', 'loss']
  },
  {
    name: 'Coromandel Coastal Plume',
    prompt: 'Explain the dynamics of the Coromandel Coastal Convective Plume for Chennai (Meenambakkam).',
    expectedKeywords: ['Coromandel', 'Chennai', 'convective', 'convergence']
  },
  {
    name: 'CRPS & CSI Verification Metrics',
    prompt: 'What do CRPS (Continuous Ranked Probability Score) and CSI (Threat Score) measure in rainfall verification?',
    expectedKeywords: ['CRPS', 'CSI', 'Threat', 'verification']
  },
  {
    name: 'Mumbai Cloudburst Orography',
    prompt: 'Analyze the Mumbai coastal cloudburst orographic benchmark.',
    expectedKeywords: ['Mumbai', 'Western Ghats', 'orographic', 'convection']
  },
  {
    name: 'Doppler Radar dBZ',
    prompt: 'What is Doppler radar reflectivity factor (Z) in dBZ?',
    expectedKeywords: ['dBZ', 'reflectivity', 'radar', 'Marshall']
  },
  {
    name: 'Orographic Station Diagnostics (Agumbe/Sohra)',
    prompt: 'Tell me about Agumbe station and Cherrapunji climatology.',
    expectedKeywords: ['Agumbe', 'Cherrapunji', 'orographic', 'rainfall']
  },
  {
    name: 'Hydrological Flood Dynamics',
    prompt: 'Explain Yamuna basin flood warning levels and Brahmaputra discharge during break monsoon.',
    expectedKeywords: ['Yamuna', 'Brahmaputra', 'flood', 'discharge']
  }
];

async function postJson(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      },
      timeout: 8000
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
    req.write(data);
    req.end();
  });
}

async function runLoopDebug() {
  console.log('=== SAMVARTAKA LOOPDEBUG VALIDATION SUITE ===\n');
  let passed = 0;
  let total = TEST_QUERIES.length + 2;

  // 1. Health check
  try {
    const health = await new Promise((resolve, reject) => {
      http.get('http://localhost:3000/api/health', (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => resolve(JSON.parse(body)));
      }).on('error', reject);
    });
    if (health.status === 'ok') {
      console.log('✅ [1/8] Health Check: OK');
      passed++;
    } else {
      console.error('❌ [1/8] Health Check: Unexpected status', health);
    }
  } catch (err) {
    console.error('❌ [1/8] Health Check Failed:', err.message);
  }

  // 2. Battery of chat queries
  for (let i = 0; i < TEST_QUERIES.length; i++) {
    const test = TEST_QUERIES[i];
    const testNum = i + 2;
    try {
      const res = await postJson('/api/chat', { message: test.prompt });
      const text = res.body?.text || '';
      
      // Verify not empty and not the old static 3-bullet repetition
      const isNotOldStaleCanned = !text.includes('Atmospheric State: High-resolution neural post-processing active across subcontinental grids.\n* **Precipitation Regimes:** Monitoring monsoon trough');
      const hasKeywords = test.expectedKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));

      if (res.status === 200 && text.length > 100 && isNotOldStaleCanned && hasKeywords) {
        console.log(`✅ [${testNum}/8] ${test.name}: PASSED (${text.length} chars, keywords matched, dynamic response)`);
        passed++;
      } else {
        console.error(`❌ [${testNum}/8] ${test.name}: FAILED`);
        console.error('   Status:', res.status);
        console.error('   Text preview:', text.slice(0, 150));
      }
    } catch (err) {
      console.error(`❌ [${testNum}/8] ${test.name}: EXCEPTION -`, err.message);
    }
  }

  // 3. Action Planner test
  try {
    const planRes = await postJson('/api/plan', { location: 'Mumbai', occupation: 'Emergency Responder' });
    const planText = planRes.body?.text || '';
    if (planRes.status === 200 && planText.includes('Mumbai') && planText.includes('Emergency Responder')) {
      console.log(`✅ [8/8] Action Planner: PASSED (Plan generated for Mumbai / Emergency Responder)`);
      passed++;
    } else {
      console.error('❌ [8/8] Action Planner: FAILED', planRes);
    }
  } catch (err) {
    console.error('❌ [8/8] Action Planner: EXCEPTION -', err.message);
  }

  console.log(`\n=== LOOPDEBUG SUMMARY: ${passed}/${total} TESTS PASSED ===\n`);
  if (passed === total) {
    console.log('🎉 ALL BATTERY CHECKS COMPLETED WITH SATISFACTORY RESULTS.');
    process.exit(0);
  } else {
    console.error('⚠️ SOME CHECKS FAILED.');
    process.exit(1);
  }
}

runLoopDebug();
