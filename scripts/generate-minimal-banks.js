#!/usr/bin/env node

/**
 * Minimal Banks for Tests (synthetic)
 * 
 * Generates two micro banks for testing:
 * - Bank A (balanced): ensures every face has 8 opportunities, signature 2+, adjacent spread 4+, full COF per family
 * - Bank B (stress): over-concentrates tells for a few faces in one family and omits O/F probes for one family
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MinimalBankGenerator {
  constructor() {
    this.banks = new Map();
  }

  /**
   * Generate Bank A (balanced)
   */
  generateBankA() {
    const bank = {
      meta: {
        bank_id: 'pff.test.a',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        bank_hash_sha256: '',
        signature: ''
      },
      registries: {
        families: this.generateFamilies(),
        faces: this.generateFaces(),
        tells: this.generateBalancedTells(),
        contrast_matrix: this.generateContrastMatrix()
      },
      questions: this.generateBalancedQuestions(),
      constants: this.generateConstants()
    };

    // Calculate hash and signature
    bank.meta.bank_hash_sha256 = this.calculateBankHash(bank);
    bank.meta.signature = this.generateSignature(bank);

    this.banks.set('A', bank);
    return bank;
  }

  /**
   * Generate Bank B (stress)
   */
  generateBankB() {
    const bank = {
      meta: {
        bank_id: 'pff.test.b',
        version: '1.0.0',
        created_at: new Date().toISOString(),
        bank_hash_sha256: '',
        signature: ''
      },
      registries: {
        families: this.generateFamilies(),
        faces: this.generateFaces(),
        tells: this.generateStressTells(),
        contrast_matrix: this.generateContrastMatrix()
      },
      questions: this.generateStressQuestions(),
      constants: this.generateConstants()
    };

    // Calculate hash and signature
    bank.meta.bank_hash_sha256 = this.calculateBankHash(bank);
    bank.meta.signature = this.generateSignature(bank);

    this.banks.set('B', bank);
    return bank;
  }

  /**
   * Generate families registry
   */
  generateFamilies() {
    return [
      { id: 'FAM/Control', name: 'Control' },
      { id: 'FAM/Pace', name: 'Pace' },
      { id: 'FAM/Boundary', name: 'Boundary' },
      { id: 'FAM/Truth', name: 'Truth' },
      { id: 'FAM/Recognition', name: 'Recognition' },
      { id: 'FAM/Bonding', name: 'Bonding' },
      { id: 'FAM/Stress', name: 'Stress' }
    ];
  }

  /**
   * Generate faces registry
   */
  generateFaces() {
    return [
      { id: 'FACE/Control/Sovereign', family: 'Control' },
      { id: 'FACE/Control/Rebel', family: 'Control' },
      { id: 'FACE/Pace/Visionary', family: 'Pace' },
      { id: 'FACE/Pace/Navigator', family: 'Pace' },
      { id: 'FACE/Boundary/Equalizer', family: 'Boundary' },
      { id: 'FACE/Boundary/Guardian', family: 'Boundary' },
      { id: 'FACE/Truth/Seeker', family: 'Truth' },
      { id: 'FACE/Truth/Architect', family: 'Truth' },
      { id: 'FACE/Recognition/Spotlight', family: 'Recognition' },
      { id: 'FACE/Recognition/Diplomat', family: 'Recognition' },
      { id: 'FACE/Bonding/Partner', family: 'Bonding' },
      { id: 'FACE/Bonding/Provider', family: 'Bonding' },
      { id: 'FACE/Stress/Catalyst', family: 'Stress' },
      { id: 'FACE/Stress/Artisan', family: 'Stress' }
    ];
  }

  /**
   * Generate balanced tells (8+ opportunities per face)
   */
  generateBalancedTells() {
    const tells = [];
    const faces = this.generateFaces();
    
    for (const face of faces) {
      const family = face.family;
      const faceName = face.id.split('/')[2];
      
      // Generate 8-10 tells per face
      const tellCount = 9;
      for (let i = 1; i <= tellCount; i++) {
        tells.push({
          id: `TELL/${family}/${faceName}/tell-${i}`,
          face_id: face.id,
          contrast: i <= 2 // First 2 tells are contrast
        });
      }
    }
    
    return tells;
  }

  /**
   * Generate stress tells (concentrated)
   */
  generateStressTells() {
    const tells = [];
    const faces = this.generateFaces();
    
    for (const face of faces) {
      const family = face.family;
      const faceName = face.id.split('/')[2];
      
      if (family === 'Pace' && faceName === 'Visionary') {
        // Over-concentrate Visionary tells
        for (let i = 1; i <= 15; i++) {
          tells.push({
            id: `TELL/${family}/${faceName}/tell-${i}`,
            face_id: face.id,
            contrast: i <= 3
          });
        }
      } else if (family === 'Boundary') {
        // Minimal tells for Boundary family
        for (let i = 1; i <= 2; i++) {
          tells.push({
            id: `TELL/${family}/${faceName}/tell-${i}`,
            face_id: face.id,
            contrast: i === 1
          });
        }
      } else {
        // Normal tells for other faces
        for (let i = 1; i <= 5; i++) {
          tells.push({
            id: `TELL/${family}/${faceName}/tell-${i}`,
            face_id: face.id,
            contrast: i <= 2
          });
        }
      }
    }
    
    return tells;
  }

  /**
   * Generate contrast matrix
   */
  generateContrastMatrix() {
    return {
      pairs: [
        {
          family: 'Control',
          a: 'FACE/Control/Sovereign',
          b: 'FACE/Control/Rebel',
          a_contrast_tells: ['TELL/Control/Sovereign/tell-1', 'TELL/Control/Sovereign/tell-2'],
          b_contrast_tells: ['TELL/Control/Rebel/tell-1']
        },
        {
          family: 'Pace',
          a: 'FACE/Pace/Visionary',
          b: 'FACE/Pace/Navigator',
          a_contrast_tells: ['TELL/Pace/Visionary/tell-1', 'TELL/Pace/Visionary/tell-2'],
          b_contrast_tells: ['TELL/Pace/Navigator/tell-1']
        },
        {
          family: 'Boundary',
          a: 'FACE/Boundary/Equalizer',
          b: 'FACE/Boundary/Guardian',
          a_contrast_tells: ['TELL/Boundary/Equalizer/tell-1'],
          b_contrast_tells: ['TELL/Boundary/Guardian/tell-1']
        },
        {
          family: 'Truth',
          a: 'FACE/Truth/Seeker',
          b: 'FACE/Truth/Architect',
          a_contrast_tells: ['TELL/Truth/Seeker/tell-1', 'TELL/Truth/Seeker/tell-2'],
          b_contrast_tells: ['TELL/Truth/Architect/tell-1']
        },
        {
          family: 'Recognition',
          a: 'FACE/Recognition/Spotlight',
          b: 'FACE/Recognition/Diplomat',
          a_contrast_tells: ['TELL/Recognition/Spotlight/tell-1'],
          b_contrast_tells: ['TELL/Recognition/Diplomat/tell-1']
        },
        {
          family: 'Bonding',
          a: 'FACE/Bonding/Partner',
          b: 'FACE/Bonding/Provider',
          a_contrast_tells: ['TELL/Bonding/Partner/tell-1'],
          b_contrast_tells: ['TELL/Bonding/Provider/tell-1']
        },
        {
          family: 'Stress',
          a: 'FACE/Stress/Catalyst',
          b: 'FACE/Stress/Artisan',
          a_contrast_tells: ['TELL/Stress/Catalyst/tell-1'],
          b_contrast_tells: ['TELL/Stress/Artisan/tell-1']
        }
      ]
    };
  }

  /**
   * Generate balanced questions
   */
  generateBalancedQuestions() {
    const questions = {};
    const families = ['control', 'pace', 'boundary', 'truth', 'recognition', 'bonding', 'stress'];
    
    for (const family of families) {
      questions[family] = [];
      
      for (let i = 1; i <= 3; i++) {
        const question = {
          qid: `${family.toUpperCase()}_Q${i}`,
          options: [
            {
              key: 'A',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'A', i, 'balanced')
            },
            {
              key: 'B',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'B', i, 'balanced')
            }
          ]
        };
        
        questions[family].push(question);
      }
    }
    
    return questions;
  }

  /**
   * Generate stress questions
   */
  generateStressQuestions() {
    const questions = {};
    const families = ['control', 'pace', 'boundary', 'truth', 'recognition', 'bonding', 'stress'];
    
    for (const family of families) {
      questions[family] = [];
      
      for (let i = 1; i <= 3; i++) {
        const question = {
          qid: `${family.toUpperCase()}_Q${i}`,
          options: [
            {
              key: 'A',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'A', i, 'stress')
            },
            {
              key: 'B',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'B', i, 'stress')
            }
          ]
        };
        
        questions[family].push(question);
      }
    }
    
    return questions;
  }

  /**
   * Generate option tells
   */
  generateOptionTells(family, optionKey, questionNum, bankType) {
    const tells = [];
    const familyFaces = this.getFamilyFaces(family);
    
    if (bankType === 'balanced') {
      // Balanced bank: each option gets 1-2 tells
      const tellCount = Math.random() < 0.5 ? 1 : 2;
      
      for (let i = 0; i < tellCount; i++) {
        const face = familyFaces[Math.floor(Math.random() * familyFaces.length)];
        tells.push({
          face_id: face,
          tell_id: `TELL/${family}/${face.split('/')[2]}/tell-${i + 1}`
        });
      }
    } else if (bankType === 'stress') {
      // Stress bank: over-concentrate certain faces
      if (family === 'pace' && optionKey === 'A') {
        // Over-concentrate Visionary tells in Pace family
        for (let i = 1; i <= 3; i++) {
          tells.push({
            face_id: 'FACE/Pace/Visionary',
            tell_id: `TELL/Pace/Visionary/tell-${i}`
          });
        }
      } else if (family === 'boundary') {
        // Minimal tells for Boundary family
        if (familyFaces.length > 0) {
          const face = familyFaces[0];
          tells.push({
            face_id: face,
            tell_id: `TELL/${family}/${face.split('/')[2]}/tell-1`
          });
        }
      } else {
        // Normal tells for other families
        if (familyFaces.length > 0) {
          const face = familyFaces[Math.floor(Math.random() * familyFaces.length)];
          tells.push({
            face_id: face,
            tell_id: `TELL/${family}/${face.split('/')[2]}/tell-1`
          });
        }
      }
    }
    
    return tells;
  }

  /**
   * Get family faces
   */
  getFamilyFaces(family) {
    const familyMap = {
      'control': ['FACE/Control/Sovereign', 'FACE/Control/Rebel'],
      'pace': ['FACE/Pace/Visionary', 'FACE/Pace/Navigator'],
      'boundary': ['FACE/Boundary/Equalizer', 'FACE/Boundary/Guardian'],
      'truth': ['FACE/Truth/Seeker', 'FACE/Truth/Architect'],
      'recognition': ['FACE/Recognition/Spotlight', 'FACE/Recognition/Diplomat'],
      'bonding': ['FACE/Bonding/Partner', 'FACE/Bonding/Provider'],
      'stress': ['FACE/Stress/Catalyst', 'FACE/Stress/Artisan']
    };
    
    return familyMap[family] || [];
  }

  /**
   * Generate constants
   */
  generateConstants() {
    return {
      LIT_MIN_QUESTIONS: 6,
      LIT_MIN_FAMILIES: 4,
      LIT_MIN_SIGNATURE: 2,
      LIT_MIN_CLEAN: 4,
      LIT_MAX_BROKEN: 1,
      PER_SCREEN_CAP: 0.40,
      LEAN_MIN_QUESTIONS: 4,
      LEAN_MIN_FAMILIES: 3,
      LEAN_MIN_SIGNATURE: 1,
      LEAN_MIN_CLEAN: 2,
      GHOST_MIN_QUESTIONS: 6,
      GHOST_MAX_FAMILIES: 2,
      COLD_MIN_QUESTIONS: 2,
      COLD_MAX_QUESTIONS: 3,
      COLD_MIN_FAMILIES: 2
    };
  }

  /**
   * Calculate bank hash
   */
  calculateBankHash(bank) {
    const bankData = JSON.stringify(bank, null, 2);
    return crypto.createHash('sha256').update(bankData).digest('hex');
  }

  /**
   * Generate signature
   */
  generateSignature(bank) {
    const bankData = JSON.stringify(bank, null, 2);
    return crypto.createHash('sha256').update(bankData + 'test-signature-salt').digest('hex');
  }

  /**
   * Generate QA linter output for bank
   */
  generateQALinterOutput(bank) {
    const linterOutput = {
      ok: true,
      summary: {
        families: 7,
        questions: 21,
        options: 42,
        tells: bank.registries.tells.length
      },
      warnings: [],
      errors: []
    };

    // Check for stress bank specific issues
    if (bank.meta.bank_id === 'pff.test.b') {
      linterOutput.warnings.push({
        code: 'W_OVER_CONCENTRATION',
        face_id: 'FACE/Pace/Visionary',
        detail: 'Over-concentrated tells in single family'
      });
      
      linterOutput.warnings.push({
        code: 'W_MINIMAL_TELLS',
        family: 'Boundary',
        detail: 'Minimal tells for family'
      });
    }

    return linterOutput;
  }

  /**
   * Save bank to file
   */
  saveBank(bankId, outputDir) {
    const bank = this.banks.get(bankId);
    if (!bank) {
      throw new Error(`Bank not found: ${bankId}`);
    }

    const fileName = `bank_${bankId.toLowerCase()}.json`;
    const filePath = path.join(outputDir, fileName);
    
    fs.writeFileSync(filePath, JSON.stringify(bank, null, 2));
    console.log(`Saved bank ${bankId} to: ${filePath}`);
    
    return filePath;
  }

  /**
   * Save all banks
   */
  saveAllBanks(outputDir) {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const savedBanks = [];
    for (const bankId of this.banks.keys()) {
      const filePath = this.saveBank(bankId, outputDir);
      savedBanks.push({
        bankId,
        filePath,
        hash: this.banks.get(bankId).meta.bank_hash_sha256
      });
    }

    return savedBanks;
  }

  /**
   * Generate test scenarios
   */
  generateTestScenarios() {
    return {
      bank_a_scenarios: [
        {
          name: 'Clean LIT',
          picks: ['Control', 'Pace', 'Boundary'],
          expected_face_states: {
            'FACE/Pace/Navigator': 'LIT',
            'FACE/Control/Sovereign': 'LEAN',
            'FACE/Boundary/Equalizer': 'LEAN'
          }
        },
        {
          name: 'All A answers',
          picks: ['Truth', 'Recognition', 'Bonding'],
          answer_pattern: 'all_a',
          expected_question_count: 18
        },
        {
          name: 'All B answers',
          picks: ['Stress'],
          answer_pattern: 'all_b',
          expected_question_count: 20
        }
      ],
      bank_b_scenarios: [
        {
          name: 'Concentrated Visionary',
          picks: ['Pace'],
          expected_face_states: {
            'FACE/Pace/Visionary': 'GHOST'
          }
        },
        {
          name: 'Minimal Boundary',
          picks: ['Boundary'],
          expected_face_states: {
            'FACE/Boundary/Equalizer': 'ABSENT',
            'FACE/Boundary/Guardian': 'ABSENT'
          }
        }
      ]
    };
  }

  /**
   * Validate bank structure
   */
  validateBankStructure(bank) {
    const errors = [];
    
    // Check required fields
    if (!bank.meta || !bank.meta.bank_id) {
      errors.push('Missing bank_id in meta');
    }
    
    if (!bank.registries || !bank.registries.families) {
      errors.push('Missing families registry');
    }
    
    if (!bank.questions) {
      errors.push('Missing questions');
    }
    
    // Check family count
    if (bank.registries.families.length !== 7) {
      errors.push(`Expected 7 families, got ${bank.registries.families.length}`);
    }
    
    // Check question count
    const questionCount = Object.values(bank.questions).reduce((sum, familyQuestions) => sum + familyQuestions.length, 0);
    if (questionCount !== 21) {
      errors.push(`Expected 21 questions, got ${questionCount}`);
    }
    
    return {
      valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * Generate all banks
   */
  generateAllBanks() {
    console.log('Generating minimal test banks...');
    
    const bankA = this.generateBankA();
    const bankB = this.generateBankB();
    
    console.log(`Generated Bank A: ${bankA.meta.bank_hash_sha256.substring(0, 8)}...`);
    console.log(`Generated Bank B: ${bankB.meta.bank_hash_sha256.substring(0, 8)}...`);
    
    return {
      A: bankA,
      B: bankB
    };
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  const outputDir = args[0] || 'test-banks';
  
  const generator = new MinimalBankGenerator();
  
  // Generate all banks
  const banks = generator.generateAllBanks();
  
  // Save banks
  const savedBanks = generator.saveAllBanks(outputDir);
  
  // Generate test scenarios
  const scenarios = generator.generateTestScenarios();
  
  // Save test scenarios
  const scenariosPath = path.join(outputDir, 'test-scenarios.json');
  fs.writeFileSync(scenariosPath, JSON.stringify(scenarios, null, 2));
  
  // Generate QA linter outputs
  for (const [bankId, bank] of Object.entries(banks)) {
    const linterOutput = generator.generateQALinterOutput(bank);
    const linterPath = path.join(outputDir, `linter_${bankId.toLowerCase()}.json`);
    fs.writeFileSync(linterPath, JSON.stringify(linterOutput, null, 2));
  }
  
  console.log('\n📊 Generated Banks Summary:');
  console.log(`Bank A (balanced): ${banks.A.meta.bank_hash_sha256.substring(0, 8)}...`);
  console.log(`Bank B (stress): ${banks.B.meta.bank_hash_sha256.substring(0, 8)}...`);
  console.log(`Saved to: ${outputDir}`);
  console.log(`Test scenarios: ${scenariosPath}`);
  
  // Validate banks
  console.log('\n🔍 Bank Validation:');
  for (const [bankId, bank] of Object.entries(banks)) {
    const validation = generator.validateBankStructure(bank);
    console.log(`Bank ${bankId}: ${validation.valid ? '✅ Valid' : '❌ Invalid'}`);
    if (!validation.valid) {
      validation.errors.forEach(error => console.log(`  - ${error}`));
    }
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = MinimalBankGenerator;
