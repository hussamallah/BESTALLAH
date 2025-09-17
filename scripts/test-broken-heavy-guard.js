#!/usr/bin/env node

/**
 * Test broken-heavy guard
 * Craft a replay with many F picks; ensure no face can reach LIT even if q_hits ≥ 6 (blocked by LIT_MAX_BROKEN)
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🧪 Testing broken-heavy guard...');

/**
 * Create a session with many F picks to trigger broken-heavy guard
 */
function createBrokenHeavySession(sessionSeed, pickedFamilies) {
  const session = initSession(sessionSeed, './bank/packaged/bank_package_signed.json');
  const updatedSession = setPicks(session.sessionId, pickedFamilies);
  
  // Run through all questions, strategically picking F options
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  let questionCount = 0;
  
  while (currentQuestion) {
    questionCount++;
    
    // Get question data to find F option
    const BankLoader = require('../engine/bankLoader');
    const bankLoader = new BankLoader();
    bankLoader.loadBank('./bank/packaged/bank_package_signed.json');
    const questionData = bankLoader.getQuestion(currentQuestion.qid);
    
    // Always try to pick F option if available
    const fOption = questionData?.options?.find(opt => opt.lineCOF === 'F');
    const selectedOption = fOption || questionData?.options?.[0] || { id: 'A' };
    
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, selectedOption.id);
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  return finalizeSession(updatedSession.sessionId);
}

/**
 * Test broken-heavy guard with F-heavy session
 */
function testBrokenHeavyGuard() {
  console.log('\n1️⃣ Testing broken-heavy guard with F-heavy session...');
  
  const seed = 'broken-heavy-test';
  const pickedFamilies = ['Control', 'Pace', 'Boundary']; // Pick families that can't reach F
  
  const result = createBrokenHeavySession(seed, pickedFamilies);
  
  console.log('📊 Line verdicts:', result.line_verdicts);
  console.log('📊 Face states sample:', Object.keys(result.face_states).slice(0, 5));
  
  // Check face states
  const faceStates = result.face_states;
  const stateCounts = {};
  const brokenCounts = {};
  
  Object.entries(faceStates).forEach(([faceId, faceState]) => {
    const state = faceState.state || faceState;
    stateCounts[state] = (stateCounts[state] || 0) + 1;
    
    if (faceState.broken) {
      brokenCounts[faceId] = faceState.broken;
    }
  });
  
  console.log('📊 Face state distribution:', stateCounts);
  console.log('📊 Broken counts:', brokenCounts);
  
  // Check if any face reached LIT despite broken context
  const litFaces = Object.entries(faceStates).filter(([faceId, faceState]) => {
    const state = faceState.state || faceState;
    return state === 'LIT';
  });
  
  console.log(`📊 LIT faces: ${litFaces.length}`);
  
  if (litFaces.length > 0) {
    console.log('⚠️ Some faces reached LIT despite broken context:');
    litFaces.forEach(([faceId, faceState]) => {
      console.log(`  ${faceId}: ${faceState.state} (broken: ${faceState.broken})`);
    });
  }
  
  // The guard should prevent LIT if broken >= clean
  const brokenHeavyFaces = Object.entries(faceStates).filter(([faceId, faceState]) => {
    const state = faceState.state || faceState;
    const broken = faceState.broken || 0;
    const clean = faceState.clean || 0;
    return state === 'LIT' && broken >= clean;
  });
  
  if (brokenHeavyFaces.length === 0) {
    console.log('✅ Broken-heavy guard working - no LIT faces with broken >= clean');
    return true;
  } else {
    console.log('❌ Broken-heavy guard failed - LIT faces with broken >= clean:');
    brokenHeavyFaces.forEach(([faceId, faceState]) => {
      console.log(`  ${faceId}: ${faceState.state} (broken: ${faceState.broken}, clean: ${faceState.clean})`);
    });
    return false;
  }
}

/**
 * Test with extreme broken context
 */
function testExtremeBrokenContext() {
  console.log('\n2️⃣ Testing extreme broken context...');
  
  const seed = 'extreme-broken-test';
  const pickedFamilies = []; // No picks - all families get 3 questions each
  
  const result = createBrokenHeavySession(seed, pickedFamilies);
  
  // Analyze face states
  const faceStates = result.face_states;
  const analysis = {};
  
  Object.entries(faceStates).forEach(([faceId, faceState]) => {
    const state = faceState.state || faceState;
    const broken = faceState.broken || 0;
    const clean = faceState.clean || 0;
    const qHits = faceState.q_hits || 0;
    
    analysis[faceId] = {
      state,
      broken,
      clean,
      qHits,
      brokenRatio: clean > 0 ? broken / clean : broken
    };
  });
  
  console.log('📊 Face analysis:');
  Object.entries(analysis).forEach(([faceId, data]) => {
    console.log(`  ${faceId}: ${data.state} (q:${data.qHits}, b:${data.broken}, c:${data.clean}, ratio:${data.brokenRatio.toFixed(2)})`);
  });
  
  // Check for faces that should be blocked by broken-heavy guard
  const blockedFaces = Object.entries(analysis).filter(([faceId, data]) => {
    return data.state === 'LIT' && data.broken >= data.clean;
  });
  
  if (blockedFaces.length === 0) {
    console.log('✅ Extreme broken context properly handled');
    return true;
  } else {
    console.log('❌ Extreme broken context not properly handled:');
    blockedFaces.forEach(([faceId, data]) => {
      console.log(`  ${faceId}: LIT with broken >= clean`);
    });
    return false;
  }
}

/**
 * Test LIT criteria with broken context
 */
function testLITCriteriaWithBroken() {
  console.log('\n3️⃣ Testing LIT criteria with broken context...');
  
  const seed = 'lit-criteria-test';
  const pickedFamilies = ['Control', 'Pace'];
  
  const result = createBrokenHeavySession(seed, pickedFamilies);
  
  // Check each face against LIT criteria
  const faceStates = result.face_states;
  const litAnalysis = {};
  
  Object.entries(faceStates).forEach(([faceId, faceState]) => {
    const state = faceState.state || faceState;
    const broken = faceState.broken || 0;
    const clean = faceState.clean || 0;
    const qHits = faceState.q_hits || 0;
    const famHits = faceState.fam_hits || 0;
    const sig = faceState.sig || 0;
    
    // LIT criteria from constants
    const litCriteria = {
      qHits: qHits >= 6,
      famHits: famHits >= 4,
      sig: sig >= 2,
      clean: clean >= 4,
      broken: broken <= 1,
      brokenLessThanClean: broken < clean,
      contrast: faceState.contrast || false
    };
    
    const meetsCriteria = Object.values(litCriteria).every(c => c);
    
    litAnalysis[faceId] = {
      state,
      meetsCriteria,
      criteria: litCriteria,
      broken,
      clean,
      qHits
    };
  });
  
  console.log('📊 LIT criteria analysis:');
  Object.entries(litAnalysis).forEach(([faceId, data]) => {
    if (data.state === 'LIT') {
      console.log(`  ${faceId}: LIT - meets criteria: ${data.meetsCriteria}`);
      console.log(`    qHits: ${data.qHits} (>=6: ${data.criteria.qHits})`);
      console.log(`    broken: ${data.broken} (<=1: ${data.criteria.broken})`);
      console.log(`    clean: ${data.clean} (>=4: ${data.criteria.clean})`);
      console.log(`    broken < clean: ${data.criteria.brokenLessThanClean}`);
    }
  });
  
  // Check if any LIT faces violate broken-heavy guard
  const violations = Object.entries(litAnalysis).filter(([faceId, data]) => {
    return data.state === 'LIT' && data.broken >= data.clean;
  });
  
  if (violations.length === 0) {
    console.log('✅ LIT criteria properly respect broken-heavy guard');
    return true;
  } else {
    console.log('❌ LIT criteria violations found:');
    violations.forEach(([faceId, data]) => {
      console.log(`  ${faceId}: LIT with broken >= clean`);
    });
    return false;
  }
}

/**
 * Run all broken-heavy guard tests
 */
function runAllBrokenHeavyTests() {
  console.log('🧪 Running broken-heavy guard tests...\n');
  
  const tests = [
    { name: 'Broken-Heavy Guard', fn: testBrokenHeavyGuard },
    { name: 'Extreme Broken Context', fn: testExtremeBrokenContext },
    { name: 'LIT Criteria with Broken', fn: testLITCriteriaWithBroken }
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
  
  console.log(`\n📊 Broken-heavy guard tests: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All broken-heavy guard tests PASSED!');
    return true;
  } else {
    console.log('❌ Some broken-heavy guard tests FAILED!');
    return false;
  }
}

// Run tests
try {
  const success = runAllBrokenHeavyTests();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Broken-heavy guard test suite failed:', error.message);
  process.exit(1);
}
