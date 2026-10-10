const http = require('http');

function httpRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        const latency = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data,
          latency,
        });
      });
    });

    req.on('error', (err) => {
      const latency = Date.now() - startTime;
      reject({ error: err.message, latency });
    });

    req.setTimeout(12000, () => {
      req.destroy();
      reject({ error: 'Request timeout (12s)', latency: 12000 });
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSingleTest(name, options, postData = null, validator = null) {
  try {
    const res = await httpRequest(options, postData);
    const isValid = validator ? validator(res) : res.statusCode >= 200 && res.statusCode < 400;
    return {
      name,
      passed: isValid,
      statusCode: res.statusCode,
      latency: res.latency,
      details: isValid ? 'OK' : `Failed validation (HTTP ${res.statusCode})`,
    };
  } catch (err) {
    return {
      name,
      passed: false,
      statusCode: 0,
      latency: err.latency || 0,
      details: err.error || String(err),
    };
  }
}

async function runTestSuite(iteration) {
  console.log(`\n======================================================`);
  console.log(`  LOOP TEST RUN #${iteration} [${new Date().toLocaleTimeString()}]`);
  console.log(`======================================================`);

  const tests = [
    // 1. Root HTML on both ports and interfaces
    {
      name: 'Port 3000: GET http://localhost:3000 (HTML)',
      options: { host: 'localhost', port: 3000, path: '/', method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.includes('<!doctype html>'),
    },
    {
      name: 'Port 3000: GET http://127.0.0.1:3000 (HTML)',
      options: { host: '127.0.0.1', port: 3000, path: '/', method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.includes('<!doctype html>'),
    },
    {
      name: 'Port 8080: GET http://localhost:8080 (HTML)',
      options: { host: 'localhost', port: 8080, path: '/', method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.includes('<!doctype html>'),
    },
    {
      name: 'Port 8080: GET http://127.0.0.1:8080 (HTML)',
      options: { host: '127.0.0.1', port: 8080, path: '/', method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.includes('<!doctype html>'),
    },

    // 2. Health Checks
    {
      name: 'Port 3000: GET /api/health',
      options: { host: 'localhost', port: 3000, path: '/api/health', method: 'GET' },
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).status === 'ok',
    },
    {
      name: 'Port 8080: GET /api/health',
      options: { host: 'localhost', port: 8080, path: '/api/health', method: 'GET' },
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).status === 'ok',
    },

    // 3. Every Component Module on the Webpage (Zero Vite Transpile Errors)
    ...[
      '/src/main.tsx',
      '/src/App.tsx',
      '/src/components/Header.tsx',
      '/src/components/MetricCards.tsx',
      '/src/components/LiveMap.tsx',
      '/src/components/ActionPlanner.tsx',
      '/src/components/ChatAssistant.tsx',
      '/src/components/TaylorDiagram.tsx',
      '/src/components/ModelWeightVarianceVisualizer.tsx',
      '/src/components/WeatherRegimeClassifierView.tsx',
      '/src/components/RegimeBreakdownView.tsx',
      '/src/components/DopplerRadarWidget.tsx',
      '/src/components/DopplerRadarModal.tsx',
      '/src/components/WeatherBackground3D.tsx',
      '/src/components/WeatherStage3D.tsx',
      '/src/components/InteractiveGlobe.tsx',
      '/src/components/GlobeSandbox3DSimulator.tsx',
      '/src/components/CinematicIntro.tsx',
      '/src/components/Achievements.tsx',
      '/src/components/ModelTrainingGuideModal.tsx',
      '/src/components/UnifiedGuideHubModal.tsx',
      '/src/components/GlassmorphicGuideModal.tsx',
      '/src/components/StationCommandPalette.tsx',
      '/src/components/SeasonalTrendsModal.tsx',
      '/src/components/WeatherBulletinModal.tsx',
      '/src/components/KidVisualStage.tsx',
      '/src/components/WorkstationSidebarRail.tsx',
      '/src/components/NavigationDrawer.tsx',
      '/src/utils/meteorologicalChatEngine.ts',
      '/src/data/monsoonDataset.ts',
    ].map((modulePath) => ({
      name: `Vite Module: GET ${modulePath}`,
      options: { host: 'localhost', port: 3000, path: modulePath, method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.length > 50,
    })),

    // 4. Verify Chatbot Component has NO floating button in served code
    {
      name: 'Verify ChatAssistant.tsx: No floating button when closed',
      options: { host: 'localhost', port: 3000, path: '/src/components/ChatAssistant.tsx', method: 'GET' },
      validator: (r) => r.statusCode === 200 && r.data.includes('if (!isOpen)') && !r.data.includes('AI Copilot'),
    },

    // 5. Verify CinematicIntro.tsx has NO bottom-right Ask AI button
    {
      name: 'Verify CinematicIntro.tsx: No intro-ask-ai-btn',
      options: { host: 'localhost', port: 3000, path: '/src/components/CinematicIntro.tsx', method: 'GET' },
      validator: (r) => r.statusCode === 200 && !r.data.includes('intro-ask-ai-btn'),
    },

    // 6. Chatbot Tests with 8 Different Meteorological Queries
    {
      name: 'Chatbot Q1: Monsoon Regimes',
      options: { host: 'localhost', port: 3000, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'Explain the four synoptic monsoon regimes: Active, Break, Normal, and Post-Monsoon.', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('Regime'),
    },
    {
      name: 'Chatbot Q2: QRF Bias Correction',
      options: { host: 'localhost', port: 8080, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'How does Quantile Regression Forests (QRF) eliminate systematic drizzle bias?', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 100,
    },
    {
      name: 'Chatbot Q3: Coromandel Plume Dynamics',
      options: { host: 'localhost', port: 3000, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'Explain the dynamics of the Coromandel Coastal Convective Plume for Chennai (Meenambakkam).', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('Chennai'),
    },
    {
      name: 'Chatbot Q4: Western Ghats Orographic Convection',
      options: { host: 'localhost', port: 8080, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'Explain orographic lifting and low-level jet moisture convergence along Mahabaleshwar and Mumbai.', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 100,
    },
    {
      name: 'Chatbot Q5: CRPS & CSI Verification Metrics',
      options: { host: 'localhost', port: 3000, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'What do CRPS (Continuous Ranked Probability Score) and CSI (Critical Success Index) measure in probabilistic rainfall verification?', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('CRPS'),
    },
    {
      name: 'Chatbot Q6: Doppler Radar dBZ Diagnostics',
      options: { host: 'localhost', port: 8080, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'How are Doppler radar reflectivity values above 45 dBZ correlated with mesoscale convective clusters?', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 80,
    },
    {
      name: 'Chatbot Q7: Multi-turn Follow-up Dialogue',
      options: { host: 'localhost', port: 3000, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        message: 'What emergency protocols apply when rainfall exceeds 204.5 mm/24h?',
        history: [
          { role: 'user', parts: [{ text: 'What is the highest IMD classification?' }] },
          { role: 'model', parts: [{ text: 'Extremely Heavy Rainfall corresponds to >204.4 mm in 24 hours under a Red Alert.' }] },
        ],
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 80,
    },
    {
      name: 'Chatbot Q8: Cloudburst and Urban Waterlogging',
      options: { host: 'localhost', port: 8080, path: '/api/chat', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({ message: 'Explain urban hydrology and stormwater overload for metropolitan regions during heavy downpours.', history: [] }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 80,
    },

    // 7. Lead Planner Tests with Multiple Locations and Occupations
    {
      name: 'Lead Planner 1: Farmer & Agriculture (Nagpur)',
      options: { host: 'localhost', port: 3000, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Nagpur (Sonegaon)',
        occupation: 'Farmer & Agricultural Producer',
        weatherContext: { expected7DayMm: 95.4, peakDayRainMm: 45.2, heavyRainProbPct: 70 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('Resilience Plan'),
    },
    {
      name: 'Lead Planner 2: Maritime & Port Transit (Mumbai)',
      options: { host: 'localhost', port: 8080, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Mumbai (Santacruz)',
        occupation: 'Port & Marine Transit Supervisor',
        weatherContext: { expected7DayMm: 210.0, peakDayRainMm: 110.5, heavyRainProbPct: 92 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('Resilience Plan'),
    },
    {
      name: 'Lead Planner 3: Disaster & Emergency Relief (Chennai)',
      options: { host: 'localhost', port: 3000, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Chennai (Meenambakkam)',
        occupation: 'Municipal Disaster Response Officer',
        weatherContext: { expected7DayMm: 80.0, peakDayRainMm: 38.0, heavyRainProbPct: 65 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.includes('Tactical Action Protocol'),
    },
    {
      name: 'Lead Planner 4: Logistics & Supply Chain (Kolkata)',
      options: { host: 'localhost', port: 8080, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Kolkata (Alipore)',
        occupation: 'Fleet Logistics & Freight Operator',
        weatherContext: { expected7DayMm: 135.0, peakDayRainMm: 62.0, heavyRainProbPct: 80 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 200,
    },
    {
      name: 'Lead Planner 5: Power Grid & Utilities (Bengaluru)',
      options: { host: 'localhost', port: 3000, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Bengaluru (HAL)',
        occupation: 'Power Transmission & Substation Engineer',
        weatherContext: { expected7DayMm: 52.0, peakDayRainMm: 28.0, heavyRainProbPct: 45 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 200,
    },
    {
      name: 'Lead Planner 6: Construction & Civil Works (Delhi)',
      options: { host: 'localhost', port: 8080, path: '/api/plan', method: 'POST', headers: { 'Content-Type': 'application/json' } },
      postData: JSON.stringify({
        location: 'Delhi (Safdarjung)',
        occupation: 'Construction Site Manager',
        weatherContext: { expected7DayMm: 68.0, peakDayRainMm: 34.0, heavyRainProbPct: 55 },
      }),
      validator: (r) => r.statusCode === 200 && JSON.parse(r.data).text?.length > 200,
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const result = await runSingleTest(test.name, test.options, test.postData, test.validator);
    if (result.passed) {
      passed++;
      console.log(`  ✓ [PASS] ${result.name.padEnd(55)} (${result.latency}ms) - ${result.details}`);
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${result.name.padEnd(55)} (${result.latency}ms) - ${result.details}`);
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(`  Iteration ${iteration} Summary: ${passed}/${tests.length} Passed (${((passed / tests.length) * 100).toFixed(1)}%)`);

  return { passed, failed, total: tests.length };
}

async function run() {
  const loops = parseInt(process.argv[2], 10) || 5;
  console.log(`\nStarting Comprehensive Continuous Loop Testing (${loops} loops requested)...`);

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  for (let i = 1; i <= loops; i++) {
    const result = await runTestSuite(i);
    totalPassed += result.passed;
    totalFailed += result.failed;
    totalTests += result.total;

    if (result.failed > 0) {
      console.error(`\nStopping early due to failure in iteration ${i}`);
      process.exit(1);
    }
  }

  console.log(`\n======================================================`);
  console.log(`  OVERALL LOOP TESTING RESULTS (${loops} ITERATIONS)`);
  console.log(`======================================================`);
  console.log(`  Total Test Assertions Executed: ${totalTests}`);
  console.log(`  Total Test Assertions Passed:   ${totalPassed}`);
  console.log(`  Total Test Assertions Failed:   ${totalFailed}`);
  console.log(`  Overall Success Rate:           ${((totalPassed / totalTests) * 100).toFixed(2)}%`);
  console.log(`======================================================\n`);

  if (totalFailed === 0) {
    console.log(`SUCCESS: 100% of all requests across all components, queries, and plans passed with zero errors.`);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Test runner fatal exception:', err);
  process.exit(1);
});
