#!/usr/bin/env node

/**
 * Simple Replay Test - Test engine with basic scenarios
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🧪 Testing replay scenarios...');

/**
 * Test a basic session
 */
function testBasicSession() {
  console.log('\n1️⃣ Testing basic session...');
  
  const session = initSession('test-basic', './bank/packaged/bank_package_signed.json');
  const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
  
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  const results = finalizeSession(updatedSession.sessionId);
  
  console.log(`✅ Completed ${questionCount} questions`);
  console.log(`📊 Line verdicts:`, results.line_verdicts);
  console.log(`📊 Face states: ${Object.keys(results.face_states).length} faces`);
  
  return true;
}

/**
 * Test picks=0 session
 */
function testPicksZeroSession() {
  console.log('\n2️⃣ Testing picks=0 session...');
  
  const session = initSession('test-picks-zero', './bank/packaged/bank_package_signed.json');
  const updatedSession = setPicks(session.sessionId, []);
  
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  const results = finalizeSession(updatedSession.sessionId);
  
  console.log(`✅ Completed ${questionCount} questions`);
  console.log(`📊 Line verdicts:`, results.line_verdicts);
  console.log(`📊 Face states: ${Object.keys(results.face_states).length} faces`);
  
  return questionCount === 21; // Should be 21 questions for picks=0
}

/**
 * Test broken session (F options)
 */
function testBrokenSession() {
  console.log('\n3️⃣ Testing broken session...');
  
  const session = initSession('test-broken', './bank/packaged/bank_package_signed.json');
  const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
  
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    
    // Try to pick F option if available
    const BankLoader = require('../engine/bankLoader');
    const bankLoader = new BankLoader();
    bankLoader.loadBank('./bank/packaged/bank_package_signed.json');
    const questionData = bankLoader.getQuestion(currentQuestion.qid);
    
    const fOption = questionData?.options?.find(opt => opt.lineCOF === 'F');
    const selectedOption = fOption || questionData?.options?.[0] || { id: 'A' };
    
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, selectedOption.id);
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  const results = finalizeSession(updatedSession.sessionId);
  
  console.log(`✅ Completed ${questionCount} questions`);
  console.log(`📊 Line verdicts:`, results.line_verdicts);
  console.log(`📊 Face states: ${Object.keys(results.face_states).length} faces`);
  
  // Check if we got some F verdicts
  const fVerdicts = Object.values(results.line_verdicts).filter(v => v === 'F').length;
  console.log(`📊 F verdicts: ${fVerdicts}`);
  
  return fVerdicts > 0;
}

/**
 * Run all replay tests
 */
function runAllReplayTests() {
  console.log('🧪 Running replay tests...\n');
  
  const tests = [
    { name: 'Basic Session', fn: testBasicSession },
    { name: 'Picks Zero Session', fn: testPicksZeroSession },
    { name: 'Broken Session', fn: testBrokenSession }
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
  
  console.log(`\n📊 Replay tests: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All replay tests PASSED!');
    return true;
  } else {
    console.log('❌ Some replay tests FAILED!');
    return false;
  }
}

// Run tests
try {
  const success = runAllReplayTests();
  process.exit(success ? 0 : 1);
} catch (error) {
  console.error('❌ Replay test suite failed:', error.message);
  process.exit(1);
}
