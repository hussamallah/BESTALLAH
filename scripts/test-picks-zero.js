#!/usr/bin/env node

/**
 * Test picks=0 policy (21 questions total)
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🧪 Testing picks=0 policy...');

try {
  // Initialize session
  const session = initSession('picks-zero-test', './bank/packaged/bank_package_signed.json');
  console.log('✅ Session initialized');

  // Set picks=0 (no families picked)
  const updatedSession = setPicks(session.sessionId, []);
  console.log('✅ Picks set to 0 families');

  // Verify schedule has 21 questions
  const schedule = updatedSession.schedule;
  console.log(`📊 Schedule length: ${schedule.length} questions`);
  
  if (schedule.length !== 21) {
    throw new Error(`Expected 21 questions, got ${schedule.length}`);
  }

  // Verify all 7 families are represented with 3 questions each
  const familyCounts = {};
  schedule.forEach(q => {
    const family = q.familyScreen;
    familyCounts[family] = (familyCounts[family] || 0) + 1;
  });

  console.log('📊 Questions per family screen:', familyCounts);
  
  // Each family should have exactly 3 questions
  const expectedFamilies = [1, 2, 3, 4, 5, 6, 7];
  for (const family of expectedFamilies) {
    if (familyCounts[family] !== 3) {
      throw new Error(`Family screen ${family} should have 3 questions, got ${familyCounts[family]}`);
    }
  }

  // Verify question order is C→O→F for each family
  for (const family of expectedFamilies) {
    const familyQuestions = schedule.filter(q => q.familyScreen === family);
    const expectedOrder = ['C', 'O', 'F'];
    const actualOrder = familyQuestions.map(q => q.order_in_family);
    
    if (JSON.stringify(actualOrder) !== JSON.stringify(expectedOrder)) {
      throw new Error(`Family ${family} order should be C→O→F, got ${actualOrder.join('→')}`);
    }
  }

  console.log('✅ All families have correct question counts and order');

  // Test a complete session with picks=0
  console.log('🔄 Running complete picks=0 session...');
  
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    console.log(`Question ${questionCount}: ${currentQuestion.qid} (${currentQuestion.familyScreen})`);
    
    // Submit answer (always pick option A for consistency)
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
    
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }

  console.log(`✅ Completed ${questionCount} questions`);

  // Finalize session
  const results = finalizeSession(updatedSession.sessionId);
  console.log('✅ Session finalized');

  // Verify results structure
  if (!results.line_verdicts || !results.face_states || !results.family_reps) {
    throw new Error('Missing required result fields');
  }

  console.log('📊 Line verdicts:', results.line_verdicts);
  console.log('📊 Face states sample:', Object.keys(results.face_states).slice(0, 5));
  console.log('📊 Family reps:', results.family_reps);

  console.log('🎉 Picks=0 policy test PASSED!');
  console.log('✅ 21 questions total');
  console.log('✅ All 7 families represented');
  console.log('✅ C→O→F order maintained');
  console.log('✅ Session completes successfully');

} catch (error) {
  console.error('❌ Picks=0 policy test FAILED:', error.message);
  process.exit(1);
}
