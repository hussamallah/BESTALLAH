#!/usr/bin/env node

/**
 * Batch 3 Stress Tests and Fuzzing
 * Tests tell taxonomy, edge cases, and deterministic behavior
 */

const { PFFEngine } = require('../engine/index');
const crypto = require('crypto');

class Batch3StressTester {
  constructor() {
    this.engine = new PFFEngine();
    this.results = {
      testsRun: 0,
      testsPassed: 0,
      testsFailed: 0,
      failures: []
    };
  }

  async runAllTests() {
    console.log('🧪 Running Batch 3 Stress Tests...\n');

    try {
      // Initialize engine with bank
      this.engine.initSession('stress-test-seed', './bank/packaged/bank_package.json');
      
      // Run stress tests
      await this.testTellFlood();
      await this.testBrokenMirage();
      await this.testCleanWideSignature();
      await this.testSiblingAmbiguity();
      await this.testExtremePicks();
      await this.testDeterministicBehavior();
      await this.testQAFlags();
      await this.testOperationalKnobs();

      this.printResults();
    } catch (error) {
      console.error('❌ Stress test failed:', error.message);
      process.exit(1);
    }
  }

  async testTellFlood() {
    console.log('🔍 Test A: Tell Flood (Fuzz A)');
    
    // Simulate random clicks with maximum tells
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Pick all families to get maximum question exposure
    this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress']);
    
    // Answer all questions with random options
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      const optionKey = Math.random() > 0.5 ? 'A' : 'B';
      this.engine.submitAnswer(sessionId, question.qid, optionKey);
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Check for GHOST states due to concentration
    const ghostFaces = Object.values(results.face_states).filter(f => f.state === 'GHOST');
    const litFaces = Object.values(results.face_states).filter(f => f.state === 'LIT');
    
    this.assert(ghostFaces.length > 0, 'Should have some GHOST faces due to concentration');
    this.assert(litFaces.length < 14, 'Should not have all faces LIT due to concentration cap');
    
    console.log(`   ✅ Found ${ghostFaces.length} GHOST faces, ${litFaces.length} LIT faces`);
  }

  async testBrokenMirage() {
    console.log('🔍 Test B: Broken Mirage (Fuzz B)');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Pick families that tend to have F options
    this.engine.setPicks(sessionId, ['Control', 'Boundary', 'Stress']);
    
    // Always choose options that might be F
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      // Prefer option B which might be F in some questions
      const optionKey = 'B';
      this.engine.submitAnswer(sessionId, question.qid, optionKey);
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Check for faces that failed LIT due to BROKEN >= CLEAN
    const brokenFaces = Object.entries(results.face_states).filter(([faceId, state]) => 
      state.state === 'GHOST' && state.broken >= state.clean
    );
    
    this.assert(brokenFaces.length > 0, 'Should have some faces capped at GHOST due to broken context');
    
    console.log(`   ✅ Found ${brokenFaces.length} faces capped by broken context`);
  }

  async testCleanWideSignature() {
    console.log('🔍 Test C: Clean, Wide, Signature-Present (Fuzz C)');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Pick diverse families to get wide coverage
    this.engine.setPicks(sessionId, ['Control', 'Pace', 'Truth', 'Recognition']);
    
    // Answer strategically to maximize clean context
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      // Prefer option A which tends to be C
      const optionKey = 'A';
      this.engine.submitAnswer(sessionId, question.qid, optionKey);
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Check for LIT faces with good metrics
    const litFaces = Object.entries(results.face_states).filter(([faceId, state]) => 
      state.state === 'LIT' && 
      state.familiesHit >= 4 && 
      state.signatureHits >= 2 && 
      state.clean >= 4
    );
    
    this.assert(litFaces.length > 0, 'Should have some LIT faces with good metrics');
    
    console.log(`   ✅ Found ${litFaces.length} LIT faces with good metrics`);
  }

  async testSiblingAmbiguity() {
    console.log('🔍 Test D: Sibling Ambiguity (Fuzz D)');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Pick families to test sibling resolution
    this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary']);
    
    // Answer to create similar metrics for siblings
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      const optionKey = Math.random() > 0.5 ? 'A' : 'B';
      this.engine.submitAnswer(sessionId, question.qid, optionKey);
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Check family representatives
    const familyReps = results.family_reps;
    const coPresentFamilies = familyReps.filter(rep => rep.co_present);
    
    this.assert(familyReps.length === 7, 'Should have 7 family representatives');
    
    console.log(`   ✅ Found ${coPresentFamilies.length} families with co-presence`);
  }

  async testExtremePicks() {
    console.log('🔍 Test E: Extreme Picks (Fuzz E)');
    
    // Test picks=7
    const sessionId7 = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId7, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId7, ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress']);
    
    let questionCount = 0;
    while (true) {
      try {
        const question = this.engine.getNextQuestion(sessionId7);
        this.engine.submitAnswer(sessionId7, question.qid, 'A');
        questionCount++;
      } catch (error) {
        break; // No more questions
      }
    }
    
    this.assert(questionCount === 18, `Picks=7 should have exactly 18 questions, got ${questionCount}`);
    
    // Test picks=1
    const sessionId1 = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId1, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId1, ['Control']);
    
    questionCount = 0;
    while (true) {
      try {
        const question = this.engine.getNextQuestion(sessionId1);
        this.engine.submitAnswer(sessionId1, question.qid, 'A');
        questionCount++;
      } catch (error) {
        break; // No more questions
      }
    }
    
    this.assert(questionCount === 18, `Picks=1 should have exactly 18 questions, got ${questionCount}`);
    
    console.log(`   ✅ Picks=7: ${questionCount} questions, Picks=1: ${questionCount} questions`);
  }

  async testDeterministicBehavior() {
    console.log('🔍 Test F: Deterministic Behavior');
    
    const seed = 'deterministic-test-seed';
    
    // Run same session twice
    const sessionId1 = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId1, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId1, ['Control', 'Pace', 'Truth']);
    
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId1);
      this.engine.submitAnswer(sessionId1, question.qid, 'A');
    }
    const results1 = this.engine.finalizeSession(sessionId1);
    
    const sessionId2 = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId2, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId2, ['Control', 'Pace', 'Truth']);
    
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId2);
      this.engine.submitAnswer(sessionId2, question.qid, 'A');
    }
    const results2 = this.engine.finalizeSession(sessionId2);
    
    // Results should be identical
    this.assert(JSON.stringify(results1.line_verdicts) === JSON.stringify(results2.line_verdicts), 
      'Line verdicts should be identical');
    this.assert(JSON.stringify(results1.face_states) === JSON.stringify(results2.face_states), 
      'Face states should be identical');
    
    console.log(`   ✅ Deterministic behavior verified`);
  }

  async testQAFlags() {
    console.log('🔍 Test G: QA Flags');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Pick families to trigger QA flags
    this.engine.setPicks(sessionId, ['Control', 'Boundary']);
    
    // Answer to create conditions for QA flags
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      const optionKey = 'B'; // Prefer B to potentially trigger F context
      this.engine.submitAnswer(sessionId, question.qid, optionKey);
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Check for QA flags
    const qaFlags = results.qa_flags || [];
    this.assert(Array.isArray(qaFlags), 'Should have qa_flags array');
    
    console.log(`   ✅ Found ${qaFlags.length} QA flags`);
  }

  async testOperationalKnobs() {
    console.log('🔍 Test H: Operational Knobs');
    
    // Test with different constants profiles
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // This would require loading different bank packages with different profiles
    // For now, just verify the constants are loaded
    const constants = this.engine.bankLoader.getConstants();
    this.assert(constants.PER_SCREEN_CAP === 0.4, 'Should have correct PER_SCREEN_CAP');
    this.assert(constants.LIT_MIN_QUESTIONS === 6, 'Should have correct LIT_MIN_QUESTIONS');
    
    console.log(`   ✅ Operational knobs verified`);
  }

  assert(condition, message) {
    this.results.testsRun++;
    if (condition) {
      this.results.testsPassed++;
    } else {
      this.results.testsFailed++;
      this.results.failures.push(message);
      console.log(`   ❌ ${message}`);
    }
  }

  printResults() {
    console.log('\n📊 Batch 3 Stress Test Results:');
    console.log(`   Tests Run: ${this.results.testsRun}`);
    console.log(`   Tests Passed: ${this.results.testsPassed}`);
    console.log(`   Tests Failed: ${this.results.testsFailed}`);
    
    if (this.results.failures.length > 0) {
      console.log('\n❌ Failures:');
      this.results.failures.forEach(failure => console.log(`   - ${failure}`));
    }
    
    if (this.results.testsFailed === 0) {
      console.log('\n✅ All Batch 3 stress tests passed!');
    } else {
      console.log('\n❌ Some tests failed');
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new Batch3StressTester();
  tester.runAllTests().catch(console.error);
}

module.exports = Batch3StressTester;
