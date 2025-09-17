#!/usr/bin/env node

const path = require('path');
const { initSession, setPicks, getNextQuestion, submitAnswer, finalizeSession } = require('../engine/index.js');

/**
 * Test edge policies for picks=7 and picks=1
 */

const bankPath = path.join(__dirname, '..', 'bank', 'packaged', 'bank_package_signed.json');

console.log('🧪 Testing Edge Policies...\n');

/**
 * Test picks=7 (all families picked)
 */
function testPicks7() {
  console.log('1️⃣ Testing picks=7 (all families)...');
  
  try {
    const session = initSession('test-picks-7', bankPath);
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    const sessionWithPicks = setPicks(session.sessionId, allFamilies);
    
    console.log(`   📊 Picked families: ${allFamilies.length}`);
    console.log(`   📊 Questions generated: ${sessionWithPicks.schedule.length}`);
    
    // Count questions by family
    const familyCounts = {};
    sessionWithPicks.schedule.forEach(q => {
      const family = q.qid.split('_')[0].toLowerCase();
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });
    
    console.log(`   📊 Questions per family:`);
    Object.entries(familyCounts).forEach(([family, count]) => {
      console.log(`      ${family}: ${count} questions`);
    });
    
    // Verify exactly 14 questions total (picks=7 edge case)
    const totalQuestions = sessionWithPicks.schedule.length;
    if (totalQuestions === 14) {
      console.log(`   ✅ Correct total: ${totalQuestions} questions`);
    } else {
      console.log(`   ❌ Wrong total: ${totalQuestions} questions (expected 14)`);
      return false;
    }
    
    // Verify each picked family gets exactly 2 questions
    const expectedPickedCount = 2;
    const pickedFamilies = allFamilies.map(f => f.toLowerCase());
    const wrongCounts = pickedFamilies.filter(family => {
      const count = familyCounts[family] || 0;
      return count !== expectedPickedCount;
    });
    
    if (wrongCounts.length === 0) {
      console.log(`   ✅ All picked families have exactly ${expectedPickedCount} questions`);
    } else {
      console.log(`   ❌ Wrong counts for: ${wrongCounts.join(', ')}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error(`   ❌ Test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test picks=1 (single family picked)
 */
function testPicks1() {
  console.log('\n2️⃣ Testing picks=1 (single family)...');
  
  try {
    const session = initSession('test-picks-1', bankPath);
    const singleFamily = ['Control'];
    const sessionWithPicks = setPicks(session.sessionId, singleFamily);
    
    console.log(`   📊 Picked families: ${singleFamily.length}`);
    console.log(`   📊 Questions generated: ${sessionWithPicks.schedule.length}`);
    
    // Count questions by family
    const familyCounts = {};
    sessionWithPicks.schedule.forEach(q => {
      const family = q.qid.split('_')[0].toLowerCase();
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });
    
    console.log(`   📊 Questions per family:`);
    Object.entries(familyCounts).forEach(([family, count]) => {
      console.log(`      ${family}: ${count} questions`);
    });
    
    // Verify exactly 20 questions total (picks=1 edge case)
    const totalQuestions = sessionWithPicks.schedule.length;
    if (totalQuestions === 20) {
      console.log(`   ✅ Correct total: ${totalQuestions} questions`);
    } else {
      console.log(`   ❌ Wrong total: ${totalQuestions} questions (expected 20)`);
      return false;
    }
    
    // Verify picked family gets exactly 2 questions
    const expectedPickedCount = 2;
    const pickedFamily = singleFamily[0].toLowerCase();
    const pickedCount = familyCounts[pickedFamily] || 0;
    
    if (pickedCount === expectedPickedCount) {
      console.log(`   ✅ Picked family (${pickedFamily}) has exactly ${expectedPickedCount} questions`);
    } else {
      console.log(`   ❌ Picked family (${pickedFamily}) has ${pickedCount} questions (expected ${expectedPickedCount})`);
      return false;
    }
    
    // Verify not-picked families get exactly 3 questions each
    const expectedNotPickedCount = 3;
    const notPickedFamilies = ['pace', 'boundary', 'truth', 'recognition', 'bonding', 'stress'];
    const wrongCounts = notPickedFamilies.filter(family => {
      const count = familyCounts[family] || 0;
      return count !== expectedNotPickedCount;
    });
    
    if (wrongCounts.length === 0) {
      console.log(`   ✅ All not-picked families have exactly ${expectedNotPickedCount} questions`);
    } else {
      console.log(`   ❌ Wrong counts for: ${wrongCounts.join(', ')}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error(`   ❌ Test failed: ${error.message}`);
    return false;
  }
}

/**
 * Test picks=3 (middle case)
 */
function testPicks3() {
  console.log('\n3️⃣ Testing picks=3 (middle case)...');
  
  try {
    const session = initSession('test-picks-3', bankPath);
    const threeFamilies = ['Control', 'Pace', 'Boundary'];
    const sessionWithPicks = setPicks(session.sessionId, threeFamilies);
    
    console.log(`   📊 Picked families: ${threeFamilies.length}`);
    console.log(`   📊 Questions generated: ${sessionWithPicks.schedule.length}`);
    
    // Count questions by family
    const familyCounts = {};
    sessionWithPicks.schedule.forEach(q => {
      const family = q.qid.split('_')[0].toLowerCase();
      familyCounts[family] = (familyCounts[family] || 0) + 1;
    });
    
    console.log(`   📊 Questions per family:`);
    Object.entries(familyCounts).forEach(([family, count]) => {
      console.log(`      ${family}: ${count} questions`);
    });
    
    // Verify exactly 18 questions total (normal case)
    const totalQuestions = sessionWithPicks.schedule.length;
    if (totalQuestions === 18) {
      console.log(`   ✅ Correct total: ${totalQuestions} questions`);
    } else {
      console.log(`   ❌ Wrong total: ${totalQuestions} questions (expected 18)`);
      return false;
    }
    
    // Verify picked families get exactly 2 questions each
    const expectedPickedCount = 2;
    const wrongPickedCounts = threeFamilies.map(f => f.toLowerCase()).filter(family => {
      const count = familyCounts[family] || 0;
      return count !== expectedPickedCount;
    });
    
    if (wrongPickedCounts.length === 0) {
      console.log(`   ✅ All picked families have exactly ${expectedPickedCount} questions`);
    } else {
      console.log(`   ❌ Wrong counts for: ${wrongPickedCounts.join(', ')}`);
      return false;
    }
    
    // Verify not-picked families get exactly 3 questions each
    const expectedNotPickedCount = 3;
    const notPickedFamilies = ['truth', 'recognition', 'bonding', 'stress'];
    const wrongNotPickedCounts = notPickedFamilies.filter(family => {
      const count = familyCounts[family] || 0;
      return count !== expectedNotPickedCount;
    });
    
    if (wrongNotPickedCounts.length === 0) {
      console.log(`   ✅ All not-picked families have exactly ${expectedNotPickedCount} questions`);
    } else {
      console.log(`   ❌ Wrong counts for: ${wrongNotPickedCounts.join(', ')}`);
      return false;
    }
    
    return true;
    
  } catch (error) {
    console.error(`   ❌ Test failed: ${error.message}`);
    return false;
  }
}

// Run all tests
const test1 = testPicks7();
const test2 = testPicks1();
const test3 = testPicks3();

console.log('\n📊 Edge Policy Test Results:');
console.log(`   ✅ Picks=7: ${test1 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Picks=1: ${test2 ? 'PASS' : 'FAIL'}`);
console.log(`   ✅ Picks=3: ${test3 ? 'PASS' : 'FAIL'}`);

const allPassed = test1 && test2 && test3;
console.log(`\n🎯 Overall: ${allPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

process.exit(allPassed ? 0 : 1);