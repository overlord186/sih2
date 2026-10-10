const { execSync } = require('child_process');

console.log('🚀 Running 10-Iteration Consecutive Test Master Loop...\n');

for (let i = 1; i <= 10; i++) {
  console.log(`\n=============================================================`);
  console.log(`🌀 ITERATION ${i} / 10 — RUNNING SUITES`);
  console.log(`=============================================================`);
  
  // 1. Run Physics Invariants Test
  const out1 = execSync('node scripts/run_physics_tests.cjs', { encoding: 'utf8' });
  console.log(out1.trim());

  // 2. Run Planetary Observatory 3D Physics Simulator Test
  const out2 = execSync('node scripts/run_observatory_simulator_tests.cjs', { encoding: 'utf8' });
  console.log(out2.trim());

  // 3. Run Earth Nullschool Redesign Test Suite
  const out3 = execSync('node scripts/run_nullschool_tests.cjs', { encoding: 'utf8' });
  console.log(out3.trim());

  // 4. Run Deep System Test
  const out4 = execSync('node scripts/run_10_cycle_deep_tests.cjs', { encoding: 'utf8' });
  console.log(out4.split('\n').filter(line => line.includes('🏆') || line.includes('CYCLE 10')).join('\n'));
}

console.log('\n🎉 ALL 10 CONSECUTIVE TEST ITERATIONS PASSED WITHOUT A SINGLE FAILURE!');
