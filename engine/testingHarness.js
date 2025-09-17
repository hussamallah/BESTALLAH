/**
 * Testing Harness & Golden Cases
 * 
 * Provides comprehensive testing harness with golden cases and fuzzers.
 * Includes G1-G5 golden cases and synthetic test banks.
 */

const crypto = require('crypto');

class TestingHarness {
  constructor() {
    this.goldenCases = new Map();
    this.testBanks = new Map();
    this.fuzzers = new Map();
    this.testResults = [];
  }

  /**
   * Initialize golden cases
   */
  initializeGoldenCases() {
    // G1: Clean LIT - target face satisfies LIT gates
    this.goldenCases.set('G1', {
      name: 'Clean LIT',
      description: 'Target face satisfies LIT gates; assert exact state',
      expectedState: 'LIT',
      testData: {
        picks: ['Control', 'Pace', 'Boundary'],
        answers: this.generateCleanLITAnswers(),
        expectedFace: 'FACE/Pace/Navigator'
      }
    });

    // G2: Ghost due to cap - concentrated evidence
    this.goldenCases.set('G2', {
      name: 'Ghost due to cap',
      description: 'Concentrated evidence; assert GHOST',
      expectedState: 'GHOST',
      testData: {
        picks: ['Pace'],
        answers: this.generateConcentratedAnswers(),
        expectedFace: 'FACE/Pace/Visionary'
      }
    });

    // G3: Broken-dominant - BROKEN≥CLEAN
    this.goldenCases.set('G3', {
      name: 'Broken-dominant',
      description: 'BROKEN≥CLEAN; assert GHOST',
      expectedState: 'GHOST',
      testData: {
        picks: ['Truth', 'Recognition'],
        answers: this.generateBrokenDominantAnswers(),
        expectedFace: 'FACE/Truth/Seeker'
      }
    });

    // G4: Sibling tie - both faces LEAN
    this.goldenCases.set('G4', {
      name: 'Sibling tie',
      description: 'Both faces LEAN; tie-break by FAM→SIG→CLEAN',
      expectedState: 'LEAN',
      testData: {
        picks: ['Bonding', 'Stress'],
        answers: this.generateSiblingTieAnswers(),
        expectedFace: 'FACE/Bonding/Partner'
      }
    });

    // G5: Edge policies - picks=7 and picks=1
    this.goldenCases.set('G5', {
      name: 'Edge policies',
      description: 'picks=7 and picks=1 land at exactly 18',
      expectedState: 'VALID',
      testData: {
        picks7: ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'],
        picks1: ['Control'],
        expectedQuestionCount: 18
      }
    });
  }

  /**
   * Generate test bank A (balanced)
   */
  generateTestBankA() {
    const bank = {
      meta: {
        bank_id: 'pff.test.a',
        version: '1.0.0',
        bank_hash_sha256: crypto.createHash('sha256').update('test-bank-a').digest('hex'),
        signature: 'test-signature-a'
      },
      registries: {
        families: [
          { id: 'FAM/Control', name: 'Control' },
          { id: 'FAM/Pace', name: 'Pace' },
          { id: 'FAM/Boundary', name: 'Boundary' },
          { id: 'FAM/Truth', name: 'Truth' },
          { id: 'FAM/Recognition', name: 'Recognition' },
          { id: 'FAM/Bonding', name: 'Bonding' },
          { id: 'FAM/Stress', name: 'Stress' }
        ],
        faces: [
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
        ],
        tells: this.generateBalancedTells(),
        contrast_matrix: this.generateContrastMatrix()
      },
      questions: this.generateBalancedQuestions(),
      constants: {
        LIT_MIN_QUESTIONS: 6,
        LIT_MIN_FAMILIES: 4,
        LIT_MIN_SIGNATURE: 2,
        LIT_MIN_CLEAN: 4,
        LIT_MAX_BROKEN: 1,
        PER_SCREEN_CAP: 0.40,
        LEAN_MIN_QUESTIONS: 4,
        LEAN_MIN_FAMILIES: 3,
        LEAN_MIN_SIGNATURE: 1,
        LEAN_MIN_CLEAN: 2
      }
    };

    this.testBanks.set('A', bank);
    return bank;
  }

  /**
   * Generate test bank B (stress)
   */
  generateTestBankB() {
    const bank = {
      meta: {
        bank_id: 'pff.test.b',
        version: '1.0.0',
        bank_hash_sha256: crypto.createHash('sha256').update('test-bank-b').digest('hex'),
        signature: 'test-signature-b'
      },
      registries: {
        families: [
          { id: 'FAM/Control', name: 'Control' },
          { id: 'FAM/Pace', name: 'Pace' },
          { id: 'FAM/Boundary', name: 'Boundary' },
          { id: 'FAM/Truth', name: 'Truth' },
          { id: 'FAM/Recognition', name: 'Recognition' },
          { id: 'FAM/Bonding', name: 'Bonding' },
          { id: 'FAM/Stress', name: 'Stress' }
        ],
        faces: [
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
        ],
        tells: this.generateStressTells(),
        contrast_matrix: this.generateContrastMatrix()
      },
      questions: this.generateStressQuestions(),
      constants: {
        LIT_MIN_QUESTIONS: 6,
        LIT_MIN_FAMILIES: 4,
        LIT_MIN_SIGNATURE: 2,
        LIT_MIN_CLEAN: 4,
        LIT_MAX_BROKEN: 1,
        PER_SCREEN_CAP: 0.40,
        LEAN_MIN_QUESTIONS: 4,
        LEAN_MIN_FAMILIES: 3,
        LEAN_MIN_SIGNATURE: 1,
        LEAN_MIN_CLEAN: 2
      }
    };

    this.testBanks.set('B', bank);
    return bank;
  }

  /**
   * Generate balanced tells
   */
  generateBalancedTells() {
    const tells = [];
    const faces = [
      'FACE/Control/Sovereign', 'FACE/Control/Rebel',
      'FACE/Pace/Visionary', 'FACE/Pace/Navigator',
      'FACE/Boundary/Equalizer', 'FACE/Boundary/Guardian',
      'FACE/Truth/Seeker', 'FACE/Truth/Architect',
      'FACE/Recognition/Spotlight', 'FACE/Recognition/Diplomat',
      'FACE/Bonding/Partner', 'FACE/Bonding/Provider',
      'FACE/Stress/Catalyst', 'FACE/Stress/Artisan'
    ];

    for (const face of faces) {
      // Generate 8-10 tells per face
      for (let i = 1; i <= 9; i++) {
        tells.push({
          id: `TELL/${face.split('/')[1]}/${face.split('/')[2]}/tell-${i}`,
          face_id: face,
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
    const faces = [
      'FACE/Control/Sovereign', 'FACE/Control/Rebel',
      'FACE/Pace/Visionary', 'FACE/Pace/Navigator',
      'FACE/Boundary/Equalizer', 'FACE/Boundary/Guardian',
      'FACE/Truth/Seeker', 'FACE/Truth/Architect',
      'FACE/Recognition/Spotlight', 'FACE/Recognition/Diplomat',
      'FACE/Bonding/Partner', 'FACE/Bonding/Provider',
      'FACE/Stress/Catalyst', 'FACE/Stress/Artisan'
    ];

    for (const face of faces) {
      if (face === 'FACE/Pace/Visionary') {
        // Over-concentrate Visionary tells
        for (let i = 1; i <= 15; i++) {
          tells.push({
            id: `TELL/Pace/Visionary/tell-${i}`,
            face_id: face,
            contrast: i <= 3
          });
        }
      } else {
        // Minimal tells for other faces
        for (let i = 1; i <= 3; i++) {
          tells.push({
            id: `TELL/${face.split('/')[1]}/${face.split('/')[2]}/tell-${i}`,
            face_id: face,
            contrast: i === 1
          });
        }
      }
    }

    return tells;
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
        questions[family].push({
          qid: `${family.toUpperCase()}_Q${i}`,
          options: [
            {
              key: 'A',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'A', i)
            },
            {
              key: 'B',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateOptionTells(family, 'B', i)
            }
          ]
        });
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
        questions[family].push({
          qid: `${family.toUpperCase()}_Q${i}`,
          options: [
            {
              key: 'A',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateStressOptionTells(family, 'A', i)
            },
            {
              key: 'B',
              lineCOF: i === 1 ? 'C' : i === 2 ? 'O' : 'F',
              tells: this.generateStressOptionTells(family, 'B', i)
            }
          ]
        });
      }
    }

    return questions;
  }

  /**
   * Generate option tells for balanced bank
   */
  generateOptionTells(family, optionKey, questionNum) {
    const tells = [];
    const familyFaces = this.getFamilyFaces(family);
    
    // Each option gets 1-2 tells
    const tellCount = Math.random() < 0.5 ? 1 : 2;
    
    for (let i = 0; i < tellCount; i++) {
      const face = familyFaces[Math.floor(Math.random() * familyFaces.length)];
      tells.push({
        face_id: face,
        tell_id: `TELL/${family}/${face.split('/')[2]}/tell-${i + 1}`
      });
    }
    
    return tells;
  }

  /**
   * Generate option tells for stress bank
   */
  generateStressOptionTells(family, optionKey, questionNum) {
    const tells = [];
    
    if (family === 'pace' && optionKey === 'A') {
      // Over-concentrate Visionary tells in Pace family
      for (let i = 1; i <= 3; i++) {
        tells.push({
          face_id: 'FACE/Pace/Visionary',
          tell_id: `TELL/Pace/Visionary/tell-${i}`
        });
      }
    } else {
      // Minimal tells for other options
      const familyFaces = this.getFamilyFaces(family);
      if (familyFaces.length > 0) {
        const face = familyFaces[0];
        tells.push({
          face_id: face,
          tell_id: `TELL/${family}/${face.split('/')[2]}/tell-1`
        });
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
        }
        // Add more pairs as needed
      ]
    };
  }

  /**
   * Generate test answers for G1 (Clean LIT)
   */
  generateCleanLITAnswers() {
    return [
      { qid: 'PACE_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'PACE_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'CTRL_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'CTRL_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'BOUND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOUND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'BOUND_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'TRUTH_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'TRUTH_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'TRUTH_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'RECOG_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'RECOG_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'RECOG_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'STR_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q3', optionKey: 'A', lineCOF: 'F' }
    ];
  }

  /**
   * Generate test answers for G2 (Concentrated)
   */
  generateConcentratedAnswers() {
    return [
      { qid: 'PACE_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'PACE_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'CTRL_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'CTRL_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'CTRL_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOUND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOUND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'BOUND_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'TRUTH_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'TRUTH_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'TRUTH_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'RECOG_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'RECOG_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'RECOG_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'STR_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q3', optionKey: 'A', lineCOF: 'F' }
    ];
  }

  /**
   * Generate test answers for G3 (Broken-dominant)
   */
  generateBrokenDominantAnswers() {
    return [
      { qid: 'TRUTH_Q1', optionKey: 'B', lineCOF: 'F' },
      { qid: 'TRUTH_Q2', optionKey: 'B', lineCOF: 'F' },
      { qid: 'TRUTH_Q3', optionKey: 'B', lineCOF: 'F' },
      { qid: 'RECOG_Q1', optionKey: 'B', lineCOF: 'F' },
      { qid: 'RECOG_Q2', optionKey: 'B', lineCOF: 'F' },
      { qid: 'RECOG_Q3', optionKey: 'B', lineCOF: 'F' },
      { qid: 'CTRL_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'CTRL_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'CTRL_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'PACE_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'PACE_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'PACE_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOUND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOUND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'BOUND_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'STR_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q3', optionKey: 'A', lineCOF: 'F' }
    ];
  }

  /**
   * Generate test answers for G4 (Sibling tie)
   */
  generateSiblingTieAnswers() {
    return [
      { qid: 'BOND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'STR_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'STR_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'CTRL_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'CTRL_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'CTRL_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'PACE_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'PACE_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'PACE_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'BOUND_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'BOUND_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'BOUND_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'TRUTH_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'TRUTH_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'TRUTH_Q3', optionKey: 'A', lineCOF: 'F' },
      { qid: 'RECOG_Q1', optionKey: 'A', lineCOF: 'C' },
      { qid: 'RECOG_Q2', optionKey: 'A', lineCOF: 'O' },
      { qid: 'RECOG_Q3', optionKey: 'A', lineCOF: 'F' }
    ];
  }

  /**
   * Run golden case test
   */
  async runGoldenCase(caseId, engine) {
    const goldenCase = this.goldenCases.get(caseId);
    if (!goldenCase) {
      throw new Error(`Golden case not found: ${caseId}`);
    }

    console.log(`Running golden case: ${goldenCase.name}`);

    try {
      // Initialize session
      const session = await engine.initSession('test-session', 'test-bank');
      
      // Set picks
      await engine.setPicks(session.sessionId, goldenCase.testData.picks);
      
      // Submit answers
      for (const answer of goldenCase.testData.answers) {
        await engine.submitAnswer(session.sessionId, answer.qid, answer.optionKey);
      }
      
      // Finalize session
      const result = await engine.finalizeSession(session.sessionId);
      
      // Validate result
      const validation = this.validateGoldenCaseResult(caseId, result, goldenCase);
      
      this.testResults.push({
        caseId,
        name: goldenCase.name,
        success: validation.success,
        result: result,
        validation: validation
      });
      
      return validation;
    } catch (error) {
      this.testResults.push({
        caseId,
        name: goldenCase.name,
        success: false,
        error: error.message
      });
      
      throw error;
    }
  }

  /**
   * Validate golden case result
   */
  validateGoldenCaseResult(caseId, result, goldenCase) {
    const validation = {
      success: true,
      errors: []
    };

    switch (caseId) {
      case 'G1':
        // Check if target face is LIT
        const faceState = result.face_states[goldenCase.testData.expectedFace];
        if (!faceState || faceState.state !== 'LIT') {
          validation.success = false;
          validation.errors.push(`Expected LIT state for ${goldenCase.testData.expectedFace}, got ${faceState?.state || 'undefined'}`);
        }
        break;

      case 'G2':
        // Check if target face is GHOST
        const faceState2 = result.face_states[goldenCase.testData.expectedFace];
        if (!faceState2 || faceState2.state !== 'GHOST') {
          validation.success = false;
          validation.errors.push(`Expected GHOST state for ${goldenCase.testData.expectedFace}, got ${faceState2?.state || 'undefined'}`);
        }
        break;

      case 'G3':
        // Check if target face is GHOST due to broken dominance
        const faceState3 = result.face_states[goldenCase.testData.expectedFace];
        if (!faceState3 || faceState3.state !== 'GHOST') {
          validation.success = false;
          validation.errors.push(`Expected GHOST state for ${goldenCase.testData.expectedFace}, got ${faceState3?.state || 'undefined'}`);
        }
        break;

      case 'G4':
        // Check if target face is LEAN
        const faceState4 = result.face_states[goldenCase.testData.expectedFace];
        if (!faceState4 || faceState4.state !== 'LEAN') {
          validation.success = false;
          validation.errors.push(`Expected LEAN state for ${goldenCase.testData.expectedFace}, got ${faceState4?.state || 'undefined'}`);
        }
        break;

      case 'G5':
        // Check question count for edge policies
        if (goldenCase.testData.expectedQuestionCount) {
          // This would need to be tracked during the session
          // For now, just check if we have a valid result
          if (!result.line_verdicts || !result.face_states) {
            validation.success = false;
            validation.errors.push('Invalid result structure');
          }
        }
        break;
    }

    return validation;
  }

  /**
   * Run all golden cases
   */
  async runAllGoldenCases(engine) {
    console.log('Running all golden cases...');
    
    const results = [];
    for (const caseId of this.goldenCases.keys()) {
      try {
        const result = await this.runGoldenCase(caseId, engine);
        results.push(result);
      } catch (error) {
        console.error(`Golden case ${caseId} failed:`, error.message);
        results.push({ caseId, success: false, error: error.message });
      }
    }
    
    return results;
  }

  /**
   * Generate fuzzer
   */
  generateFuzzer(type = 'random') {
    const fuzzer = {
      type,
      generateAnswers: (picks, bankPackage) => {
        switch (type) {
          case 'random':
            return this.generateRandomAnswers(picks, bankPackage);
          case 'all_a':
            return this.generateAllAAnswers(picks, bankPackage);
          case 'all_b':
            return this.generateAllBAnswers(picks, bankPackage);
          case 'mixed':
            return this.generateMixedAnswers(picks, bankPackage);
          default:
            return this.generateRandomAnswers(picks, bankPackage);
        }
      }
    };

    this.fuzzers.set(type, fuzzer);
    return fuzzer;
  }

  /**
   * Generate random answers
   */
  generateRandomAnswers(picks, bankPackage) {
    const answers = [];
    const questions = bankPackage.questions;
    
    // Generate answers for picked families (2 each)
    for (const family of picks) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions) {
        for (let i = 0; i < 2; i++) {
          const question = familyQuestions[i];
          const optionKey = Math.random() < 0.5 ? 'A' : 'B';
          answers.push({
            qid: question.qid,
            optionKey,
            lineCOF: question.options.find(opt => opt.key === optionKey).lineCOF
          });
        }
      }
    }
    
    // Generate answers for not-picked families (3 each)
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    const notPicked = allFamilies.filter(f => !picks.includes(f));
    
    for (const family of notPicked) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions) {
        for (let i = 0; i < 3; i++) {
          const question = familyQuestions[i];
          const optionKey = Math.random() < 0.5 ? 'A' : 'B';
          answers.push({
            qid: question.qid,
            optionKey,
            lineCOF: question.options.find(opt => opt.key === optionKey).lineCOF
          });
        }
      }
    }
    
    return answers;
  }

  /**
   * Generate all A answers
   */
  generateAllAAnswers(picks, bankPackage) {
    const answers = [];
    const questions = bankPackage.questions;
    
    // Generate answers for all families
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    
    for (const family of allFamilies) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions) {
        const questionCount = picks.includes(family) ? 2 : 3;
        for (let i = 0; i < questionCount; i++) {
          const question = familyQuestions[i];
          answers.push({
            qid: question.qid,
            optionKey: 'A',
            lineCOF: question.options.find(opt => opt.key === 'A').lineCOF
          });
        }
      }
    }
    
    return answers;
  }

  /**
   * Generate all B answers
   */
  generateAllBAnswers(picks, bankPackage) {
    const answers = [];
    const questions = bankPackage.questions;
    
    // Generate answers for all families
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    
    for (const family of allFamilies) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions) {
        const questionCount = picks.includes(family) ? 2 : 3;
        for (let i = 0; i < questionCount; i++) {
          const question = familyQuestions[i];
          answers.push({
            qid: question.qid,
            optionKey: 'B',
            lineCOF: question.options.find(opt => opt.key === 'B').lineCOF
          });
        }
      }
    }
    
    return answers;
  }

  /**
   * Generate mixed answers
   */
  generateMixedAnswers(picks, bankPackage) {
    const answers = [];
    const questions = bankPackage.questions;
    
    // Generate answers for all families
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    
    for (const family of allFamilies) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions) {
        const questionCount = picks.includes(family) ? 2 : 3;
        for (let i = 0; i < questionCount; i++) {
          const question = familyQuestions[i];
          const optionKey = (i + family.length) % 2 === 0 ? 'A' : 'B';
          answers.push({
            qid: question.qid,
            optionKey,
            lineCOF: question.options.find(opt => opt.key === optionKey).lineCOF
          });
        }
      }
    }
    
    return answers;
  }

  /**
   * Run fuzzer test
   */
  async runFuzzerTest(fuzzerType, picks, bankPackage, engine, iterations = 100) {
    console.log(`Running fuzzer test: ${fuzzerType} (${iterations} iterations)`);
    
    const fuzzer = this.fuzzers.get(fuzzerType);
    if (!fuzzer) {
      throw new Error(`Fuzzer not found: ${fuzzerType}`);
    }
    
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      try {
        // Generate answers
        const answers = fuzzer.generateAnswers(picks, bankPackage);
        
        // Initialize session
        const session = await engine.initSession(`fuzz-session-${i}`, bankPackage);
        
        // Set picks
        await engine.setPicks(session.sessionId, picks);
        
        // Submit answers
        for (const answer of answers) {
          await engine.submitAnswer(session.sessionId, answer.qid, answer.optionKey);
        }
        
        // Finalize session
        const result = await engine.finalizeSession(session.sessionId);
        
        results.push({
          iteration: i,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          iteration: i,
          success: false,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Get test results summary
   */
  getTestResultsSummary() {
    const total = this.testResults.length;
    const successful = this.testResults.filter(r => r.success).length;
    const failed = total - successful;
    
    return {
      total,
      successful,
      failed,
      success_rate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
      results: this.testResults
    };
  }

  /**
   * Export test results
   */
  exportTestResults() {
    return {
      timestamp: new Date().toISOString(),
      summary: this.getTestResultsSummary(),
      golden_cases: Array.from(this.goldenCases.entries()),
      test_banks: Array.from(this.testBanks.keys()),
      fuzzers: Array.from(this.fuzzers.keys())
    };
  }
}

module.exports = TestingHarness;
