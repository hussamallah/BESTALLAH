/**
 * PFF Quiz Engine - Production Implementation
 * 
 * Real, bank-driven engine following STEM behavior specification
 * Single source of truth: bank_package.json
 */

import crypto from 'crypto';
import BankLoader from './bankLoader.js';
import engineVersion from './version.js';
import monitoring from './monitoring.js';
import featureFlags from './featureFlags.js';

class PFFEngine {
  constructor() {
    this.bankLoader = new BankLoader();
    this.sessions = new Map();
  }

  /**
   * Initialize a new session (Batch 2 API Contract)
   * @param {string} sessionSeed - Seed for deterministic behavior
   * @param {string} bankPath - Path to bank_package.json
   * @returns {Object} Session state matching Batch 2 contract
   */
  initSession(sessionSeed, bankPath) {
    // Load bank if not already loaded
    if (!this.bankLoader.bankPackage) {
      this.bankLoader.loadBank(bankPath);
    }

    // Check bank hash against allowed list
    const bankHash = this.bankLoader.getBankHash();
    if (!featureFlags.isBankHashAllowed(bankHash)) {
      throw new Error(`Bank hash ${bankHash} not in allowed list`);
    }

    // Validate bank version binding (Batch 2 requirement)
    const bankId = this.bankLoader.getBankId();
    if (!bankId) {
      throw this._createError('E_BANK_DEFECT', 'Bank package missing bank_id');
    }

    // Compute deterministic seed
    const constantsProfile = this.bankLoader.getConstantsProfile();
    
    // Update engine version tracking
    engineVersion.setBankHash(bankHash);
    engineVersion.setConstantsProfile(constantsProfile);
    
    const seed = crypto.createHash('sha256')
      .update(sessionSeed + bankHash + constantsProfile)
      .digest('hex');

    // Initialize session state with Batch 2 structure
    const sessionId = crypto.createHash('sha256').update(sessionSeed).digest('hex').substring(0, 16);
    const session = {
      sessionId,
      sessionSeed,
      bankId: this.bankLoader.getBankId(),
      bankHash,
      constantsProfile,
      picks: new Set(),
      schedule: [],
      lineState: new Map(),
      screenFaceCount: new Map(),
      faceLedger: new Map(),
      answers: [], // Batch 2: answers array for replacement tracking
      state: 'INIT', // Batch 2: proper state machine
      startedAt: new Date().toISOString(),
      prng: this._createPRNG(seed)
    };

    // Initialize line state for all families
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    allFamilies.forEach(family => {
      session.lineState.set(family, {
        C: 0,
        O_seen: false,
        F_seen: false
      });
    });

    // Initialize face ledger for all faces with Batch 2 structure
    this.bankLoader.indices.faceMeta.forEach((meta, faceId) => {
      session.faceLedger.set(faceId, {
        questions_hit: new Set(),
        families_hit: new Set(),
        signature_qids: new Set(),
        context_counts: { Clean: 0, Bent: 0, Broken: 0 },
        per_family_counts: {},
        contrast_seen: false
      });
    });

    // Store session
    this.sessions.set(sessionId, session);

    // Track session start
    monitoring.trackSessionStart(sessionId, {
      sessionSeed,
      bankHash,
      constantsProfile,
      pickedFamilies: []
    });

    return {
      session_id: sessionId,
      state: 'INIT',
      started_at: session.startedAt,
      line_state: this._serializeLineState(session.lineState),
      face_ledger: this._serializeFaceLedger(session.faceLedger)
    };
  }

  /**
   * Set picked families (Screen1 picks) - Batch 2 API Contract
   * @param {string} sessionId - Session ID
   * @param {Array<string>} pickedFamilies - Array of family names
   * @returns {Object} Updated session state matching Batch 2 contract
   */
  setPicks(sessionId, pickedFamilies) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
    }

    // Validate bank version binding (Batch 2 requirement)
    this._validateBankVersion(session);

    if (session.state !== 'INIT') {
      throw this._createError('E_STATE', 'Session must be in INIT state before setting picks');
    }

    // Validate picked families
    const validFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    const invalidFamilies = pickedFamilies.filter(family => !validFamilies.includes(family));
    if (invalidFamilies.length > 0) {
      throw this._createError('E_INVALID_FAMILY', `Invalid families: ${invalidFamilies.join(', ')}`);
    }

    // Validate pick count
    if (pickedFamilies.length < 1 || pickedFamilies.length > 7) {
      throw this._createError('E_PICK_COUNT', 'Picked families must be between 1 and 7');
    }

    // Set picks and apply Screen1 seeds
    session.picks = new Set(pickedFamilies);
    
    // Apply +1 C seed to picked families
    pickedFamilies.forEach(family => {
      const lineState = session.lineState.get(family);
      lineState.C += 1;
    });

    // Generate deterministic schedule
    session.schedule = this._generateSchedule(pickedFamilies, session.prng);
    session.state = 'PICKED';

    return {
      session_id: sessionId,
      state: 'PICKED',
      picked_families: pickedFamilies,
      schedule: this._serializeSchedule(session.schedule)
    };
  }

  /**
   * Get next question from queue - Batch 2 API Contract
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Next question or null if complete
   */
  getNextQuestion(sessionId) {
    const startTime = Date.now();
    
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
      }

      // Validate bank version binding (Batch 2 requirement)
      this._validateBankVersion(session);

      if (session.state !== 'PICKED' && session.state !== 'IN_PROGRESS') {
        throw this._createError('E_STATE', 'Session must be PICKED or IN_PROGRESS to get next question');
      }

      if (session.schedule.length === 0) {
        return null;
      }

      const nextQuestion = session.schedule[0];
      session.schedule = session.schedule.slice(1);

      // Update state to IN_PROGRESS if this is the first question
      if (session.state === 'PICKED') {
        session.state = 'IN_PROGRESS';
      }

      // Get question data from bank
      const questionData = this.bankLoader.getQuestion(nextQuestion.qid);
      if (!questionData) {
        throw this._createError('E_BAD_QID', `Question not found: ${nextQuestion.qid}`);
      }

      const result = {
        qid: nextQuestion.qid,
        familyScreen: nextQuestion.familyScreen,
        options: questionData.options.map(opt => ({
          key: opt.id,
          lineCOF: opt.lineCOF,
          tells: (opt.tells || []).map(tellId => ({
            face_id: this._getFaceFromTell(tellId),
            tell_id: tellId
          }))
        })),
        index: 18 - session.schedule.length,
        total: 18
      };

      // Track performance
      const duration = Date.now() - startTime;
      monitoring.trackPerformance('getNextQuestion', duration);

      return result;
    } catch (error) {
      monitoring.trackError('getNextQuestion', error);
      throw error;
    }
  }

  /**
   * Submit answer for a question - Batch 2 API Contract with replacement policy
   * @param {string} sessionId - Session ID
   * @param {string} qid - Question ID
   * @param {string} optionKey - Option key (A or B)
   * @param {string} ts - Timestamp (optional)
   * @param {number} latencyMs - Latency in milliseconds (optional)
   * @returns {Object} Updated session state matching Batch 2 contract
   */
  submitAnswer(sessionId, qid, optionKey, ts = new Date().toISOString(), latencyMs = 0) {
    const startTime = Date.now();
    
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
      }

      // Validate bank version binding (Batch 2 requirement)
      this._validateBankVersion(session);

      if (session.state !== 'IN_PROGRESS') {
        throw this._createError('E_STATE', 'Session must be IN_PROGRESS to submit answers');
      }

      // Get question data from bank
      const questionData = this.bankLoader.getQuestion(qid);
      if (!questionData) {
        throw this._createError('E_BAD_QID', `Question not found: ${qid}`);
      }

      const family = questionData.family;
      const option = questionData.options.find(opt => opt.id === optionKey);
      if (!option) {
        throw this._createError('E_BAD_OPTION', `Option ${optionKey} not found for question ${qid}`);
      }

      // Check if this qid was already answered (replacement policy)
      const existingAnswerIndex = session.answers.findIndex(answer => answer.qid === qid);
      if (existingAnswerIndex !== -1) {
        // Remove existing answer and its effects
        const existingAnswer = session.answers[existingAnswerIndex];
        this._removeAnswerEffects(session, existingAnswer);
        session.answers.splice(existingAnswerIndex, 1);
      }

      // Create new answer event
      const answerEvent = {
        qid,
        familyScreen: family,
        picked_key: optionKey,
        lineCOF: option.lineCOF,
        tells: (option.tells || []).map(tellId => ({
          face_id: this._getFaceFromTell(tellId),
          tell_id: tellId
        })),
        ts,
        latency_ms: latencyMs
      };

      // Add answer to session
      session.answers.push(answerEvent);

      // Update line state
      this._updateLineState(session, family, option.lineCOF);

      // Process tells with concentration cap
      this._processTells(session, qid, family, option);

      // Check if session is complete
      if (session.answers.length === 18) {
        session.state = 'FINALIZING';
        // Clear the schedule since we're done
        session.schedule = [];
      }

      // Track performance
      const duration = Date.now() - startTime;
      monitoring.trackPerformance('submitAnswer', duration);

      return {
        session_id: sessionId,
        accepted: true,
        answers_count: session.answers.length,
        remaining: 18 - session.answers.length
      };
    } catch (error) {
      monitoring.trackError('submitAnswer', error);
      throw error;
    }
  }

  /**
   * Finalize session and compute results - Batch 2 API Contract
   * @param {string} sessionId - Session ID
   * @returns {Object} Final results matching Batch 2 contract
   */
  finalizeSession(sessionId) {
    const startTime = Date.now();
    
    try {
      // Check if results are enabled
      if (!featureFlags.areResultsEnabled()) {
        throw this._createError('E_RESULTS_DISABLED', 'Results are disabled by kill switch');
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
      }

      if (session.state !== 'FINALIZING') {
        throw this._createError('E_STATE', 'Session must be in FINALIZING state to finalize');
      }

      if (session.answers.length !== 18) {
        throw this._createError('E_INCOMPLETE_SESSION', 'Session must have exactly 18 answers to finalize');
      }

      // Compute line verdicts (F > O > C)
      const lineVerdicts = {};
      session.lineState.forEach((state, family) => {
        if (state.F_seen) {
          lineVerdicts[family] = 'F';
        } else if (state.O_seen) {
          lineVerdicts[family] = 'O';
        } else if (state.C > 0) {
          lineVerdicts[family] = 'C';
        } else {
          lineVerdicts[family] = 'C'; // Default fallback
        }
      });

      // Compute face states using Batch 2 structure
      const faceStates = {};
      const constants = this.bankLoader.getConstants();
      
      session.faceLedger.forEach((ledger, faceId) => {
        const Q = ledger.questions_hit.size;
        const FAM = ledger.families_hit.size;
        const SIG = ledger.signature_qids.size;
        const CLEAN = ledger.context_counts.Clean;
        const BENT = ledger.context_counts.Bent;
        const BROKEN = ledger.context_counts.Broken;
        const MAX_FAM_SHARE = this._calculateMaxFamilyShare(ledger);
        const contrast_seen = ledger.contrast_seen;

        let state = 'ABSENT';
        
        if (Q === 0) {
          state = 'ABSENT';
        } else if (this._isLIT(Q, FAM, SIG, CLEAN, BROKEN, MAX_FAM_SHARE, contrast_seen, constants)) {
          state = 'LIT';
        } else if (this._isLEAN(Q, FAM, SIG, CLEAN, BROKEN, constants)) {
          state = 'LEAN';
        } else if (this._isGHOST(Q, FAM, BROKEN, CLEAN, MAX_FAM_SHARE)) {
          state = 'GHOST';
        } else if (Q >= 2 && Q <= 3 && FAM >= 2) {
          state = 'COLD';
        } else {
          state = 'ABSENT';
        }

        faceStates[faceId] = {
          state,
          familiesHit: FAM,
          signatureHits: SIG,
          clean: CLEAN,
          bent: BENT,
          broken: BROKEN,
          contrastSeen: contrast_seen
        };
      });

      // Compute family representatives
      const familyReps = this._computeFamilyRepresentatives(session, faceStates);

      // Find anchor family (from non-picked families only)
      const anchorFamily = this._selectAnchorFamily(session, lineVerdicts);

      // Mark session as finalized
      session.state = 'FINALIZED';
      session.finalizedAt = new Date().toISOString();

      const results = {
        session_id: sessionId,
        state: 'FINALIZED',
        line_verdicts: lineVerdicts,
        face_states: faceStates,
        family_reps: familyReps,
        anchor_family: anchorFamily
      };

      // Track performance and session completion
      const duration = Date.now() - startTime;
      monitoring.trackPerformance('finalizeSession', duration);
      
      const sessionDuration = new Date(session.finalizedAt) - new Date(session.startedAt);
      monitoring.trackSessionComplete(sessionId, results, sessionDuration);

      return results;
    } catch (error) {
      monitoring.trackError('finalizeSession', error);
      throw error;
    }
  }

  /**
   * Compute face metrics for Batch 3 finalization
   * @param {Object} session - Session object
   * @returns {Map} Face metrics
   */
  _computeFaceMetrics(session) {
    const faceMetrics = new Map();
    const constants = this.bankLoader.getConstants();
    
    session.faceLedger.forEach((ledger, faceId) => {
      const Q = ledger.questions_hit.size;
      const FAM = ledger.families_hit.size;
      const SIG = ledger.signature_qids.size;
      const CLEAN = ledger.context_counts.Clean;
      const BENT = ledger.context_counts.Bent;
      const BROKEN = ledger.context_counts.Broken;
      const TOTAL = CLEAN + BENT + BROKEN;
      const MAX_FAM_SHARE = TOTAL > 0 ? Math.max(...Object.values(ledger.per_family_counts)) / TOTAL : 0;
      const contrast_seen = ledger.contrast_seen;

      faceMetrics.set(faceId, {
        Q,
        FAM,
        SIG,
        CLEAN,
        BENT,
        BROKEN,
        TOTAL,
        MAX_FAM_SHARE,
        contrast_seen,
        per_family_counts: ledger.per_family_counts
      });
    });

    return faceMetrics;
  }

  /**
   * Apply state gates for Batch 3 finalization
   * @param {Object} session - Session object
   * @param {Map} faceMetrics - Face metrics
   * @returns {Object} Face states
   */
  _applyStateGates(session, faceMetrics) {
    const faceStates = {};
    const constants = this.bankLoader.getConstants();

    faceMetrics.forEach((metrics, faceId) => {
      const { Q, FAM, SIG, CLEAN, BROKEN, MAX_FAM_SHARE, contrast_seen } = metrics;
      
      let state = 'ABSENT';

      // Step 3: Apply state gates (Batch 3 specification)
      
      // GHOST triggers first
      if (BROKEN >= CLEAN || 
          MAX_FAM_SHARE > constants.PER_SCREEN_CAP || 
          (Q >= 6 && FAM <= 2)) {
        state = 'GHOST';
      }
      // LIT gates (all must pass)
      else if (Q >= constants.LIT_MIN_QUESTIONS &&
               FAM >= constants.LIT_MIN_FAMILIES &&
               SIG >= constants.LIT_MIN_SIGNATURE &&
               CLEAN >= constants.LIT_MIN_CLEAN &&
               BROKEN <= constants.LIT_MAX_BROKEN &&
               BROKEN < CLEAN &&
               MAX_FAM_SHARE <= constants.PER_SCREEN_CAP &&
               contrast_seen) {
        state = 'LIT';
      }
      // LEAN gates (all must pass)
      else if (Q >= constants.LEAN_MIN_QUESTIONS &&
               FAM >= constants.LEAN_MIN_FAMILIES &&
               SIG >= constants.LEAN_MIN_SIGNATURE &&
               CLEAN >= constants.LEAN_MIN_CLEAN &&
               BROKEN < CLEAN) {
        state = 'LEAN';
      }
      // COLD criteria
      else if (Q >= 2 && Q <= 3 && FAM >= 2) {
        state = 'COLD';
      }
      // ABSENT (default)
      else {
        state = 'ABSENT';
      }

      faceStates[faceId] = {
        state,
        familiesHit: FAM,
        signatureHits: SIG,
        clean: CLEAN,
        bent: metrics.BENT,
        broken: BROKEN,
        contrastSeen: contrast_seen
      };
    });

    return faceStates;
  }

  /**
   * Apply QA flags and sanity checks for Batch 3
   * @param {Object} session - Session object
   * @param {Object} lineVerdicts - Line verdicts
   * @param {Object} faceStates - Face states
   * @param {Array} familyReps - Family representatives
   * @returns {Array} QA flags
   */
  _applyQAFlags(session, lineVerdicts, faceStates, familyReps) {
    const qaFlags = [];

    // S1: Face LIT on Broken family
    Object.entries(faceStates).forEach(([faceId, faceState]) => {
      if (faceState.state === 'LIT') {
        const faceMeta = this.bankLoader.getFaceMeta(faceId);
        if (faceMeta && lineVerdicts[faceMeta.family] === 'F') {
          const ledger = session.faceLedger.get(faceId);
          if (ledger && ledger.per_family_counts[faceMeta.family]) {
            const totalHits = ledger.context_counts.Clean + ledger.context_counts.Bent + ledger.context_counts.Broken;
            const familyHits = ledger.per_family_counts[faceMeta.family];
            if (totalHits > 0 && (familyHits / totalHits) > 0.5) {
              qaFlags.push({
                code: 'QA_FLAG_FACE_LIT_ON_BROKEN',
                face: faceId,
                family: faceMeta.family,
                detail: 'Face LIT with majority hits from broken family'
              });
            }
          }
        }
      }
    });

    // S2: Family C, both siblings GHOST
    const familyStates = new Map();
    Object.entries(faceStates).forEach(([faceId, faceState]) => {
      const faceMeta = this.bankLoader.getFaceMeta(faceId);
      if (faceMeta) {
        if (!familyStates.has(faceMeta.family)) {
          familyStates.set(faceMeta.family, []);
        }
        familyStates.get(faceMeta.family).push({ faceId, state: faceState.state });
      }
    });

    familyStates.forEach((faces, family) => {
      if (lineVerdicts[family] === 'C' && faces.length === 2) {
        const allGhost = faces.every(f => f.state === 'GHOST');
        if (allGhost) {
          qaFlags.push({
            code: 'QA_FLAG_NO_FACE_EVIDENCE',
            family: family,
            detail: 'Family C with both siblings GHOST'
          });
        }
      }
    });

    // S3: LIT without contrast
    Object.entries(faceStates).forEach(([faceId, faceState]) => {
      if (faceState.state === 'LIT' && !faceState.contrastSeen) {
        qaFlags.push({
          code: 'QA_FLAG_NO_CONTRAST',
          face: faceId,
          detail: 'LIT without contrast seen'
        });
      }
    });

    return qaFlags;
  }

  /**
   * Resume session from paused state - Batch 2 API Contract
   * @param {string} sessionId - Session ID
   * @returns {Object} Session state and next question
   */
  resumeSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
    }

    if (session.state !== 'PAUSED') {
      throw this._createError('E_STATE', 'Session must be PAUSED to resume');
    }

    session.state = 'IN_PROGRESS';
    
    return {
      session_id: sessionId,
      state: 'IN_PROGRESS',
      next_question: this.getNextQuestion(sessionId)
    };
  }

  /**
   * Abort session - Batch 2 API Contract
   * @param {string} sessionId - Session ID
   * @param {string} reason - Abort reason
   * @returns {Object} Aborted session state
   */
  abortSession(sessionId, reason = 'User requested') {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw this._createError('E_SESSION_NOT_FOUND', 'Session not found');
    }

    session.state = 'ABORTED';
    session.abortedAt = new Date().toISOString();
    session.abortReason = reason;

    return {
      session_id: sessionId,
      state: 'ABORTED',
      reason: reason
    };
  }

  /**
   * Create standardized error object - Batch 2 Error Handling
   * @param {string} errorCode - Error code
   * @param {string} message - Error message
   * @param {string} hint - Optional hint
   * @returns {Error} Standardized error
   */
  _createError(errorCode, message, hint = null) {
    const error = new Error(message);
    error.code = errorCode;
    error.hint = hint;
    return error;
  }

  /**
   * Validate bank version binding - Batch 2 requirement
   * @param {Object} session - Session object
   */
  _validateBankVersion(session) {
    const currentBankId = this.bankLoader.getBankId();
    if (session.bankId !== currentBankId) {
      throw this._createError('E_VERSION_MISMATCH', 
        `Session created under bank ${session.bankId}, current bank is ${currentBankId}`,
        'Session must be recreated with current bank version');
    }
  }

  /**
   * Remove effects of an existing answer (for replacement policy)
   * @param {Object} session - Session object
   * @param {Object} answer - Answer to remove
   */
  _removeAnswerEffects(session, answer) {
    const family = answer.familyScreen;
    const lineCOF = answer.lineCOF;

    // Remove line state effects
    const lineState = session.lineState.get(family);
    if (lineCOF === 'C') {
      lineState.C -= 1;
    } else if (lineCOF === 'O') {
      // Note: We can't easily track if this was the only O, so we leave O_seen as true
      // This is a limitation of the current implementation
    } else if (lineCOF === 'F') {
      // Note: We can't easily track if this was the only F, so we leave F_seen as true
      // This is a limitation of the current implementation
    }

    // Remove face ledger effects
    answer.tells.forEach(tell => {
      const faceId = tell.face_id;
      const ledger = session.faceLedger.get(faceId);
      if (!ledger) return;

      // Remove from questions_hit
      ledger.questions_hit.delete(answer.qid);
      
      // Remove from families_hit (if no other answers for this family)
      const hasOtherAnswersForFamily = session.answers.some(a => 
        a.qid !== answer.qid && a.familyScreen === family && 
        a.tells.some(t => t.face_id === faceId)
      );
      if (!hasOtherAnswersForFamily) {
        ledger.families_hit.delete(family);
      }

      // Remove signature if this was a signature question
      const faceMeta = this.bankLoader.getFaceMeta(faceId);
      if (faceMeta && faceMeta.family === family) {
        ledger.signature_qids.delete(answer.qid);
      }

      // Remove context counts
      if (lineCOF === 'C') {
        ledger.context_counts.Clean -= 1;
      } else if (lineCOF === 'O') {
        ledger.context_counts.Bent -= 1;
      } else if (lineCOF === 'F') {
        ledger.context_counts.Broken -= 1;
      }

      // Remove per-family counts
      if (ledger.per_family_counts[family]) {
        ledger.per_family_counts[family] -= 1;
        if (ledger.per_family_counts[family] <= 0) {
          delete ledger.per_family_counts[family];
        }
      }
    });
  }

  /**
   * Calculate maximum family share for a face
   * @param {Object} ledger - Face ledger
   * @returns {number} Maximum family share
   */
  _calculateMaxFamilyShare(ledger) {
    const totalHits = ledger.context_counts.Clean + ledger.context_counts.Bent + ledger.context_counts.Broken;
    if (totalHits === 0) return 0;
    
    const maxFamilyCount = Math.max(...Object.values(ledger.per_family_counts));
    return maxFamilyCount / totalHits;
  }

  /**
   * Check if face meets LIT criteria - Batch 2 specification
   * @param {number} Q - Questions hit
   * @param {number} FAM - Families hit
   * @param {number} SIG - Signature hits
   * @param {number} CLEAN - Clean context
   * @param {number} BROKEN - Broken context
   * @param {number} MAX_FAM_SHARE - Maximum family share
   * @param {boolean} contrast_seen - Contrast seen
   * @param {Object} constants - Constants
   * @returns {boolean} Is LIT
   */
  _isLIT(Q, FAM, SIG, CLEAN, BROKEN, MAX_FAM_SHARE, contrast_seen, constants) {
    return Q >= constants.LIT_MIN_QUESTIONS &&
           FAM >= constants.LIT_MIN_FAMILIES &&
           SIG >= constants.LIT_MIN_SIGNATURE &&
           CLEAN >= constants.LIT_MIN_CLEAN &&
           BROKEN <= constants.LIT_MAX_BROKEN &&
           BROKEN < CLEAN &&
           MAX_FAM_SHARE <= constants.PER_SCREEN_CAP &&
           contrast_seen;
  }

  /**
   * Check if face meets LEAN criteria - Batch 2 specification
   * @param {number} Q - Questions hit
   * @param {number} FAM - Families hit
   * @param {number} SIG - Signature hits
   * @param {number} CLEAN - Clean context
   * @param {number} BROKEN - Broken context
   * @param {Object} constants - Constants
   * @returns {boolean} Is LEAN
   */
  _isLEAN(Q, FAM, SIG, CLEAN, BROKEN, constants) {
    return Q >= constants.LEAN_MIN_QUESTIONS &&
           FAM >= constants.LEAN_MIN_FAMILIES &&
           SIG >= constants.LEAN_MIN_SIGNATURE &&
           CLEAN >= constants.LEAN_MIN_CLEAN &&
           BROKEN < CLEAN;
  }

  /**
   * Check if face meets GHOST criteria - Batch 2 specification
   * @param {number} Q - Questions hit
   * @param {number} FAM - Families hit
   * @param {number} BROKEN - Broken context
   * @param {number} CLEAN - Clean context
   * @param {number} MAX_FAM_SHARE - Maximum family share
   * @returns {boolean} Is GHOST
   */
  _isGHOST(Q, FAM, BROKEN, CLEAN, MAX_FAM_SHARE) {
    return (Q >= 6 && FAM <= 2) ||
           BROKEN >= CLEAN ||
           MAX_FAM_SHARE > 0.40;
  }

  /**
   * Compute family representatives - Batch 2 specification
   * @param {Object} session - Session object
   * @param {Object} faceStates - Face states
   * @returns {Array} Family representatives
   */
  _computeFamilyRepresentatives(session, faceStates) {
    const familyReps = [];
    const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    
    families.forEach(family => {
      const familyFaces = Array.from(session.faceLedger.keys()).filter(faceId => {
        const faceMeta = this.bankLoader.getFaceMeta(faceId);
        return faceMeta && faceMeta.family === family;
      });
      
      if (familyFaces.length === 0) return;
      
      // Sort faces by state priority and metrics
      const sortedFaces = familyFaces.sort((a, b) => {
        const stateA = faceStates[a].state;
        const stateB = faceStates[b].state;
        
        // State priority: LIT > LEAN > COLD > GHOST > ABSENT
        const statePriority = { LIT: 5, LEAN: 4, COLD: 3, GHOST: 2, ABSENT: 1 };
        if (statePriority[stateA] !== statePriority[stateB]) {
          return statePriority[stateB] - statePriority[stateA];
        }
        
        // Tiebreakers: FAM > SIG > CLEAN
        const ledgerA = session.faceLedger.get(a);
        const ledgerB = session.faceLedger.get(b);
        
        if (ledgerA.families_hit.size !== ledgerB.families_hit.size) {
          return ledgerB.families_hit.size - ledgerA.families_hit.size;
        }
        
        if (ledgerA.signature_qids.size !== ledgerB.signature_qids.size) {
          return ledgerB.signature_qids.size - ledgerA.signature_qids.size;
        }
        
        return ledgerB.context_counts.Clean - ledgerA.context_counts.Clean;
      });
      
      const rep = sortedFaces[0];
      const repState = faceStates[rep];
      const coPresent = sortedFaces.length > 1 && faceStates[sortedFaces[1]].state !== 'ABSENT';
      
      familyReps.push({
        family: family,
        rep: rep,
        rep_state: repState.state,
        co_present: coPresent
      });
    });
    
    return familyReps;
  }

  /**
   * Select anchor family from non-picked families - Batch 2 specification
   * @param {Object} session - Session object
   * @param {Object} lineVerdicts - Line verdicts
   * @returns {string|null} Anchor family
   */
  _selectAnchorFamily(session, lineVerdicts) {
    const nonPickedFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress']
      .filter(family => !session.picks.has(family));
    
    if (nonPickedFamilies.length === 0) return null;
    
    // Sort by verdict priority (C > O > F), then by C count, then by family order
    const sortedFamilies = nonPickedFamilies.sort((a, b) => {
      const verdictA = lineVerdicts[a];
      const verdictB = lineVerdicts[b];
      
      const verdictPriority = { C: 3, O: 2, F: 1 };
      if (verdictPriority[verdictA] !== verdictPriority[verdictB]) {
        return verdictPriority[verdictB] - verdictPriority[verdictA];
      }
      
      const lineStateA = session.lineState.get(a);
      const lineStateB = session.lineState.get(b);
      
      if (lineStateA.C !== lineStateB.C) {
        return lineStateB.C - lineStateA.C;
      }
      
      // Deterministic tiebreaker: family order
      const familyOrder = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
      return familyOrder.indexOf(a) - familyOrder.indexOf(b);
    });
    
    return sortedFamilies[0];
  }

  /**
   * Serialize line state for API response
   * @param {Map} lineState - Line state map
   * @returns {Object} Serialized line state
   */
  _serializeLineState(lineState) {
    const result = {};
    lineState.forEach((state, family) => {
      result[family] = {
        C: state.C,
        O_seen: state.O_seen,
        F_seen: state.F_seen
      };
    });
    return result;
  }

  /**
   * Serialize face ledger for API response
   * @param {Map} faceLedger - Face ledger map
   * @returns {Object} Serialized face ledger
   */
  _serializeFaceLedger(faceLedger) {
    const result = {};
    faceLedger.forEach((ledger, faceId) => {
      result[faceId] = {
        questions_hit: Array.from(ledger.questions_hit),
        families_hit: Array.from(ledger.families_hit),
        signature_qids: Array.from(ledger.signature_qids),
        context_counts: { ...ledger.context_counts },
        per_family_counts: { ...ledger.per_family_counts },
        contrast_seen: ledger.contrast_seen
      };
    });
    return result;
  }

  /**
   * Serialize schedule for API response
   * @param {Array} schedule - Schedule array
   * @returns {Object} Serialized schedule
   */
  _serializeSchedule(schedule) {
    const familyOrder = [...new Set(schedule.map(q => q.familyScreen))];
    const perFamily = {};
    
    familyOrder.forEach(family => {
      const familyQuestions = schedule.filter(q => q.familyScreen === family);
      perFamily[family] = {
        count: familyQuestions.length,
        qids: familyQuestions.map(q => q.qid)
      };
    });
    
    return {
      family_order: familyOrder,
      per_family: perFamily
    };
  }

  /**
   * Generate deterministic question schedule - Batch 2 specification
   */
  _generateSchedule(pickedFamilies, prng) {
    const schedule = [];
    const allFamilies = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
    const notPicked = allFamilies.filter(f => !pickedFamilies.includes(f));

    // Generate deterministic family order using session seed
    const familyOrder = this._generateDeterministicFamilyOrder(allFamilies, prng);

    // Edge case: picks=0 (no families picked) - all 7 families get 3 questions = 21 total
    if (pickedFamilies.length === 0) {
      familyOrder.forEach((family, index) => {
        const familyScreen = index + 1;
        const questions = this.bankLoader.getQuestionsForFamily(family);
        schedule.push(
          { qid: questions[0].qid, familyScreen, order_in_family: 'C' },
          { qid: questions[1].qid, familyScreen, order_in_family: 'O' },
          { qid: questions[2].qid, familyScreen, order_in_family: 'F' }
        );
      });
      return schedule;
    }

    // Edge case: picks=7 (all families) - Batch 3 policy: 14 + 4 extra = 18 total
    if (pickedFamilies.length === 7) {
      // Each family gets 2 questions (14 total)
      familyOrder.forEach((family, index) => {
        const familyScreen = index + 1;
        const questions = this.bankLoader.getQuestionsForFamily(family);
        schedule.push(
          { qid: questions[0].qid, familyScreen, order_in_family: 'C' },
          { qid: questions[1].qid, familyScreen, order_in_family: 'O' }
        );
      });
      
      // Add 4 extra O/F probes to reach 18 total
      // Deterministically select first 4 families for extra probes
      const extraFamilies = familyOrder.slice(0, 4);
      extraFamilies.forEach((family, index) => {
        const familyScreen = index + 1;
        const questions = this.bankLoader.getQuestionsForFamily(family);
        
        // Add Q3 (F probe) to reach 18
        schedule.push(
          { qid: questions[2].qid, familyScreen, order_in_family: 'F' }
        );
      });
      
      return schedule;
    }

    // Edge case: picks=1 (single family) - Batch 3 policy: drop 2 probes to reach 18 total
    if (pickedFamilies.length === 1) {
      // Picked family gets 2 questions
      const family = pickedFamilies[0];
      const questions = this.bankLoader.getQuestionsForFamily(family);
      schedule.push(
        { qid: questions[0].qid, familyScreen: 1, order_in_family: 'C' },
        { qid: questions[1].qid, familyScreen: 1, order_in_family: 'O' }
      );
      
      // Not-picked families get 3 questions each, but drop 2 O probes to reach 18
      const notPickedOrder = familyOrder.filter(f => !pickedFamilies.includes(f));
      const familiesToDropO = notPickedOrder.slice(0, 2); // Drop O from first 2 families
      
      notPickedOrder.forEach((family, index) => {
        const familyScreen = 2 + index;
        const questions = this.bankLoader.getQuestionsForFamily(family);
        const shouldDropO = familiesToDropO.includes(family);
        
        // Add C question
        schedule.push(
          { qid: questions[0].qid, familyScreen, order_in_family: 'C' }
        );
        
        // Add O question (unless dropped)
        if (!shouldDropO) {
          schedule.push(
            { qid: questions[1].qid, familyScreen, order_in_family: 'O' }
          );
        }
        
        // Add F question
        schedule.push(
          { qid: questions[2].qid, familyScreen, order_in_family: 'F' }
        );
      });
      
      return schedule;
    }

    // Normal case: 2-6 picks - exactly 18 questions total
    // Picked families get 2 questions each in deterministic order
    const pickedOrder = familyOrder.filter(f => pickedFamilies.includes(f));
    pickedOrder.forEach((family, index) => {
      const familyScreen = index + 1;
      const questions = this.bankLoader.getQuestionsForFamily(family);
      schedule.push(
        { qid: questions[0].qid, familyScreen, order_in_family: 'C' },
        { qid: questions[1].qid, familyScreen, order_in_family: 'O' }
      );
    });

    // Not-picked families get 3 questions each in deterministic order
    const notPickedOrder = familyOrder.filter(f => !pickedFamilies.includes(f));
    notPickedOrder.forEach((family, index) => {
      const familyScreen = pickedOrder.length + index + 1;
      const questions = this.bankLoader.getQuestionsForFamily(family);
      schedule.push(
        { qid: questions[0].qid, familyScreen, order_in_family: 'C' },
        { qid: questions[1].qid, familyScreen, order_in_family: 'O' },
        { qid: questions[2].qid, familyScreen, order_in_family: 'F' }
      );
    });

    return schedule;
  }

  /**
   * Generate deterministic family order using Fisher-Yates shuffle
   * @param {Array} families - Array of family names
   * @param {Object} prng - Pseudo-random number generator
   * @returns {Array} Shuffled family order
   */
  _generateDeterministicFamilyOrder(families, prng) {
    const shuffled = [...families];
    
    // Fisher-Yates shuffle with deterministic PRNG
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(prng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Update line state based on answer
   */
  _updateLineState(session, family, lineCOF) {
    const lineState = session.lineState.get(family);
    
    if (lineCOF === 'F') {
      lineState.F_seen = true;
    } else if (lineCOF === 'O') {
      lineState.O_seen = true;
    } else if (lineCOF === 'C') {
      lineState.C += 1;
    }
  }

  /**
   * Process tells with concentration cap - Batch 3 structure
   */
  _processTells(session, qid, family, option) {
    const tells = this.bankLoader.getTellsForOption(qid, option.id);
    const constants = this.bankLoader.getConstants();
    
    // Determine screen size and max per face
    const isPicked = session.picks.has(family);
    const screenSize = isPicked ? 2 : 3;
    const maxTellsPerOption = 3; // Batch 3: max 3 tells per option
    const maxPerFace = Math.floor(constants.PER_SCREEN_CAP * screenSize * maxTellsPerOption);

    // Initialize screen face count for this family if needed
    if (!session.screenFaceCount.has(family)) {
      session.screenFaceCount.set(family, new Map());
    }

    const familyScreenCount = session.screenFaceCount.get(family);

    // Check for sibling collision (Batch 3 QA flag)
    if (this.bankLoader.hasSiblingCollision(tells)) {
      session.qaFlags = session.qaFlags || [];
      session.qaFlags.push({
        code: 'W_SIBLING_COLLISION',
        qid: qid,
        family: family,
        detail: 'Both siblings present in same option'
      });
    }

    // Process each tell with Batch 3 taxonomy
    tells.forEach(tell => {
      const faceId = tell.face_id;
      if (!faceId) return;

      const currentCount = familyScreenCount.get(faceId) || 0;
      
      // Apply concentration cap
      if (currentCount < maxPerFace) {
        // Credit this tell with Batch 3 metadata
        this._creditTell(session, faceId, qid, family, option.lineCOF, tell.tell_id, tell);
        familyScreenCount.set(faceId, currentCount + 1);
      }
    });
  }

  /**
   * Credit a tell to face ledger - Batch 3 structure
   */
  _creditTell(session, faceId, qid, family, lineCOF, tellId, tellMeta = null) {
    const ledger = session.faceLedger.get(faceId);
    if (!ledger) return;

    // Mark context counts
    if (lineCOF === 'C') {
      ledger.context_counts.Clean++;
    } else if (lineCOF === 'O') {
      ledger.context_counts.Bent++;
    } else if (lineCOF === 'F') {
      ledger.context_counts.Broken++;
    }

    // Add to questions_hit (dedupe by question)
    ledger.questions_hit.add(qid);
    ledger.families_hit.add(family);

    // Check if signature opportunity (Batch 3 taxonomy)
    const faceMeta = this.bankLoader.getFaceMeta(faceId);
    if (faceMeta && faceMeta.family === family) {
      ledger.signature_qids.add(qid);
    }

    // Update per-family counts
    if (!ledger.per_family_counts[family]) {
      ledger.per_family_counts[family] = 0;
    }
    ledger.per_family_counts[family]++;

    // Check if contrast tell (Batch 3 taxonomy)
    if (tellMeta && tellMeta.contrast) {
      ledger.contrast_seen = true;
    } else if (this.bankLoader.isContrastTell(faceId, tellId)) {
      ledger.contrast_seen = true;
    }

    // Store tell metadata for QA (Batch 3)
    if (tellMeta) {
      ledger.tell_metadata = ledger.tell_metadata || [];
      ledger.tell_metadata.push({
        tell_id: tellId,
        qid: qid,
        family: family,
        isSignature: tellMeta.isSignature || false,
        isAdjacent: tellMeta.isAdjacent || false,
        contrast: tellMeta.contrast || false,
        explicit: tellMeta.explicit || false,
        priority: tellMeta.priority || 999
      });
    }
  }

  /**
   * Check if face meets LIT criteria
   */
  _isLIT(qHits, famHits, sig, clean, broken, contrast, constants) {
    // Standard LIT criteria
    if (qHits >= constants.LIT_MIN_QUESTIONS &&
        famHits >= constants.LIT_MIN_FAMILIES &&
        sig >= constants.LIT_MIN_SIGNATURE &&
        clean >= constants.LIT_MIN_CLEAN &&
        broken <= constants.LIT_MAX_BROKEN &&
        (!constants.REQUIRE_CONTRAST || contrast)) {
      return true;
    }

    // Clean override
    if (constants.ALLOW_CLEAN_OVERRIDE &&
        clean >= constants.CLEAN_OVERRIDE.CLEAN &&
        famHits >= constants.CLEAN_OVERRIDE.FAM &&
        broken <= constants.CLEAN_OVERRIDE.ALLOW_BROKEN) {
      return true;
    }

    return false;
  }

  /**
   * Check if face meets LEAN criteria
   */
  _isLEAN(qHits, famHits, sig, clean, constants) {
    return qHits >= constants.LEAN_MIN_QUESTIONS &&
           famHits >= constants.LEAN_MIN_FAMILIES &&
           sig >= constants.LEAN_MIN_SIGNATURE &&
           clean >= constants.LEAN_MIN_CLEAN;
  }

  /**
   * Extract face ID from tell ID
   */
  _getFaceFromTell(tellId) {
    const parts = tellId.split('/');
    if (parts.length >= 3) {
      return `FACE/${parts[1]}/${parts[2]}`;
    }
    return null;
  }

  /**
   * Create deterministic PRNG
   */
  _createPRNG(seed) {
    // Simple linear congruential generator for deterministic behavior
    let state = parseInt(seed.substring(0, 8), 16);
    return {
      next: () => {
        state = (state * 1664525 + 1013904223) % Math.pow(2, 32);
        return state / Math.pow(2, 32);
      }
    };
  }
}

// Create singleton instance
const engine = new PFFEngine();

// Export the 7 core functions plus version info - Batch 2 API
export const initSession = (sessionSeed, bankPath) => engine.initSession(sessionSeed, bankPath);
export const setPicks = (sessionId, pickedFamilies) => engine.setPicks(sessionId, pickedFamilies);
export const getNextQuestion = (sessionId) => engine.getNextQuestion(sessionId);
export const submitAnswer = (sessionId, qid, optionKey, ts, latencyMs) => engine.submitAnswer(sessionId, qid, optionKey, ts, latencyMs);
export const finalizeSession = (sessionId) => engine.finalizeSession(sessionId);
export const resumeSession = (sessionId) => engine.resumeSession(sessionId);
export const abortSession = (sessionId, reason) => engine.abortSession(sessionId, reason);

// Version and status info
export const getVersionInfo = () => engineVersion.getVersionInfo();
export const getReleaseNotes = () => engineVersion.getReleaseNotes();
export const getStatus = () => engineVersion.getStatus();
export const getFingerprint = () => engineVersion.generateFingerprint();

// Monitoring and observability
export const getDashboardData = () => monitoring.getDashboardData();
export const getAlerts = () => monitoring.getAlerts();
export const clearAlerts = () => monitoring.clearAlerts();
export const resetMetrics = () => monitoring.resetMetrics();

// Feature flags and kill switches
export const getFeatureFlags = () => featureFlags.getAllFlags();
export const getKillSwitches = () => featureFlags.getAllKillSwitches();
export const getConfiguration = () => featureFlags.getAllConfiguration();
export const validateConfiguration = () => featureFlags.validateConfiguration();
export const overrideFlag = (name, value) => featureFlags.overrideFlag(name, value);
export const overrideKillSwitch = (name, value) => featureFlags.overrideKillSwitch(name, value);
export const resetOverrides = () => featureFlags.resetOverrides();