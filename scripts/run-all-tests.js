#!/usr/bin/env node

/**
 * Comprehensive Test Suite - Run All Tests
 * Executes all test scripts and reports results
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Running comprehensive test suite...\n');

class TestRunner {
  constructor() {
    this.results = [];
    this.startTime = Date.now();
  }

  /**
   * Run a single test script
   */
  async runTest(testName, scriptPath) {
    console.log(`\n🔍 Running ${testName}...`);
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const child = spawn('node', [scriptPath], {
        stdio: 'pipe',
        cwd: process.cwd()
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        const success = code === 0;
        
        const result = {
          name: testName,
          script: scriptPath,
          success,
          exitCode: code,
          duration,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        };

        this.results.push(result);
        
        if (success) {
          console.log(`✅ ${testName}: PASSED (${duration}ms)`);
        } else {
          console.log(`❌ ${testName}: FAILED (${duration}ms)`);
          if (stderr) {
            console.log(`   Error: ${stderr}`);
          }
        }
        
        resolve(result);
      });
    });
  }

  /**
   * Run all test scripts
   */
  async runAllTests() {
    const tests = [
      { name: 'Bank Linting', script: 'scripts/lint-bank.js' },
      { name: 'Bank Packaging', script: 'scripts/pack-bank.js' },
      { name: 'Bank Signing', script: 'scripts/sign-bank.js' },
      { name: 'Engine API Tests', script: 'scripts/test-engine.js' },
      { name: 'Edge Policy Tests', script: 'scripts/test-edge-policies.js' },
      { name: 'Picks Zero Policy', script: 'scripts/test-picks-zero.js' },
      { name: 'Bank Immutability', script: 'scripts/test-bank-immutability.js' },
      { name: 'Engine Versioning', script: 'scripts/test-engine-versioning.js' },
      { name: 'Monitoring System', script: 'scripts/test-monitoring.js' },
      { name: 'Feature Flags', script: 'scripts/test-feature-flags.js' },
      { name: 'Load Testing', script: 'scripts/load-test.js' },
      { name: 'Deterministic Tie-break', script: 'scripts/test-deterministic-tiebreak.js' },
      { name: 'Broken Heavy Guard', script: 'scripts/test-broken-heavy-guard.js' },
      { name: 'Replay Tests', script: 'scripts/run-replay.js' },
      { name: 'Mathematical Verification', script: 'scripts/verify-counts.js' }
    ];

    console.log(`📋 Running ${tests.length} test suites...\n`);

    for (const test of tests) {
      try {
        await this.runTest(test.name, test.script);
      } catch (error) {
        console.log(`❌ ${test.name}: ERROR - ${error.message}`);
        this.results.push({
          name: test.name,
          script: test.script,
          success: false,
          exitCode: -1,
          duration: 0,
          stdout: '',
          stderr: error.message
        });
      }
    }
  }

  /**
   * Generate test report
   */
  generateReport() {
    const totalDuration = Date.now() - this.startTime;
    const passed = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;

    console.log('\n📊 TEST SUITE REPORT');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${total}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
    console.log(`Total Duration: ${totalDuration}ms`);
    console.log(`Average Duration: ${Math.round(totalDuration / total)}ms per test`);

    if (failed > 0) {
      console.log('\n❌ FAILED TESTS:');
      this.results
        .filter(r => !r.success)
        .forEach(result => {
          console.log(`  - ${result.name}: Exit code ${result.exitCode}`);
          if (result.stderr) {
            console.log(`    Error: ${result.stderr}`);
          }
        });
    }

    console.log('\n✅ PASSED TESTS:');
    this.results
      .filter(r => r.success)
      .forEach(result => {
        console.log(`  - ${result.name}: ${result.duration}ms`);
      });

    // Performance summary
    const performanceTests = this.results.filter(r => 
      r.name.includes('Load Testing') || 
      r.name.includes('Engine API') ||
      r.name.includes('Edge Policy')
    );

    if (performanceTests.length > 0) {
      console.log('\n⚡ PERFORMANCE SUMMARY:');
      performanceTests.forEach(result => {
        console.log(`  - ${result.name}: ${result.duration}ms`);
      });
    }

    // Critical tests status
    const criticalTests = [
      'Bank Linting',
      'Bank Packaging', 
      'Bank Signing',
      'Engine API Tests',
      'Load Testing'
    ];

    const criticalResults = this.results.filter(r => criticalTests.includes(r.name));
    const criticalPassed = criticalResults.filter(r => r.success).length;
    const criticalTotal = criticalResults.length;

    console.log('\n🎯 CRITICAL TESTS:');
    console.log(`  Passed: ${criticalPassed}/${criticalTotal}`);
    
    if (criticalPassed === criticalTotal) {
      console.log('  Status: ✅ ALL CRITICAL TESTS PASSED');
    } else {
      console.log('  Status: ❌ SOME CRITICAL TESTS FAILED');
    }

    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      totalDuration,
      criticalPassed,
      criticalTotal,
      allCriticalPassed: criticalPassed === criticalTotal
    };
  }

  /**
   * Save detailed results
   */
  saveResults() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.generateReport(),
      results: this.results
    };

    const fs = require('fs');
    const reportPath = 'test-results.json';
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed results saved to: ${reportPath}`);
    } catch (error) {
      console.log(`\n⚠️ Could not save results: ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  const runner = new TestRunner();
  
  try {
    await runner.runAllTests();
    const summary = runner.generateReport();
    runner.saveResults();
    
    if (summary.allCriticalPassed) {
      console.log('\n🎉 ALL CRITICAL TESTS PASSED! Engine is ready for production.');
      process.exit(0);
    } else {
      console.log('\n❌ SOME CRITICAL TESTS FAILED! Please fix issues before production.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite failed:', error.message);
    process.exit(1);
  }
}

runAllTests();
