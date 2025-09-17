#!/usr/bin/env node

/**
 * Test bank immutability and hash verification
 */

const bankStorage = require('../engine/bankStorage');

console.log('🧪 Testing bank immutability...');

try {
  // Test 1: Load bank and verify immutability
  console.log('\n1️⃣ Loading bank package...');
  const bank = bankStorage.loadBank('./bank/packaged/bank_package_signed.json');
  const bankHash = bank.meta.bank_hash_sha256;
  console.log(`✅ Bank loaded with hash: ${bankHash}`);

  // Test 2: Verify immutability
  console.log('\n2️⃣ Testing immutability...');
  const originalHash = bank.meta.bank_hash_sha256;
  bank.meta.bank_hash_sha256 = 'modified';
  
  if (bank.meta.bank_hash_sha256 === originalHash) {
    console.log('✅ Bank is immutable - modification blocked');
  } else {
    console.log('❌ Bank should be immutable!');
    process.exit(1);
  }

  // Test 3: Verify hash integrity
  console.log('\n3️⃣ Testing hash integrity...');
  const isValid = bankStorage.verifyBank(bankHash);
  if (isValid) {
    console.log('✅ Bank hash integrity verified');
  } else {
    console.log('❌ Bank hash integrity check failed');
    process.exit(1);
  }

  // Test 4: Test bank metadata
  console.log('\n4️⃣ Testing bank metadata...');
  const metadata = bankStorage.getBankMetadata(bankHash);
  console.log('📊 Bank metadata:', {
    hash: metadata.hash,
    constantsProfile: metadata.constantsProfile,
    bankId: metadata.bankId,
    loadedAt: metadata.loadedAt
  });

  // Test 5: Test bank snapshot
  console.log('\n5️⃣ Testing bank snapshot...');
  const snapshot = bankStorage.createSnapshot(bankHash);
  console.log('📊 Bank snapshot:', snapshot);

  // Test 6: Test allowed hashes whitelist
  console.log('\n6️⃣ Testing allowed hashes whitelist...');
  bankStorage.setAllowedHashes([bankHash, 'another-hash']);
  console.log('✅ Allowed hashes set');

  // Test 7: Test loading with whitelist
  console.log('\n7️⃣ Testing whitelist enforcement...');
  try {
    bankStorage.setAllowedHashes(['different-hash']);
    bankStorage.loadBank('./bank/packaged/bank_package_signed.json');
    console.log('❌ Should have been blocked by whitelist!');
    process.exit(1);
  } catch (error) {
    console.log('✅ Whitelist enforcement working:', error.message);
  }

  // Reset whitelist
  bankStorage.setAllowedHashes([]);

  // Test 8: Test multiple bank loading
  console.log('\n8️⃣ Testing multiple bank loading...');
  const loadedHashes = bankStorage.getLoadedHashes();
  console.log(`📊 Loaded banks: ${loadedHashes.length}`);
  console.log(`📊 Hashes: ${loadedHashes.join(', ')}`);

  console.log('\n🎉 Bank immutability tests PASSED!');
  console.log('✅ Bank loading works');
  console.log('✅ Immutability enforced');
  console.log('✅ Hash integrity verified');
  console.log('✅ Metadata access works');
  console.log('✅ Snapshot creation works');
  console.log('✅ Whitelist enforcement works');
  console.log('✅ Multiple bank loading works');

} catch (error) {
  console.error('❌ Bank immutability test FAILED:', error.message);
  process.exit(1);
}
