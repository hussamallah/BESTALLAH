#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Bank Linter - Validates bank structure and content
 * 
 * Validates:
 * - Masks (CO/CO/CF pattern)
 * - Tells caps (0-3 tells, ≤1 per face per option)
 * - Counts (exactly 7 families, 14 faces, 3 questions per family)
 * - Unique qids
 * - Per-face opportunity minima
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');

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
 * Lint bank structure and content
 */
function lintBank() {
  console.log('🔍 Linting bank...');
  
  const errors = [];
  const warnings = [];
  
  try {
    // Load all bank components
    const meta = loadJsonFile(path.join(BANK_DIR, 'bank.meta.json'));
    const families = loadJsonFile(path.join(BANK_DIR, 'registries', 'families.json'));
    const faces = loadJsonFile(path.join(BANK_DIR, 'registries', 'faces.json'));
    const tells = loadJsonFile(path.join(BANK_DIR, 'registries', 'tells.json'));
    const contrastMatrix = loadJsonFile(path.join(BANK_DIR, 'registries', 'contrast_matrix.json'));
    const constants = loadJsonFile(path.join(BANK_DIR, 'constants', 'constants.default.json'));
    
    // Load all question files
    const questions = {};
    const questionFiles = fs.readdirSync(path.join(BANK_DIR, 'questions'))
      .filter(file => file.endsWith('.json'));
    
    for (const file of questionFiles) {
      const family = path.basename(file, '.json');
      questions[family] = loadJsonFile(path.join(BANK_DIR, 'questions', file));
    }
    
    // 1. Validate counts
    console.log('  📊 Checking counts...');
    
    if (families.families.length !== 7) {
      errors.push(`Expected 7 families, found ${families.families.length}`);
    }
    
    if (faces.faces.length !== 14) {
      errors.push(`Expected 14 faces, found ${faces.faces.length}`);
    }
    
    if (Object.keys(questions).length !== 7) {
      errors.push(`Expected 7 question files, found ${Object.keys(questions).length}`);
    }
    
    // 2. Validate question structure
    console.log('  📝 Checking question structure...');
    
    const allQids = new Set();
    const faceTellCounts = new Map();
    
    for (const [familyName, familyQuestions] of Object.entries(questions)) {
      // Check family has exactly 3 questions
      if (!familyQuestions.questions || familyQuestions.questions.length !== 3) {
        errors.push(`Family ${familyName} must have exactly 3 questions`);
        continue;
      }
      
      // Check CO/CO/CF pattern
      const orders = familyQuestions.questions.map(q => q.order_in_family);
      if (JSON.stringify(orders) !== JSON.stringify(['C', 'O', 'F'])) {
        errors.push(`Family ${familyName} must follow CO/CO/CF pattern, found: ${orders.join(',')}`);
      }
      
      // Check each question
      for (const question of familyQuestions.questions) {
        // Check unique qids
        if (allQids.has(question.qid)) {
          errors.push(`Duplicate qid: ${question.qid}`);
        }
        allQids.add(question.qid);
        
        // Check question has exactly 2 options
        if (!question.options || question.options.length !== 2) {
          errors.push(`Question ${question.qid} must have exactly 2 options`);
          continue;
        }
        
        // Check options
        for (const option of question.options) {
          // Check lineCOF is valid
          if (!['C', 'O', 'F'].includes(option.lineCOF)) {
            errors.push(`Option ${option.id} in ${question.qid} has invalid lineCOF: ${option.lineCOF}`);
          }
          
          // Check tells (0-3 tells)
          if (option.tells && option.tells.length > 3) {
            errors.push(`Option ${option.id} in ${question.qid} has too many tells: ${option.tells.length}`);
          }
          
          // Check tells per face per option (≤1 per face)
          if (option.tells) {
            const faceCounts = new Map();
            for (const tellId of option.tells) {
              // Find face for this tell
              const tell = tells.tells.find(t => t.id === tellId);
              if (!tell) {
                errors.push(`Tell ${tellId} in option ${option.id} not found in registry`);
                continue;
              }
              
              const faceId = tell.face_id;
              const count = faceCounts.get(faceId) || 0;
              if (count >= 1) {
                errors.push(`Option ${option.id} in ${question.qid} has multiple tells for face ${faceId}`);
              }
              faceCounts.set(faceId, count + 1);
              
              // Track face tell counts for opportunity validation
              if (!faceTellCounts.has(faceId)) {
                faceTellCounts.set(faceId, 0);
              }
              faceTellCounts.set(faceId, faceTellCounts.get(faceId) + 1);
            }
          }
        }
      }
    }
    
    // 3. Validate per-face opportunity minima (Batch 2 requirements)
    console.log('  🎯 Checking per-face opportunities...');
    
    const minTellsPerFace = 6;
    const minSignatureOpportunities = 2;
    const minAdjacentFamilies = 4; // Batch 2: spread across ≥4 families
    
    for (const face of faces.faces) {
      const faceId = face.id;
      const tellCount = faceTellCounts.get(faceId) || 0;
      
      if (tellCount < minTellsPerFace) {
        errors.push(`Face ${faceId} has only ${tellCount} tell opportunities, minimum ${minTellsPerFace} required`);
      }
      
      // Check signature opportunities (tells on home family)
      const signatureCount = countSignatureOpportunities(questions, faceId, face.family);
      if (signatureCount < minSignatureOpportunities) {
        errors.push(`Face ${faceId} has only ${signatureCount} signature opportunities, minimum ${minSignatureOpportunities} required`);
      }
      
      // Check adjacent spread (Batch 2 requirement)
      const adjacentFamilies = countAdjacentFamilies(questions, faceId, face.family);
      if (adjacentFamilies < minAdjacentFamilies) {
        warnings.push(`Face ${faceId} appears in only ${adjacentFamilies} families, recommended minimum ${minAdjacentFamilies} for good spread`);
      }
      
      // Check contrast tell availability (Batch 2 requirement)
      const hasContrastTell = checkContrastTellAvailability(faceId, tells, contrastMatrix);
      if (!hasContrastTell) {
        errors.push(`Face ${faceId} has no contrast tells defined`);
      }
    }
    
    // 4. Validate contrast matrix
    console.log('  🔄 Checking contrast matrix...');
    
    for (const pair of contrastMatrix.pairs) {
      // Check both faces exist
      const faceA = faces.faces.find(f => f.id === pair.a);
      const faceB = faces.faces.find(f => f.id === pair.b);
      
      if (!faceA) {
        errors.push(`Contrast matrix references non-existent face: ${pair.a}`);
      }
      if (!faceB) {
        errors.push(`Contrast matrix references non-existent face: ${pair.b}`);
      }
      
      // Check contrast tells exist
      for (const tellId of pair.a_contrast_tells) {
        const tell = tells.tells.find(t => t.id === tellId);
        if (!tell) {
          errors.push(`Contrast tell ${tellId} for ${pair.a} not found in registry`);
        } else if (tell.face_id !== pair.a) {
          errors.push(`Contrast tell ${tellId} belongs to ${tell.face_id}, not ${pair.a}`);
        }
      }
      
      for (const tellId of pair.b_contrast_tells) {
        const tell = tells.tells.find(t => t.id === tellId);
        if (!tell) {
          errors.push(`Contrast tell ${tellId} for ${pair.b} not found in registry`);
        } else if (tell.face_id !== pair.b) {
          errors.push(`Contrast tell ${tellId} belongs to ${tell.face_id}, not ${pair.b}`);
        }
      }
    }
    
    // 5. Validate constants
    console.log('  ⚙️ Checking constants...');
    
    const requiredConstants = [
      'PER_SCREEN_CAP',
      'LIT_MIN_QUESTIONS',
      'LIT_MIN_FAMILIES',
      'LIT_MIN_SIGNATURE',
      'LIT_MIN_CLEAN',
      'LIT_MAX_BROKEN',
      'LEAN_MIN_QUESTIONS',
      'LEAN_MIN_FAMILIES',
      'LEAN_MIN_SIGNATURE',
      'LEAN_MIN_CLEAN',
      'REQUIRE_CONTRAST'
    ];
    
    const defaultProfile = constants.profiles.DEFAULT;
    for (const constant of requiredConstants) {
      if (defaultProfile[constant] === undefined) {
        errors.push(`Missing required constant: ${constant}`);
      }
    }
    
    // Check PER_SCREEN_CAP is valid
    if (defaultProfile.PER_SCREEN_CAP !== undefined) {
      if (defaultProfile.PER_SCREEN_CAP < 0 || defaultProfile.PER_SCREEN_CAP > 1) {
        errors.push(`PER_SCREEN_CAP must be between 0 and 1, found: ${defaultProfile.PER_SCREEN_CAP}`);
      }
    }
    
    // Report results in Batch 2 format
    console.log('\n📋 Lint Results:');
    
    const result = {
      ok: errors.length === 0,
      summary: {
        families: families.families.length,
        questions: Object.values(questions).reduce((sum, f) => sum + f.questions.length, 0),
        options: Object.values(questions).reduce((sum, f) => sum + f.questions.length * 2, 0),
        tells: faceTellCounts.size
      },
      warnings: warnings.map(warning => ({
        code: 'W_LOW_ADJACENT',
        face: warning.includes('appears in only') ? warning.split(' ')[0] : 'UNKNOWN',
        detail: warning
      })),
      errors: errors.map(error => ({
        code: 'E_VALIDATION_FAILED',
        message: error,
        hint: 'Check bank structure and content'
      }))
    };
    
    if (result.ok) {
      console.log('✅ All checks passed! Bank is valid.');
      console.log(JSON.stringify(result, null, 2));
      return true;
    }
    
    if (errors.length > 0) {
      console.log(`❌ ${errors.length} errors found:`);
      errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (warnings.length > 0) {
      console.log(`⚠️ ${warnings.length} warnings found:`);
      warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n📊 Batch 2 Linter Output:');
    console.log(JSON.stringify(result, null, 2));
    
    return errors.length === 0;
    
  } catch (error) {
    console.error('❌ Linting failed:', error.message);
    return false;
  }
}

/**
 * Count signature opportunities for a face (tells on home family)
 */
function countSignatureOpportunities(questions, faceId, familyName) {
  let count = 0;
  
  for (const [family, familyQuestions] of Object.entries(questions)) {
    if (family === familyName.toLowerCase()) {
      for (const question of familyQuestions.questions) {
        for (const option of question.options) {
          if (option.tells) {
            for (const tellId of option.tells) {
              // Check if this tell belongs to the face
              if (tellId.includes(faceId.split('/').pop())) {
                count++;
              }
            }
          }
        }
      }
    }
  }
  
  return count;
}

/**
 * Count adjacent families for a face (Batch 2 requirement)
 */
function countAdjacentFamilies(questions, faceId, homeFamily) {
  const familiesWithFace = new Set();
  
  for (const [family, familyQuestions] of Object.entries(questions)) {
    for (const question of familyQuestions.questions) {
      for (const option of question.options) {
        if (option.tells) {
          for (const tellId of option.tells) {
            // Check if this tell belongs to the face
            if (tellId.includes(faceId.split('/').pop())) {
              familiesWithFace.add(family);
            }
          }
        }
      }
    }
  }
  
  return familiesWithFace.size;
}

/**
 * Check if face has contrast tells available (Batch 2 requirement)
 */
function checkContrastTellAvailability(faceId, tells, contrastMatrix) {
  // Check if face has any contrast tells in the registry
  const faceTells = tells.tells.filter(tell => tell.face_id === faceId && tell.contrast === true);
  if (faceTells.length > 0) return true;
  
  // Check if face is in contrast matrix
  for (const pair of contrastMatrix.pairs) {
    if (pair.a === faceId || pair.b === faceId) {
      return true;
    }
  }
  
  return false;
}

// Run if called directly
if (require.main === module) {
  const success = lintBank();
  process.exit(success ? 0 : 1);
}

module.exports = { lintBank };
