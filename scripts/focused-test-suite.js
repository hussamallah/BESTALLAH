#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('🎯 FOCUSED TEST SUITE - PFF Quiz Engine');
console.log('========================================');

async function runFocusedTests() {
  const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    tests: []
  };

  // Test 1: Bank Builder CLI
  console.log('\n📦 Test 1: Bank Builder CLI');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/bank-builder-cli.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Bank Builder CLI', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Builder CLI', status: 'FAIL', error: error.message });
  }

  // Test 2: Bank Linter
  console.log('\n🔍 Test 2: Bank Linter');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/bank-linter.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Bank Linter', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Linter', status: 'FAIL', error: error.message });
  }

  // Test 3: Bank Packer
  console.log('\n📦 Test 3: Bank Packer');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/bank-packer.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Bank Packer', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Packer', status: 'FAIL', error: error.message });
  }

  // Test 4: Bank Signer
  console.log('\n🔐 Test 4: Bank Signer');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/bank-signer.js sign', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Bank Signer (sign)', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Signer (sign)', status: 'FAIL', error: error.message });
  }

  // Test 5: Bank Signer Verify
  console.log('\n🔍 Test 5: Bank Signer Verify');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/bank-signer.js verify', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Bank Signer (verify)', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Signer (verify)', status: 'FAIL', error: error.message });
  }

  // Test 6: PFF CLI Help
  console.log('\n💻 Test 6: PFF CLI Help');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/pff-cli.js --help', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'PFF CLI Help', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'PFF CLI Help', status: 'FAIL', error: error.message });
  }

  // Test 7: PFF CLI Pack
  console.log('\n📦 Test 7: PFF CLI Pack');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/pff-cli.js pack', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'PFF CLI Pack', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'PFF CLI Pack', status: 'FAIL', error: error.message });
  }

  // Test 8: Engine API Tests
  console.log('\n🔧 Test 8: Engine API Tests');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/test-engine.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Engine API Tests', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Engine API Tests', status: 'FAIL', error: error.message });
  }

  // Test 9: Edge Policy Tests
  console.log('\n⚡ Test 9: Edge Policy Tests');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/test-edge-policies.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Edge Policy Tests', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Edge Policy Tests', status: 'FAIL', error: error.message });
  }

  // Test 10: Replay Tests
  console.log('\n🔄 Test 10: Replay Tests');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/run-replay.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Replay Tests', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Replay Tests', status: 'FAIL', error: error.message });
  }

  // Test 11: Mathematical Verification
  console.log('\n🧮 Test 11: Mathematical Verification');
  try {
    const { execSync } = require('child_process');
    execSync('node scripts/verify-counts.js', { stdio: 'pipe' });
    results.passed++;
    results.tests.push({ name: 'Mathematical Verification', status: 'PASS' });
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Mathematical Verification', status: 'FAIL', error: error.message });
  }

  // Test 12: Batch 5 Modules - Multi-Run Aggregation
  console.log('\n📊 Test 12: Multi-Run Aggregation');
  try {
    const MultiRunAggregation = require('../engine/multiRunAggregation');
    
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

  // Test 13: Batch 5 Modules - Compatibility Compute
  console.log('\n🔗 Test 13: Compatibility Compute');
  try {
    const CompatibilityCompute = require('../engine/compatibilityCompute');
    
    const userA = {
      bank_id: 'pff.v1.0',
      line_verdicts: { Control: 'C', Pace: 'O', Boundary: 'C' },
      family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
    };
    
    const userB = {
      bank_id: 'pff.v1.0',
      line_verdicts: { Control: 'C', Pace: 'C', Boundary: 'O' },
      family_reps: [{ family: 'Control', rep: 'FACE/Control/Sovereign', rep_state: 'LIT' }]
    };
    
    const result = CompatibilityCompute.computeCompatibility(userA, userB);
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

  // Test 14: Batch 5 Modules - Governance
  console.log('\n👥 Test 14: Governance System');
  try {
    const Governance = require('../engine/governance');
    
    const isValidRole = Governance.validateRole('QA');
    if (isValidRole) {
      results.passed++;
      results.tests.push({ name: 'Governance Role Validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Governance Role Validation', status: 'FAIL', error: 'Invalid role validation' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Governance System', status: 'FAIL', error: error.message });
  }

  // Test 15: Batch 5 Modules - Incident Playbook
  console.log('\n🚨 Test 15: Incident Playbook');
  try {
    const IncidentPlaybook = require('../engine/incidentPlaybook');
    
    const mockMetrics = { E_BANK_DEFECT_RUNTIME: 5, qa_flags_rate: 0.1, finalize_success_rate: 0.95 };
    const triggers = IncidentPlaybook.detectTriggers(mockMetrics);
    if (triggers && Array.isArray(triggers)) {
      results.passed++;
      results.tests.push({ name: 'Incident Detection', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Incident Detection', status: 'FAIL', error: 'Invalid trigger detection' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Incident Playbook', status: 'FAIL', error: error.message });
  }

  // Test 16: Batch 5 Modules - Acceptance Gates
  console.log('\n🚪 Test 16: Acceptance Gates');
  try {
    const AcceptanceGates = require('../engine/acceptanceGates');
    
    const validBank = { linter_ok: true, errors: [], calibration_report: { recommendation: 'DEFAULT' } };
    const canDeploy = AcceptanceGates.canDeploy(validBank);
    if (canDeploy) {
      results.passed++;
      results.tests.push({ name: 'Acceptance Gates', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Acceptance Gates', status: 'FAIL', error: 'Should allow deployment' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Acceptance Gates', status: 'FAIL', error: error.message });
  }

  // Test 17: Batch 5 Modules - Privacy & Consent
  console.log('\n🔒 Test 17: Privacy & Consent');
  try {
    const PrivacyConsent = require('../engine/privacyConsent');
    
    const validConsent = { consent_version: 1, privacy_flags: { allow_export: true } };
    const isValid = PrivacyConsent.validateConsent(validConsent);
    if (isValid) {
      results.passed++;
      results.tests.push({ name: 'Privacy & Consent', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Privacy & Consent', status: 'FAIL', error: 'Invalid consent validation' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Privacy & Consent', status: 'FAIL', error: error.message });
  }

  // Test 18: Batch 5 Modules - Performance Envelope
  console.log('\n⚡ Test 18: Performance Envelope');
  try {
    const PerformanceEnvelope = require('../engine/performanceEnvelope');
    
    const start = Date.now();
    await new Promise(resolve => setTimeout(resolve, 1));
    const latency = Date.now() - start;
    
    const isWithinBounds = PerformanceEnvelope.checkLatency('submit_answer', latency);
    if (isWithinBounds) {
      results.passed++;
      results.tests.push({ name: 'Performance Envelope', status: 'PASS' });
    } else {
      results.warnings++;
      results.tests.push({ name: 'Performance Envelope', status: 'WARN', error: 'Latency outside bounds' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Performance Envelope', status: 'FAIL', error: error.message });
  }

  // Test 19: Batch 5 Modules - Bank Freeze Policy
  console.log('\n❄️ Test 19: Bank Freeze Policy');
  try {
    const BankFreezePolicy = require('../engine/bankFreezePolicy');
    
    const bankId = 'test-bank-v1.0';
    BankFreezePolicy.freezeBank(bankId);
    
    const isFrozen = BankFreezePolicy.isBankFrozen(bankId);
    if (isFrozen) {
      results.passed++;
      results.tests.push({ name: 'Bank Freeze Policy', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Bank Freeze Policy', status: 'FAIL', error: 'Bank should be frozen' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Bank Freeze Policy', status: 'FAIL', error: error.message });
  }

  // Test 20: Batch 5 Modules - Static IDs
  console.log('\n🆔 Test 20: Static IDs & Canonicalization');
  try {
    const StaticIds = require('../engine/staticIds');
    
    const validQid = 'CTRL_Q1';
    const isValidQid = StaticIds.validateQid(validQid);
    if (isValidQid) {
      results.passed++;
      results.tests.push({ name: 'Static IDs', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Static IDs', status: 'FAIL', error: 'Invalid QID validation' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Static IDs & Canonicalization', status: 'FAIL', error: error.message });
  }

  // Test 21: Batch 5 Modules - Multi-Environment Config
  console.log('\n🌍 Test 21: Multi-Environment Config');
  try {
    const MultiEnvConfig = require('../engine/multiEnvConfig');
    
    const devConfig = MultiEnvConfig.getConfig('dev');
    if (devConfig && devConfig.signingKey) {
      results.passed++;
      results.tests.push({ name: 'Multi-Environment Config', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Multi-Environment Config', status: 'FAIL', error: 'Invalid environment config' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Multi-Environment Config', status: 'FAIL', error: error.message });
  }

  // Test 22: Batch 5 Modules - QA Heatmaps
  console.log('\n📈 Test 22: QA Heatmaps');
  try {
    const QaHeatmaps = require('../engine/qaHeatmaps');
    
    const mockData = {
      face_id: 'FACE/Control/Sovereign',
      families: [
        { family: 'Control', opportunities: 3 },
        { family: 'Pace', opportunities: 2 },
        { family: 'Boundary', opportunities: 1 }
      ]
    };
    
    const heatmap = QaHeatmaps.generateHeatmap(mockData);
    if (heatmap && heatmap.face_id) {
      results.passed++;
      results.tests.push({ name: 'QA Heatmaps', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'QA Heatmaps', status: 'FAIL', error: 'Invalid heatmap generation' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'QA Heatmaps', status: 'FAIL', error: error.message });
  }

  // Test 23: Batch 5 Modules - Deprecation & Sunset
  console.log('\n🌅 Test 23: Deprecation & Sunset');
  try {
    const DeprecationSunset = require('../engine/deprecationSunset');
    
    const bankId = 'test-bank-v1.0';
    DeprecationSunset.markDeprecated(bankId);
    
    const isDeprecated = DeprecationSunset.isDeprecated(bankId);
    if (isDeprecated) {
      results.passed++;
      results.tests.push({ name: 'Deprecation & Sunset', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Deprecation & Sunset', status: 'FAIL', error: 'Bank should be deprecated' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Deprecation & Sunset', status: 'FAIL', error: error.message });
  }

  // Test 24: Batch 5 Modules - Replay Audit Store
  console.log('\n📋 Test 24: Replay Audit Store');
  try {
    const ReplayAuditStore = require('../engine/replayAuditStore');
    
    const auditRecord = {
      replay_id: 'test-replay-123',
      bank_id: 'test-bank-v1.0',
      bank_hash_sha256: 'test-hash',
      payload_hash: 'test-payload-hash',
      final_snapshot_hash: 'test-snapshot-hash',
      result: 'MATCH'
    };
    
    const created = ReplayAuditStore.createAuditRecord(auditRecord);
    if (created) {
      results.passed++;
      results.tests.push({ name: 'Replay Audit Store', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Replay Audit Store', status: 'FAIL', error: 'Failed to create audit record' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Replay Audit Store', status: 'FAIL', error: error.message });
  }

  // Test 25: File System Tests
  console.log('\n📁 Test 25: File System Tests');
  try {
    // Check if bank package exists
    const bankPackagePath = './bank/packaged/bank_package.json';
    if (fs.existsSync(bankPackagePath)) {
      results.passed++;
      results.tests.push({ name: 'Bank Package Exists', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Bank Package Exists', status: 'FAIL', error: 'Bank package not found' });
    }

    // Check if bank package is valid JSON
    try {
      const bankPackage = JSON.parse(fs.readFileSync(bankPackagePath, 'utf8'));
      if (bankPackage && bankPackage.hash) {
        results.passed++;
        results.tests.push({ name: 'Bank Package Valid JSON', status: 'PASS' });
      } else {
        results.failed++;
        results.tests.push({ name: 'Bank Package Valid JSON', status: 'FAIL', error: 'Invalid bank package structure' });
      }
    } catch (error) {
      results.failed++;
      results.tests.push({ name: 'Bank Package Valid JSON', status: 'FAIL', error: 'Invalid JSON format' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'File System Tests', status: 'FAIL', error: error.message });
  }

  // Print comprehensive results
  console.log('\n📊 FOCUSED TEST RESULTS');
  console.log('========================');
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
  
  console.log('\n🎉 FOCUSED TEST SUITE COMPLETE!');
  
  return results;
}

// Run the focused test suite
runFocusedTests().catch(console.error);
