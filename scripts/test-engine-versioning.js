#!/usr/bin/env node

/**
 * Test engine versioning and constants profile tracking
 */

const { 
  initSession, 
  getVersionInfo, 
  getReleaseNotes, 
  getStatus, 
  getFingerprint 
} = require('../engine');

console.log('🧪 Testing engine versioning...');

try {
  // Test 1: Get version info before initialization
  console.log('\n1️⃣ Testing version info before initialization...');
  const versionInfo = getVersionInfo();
  console.log('📊 Version info:', versionInfo);

  // Test 2: Initialize session to set constants profile
  console.log('\n2️⃣ Initializing session to set constants profile...');
  const session = initSession('version-test', './bank/packaged/bank_package_signed.json');
  console.log('✅ Session initialized');

  // Test 3: Get version info after initialization
  console.log('\n3️⃣ Testing version info after initialization...');
  const versionInfoAfter = getVersionInfo();
  console.log('📊 Version info after init:', versionInfoAfter);

  // Test 4: Get release notes
  console.log('\n4️⃣ Testing release notes...');
  const releaseNotes = getReleaseNotes();
  console.log('📊 Release notes version:', releaseNotes.version);
  console.log('📊 Changes count:', releaseNotes.changes.length);
  console.log('📊 Performance targets:', releaseNotes.performance_targets);

  // Test 5: Get engine status
  console.log('\n5️⃣ Testing engine status...');
  const status = getStatus();
  console.log('📊 Engine status:', {
    status: status.status,
    version: status.version,
    constants_profile: status.constants_profile,
    bank_hash: status.bank_hash,
    fingerprint: status.fingerprint
  });

  // Test 6: Get fingerprint
  console.log('\n6️⃣ Testing engine fingerprint...');
  const fingerprint = getFingerprint();
  console.log('📊 Engine fingerprint:', fingerprint);

  // Test 7: Verify constants profile is set
  console.log('\n7️⃣ Verifying constants profile is set...');
  if (versionInfoAfter.constants_profile === 'DEFAULT') {
    console.log('✅ Constants profile correctly set to DEFAULT');
  } else {
    console.log('❌ Constants profile not set correctly');
    process.exit(1);
  }

  // Test 8: Verify bank hash is set
  console.log('\n8️⃣ Verifying bank hash is set...');
  if (versionInfoAfter.bank_hash && versionInfoAfter.bank_hash.length === 64) {
    console.log('✅ Bank hash correctly set');
  } else {
    console.log('❌ Bank hash not set correctly');
    process.exit(1);
  }

  // Test 9: Verify fingerprint format
  console.log('\n9️⃣ Verifying fingerprint format...');
  if (fingerprint.startsWith('ENGINE-') && fingerprint.length === 23) {
    console.log('✅ Fingerprint format correct');
  } else {
    console.log('❌ Fingerprint format incorrect');
    process.exit(1);
  }

  console.log('\n🎉 Engine versioning tests PASSED!');
  console.log('✅ Version info works');
  console.log('✅ Release notes generated');
  console.log('✅ Engine status tracked');
  console.log('✅ Fingerprint generated');
  console.log('✅ Constants profile tracked');
  console.log('✅ Bank hash tracked');

} catch (error) {
  console.error('❌ Engine versioning test FAILED:', error.message);
  process.exit(1);
}
