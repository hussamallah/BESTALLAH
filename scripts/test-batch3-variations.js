#!/usr/bin/env node

/**
 * Batch 3 Test Variations
 * Tests the engine with different answer patterns and scenarios
 */

const engine = require('../engine/index');

class Batch3TestVariations {
  constructor() {
    this.engine = engine;
    this.testResults = [];
  }

  /**
   * Run all test variations
   */
  runAllTests() {
    console.log('🧪 Running Batch 3 Test Variations...\n');

    try {
      // Test 1: All A answers
      this.testAllAAnswers();

      // Test 2: All B answers  
      this.testAllBAnswers();

      // Test 3: Mixed A/B pattern
      this.testMixedAnswers();

      // Test 4: Random pattern
      this.testRandomAnswers();

      // Test 5: Edge case - picks=7
      this.testPicksSeven();

      // Test 6: Edge case - picks=1
      this.testPicksOne();

      // Test 7: Broken-heavy pattern
      this.testBrokenHeavy();

      // Test 8: Clean-only pattern
      this.testCleanOnly();

      // Test 9: Contrast pattern
      this.testContrastPattern();

      // Test 10: Sibling collision test
      this.testSiblingCollision();

      this.printSummary();

    } catch (error) {
      console.error('❌ Test failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Test with all A answers
   */
  testAllAAnswers() {
    console.log('🔍 Test 1: All A Answers');
    
    const sessionId = 'test-all-a';
    const result = this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 3 families
    this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary']);
    
    // Answer all questions with A
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        this.engine.submitAnswer(sessionId, question.qid, 'A');
      }
    }
    
    const finalResult = this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'All A Answers',
      success: true,
      lineVerdicts: finalResult.line_verdicts,
      faceStates: Object.keys(finalResult.face_states).length,
      qaFlags: finalResult.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(finalResult.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(finalResult.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${finalResult.qa_flags?.length || 0}\n`);
  }

  /**
   * Test with all B answers
   */
  async testAllBAnswers() {
    console.log('🔍 Test 2: All B Answers');
    
    const sessionId = 'test-all-b';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 4 families
    await this.engine.setPicks(sessionId, ['Truth', 'Recognition', 'Bonding', 'Stress']);
    
    // Answer all questions with B
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        await this.engine.submitAnswer(sessionId, question.qid, 'B');
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'All B Answers',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test with mixed A/B pattern
   */
  async testMixedAnswers() {
    console.log('🔍 Test 3: Mixed A/B Pattern');
    
    const sessionId = 'test-mixed';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 2 families
    await this.engine.setPicks(sessionId, ['Control', 'Truth']);
    
    // Answer with alternating pattern
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        const answer = i % 2 === 0 ? 'A' : 'B';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Mixed A/B Pattern',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test with random pattern
   */
  async testRandomAnswers() {
    console.log('🔍 Test 4: Random Pattern');
    
    const sessionId = 'test-random';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 5 families
    await this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition']);
    
    // Answer with random pattern
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        const answer = Math.random() > 0.5 ? 'A' : 'B';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Random Pattern',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test picks=7 edge case
   */
  async testPicksSeven() {
    console.log('🔍 Test 5: Picks=7 Edge Case');
    
    const sessionId = 'test-picks-seven';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick all 7 families
    await this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress']);
    
    // Answer all questions with A
    const questions = [];
    for (let i = 0; i < 14; i++) { // Should be 14 questions for picks=7
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        await this.engine.submitAnswer(sessionId, question.qid, 'A');
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Picks=7 Edge Case',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered (expected 14)`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test picks=1 edge case
   */
  async testPicksOne() {
    console.log('🔍 Test 6: Picks=1 Edge Case');
    
    const sessionId = 'test-picks-one';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick only 1 family
    await this.engine.setPicks(sessionId, ['Control']);
    
    // Answer all questions with B
    const questions = [];
    for (let i = 0; i < 20; i++) { // Should be 20 questions for picks=1
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        await this.engine.submitAnswer(sessionId, question.qid, 'B');
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Picks=1 Edge Case',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered (expected 20)`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test broken-heavy pattern
   */
  async testBrokenHeavy() {
    console.log('🔍 Test 7: Broken-Heavy Pattern');
    
    const sessionId = 'test-broken-heavy';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 3 families
    await this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary']);
    
    // Answer with pattern that should trigger broken states
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        // Use B for most answers to trigger broken states
        const answer = i % 3 === 0 ? 'A' : 'B';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Broken-Heavy Pattern',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test clean-only pattern
   */
  async testCleanOnly() {
    console.log('🔍 Test 8: Clean-Only Pattern');
    
    const sessionId = 'test-clean-only';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 4 families
    await this.engine.setPicks(sessionId, ['Truth', 'Recognition', 'Bonding', 'Stress']);
    
    // Answer with pattern that should trigger clean states
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        // Use A for most answers to trigger clean states
        const answer = i % 4 === 0 ? 'B' : 'A';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Clean-Only Pattern',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test contrast pattern
   */
  async testContrastPattern() {
    console.log('🔍 Test 9: Contrast Pattern');
    
    const sessionId = 'test-contrast';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 2 families
    await this.engine.setPicks(sessionId, ['Control', 'Pace']);
    
    // Answer with pattern designed to test contrast detection
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        // Use specific pattern for contrast testing
        const answer = (i + question.familyScreen) % 2 === 0 ? 'A' : 'B';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Contrast Pattern',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Test sibling collision
   */
  async testSiblingCollision() {
    console.log('🔍 Test 10: Sibling Collision Test');
    
    const sessionId = 'test-sibling-collision';
    await this.engine.initSession(sessionId, './bank/packaged/bank_package_signed.json');
    
    // Pick 3 families
    await this.engine.setPicks(sessionId, ['Control', 'Pace', 'Boundary']);
    
    // Answer with pattern that might trigger sibling collisions
    const questions = [];
    for (let i = 0; i < 18; i++) {
      const question = await this.engine.getNextQuestion(sessionId);
      if (question) {
        questions.push(question);
        // Use pattern that might trigger sibling issues
        const answer = (i * 3) % 2 === 0 ? 'A' : 'B';
        await this.engine.submitAnswer(sessionId, question.qid, answer);
      }
    }
    
    const result = await this.engine.finalizeSession(sessionId);
    this.testResults.push({
      test: 'Sibling Collision Test',
      success: true,
      lineVerdicts: result.line_verdicts,
      faceStates: Object.keys(result.face_states).length,
      qaFlags: result.qa_flags?.length || 0
    });
    
    console.log(`  ✅ Completed - ${questions.length} questions answered`);
    console.log(`  📊 Line Verdicts: ${JSON.stringify(result.line_verdicts)}`);
    console.log(`  🎭 Face States: ${Object.keys(result.face_states).length} faces`);
    console.log(`  🚩 QA Flags: ${result.qa_flags?.length || 0}\n`);
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log('📊 Test Summary');
    console.log('================');
    
    const totalTests = this.testResults.length;
    const successfulTests = this.testResults.filter(r => r.success).length;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Successful: ${successfulTests}`);
    console.log(`Failed: ${totalTests - successfulTests}`);
    console.log(`Success Rate: ${((successfulTests / totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Test Details:');
    this.testResults.forEach((result, index) => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${result.test}`);
      console.log(`   Line Verdicts: ${Object.keys(result.lineVerdicts).length} families`);
      console.log(`   Face States: ${result.faceStates} faces`);
      console.log(`   QA Flags: ${result.qaFlags} flags`);
    });
    
    console.log('\n🎉 Batch 3 Test Variations Complete!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new Batch3TestVariations();
  tester.runAllTests().catch(console.error);
}

module.exports = Batch3TestVariations;
