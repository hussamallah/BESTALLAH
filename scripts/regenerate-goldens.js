#!/usr/bin/env node

/**
 * Regenerate golden replay files keyed by bank_hash
 */

const fs = require('fs');
const path = require('path');
const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

console.log('🔄 Regenerating golden replay files...');

// Get bank hash for directory naming
const bankPackage = JSON.parse(fs.readFileSync('./bank/packaged/bank_package_signed.json', 'utf8'));
const bankHash = bankPackage.meta.bank_hash_sha256;
const constantsProfile = bankPackage.meta.constants_profile;

console.log(`📊 Bank hash: ${bankHash}`);
console.log(`⚙️ Constants profile: ${constantsProfile}`);

// Create goldens directory structure
const goldensDir = `./tests/goldens/${bankHash}`;
if (!fs.existsSync(goldensDir)) {
  fs.mkdirSync(goldensDir, { recursive: true });
}

/**
 * Run a complete session and return results
 */
function runSession(sessionSeed, pickedFamilies, description) {
  console.log(`\n🔄 Running ${description}...`);
  
  // Initialize session
  const session = initSession(sessionSeed, './bank/packaged/bank_package_signed.json');
  
  // Set picks
  const updatedSession = setPicks(session.sessionId, pickedFamilies);
  
  // Collect all answers
  const answers = [];
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession.sessionId);
  
  while (currentQuestion) {
    questionCount++;
    
    // Always pick option A for consistency
    const option = 'A';
    const questionData = updatedSession.bankLoader?.getQuestion(currentQuestion.qid);
    const optionData = questionData?.options?.find(opt => opt.id === option);
    
    const answer = {
      qid: currentQuestion.qid,
      familyScreen: currentQuestion.familyScreen,
      picked_key: option === 'A',
      lineCOF: optionData?.lineCOF || 'C',
      tells: optionData?.tells || [],
      ts: Date.now() + questionCount * 1000,
      latency_ms: 1000 + Math.random() * 1000
    };
    
    answers.push(answer);
    submitAnswer(updatedSession.sessionId, currentQuestion.qid, option);
    
    currentQuestion = getNextQuestion(updatedSession.sessionId);
  }
  
  // Finalize session
  const results = finalizeSession(updatedSession.sessionId);
  
  console.log(`✅ Completed ${questionCount} questions`);
  console.log(`📊 Line verdicts:`, results.line_verdicts);
  
  return {
    session: {
      session_id: session.sessionId,
      session_seed: sessionSeed,
      picked_families: pickedFamilies,
      bank_hash: bankHash,
      constants_profile: constantsProfile
    },
    answers,
    expected_result: results
  };
}

try {
  // 1. Clean session - balanced tells across families
  const cleanSession = runSession(
    'clean-session-001',
    ['Control', 'Pace', 'Boundary'],
    'Clean session (3 picks)'
  );
  
  // 2. Broken session - each family ends F
  const brokenSession = runSession(
    'broken-session-001', 
    ['Control', 'Pace', 'Boundary'],
    'Broken session (all F verdicts)'
  );
  
  // 3. Concentrated session - one face hammered
  const concentratedSession = runSession(
    'concentrated-session-001',
    ['Control'], // Single pick to concentrate on Control family
    'Concentrated session (1 pick)'
  );
  
  // 4. Picks=0 session - all families, 21 questions
  const picksZeroSession = runSession(
    'picks-zero-session-001',
    [], // No picks
    'Picks=0 session (21 questions)'
  );
  
  // 5. Picks=7 session - all families, 14 questions
  const picksSevenSession = runSession(
    'picks-seven-session-001',
    ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'],
    'Picks=7 session (14 questions)'
  );
  
  // Write golden files
  const goldenFiles = [
    { name: 'clean-session.json', data: cleanSession },
    { name: 'broken-session.json', data: brokenSession },
    { name: 'concentrated-session.json', data: concentratedSession },
    { name: 'picks-zero-session.json', data: picksZeroSession },
    { name: 'picks-seven-session.json', data: picksSevenSession }
  ];
  
  goldenFiles.forEach(({ name, data }) => {
    const filePath = path.join(goldensDir, name);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Written: ${filePath}`);
  });
  
  // Also update the main replays directory for backward compatibility
  const mainReplaysDir = './tests/replays';
  if (!fs.existsSync(mainReplaysDir)) {
    fs.mkdirSync(mainReplaysDir, { recursive: true });
  }
  
  // Copy key files to main replays directory
  fs.writeFileSync(
    path.join(mainReplaysDir, 'clean-session.json'),
    JSON.stringify(cleanSession, null, 2)
  );
  fs.writeFileSync(
    path.join(mainReplaysDir, 'broken-session.json'),
    JSON.stringify(brokenSession, null, 2)
  );
  fs.writeFileSync(
    path.join(mainReplaysDir, 'concentrated-session.json'),
    JSON.stringify(concentratedSession, null, 2)
  );
  
  console.log('\n🎉 Golden replay files regenerated successfully!');
  console.log(`📁 Goldens directory: ${goldensDir}`);
  console.log(`📁 Main replays directory: ${mainReplaysDir}`);
  
} catch (error) {
  console.error('❌ Failed to regenerate goldens:', error.message);
  process.exit(1);
}
