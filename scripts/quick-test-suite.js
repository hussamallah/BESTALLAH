#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

console.log('⚡ QUICK TEST SUITE - PFF Quiz Engine');
console.log('=====================================');

async function runQuickTests() {
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

  // Test 8: Engine API - Simple Test
  console.log('\n🔧 Test 8: Engine API - Simple Test');
  try {
    const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');
    
    // Quick test with minimal questions
    const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package.json');
    const session = initSession('quick-test-123', bankPath);
    
    if (session && session.session_id) {
      results.passed++;
      results.tests.push({ name: 'Engine API - Simple Test', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Engine API - Simple Test', status: 'FAIL', error: 'Invalid session created' });
    }
  } catch (error) {
    results.failed++;
    results.tests.push({ name: 'Engine API - Simple Test', status: 'FAIL', error: error.message });
  }

  // Test 9: Multi-Run Aggregation
  console.log('\n📊 Test 9: Multi-Run Aggregation');
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

  // Test 10: Compatibility Compute
  console.log('\n🔗 Test 10: Compatibility Compute');
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

  // Test 11: File System Tests
  console.log('\n📁 Test 11: File System Tests');
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

  // Test 12: Batch 5 Modules - Quick Tests
  console.log('\n🚀 Test 12: Batch 5 Modules - Quick Tests');
  try {
    // Test Governance
    const Governance = require('../engine/governance');
    const isValidRole = Governance.validateRole('QA');
    if (isValidRole) {
      results.passed++;
      results.tests.push({ name: 'Governance Role Validation', status: 'PASS' });
    } else {
      results.failed++;
      results.tests.push({ name: 'Governance Role Validation', status: 'FAIL', error: 'Invalid role validation' });
    }

    // Test Incident Playbook
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

    // Test Acceptance Gates
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
    results.tests.push({ name: 'Batch 5 Modules - Quick Tests', status: 'FAIL', error: error.message });
  }

  // Print results
  console.log('\n📊 QUICK TEST RESULTS');
  console.log('======================');
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
  
  console.log('\n🎉 QUICK TEST SUITE COMPLETE!');
  
  return results;
}

// Run the quick test suite
runQuickTests().catch(console.error);
