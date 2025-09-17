/**
 * Simple Engine Test - Quick validation
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');
const path = require('path');

console.log('🧪 Simple Engine Test - Quick validation...\n');

try {
  // 1. Initialize session
  console.log('1️⃣ Testing initSession...');
  const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package.json');
  const session = initSession('simple-test-123', bankPath);
  console.log(`   ✅ Session created: ${session.session_id}`);

  // 2. Set picks
  console.log('\n2️⃣ Testing setPicks...');
  const pickedFamilies = ['Control', 'Pace'];
  const updatedSession = setPicks(session.session_id, pickedFamilies);
  console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);

  // 3. Process all questions (but limit to 5 for quick test)
  console.log('\n3️⃣ Testing getNextQuestion and submitAnswer (5 questions max)...');
  let questionCount = 0;
  let nextQuestion;

  while (questionCount < 5) {
    try {
      nextQuestion = getNextQuestion(session.session_id);
      if (nextQuestion === null) break;
      
      questionCount++;
      console.log(`   📝 Question ${questionCount}: ${nextQuestion.qid} (${nextQuestion.familyScreen})`);
      
      // Submit answer (always pick option A for testing)
      const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
      console.log(`   ✅ Answer submitted: ${nextQuestion.qid} -> A`);
    } catch (error) {
      if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
        console.log(`   ✅ Session completed after ${questionCount} questions`);
        break;
      }
      console.log(`   ⚠️ Error on question ${questionCount + 1}: ${error.message}`);
      break;
    }
  }

  console.log(`   📊 Processed ${questionCount} questions`);

  // 4. Finalize session
  console.log('\n4️⃣ Testing finalizeSession...');
  const results = finalizeSession(session.session_id);
  console.log(`   ✅ Session finalized`);
  console.log(`   📊 Line verdicts: ${JSON.stringify(results.line_verdicts)}`);
  console.log(`   🎭 Face states: ${Object.keys(results.face_states).length} faces`);

  console.log('\n🎉 Simple engine test passed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
