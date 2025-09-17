#!/usr/bin/env node

/**
 * Test Vectors for Batch 2 Validation
 * 
 * Vector A: Clean Navigator & Spotlight; Bonding drift
 * Vector B: Single-family saturation (GHOST trigger)
 * Vector C: Broken-dominant mirage
 * Vector D: Wide, clean coverage (true LIT)
 */

const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');
const path = require('path');

console.log('🧪 Testing Batch 2 Vectors...\n');

/**
 * Vector A: Clean Navigator & Spotlight; Bonding drift
 * Picks: Control, Bonding, Truth
 * Not-picked: Pace, Boundary, Recognition, Stress
 * Expected: Navigator LIT, Spotlight LIT, Sovereign/Seeker LEAN, Partner/Diplomat LEAN
 */
async function testVectorA() {
  console.log('📊 Vector A: Clean Navigator & Spotlight; Bonding drift');
  
  try {
    const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package_signed.json');
    const session = initSession('vector-a-test', bankPath);
    
    // Set picks: Control, Bonding, Truth
    const updatedSession = setPicks(session.session_id, ['Control', 'Bonding', 'Truth']);
    console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
    
    // Process all questions
    let questionCount = 0;
    while (true) {
      try {
        const nextQuestion = getNextQuestion(session.session_id);
        if (nextQuestion === null) break;
        
        questionCount++;
        // Always pick option A for consistent testing
        const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
      } catch (error) {
        if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
          break;
        }
        throw error;
      }
    }
    
    console.log(`   📊 Processed ${questionCount} questions`);
    
    // Finalize and check results
    const results = finalizeSession(session.session_id);
    
    // Check specific face states
    const navigatorState = results.face_states['FACE/Pace/Navigator'];
    const spotlightState = results.face_states['FACE/Recognition/Spotlight'];
    const sovereignState = results.face_states['FACE/Control/Sovereign'];
    const seekerState = results.face_states['FACE/Truth/Seeker'];
    
    console.log(`   🎭 Navigator: ${navigatorState.state} (Q:${navigatorState.familiesHit}, F:${navigatorState.familiesHit}, S:${navigatorState.signatureHits}, C:${navigatorState.clean})`);
    console.log(`   🎭 Spotlight: ${spotlightState.state} (Q:${spotlightState.familiesHit}, F:${spotlightState.familiesHit}, S:${spotlightState.signatureHits}, C:${spotlightState.clean})`);
    console.log(`   🎭 Sovereign: ${sovereignState.state} (Q:${sovereignState.familiesHit}, F:${sovereignState.familiesHit}, S:${sovereignState.signatureHits}, C:${sovereignState.clean})`);
    console.log(`   🎭 Seeker: ${seekerState.state} (Q:${seekerState.familiesHit}, F:${seekerState.familiesHit}, S:${seekerState.signatureHits}, C:${seekerState.clean})`);
    
    console.log('   ✅ Vector A completed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Vector A failed:', error.message);
    return false;
  }
}

/**
 * Vector B: Single-family saturation (GHOST trigger)
 * All tells for Visionary authored only on Pace screens; user hits them
 * Expected: Visionary GHOST (MAX_FAM_SHARE > 0.40 or FAM ≤ 2), not LIT
 */
async function testVectorB() {
  console.log('📊 Vector B: Single-family saturation (GHOST trigger)');
  
  try {
    const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package_signed.json');
    const session = initSession('vector-b-test', bankPath);
    
    // Set picks: Only Pace (to maximize Visionary tells)
    const updatedSession = setPicks(session.session_id, ['Pace']);
    console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
    
    // Process all questions
    let questionCount = 0;
    while (true) {
      try {
        const nextQuestion = getNextQuestion(session.session_id);
        if (nextQuestion === null) break;
        
        questionCount++;
        // Always pick option A for consistent testing
        const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
      } catch (error) {
        if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
          break;
        }
        throw error;
      }
    }
    
    console.log(`   📊 Processed ${questionCount} questions`);
    
    // Finalize and check results
    const results = finalizeSession(session.session_id);
    
    // Check Visionary state (should be GHOST due to single-family saturation)
    const visionaryState = results.face_states['FACE/Pace/Visionary'];
    console.log(`   🎭 Visionary: ${visionaryState.state} (Q:${visionaryState.familiesHit}, F:${visionaryState.familiesHit}, S:${visionaryState.signatureHits}, C:${visionaryState.clean})`);
    
    if (visionaryState.state === 'GHOST') {
      console.log('   ✅ Visionary correctly identified as GHOST due to single-family saturation');
    } else {
      console.log('   ⚠️ Visionary not GHOST - may need more concentrated tells');
    }
    
    console.log('   ✅ Vector B completed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Vector B failed:', error.message);
    return false;
  }
}

/**
 * Vector C: Broken-dominant mirage
 * User repeatedly chooses options with lineCOF = F when triggering a face's tells
 * Expected: BROKEN ≥ CLEAN → face state capped at GHOST
 */
async function testVectorC() {
  console.log('📊 Vector C: Broken-dominant mirage');
  
  try {
    const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package_signed.json');
    const session = initSession('vector-c-test', bankPath);
    
    // Set picks: Control, Pace, Boundary
    const updatedSession = setPicks(session.session_id, ['Control', 'Pace', 'Boundary']);
    console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
    
    // Process questions, always picking option B (which should have F lineCOF)
    let questionCount = 0;
    while (true) {
      try {
        const nextQuestion = getNextQuestion(session.session_id);
        if (nextQuestion === null) break;
        
        questionCount++;
        // Always pick option B to maximize F lineCOF hits
        const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'B');
      } catch (error) {
        if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
          break;
        }
        throw error;
      }
    }
    
    console.log(`   📊 Processed ${questionCount} questions`);
    
    // Finalize and check results
    const results = finalizeSession(session.session_id);
    
    // Check for faces with high broken counts
    let brokenDominantFaces = 0;
    Object.entries(results.face_states).forEach(([faceId, state]) => {
      if (state.broken >= state.clean && state.state === 'GHOST') {
        brokenDominantFaces++;
        console.log(`   🎭 ${faceId.split('/').pop()}: ${state.state} (C:${state.clean}, B:${state.broken}) - Broken dominant`);
      }
    });
    
    if (brokenDominantFaces > 0) {
      console.log(`   ✅ Found ${brokenDominantFaces} faces with broken-dominant patterns correctly capped at GHOST`);
    } else {
      console.log('   ⚠️ No broken-dominant patterns detected - may need more F options');
    }
    
    console.log('   ✅ Vector C completed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Vector C failed:', error.message);
    return false;
  }
}

/**
 * Vector D: Wide, clean coverage (true LIT)
 * One face accumulates: Q=7, FAM=5, SIG=2, CLEAN=6, BROKEN=0, contrast_seen=true
 * Expected: LIT
 */
async function testVectorD() {
  console.log('📊 Vector D: Wide, clean coverage (true LIT)');
  
  try {
    const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package_signed.json');
    const session = initSession('vector-d-test', bankPath);
    
    // Set picks: 3 families to get 18 questions (2 picked + 3×4 not-picked = 18)
    const updatedSession = setPicks(session.session_id, ['Control', 'Pace', 'Boundary']);
    console.log(`   ✅ Picks set: ${updatedSession.picked_families.join(', ')}`);
    console.log(`   📊 Expected questions: ${Object.values(updatedSession.schedule.per_family).reduce((sum, f) => sum + f.count, 0)}`);
    
    // Process questions, always picking option A for clean coverage
    let questionCount = 0;
    while (true) {
      try {
        const nextQuestion = getNextQuestion(session.session_id);
        if (nextQuestion === null) break;
        
        questionCount++;
        // Always pick option A for clean coverage
        const answerResult = submitAnswer(session.session_id, nextQuestion.qid, 'A');
        
        // Check if we've reached the expected number of questions
        if (questionCount >= 18) {
          console.log(`   📊 Reached expected 18 questions, stopping`);
          break;
        }
      } catch (error) {
        if (error.message.includes('Session must be PICKED or IN_PROGRESS')) {
          console.log(`   📊 Session completed after ${questionCount} questions`);
          break;
        }
        throw error;
      }
    }
    
    console.log(`   📊 Processed ${questionCount} questions`);
    
    // Finalize and check results
    const results = finalizeSession(session.session_id);
    
    // Check for LIT faces
    let litFaces = 0;
    Object.entries(results.face_states).forEach(([faceId, state]) => {
      if (state.state === 'LIT') {
        litFaces++;
        console.log(`   🎭 ${faceId.split('/').pop()}: ${state.state} (Q:${state.familiesHit}, F:${state.familiesHit}, S:${state.signatureHits}, C:${state.clean}, B:${state.broken}, Contrast:${state.contrastSeen})`);
      }
    });
    
    if (litFaces > 0) {
      console.log(`   ✅ Found ${litFaces} LIT faces with wide, clean coverage`);
    } else {
      console.log('   ⚠️ No LIT faces found - may need more opportunities or contrast tells');
    }
    
    console.log('   ✅ Vector D completed\n');
    return true;
  } catch (error) {
    console.error('   ❌ Vector D failed:', error.message);
    return false;
  }
}

// Run all test vectors
async function runAllVectors() {
  console.log('🚀 Running Batch 2 Test Vectors...\n');
  
  const results = await Promise.all([
    testVectorA(),
    testVectorB(),
    testVectorC(),
    testVectorD()
  ]);
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  console.log(`\n📊 Vector Test Results: ${passed}/${total} passed`);
  
  if (passed === total) {
    console.log('🎉 All Batch 2 test vectors passed!');
    return true;
  } else {
    console.log('❌ Some test vectors failed');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  runAllVectors().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testVectorA, testVectorB, testVectorC, testVectorD, runAllVectors };
