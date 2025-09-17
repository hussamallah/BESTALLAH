#!/usr/bin/env node

/**
 * Create a broken session with F verdicts by selecting F options
 */

const fs = require('fs');
const path = require('path');
const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🔄 Creating broken session with F verdicts...');

try {
  // Initialize session
  const session = initSession('broken-session-manual', './bank/packaged/bank_package_signed.json');
  console.log('✅ Session initialized');

  // Set picks
  const updatedSession = setPicks(session.sessionId, ['Control', 'Pace', 'Boundary']);
  console.log('✅ Picks set');

  // Collect answers with F options selected
  const answers = [];
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    
    // Get question data to find F option
    const questionData = updatedSession.bankLoader?.getQuestion(currentQuestion.qid);
    const fOption = questionData?.options?.find(opt => opt.lineCOF === 'F');
    const selectedOption = fOption || questionData?.options?.[0] || { id: 'A', lineCOF: 'C', tells: [] };
    
    const answer = {
      qid: currentQuestion.qid,
      familyScreen: currentQuestion.familyScreen,
      picked_key: selectedOption.id === 'A',
      lineCOF: selectedOption.lineCOF,
      tells: selectedOption.tells || [],
      ts: Date.now() + questionCount * 1000,
      latency_ms: 1000 + Math.random() * 1000
    };
    
    answers.push(answer);
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, selectedOption.id);
    
    console.log(`Q${questionCount}: ${currentQuestion.qid} -> ${selectedOption.lineCOF}`);
    
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  // Finalize session
  const results = finalizeSession(updatedSession.sessionId);
  
  console.log(`✅ Completed ${questionCount} questions`);
  console.log('📊 Line verdicts:', results.line_verdicts);
  console.log('📊 Face states sample:', Object.keys(results.face_states).slice(0, 5));
  
  // Create broken session data
  const brokenSession = {
    session: {
      session_id: session.sessionId,
      session_seed: 'broken-session-manual',
      picked_families: ['Control', 'Pace', 'Boundary'],
      bank_hash: session.bankHash,
      constants_profile: session.constantsProfile
    },
    answers,
    expected_result: results
  };
  
  // Write to both locations
  const bankHash = session.bankHash;
  const goldensDir = `./tests/goldens/${bankHash}`;
  const mainReplaysDir = './tests/replays';
  
  // Ensure directories exist
  if (!fs.existsSync(goldensDir)) {
    fs.mkdirSync(goldensDir, { recursive: true });
  }
  if (!fs.existsSync(mainReplaysDir)) {
    fs.mkdirSync(mainReplaysDir, { recursive: true });
  }
  
  // Write files
  fs.writeFileSync(
    path.join(goldensDir, 'broken-session.json'),
    JSON.stringify(brokenSession, null, 2)
  );
  fs.writeFileSync(
    path.join(mainReplaysDir, 'broken-session.json'),
    JSON.stringify(brokenSession, null, 2)
  );
  
  console.log('✅ Broken session created successfully!');
  console.log(`📁 Written to: ${path.join(goldensDir, 'broken-session.json')}`);
  console.log(`📁 Written to: ${path.join(mainReplaysDir, 'broken-session.json')}`);
  
} catch (error) {
  console.error('❌ Failed to create broken session:', error.message);
  process.exit(1);
}
