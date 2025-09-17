/**
 * Test PFF Quiz Engine API with real bank package
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');
const path = require('path');

console.log('🧪 Testing PFF Quiz Engine API with real bank...\n');

try {
  // 1. Initialize session with real bank
  console.log('1️⃣ Testing initSession...');
  const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package.json');
  const session = initSession('test-session-12345', bankPath);
  console.log(`   ✅ Session created: ${session.session_id}`);
  console.log(`   📊 Status: ${session.state}`);

  // 2. Set picks
  console.log('\n2️⃣ Testing setPicks...');
  const pickedFamilies = ['Control', 'Pace', 'Boundary'];
  const updatedSession = setPicks(session.session_id, pickedFamilies);
  console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
  console.log(`   📊 Questions: ${Object.values(updatedSession.schedule.per_family).reduce((sum, f) => sum + f.count, 0)}`);
  console.log(`   📊 Status: ${updatedSession.state}`);

  // 3. Process questions
  console.log('\n3️⃣ Testing getNextQuestion and submitAnswer...');
  let questionCount = 0;
  let nextQuestion;

  while (true) {
    try {
      nextQuestion = getNextQuestion(session.session_id);
      if (nextQuestion === null) break;
      
      questionCount++;
      console.log(`   📝 Question ${questionCount}: ${nextQuestion.qid} (${nextQuestion.familyScreen})`);
      
      // Submit answer (always pick option A for testing)
      const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
      console.log(`   ✅ Answer submitted: ${nextQuestion.qid} -> A (${answerResult.answers_count}/${answerResult.answers_count + answerResult.remaining})`);
    } catch (error) {
      if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
        console.log(`   ✅ Session completed after ${questionCount} questions`);
        break;
      }
      throw error;
    }
  }

  console.log(`   📊 Total questions: ${questionCount}`);

  // 4. Finalize session
  console.log('\n4️⃣ Testing finalizeSession...');
  const results = finalizeSession(session.session_id);
  console.log(`   ✅ Session finalized`);
  console.log(`   📊 Line verdicts:`, results.line_verdicts);
  console.log(`   🎭 Face states: ${Object.keys(results.face_states).length} faces`);
  console.log(`   🏠 Anchor family: ${results.anchor_family}`);

  // 5. Show detailed face states
  console.log('\n5️⃣ Face State Details:');
  Object.entries(results.face_states).forEach(([faceId, state]) => {
    const shortId = faceId.split('/').pop();
    console.log(`   ${shortId}: ${state.state} (q:${state.familiesHit}, f:${state.familiesHit}, s:${state.signatureHits}, c:${state.clean}, b:${state.broken})`);
  });

  console.log('\n🎉 All engine API tests passed!');

} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
  process.exit(1);
}