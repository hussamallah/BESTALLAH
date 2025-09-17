#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Import engine modules
const { PFFEngine } = require('../engine/index');
const BankLoader = require('../engine/bankLoader');
const MultiRunAggregation = require('../engine/multiRunAggregation');
const CompatibilityCompute = require('../engine/compatibilityCompute');
const Governance = require('../engine/governance');
const IncidentPlaybook = require('../engine/incidentPlaybook');
const AcceptanceGates = require('../engine/acceptanceGates');
const ReplayAuditStore = require('../engine/replayAuditStore');
const MultiEnvConfig = require('../engine/multiEnvConfig');
const PrivacyConsent = require('../engine/privacyConsent');
const QaHeatmaps = require('../engine/qaHeatmaps');
const StaticIds = require('../engine/staticIds');
const PerformanceEnvelope = require('../engine/performanceEnvelope');
const BankFreezePolicy = require('../engine/bankFreezePolicy');
const DeprecationSunset = require('../engine/deprecationSunset');

console.log('🧪 COMPREHENSIVE TEST SUITE - PFF Quiz Engine');
console.log('================================================');

async function runComprehensiveTests() {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // Test 1: Bank Builder CLI with various scenarios
  console.log('\n📦 Test 1: Bank Builder CLI Scenarios');
  try {
    const { execSync } = require('child_process');
    
    // Test normal bank building
    console.log('  ✓ Testing normal bank building...');
    execSync('node scripts/bank-builder-cli.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Normal bank building', status: 'PASS' });
    
    // Test with invalid bank data (should fail)
    console.log('  ✓ Testing invalid bank data handling...');
    try {
      execSync('node scripts/bank-builder-cli.js --invalid-data', { stdio: 'pipe' });
      results.failed++;
      results.tests.push({ name: 'Invalid bank data handling', status: 'FAIL', error: 'Should have failed but succeeded' });
    } catch (error) {
      results.passed++;
      results.tests.push({ name: 'Invalid bank data handling', status: 'PASS' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Builder CLI', status: 'FAIL', error: error.message });
  }

  // Test 2: Engine API with edge cases
  console.log('\n🔧 Test 2: Engine API Edge Cases');
  try {
    const engine = new PFFEngine();
    
    // Test with minimal picks (1 family)
    console.log('  ✓ Testing minimal picks (1 family)...');
    const session1 = engine.initSession('test-session-1', ['Control'], './bank/packaged/bank_package.json');
    if (session1 && session1.picks.length === 1) {
      results.passed++;
      results.tests.push({ name: 'Minimal picks (1 family)', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Minimal picks (1 family)', status: 'FAIL', error: 'Invalid session state' });
    }
    
    // Test with maximum picks (7 families)
    console.log('  ✓ Testing maximum picks (7 families)...');
    const session2 = engine.initSession('test-session-2', ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'], './bank/packaged/bank_package.json');
    if (session2 && session2.picks.length === 7) {
      results.passed++;
      results.tests.push({ name: 'Maximum picks (7 families)', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Maximum picks (7 families)', status: 'FAIL', error: 'Invalid session state' });
    }
    
    // Test with invalid family names
    console.log('  ✓ Testing invalid family names...');
    try {
      engine.initSession('test-session-3', ['InvalidFamily'], './bank/packaged/bank_package.json');
      results.failed++;
      results.tests.push({ name: 'Invalid family names', status: 'FAIL', error: 'Should have failed but succeeded' });
    } catch (error) {
      results.passed++;
      results.tests.push({ name: 'Invalid family names', status: 'PASS' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Engine API Edge Cases', status: 'FAIL', error: error.message });
  }

  // Test 3: Multi-Run Aggregation
  console.log('\n📊 Test 3: Multi-Run Aggregation');
  try {
    // Create mock final snapshots
    const mockSnapshots = [
      {
        bank_id: 'pff.v1.0',
        line_verdicts: { Control: 'C', Pace: 'O', Boundary: 'C' },
        face_states: { 'FACE/Control/Sovereign': 'LIT', 'FACE/Pace/Navigator': 'LEAN' },
        family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
      },
      {
        bank_id: 'pff.v1.0',
        line_verdicts: { Control: 'C', Pace: 'C', Boundary: 'O' },
        face_states: { 'FACE/Control/Sovereign': 'LIT', 'FACE/Pace/Navigator': 'LIT' },
        family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
      }
    ];
    
    const aggregate = MultiRunAggregation.aggregateSessions(mockSnapshots);
    if (aggregate && aggregate.line_consensus) {
      results.passed++;
      results.tests.push({ name: 'Multi-Run Aggregation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Multi-Run Aggregation', status: 'FAIL', error: 'Invalid aggregate result' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Multi-Run Aggregation', status: 'FAIL', error: error.message });
  }

  // Test 4: Compatibility Compute
  console.log('\n🔗 Test 4: Compatibility Compute');
  try {
    const compatibility = new CompatibilityCompute();
    
    const userA = {
      line_verdicts: { Control: 'C', Pace: 'O', Boundary: 'C' },
      family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
    };
    
    const userB = {
      line_verdicts: { Control: 'C', Pace: 'C', Boundary: 'O' },
      family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
    };
    
    const result = compatibility.computeCompatibility(userA, userB);
    if (result && result.score_class) {
      results.passed++;
      results.tests.push({ name: 'Compatibility Compute', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Compatibility Compute', status: 'FAIL', error: 'Invalid compatibility result' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Compatibility Compute', status: 'FAIL', error: error.message });
  }

  // Test 5: Governance System
  console.log('\n👥 Test 5: Governance System');
  try {
    const governance = new Governance();
    
    // Test role validation
    const isValidRole = governance.validateRole('QA');
    if (isValidRole) {
      results.passed++;
      results.tests.push({ name: 'Role validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Role validation', status: 'FAIL', error: 'Invalid role validation' });
    }
    
    // Test promotion checklist
    const mockBank = { linter_ok: true, errors: [] };
    const canPromote = governance.canPromote(mockBank);
    if (canPromote) {
      results.passed++;
      results.tests.push({ name: 'Promotion checklist', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Promotion checklist', status: 'FAIL', error: 'Invalid promotion check' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Governance System', status: 'FAIL', error: error.message });
  }

  // Test 6: Incident Playbook
  console.log('\n🚨 Test 6: Incident Playbook');
  try {
    const incident = new IncidentPlaybook();
    
    // Test incident detection
    const mockMetrics = { E_BANK_DEFECT_RUNTIME: 5, qa_flags_rate: 0.1, finalize_success_rate: 0.95 };
    const triggers = incident.detectTriggers(mockMetrics);
    if (triggers && Array.isArray(triggers)) {
      results.passed++;
      results.tests.push({ name: 'Incident detection', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Incident detection', status: 'FAIL', error: 'Invalid trigger detection' });
    }
    
    // Test incident response
    const response = incident.generateResponse(triggers);
    if (response && response.actions) {
      results.passed++;
      results.tests.push({ name: 'Incident response', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Incident response', status: 'FAIL', error: 'Invalid incident response' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Incident Playbook', status: 'FAIL', error: error.message });
  }

  // Test 7: Acceptance Gates
  console.log('\n🚪 Test 7: Acceptance Gates');
  try {
    const gates = new AcceptanceGates();
    
    // Test with valid bank
    const validBank = { linter_ok: true, errors: [], calibration_report: { recommendation: 'DEFAULT' } };
    const canDeploy = gates.canDeploy(validBank);
    if (canDeploy) {
      results.passed++;
      results.tests.push({ name: 'Valid bank deployment', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Valid bank deployment', status: 'FAIL', error: 'Should allow deployment' });
    }
    
    // Test with invalid bank
    const invalidBank = { linter_ok: false, errors: ['Test error'], calibration_report: { recommendation: 'REJECTED' } };
    const cannotDeploy = !gates.canDeploy(invalidBank);
    if (cannotDeploy) {
      results.passed++;
      results.tests.push({ name: 'Invalid bank deployment', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Invalid bank deployment', status: 'FAIL', error: 'Should block deployment' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Acceptance Gates', status: 'FAIL', error: error.message });
  }

  // Test 8: Privacy & Consent
  console.log('\n🔒 Test 8: Privacy & Consent');
  try {
    const privacy = new PrivacyConsent();
    
    // Test consent validation
    const validConsent = { consent_version: 1, privacy_flags: { allow_export: true } };
    const isValid = privacy.validateConsent(validConsent);
    if (isValid) {
      results.passed++;
      results.tests.push({ name: 'Consent validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Consent validation', status: 'FAIL', error: 'Invalid consent validation' });
    }
    
    // Test export gating
    const canExport = privacy.canExport(validConsent);
    if (canExport) {
      results.passed++;
      results.tests.push({ name: 'Export gating', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Export gating', status: 'FAIL', error: 'Should allow export' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Privacy & Consent', status: 'FAIL', error: error.message });
  }

  // Test 9: Performance Envelope
  console.log('\n⚡ Test 9: Performance Envelope');
  try {
    const performance = new PerformanceEnvelope();
    
    // Test latency measurement
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1)); // Simulate 1ms operation
    const latency = Date.now() - start;
    
    const isWithinBounds = performance.checkLatency('submit_answer', latency);
    if (isWithinBounds) {
      results.passed++;
      results.tests.push({ name: 'Latency measurement', status: 'PASS' });
    } else {
      results.warnings++;
      results.tests.push({ name: 'Latency measurement', status: 'WARN', error: 'Latency outside bounds' });
    }
    
    // Test memory usage
    const memoryUsage = process.memoryUsage();
    const isMemoryOk = performance.checkMemory(memoryUsage.heapUsed);
    if (isMemoryOk) {
      results.passed++;
      results.tests.push({ name: 'Memory usage', status: 'PASS' });
    } else {
      results.warnings++;
      results.tests.push({ name: 'Memory usage', status: 'WARN', error: 'Memory usage high' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Performance Envelope', status: 'FAIL', error: error.message });
  }

  // Test 10: Bank Freeze Policy
  console.log('\n❄️ Test 10: Bank Freeze Policy');
  try {
    const freezePolicy = new BankFreezePolicy();
    
    // Test bank freezing
    const bankId = 'test-bank-v1.0';
    freezePolicy.freezeBank(bankId);
    
    const isFrozen = freezePolicy.isBankFrozen(bankId);
    if (isFrozen) {
      results.passed++;
      results.tests.push({ name: 'Bank freezing', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Bank freezing', status: 'FAIL', error: 'Bank should be frozen' });
    }
    
    // Test session blocking
    const canInitSession = freezePolicy.canInitSession(bankId);
    if (!canInitSession) {
      results.passed++;
      results.tests.push({ name: 'Session blocking', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Session blocking', status: 'FAIL', error: 'Should block session init' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Freeze Policy', status: 'FAIL', error: error.message });
  }

  // Test 11: Static IDs & Canonicalization
  console.log('\n🆔 Test 11: Static IDs & Canonicalization');
  try {
    const staticIds = new StaticIds();
    
    // Test QID validation
    const validQid = 'CTRL_Q1';
    const isValidQid = staticIds.validateQid(validQid);
    if (isValidQid) {
      results.passed++;
      results.tests.push({ name: 'QID validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'QID validation', status: 'FAIL', error: 'Invalid QID validation' });
    }
    
    // Test tell ID validation
    const validTellId = 'TELL/Control/Sovereign/sets-call';
    const isValidTellId = staticIds.validateTellId(validTellId);
    if (isValidTellId) {
      results.passed++;
      results.tests.push({ name: 'Tell ID validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Tell ID validation', status: 'FAIL', error: 'Invalid tell ID validation' });
    }
    
    // Test canonicalization
    const testObj = { c: 3, a: 1, b: 2 };
    const canonical = staticIds.canonicalize(testObj);
    const expectedKeys = ['a', 'b', 'c'];
    if (JSON.stringify(Object.keys(canonical)) === JSON.stringify(expectedKeys)) {
      results.passed++;
      results.tests.push({ name: 'Canonicalization', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Canonicalization', status: 'FAIL', error: 'Invalid canonicalization' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Static IDs & Canonicalization', status: 'FAIL', error: error.message });
  }

  // Test 12: Multi-Environment Config
  console.log('\n🌍 Test 12: Multi-Environment Config');
  try {
    const multiEnv = new MultiEnvConfig();
    
    // Test environment-specific config
    const devConfig = multiEnv.getConfig('dev');
    if (devConfig && devConfig.signingKey) {
      results.passed++;
      results.tests.push({ name: 'Environment config', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Environment config', status: 'FAIL', error: 'Invalid environment config' });
    }
    
    // Test environment isolation
    const prodConfig = multiEnv.getConfig('prod');
    const isIsolated = devConfig.signingKey !== prodConfig.signingKey;
    if (isIsolated) {
      results.passed++;
      results.tests.push({ name: 'Environment isolation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Environment isolation', status: 'FAIL', error: 'Environments not isolated' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Multi-Environment Config', status: 'FAIL', error: error.message });
  }

  // Test 13: QA Heatmaps
  console.log('\n📈 Test 13: QA Heatmaps');
  try {
    const qaHeatmaps = new QaHeatmaps();
    
    // Test heatmap generation
    const mockData = {
      face_id: 'FACE/Control/Sovereign',
      families: [
        { family: 'Control', opportunities: 3 },
        { family: 'Pace', opportunities: 2 },
        { family: 'Boundary', opportunities: 1 }
      ]
    };
    
    const heatmap = qaHeatmaps.generateHeatmap(mockData);
    if (heatmap && heatmap.face_id) {
      results.passed++;
      results.tests.push({ name: 'Heatmap generation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Heatmap generation', status: 'FAIL', error: 'Invalid heatmap generation' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'QA Heatmaps', status: 'FAIL', error: error.message });
  }

  // Test 14: Deprecation & Sunset
  console.log('\n🌅 Test 14: Deprecation & Sunset');
  try {
    const deprecation = new DeprecationSunset();
    
    // Test deprecation marking
    const bankId = 'test-bank-v1.0';
    deprecation.markDeprecated(bankId);
    
    const isDeprecated = deprecation.isDeprecated(bankId);
    if (isDeprecated) {
      results.passed++;
      results.tests.push({ name: 'Deprecation marking', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Deprecation marking', status: 'FAIL', error: 'Bank should be deprecated' });
    }
    
    // Test sunset policy
    const sunsetPolicy = deprecation.getSunsetPolicy(bankId);
    if (sunsetPolicy && sunsetPolicy.retentionDays) {
      results.passed++;
      results.tests.push({ name: 'Sunset policy', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Sunset policy', status: 'FAIL', error: 'Invalid sunset policy' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Deprecation & Sunset', status: 'FAIL', error: error.message });
  }

  // Test 15: Replay Audit Store
  console.log('\n📋 Test 15: Replay Audit Store');
  try {
    const auditStore = new ReplayAuditStore();
    
    // Test audit record creation
    const auditRecord = {
      replay_id: 'test-replay-123',
      bank_id: 'test-bank-v1.0',
      bank_hash_sha256: 'test-hash',
      payload_hash: 'test-payload-hash',
      final_snapshot_hash: 'test-snapshot-hash',
      result: 'MATCH'
    };
    
    const created = auditStore.createAuditRecord(auditRecord);
    if (created) {
      results.passed++;
      results.tests.push({ name: 'Audit record creation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Audit record creation', status: 'FAIL', error: 'Failed to create audit record' });
    }
    
    // Test audit record retrieval
    const retrieved = auditStore.getAuditRecord('test-replay-123');
    if (retrieved && retrieved.replay_id === 'test-replay-123') {
      results.passed++;
      results.tests.push({ name: 'Audit record retrieval', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Audit record retrieval', status: 'FAIL', error: 'Failed to retrieve audit record' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Replay Audit Store', status: 'FAIL', error: error.message });
  }

  // Test 16: PFF CLI Commands
  console.log('\n💻 Test 16: PFF CLI Commands');
  try {
    const { execSync } = require('child_process');
    
    // Test help command
    console.log('  ✓ Testing help command...');
    execSync('node scripts/pff-cli.js --help', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Help command', status: 'PASS' });
    
    // Test pack command
    console.log('  ✓ Testing pack command...');
    execSync('node scripts/pff-cli.js pack', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Pack command', status: 'PASS' });
    
    // Test validate command
    console.log('  ✓ Testing validate command...');
    execSync('node scripts/pff-cli.js validate', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Validate command', status: 'PASS' });
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'PFF CLI Commands', status: 'FAIL', error: error.message });
  }

  // Test 17: Error Handling and Edge Cases
  console.log('\n⚠️ Test 17: Error Handling and Edge Cases');
  try {
    const engine = new Engine();
    
    // Test with empty picks array
    try {
      engine.initSession('test-empty', []);
      results.failed++;
      results.tests.push({ name: 'Empty picks array', status: 'FAIL', error: 'Should have failed but succeeded' });
    } catch (error) {
      results.passed++;
      results.tests.push({ name: 'Empty picks array', status: 'PASS' });
    }
    
    // Test with duplicate family picks
    try {
      engine.initSession('test-duplicate', ['Control', 'Control']);
      results.failed++;
      results.tests.push({ name: 'Duplicate family picks', status: 'FAIL', error: 'Should have failed but succeeded' });
    } catch (error) {
      results.passed++;
      results.tests.push({ name: 'Duplicate family picks', status: 'PASS' });
    }
    
    // Test with null/undefined inputs
    try {
      engine.initSession(null, ['Control']);
      results.failed++;
      results.tests.push({ name: 'Null session ID', status: 'FAIL', error: 'Should have failed but succeeded' });
    } catch (error) {
      results.passed++;
      results.tests.push({ name: 'Null session ID', status: 'PASS' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Error Handling and Edge Cases', status: 'FAIL', error: error.message });
  }

  // Test 18: Performance and Load Testing
  console.log('\n🚀 Test 18: Performance and Load Testing');
  try {
    const engine = new Engine();
    const startTime = Date.now();
    
    // Create multiple sessions quickly
    const sessionPromises = [];
    for (let i = 0; i < 100; i++) {
      sessionPromises.push(engine.initSession(`perf-test-${i}`, ['Control', 'Pace']));
    }
    
    const sessions = await Promise.all(sessionPromises);
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (sessions.length === 100 && duration < 1000) { // Should complete in under 1 second
      results.passed++;
      results.tests.push({ name: 'Performance test (100 sessions)', status: 'PASS' });
    } else {
      results.warnings++;
      results.tests.push({ name: 'Performance test (100 sessions)', status: 'WARN', error: `Took ${duration}ms for 100 sessions` });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Performance and Load Testing', status: 'FAIL', error: error.message });
  }

  // Test 19: Data Integrity and Consistency
  console.log('\n🔒 Test 19: Data Integrity and Consistency');
  try {
    const engine = new Engine();
    const session = engine.initSession('integrity-test', ['Control', 'Pace']);
    
    // Test that session state is consistent
    if (session.picks.length === 2 && 
        session.picks.includes('Control') && 
        session.picks.includes('Pace')) {
      results.passed++;
      results.tests.push({ name: 'Session state consistency', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Session state consistency', status: 'FAIL', error: 'Invalid session state' });
    }
    
    // Test that line state is properly initialized
    const lineState = session.lineState;
    if (lineState && lineState.has('Control') && lineState.has('Pace')) {
      results.passed++;
      results.tests.push({ name: 'Line state initialization', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Line state initialization', status: 'FAIL', error: 'Invalid line state' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Data Integrity and Consistency', status: 'FAIL', error: error.message });
  }

  // Test 20: Integration Testing
  console.log('\n🔗 Test 20: Integration Testing');
  try {
    const engine = new Engine();
    const session = engine.initSession('integration-test', ['Control', 'Pace', 'Boundary']);
    
    // Test complete session flow
    const nextQuestion = engine.getNextQuestion(session.sessionId);
    if (nextQuestion) {
      results.passed++;
      results.tests.push({ name: 'Question retrieval', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Question retrieval', status: 'FAIL', error: 'Failed to get next question' });
    }
    
    // Test answer submission
    const answerResult = engine.submitAnswer(session.sessionId, nextQuestion.qid, 'A');
    if (answerResult) {
      results.passed++;
      results.tests.push({ name: 'Answer submission', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Answer submission', status: 'FAIL', error: 'Failed to submit answer' });
    }
    
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Integration Testing', status: 'FAIL', error: error.message });
  }

  // Print comprehensive results
  console.log('\n📊 COMPREHENSIVE TEST RESULTS');
  console.log('==============================');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Warnings: ${results.warnings}`);
  console.log(`📈 Total Tests: ${results.tests.length}`);
  
  const successRate = ((results.passed / results.tests.length) * 100).toFixed(1);
  console.log(`🎯 Success Rate: ${successRate}%`);
  
  console.log('\n📋 DETAILED TEST RESULTS');
  console.log('========================');
  results.tests.forEach((test, index) => {
    const status = test.status === 'PASS' ? '✅' : test.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${index + 1}. ${status} ${test.name}`);
    if (test.error) {
      console.log(`   Error: ${test.error}`);
    }
  });
  
  if (results.failed > 0) {
    console.log('\n🚨 FAILED TESTS SUMMARY');
    console.log('=======================');
    results.tests
      .filter(test => test.status === 'FAIL')
      .forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}: ${test.error}`);
      });
  }
  
  if (results.warnings > 0) {
    console.log('\n⚠️  WARNING SUMMARY');
    console.log('==================');
    results.tests
      .filter(test => test.status === 'WARN')
      .forEach((test, index) => {
        console.log(`${index + 1}. ${test.name}: ${test.error}`);
      });
  }
  
  console.log('\n🎉 COMPREHENSIVE TEST SUITE COMPLETE!');
  
  return results;
}

// Run the comprehensive test suite
runComprehensiveTests().catch(console.error);
