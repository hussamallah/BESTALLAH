/**
 * Bank Loader - Single source of truth for bank data
 * Loads bank_package.json and builds fast indices for engine
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const bankStorage = require('./bankStorage');

class BankLoader {
  constructor() {
    this.bankPackage = null;
    this.indices = {
      byQid: new Map(),
      questionsByFamily: new Map(),
      tellsByOption: new Map(),
      faceMeta: new Map(),
      contrastIndex: new Map()
    };
    this.constants = null;
  }

  /**
   * Load bank package and build indices
   * @param {string} bankPath - Path to bank_package.json
   */
  loadBank(bankPath) {
    try {
      // Load bank package through immutable storage
      this.bankPackage = bankStorage.loadBank(bankPath);

      // Load constants profile
      const constantsProfile = this.bankPackage.meta.constants_profile;
      this.constants = this.bankPackage.constants.profiles[constantsProfile];
      if (!this.constants) {
        throw new Error(`Constants profile ${constantsProfile} not found`);
      }

      // Build indices
      this._buildIndices();

      // Validate bank structure
      this._validateBank();

      console.log('✅ Bank validation passed');
      console.log('✅ Bank loaded successfully');
      console.log(`📊 Bank hash: ${this.getBankHash()}`);
      console.log(`⚙️ Constants profile: ${this.getConstantsProfile()}`);

    } catch (error) {
      throw new Error(`Failed to load bank: ${error.message}`);
    }
  }

  /**
   * Build fast lookup indices
   */
  _buildIndices() {
    const { questions, registries } = this.bankPackage;

    // Build byQid index
    Object.entries(questions).forEach(([family, familyData]) => {
      familyData.questions.forEach((question, qIndex) => {
        this.indices.byQid.set(question.qid, {
          family: familyData.family,
          qIndex: qIndex + 1,
          mask: this._getMask(qIndex),
          options: question.options
        });
      });
    });

    // Build questionsByFamily index
    Object.entries(questions).forEach(([family, familyData]) => {
      this.indices.questionsByFamily.set(familyData.family, familyData.questions);
    });

    // Build faceMeta index
    registries.faces.faces.forEach(face => {
      this.indices.faceMeta.set(face.id, {
        family: face.family
      });
    });

    // Build tell metadata index for Batch 3 taxonomy
    this.indices.tellMeta = new Map();
    registries.tells.tells.forEach(tell => {
      this.indices.tellMeta.set(tell.id, {
        face_id: tell.face_id,
        contrast: tell.contrast || false,
        explicit: tell.explicit || false,
        priority: tell.priority || 999
      });
    });

    // Build tellsByOption index with Batch 3 tell taxonomy
    Object.entries(questions).forEach(([family, familyData]) => {
      familyData.questions.forEach(question => {
        question.options.forEach(option => {
          const key = `${question.qid}#${option.id}`;
          const processedTells = this._processTellsForOption(option.tells || [], familyData.family);
          this.indices.tellsByOption.set(key, processedTells);
        });
      });
    });

    // Build tell groups index
    this.indices.tellGroups = new Map();
    if (registries.tell_groups) {
      registries.tell_groups.groups.forEach(group => {
        this.indices.tellGroups.set(group.group_id, {
          face_id: group.face_id,
          tells: group.tells
        });
      });
    }

    // Build contrastIndex
    registries.contrast_matrix.pairs.forEach(pair => {
      // Add contrast tells for face A
      pair.a_contrast_tells.forEach(tellId => {
        if (!this.indices.contrastIndex.has(pair.a)) {
          this.indices.contrastIndex.set(pair.a, new Set());
        }
        this.indices.contrastIndex.get(pair.a).add(tellId);
      });

      // Add contrast tells for face B
      pair.b_contrast_tells.forEach(tellId => {
        if (!this.indices.contrastIndex.has(pair.b)) {
          this.indices.contrastIndex.set(pair.b, new Set());
        }
        this.indices.contrastIndex.get(pair.b).add(tellId);
      });
    });
  }

  /**
   * Process tells for option with Batch 3 taxonomy and priority rules
   * @param {Array} tells - Array of tell IDs
   * @param {string} familyScreen - Current family screen
   * @returns {Array} Processed tells with metadata
   */
  _processTellsForOption(tells, familyScreen) {
    if (!tells || tells.length === 0) return [];

    // Apply Batch 3 caps and rules
    const maxTellsPerOption = 3;
    const maxPerFace = 1;

    // Group tells by face and apply per-face cap
    const tellsByFace = new Map();
    tells.forEach(tellId => {
      const tellMeta = this.indices.tellMeta.get(tellId);
      if (!tellMeta) return;

      const faceId = tellMeta.face_id;
      if (!tellsByFace.has(faceId)) {
        tellsByFace.set(faceId, []);
      }
      tellsByFace.get(faceId).push({ tellId, ...tellMeta });
    });

    // Apply per-face cap and collect valid tells
    const validTells = [];
    tellsByFace.forEach((faceTells, faceId) => {
      // Sort by priority (contrast > explicit > priority number)
      faceTells.sort((a, b) => {
        // Contrast tells first
        if (a.contrast && !b.contrast) return -1;
        if (!a.contrast && b.contrast) return 1;
        
        // Then explicit tells
        if (a.explicit && !b.explicit) return -1;
        if (!a.explicit && b.explicit) return 1;
        
        // Then by priority number (lower is better)
        return a.priority - b.priority;
      });

      // Take only the first tell per face (maxPerFace = 1)
      if (faceTells.length > 0) {
        validTells.push(faceTells[0]);
      }
    });

    // Sort all valid tells by priority and take top 3
    validTells.sort((a, b) => {
      // Contrast tells first
      if (a.contrast && !b.contrast) return -1;
      if (!a.contrast && b.contrast) return 1;
      
      // Then explicit tells
      if (a.explicit && !b.explicit) return -1;
      if (!a.explicit && b.explicit) return 1;
      
      // Then by priority number (lower is better)
      return a.priority - b.priority;
    });

    // Return top 3 tells with metadata
    return validTells.slice(0, maxTellsPerOption).map(tell => ({
      tell_id: tell.tellId,
      face_id: tell.face_id,
      contrast: tell.contrast,
      explicit: tell.explicit,
      priority: tell.priority,
      isSignature: this._isSignatureTell(tell.face_id, familyScreen),
      isAdjacent: !this._isSignatureTell(tell.face_id, familyScreen)
    }));
  }

  /**
   * Check if a tell is a signature tell (face in home family)
   * @param {string} faceId - Face ID
   * @param {string} familyScreen - Current family screen
   * @returns {boolean}
   */
  _isSignatureTell(faceId, familyScreen) {
    const faceMeta = this.indices.faceMeta.get(faceId);
    return faceMeta && faceMeta.family === familyScreen;
  }

  /**
   * Get question mask based on index (Q1=CO, Q2=CO, Q3=CF)
   */
  _getMask(qIndex) {
    if (qIndex === 0) return 'CO'; // Q1
    if (qIndex === 1) return 'CO'; // Q2
    if (qIndex === 2) return 'CF'; // Q3
    throw new Error(`Invalid question index: ${qIndex}`);
  }

  /**
   * Validate bank structure
   */
  _validateBank() {
    const { questions, registries } = this.bankPackage;

    // Check 7 families, 3 questions each
    const families = Object.keys(questions);
    if (families.length !== 7) {
      throw new Error(`Expected 7 families, got ${families.length}`);
    }

    // Check each family has 3 questions with correct masks
    families.forEach(family => {
      const familyQuestions = questions[family].questions;
      if (familyQuestions.length !== 3) {
        throw new Error(`Family ${family} has ${familyQuestions.length} questions, expected 3`);
      }

      // Check masks: Q1=CO, Q2=CO, Q3=CF
      familyQuestions.forEach((question, index) => {
        const expectedMask = this._getMask(index);
        const actualMask = this._getActualMask(question);
        if (actualMask !== expectedMask) {
          throw new Error(`Question ${question.qid} has mask ${actualMask}, expected ${expectedMask}`);
        }

        // Check 2 options per question
        if (question.options.length !== 2) {
          throw new Error(`Question ${question.qid} has ${question.options.length} options, expected 2`);
        }

        // Check option letters match mask
        question.options.forEach((option, optIndex) => {
          const expectedLetter = expectedMask[optIndex];
          if (option.lineCOF !== expectedLetter) {
            throw new Error(`Option ${option.id} in ${question.qid} has lineCOF ${option.lineCOF}, expected ${expectedLetter}`);
          }
        });
      });
    });

    // Check all tell_id and face_id exist
    const validTells = new Set(registries.tells.tells.map(t => t.id));
    const validFaces = new Set(registries.faces.faces.map(f => f.id));

    Object.entries(questions).forEach(([family, familyData]) => {
      familyData.questions.forEach(question => {
        question.options.forEach(option => {
          if (option.tells) {
            option.tells.forEach(tellId => {
              if (!validTells.has(tellId)) {
                throw new Error(`Invalid tell_id: ${tellId}`);
              }
            });
          }
        });
      });
    });

    // Check no duplicate qids
    const qids = new Set();
    Object.entries(questions).forEach(([family, familyData]) => {
      familyData.questions.forEach(question => {
        if (qids.has(question.qid)) {
          throw new Error(`Duplicate qid: ${question.qid}`);
        }
        qids.add(question.qid);
      });
    });

    console.log('✅ Bank validation passed');
  }

  /**
   * Get actual mask from question options
   */
  _getActualMask(question) {
    const letters = question.options.map(opt => opt.lineCOF);
    return letters.join('');
  }

  /**
   * Get question data by QID
   */
  getQuestion(qid) {
    return this.indices.byQid.get(qid);
  }

  /**
   * Get tells for a specific option
   */
  getTellsForOption(qid, optionKey) {
    const key = `${qid}#${optionKey}`;
    return this.indices.tellsByOption.get(key) || [];
  }

  /**
   * Get face metadata
   */
  getFaceMeta(faceId) {
    return this.indices.faceMeta.get(faceId);
  }

  /**
   * Check if tell is a contrast tell for face
   */
  isContrastTell(faceId, tellId) {
    const contrastTells = this.indices.contrastIndex.get(faceId);
    return contrastTells ? contrastTells.has(tellId) : false;
  }

  /**
   * Get all questions for a family
   */
  getQuestionsForFamily(family) {
    return this.indices.questionsByFamily.get(family) || [];
  }

  /**
   * Get constants profile
   */
  getConstants() {
    return this.constants;
  }

  /**
   * Get bank hash
   */
  getBankHash() {
    return this.bankPackage.meta.bank_hash_sha256;
  }

  /**
   * Get constants profile name
   */
  getConstantsProfile() {
    return this.bankPackage.meta.constants_profile;
  }

  /**
   * Get bank ID for version binding
   */
  getBankId() {
    return this.bankPackage.meta.bank_id || 'pff.v1.0';
  }

  /**
   * Get tell metadata for Batch 3 taxonomy
   * @param {string} tellId - Tell ID
   * @returns {Object} Tell metadata
   */
  getTellMeta(tellId) {
    return this.indices.tellMeta.get(tellId);
  }

  /**
   * Check if tell is signature (face in home family)
   * @param {string} faceId - Face ID
   * @param {string} familyScreen - Current family screen
   * @returns {boolean}
   */
  isSignatureTell(faceId, familyScreen) {
    return this._isSignatureTell(faceId, familyScreen);
  }

  /**
   * Check if tell is adjacent (face in different family)
   * @param {string} faceId - Face ID
   * @param {string} familyScreen - Current family screen
   * @returns {boolean}
   */
  isAdjacentTell(faceId, familyScreen) {
    return !this._isSignatureTell(faceId, familyScreen);
  }

  /**
   * Get tell groups for a face
   * @param {string} faceId - Face ID
   * @returns {Array} Tell groups
   */
  getTellGroups(faceId) {
    const groups = [];
    this.indices.tellGroups.forEach((group, groupId) => {
      if (group.face_id === faceId) {
        groups.push({
          group_id: groupId,
          tells: group.tells
        });
      }
    });
    return groups;
  }

  /**
   * Check for sibling collision in tells
   * @param {Array} tells - Array of tell objects
   * @returns {boolean}
   */
  hasSiblingCollision(tells) {
    const faces = new Set();
    const families = new Set();
    
    tells.forEach(tell => {
      const faceMeta = this.indices.faceMeta.get(tell.face_id);
      if (faceMeta) {
        faces.add(tell.face_id);
        families.add(faceMeta.family);
      }
    });

    // Check if we have both faces from the same family
    const familyFaceCount = new Map();
    faces.forEach(faceId => {
      const faceMeta = this.indices.faceMeta.get(faceId);
      if (faceMeta) {
        const count = familyFaceCount.get(faceMeta.family) || 0;
        familyFaceCount.set(faceMeta.family, count + 1);
      }
    });

    // If any family has more than 1 face, we have sibling collision
    for (const [family, count] of familyFaceCount) {
      if (count > 1) return true;
    }

    return false;
  }
}

module.exports = BankLoader;
