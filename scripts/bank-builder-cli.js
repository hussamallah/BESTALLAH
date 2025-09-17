#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Bank Builder CLI - Batch 5 Implementation
 * 
 * Features:
 * - Canonicalizes bank packages from raw author files
 * - Schema validation and linter integration
 * - Computes bank_hash_sha256
 * - Signs with ed25519 (simulated with HMAC-SHA256)
 * - Emits linter_report.json
 * - Exit codes per Batch 5 specification
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');
const KEYS_DIR = path.join(__dirname, '..', 'keys');

// Ensure directories exist
if (!fs.existsSync(PACKAGED_DIR)) {
  fs.mkdirSync(PACKAGED_DIR, { recursive: true });
}
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

// Exit codes per Batch 5 specification
const EXIT_CODES = {
  SUCCESS: 0,
  SCHEMA_FAILURE: 10,
  LINTER_ERRORS: 20,
  SIGNING_FAILURE: 30
};

/**
 * Load and validate a JSON file
 */
function loadJsonFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load ${filePath}: ${error.message}`);
  }
}

/**
 * Schema validation for registries
 */
function validateRegistries(registries) {
  const errors = [];
  
  // Validate families registry
  if (!registries.families || !registries.families.families) {
    errors.push('Missing families registry');
  } else if (registries.families.families.length !== 7) {
    errors.push('Must have exactly 7 families');
  }
  
  // Validate faces registry
  if (!registries.faces || !registries.faces.faces) {
    errors.push('Missing faces registry');
  } else if (registries.faces.faces.length !== 14) {
    errors.push('Must have exactly 14 faces');
  }
  
  // Validate tells registry
  if (!registries.tells || !registries.tells.tells) {
    errors.push('Missing tells registry');
  }
  
  // Validate contrast matrix
  if (!registries.contrast_matrix || !registries.contrast_matrix.pairs) {
    errors.push('Missing contrast matrix');
  }
  
  return errors;
}

/**
 * Normalize questions: sort by family → qid → option.key, sort tells by face_id, tell_id
 */
function normalizeQuestions(questions) {
  const normalized = {};
  
  // Sort families alphabetically
  const sortedFamilies = Object.keys(questions).sort();
  
  for (const family of sortedFamilies) {
    const familyQuestions = questions[family];
    
    if (familyQuestions.questions) {
      // Sort questions by qid
      if (familyQuestions.questions) {
        familyQuestions.questions.sort((a, b) => (a.qid || '').localeCompare(b.qid || ''));
      }
      
      // Sort options by key (A, B)
      for (const question of familyQuestions.questions) {
        if (question.options) {
          question.options.sort((a, b) => (a.id || '').localeCompare(b.id || ''));
          
          // Sort tells by face_id, then tell_id
          for (const option of question.options) {
            if (option.tells) {
              option.tells.sort((a, b) => {
                const faceCompare = (a.face_id || '').localeCompare(b.face_id || '');
                if (faceCompare !== 0) return faceCompare;
                return (a.tell_id || '').localeCompare(b.tell_id || '');
              });
            }
          }
        }
      }
    }
    
    normalized[family] = familyQuestions;
  }
  
  return normalized;
}

/**
 * Enforce caps: ≤3 tells/option, ≤1 per face/option
 */
function enforceCaps(questions) {
  const errors = [];
  const warnings = [];
  
  for (const [family, familyQuestions] of Object.entries(questions)) {
    if (!familyQuestions.questions) continue;
    
    for (const question of familyQuestions.questions) {
      if (!question.options) continue;
      
      for (const option of question.options) {
        if (!option.tells) continue;
        
        // Cap at 3 tells per option
        if (option.tells.length > 3) {
          warnings.push(`Option ${option.id} in ${question.qid} has ${option.tells.length} tells, capping at 3`);
          option.tells = option.tells.slice(0, 3);
        }
        
        // Check ≤1 tell per face per option
        const faceCounts = new Map();
        const validTells = [];
        
        for (const tell of option.tells) {
          const faceId = tell.face_id;
          const count = faceCounts.get(faceId) || 0;
          
          if (count >= 1) {
            warnings.push(`Option ${option.id} in ${question.qid} has multiple tells for face ${faceId}, keeping first`);
            continue;
          }
          
          faceCounts.set(faceId, count + 1);
          validTells.push(tell);
        }
        
        option.tells = validTells;
      }
    }
  }
  
  return { errors, warnings };
}

/**
 * Run linter and return report
 */
function runLinter(bankPackage) {
  const { lintBank } = require('./lint-bank.js');
  
  // Create temporary bank structure for linting
  const tempBank = {
    meta: bankPackage.meta,
    registries: bankPackage.registries,
    constants: bankPackage.constants,
    questions: bankPackage.questions
  };
  
  // Run linter
  const linterResult = lintBank();
  
  return {
    ok: linterResult,
    timestamp: new Date().toISOString(),
    bank_id: bankPackage.meta.bank_id,
    summary: {
      families: bankPackage.registries.families.families.length,
      questions: Object.values(bankPackage.questions).reduce((sum, f) => sum + f.questions.length, 0),
      options: Object.values(bankPackage.questions).reduce((sum, f) => sum + f.questions.length * 2, 0),
      tells: Object.values(bankPackage.questions).reduce((sum, f) => 
        sum + f.questions.reduce((qSum, q) => 
          qSum + (q.options ? q.options.reduce((oSum, o) => oSum + (o.tells ? o.tells.length : 0), 0) : 0), 0), 0)
    },
    errors: [],
    warnings: []
  };
}

/**
 * Compute bank_hash_sha256 over canonical JSON
 */
function computeBankHash(bankPackage) {
  const canonical = canonicalize(bankPackage);
  const jsonString = JSON.stringify(canonical, null, 0);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Canonicalize JSON (sort keys recursively)
 */
function canonicalize(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(canonicalize);
  }
  
  const sorted = {};
  Object.keys(obj).sort().forEach(key => {
    sorted[key] = canonicalize(obj[key]);
  });
  
  return sorted;
}

/**
 * Sign with configured keypair (simulated with HMAC-SHA256)
 */
function signBankPackage(bankPackage, signingKey) {
  const packageString = JSON.stringify(canonicalize(bankPackage), null, 0);
  const signature = crypto.createHmac('sha256', signingKey).update(packageString).digest('hex');
  return signature;
}

/**
 * Load or create signing key
 */
function loadOrCreateSigningKey(environment = 'development') {
  const keyPath = path.join(KEYS_DIR, `${environment}.key`);
  
  if (fs.existsSync(keyPath)) {
    return fs.readFileSync(keyPath, 'utf8').trim();
  }
  
  // Generate new key
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyPath, key);
  console.log(`Generated new signing key for ${environment}: ${keyPath}`);
  return key;
}

/**
 * Main bank builder function
 */
function buildBank(options = {}) {
  console.log('🏗️  Bank Builder CLI - Batch 5');
  console.log('================================');
  
  try {
    // 1. Load and schema-validate registries
    console.log('📋 Loading registries...');
    
    const families = loadJsonFile(path.join(BANK_DIR, 'registries', 'families.json'));
    const faces = loadJsonFile(path.join(BANK_DIR, 'registries', 'faces.json'));
    const tells = loadJsonFile(path.join(BANK_DIR, 'registries', 'tells.json'));
    const contrastMatrix = loadJsonFile(path.join(BANK_DIR, 'registries', 'contrast_matrix.json'));
    
    const registries = { families, faces, tells, contrast_matrix: contrastMatrix };
    
    // Validate registries
    const registryErrors = validateRegistries(registries);
    if (registryErrors.length > 0) {
      console.error('❌ Registry validation failed:');
      registryErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(EXIT_CODES.SCHEMA_FAILURE);
    }
    
    console.log('✅ Registries validated');
    
    // 2. Load constants
    console.log('⚙️  Loading constants...');
    const constants = loadJsonFile(path.join(BANK_DIR, 'constants', 'constants.default.json'));
    
    // 3. Load and normalize questions
    console.log('📝 Loading and normalizing questions...');
    const questions = {};
    const questionFiles = fs.readdirSync(path.join(BANK_DIR, 'questions'))
      .filter(file => file.endsWith('.json'));
    
    for (const file of questionFiles) {
      const family = path.basename(file, '.json');
      questions[family] = loadJsonFile(path.join(BANK_DIR, 'questions', file));
    }
    
    // Normalize questions
    const normalizedQuestions = normalizeQuestions(questions);
    
    // Enforce caps
    const capsResult = enforceCaps(normalizedQuestions);
    if (capsResult.warnings.length > 0) {
      console.log('⚠️  Cap enforcement warnings:');
      capsResult.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    // 4. Load meta
    const meta = loadJsonFile(path.join(BANK_DIR, 'bank.meta.json'));
    
    // 5. Assemble bank package
    const bankPackage = {
      meta,
      registries,
      constants,
      questions: normalizedQuestions
    };
    
    // 6. Run linter
    console.log('🔍 Running linter...');
    const linterReport = runLinter(bankPackage);
    
    if (!linterReport.ok) {
      console.error('❌ Linter errors found');
      process.exit(EXIT_CODES.LINTER_ERRORS);
    }
    
    console.log('✅ Linter passed');
    
    // 7. Compute bank_hash_sha256
    console.log('🔐 Computing bank hash...');
    const bankHash = computeBankHash(bankPackage);
    bankPackage.meta.bank_hash_sha256 = bankHash;
    bankPackage.meta.packed_at = new Date().toISOString();
    
    console.log(`📊 Bank hash: ${bankHash}`);
    
    // 8. Sign with configured keypair
    console.log('🔑 Signing bank package...');
    const environment = process.env.NODE_ENV || 'development';
    const signingKey = loadOrCreateSigningKey(environment);
    const signature = signBankPackage(bankPackage, signingKey);
    
    bankPackage.meta.signature = signature;
    bankPackage.meta.signed_at = new Date().toISOString();
    bankPackage.meta.signed_by = environment;
    
    console.log(`📊 Signature: ${signature.substring(0, 16)}...`);
    
    // 9. Emit package
    console.log('📦 Emitting bank package...');
    const canonicalPackage = canonicalize(bankPackage);
    const packagePath = path.join(PACKAGED_DIR, 'bank_package.json');
    fs.writeFileSync(packagePath, JSON.stringify(canonicalPackage, null, 2));
    
    // 10. Emit linter report
    const linterReportPath = path.join(PACKAGED_DIR, 'linter_report.json');
    fs.writeFileSync(linterReportPath, JSON.stringify(linterReport, null, 2));
    
    // 11. Emit signature separately
    const signaturePath = path.join(PACKAGED_DIR, 'signature.txt');
    fs.writeFileSync(signaturePath, signature);
    
    console.log('✅ Bank package built successfully');
    console.log(`📦 Package: ${packagePath}`);
    console.log(`📊 Size: ${fs.statSync(packagePath).size} bytes`);
    console.log(`🔍 Linter report: ${linterReportPath}`);
    console.log(`🔑 Signature: ${signaturePath}`);
    
    return {
      bankPackage: canonicalPackage,
      bankHash,
      linterReport,
      signature,
      packagePath,
      linterReportPath,
      signaturePath
    };
    
  } catch (error) {
    console.error('❌ Bank building failed:', error.message);
    process.exit(EXIT_CODES.SCHEMA_FAILURE);
  }
}

// Command line interface
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'build':
    case undefined:
      buildBank();
      break;
    case '--help':
    case '-h':
      console.log('Bank Builder CLI - Batch 5');
      console.log('');
      console.log('Usage: node bank-builder-cli.js [command]');
      console.log('');
      console.log('Commands:');
      console.log('  build    Build bank package (default)');
      console.log('  --help   Show this help');
      console.log('');
      console.log('Exit codes:');
      console.log('  0  Success');
      console.log('  10 Schema failure');
      console.log('  20 Linter error(s) present');
      console.log('  30 Signing failure');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.log('Run with --help for usage information');
      process.exit(1);
  }
}

module.exports = { buildBank, EXIT_CODES };
