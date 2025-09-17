/**
 * Security & Validation
 * 
 * Provides security measures and validation for bank inputs and API calls.
 * Treats bank inputs as untrusted and enforces security constraints.
 */

const crypto = require('crypto');

class SecurityManager {
  constructor() {
    this.validationRules = new Map();
    this.securityPolicies = new Map();
    this.auditLog = [];
    this.rateLimiters = new Map();
  }

  /**
   * Initialize security policies
   */
  initializeSecurityPolicies() {
    // Bank validation rules
    this.validationRules.set('bank_package', {
      required_fields: ['meta', 'registries', 'questions'],
      meta_required: ['bank_id', 'bank_hash_sha256', 'version', 'signature'],
      max_questions_per_family: 3,
      max_options_per_question: 2,
      max_tells_per_option: 3,
      max_tells_per_face_per_option: 1
    });

    // API security policies
    this.securityPolicies.set('api_auth', {
      require_token: true,
      token_validation: true,
      rate_limiting: true,
      input_validation: true
    });

    // Input validation rules
    this.validationRules.set('session_input', {
      session_id_pattern: /^[a-f0-9-]{36}$/,
      qid_pattern: /^[A-Z_]+_Q[1-3]$/,
      option_key_pattern: /^[AB]$/,
      linecof_pattern: /^[COF]$/,
      face_id_pattern: /^FACE\/[A-Za-z]+\/[A-Za-z]+$/,
      tell_id_pattern: /^TELL\/[A-Za-z]+\/[A-Za-z]+\/[a-z-]+$/
    });

    console.log('Security policies initialized');
  }

  /**
   * Validate bank package security
   */
  validateBankPackageSecurity(bankPackage) {
    const errors = [];
    const warnings = [];

    // Check required fields
    const requiredFields = this.validationRules.get('bank_package').required_fields;
    for (const field of requiredFields) {
      if (!bankPackage[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Check meta fields
    if (bankPackage.meta) {
      const metaRequired = this.validationRules.get('bank_package').meta_required;
      for (const field of metaRequired) {
        if (!bankPackage.meta[field]) {
          errors.push(`Missing required meta field: ${field}`);
        }
      }

      // Validate bank ID format
      if (bankPackage.meta.bank_id && !this.isValidBankId(bankPackage.meta.bank_id)) {
        errors.push('Invalid bank ID format');
      }

      // Validate hash format
      if (bankPackage.meta.bank_hash_sha256 && !this.isValidHash(bankPackage.meta.bank_hash_sha256)) {
        errors.push('Invalid bank hash format');
      }
    }

    // Validate questions structure
    if (bankPackage.questions) {
      const questionErrors = this.validateQuestionsStructure(bankPackage.questions);
      errors.push(...questionErrors);
    }

    // Validate registries
    if (bankPackage.registries) {
      const registryErrors = this.validateRegistries(bankPackage.registries);
      errors.push(...registryErrors);
    }

    // Check for suspicious content
    const suspiciousContent = this.detectSuspiciousContent(bankPackage);
    warnings.push(...suspiciousContent);

    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }

  /**
   * Validate questions structure
   */
  validateQuestionsStructure(questions) {
    const errors = [];
    const rules = this.validationRules.get('bank_package');

    for (const [family, familyQuestions] of Object.entries(questions)) {
      // Check question count
      if (familyQuestions.length > rules.max_questions_per_family) {
        errors.push(`Family ${family} has too many questions: ${familyQuestions.length}`);
      }

      for (const question of familyQuestions) {
        // Validate QID format
        if (!this.isValidQid(question.qid)) {
          errors.push(`Invalid QID format: ${question.qid}`);
        }

        // Check options count
        if (question.options.length !== rules.max_options_per_question) {
          errors.push(`Question ${question.qid} has invalid options count: ${question.options.length}`);
        }

        for (const option of question.options) {
          // Validate option key
          if (!this.isValidOptionKey(option.key)) {
            errors.push(`Invalid option key: ${option.key}`);
          }

          // Validate lineCOF
          if (!this.isValidLineCOF(option.lineCOF)) {
            errors.push(`Invalid lineCOF: ${option.lineCOF}`);
          }

          // Validate tells
          if (option.tells) {
            if (option.tells.length > rules.max_tells_per_option) {
              errors.push(`Option ${option.key} in ${question.qid} has too many tells: ${option.tells.length}`);
            }

            // Check for duplicate faces in same option
            const faceIds = option.tells.map(tell => tell.face_id);
            const uniqueFaceIds = new Set(faceIds);
            if (faceIds.length !== uniqueFaceIds.size) {
              errors.push(`Option ${option.key} in ${question.qid} has duplicate faces`);
            }

            for (const tell of option.tells) {
              if (!this.isValidFaceId(tell.face_id)) {
                errors.push(`Invalid face ID: ${tell.face_id}`);
              }

              if (!this.isValidTellId(tell.tell_id)) {
                errors.push(`Invalid tell ID: ${tell.tell_id}`);
              }
            }
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate registries
   */
  validateRegistries(registries) {
    const errors = [];

    // Validate families registry
    if (registries.families) {
      for (const family of registries.families) {
        if (!family.id || !family.name) {
          errors.push('Family registry entry missing required fields');
        }
      }
    }

    // Validate faces registry
    if (registries.faces) {
      for (const face of registries.faces) {
        if (!face.id || !face.family) {
          errors.push('Face registry entry missing required fields');
        }

        if (!this.isValidFaceId(face.id)) {
          errors.push(`Invalid face ID in registry: ${face.id}`);
        }
      }
    }

    // Validate tells registry
    if (registries.tells) {
      for (const tell of registries.tells) {
        if (!tell.id || !tell.face_id) {
          errors.push('Tell registry entry missing required fields');
        }

        if (!this.isValidTellId(tell.id)) {
          errors.push(`Invalid tell ID in registry: ${tell.id}`);
        }

        if (!this.isValidFaceId(tell.face_id)) {
          errors.push(`Invalid face ID in tell registry: ${tell.face_id}`);
        }
      }
    }

    return errors;
  }

  /**
   * Detect suspicious content
   */
  detectSuspiciousContent(bankPackage) {
    const warnings = [];
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /eval\s*\(/i,
      /function\s*\(/i
    ];

    const content = JSON.stringify(bankPackage);
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(content)) {
        warnings.push(`Suspicious content detected: ${pattern.source}`);
      }
    }

    return warnings;
  }

  /**
   * Validate API input
   */
  validateAPIInput(input, inputType) {
    const errors = [];
    const rules = this.validationRules.get('session_input');

    switch (inputType) {
      case 'session_id':
        if (!rules.session_id_pattern.test(input)) {
          errors.push('Invalid session ID format');
        }
        break;

      case 'qid':
        if (!rules.qid_pattern.test(input)) {
          errors.push('Invalid QID format');
        }
        break;

      case 'option_key':
        if (!rules.option_key_pattern.test(input)) {
          errors.push('Invalid option key format');
        }
        break;

      case 'linecof':
        if (!rules.linecof_pattern.test(input)) {
          errors.push('Invalid lineCOF format');
        }
        break;

      case 'face_id':
        if (!rules.face_id_pattern.test(input)) {
          errors.push('Invalid face ID format');
        }
        break;

      case 'tell_id':
        if (!rules.tell_id_pattern.test(input)) {
          errors.push('Invalid tell ID format');
        }
        break;

      default:
        errors.push(`Unknown input type: ${inputType}`);
    }

    return errors;
  }

  /**
   * Validate session state
   */
  validateSessionState(session) {
    const errors = [];

    // Check required fields
    if (!session.sessionId) {
      errors.push('Session missing sessionId');
    }

    if (!session.status) {
      errors.push('Session missing status');
    }

    // Validate session ID format
    if (session.sessionId && !this.isValidSessionId(session.sessionId)) {
      errors.push('Invalid session ID format');
    }

    // Validate status
    const validStatuses = ['INIT', 'PICKED', 'IN_PROGRESS', 'PAUSED', 'FINALIZING', 'FINALIZED', 'ABORTED'];
    if (session.status && !validStatuses.includes(session.status)) {
      errors.push(`Invalid session status: ${session.status}`);
    }

    // Validate picks
    if (session.picks) {
      if (!Array.isArray(session.picks)) {
        errors.push('Picks must be an array');
      } else if (session.picks.length < 1 || session.picks.length > 7) {
        errors.push('Picks must be between 1 and 7');
      }
    }

    return errors;
  }

  /**
   * Validate answer event
   */
  validateAnswerEvent(answerEvent) {
    const errors = [];

    // Check required fields
    const requiredFields = ['qid', 'familyScreen', 'pickedKey', 'lineCOF'];
    for (const field of requiredFields) {
      if (!answerEvent[field]) {
        errors.push(`Answer event missing required field: ${field}`);
      }
    }

    // Validate field formats
    if (answerEvent.qid && !this.isValidQid(answerEvent.qid)) {
      errors.push('Invalid QID format in answer event');
    }

    if (answerEvent.pickedKey && !this.isValidOptionKey(answerEvent.pickedKey)) {
      errors.push('Invalid picked key format in answer event');
    }

    if (answerEvent.lineCOF && !this.isValidLineCOF(answerEvent.lineCOF)) {
      errors.push('Invalid lineCOF format in answer event');
    }

    // Validate tells
    if (answerEvent.tells) {
      if (!Array.isArray(answerEvent.tells)) {
        errors.push('Tells must be an array');
      } else {
        for (const tell of answerEvent.tells) {
          if (!this.isValidFaceId(tell.face_id)) {
            errors.push(`Invalid face ID in tell: ${tell.face_id}`);
          }

          if (!this.isValidTellId(tell.tell_id)) {
            errors.push(`Invalid tell ID in tell: ${tell.tell_id}`);
          }
        }
      }
    }

    return errors;
  }

  /**
   * Validate API token
   */
  validateAPIToken(token) {
    if (!token) {
      return { valid: false, error: 'Missing API token' };
    }

    // Basic token format validation
    if (typeof token !== 'string' || token.length < 32) {
      return { valid: false, error: 'Invalid token format' };
    }

    // Additional token validation would go here
    // For now, just check basic format
    return { valid: true };
  }

  /**
   * Check rate limits
   */
  checkRateLimit(identifier, limitType = 'per_session') {
    const now = Date.now();
    const windowMs = 60000; // 1 minute
    const maxCalls = limitType === 'per_session' ? 120 : 600;

    if (!this.rateLimiters.has(identifier)) {
      this.rateLimiters.set(identifier, {
        calls: [],
        lastReset: now
      });
    }

    const limiter = this.rateLimiters.get(identifier);
    
    // Reset if window has passed
    if (now - limiter.lastReset > windowMs) {
      limiter.calls = [];
      limiter.lastReset = now;
    }

    // Check if limit exceeded
    if (limiter.calls.length >= maxCalls) {
      return {
        allowed: false,
        resetTime: limiter.lastReset + windowMs,
        remaining: 0
      };
    }

    // Add current call
    limiter.calls.push(now);

    return {
      allowed: true,
      resetTime: limiter.lastReset + windowMs,
      remaining: maxCalls - limiter.calls.length
    };
  }

  /**
   * Log security event
   */
  logSecurityEvent(eventType, details) {
    const event = {
      timestamp: new Date().toISOString(),
      type: eventType,
      details: details
    };

    this.auditLog.push(event);

    // Keep only last 1000 events
    if (this.auditLog.length > 1000) {
      this.auditLog = this.auditLog.slice(-1000);
    }

    console.log(`Security event: ${eventType}`, details);
  }

  /**
   * Get security audit log
   */
  getAuditLog(limit = 100) {
    return this.auditLog.slice(-limit);
  }

  /**
   * Validate input sanitization
   */
  sanitizeInput(input) {
    if (typeof input !== 'string') {
      return input;
    }

    // Remove potentially dangerous characters
    return input
      .replace(/[<>]/g, '') // Remove angle brackets
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Validate bank signature
   */
  validateBankSignature(bankPackage, publicKey) {
    if (!bankPackage.meta.signature) {
      return { valid: false, error: 'No signature found' };
    }

    try {
      // This would implement actual signature validation
      // For now, just check if signature exists
      const signature = bankPackage.meta.signature;
      
      if (typeof signature !== 'string' || signature.length < 64) {
        return { valid: false, error: 'Invalid signature format' };
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Generate security report
   */
  generateSecurityReport() {
    const report = {
      timestamp: new Date().toISOString(),
      validation_rules: Object.fromEntries(this.validationRules),
      security_policies: Object.fromEntries(this.securityPolicies),
      audit_log_count: this.auditLog.length,
      rate_limiters_count: this.rateLimiters.size,
      recent_events: this.auditLog.slice(-10)
    };

    return report;
  }

  // Validation helper methods
  isValidBankId(bankId) {
    return typeof bankId === 'string' && /^pff\.v\d+\.\d+$/.test(bankId);
  }

  isValidHash(hash) {
    return typeof hash === 'string' && /^[a-f0-9]{64}$/.test(hash);
  }

  isValidSessionId(sessionId) {
    return typeof sessionId === 'string' && /^[a-f0-9-]{36}$/.test(sessionId);
  }

  isValidQid(qid) {
    return typeof qid === 'string' && /^[A-Z_]+_Q[1-3]$/.test(qid);
  }

  isValidOptionKey(optionKey) {
    return typeof optionKey === 'string' && /^[AB]$/.test(optionKey);
  }

  isValidLineCOF(lineCOF) {
    return typeof lineCOF === 'string' && /^[COF]$/.test(lineCOF);
  }

  isValidFaceId(faceId) {
    return typeof faceId === 'string' && /^FACE\/[A-Za-z]+\/[A-Za-z]+$/.test(faceId);
  }

  isValidTellId(tellId) {
    return typeof tellId === 'string' && /^TELL\/[A-Za-z]+\/[A-Za-z]+\/[a-z-]+$/.test(tellId);
  }
}

module.exports = SecurityManager;
