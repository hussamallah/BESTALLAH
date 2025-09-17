/**
 * Fast Engine Test - Process all questions but with progress tracking
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');
const path = require('path');

console.log('🚀 Fast Engine Test - Process all questions...\n');

try {
  // 1. Initialize session
  console.log('1️⃣ Testing initSession...');
  const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package.json');
  const session = initSession('fast-test-123', bankPath);
  console.log(`   ✅ Session created: ${session.session_id}`);

  // 2. Set picks
  console.log('\n2️⃣ Testing setPicks...');
  const pickedFamilies = ['Control', 'Pace'];
  const updatedSession = setPicks(session.session_id, pickedFamilies);
  console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
  const totalQuestions = Object.values(updatedSession.schedule.per_family).reduce((sum, f) => sum + f.count, 0);
  console.log(`   📊 Total questions to process: ${totalQuestions}`);

  // 3. Process all questions with progress tracking
  console.log('\n3️⃣ Processing all questions...');
  let questionCount = 0;
  let nextQuestion;

  while (true) {
    try {
      nextQuestion = getNextQuestion(session.session_id);
      if (nextQuestion === null) break;
      
      questionCount++;
      
      // Show progress every 5 questions
      if (questionCount % 5 === 0 || questionCount <= 5) {
        console.log(`   📝 Question ${questionCount}/${totalQuestions}: ${nextQuestion.qid} (${nextQuestion.familyScreen})`);
      }
      
      // Submit answer (always pick option A for testing)
      const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
      
      // Show progress every 5 questions
      if (questionCount % 5 === 0 || questionCount <= 5) {
        console.log(`   ✅ Answer submitted: ${nextQuestion.qid} -> A`);
      }
    } catch (error) {
      if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
        console.log(`   ✅ Session completed after ${questionCount} questions`);
        break;
      }
      throw error;
    }
  }

  console.log(`   📊 Processed ${questionCount} questions total`);

  // 4. Finalize session
  console.log('\n4️⃣ Testing finalizeSession...');
  const results = finalizeSession(session.session_id);
  console.log(`   ✅ Session finalized`);
  console.log(`   📊 Line verdicts: ${JSON.stringify(results.line_verdicts)}`);
  console.log(`   🎭 Face states: ${Object.keys(results.face_states).length} faces`);

  console.log('\n🎉 Fast engine test passed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}
