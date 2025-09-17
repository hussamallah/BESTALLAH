/**
 * Analytics Event Schema
 * 
 * Provides analytics events for product analytics and QA.
 * These events are for tracking and analysis, not for scoring.
 */

class AnalyticsEventCollector {
  constructor() {
    this.events = [];
    this.sessionId = null;
    this.bankId = null;
  }

  initialize(sessionId, bankId) {
    this.sessionId = sessionId;
    this.bankId = bankId;
    this.events = [];
  }

  /**
   * Record session started event
   */
  recordSessionStarted(pickedFamilies) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'SESSION_STARTED',
      session_id: this.sessionId,
      bank_id: this.bankId,
      picked_families: pickedFamilies
    });
  }

  /**
   * Record question presented event
   */
  recordQuestionPresented(qid, familyScreen, index, total) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'QUESTION_PRESENTED',
      session_id: this.sessionId,
      qid: qid,
      familyScreen: familyScreen,
      index: index,
      total: total
    });
  }

  /**
   * Record answer submitted event
   */
  recordAnswerSubmitted(qid, pickedKey, lineCOF, facesHit, latencyMs = 0) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'ANSWER_SUBMITTED',
      session_id: this.sessionId,
      qid: qid,
      picked_key: pickedKey,
      lineCOF: lineCOF,
      faces_hit: facesHit,
      latency_ms: latencyMs
    });
  }

  /**
   * Record session paused event
   */
  recordSessionPaused(reason = null) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'SESSION_PAUSED',
      session_id: this.sessionId,
      reason: reason
    });
  }

  /**
   * Record session resumed event
   */
  recordSessionResumed() {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'SESSION_RESUMED',
      session_id: this.sessionId
    });
  }

  /**
   * Record session aborted event
   */
  recordSessionAborted(reason) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'SESSION_ABORTED',
      session_id: this.sessionId,
      reason: reason
    });
  }

  /**
   * Record session finalized event
   */
  recordSessionFinalized(lineVerdicts, faceStatesSummary) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'FINALIZED',
      session_id: this.sessionId,
      line_verdicts: lineVerdicts,
      face_states_summary: faceStatesSummary
    });
  }

  /**
   * Record error event
   */
  recordError(errorCode, errorMessage, context = {}) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'ERROR',
      session_id: this.sessionId,
      error_code: errorCode,
      error_message: errorMessage,
      context: context
    });
  }

  /**
   * Record performance event
   */
  recordPerformance(operation, durationMs, metadata = {}) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'PERFORMANCE',
      session_id: this.sessionId,
      operation: operation,
      duration_ms: durationMs,
      metadata: metadata
    });
  }

  /**
   * Record bank validation event
   */
  recordBankValidation(bankId, validationResult) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'BANK_VALIDATION',
      session_id: this.sessionId,
      bank_id: bankId,
      validation_result: validationResult
    });
  }

  /**
   * Record face state computation event
   */
  recordFaceStateComputation(faceId, state, metrics) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'FACE_STATE_COMPUTED',
      session_id: this.sessionId,
      face_id: faceId,
      state: state,
      metrics: metrics
    });
  }

  /**
   * Record family representative resolution event
   */
  recordFamilyRepResolution(family, representative, coPresent) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'FAMILY_REP_RESOLVED',
      session_id: this.sessionId,
      family: family,
      representative: representative,
      co_present: coPresent
    });
  }

  /**
   * Record anchor family selection event
   */
  recordAnchorSelection(anchorFamily, selectionReason) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'ANCHOR_SELECTED',
      session_id: this.sessionId,
      anchor_family: anchorFamily,
      selection_reason: selectionReason
    });
  }

  /**
   * Record QA flag event
   */
  recordQAFlag(flagCode, flagDetail, severity = 'warning') {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'QA_FLAG',
      session_id: this.sessionId,
      flag_code: flagCode,
      flag_detail: flagDetail,
      severity: severity
    });
  }

  /**
   * Record tell processing event
   */
  recordTellProcessing(tellId, faceId, context, processed) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'TELL_PROCESSED',
      session_id: this.sessionId,
      tell_id: tellId,
      face_id: faceId,
      context: context,
      processed: processed
    });
  }

  /**
   * Record concentration cap event
   */
  recordConcentrationCap(faceId, family, share, capped) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'CONCENTRATION_CAP',
      session_id: this.sessionId,
      face_id: faceId,
      family: family,
      share: share,
      capped: capped
    });
  }

  /**
   * Record contrast detection event
   */
  recordContrastDetection(faceId, contrastTells, detected) {
    this.events.push({
      ts: new Date().toISOString(),
      type: 'CONTRAST_DETECTED',
      session_id: this.sessionId,
      face_id: faceId,
      contrast_tells: contrastTells,
      detected: detected
    });
  }

  /**
   * Get all events
   */
  getEvents() {
    return this.events;
  }

  /**
   * Get events by type
   */
  getEventsByType(type) {
    return this.events.filter(event => event.type === type);
  }

  /**
   * Get events in time range
   */
  getEventsInRange(startTime, endTime) {
    return this.events.filter(event => {
      const eventTime = new Date(event.ts);
      return eventTime >= startTime && eventTime <= endTime;
    });
  }

  /**
   * Generate analytics summary
   */
  generateSummary() {
    const summary = {
      session_id: this.sessionId,
      bank_id: this.bankId,
      total_events: this.events.length,
      event_types: {},
      timeline: {
        started: null,
        finalized: null,
        duration_ms: 0
      },
      performance: {
        avg_latency_ms: 0,
        max_latency_ms: 0,
        operations: {}
      },
      errors: [],
      qa_flags: []
    };

    // Count event types
    for (const event of this.events) {
      summary.event_types[event.type] = (summary.event_types[event.type] || 0) + 1;
    }

    // Find timeline markers
    const startedEvent = this.events.find(e => e.type === 'SESSION_STARTED');
    const finalizedEvent = this.events.find(e => e.type === 'FINALIZED');
    
    if (startedEvent) {
      summary.timeline.started = startedEvent.ts;
    }
    
    if (finalizedEvent) {
      summary.timeline.finalized = finalizedEvent.ts;
      
      if (startedEvent) {
        const startTime = new Date(startedEvent.ts);
        const endTime = new Date(finalizedEvent.ts);
        summary.timeline.duration_ms = endTime - startTime;
      }
    }

    // Calculate performance metrics
    const latencyEvents = this.events.filter(e => e.type === 'ANSWER_SUBMITTED' && e.latency_ms);
    if (latencyEvents.length > 0) {
      const latencies = latencyEvents.map(e => e.latency_ms);
      summary.performance.avg_latency_ms = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      summary.performance.max_latency_ms = Math.max(...latencies);
    }

    // Collect errors and QA flags
    summary.errors = this.events.filter(e => e.type === 'ERROR');
    summary.qa_flags = this.events.filter(e => e.type === 'QA_FLAG');

    return summary;
  }

  /**
   * Export events in analytics format
   */
  exportAnalyticsEvents() {
    return {
      schema: 'analytics_events.v1',
      events: this.events
    };
  }

  /**
   * Clear all events
   */
  clear() {
    this.events = [];
  }

  /**
   * Save events to file
   */
  saveEvents(filePath) {
    const fs = require('fs');
    const analyticsData = this.exportAnalyticsEvents();
    const json = JSON.stringify(analyticsData, null, 2);
    fs.writeFileSync(filePath, json);
  }
}

module.exports = AnalyticsEventCollector;
