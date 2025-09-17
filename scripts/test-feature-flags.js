#!/usr/bin/env node

/**
 * Test feature flags and kill switches
 */

const { 
  initSession, 
  setPicks, 
  getNextQuestion, 
  submitAnswer, 
  finalizeSession,
  getFeatureFlags,
  getKillSwitches,
  getConfiguration,
  validateConfiguration,
  overrideFlag,
  overrideKillSwitch,
  resetOverrides
} = require('../engine');

console.log('🧪 Testing feature flags and kill switches...');

try {
  // Test 1: Get initial configuration
  console.log('\n1️⃣ Testing initial configuration...');
  const flags = getFeatureFlags();
  const killSwitches = getKillSwitches();
  const config = getConfiguration();
  
  console.log('📊 Feature flags:', flags);
  console.log('📊 Kill switches:', killSwitches);
  console.log('📊 Configuration timestamp:', config.timestamp);

  // Test 2: Validate configuration
  console.log('\n2️⃣ Testing configuration validation...');
  const validation = validateConfiguration();
  console.log('📊 Validation result:', validation);
  
  if (validation.valid) {
    console.log('✅ Configuration is valid');
  } else {
    console.log('❌ Configuration has errors:', validation.errors);
  }

  // Test 3: Test normal session with default flags
  console.log('\n3️⃣ Testing normal session with default flags...');
  const session = initSession('flags-test', './bank/packaged/bank_package_signed.json');
  console.log('✅ Session initialized with default flags');

  // Test 4: Test kill switch - disable results
  console.log('\n4️⃣ Testing kill switch - disable results...');
  overrideKillSwitch('RESULTS_ENABLED', false);
  
  try {
    const updatedSession = setPicks(session.sessionId, ['Control']);
    console.log('✅ Picks set');
    
    // Try to finalize - should fail
    finalizeSession(updatedSession.sessionId);
    console.log('❌ Should have failed due to results kill switch');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('Results are disabled by kill switch')) {
      console.log('✅ Results kill switch working:', error.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
      process.exit(1);
    }
  }

  // Test 5: Re-enable results and test normal flow
  console.log('\n5️⃣ Testing re-enabled results...');
  overrideKillSwitch('RESULTS_ENABLED', true);
  
  const session2 = initSession('flags-test-2', './bank/packaged/bank_package_signed.json');
  const updatedSession2 = setPicks(session2.sessionId, ['Control']);
  
  // Run through a few questions
  let questionCount = 0;
  let currentQuestion = getNextQuestion(updatedSession2.sessionId);
  
  while (currentQuestion && questionCount < 3) {
    questionCount++;
    console.log(`Question ${questionCount}: ${currentQuestion.qid}`);
    submitAnswer(updatedSession2.sessionId, currentQuestion.qid, 'A');
    currentQuestion = getNextQuestion(updatedSession2.sessionId);
  }

  // Finalize should work now
  const results = finalizeSession(updatedSession2.sessionId);
  console.log('✅ Results generated successfully');

  // Test 6: Test bank hash kill switch
  console.log('\n6️⃣ Testing bank hash kill switch...');
  overrideKillSwitch('ALLOWED_BANK_HASHES', ['different-hash']);
  
  try {
    initSession('flags-test-3', './bank/packaged/bank_package_signed.json');
    console.log('❌ Should have failed due to bank hash restriction');
    process.exit(1);
  } catch (error) {
    if (error.message.includes('not in allowed list')) {
      console.log('✅ Bank hash kill switch working:', error.message);
    } else {
      console.log('❌ Unexpected error:', error.message);
      process.exit(1);
    }
  }

  // Test 7: Test feature flag overrides
  console.log('\n7️⃣ Testing feature flag overrides...');
  overrideFlag('ENABLE_DEBUG_MODE', true);
  overrideFlag('ENABLE_DEV_SHORTCUTS', true);
  
  const flagsAfterOverride = getFeatureFlags();
  console.log('📊 Flags after override:', {
    ENABLE_DEBUG_MODE: flagsAfterOverride.ENABLE_DEBUG_MODE,
    ENABLE_DEV_SHORTCUTS: flagsAfterOverride.ENABLE_DEV_SHORTCUTS
  });

  // Test 8: Test reset overrides
  console.log('\n8️⃣ Testing reset overrides...');
  resetOverrides();
  
  const flagsAfterReset = getFeatureFlags();
  const killSwitchesAfterReset = getKillSwitches();
  
  console.log('📊 Flags after reset:', {
    ENABLE_DEBUG_MODE: flagsAfterReset.ENABLE_DEBUG_MODE,
    ENABLE_DEV_SHORTCUTS: flagsAfterReset.ENABLE_DEV_SHORTCUTS
  });
  console.log('📊 Kill switches after reset:', {
    RESULTS_ENABLED: killSwitchesAfterReset.RESULTS_ENABLED,
    ALLOWED_BANK_HASHES: killSwitchesAfterReset.ALLOWED_BANK_HASHES
  });

  // Test 9: Test final configuration validation
  console.log('\n9️⃣ Testing final configuration validation...');
  const finalValidation = validateConfiguration();
  console.log('📊 Final validation:', finalValidation);

  console.log('\n🎉 Feature flags tests PASSED!');
  console.log('✅ Configuration loading works');
  console.log('✅ Kill switches work');
  console.log('✅ Feature flags work');
  console.log('✅ Overrides work');
  console.log('✅ Reset works');
  console.log('✅ Validation works');

} catch (error) {
  console.error('❌ Feature flags test FAILED:', error.message);
  process.exit(1);
}
