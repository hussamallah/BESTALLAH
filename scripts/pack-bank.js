#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Bank Packer - Creates canonical bank_package.json
 * 
 * Features:
 * - Normalizes JSON ordering
 * - Enforces schema validation
 * - Computes bank_hash_sha256
 * - Writes packaged bank to /bank/packaged/bank_package.json
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');

// Ensure packaged directory exists
if (!fs.existsSync(PACKAGED_DIR)) {
  fs.mkdirSync(PACKAGED_DIR, { recursive: true });
}

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
 * Validate bank structure
 */
function validateBank(bank) {
  const errors = [];
  
  // Check required top-level fields
  if (!bank.meta) errors.push('Missing meta');
  if (!bank.registries) errors.push('Missing registries');
  if (!bank.constants) errors.push('Missing constants');
  if (!bank.questions) errors.push('Missing questions');
  
  // Validate meta
  if (bank.meta && bank.meta.schema !== 'bank.meta.v1') {
    errors.push('Invalid meta schema');
  }
  
  // Validate registries
  if (bank.registries) {
    const requiredRegistries = ['families', 'faces', 'tells', 'contrast_matrix'];
    for (const registry of requiredRegistries) {
      if (!bank.registries[registry]) {
        errors.push(`Missing registry: ${registry}`);
      }
    }
    
    // Validate families count
    if (bank.registries.families && bank.registries.families.families.length !== 7) {
      errors.push('Must have exactly 7 families');
    }
    
    // Validate faces count
    if (bank.registries.faces && bank.registries.faces.faces.length !== 14) {
      errors.push('Must have exactly 14 faces');
    }
  }
  
  // Validate questions
  if (bank.questions) {
    const questionFiles = Object.keys(bank.questions);
    if (questionFiles.length !== 7) {
      errors.push('Must have exactly 7 question files');
    }
    
    // Validate each question file has 3 questions
    for (const [family, questions] of Object.entries(bank.questions)) {
      if (!questions.questions || questions.questions.length !== 3) {
        errors.push(`Family ${family} must have exactly 3 questions`);
      }
      
      // Validate CO/CO/CF pattern
      const orders = questions.questions.map(q => q.order_in_family);
      if (JSON.stringify(orders) !== JSON.stringify(['C', 'O', 'F'])) {
        errors.push(`Family ${family} must follow CO/CO/CF pattern`);
      }
      
      // Validate each question has 2 options
      for (const question of questions.questions) {
        if (!question.options || question.options.length !== 2) {
          errors.push(`Question ${question.qid} must have exactly 2 options`);
        }
        
        // Validate options have lineCOF
        for (const option of question.options) {
          if (!['C', 'O', 'F'].includes(option.lineCOF)) {
            errors.push(`Option ${option.id} in ${question.qid} has invalid lineCOF: ${option.lineCOF}`);
          }
          
          // Validate tells (0-3, ≤1 per face per option)
          if (option.tells && option.tells.length > 3) {
            errors.push(`Option ${option.id} in ${question.qid} has too many tells: ${option.tells.length}`);
          }
        }
      }
    }
  }
  
  return errors;
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
 * Compute SHA256 hash of canonical JSON
 */
function computeHash(obj) {
  const canonical = canonicalize(obj);
  const jsonString = JSON.stringify(canonical, null, 0);
  return crypto.createHash('sha256').update(jsonString).digest('hex');
}

/**
 * Main pack function
 */
function packBank() {
  console.log('📦 Packing bank...');
  
  try {
    // Load all bank components
    const meta = loadJsonFile(path.join(BANK_DIR, 'bank.meta.json'));
    const registries = {
      families: loadJsonFile(path.join(BANK_DIR, 'registries', 'families.json')),
      faces: loadJsonFile(path.join(BANK_DIR, 'registries', 'faces.json')),
      tells: loadJsonFile(path.join(BANK_DIR, 'registries', 'tells.json')),
      contrast_matrix: loadJsonFile(path.join(BANK_DIR, 'registries', 'contrast_matrix.json'))
    };
    const constants = loadJsonFile(path.join(BANK_DIR, 'constants', 'constants.default.json'));
    
    // Load all question files
    const questions = {};
    const questionFiles = fs.readdirSync(path.join(BANK_DIR, 'questions'))
      .filter(file => file.endsWith('.json'));
    
    for (const file of questionFiles) {
      const family = path.basename(file, '.json');
      questions[family] = loadJsonFile(path.join(BANK_DIR, 'questions', file));
    }
    
    // Assemble bank package
    const bankPackage = {
      meta,
      registries,
      constants,
      questions
    };
    
    // Validate bank structure
    console.log('🔍 Validating bank structure...');
    const validationErrors = validateBank(bankPackage);
    
    if (validationErrors.length > 0) {
      console.error('❌ Validation failed:');
      validationErrors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log('✅ Bank validation passed');
    
    // Compute hash
    console.log('🔐 Computing bank hash...');
    const bankHash = computeHash(bankPackage);
    console.log(`📊 Bank hash: ${bankHash}`);
    
    // Add hash to package
    bankPackage.meta.bank_hash_sha256 = bankHash;
    bankPackage.meta.packed_at = new Date().toISOString();
    
    // Write packaged bank
    const outputPath = path.join(PACKAGED_DIR, 'bank_package.json');
    const canonicalPackage = canonicalize(bankPackage);
    
    fs.writeFileSync(outputPath, JSON.stringify(canonicalPackage, null, 2));
    
    console.log(`✅ Bank packaged successfully: ${outputPath}`);
    console.log(`📊 Package size: ${fs.statSync(outputPath).size} bytes`);
    
  } catch (error) {
    console.error('❌ Packing failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  packBank();
}

module.exports = { packBank, validateBank, computeHash, canonicalize };
