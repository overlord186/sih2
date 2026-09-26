async function testVercel() {
  const domain = 'https://sih26080-monsoon-rainfall-post-proc.vercel.app';
  console.log('--- Testing Vercel Production:', domain, '---');

  // Test 1: HTML & Bundle
  const html = await fetch(domain).then(r => r.text());
  console.log('HTML loaded, length:', html.length);
  for (const line of html.split('\n')) {
    if (line.includes('index-') && line.includes('.js')) {
      console.log('Loaded Bundle tag:', line.trim());
    }
  }

  // Test 2: /api/health
  try {
    const health = await fetch(domain + '/api/health').then(r => r.json());
    console.log('/api/health response:', health);
  } catch (e) {
    console.error('/api/health error:', e.message);
  }

  // Test 3: /api/plan
  try {
    const planRes = await fetch(domain + '/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: 'Nagpur (Sonegaon)',
        occupation: 'Farmer & Agricultural Producer'
      })
    });
    console.log('/api/plan status:', planRes.status);
    const planData = await planRes.json();
    console.log('/api/plan isLive:', planData.isLive, 'modelUsed:', planData.modelUsed);
    console.log('\n--- /api/plan Generated Text Preview ---');
    console.log(planData.text?.slice(0, 600));
    console.log('--- End Preview ---\n');
  } catch (e) {
    console.error('/api/plan error:', e.message);
  }

  // Test 4: /api/chat
  try {
    const chatRes = await fetch(domain + '/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'What is the synoptic profile of Nagpur?'
      })
    });
    console.log('/api/chat status:', chatRes.status);
    const chatData = await chatRes.json();
    console.log('/api/chat isLive:', chatData.isLive, 'modelUsed:', chatData.modelUsed);
    console.log('/api/chat response preview:', chatData.text?.slice(0, 300));
  } catch (e) {
    console.error('/api/chat error:', e.message);
  }
}

testVercel();
