#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine');

/**
 * Replay Runner - Runs replay tests against the engine
 * 
 * Features:
 * - Loads replay files
 * - Runs them through the actual engine
 * - Compares results with expected outcomes
 * - Reports deterministic behavior
 */

const REPLAYS_DIR = path.join(__dirname, '..', 'tests', 'replays');

/**
 * Load a replay file
 */
function loadReplay(replayFile) {
  const replayPath = path.join(REPLAYS_DIR, replayFile);
  if (!fs.existsSync(replayPath)) {
    throw new Error(`Replay file not found: ${replayFile}`);
  }
  
  return JSON.parse(fs.readFileSync(replayPath, 'utf8'));
}

/**
 * Mock engine implementation for testing
 */
class MockEngine {
  constructor() {
    this.sessions = new Map();
  }
  
  initSession(sessionId, sessionSeed, pickedFamilies, bankHash) {
    const session = {
      sessionId,
      sessionSeed,
      pickedFamilies,
      bankHash,
      answers: new Map(),
      lineState: new Map(),
      faceLedger: new Map(),
      questionQueue: this.generateQuestionQueue(pickedFamilies),
      status: 'running'
    };
    
    // Initialize line state with picks
    pickedFamilies.forEach(family => {
      session.lineState.set(family, { C: 1, O_seen: false, F_seen: false });
    });
    
    // Initialize face ledger
    const faces = [
      'FACE/Control/Sovereign', 'FACE/Control/Rebel',
      'FACE/Pace/Navigator', 'FACE/Pace/Visionary',
      'FACE/Boundary/Guardian', 'FACE/Boundary/Equalizer',
      'FACE/Truth/Seeker', 'FACE/Truth/Architect',
      'FACE/Recognition/Spotlight', 'FACE/Recognition/Diplomat',
      'FACE/Bonding/Partner', 'FACE/Bonding/Provider',
      'FACE/Stress/Catalyst', 'FACE/Stress/Artisan'
    ];
    
    faces.forEach(face => {
      session.faceLedger.set(face, {
        questions_hit: new Set(),
        families_hit: new Set(),
        signature_qids: new Set(),
        context_counts: { Clean: 0, Bent: 0, Broken: 0 },
        per_family_counts: {},
        contrast_seen: false
      });
    });
    
    this.sessions.set(sessionId, session);
    return session;
  }
  
  generateQuestionQueue(pickedFamilies) {
    const questions = [];
    
    // Picked families get 2 questions each
    pickedFamilies.forEach((family, index) => {
      const familyScreen = index + 1;
      questions.push(
        { qid: `${family.toUpperCase()}_Q1`, familyScreen, order_in_family: 'C' },
        { qid: `${family.toUpperCase()}_Q2`, familyScreen, order_in_family: 'O' }
      );
    });
    
    // Not-picked families get 3 questions each
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    const notPicked = allFamilies.filter(f => !pickedFamilies.includes(f));
    
    notPicked.forEach((family, index) => {
      const familyScreen = pickedFamilies.length + index + 1;
      questions.push(
        { qid: `${family.toUpperCase()}_Q1`, familyScreen, order_in_family: 'C' },
        { qid: `${family.toUpperCase()}_Q2`, familyScreen, order_in_family: 'O' },
        { qid: `${family.toUpperCase()}_Q3`, familyScreen, order_in_family: 'F' }
      );
    });
    
    return questions;
  }
  
  submitAnswer(sessionId, answerEvent) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    // Store answer
    session.answers.set(answerEvent.qid, answerEvent);
    
    // Update line state
    const family = this.getFamilyFromScreen(answerEvent.familyScreen);
    const lineState = session.lineState.get(family) || { C: 0, O_seen: false, F_seen: false };
    
    if (answerEvent.lineCOF === 'C') lineState.C += 1;
    if (answerEvent.lineCOF === 'O') lineState.O_seen = true;
    if (answerEvent.lineCOF === 'F') lineState.F_seen = true;
    
    session.lineState.set(family, lineState);
    
    // Update face ledger
    answerEvent.tells.forEach(tellId => {
      const face = this.getFaceFromTell(tellId);
      const ledger = session.faceLedger.get(face);
      
      if (ledger) {
        ledger.questions_hit.add(answerEvent.qid);
        ledger.families_hit.add(answerEvent.familyScreen);
        
        // Check if signature opportunity
        if (this.isSignatureFamily(face, answerEvent.familyScreen)) {
          ledger.signature_qids.add(answerEvent.qid);
        }
        
        // Update context counts
        const context = answerEvent.lineCOF === 'C' ? 'Clean' : 
                        answerEvent.lineCOF === 'O' ? 'Bent' : 'Broken';
        ledger.context_counts[context]++;
        
        // Update per-family counts
        if (!ledger.per_family_counts[answerEvent.familyScreen]) {
          ledger.per_family_counts[answerEvent.familyScreen] = 0;
        }
        ledger.per_family_counts[answerEvent.familyScreen]++;
      }
    });
    
    return session;
  }
  
  finalizeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    // Compute line verdicts
    const lineVerdicts = {};
    session.lineState.forEach((state, family) => {
      if (state.F_seen) lineVerdicts[family] = 'F';
      else if (state.O_seen) lineVerdicts[family] = 'O';
      else lineVerdicts[family] = 'C';
    });
    
    // Compute face states (simplified)
    const faceStates = {};
    session.faceLedger.forEach((ledger, face) => {
      const totalTells = Object.values(ledger.context_counts).reduce((sum, count) => sum + count, 0);
      const signatureCount = ledger.signature_qids.size;
      const cleanCount = ledger.context_counts.Clean;
      
      if (totalTells >= 6 && signatureCount >= 2 && cleanCount >= 4) {
        faceStates[face] = 'LIT';
      } else if (totalTells >= 4 && signatureCount >= 1 && cleanCount >= 2) {
        faceStates[face] = 'LEAN';
      } else if (totalTells >= 2) {
        faceStates[face] = 'GHOST';
      } else if (totalTells >= 1) {
        faceStates[face] = 'COLD';
      } else {
        faceStates[face] = 'ABSENT';
      }
    });
    
    // Compute family reps
    const familyReps = {};
    session.lineState.forEach((state, family) => {
      const totalC = state.C;
      const totalQuestions = session.answers.size;
      familyReps[family] = totalQuestions > 0 ? totalC / totalQuestions : 0;
    });
    
    // Find anchor family (first picked family)
    const anchorFamily = session.pickedFamilies[0] || null;
    
    session.status = 'finalized';
    
    return {
      line_verdicts: lineVerdicts,
      face_states: faceStates,
      family_reps: familyReps,
      anchor_family: anchorFamily
    };
  }
  
  getFamilyFromScreen(familyScreen) {
    const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    return families[familyScreen - 1];
  }
  
  getFaceFromTell(tellId) {
    // Extract face from tell ID
    const parts = tellId.split('/');
    if (parts.length >= 3) {
      return `FACE/${parts[1]}/${parts[2]}`;
    }
    return null;
  }
  
  isSignatureFamily(face, familyScreen) {
    const family = this.getFamilyFromScreen(familyScreen);
    return face.includes(family);
  }
}

/**
 * Run a single replay
 */
function runReplay(replayFile) {
  console.log(`\n🎬 Running replay: ${replayFile}`);
  
  try {
    const replay = loadReplay(replayFile);
    const engine = new MockEngine();
    
    // Initialize session
    const session = engine.initSession(
      replay.session.session_id,
      replay.session.session_seed,
      replay.session.picked_families,
      replay.session.bank_hash
    );
    
    console.log(`  📊 Session: ${session.sessionId}`);
    console.log(`  🎯 Picked families: ${session.pickedFamilies.join(', ')}`);
    console.log(`  📝 Questions: ${session.questionQueue.length}`);
    
    // Process answers
    replay.answers.forEach((answer, index) => {
      engine.submitAnswer(session.sessionId, answer);
      console.log(`  ✅ Answer ${index + 1}: ${answer.qid} (${answer.lineCOF})`);
    });
    
    // Finalize session
    const result = engine.finalizeSession(session.sessionId);
    
    console.log(`  🏁 Finalized session`);
    console.log(`  📊 Line verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face states: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🏠 Anchor family: ${result.anchor_family}`);
    
    // Compare with expected result
    const expected = replay.expected_result;
    const matches = compareResults(result, expected);
    
    if (matches) {
      console.log(`  ✅ Results match expected outcome`);
      return true;
    } else {
      console.log(`  ❌ Results do not match expected outcome`);
      return false;
    }
    
  } catch (error) {
    console.error(`  ❌ Replay failed: ${error.message}`);
    return false;
  }
}

/**
 * Compare actual vs expected results
 */
function compareResults(actual, expected) {
  // Compare line verdicts
  const lineVerdictsMatch = JSON.stringify(actual.line_verdicts) === JSON.stringify(expected.line_verdicts);
  
  // Compare face states
  const faceStatesMatch = JSON.stringify(actual.face_states) === JSON.stringify(expected.face_states);
  
  // Compare family reps (with tolerance for floating point)
  const familyRepsMatch = Object.keys(actual.family_reps).every(family => {
    const actualRep = actual.family_reps[family];
    const expectedRep = expected.family_reps[family];
    return Math.abs(actualRep - expectedRep) < 0.01;
  });
  
  // Compare anchor family
  const anchorFamilyMatch = actual.anchor_family === expected.anchor_family;
  
  return lineVerdictsMatch && faceStatesMatch && familyRepsMatch && anchorFamilyMatch;
}

/**
 * Run all replays
 */
function runAllReplays() {
  console.log('🚀 Running all replay tests...');
  
  const replayFiles = fs.readdirSync(REPLAYS_DIR)
    .filter(file => file.endsWith('.json'))
    .filter(file => file !== 'replay-format.json');
  
  let passed = 0;
  let total = replayFiles.length;
  
  replayFiles.forEach(replayFile => {
    if (runReplay(replayFile)) {
      passed++;
    }
  });
  
  console.log(`\n📊 Replay Test Results:`);
  console.log(`  ✅ Passed: ${passed}/${total}`);
  console.log(`  ❌ Failed: ${total - passed}/${total}`);
  
  return passed === total;
}

// Command line interface
if (require.main === module) {
  const replayFile = process.argv[2];
  
  if (replayFile) {
    const success = runReplay(replayFile);
    process.exit(success ? 0 : 1);
  } else {
    const success = runAllReplays();
    process.exit(success ? 0 : 1);
  }
}

module.exports = { runReplay, runAllReplays, MockEngine };
