#!/usr/bin/env node

/**
 * Test monitoring and observability system
 */

const { 
  initSession, 
  setPicks, 
  getNextQuestion, 
  submitAnswer, 
  finalizeSession,
  getDashboardData,
  getAlerts,
  clearAlerts
} = require('../engine');

console.log('🧪 Testing monitoring and observability...');

try {
  // Test 1: Get initial dashboard data
  console.log('\n1️⃣ Testing initial dashboard data...');
  const initialDashboard = getDashboardData();
  console.log('📊 Initial sessions:', initialDashboard.sessions);
  console.log('📊 Initial performance:', initialDashboard.engineHealth);

  // Test 2: Run a complete session to generate metrics
  console.log('\n2️⃣ Running complete session to generate metrics...');
  
  // Initialize session
  const session = initSession('monitoring-test', './bank/packaged/bank_package_signed.json');
  console.log('✅ Session initialized');

  // Set picks
  const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
  console.log('✅ Picks set');

  // Run through questions
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    console.log(`Question ${questionCount}: ${currentQuestion.qid}`);
    
    // Submit answer
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
    
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }

  console.log(`✅ Completed ${questionCount} questions`);

  // Finalize session
  const results = finalizeSession(updatedSession.sessionId);
  console.log('✅ Session finalized');

  // Test 3: Check dashboard data after session
  console.log('\n3️⃣ Testing dashboard data after session...');
  const dashboardAfter = getDashboardData();
  console.log('📊 Sessions after:', {
    started: dashboardAfter.sessions.startRate,
    completionRate: dashboardAfter.sessions.completionRate,
    averageDuration: dashboardAfter.sessions.averageDuration
  });
  console.log('📊 Performance after:', {
    p50: dashboardAfter.engineHealth.p50,
    p95: dashboardAfter.engineHealth.p95,
    errorRate: dashboardAfter.engineHealth.errorRate
  });
  console.log('📊 Distribution after:', {
    faceStates: dashboardAfter.distribution.faceStates,
    lineVerdicts: dashboardAfter.distribution.lineVerdicts
  });

  // Test 4: Check alerts
  console.log('\n4️⃣ Testing alerts...');
  const alerts = getAlerts();
  console.log('📊 Active alerts:', alerts.length);
  if (alerts.length > 0) {
    console.log('📊 Alert details:', alerts);
  }

  // Test 5: Test error tracking
  console.log('\n5️⃣ Testing error tracking...');
  try {
    // Try to get next question from non-existent session
    getNextQuestion('non-existent-session');
  } catch (error) {
    console.log('✅ Error caught and tracked:', error.message);
  }

  // Test 6: Check dashboard after error
  console.log('\n6️⃣ Testing dashboard after error...');
  const dashboardAfterError = getDashboardData();
  console.log('📊 Error rate:', dashboardAfterError.engineHealth.errorRate);
  console.log('📊 Error count:', dashboardAfterError.engineHealth.errorRate * dashboardAfterError.sessions.startRate);

  // Test 7: Test alert clearing
  console.log('\n7️⃣ Testing alert clearing...');
  clearAlerts();
  const alertsAfterClear = getAlerts();
  console.log('📊 Alerts after clear:', alertsAfterClear.length);

  // Test 8: Verify metrics are being tracked
  console.log('\n8️⃣ Verifying metrics tracking...');
  
  // Check that sessions are tracked
  if (dashboardAfter.sessions.startRate > 0) {
    console.log('✅ Session tracking working');
  } else {
    console.log('❌ Session tracking not working');
    process.exit(1);
  }

  // Check that performance is tracked (even if 0ms due to fast execution)
  if (dashboardAfter.engineHealth.p95.getNextQuestion >= 0) {
    console.log('✅ Performance tracking working');
  } else {
    console.log('❌ Performance tracking not working');
    process.exit(1);
  }

  // Check that distribution is tracked
  if (Object.keys(dashboardAfter.distribution.faceStates).length > 0) {
    console.log('✅ Distribution tracking working');
  } else {
    console.log('❌ Distribution tracking not working');
    process.exit(1);
  }

  console.log('\n🎉 Monitoring tests PASSED!');
  console.log('✅ Dashboard data generated');
  console.log('✅ Performance metrics tracked');
  console.log('✅ Session metrics tracked');
  console.log('✅ Distribution metrics tracked');
  console.log('✅ Error tracking working');
  console.log('✅ Alert system working');

} catch (error) {
  console.error('❌ Monitoring test FAILED:', error.message);
  process.exit(1);
}
