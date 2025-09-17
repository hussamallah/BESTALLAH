/**
 * i18n Resource Keys
 * 
 * Engine stores only IDs. UI resolves text via i18n maps.
 * No i18n logic in engine; it's string-blind.
 */

class I18nKeyManager {
  constructor() {
    this.questionKeys = new Map();
    this.optionKeys = new Map();
    this.tellKeys = new Map();
    this.faceKeys = new Map();
    this.familyKeys = new Map();
  }

  /**
   * Load i18n keys from bank package
   */
  loadI18nKeys(bankPackage) {
    if (!bankPackage.i18n) {
      console.warn('No i18n keys found in bank package');
      return;
    }

    // Load question keys
    if (bankPackage.i18n.questions) {
      for (const key of bankPackage.i18n.questions) {
        this.questionKeys.set(key.qid, key.stem_key);
      }
    }

    // Load option keys
    if (bankPackage.i18n.options) {
      for (const key of bankPackage.i18n.options) {
        const keyId = `${key.qid}:${key.key}`;
        this.optionKeys.set(keyId, key.text_key);
      }
    }

    // Load tell keys
    if (bankPackage.i18n.tells) {
      for (const key of bankPackage.i18n.tells) {
        this.tellKeys.set(key.tell_id, key.text_key);
      }
    }

    // Load face keys
    if (bankPackage.i18n.faces) {
      for (const key of bankPackage.i18n.faces) {
        this.faceKeys.set(key.face_id, key.text_key);
      }
    }

    // Load family keys
    if (bankPackage.i18n.families) {
      for (const key of bankPackage.i18n.families) {
        this.familyKeys.set(key.family_id, key.text_key);
      }
    }

    console.log(`Loaded i18n keys: ${this.questionKeys.size} questions, ${this.optionKeys.size} options, ${this.tellKeys.size} tells`);
  }

  /**
   * Get question stem key
   */
  getQuestionStemKey(qid) {
    return this.questionKeys.get(qid) || `stem.${qid.toLowerCase()}`;
  }

  /**
   * Get option text key
   */
  getOptionTextKey(qid, optionKey) {
    const keyId = `${qid}:${optionKey}`;
    return this.optionKeys.get(keyId) || `opt.${qid.toLowerCase()}.${optionKey.toLowerCase()}`;
  }

  /**
   * Get tell text key
   */
  getTellTextKey(tellId) {
    return this.tellKeys.get(tellId) || `tell.${tellId.toLowerCase().replace(/[\/:]/g, '.')}`;
  }

  /**
   * Get face text key
   */
  getFaceTextKey(faceId) {
    return this.faceKeys.get(faceId) || `face.${faceId.toLowerCase().replace(/[\/:]/g, '.')}`;
  }

  /**
   * Get family text key
   */
  getFamilyTextKey(familyId) {
    return this.familyKeys.get(familyId) || `family.${familyId.toLowerCase().replace(/[\/:]/g, '.')}`;
  }

  /**
   * Generate i18n keys for a question
   */
  generateQuestionKeys(question) {
    const keys = {
      qid: question.qid,
      stem_key: this.getQuestionStemKey(question.qid),
      options: []
    };

    for (const option of question.options) {
      keys.options.push({
        key: option.key,
        text_key: this.getOptionTextKey(question.qid, option.key)
      });
    }

    return keys;
  }

  /**
   * Generate i18n keys for all questions in a bank
   */
  generateAllQuestionKeys(questionsByFamily) {
    const keys = {
      schema: 'i18n_keys.v1',
      questions: [],
      options: [],
      tells: [],
      faces: [],
      families: []
    };

    // Generate question and option keys
    for (const [family, questions] of Object.entries(questionsByFamily)) {
      for (const question of questions) {
        keys.questions.push({
          qid: question.qid,
          stem_key: this.getQuestionStemKey(question.qid)
        });

        for (const option of question.options) {
          keys.options.push({
            qid: question.qid,
            key: option.key,
            text_key: this.getOptionTextKey(question.qid, option.key)
          });

          // Generate tell keys
          if (option.tells) {
            for (const tell of option.tells) {
              keys.tells.push({
                tell_id: tell.tell_id,
                text_key: this.getTellTextKey(tell.tell_id)
              });
            }
          }
        }
      }
    }

    return keys;
  }

  /**
   * Generate i18n keys for faces
   */
  generateFaceKeys(faces) {
    const keys = [];
    
    for (const face of faces) {
      keys.push({
        face_id: face.id,
        text_key: this.getFaceTextKey(face.id)
      });
    }

    return keys;
  }

  /**
   * Generate i18n keys for families
   */
  generateFamilyKeys(families) {
    const keys = [];
    
    for (const family of families) {
      keys.push({
        family_id: family.id,
        text_key: this.getFamilyTextKey(family.id)
      });
    }

    return keys;
  }

  /**
   * Generate complete i18n key set
   */
  generateCompleteI18nKeys(bankPackage) {
    const keys = {
      schema: 'i18n_keys.v1',
      bank_id: bankPackage.meta.bank_id,
      version: bankPackage.meta.version,
      generated_at: new Date().toISOString(),
      questions: [],
      options: [],
      tells: [],
      faces: [],
      families: []
    };

    // Generate question and option keys
    for (const [family, questions] of Object.entries(bankPackage.questions)) {
      for (const question of questions) {
        keys.questions.push({
          qid: question.qid,
          stem_key: this.getQuestionStemKey(question.qid)
        });

        for (const option of question.options) {
          keys.options.push({
            qid: question.qid,
            key: option.key,
            text_key: this.getOptionTextKey(question.qid, option.key)
          });

          // Generate tell keys
          if (option.tells) {
            for (const tell of option.tells) {
              keys.tells.push({
                tell_id: tell.tell_id,
                text_key: this.getTellTextKey(tell.tell_id)
              });
            }
          }
        }
      }
    }

    // Generate face keys
    if (bankPackage.registries.faces) {
      keys.faces = this.generateFaceKeys(bankPackage.registries.faces);
    }

    // Generate family keys
    if (bankPackage.registries.families) {
      keys.families = this.generateFamilyKeys(bankPackage.registries.families);
    }

    return keys;
  }

  /**
   * Validate i18n keys completeness
   */
  validateI18nKeys(bankPackage) {
    const issues = [];
    const missingKeys = [];

    // Check question keys
    for (const [family, questions] of Object.entries(bankPackage.questions)) {
      for (const question of questions) {
        const stemKey = this.getQuestionStemKey(question.qid);
        if (stemKey.startsWith('stem.')) {
          missingKeys.push(`Question stem: ${question.qid}`);
        }

        for (const option of question.options) {
          const optionKey = this.getOptionTextKey(question.qid, option.key);
          if (optionKey.startsWith('opt.')) {
            missingKeys.push(`Option text: ${question.qid}:${option.key}`);
          }

          if (option.tells) {
            for (const tell of option.tells) {
              const tellKey = this.getTellTextKey(tell.tell_id);
              if (tellKey.startsWith('tell.')) {
                missingKeys.push(`Tell text: ${tell.tell_id}`);
              }
            }
          }
        }
      }
    }

    if (missingKeys.length > 0) {
      issues.push({
        type: 'missing_keys',
        count: missingKeys.length,
        keys: missingKeys
      });
    }

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Export i18n keys to file
   */
  exportI18nKeys(bankPackage, outputPath) {
    const keys = this.generateCompleteI18nKeys(bankPackage);
    const fs = require('fs');
    
    fs.writeFileSync(outputPath, JSON.stringify(keys, null, 2));
    console.log(`Exported i18n keys to: ${outputPath}`);
  }

  /**
   * Generate i18n template for a new bank
   */
  generateI18nTemplate(bankPackage) {
    const template = {
      schema: 'i18n_keys.v1',
      bank_id: bankPackage.meta.bank_id,
      version: bankPackage.meta.version,
      generated_at: new Date().toISOString(),
      questions: [],
      options: [],
      tells: [],
      faces: [],
      families: []
    };

    // Generate template for questions
    for (const [family, questions] of Object.entries(bankPackage.questions)) {
      for (const question of questions) {
        template.questions.push({
          qid: question.qid,
          stem_key: `stem.${question.qid.toLowerCase()}`,
          comment: `Question stem for ${question.qid}`
        });

        for (const option of question.options) {
          template.options.push({
            qid: question.qid,
            key: option.key,
            text_key: `opt.${question.qid.toLowerCase()}.${option.key.toLowerCase()}`,
            comment: `Option ${option.key} text for ${question.qid}`
          });

          if (option.tells) {
            for (const tell of option.tells) {
              template.tells.push({
                tell_id: tell.tell_id,
                text_key: `tell.${tell.tell_id.toLowerCase().replace(/[\/:]/g, '.')}`,
                comment: `Tell text for ${tell.tell_id}`
              });
            }
          }
        }
      }
    }

    // Generate template for faces
    if (bankPackage.registries.faces) {
      for (const face of bankPackage.registries.faces) {
        template.faces.push({
          face_id: face.id,
          text_key: `face.${face.id.toLowerCase().replace(/[\/:]/g, '.')}`,
          comment: `Face name for ${face.id}`
        });
      }
    }

    // Generate template for families
    if (bankPackage.registries.families) {
      for (const family of bankPackage.registries.families) {
        template.families.push({
          family_id: family.id,
          text_key: `family.${family.id.toLowerCase().replace(/[\/:]/g, '.')}`,
          comment: `Family name for ${family.id}`
        });
      }
    }

    return template;
  }

  /**
   * Get all loaded keys
   */
  getAllKeys() {
    return {
      questions: Array.from(this.questionKeys.entries()),
      options: Array.from(this.optionKeys.entries()),
      tells: Array.from(this.tellKeys.entries()),
      faces: Array.from(this.faceKeys.entries()),
      families: Array.from(this.familyKeys.entries())
    };
  }

  /**
   * Clear all keys
   */
  clear() {
    this.questionKeys.clear();
    this.optionKeys.clear();
    this.tellKeys.clear();
    this.faceKeys.clear();
    this.familyKeys.clear();
  }
}

module.exports = I18nKeyManager;
