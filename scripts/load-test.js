#!/usr/bin/env node

/**
 * Load Testing Suite - Verify Performance Targets
 * Tests: 10k QPS getNextQuestion, 5k QPS submitAnswer, 3k QPS finalizeSession
 */

const { 
  initSession, 
  setPicks, 
  getNextQuestion, 
  submitAnswer, 
  finalizeSession,
  getDashboardData
} = require('../engine');

console.log('🚀 Starting load testing suite...');

class LoadTester {
  constructor() {
    this.results = {
      getNextQuestion: [],
      submitAnswer: [],
      finalizeSession: [],
      errors: []
    };
    this.sessions = [];
  }

  /**
   * Run a single session to completion
   */
  async runSingleSession(sessionId, pickedFamilies) {
    const startTime = Date.now();
    
    try {
      // Initialize session
      const session = initSession(sessionId, './bank/packaged/bank_package_signed.json');
      
      // Set picks
      const updatedSession = setPicks(session.sessionId, pickedFamilies);
      
      // Run through all questions
      let questionCount = 0;
      let currentQuestion = getNextQuestion(updatedSession.sessionId);
      
      while (currentQuestion) {
        questionCount++;
        submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
        currentQuestion = getNextQuestion(updatedSession.sessionId);
      }
      
      // Finalize session
      const results = finalizeSession(updatedSession.sessionId);
      
      const duration = Date.now() - startTime;
      return {
        success: true,
        duration,
        questionCount,
        sessionId
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message,
        duration: Date.now() - startTime,
        sessionId
      };
    }
  }

  /**
   * Test getNextQuestion performance
   */
  async testGetNextQuestionPerformance(iterations = 1000) {
    console.log(`\n🧪 Testing getNextQuestion performance (${iterations} iterations)...`);
    
    const session = initSession('load-test-gnq', './bank/packaged/bank_package_signed.json');
    const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
    
    const times = [];
    let currentQuestion = getNextQuestion(updatedSession.sessionId);
    
    for (let i = 0; i < iterations && currentQuestion; i++) {
      const startTime = process.hrtime.bigint();
      currentQuestion = getNextQuestion(updatedSession.sessionId);
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      times.push(duration);
    }
    
    return this.calculateStats(times, 'getNextQuestion');
  }

  /**
   * Test submitAnswer performance
   */
  async testSubmitAnswerPerformance(iterations = 1000) {
    console.log(`\n🧪 Testing submitAnswer performance (${iterations} iterations)...`);
    
    const session = initSession('load-test-sa', './bank/packaged/bank_package_signed.json');
    const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
    
    const times = [];
    let currentQuestion = getNextQuestion(updatedSession.sessionId);
    
    for (let i = 0; i < iterations && currentQuestion; i++) {
      const startTime = process.hrtime.bigint();
      submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      times.push(duration);
      
      currentQuestion = getNextQuestion(updatedSession.sessionId);
    }
    
    return this.calculateStats(times, 'submitAnswer');
  }

  /**
   * Test finalizeSession performance
   */
  async testFinalizeSessionPerformance(iterations = 100) {
    console.log(`\n🧪 Testing finalizeSession performance (${iterations} iterations)...`);
    
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const sessionId = `load-test-fs-${i}`;
      const session = initSession(sessionId, './bank/packaged/bank_package_signed.json');
      const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
      
      // Run through all questions
      let currentQuestion = getNextQuestion(updatedSession.sessionId);
      while (currentQuestion) {
        submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
        currentQuestion = getNextQuestion(updatedSession.sessionId);
      }
      
      // Time the finalize operation
      const startTime = process.hrtime.bigint();
      finalizeSession(updatedSession.sessionId);
      const endTime = process.hrtime.bigint();
      
      const duration = Number(endTime - startTime) / 1000000; // Convert to ms
      times.push(duration);
    }
    
    return this.calculateStats(times, 'finalizeSession');
  }

  /**
   * Test concurrent session handling
   */
  async testConcurrentSessions(concurrency = 100) {
    console.log(`\n🧪 Testing concurrent sessions (${concurrency} sessions)...`);
    
    const startTime = Date.now();
    const promises = [];
    
    for (let i = 0; i < concurrency; i++) {
      const sessionId = `concurrent-test-${i}`;
      const pickedFamilies = i % 2 === 0 ? ['Control', 'Pace'] : ['Boundary', 'Truth'];
      promises.push(this.runSingleSession(sessionId, pickedFamilies));
    }
    
    const results = await Promise.all(promises);
    const duration = Date.now() - startTime;
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    return {
      concurrency,
      duration,
      successful,
      failed,
      successRate: successful / concurrency,
      avgDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length
    };
  }

  /**
   * Test QPS limits
   */
  async testQPSLimits() {
    console.log('\n🧪 Testing QPS limits...');
    
    const results = {
      getNextQuestion: await this.testQPS('getNextQuestion', 10000, 1000),
      submitAnswer: await this.testQPS('submitAnswer', 5000, 1000),
      finalizeSession: await this.testQPS('finalizeSession', 1000, 100)
    };
    
    return results;
  }

  /**
   * Test QPS for a specific operation
   */
  async testQPS(operation, targetQPS, iterations) {
    const startTime = Date.now();
    const times = [];
    
    if (operation === 'finalizeSession') {
      // For finalizeSession, pre-create sessions to avoid overhead
      const sessions = [];
      for (let i = 0; i < iterations; i++) {
        const session = initSession(`qps-test-fs-${i}`, './bank/packaged/bank_package_signed.json');
        const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
        
        // Pre-run through questions
        let currentQuestion = getNextQuestion(updatedSession.sessionId);
        while (currentQuestion) {
          submitAnswer(updatedSession.sessionId, currentQuestion.qid, 'A');
          currentQuestion = getNextQuestion(updatedSession.sessionId);
        }
        sessions.push(updatedSession);
      }
      
      // Now time just the finalize operations
      for (let i = 0; i < iterations; i++) {
        const opStartTime = process.hrtime.bigint();
        finalizeSession(sessions[i].sessionId);
        const opEndTime = process.hrtime.bigint();
        const duration = Number(opEndTime - opStartTime) / 1000000;
        times.push(duration);
      }
    } else {
      // For other operations, use single session
      const session = initSession(`qps-test-${operation}`, './bank/packaged/bank_package_signed.json');
      const updatedSession = setPicks(session.sessionId, ['Control', 'Pace']);
      
      for (let i = 0; i < iterations; i++) {
        const opStartTime = process.hrtime.bigint();
        
        if (operation === 'getNextQuestion') {
          getNextQuestion(updatedSession.sessionId);
        } else if (operation === 'submitAnswer') {
          const question = getNextQuestion(updatedSession.sessionId);
          if (question) {
            submitAnswer(updatedSession.sessionId, question.qid, 'A');
          }
        }
        
        const opEndTime = process.hrtime.bigint();
        const duration = Number(opEndTime - opStartTime) / 1000000;
        times.push(duration);
      }
    }
    
    const totalDuration = Date.now() - startTime;
    const actualQPS = (iterations / totalDuration) * 1000;
    
    return {
      targetQPS,
      actualQPS,
      iterations,
      totalDuration,
      meetsTarget: actualQPS >= targetQPS,
      stats: this.calculateStats(times, operation)
    };
  }

  /**
   * Calculate performance statistics
   */
  calculateStats(times, operation) {
    if (times.length === 0) {
      return { operation, count: 0, avg: 0, p50: 0, p95: 0, p99: 0, min: 0, max: 0 };
    }
    
    const sorted = [...times].sort((a, b) => a - b);
    const count = times.length;
    const sum = times.reduce((a, b) => a + b, 0);
    const avg = sum / count;
    const p50 = this.percentile(sorted, 0.5);
    const p95 = this.percentile(sorted, 0.95);
    const p99 = this.percentile(sorted, 0.99);
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    return {
      operation,
      count,
      avg: Math.round(avg * 100) / 100,
      p50: Math.round(p50 * 100) / 100,
      p95: Math.round(p95 * 100) / 100,
      p99: Math.round(p99 * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100
    };
  }

  /**
   * Calculate percentile
   */
  percentile(sorted, p) {
    const index = Math.ceil(p * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Run all load tests
   */
  async runAllTests() {
    console.log('🚀 Running comprehensive load tests...\n');
    
    const results = {
      getNextQuestion: await this.testGetNextQuestionPerformance(1000),
      submitAnswer: await this.testSubmitAnswerPerformance(1000),
      finalizeSession: await this.testFinalizeSessionPerformance(100),
      concurrent: await this.testConcurrentSessions(50),
      qps: await this.testQPSLimits()
    };
    
    return results;
  }

  /**
   * Print test results
   */
  printResults(results) {
    console.log('\n📊 LOAD TEST RESULTS');
    console.log('='.repeat(50));
    
    // Performance stats
    console.log('\n🎯 Performance Statistics:');
    console.log(`getNextQuestion: ${results.getNextQuestion.p95}ms p95 (target: <10ms)`);
    console.log(`submitAnswer: ${results.submitAnswer.p95}ms p95 (target: <15ms)`);
    console.log(`finalizeSession: ${results.finalizeSession.p95}ms p95 (target: <20ms)`);
    
    // QPS results
    console.log('\n🚀 QPS Results:');
    console.log(`getNextQuestion: ${results.qps.getNextQuestion.actualQPS.toFixed(0)} QPS (target: ${results.qps.getNextQuestion.targetQPS})`);
    console.log(`submitAnswer: ${results.qps.submitAnswer.actualQPS.toFixed(0)} QPS (target: ${results.qps.submitAnswer.targetQPS})`);
    console.log(`finalizeSession: ${results.qps.finalizeSession.actualQPS.toFixed(0)} QPS (target: ${results.qps.finalizeSession.targetQPS})`);
    
    // Concurrent results
    console.log('\n🔄 Concurrent Sessions:');
    console.log(`Sessions: ${results.concurrent.successful}/${results.concurrent.concurrency} successful`);
    console.log(`Success Rate: ${(results.concurrent.successRate * 100).toFixed(1)}%`);
    console.log(`Avg Duration: ${results.concurrent.avgDuration.toFixed(0)}ms`);
    
    // Performance targets met
    console.log('\n✅ Performance Targets:');
    const targetsMet = {
      getNextQuestion: results.getNextQuestion.p95 < 10,
      submitAnswer: results.submitAnswer.p95 < 15,
      finalizeSession: results.finalizeSession.p95 < 20,
      qps: results.qps.getNextQuestion.meetsTarget && 
           results.qps.submitAnswer.meetsTarget && 
           results.qps.finalizeSession.meetsTarget
    };
    
    Object.entries(targetsMet).forEach(([test, met]) => {
      console.log(`${test}: ${met ? '✅ PASS' : '❌ FAIL'}`);
    });
    
    const allTargetsMet = Object.values(targetsMet).every(met => met);
    console.log(`\n🎯 Overall: ${allTargetsMet ? '✅ ALL TARGETS MET' : '❌ SOME TARGETS MISSED'}`);
    
    return allTargetsMet;
  }
}

// Run load tests
async function runLoadTests() {
  const tester = new LoadTester();
  
  try {
    const results = await tester.runAllTests();
    const success = tester.printResults(results);
    
    if (success) {
      console.log('\n🎉 Load testing PASSED! Engine meets all performance targets.');
      process.exit(0);
    } else {
      console.log('\n❌ Load testing FAILED! Some performance targets not met.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Load testing ERROR:', error.message);
    process.exit(1);
  }
}

runLoadTests();
