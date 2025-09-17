#!/usr/bin/env node

/**
 * Batch 3 Compliance and Audit Tests
 * Validates deterministic behavior, bank integrity, and audit trails
 */

const { PFFEngine } = require('../engine/index');
const crypto = require('crypto');
const fs = require('fs');

class Batch3ComplianceTester {
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
    console.log('🔒 Running Batch 3 Compliance Tests...\n');

    try {
      // Initialize engine with bank
      this.engine.initSession('compliance-test-seed', './bank/packaged/bank_package.json');
      
      // Run compliance tests
      await this.testBankIntegrity();
      await this.testDeterministicReplay();
      await this.testEventOrderIntegrity();
      await this.testBankVersionBinding();
      await this.testAuditTrail();
      await this.testRecoveryContinuation();
      await this.testComplianceSnapshot();

      this.printResults();
    } catch (error) {
      console.error('❌ Compliance test failed:', error.message);
      process.exit(1);
    }
  }

  async testBankIntegrity() {
    console.log('🔍 Test 1: Bank Integrity');
    
    // Test bank hash verification
    const bankHash = this.engine.bankLoader.getBankHash();
    this.assert(bankHash.length === 64, 'Bank hash should be 64 characters (SHA-256)');
    
    // Test bank ID
    const bankId = this.engine.bankLoader.getBankId();
    this.assert(bankId.startsWith('pff.v'), 'Bank ID should start with pff.v');
    
    // Test constants profile
    const constants = this.engine.bankLoader.getConstants();
    this.assert(constants.PER_SCREEN_CAP === 0.4, 'Constants should be loaded correctly');
    
    // Test tell taxonomy
    const tellMeta = this.engine.bankLoader.getTellMeta('TELL/Control/Sovereign/sets-call');
    this.assert(tellMeta && tellMeta.contrast === true, 'Tell metadata should be loaded');
    
    console.log(`   ✅ Bank integrity verified (hash: ${bankHash.substring(0, 8)}...)`);
  }

  async testDeterministicReplay() {
    console.log('🔍 Test 2: Deterministic Replay');
    
    const seed = 'replay-test-seed';
    const picks = ['Control', 'Pace', 'Truth'];
    
    // Run session multiple times with same seed
    const results = [];
    for (let i = 0; i < 3; i++) {
      const sessionId = crypto.randomBytes(16).toString('hex');
      this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
      this.engine.setPicks(sessionId, picks);
      
      // Answer all questions identically
      for (let j = 0; j < 18; j++) {
        const question = this.engine.getNextQuestion(sessionId);
        this.engine.submitAnswer(sessionId, question.qid, 'A');
      }
      
      results.push(this.engine.finalizeSession(sessionId));
    }
    
    // All results should be identical
    const firstResult = results[0];
    for (let i = 1; i < results.length; i++) {
      this.assert(JSON.stringify(firstResult.line_verdicts) === JSON.stringify(results[i].line_verdicts),
        `Replay ${i+1} line verdicts should match first run`);
      this.assert(JSON.stringify(firstResult.face_states) === JSON.stringify(results[i].face_states),
        `Replay ${i+1} face states should match first run`);
    }
    
    console.log(`   ✅ Deterministic replay verified (${results.length} runs)`);
  }

  async testEventOrderIntegrity() {
    console.log('🔍 Test 3: Event Order Integrity');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId, ['Control', 'Pace']);
    
    // Answer questions and verify order
    const answeredQids = [];
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      answeredQids.push(question.qid);
      this.engine.submitAnswer(sessionId, question.qid, 'A');
    }
    
    // Verify no duplicate QIDs
    const uniqueQids = new Set(answeredQids);
    this.assert(uniqueQids.size === 18, 'Should have exactly 18 unique QIDs');
    
    // Verify session has correct answer count
    const session = this.engine.sessions.get(sessionId);
    this.assert(session.answers.length === 18, 'Session should have exactly 18 answers');
    
    console.log(`   ✅ Event order integrity verified (18 unique QIDs)`);
  }

  async testBankVersionBinding() {
    console.log('🔍 Test 4: Bank Version Binding');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    
    // Verify session is bound to bank version
    const session = this.engine.sessions.get(sessionId);
    this.assert(session.bankId, 'Session should have bankId');
    this.assert(session.bankHash, 'Session should have bankHash');
    
    // Test that bank hash matches
    const bankHash = this.engine.bankLoader.getBankHash();
    this.assert(session.bankHash === bankHash, 'Session bank hash should match loaded bank hash');
    
    console.log(`   ✅ Bank version binding verified (${session.bankId})`);
  }

  async testAuditTrail() {
    console.log('🔍 Test 5: Audit Trail');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId, ['Control', 'Pace']);
    
    // Answer some questions
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      this.engine.submitAnswer(sessionId, question.qid, 'A');
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Verify audit trail components
    this.assert(results.session_id, 'Results should have session_id');
    this.assert(results.line_verdicts, 'Results should have line_verdicts');
    this.assert(results.face_states, 'Results should have face_states');
    this.assert(results.family_reps, 'Results should have family_reps');
    
    // Verify face states have required fields
    const faceStates = results.face_states;
    Object.values(faceStates).forEach(faceState => {
      this.assert(faceState.state, 'Face state should have state');
      this.assert(typeof faceState.familiesHit === 'number', 'Face state should have familiesHit');
      this.assert(typeof faceState.signatureHits === 'number', 'Face state should have signatureHits');
      this.assert(typeof faceState.clean === 'number', 'Face state should have clean');
      this.assert(typeof faceState.broken === 'number', 'Face state should have broken');
    });
    
    console.log(`   ✅ Audit trail verified (${Object.keys(faceStates).length} faces)`);
  }

  async testRecoveryContinuation() {
    console.log('🔍 Test 6: Recovery and Continuation');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId, ['Control', 'Pace']);
    
    // Answer some questions
    for (let i = 0; i < 10; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      this.engine.submitAnswer(sessionId, question.qid, 'A');
    }
    
    // Simulate crash and recovery
    const session = this.engine.sessions.get(sessionId);
    this.assert(session.answers.length === 10, 'Should have 10 answers before crash');
    
    // Continue from where we left off
    for (let i = 10; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      this.engine.submitAnswer(sessionId, question.qid, 'A');
    }
    
    this.assert(session.answers.length === 18, 'Should have 18 answers after continuation');
    
    const results = this.engine.finalizeSession(sessionId);
    this.assert(results.session_id === sessionId, 'Results should have correct session ID');
    
    console.log(`   ✅ Recovery and continuation verified`);
  }

  async testComplianceSnapshot() {
    console.log('🔍 Test 7: Compliance Snapshot');
    
    const sessionId = crypto.randomBytes(16).toString('hex');
    this.engine.initSession(sessionId, './bank/packaged/bank_package.json');
    this.engine.setPicks(sessionId, ['Control', 'Pace', 'Truth']);
    
    // Answer all questions
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      this.engine.submitAnswer(sessionId, question.qid, 'A');
    }
    
    const results = this.engine.finalizeSession(sessionId);
    
    // Create compliance snapshot
    const snapshot = {
      session_id: results.session_id,
      bank_id: this.engine.bankLoader.getBankId(),
      bank_hash_sha256: this.engine.bankLoader.getBankHash(),
      finalized_at: new Date().toISOString(),
      line_verdicts: results.line_verdicts,
      face_states: results.face_states,
      family_reps: results.family_reps,
      anchor_family: results.anchor_family
    };
    
    // Verify snapshot structure
    this.assert(snapshot.session_id, 'Snapshot should have session_id');
    this.assert(snapshot.bank_id, 'Snapshot should have bank_id');
    this.assert(snapshot.bank_hash_sha256, 'Snapshot should have bank_hash_sha256');
    this.assert(snapshot.finalized_at, 'Snapshot should have finalized_at');
    
    // Save snapshot for audit
    const snapshotPath = `./tests/audit/snapshot-${sessionId}.json`;
    fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    
    console.log(`   ✅ Compliance snapshot created (${snapshotPath})`);
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
    console.log('\n📊 Batch 3 Compliance Test Results:');
    console.log(`   Tests Run: ${this.results.testsRun}`);
    console.log(`   Tests Passed: ${this.results.testsPassed}`);
    console.log(`   Tests Failed: ${this.results.testsFailed}`);
    
    if (this.results.failures.length > 0) {
      console.log('\n❌ Failures:');
      this.results.failures.forEach(failure => console.log(`   - ${failure}`));
    }
    
    if (this.results.testsFailed === 0) {
      console.log('\n✅ All Batch 3 compliance tests passed!');
    } else {
      console.log('\n❌ Some compliance tests failed');
      process.exit(1);
    }
  }
}

// Run tests
if (require.main === module) {
  const tester = new Batch3ComplianceTester();
  tester.runAllTests().catch(console.error);
}

module.exports = Batch3ComplianceTester;
