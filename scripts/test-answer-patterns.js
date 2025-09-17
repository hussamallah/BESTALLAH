#!/usr/bin/env node

/**
 * Test Answer Patterns
 * Tests the engine with different answer patterns
 */

const engine = require('../engine/index');

console.log('🧪 Testing Different Answer Patterns...\n');

// Test 1: All A answers
console.log('🔍 Test 1: All A Answers');
try {
  const result1 = engine.initSession('test-all-a', './bank/packaged/bank_package_signed.json');
  const sessionId1 = result1.session_id;
  engine.setPicks(sessionId1, ['Control', 'Pace', 'Boundary']);
  
  let questionCount = 0;
  for (let i = 0; i < 18; i++) {
    const question = engine.getNextQuestion(sessionId1);
    if (question) {
      questionCount++;
      engine.submitAnswer(sessionId1, question.qid, 'A');
    }
  }
  
  const finalResult1 = engine.finalizeSession(sessionId1);
  console.log(`  ✅ Completed - ${questionCount} questions answered`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult1.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult1.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult1.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

// Test 2: All B answers
console.log('🔍 Test 2: All B Answers');
try {
  const result2 = engine.initSession('test-all-b', './bank/packaged/bank_package_signed.json');
  const sessionId2 = result2.session_id;
  engine.setPicks(sessionId2, ['Truth', 'Recognition', 'Bonding']);
  
  let questionCount = 0;
  for (let i = 0; i < 18; i++) {
    const question = engine.getNextQuestion(sessionId2);
    if (question) {
      questionCount++;
      engine.submitAnswer(sessionId2, question.qid, 'B');
    }
  }
  
  const finalResult2 = engine.finalizeSession(sessionId2);
  console.log(`  ✅ Completed - ${questionCount} questions answered`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult2.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult2.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult2.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

// Test 3: Mixed A/B pattern
console.log('🔍 Test 3: Mixed A/B Pattern');
try {
  const result3 = engine.initSession('test-mixed', './bank/packaged/bank_package_signed.json');
  const sessionId3 = result3.session_id;
  engine.setPicks(sessionId3, ['Control', 'Truth']);
  
  let questionCount = 0;
  for (let i = 0; i < 18; i++) {
    const question = engine.getNextQuestion(sessionId3);
    if (question) {
      questionCount++;
      const answer = i % 2 === 0 ? 'A' : 'B';
      engine.submitAnswer(sessionId3, question.qid, answer);
    }
  }
  
  const finalResult3 = engine.finalizeSession(sessionId3);
  console.log(`  ✅ Completed - ${questionCount} questions answered`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult3.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult3.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult3.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

// Test 4: Random pattern
console.log('🔍 Test 4: Random Pattern');
try {
  const result4 = engine.initSession('test-random', './bank/packaged/bank_package_signed.json');
  const sessionId4 = result4.session_id;
  engine.setPicks(sessionId4, ['Control', 'Pace', 'Boundary', 'Truth']);
  
  let questionCount = 0;
  for (let i = 0; i < 18; i++) {
    const question = engine.getNextQuestion(sessionId4);
    if (question) {
      questionCount++;
      const answer = Math.random() > 0.5 ? 'A' : 'B';
      engine.submitAnswer(sessionId4, question.qid, answer);
    }
  }
  
  const finalResult4 = engine.finalizeSession(sessionId4);
  console.log(`  ✅ Completed - ${questionCount} questions answered`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult4.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult4.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult4.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

// Test 5: Picks=7 edge case
console.log('🔍 Test 5: Picks=7 Edge Case');
try {
  const result5 = engine.initSession('test-picks-seven', './bank/packaged/bank_package_signed.json');
  const sessionId5 = result5.session_id;
  engine.setPicks(sessionId5, ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress']);
  
  let questionCount = 0;
  for (let i = 0; i < 14; i++) { // Should be 14 questions for picks=7
    const question = engine.getNextQuestion(sessionId5);
    if (question) {
      questionCount++;
      engine.submitAnswer(sessionId5, question.qid, 'A');
    }
  }
  
  const finalResult5 = engine.finalizeSession(sessionId5);
  console.log(`  ✅ Completed - ${questionCount} questions answered (expected 14)`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult5.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult5.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult5.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

// Test 6: Picks=1 edge case
console.log('🔍 Test 6: Picks=1 Edge Case');
try {
  const result6 = engine.initSession('test-picks-one', './bank/packaged/bank_package_signed.json');
  const sessionId6 = result6.session_id;
  engine.setPicks(sessionId6, ['Control']);
  
  let questionCount = 0;
  for (let i = 0; i < 20; i++) { // Should be 20 questions for picks=1
    const question = engine.getNextQuestion(sessionId6);
    if (question) {
      questionCount++;
      engine.submitAnswer(sessionId6, question.qid, 'B');
    }
  }
  
  const finalResult6 = engine.finalizeSession(sessionId6);
  console.log(`  ✅ Completed - ${questionCount} questions answered (expected 20)`);
  console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult6.line_verdicts)}`);
  console.log(`  🎭 Face States: ${Object.keys(finalResult6.face_states).length} faces`);
  console.log(`  🚩 QA Flags: ${finalResult6.qa_flags?.length || 0}\n`);
} catch (error) {
  console.error(`  ❌ Failed: ${error.message}\n`);
}

console.log('🎉 Answer Pattern Testing Complete!');
