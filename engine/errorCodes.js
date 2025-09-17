/**
 * Error Codes Registry (expanded)
 * 
 * Comprehensive error code registry for the PFF Quiz Engine.
 * Includes all error codes, warnings, and QA flags as specified in Batch 4.
 */

class ErrorCodesRegistry {
  constructor() {
    this.errorCodes = this.initializeErrorCodes();
    this.warningCodes = this.initializeWarningCodes();
    this.qaFlags = this.initializeQAFlags();
  }

  /**
   * Initialize error codes
   */
  initializeErrorCodes() {
    return {
      // Session errors
      E_INVALID_SESSION_SEED: {
        code: 'E_INVALID_SESSION_SEED',
        message: 'Session seed must be a non-empty string',
        severity: 'error',
        category: 'session',
        http_status: 400
      },
      E_SESSION_NOT_FOUND: {
        code: 'E_SESSION_NOT_FOUND',
        message: 'Session not found',
        severity: 'error',
        category: 'session',
        http_status: 404
      },
      E_SESSION_ALREADY_FINALIZED: {
        code: 'E_SESSION_ALREADY_FINALIZED',
        message: 'Session has already been finalized',
        severity: 'error',
        category: 'session',
        http_status: 409
      },
      E_SESSION_EXPIRED: {
        code: 'E_SESSION_EXPIRED',
        message: 'Session has expired',
        severity: 'error',
        category: 'session',
        http_status: 410
      },

      // Bank errors
      E_BANK_DEFECT: {
        code: 'E_BANK_DEFECT',
        message: 'Bank package has validation errors',
        severity: 'error',
        category: 'bank',
        http_status: 500
      },
      E_BANK_NOT_FOUND: {
        code: 'E_BANK_NOT_FOUND',
        message: 'Bank package not found',
        severity: 'error',
        category: 'bank',
        http_status: 404
      },
      E_BANK_CORRUPTED: {
        code: 'E_BANK_CORRUPTED',
        message: 'Bank package is corrupted or invalid',
        severity: 'error',
        category: 'bank',
        http_status: 500
      },
      E_BANK_SIGNATURE_INVALID: {
        code: 'E_BANK_SIGNATURE_INVALID',
        message: 'Bank package signature is invalid',
        severity: 'error',
        category: 'bank',
        http_status: 500
      },
      E_BANK_VERSION_MISMATCH: {
        code: 'E_BANK_VERSION_MISMATCH',
        message: 'Bank version mismatch with engine',
        severity: 'error',
        category: 'bank',
        http_status: 500
      },

      // State errors
      E_STATE: {
        code: 'E_STATE',
        message: 'Invalid session state for operation',
        severity: 'error',
        category: 'state',
        http_status: 409
      },
      E_STATE_TRANSITION_INVALID: {
        code: 'E_STATE_TRANSITION_INVALID',
        message: 'Invalid state transition',
        severity: 'error',
        category: 'state',
        http_status: 409
      },

      // Pick errors
      E_PICK_COUNT: {
        code: 'E_PICK_COUNT',
        message: 'Must pick between 1 and 7 families',
        severity: 'error',
        category: 'picks',
        http_status: 400
      },
      E_INVALID_FAMILY: {
        code: 'E_INVALID_FAMILY',
        message: 'Invalid family name',
        severity: 'error',
        category: 'picks',
        http_status: 400
      },
      E_DUPLICATE_FAMILY: {
        code: 'E_DUPLICATE_FAMILY',
        message: 'Duplicate family in picks',
        severity: 'error',
        category: 'picks',
        http_status: 400
      },

      // Question errors
      E_QUESTION_NOT_FOUND: {
        code: 'E_QUESTION_NOT_FOUND',
        message: 'Question not found in bank',
        severity: 'error',
        category: 'question',
        http_status: 404
      },
      E_BAD_QID: {
        code: 'E_BAD_QID',
        message: 'Question ID not in session schedule',
        severity: 'error',
        category: 'question',
        http_status: 400
      },
      E_QUIZ_COMPLETE: {
        code: 'E_QUIZ_COMPLETE',
        message: 'All questions have been answered',
        severity: 'error',
        category: 'question',
        http_status: 409
      },
      E_INCOMPLETE_QUIZ: {
        code: 'E_INCOMPLETE_QUIZ',
        message: 'Not all questions have been answered',
        severity: 'error',
        category: 'question',
        http_status: 409
      },

      // Answer errors
      E_INVALID_OPTION: {
        code: 'E_INVALID_OPTION',
        message: 'Invalid option key for question',
        severity: 'error',
        category: 'answer',
        http_status: 400
      },
      E_ANSWER_ALREADY_SUBMITTED: {
        code: 'E_ANSWER_ALREADY_SUBMITTED',
        message: 'Answer already submitted for question',
        severity: 'error',
        category: 'answer',
        http_status: 409
      },
      E_ANSWER_OUT_OF_ORDER: {
        code: 'E_ANSWER_OUT_OF_ORDER',
        message: 'Answer submitted out of order',
        severity: 'error',
        category: 'answer',
        http_status: 400
      },

      // Validation errors
      E_VALIDATION_FAILED: {
        code: 'E_VALIDATION_FAILED',
        message: 'Input validation failed',
        severity: 'error',
        category: 'validation',
        http_status: 400
      },
      E_SCHEMA_VIOLATION: {
        code: 'E_SCHEMA_VIOLATION',
        message: 'Schema validation failed',
        severity: 'error',
        category: 'validation',
        http_status: 400
      },
      E_REQUIRED_FIELD_MISSING: {
        code: 'E_REQUIRED_FIELD_MISSING',
        message: 'Required field is missing',
        severity: 'error',
        category: 'validation',
        http_status: 400
      },
      E_INVALID_DATA_TYPE: {
        code: 'E_INVALID_DATA_TYPE',
        message: 'Invalid data type for field',
        severity: 'error',
        category: 'validation',
        http_status: 400
      },

      // Rate limiting errors
      E_RATE_LIMIT_EXCEEDED: {
        code: 'E_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        severity: 'error',
        category: 'rate_limit',
        http_status: 429
      },
      E_QUOTA_EXCEEDED: {
        code: 'E_QUOTA_EXCEEDED',
        message: 'Quota exceeded',
        severity: 'error',
        category: 'rate_limit',
        http_status: 429
      },

      // Security errors
      E_AUTHENTICATION_FAILED: {
        code: 'E_AUTHENTICATION_FAILED',
        message: 'Authentication failed',
        severity: 'error',
        category: 'security',
        http_status: 401
      },
      E_AUTHORIZATION_FAILED: {
        code: 'E_AUTHORIZATION_FAILED',
        message: 'Authorization failed',
        severity: 'error',
        category: 'security',
        http_status: 403
      },
      E_INVALID_TOKEN: {
        code: 'E_INVALID_TOKEN',
        message: 'Invalid or expired token',
        severity: 'error',
        category: 'security',
        http_status: 401
      },
      E_SUSPICIOUS_ACTIVITY: {
        code: 'E_SUSPICIOUS_ACTIVITY',
        message: 'Suspicious activity detected',
        severity: 'error',
        category: 'security',
        http_status: 403
      },

      // System errors
      E_INTERNAL_ERROR: {
        code: 'E_INTERNAL_ERROR',
        message: 'Internal server error',
        severity: 'error',
        category: 'system',
        http_status: 500
      },
      E_SERVICE_UNAVAILABLE: {
        code: 'E_SERVICE_UNAVAILABLE',
        message: 'Service temporarily unavailable',
        severity: 'error',
        category: 'system',
        http_status: 503
      },
      E_TIMEOUT: {
        code: 'E_TIMEOUT',
        message: 'Operation timed out',
        severity: 'error',
        category: 'system',
        http_status: 504
      },
      E_CONCURRENCY_CONFLICT: {
        code: 'E_CONCURRENCY_CONFLICT',
        message: 'Concurrency conflict detected',
        severity: 'error',
        category: 'system',
        http_status: 409
      },

      // Bank validation errors
      E_BANK_FAMILY_COUNT: {
        code: 'E_BANK_FAMILY_COUNT',
        message: 'Bank must have exactly 7 families',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      },
      E_BANK_QUESTION_COUNT: {
        code: 'E_BANK_QUESTION_COUNT',
        message: 'Each family must have exactly 3 questions',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      },
      E_BANK_OPTION_COUNT: {
        code: 'E_BANK_OPTION_COUNT',
        message: 'Each question must have exactly 2 options',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      },
      E_BANK_TELL_COUNT: {
        code: 'E_BANK_TELL_COUNT',
        message: 'Each option must have 0-3 tells',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      },
      E_BANK_FACE_OPPORTUNITY: {
        code: 'E_BANK_FACE_OPPORTUNITY',
        message: 'Face must have at least 6 total opportunities and 2 signature opportunities',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      },
      E_BANK_CONTRAST_MATRIX: {
        code: 'E_BANK_CONTRAST_MATRIX',
        message: 'Contrast matrix is invalid or incomplete',
        severity: 'error',
        category: 'bank_validation',
        http_status: 500
      }
    };
  }

  /**
   * Initialize warning codes
   */
  initializeWarningCodes() {
    return {
      // Session warnings
      W_SESSION_NEAR_EXPIRY: {
        code: 'W_SESSION_NEAR_EXPIRY',
        message: 'Session will expire soon',
        severity: 'warning',
        category: 'session'
      },
      W_SESSION_IDLE: {
        code: 'W_SESSION_IDLE',
        message: 'Session has been idle for extended period',
        severity: 'warning',
        category: 'session'
      },

      // Bank warnings
      W_BANK_VERSION_OLD: {
        code: 'W_BANK_VERSION_OLD',
        message: 'Bank version is older than recommended',
        severity: 'warning',
        category: 'bank'
      },
      W_BANK_CONSTANTS_CHANGED: {
        code: 'W_BANK_CONSTANTS_CHANGED',
        message: 'Bank constants have changed from previous version',
        severity: 'warning',
        category: 'bank'
      },

      // Answer warnings
      W_ANSWER_LATENCY_HIGH: {
        code: 'W_ANSWER_LATENCY_HIGH',
        message: 'Answer latency is higher than expected',
        severity: 'warning',
        category: 'answer'
      },
      W_ANSWER_PATTERN_UNUSUAL: {
        code: 'W_ANSWER_PATTERN_UNUSUAL',
        message: 'Unusual answer pattern detected',
        severity: 'warning',
        category: 'answer'
      },

      // Performance warnings
      W_PERFORMANCE_DEGRADED: {
        code: 'W_PERFORMANCE_DEGRADED',
        message: 'Performance is degraded',
        severity: 'warning',
        category: 'performance'
      },
      W_MEMORY_USAGE_HIGH: {
        code: 'W_MEMORY_USAGE_HIGH',
        message: 'Memory usage is high',
        severity: 'warning',
        category: 'performance'
      },

      // Validation warnings
      W_INPUT_FORMAT_UNUSUAL: {
        code: 'W_INPUT_FORMAT_UNUSUAL',
        message: 'Input format is unusual but valid',
        severity: 'warning',
        category: 'validation'
      },
      W_OPTIONAL_FIELD_MISSING: {
        code: 'W_OPTIONAL_FIELD_MISSING',
        message: 'Optional field is missing',
        severity: 'warning',
        category: 'validation'
      }
    };
  }

  /**
   * Initialize QA flags
   */
  initializeQAFlags() {
    return {
      // Session QA flags
      QA_SESSION_CREATED: {
        code: 'QA_SESSION_CREATED',
        message: 'Session created successfully',
        severity: 'info',
        category: 'session'
      },
      QA_SESSION_PICKS_SET: {
        code: 'QA_SESSION_PICKS_SET',
        message: 'Session picks set successfully',
        severity: 'info',
        category: 'session'
      },
      QA_SESSION_FINALIZED: {
        code: 'QA_SESSION_FINALIZED',
        message: 'Session finalized successfully',
        severity: 'info',
        category: 'session'
      },

      // Answer QA flags
      QA_ANSWER_SUBMITTED: {
        code: 'QA_ANSWER_SUBMITTED',
        message: 'Answer submitted successfully',
        severity: 'info',
        category: 'answer'
      },
      QA_ANSWER_CHANGED: {
        code: 'QA_ANSWER_CHANGED',
        message: 'Answer changed successfully',
        severity: 'info',
        category: 'answer'
      },
      QA_ANSWER_IDEMPOTENT: {
        code: 'QA_ANSWER_IDEMPOTENT',
        message: 'Answer submission was idempotent',
        severity: 'info',
        category: 'answer'
      },

      // Bank QA flags
      QA_BANK_LOADED: {
        code: 'QA_BANK_LOADED',
        message: 'Bank loaded successfully',
        severity: 'info',
        category: 'bank'
      },
      QA_BANK_VALIDATED: {
        code: 'QA_BANK_VALIDATED',
        message: 'Bank validation passed',
        severity: 'info',
        category: 'bank'
      },
      QA_BANK_SIGNATURE_VERIFIED: {
        code: 'QA_BANK_SIGNATURE_VERIFIED',
        message: 'Bank signature verified',
        severity: 'info',
        category: 'bank'
      },

      // Performance QA flags
      QA_PERFORMANCE_GOOD: {
        code: 'QA_PERFORMANCE_GOOD',
        message: 'Performance is within acceptable limits',
        severity: 'info',
        category: 'performance'
      },
      QA_CACHE_HIT: {
        code: 'QA_CACHE_HIT',
        message: 'Cache hit occurred',
        severity: 'info',
        category: 'performance'
      },
      QA_CACHE_MISS: {
        code: 'QA_CACHE_MISS',
        message: 'Cache miss occurred',
        severity: 'info',
        category: 'performance'
      },

      // Security QA flags
      QA_SECURITY_CHECK_PASSED: {
        code: 'QA_SECURITY_CHECK_PASSED',
        message: 'Security check passed',
        severity: 'info',
        category: 'security'
      },
      QA_RATE_LIMIT_APPLIED: {
        code: 'QA_RATE_LIMIT_APPLIED',
        message: 'Rate limit applied successfully',
        severity: 'info',
        category: 'security'
      },

      // Validation QA flags
      QA_VALIDATION_PASSED: {
        code: 'QA_VALIDATION_PASSED',
        message: 'Validation passed',
        severity: 'info',
        category: 'validation'
      },
      QA_SCHEMA_VALIDATION_PASSED: {
        code: 'QA_SCHEMA_VALIDATION_PASSED',
        message: 'Schema validation passed',
        severity: 'info',
        category: 'validation'
      },

      // Engine QA flags
      QA_ENGINE_INITIALIZED: {
        code: 'QA_ENGINE_INITIALIZED',
        message: 'Engine initialized successfully',
        severity: 'info',
        category: 'engine'
      },
      QA_ENGINE_SHUTDOWN: {
        code: 'QA_ENGINE_SHUTDOWN',
        message: 'Engine shutdown successfully',
        severity: 'info',
        category: 'engine'
      },
      QA_ENGINE_HEALTHY: {
        code: 'QA_ENGINE_HEALTHY',
        message: 'Engine is healthy',
        severity: 'info',
        category: 'engine'
      }
    };
  }

  /**
   * Get error code by code
   */
  getErrorCode(code) {
    return this.errorCodes[code] || null;
  }

  /**
   * Get warning code by code
   */
  getWarningCode(code) {
    return this.warningCodes[code] || null;
  }

  /**
   * Get QA flag by code
   */
  getQAFlag(code) {
    return this.qaFlags[code] || null;
  }

  /**
   * Get all error codes by category
   */
  getErrorCodesByCategory(category) {
    return Object.values(this.errorCodes).filter(error => error.category === category);
  }

  /**
   * Get all warning codes by category
   */
  getWarningCodesByCategory(category) {
    return Object.values(this.warningCodes).filter(warning => warning.category === category);
  }

  /**
   * Get all QA flags by category
   */
  getQAFlagsByCategory(category) {
    return Object.values(this.qaFlags).filter(flag => flag.category === category);
  }

  /**
   * Get all codes by severity
   */
  getCodesBySeverity(severity) {
    const errors = Object.values(this.errorCodes).filter(error => error.severity === severity);
    const warnings = Object.values(this.warningCodes).filter(warning => warning.severity === severity);
    const qaFlags = Object.values(this.qaFlags).filter(flag => flag.severity === severity);
    
    return {
      errors,
      warnings,
      qaFlags
    };
  }

  /**
   * Validate error code
   */
  validateErrorCode(code) {
    if (!code || typeof code !== 'string') {
      return false;
    }
    
    return this.errorCodes.hasOwnProperty(code) || 
           this.warningCodes.hasOwnProperty(code) || 
           this.qaFlags.hasOwnProperty(code);
  }

  /**
   * Get error code statistics
   */
  getErrorCodeStatistics() {
    const errorCount = Object.keys(this.errorCodes).length;
    const warningCount = Object.keys(this.warningCodes).length;
    const qaFlagCount = Object.keys(this.qaFlags).length;
    
    const categories = {
      session: 0,
      bank: 0,
      state: 0,
      picks: 0,
      question: 0,
      answer: 0,
      validation: 0,
      rate_limit: 0,
      security: 0,
      system: 0,
      bank_validation: 0,
      performance: 0,
      engine: 0
    };
    
    // Count by category
    Object.values(this.errorCodes).forEach(error => {
      categories[error.category] = (categories[error.category] || 0) + 1;
    });
    
    Object.values(this.warningCodes).forEach(warning => {
      categories[warning.category] = (categories[warning.category] || 0) + 1;
    });
    
    Object.values(this.qaFlags).forEach(flag => {
      categories[flag.category] = (categories[flag.category] || 0) + 1;
    });
    
    return {
      total_codes: errorCount + warningCount + qaFlagCount,
      error_codes: errorCount,
      warning_codes: warningCount,
      qa_flags: qaFlagCount,
      categories
    };
  }

  /**
   * Export complete registry
   */
  exportRegistry() {
    return {
      schema: 'error_codes_registry.v1',
      version: '1.0.0',
      error_codes: this.errorCodes,
      warning_codes: this.warningCodes,
      qa_flags: this.qaFlags,
      statistics: this.getErrorCodeStatistics(),
      categories: [
        'session',
        'bank',
        'state',
        'picks',
        'question',
        'answer',
        'validation',
        'rate_limit',
        'security',
        'system',
        'bank_validation',
        'performance',
        'engine'
      ],
      severities: ['error', 'warning', 'info']
    };
  }
}

module.exports = ErrorCodesRegistry;
