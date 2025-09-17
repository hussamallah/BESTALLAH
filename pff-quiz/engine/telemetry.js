/**
 * Telemetry Definitions (engine QA, not math)
 * 
 * Provides telemetry counters and metrics for engine QA and monitoring.
 * These metrics are for operational monitoring, not for scoring.
 */

class TelemetryCollector {
  constructor() {
    this.counters = {
      sessions_started: 0,
      sessions_finalized: 0,
      sessions_aborted: 0,
      sessions_paused: 0,
      sessions_resumed: 0,
      answers_submitted: 0,
      answers_changed: 0,
      questions_served: 0,
      finalizations_completed: 0,
      finalizations_failed: 0,
      bank_validations: 0,
      bank_validation_failures: 0,
      cache_hits: 0,
      cache_misses: 0,
      rate_limit_hits: 0,
      rate_limit_violations: 0,
      errors_total: 0,
      warnings_total: 0
    };

    this.distributions = {
      face_state_distribution: {
        LIT: 0,
        LEAN: 0,
        GHOST: 0,
        COLD: 0,
        ABSENT: 0
      },
      line_verdict_distribution: {
        C: 0,
        O: 0,
        F: 0
      },
      answer_latency_distribution: {
        '0-50ms': 0,
        '50-100ms': 0,
        '100-200ms': 0,
        '200-500ms': 0,
        '500ms+': 0
      },
      session_duration_distribution: {
        '0-1min': 0,
        '1-5min': 0,
        '5-10min': 0,
        '10-30min': 0,
        '30min+': 0
      }
    };

    this.qa_flags = {
      QA_FLAG_FACE_LIT_ON_BROKEN: 0,
      QA_FLAG_NO_FACE_EVIDENCE: 0,
      QA_FLAG_NO_CONTRAST: 0,
      QA_FLAG_SIBLING_COLLISION: 0,
      QA_FLAG_OVER_CONCENTRATION: 0,
      QA_FLAG_UNDER_CONCENTRATION: 0
    };

    this.performance_metrics = {
      avg_answers_changed_per_session: 0,
      avg_tells_per_option_seen: 0,
      avg_session_duration_ms: 0,
      avg_finalization_time_ms: 0,
      avg_answer_latency_ms: 0,
      cache_hit_rate: 0,
      error_rate: 0,
      finalization_success_rate: 0
    };

    this.session_metrics = new Map();
    this.face_metrics = new Map();
    this.family_metrics = new Map();
  }

  /**
   * Record session started
   */
  recordSessionStarted(sessionId, bankId) {
    this.counters.sessions_started++;
    this.session_metrics.set(sessionId, {
      session_id: sessionId,
      bank_id: bankId,
      started_at: Date.now(),
      answers_count: 0,
      answers_changed: 0,
      finalization_time: null,
      face_states: new Map(),
      line_verdicts: new Map()
    });
  }

  /**
   * Record session finalized
   */
  recordSessionFinalized(sessionId, result) {
    this.counters.sessions_finalized++;
    this.counters.finalizations_completed++;

    const session = this.session_metrics.get(sessionId);
    if (session) {
      session.finalized_at = Date.now();
      session.finalization_time = session.finalized_at - session.started_at;
      session.face_states = result.face_states || {};
      session.line_verdicts = result.line_verdicts || {};

      // Update distributions
      this.updateFaceStateDistribution(session.face_states);
      this.updateLineVerdictDistribution(session.line_verdicts);
      this.updateSessionDurationDistribution(session.finalization_time);
    }

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Record session aborted
   */
  recordSessionAborted(sessionId, reason) {
    this.counters.sessions_aborted++;
    this.counters.finalizations_failed++;

    const session = this.session_metrics.get(sessionId);
    if (session) {
      session.aborted_at = Date.now();
      session.abort_reason = reason;
    }
  }

  /**
   * Record session paused
   */
  recordSessionPaused(sessionId) {
    this.counters.sessions_paused++;
  }

  /**
   * Record session resumed
   */
  recordSessionResumed(sessionId) {
    this.counters.sessions_resumed++;
  }

  /**
   * Record answer submitted
   */
  recordAnswerSubmitted(sessionId, qid, optionKey, latencyMs = 0) {
    this.counters.answers_submitted++;
    this.counters.questions_served++;

    const session = this.session_metrics.get(sessionId);
    if (session) {
      session.answers_count++;
      this.updateAnswerLatencyDistribution(latencyMs);
    }

    // Update performance metrics
    this.updatePerformanceMetrics();
  }

  /**
   * Record answer changed
   */
  recordAnswerChanged(sessionId, qid, oldOptionKey, newOptionKey) {
    this.counters.answers_changed++;

    const session = this.session_metrics.get(sessionId);
    if (session) {
      session.answers_changed++;
    }
  }

  /**
   * Record bank validation
   */
  recordBankValidation(bankId, success, validationTime) {
    this.counters.bank_validations++;
    
    if (!success) {
      this.counters.bank_validation_failures++;
    }
  }

  /**
   * Record cache hit
   */
  recordCacheHit(cacheType) {
    this.counters.cache_hits++;
    this.updatePerformanceMetrics();
  }

  /**
   * Record cache miss
   */
  recordCacheMiss(cacheType) {
    this.counters.cache_misses++;
    this.updatePerformanceMetrics();
  }

  /**
   * Record rate limit hit
   */
  recordRateLimitHit(limitType) {
    this.counters.rate_limit_hits++;
  }

  /**
   * Record rate limit violation
   */
  recordRateLimitViolation(limitType) {
    this.counters.rate_limit_violations++;
  }

  /**
   * Record error
   */
  recordError(errorCode, errorMessage, context = {}) {
    this.counters.errors_total++;
    this.updatePerformanceMetrics();
  }

  /**
   * Record warning
   */
  recordWarning(warningCode, warningMessage, context = {}) {
    this.counters.warnings_total++;
  }

  /**
   * Record QA flag
   */
  recordQAFlag(flagCode, flagDetail) {
    if (this.qa_flags.hasOwnProperty(flagCode)) {
      this.qa_flags[flagCode]++;
    }
  }

  /**
   * Record face state
   */
  recordFaceState(faceId, state, metrics) {
    if (!this.face_metrics.has(faceId)) {
      this.face_metrics.set(faceId, {
        face_id: faceId,
        state_counts: {
          LIT: 0,
          LEAN: 0,
          GHOST: 0,
          COLD: 0,
          ABSENT: 0
        },
        total_sessions: 0,
        avg_questions_hit: 0,
        avg_families_hit: 0,
        avg_signature_hits: 0,
        avg_clean_count: 0,
        avg_broken_count: 0
      });
    }

    const faceMetric = this.face_metrics.get(faceId);
    faceMetric.state_counts[state]++;
    faceMetric.total_sessions++;

    if (metrics) {
      faceMetric.avg_questions_hit = this.updateAverage(faceMetric.avg_questions_hit, metrics.questions_hit, faceMetric.total_sessions);
      faceMetric.avg_families_hit = this.updateAverage(faceMetric.avg_families_hit, metrics.families_hit, faceMetric.total_sessions);
      faceMetric.avg_signature_hits = this.updateAverage(faceMetric.avg_signature_hits, metrics.signature_hits, faceMetric.total_sessions);
      faceMetric.avg_clean_count = this.updateAverage(faceMetric.avg_clean_count, metrics.clean, faceMetric.total_sessions);
      faceMetric.avg_broken_count = this.updateAverage(faceMetric.avg_broken_count, metrics.broken, faceMetric.total_sessions);
    }
  }

  /**
   * Record family metrics
   */
  recordFamilyMetrics(family, verdict, faceStates) {
    if (!this.family_metrics.has(family)) {
      this.family_metrics.set(family, {
        family: family,
        verdict_counts: {
          C: 0,
          O: 0,
          F: 0
        },
        total_sessions: 0,
        avg_face_states: {
          LIT: 0,
          LEAN: 0,
          GHOST: 0,
          COLD: 0,
          ABSENT: 0
        }
      });
    }

    const familyMetric = this.family_metrics.get(family);
    familyMetric.verdict_counts[verdict]++;
    familyMetric.total_sessions++;

    // Update face state averages
    for (const [faceId, state] of Object.entries(faceStates)) {
      if (faceId.startsWith(`FACE/${family}/`)) {
        familyMetric.avg_face_states[state] = this.updateAverage(
          familyMetric.avg_face_states[state],
          1,
          familyMetric.total_sessions
        );
      }
    }
  }

  /**
   * Update face state distribution
   */
  updateFaceStateDistribution(faceStates) {
    for (const [faceId, state] of Object.entries(faceStates)) {
      if (this.distributions.face_state_distribution.hasOwnProperty(state)) {
        this.distributions.face_state_distribution[state]++;
      }
    }
  }

  /**
   * Update line verdict distribution
   */
  updateLineVerdictDistribution(lineVerdicts) {
    for (const [family, verdict] of Object.entries(lineVerdicts)) {
      if (this.distributions.line_verdict_distribution.hasOwnProperty(verdict)) {
        this.distributions.line_verdict_distribution[verdict]++;
      }
    }
  }

  /**
   * Update answer latency distribution
   */
  updateAnswerLatencyDistribution(latencyMs) {
    if (latencyMs <= 50) {
      this.distributions.answer_latency_distribution['0-50ms']++;
    } else if (latencyMs <= 100) {
      this.distributions.answer_latency_distribution['50-100ms']++;
    } else if (latencyMs <= 200) {
      this.distributions.answer_latency_distribution['100-200ms']++;
    } else if (latencyMs <= 500) {
      this.distributions.answer_latency_distribution['200-500ms']++;
    } else {
      this.distributions.answer_latency_distribution['500ms+']++;
    }
  }

  /**
   * Update session duration distribution
   */
  updateSessionDurationDistribution(durationMs) {
    const durationMin = durationMs / (1000 * 60);
    
    if (durationMin <= 1) {
      this.distributions.session_duration_distribution['0-1min']++;
    } else if (durationMin <= 5) {
      this.distributions.session_duration_distribution['1-5min']++;
    } else if (durationMin <= 10) {
      this.distributions.session_duration_distribution['5-10min']++;
    } else if (durationMin <= 30) {
      this.distributions.session_duration_distribution['10-30min']++;
    } else {
      this.distributions.session_duration_distribution['30min+']++;
    }
  }

  /**
   * Update performance metrics
   */
  updatePerformanceMetrics() {
    const totalSessions = this.counters.sessions_started;
    const finalizedSessions = this.counters.sessions_finalized;
    
    if (totalSessions > 0) {
      this.performance_metrics.avg_answers_changed_per_session = this.calculateAverageAnswersChanged();
      this.performance_metrics.cache_hit_rate = this.calculateCacheHitRate();
      this.performance_metrics.error_rate = this.calculateErrorRate();
      this.performance_metrics.finalization_success_rate = finalizedSessions / totalSessions;
    }

    if (finalizedSessions > 0) {
      this.performance_metrics.avg_session_duration_ms = this.calculateAverageSessionDuration();
      this.performance_metrics.avg_finalization_time_ms = this.calculateAverageFinalizationTime();
      this.performance_metrics.avg_answer_latency_ms = this.calculateAverageAnswerLatency();
    }
  }

  /**
   * Calculate average answers changed per session
   */
  calculateAverageAnswersChanged() {
    let totalChanged = 0;
    let sessionCount = 0;

    for (const session of this.session_metrics.values()) {
      if (session.answers_changed !== undefined) {
        totalChanged += session.answers_changed;
        sessionCount++;
      }
    }

    return sessionCount > 0 ? totalChanged / sessionCount : 0;
  }

  /**
   * Calculate cache hit rate
   */
  calculateCacheHitRate() {
    const total = this.counters.cache_hits + this.counters.cache_misses;
    return total > 0 ? this.counters.cache_hits / total : 0;
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate() {
    const total = this.counters.sessions_started;
    return total > 0 ? this.counters.errors_total / total : 0;
  }

  /**
   * Calculate average session duration
   */
  calculateAverageSessionDuration() {
    let totalDuration = 0;
    let sessionCount = 0;

    for (const session of this.session_metrics.values()) {
      if (session.finalization_time) {
        totalDuration += session.finalization_time;
        sessionCount++;
      }
    }

    return sessionCount > 0 ? totalDuration / sessionCount : 0;
  }

  /**
   * Calculate average finalization time
   */
  calculateAverageFinalizationTime() {
    let totalTime = 0;
    let sessionCount = 0;

    for (const session of this.session_metrics.values()) {
      if (session.finalization_time) {
        totalTime += session.finalization_time;
        sessionCount++;
      }
    }

    return sessionCount > 0 ? totalTime / sessionCount : 0;
  }

  /**
   * Calculate average answer latency
   */
  calculateAverageAnswerLatency() {
    // This would need to be tracked per answer
    // For now, return a placeholder
    return 0;
  }

  /**
   * Update average value
   */
  updateAverage(currentAverage, newValue, count) {
    return (currentAverage * (count - 1) + newValue) / count;
  }

  /**
   * Get telemetry summary
   */
  getTelemetrySummary() {
    return {
      schema: 'telemetry_counters.v1',
      timestamp: new Date().toISOString(),
      counters: { ...this.counters },
      distributions: { ...this.distributions },
      qa_flags: { ...this.qa_flags },
      performance_metrics: { ...this.performance_metrics },
      face_metrics: Object.fromEntries(this.face_metrics),
      family_metrics: Object.fromEntries(this.family_metrics)
    };
  }

  /**
   * Get face-specific metrics
   */
  getFaceMetrics(faceId) {
    return this.face_metrics.get(faceId);
  }

  /**
   * Get family-specific metrics
   */
  getFamilyMetrics(family) {
    return this.family_metrics.get(family);
  }

  /**
   * Get session metrics
   */
  getSessionMetrics(sessionId) {
    return this.session_metrics.get(sessionId);
  }

  /**
   * Clear all metrics
   */
  clearMetrics() {
    this.counters = {
      sessions_started: 0,
      sessions_finalized: 0,
      sessions_aborted: 0,
      sessions_paused: 0,
      sessions_resumed: 0,
      answers_submitted: 0,
      answers_changed: 0,
      questions_served: 0,
      finalizations_completed: 0,
      finalizations_failed: 0,
      bank_validations: 0,
      bank_validation_failures: 0,
      cache_hits: 0,
      cache_misses: 0,
      rate_limit_hits: 0,
      rate_limit_violations: 0,
      errors_total: 0,
      warnings_total: 0
    };

    this.distributions = {
      face_state_distribution: {
        LIT: 0,
        LEAN: 0,
        GHOST: 0,
        COLD: 0,
        ABSENT: 0
      },
      line_verdict_distribution: {
        C: 0,
        O: 0,
        F: 0
      },
      answer_latency_distribution: {
        '0-50ms': 0,
        '50-100ms': 0,
        '100-200ms': 0,
        '200-500ms': 0,
        '500ms+': 0
      },
      session_duration_distribution: {
        '0-1min': 0,
        '1-5min': 0,
        '5-10min': 0,
        '10-30min': 0,
        '30min+': 0
      }
    };

    this.qa_flags = {
      QA_FLAG_FACE_LIT_ON_BROKEN: 0,
      QA_FLAG_NO_FACE_EVIDENCE: 0,
      QA_FLAG_NO_CONTRAST: 0,
      QA_FLAG_SIBLING_COLLISION: 0,
      QA_FLAG_OVER_CONCENTRATION: 0,
      QA_FLAG_UNDER_CONCENTRATION: 0
    };

    this.performance_metrics = {
      avg_answers_changed_per_session: 0,
      avg_tells_per_option_seen: 0,
      avg_session_duration_ms: 0,
      avg_finalization_time_ms: 0,
      avg_answer_latency_ms: 0,
      cache_hit_rate: 0,
      error_rate: 0,
      finalization_success_rate: 0
    };

    this.session_metrics.clear();
    this.face_metrics.clear();
    this.family_metrics.clear();
  }

  /**
   * Export telemetry data
   */
  exportTelemetryData() {
    return {
      summary: this.getTelemetrySummary(),
      session_details: Array.from(this.session_metrics.values()),
      face_details: Array.from(this.face_metrics.values()),
      family_details: Array.from(this.family_metrics.values())
    };
  }
}

module.exports = TelemetryCollector;
