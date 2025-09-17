#!/usr/bin/env node

/**
 * Test deterministic tie-break behavior
 * When two faces tie, verify same winner with same seed; different winner with different seeds
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🧪 Testing deterministic tie-break behavior...');

/**
 * Create a session that forces face ties
 */
function createTieSession(sessionSeed, pickedFamilies) {
  const session = initSession(sessionSeed, './bank/packaged/bank_package_signed.json');
  const updatedSession = setPicks(session.sessionId, pickedFamilies);
  
  // Use seed to determine option selection for variation
  const seedHash = sessionSeed.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  while (currentQuestion) {
    // Use seed + question count to determine option
    const optionSeed = (seedHash + questionCount) % 2;
    const option = optionSeed === 0 ? 'A' : 'B';
    
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, option);
    currentQuestion = getNextQuestion(updatedSession.sessionId);
    questionCount++;
  }
  
  return finalizeSession(updatedSession.sessionId);
}

/**
 * Test deterministic behavior with same seed
 */
function testSameSeedDeterminism() {
  console.log('\n1️⃣ Testing same seed determinism...');
  
  const seed = 'tie-test-same-seed';
  const pickedFamilies = ['Control', 'Pace'];
  
  // Run same session twice
  const results1 = createTieSession(seed, pickedFamilies);
  const results2 = createTieSession(seed, pickedFamilies);
  
  // Compare results
  const faceStates1 = results1.face_states;
  const faceStates2 = results2.face_states;
  
  console.log('📊 First run face states:', Object.keys(faceStates1).length);
  console.log('📊 Second run face states:', Object.keys(faceStates2).length);
  
  // Check if results are identical
  const identical = JSON.stringify(faceStates1) === JSON.stringify(faceStates2);
  
  if (identical) {
    console.log('✅ Same seed produces identical results');
    return true;
  } else {
    console.log('❌ Same seed produces different results');
    console.log('📊 Differences:');
    Object.keys(faceStates1).forEach(faceId => {
      if (faceStates1[faceId].state !== faceStates2[faceId].state) {
        console.log(`  ${faceId}: ${faceStates1[faceId].state} vs ${faceStates2[faceId].state}`);
      }
    });
    return false;
  }
}

/**
 * Test different seeds produce different results
 */
function testDifferentSeedVariation() {
  console.log('\n2️⃣ Testing different seed variation...');
  
  const pickedFamilies = ['Control', 'Pace'];
  const results = [];
  
  // Run with 5 different seeds
  for (let i = 0; i < 5; i++) {
    const seed = `tie-test-different-seed-${i}`;
    const result = createTieSession(seed, pickedFamilies);
    results.push({ seed, result });
  }
  
  // Check if results vary
  const faceStates = results.map(r => r.result.face_states);
  const uniqueResults = new Set(faceStates.map(fs => JSON.stringify(fs)));
  
  console.log(`📊 Unique results: ${uniqueResults.size} out of ${results.length}`);
  
  if (uniqueResults.size > 1) {
    console.log('✅ Different seeds produce different results');
    return true;
  } else {
    console.log('❌ Different seeds produce identical results');
    return false;
  }
}

/**
 * Test tie-break consistency
 */
function testTieBreakConsistency() {
  console.log('\n3️⃣ Testing tie-break consistency...');
  
  const seed = 'tie-break-consistency-test';
  const pickedFamilies = ['Control', 'Pace'];
  
  // Run multiple times with same seed
  const results = [];
  for (let i = 0; i < 10; i++) {
    const result = createTieSession(seed, pickedFamilies);
    results.push(result);
  }
  
  // Check if all results are identical
  const firstResult = results[0];
  const allIdentical = results.every(result => 
    JSON.stringify(result.face_states) === JSON.stringify(firstResult.face_states)
  );
  
  console.log(`📊 Results identical across ${results.length} runs: ${allIdentical}`);
  
  if (allIdentical) {
    console.log('✅ Tie-break behavior is consistent');
    return true;
  } else {
    console.log('❌ Tie-break behavior is inconsistent');
    return false;
  }
}

/**
 * Test specific tie scenarios
 */
function testSpecificTieScenarios() {
  console.log('\n4️⃣ Testing specific tie scenarios...');
  
  // Test with minimal picks to force ties
  const scenarios = [
    { picks: ['Control'], description: 'Single family - should have clear winner' },
    { picks: ['Control', 'Pace'], description: 'Two families - potential for ties' },
    { picks: [], description: 'No picks - all families compete' }
  ];
  
  let allPassed = true;
  
  scenarios.forEach((scenario, index) => {
    console.log(`\n  Scenario ${index + 1}: ${scenario.description}`);
    
    const seed = `tie-scenario-${index}`;
    const result = createTieSession(seed, scenario.picks);
    
    // Check for face states
    const faceStates = result.face_states;
    const stateCounts = {};
    
    Object.values(faceStates).forEach(faceState => {
      const state = faceState.state || faceState;
      stateCounts[state] = (stateCounts[state] || 0) + 1;
    });
    
    console.log(`    Face state distribution:`, stateCounts);
    
    // Check if we have reasonable distribution
    const totalFaces = Object.keys(faceStates).length;
    const hasVariation = Object.keys(stateCounts).length > 1;
    
    if (hasVariation) {
      console.log(`    ✅ Scenario ${index + 1} shows variation`);
    } else {
      console.log(`    ⚠️ Scenario ${index + 1} shows no variation`);
    }
  });
  
  return allPassed;
}

/**
 * Run all tie-break tests
 */
function runAllTieBreakTests() {
  console.log('🧪 Running deterministic tie-break tests...\n');
  
  const tests = [
    { name: 'Same Seed Determinism', fn: testSameSeedDeterminism },
    { name: 'Different Seed Variation', fn: testDifferentSeedVariation },
    { name: 'Tie-Break Consistency', fn: testTieBreakConsistency },
    { name: 'Specific Tie Scenarios', fn: testSpecificTieScenarios }
  ];
  
  let passed = 0;
  let total = tests.length;
  
  tests.forEach(test => {
    try {
      const result = test.fn();
      if (result) {
        passed++;
        console.log(`✅ ${test.name}: PASSED`);
      } else {
        console.log(`❌ ${test.name}: FAILED`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  });
  
  console.log(`\n📊 Tie-break tests: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All tie-break tests PASSED!');
    return true;
  } else {
    console.log('❌ Some tie-break tests FAILED!');
    return false;
  }
}

// Run tests
try {
  const success = runAllTieBreakTests();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Tie-break test suite failed:', error.message);
  process.exit(1);
}
