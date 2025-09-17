#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Bank Signer - Signs bank packages for verification
 * 
 * Features:
 * - Generates signing keys per environment
 * - Signs bank packages with HMAC-SHA256
 * - Verifies signatures before engine consumption
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');
const KEYS_DIR = path.join(__dirname, '..', 'keys');

// Ensure keys directory exists
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Generate a new signing key
 */
function generateSigningKey() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Sign a bank package
 */
function signBankPackage(bankPackage, signingKey) {
  const packageString = JSON.stringify(bankPackage, null, 0);
  const signature = crypto.createHmac('sha256', signingKey).update(packageString).digest('hex');
  return signature;
}

/**
 * Verify a bank package signature
 */
function verifyBankPackage(bankPackage, signature, signingKey) {
  const expectedSignature = signBankPackage(bankPackage, signingKey);
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Load or create signing key for environment
 */
function loadOrCreateSigningKey(environment = 'development') {
  const keyPath = path.join(KEYS_DIR, `${environment}.key`);
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8').trim();
  }
  
  // Generate new key
  const key = generateSigningKey();
  fs.writeFileSync(keyPath, key);
  console.log(`Generated new signing key for ${environment}: ${keyPath}`);
  return key;
}

/**
 * Sign the bank package
 */
function signBank() {
  console.log('🔐 Signing bank package...');
  
  try {
    // Load the packaged bank
    const bankPackagePath = path.join(PACKAGED_DIR, 'bank_package.json');
    if (!fs.existsSync(bankPackagePath)) {
      throw new Error('Bank package not found. Run pack-bank.js first.');
    }
    
    const bankPackage = JSON.parse(fs.readFileSync(bankPackagePath, 'utf8'));
    
    // Load or create signing key
    const environment = process.env.NODE_ENV || 'development';
    const signingKey = loadOrCreateSigningKey(environment);
    
    // Sign the package
    const signature = signBankPackage(bankPackage, signingKey);
    
    // Add signature to package
    bankPackage.meta.signature = signature;
    bankPackage.meta.signed_at = new Date().toISOString();
    bankPackage.meta.signed_by = environment;
    
    // Write signed package
    const signedPackagePath = path.join(PACKAGED_DIR, 'bank_package_signed.json');
    fs.writeFileSync(signedPackagePath, JSON.stringify(bankPackage, null, 2));
    
    console.log(`✅ Bank package signed successfully: ${signedPackagePath}`);
    console.log(`📊 Signature: ${signature.substring(0, 16)}...`);
    console.log(`🔑 Environment: ${environment}`);
    
    // Also write the signature separately for verification
    const signaturePath = path.join(PACKAGED_DIR, 'signature.txt');
    fs.writeFileSync(signaturePath, signature);
    
    return {
      signature,
      environment,
      packagePath: signedPackagePath
    };
    
  } catch (error) {
    console.error('❌ Signing failed:', error.message);
    process.exit(1);
  }
}

/**
 * Verify a signed bank package
 */
function verifyBank() {
  console.log('🔍 Verifying bank package signature...');
  
  try {
    // Load the signed bank package
    const signedPackagePath = path.join(PACKAGED_DIR, 'bank_package_signed.json');
    if (!fs.existsSync(signedPackagePath)) {
      throw new Error('Signed bank package not found. Run sign-bank.js first.');
    }
    
    const bankPackage = JSON.parse(fs.readFileSync(signedPackagePath, 'utf8'));
    const signature = bankPackage.meta.signature;
    const environment = bankPackage.meta.signed_by;
    
    if (!signature || !environment) {
      throw new Error('Bank package is not signed');
    }
    
    // Load signing key
    const signingKey = loadOrCreateSigningKey(environment);
    
    // Remove signature from package for verification
    const packageForVerification = { ...bankPackage };
    delete packageForVerification.meta.signature;
    delete packageForVerification.meta.signed_at;
    delete packageForVerification.meta.signed_by;
    
    // Verify signature
    const isValid = verifyBankPackage(packageForVerification, signature, signingKey);
    
    if (isValid) {
      console.log('✅ Bank package signature is valid');
      console.log(`📊 Signature: ${signature.substring(0, 16)}...`);
      console.log(`🔑 Environment: ${environment}`);
      return true;
    } else {
      console.log('❌ Bank package signature is invalid');
      return false;
    }
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return false;
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'sign':
      signBank();
      break;
    case 'verify':
      const isValid = verifyBank();
      process.exit(isValid ? 0 : 1);
      break;
    default:
      console.log('Usage: node sign-bank.js [sign|verify]');
      console.log('  sign   - Sign the bank package');
      console.log('  verify - Verify the bank package signature');
      process.exit(1);
  }
}

module.exports = { signBank, verifyBank, signBankPackage, verifyBankPackage };
