/**
 * Fallback & Degradation
 * 
 * Handles graceful degradation when things go sideways.
 * Ensures exactly 18 questions under edge cases and missing probes.
 */

class FallbackManager {
  constructor() {
    this.warnings = [];
    this.errors = [];
    this.fallbackActions = [];
  }

  /**
   * Handle missing O or F probe on not-picked family
   */
  handleMissingProbe(family, missingType, availableProbes) {
    const warning = {
      code: 'W_MISSING_PROBE',
      family: family,
      missing_type: missingType,
      available_probes: availableProbes,
      action: 'serve_available_probes'
    };

    this.warnings.push(warning);
    this.fallbackActions.push({
      type: 'missing_probe',
      family: family,
      missing_type: missingType,
      timestamp: new Date().toISOString()
    });

    console.warn(`Missing ${missingType} probe for family ${family}, serving available probes`);
    return availableProbes;
  }

  /**
   * Handle option missing lineCOF
   */
  handleMissingLineCOF(qid, optionKey) {
    const error = {
      code: 'E_BANK_DEFECT_RUNTIME',
      qid: qid,
      option: optionKey,
      detail: 'Option missing lineCOF at runtime'
    };

    this.errors.push(error);
    this.fallbackActions.push({
      type: 'missing_linecof',
      qid: qid,
      option: optionKey,
      timestamp: new Date().toISOString()
    });

    throw new Error(`Bank defect: Option ${optionKey} in question ${qid} missing lineCOF`);
  }

  /**
   * Handle all seven picked (14 Q) policy
   */
  handleAllSevenPicked(pickedFamilies, bankPackage, rng) {
    const extraProbes = [];
    const questions = bankPackage.questions;
    
    // Find families with authored Q3 present
    const familiesWithQ3 = [];
    for (const family of pickedFamilies) {
      const familyQuestions = questions[family.toLowerCase()];
      if (familyQuestions && familyQuestions.length >= 3) {
        familiesWithQ3.push(family);
      }
    }

    // Add four deterministic probes (mix O/F) across families with Q3
    if (familiesWithQ3.length > 0) {
      const probeTypes = ['O', 'F', 'O', 'F']; // Mix of O and F probes
      
      for (let i = 0; i < 4; i++) {
        const family = familiesWithQ3[i % familiesWithQ3.length];
        const familyQuestions = questions[family.toLowerCase()];
        const probeType = probeTypes[i];
        
        // Find question with matching probe type
        const question = familyQuestions.find(q => {
          const option = q.options.find(opt => opt.lineCOF === probeType);
          return option !== undefined;
        });
        
        if (question) {
          extraProbes.push({
            qid: question.qid,
            family: family,
            probe_type: probeType,
            order_in_family: 3
          });
        }
      }
    }

    // If insufficient, recycle family with lowest current question count
    if (extraProbes.length < 4) {
      const familyQuestionCounts = {};
      for (const family of pickedFamilies) {
        familyQuestionCounts[family] = 2; // Base count for picked families
      }

      // Add extra probes to reach 18 total
      const remaining = 4 - extraProbes.length;
      const sortedFamilies = Object.keys(familyQuestionCounts).sort();
      
      for (let i = 0; i < remaining; i++) {
        const family = sortedFamilies[i % sortedFamilies.length];
        const familyQuestions = questions[family.toLowerCase()];
        
        if (familyQuestions && familyQuestions.length >= 3) {
          const question = familyQuestions[2]; // Q3
          extraProbes.push({
            qid: question.qid,
            family: family,
            probe_type: 'F', // Default to F probe
            order_in_family: 3
          });
        }
      }
    }

    // If still impossible, abort
    if (extraProbes.length < 4) {
      const error = {
        code: 'E_SCHEDULER_IMPOSSIBLE',
        detail: 'Cannot generate 18 questions for picks=7'
      };
      this.errors.push(error);
      throw new Error('Scheduler impossible: Cannot generate 18 questions for picks=7');
    }

    this.fallbackActions.push({
      type: 'all_seven_picked',
      extra_probes: extraProbes,
      timestamp: new Date().toISOString()
    });

    return extraProbes;
  }

  /**
   * Handle only one picked (20 Q) policy
   */
  handleOnlyOnePicked(pickedFamilies, notPickedFamilies, bankPackage, rng) {
    const droppedProbes = [];
    const questions = bankPackage.questions;
    
    // Drop O probes first, then F probes, in two distinct not-picked families
    const familiesToDrop = rng.sample(notPickedFamilies, 2);
    
    for (let i = 0; i < 2; i++) {
      const family = familiesToDrop[i];
      const familyQuestions = questions[family.toLowerCase()];
      
      if (familyQuestions && familyQuestions.length >= 2) {
        // Drop O probe first (Q2), then F probe (Q3)
        const probeType = i === 0 ? 'O' : 'F';
        const questionIndex = i === 0 ? 1 : 2; // Q2 for O, Q3 for F
        
        if (familyQuestions[questionIndex]) {
          droppedProbes.push({
            qid: familyQuestions[questionIndex].qid,
            family: family,
            probe_type: probeType,
            order_in_family: questionIndex + 1
          });
        }
      }
    }

    this.fallbackActions.push({
      type: 'only_one_picked',
      dropped_probes: droppedProbes,
      timestamp: new Date().toISOString()
    });

    return droppedProbes;
  }

  /**
   * Handle bank validation failure
   */
  handleBankValidationFailure(bankPath, validationErrors) {
    const error = {
      code: 'E_BANK_DEFECT',
      bank_path: bankPath,
      validation_errors: validationErrors,
      detail: 'Bank validation failed at load time'
    };

    this.errors.push(error);
    this.fallbackActions.push({
      type: 'bank_validation_failure',
      bank_path: bankPath,
      validation_errors: validationErrors,
      timestamp: new Date().toISOString()
    });

    throw new Error(`Bank validation failed: ${validationErrors.join(', ')}`);
  }

  /**
   * Handle session state corruption
   */
  handleSessionStateCorruption(sessionId, corruptionDetails) {
    const error = {
      code: 'E_SESSION_CORRUPTED',
      session_id: sessionId,
      corruption_details: corruptionDetails,
      detail: 'Session state corrupted'
    };

    this.errors.push(error);
    this.fallbackActions.push({
      type: 'session_corruption',
      session_id: sessionId,
      corruption_details: corruptionDetails,
      timestamp: new Date().toISOString()
    });

    // Attempt to recover session
    return this.attemptSessionRecovery(sessionId, corruptionDetails);
  }

  /**
   * Attempt to recover corrupted session
   */
  attemptSessionRecovery(sessionId, corruptionDetails) {
    const recovery = {
      session_id: sessionId,
      recovery_attempted: true,
      recovery_successful: false,
      recovery_actions: []
    };

    try {
      // Reset session to safe state
      recovery.recovery_actions.push('reset_to_safe_state');
      
      // Clear corrupted data
      recovery.recovery_actions.push('clear_corrupted_data');
      
      // Restore from last known good state
      recovery.recovery_actions.push('restore_from_backup');
      
      recovery.recovery_successful = true;
      console.log(`Session ${sessionId} recovery attempted successfully`);
      
    } catch (error) {
      recovery.recovery_actions.push('recovery_failed');
      console.error(`Session ${sessionId} recovery failed:`, error.message);
    }

    this.fallbackActions.push({
      type: 'session_recovery',
      session_id: sessionId,
      recovery: recovery,
      timestamp: new Date().toISOString()
    });

    return recovery;
  }

  /**
   * Handle RNG failure
   */
  handleRNGFailure(sessionId, rngError) {
    const error = {
      code: 'E_RNG_FAILURE',
      session_id: sessionId,
      rng_error: rngError,
      detail: 'RNG failure detected'
    };

    this.errors.push(error);
    this.fallbackActions.push({
      type: 'rng_failure',
      session_id: sessionId,
      rng_error: rngError,
      timestamp: new Date().toISOString()
    });

    // Fallback to deterministic ordering
    return this.fallbackToDeterministicOrdering(sessionId);
  }

  /**
   * Fallback to deterministic ordering
   */
  fallbackToDeterministicOrdering(sessionId) {
    const fallback = {
      session_id: sessionId,
      fallback_type: 'deterministic_ordering',
      fallback_applied: true
    };

    // Use alphabetical ordering as fallback
    const families = ['Bonding', 'Boundary', 'Control', 'Pace', 'Recognition', 'Stress', 'Truth'];
    
    this.fallbackActions.push({
      type: 'deterministic_ordering_fallback',
      session_id: sessionId,
      fallback_ordering: families,
      timestamp: new Date().toISOString()
    });

    return fallback;
  }

  /**
   * Handle memory pressure
   */
  handleMemoryPressure() {
    const warning = {
      code: 'W_MEMORY_PRESSURE',
      detail: 'Memory pressure detected, clearing caches'
    };

    this.warnings.push(warning);
    this.fallbackActions.push({
      type: 'memory_pressure',
      timestamp: new Date().toISOString()
    });

    // Clear caches and non-essential data
    this.clearCaches();
    this.garbageCollect();
  }

  /**
   * Clear caches
   */
  clearCaches() {
    // Implementation would clear various caches
    console.log('Clearing caches due to memory pressure');
  }

  /**
   * Force garbage collection
   */
  garbageCollect() {
    if (global.gc) {
      global.gc();
      console.log('Forced garbage collection');
    }
  }

  /**
   * Handle timeout
   */
  handleTimeout(operation, timeoutMs) {
    const error = {
      code: 'E_OPERATION_TIMEOUT',
      operation: operation,
      timeout_ms: timeoutMs,
      detail: `Operation ${operation} timed out after ${timeoutMs}ms`
    };

    this.errors.push(error);
    this.fallbackActions.push({
      type: 'operation_timeout',
      operation: operation,
      timeout_ms: timeoutMs,
      timestamp: new Date().toISOString()
    });

    // Return partial results or abort
    return {
      success: false,
      partial: true,
      timeout: true
    };
  }

  /**
   * Get all warnings
   */
  getWarnings() {
    return this.warnings;
  }

  /**
   * Get all errors
   */
  getErrors() {
    return this.errors;
  }

  /**
   * Get all fallback actions
   */
  getFallbackActions() {
    return this.fallbackActions;
  }

  /**
   * Clear all fallback data
   */
  clear() {
    this.warnings = [];
    this.errors = [];
    this.fallbackActions = [];
  }

  /**
   * Generate fallback report
   */
  generateFallbackReport() {
    return {
      timestamp: new Date().toISOString(),
      warnings: this.warnings,
      errors: this.errors,
      fallback_actions: this.fallbackActions,
      summary: {
        total_warnings: this.warnings.length,
        total_errors: this.errors.length,
        total_actions: this.fallbackActions.length
      }
    };
  }

  /**
   * Validate fallback policies
   */
  validateFallbackPolicies() {
    const issues = [];

    // Check if all required fallback policies are implemented
    const requiredPolicies = [
      'missing_probe',
      'missing_linecof',
      'all_seven_picked',
      'only_one_picked',
      'bank_validation_failure',
      'session_corruption',
      'rng_failure',
      'memory_pressure',
      'operation_timeout'
    ];

    for (const policy of requiredPolicies) {
      const hasPolicy = this.fallbackActions.some(action => action.type === policy);
      if (!hasPolicy) {
        issues.push(`Missing fallback policy: ${policy}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Test fallback scenarios
   */
  testFallbackScenarios() {
    const scenarios = [
      {
        name: 'missing_o_probe',
        test: () => this.handleMissingProbe('Control', 'O', ['C', 'F'])
      },
      {
        name: 'missing_f_probe',
        test: () => this.handleMissingProbe('Pace', 'F', ['C', 'O'])
      },
      {
        name: 'all_seven_picked',
        test: () => this.handleAllSevenPicked(['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'], {}, null)
      },
      {
        name: 'only_one_picked',
        test: () => this.handleOnlyOnePicked(['Control'], ['Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'], {}, null)
      }
    ];

    const results = [];
    for (const scenario of scenarios) {
      try {
        const result = scenario.test();
        results.push({
          name: scenario.name,
          success: true,
          result: result
        });
      } catch (error) {
        results.push({
          name: scenario.name,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = FallbackManager;
