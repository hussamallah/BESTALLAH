/**
 * Engine Monitoring and Observability
 * Tracks sessions, performance, and distribution metrics
 */

import { EventEmitter } from 'events';

class EngineMonitoring extends EventEmitter {
  constructor() {
    super();
    this.metrics = {
      sessions: {
        started: 0,
        completed: 0,
        abandoned: 0,
        abandonedAt: new Map(), // question number -> count
        averageDuration: 0,
        totalDuration: 0
      },
      performance: {
        getNextQuestion: [],
        submitAnswer: [],
        finalizeSession: []
      },
      distribution: {
        faceStates: new Map(), // state -> count
        lineVerdicts: new Map(), // verdict -> count
        familyVerdicts: new Map() // family -> verdict -> count
      },
      errors: {
        count: 0,
        byType: new Map(),
        signatureFailures: 0
      }
    };
    this.alerts = new Map();
    this.alertThresholds = {
      p95Finalize: 100, // ms
      crashRate: 0.005, // 0.5%
      completionRate: 0.8, // 80%
      signatureFailures: 0 // any failures
    };
  }

  /**
   * Track session start
   * @param {string} sessionId - Session ID
   * @param {Object} sessionData - Session data
   */
  trackSessionStart(sessionId, sessionData) {
    this.metrics.sessions.started++;
    this.emit('session:started', { sessionId, sessionData, timestamp: Date.now() });
  }

  /**
   * Track session completion
   * @param {string} sessionId - Session ID
   * @param {Object} results - Session results
   * @param {number} duration - Session duration in ms
   */
  trackSessionComplete(sessionId, results, duration) {
    this.metrics.sessions.completed++;
    this.metrics.sessions.totalDuration += duration;
    this.metrics.sessions.averageDuration = 
      this.metrics.sessions.totalDuration / this.metrics.sessions.completed;

    // Track distribution metrics
    this._trackDistributionMetrics(results);

    this.emit('session:completed', { sessionId, results, duration, timestamp: Date.now() });
    this._checkCompletionRateAlert();
  }

  /**
   * Track session abandonment
   * @param {string} sessionId - Session ID
   * @param {number} questionNumber - Question where abandoned
   */
  trackSessionAbandon(sessionId, questionNumber) {
    this.metrics.sessions.abandoned++;
    const currentCount = this.metrics.sessions.abandonedAt.get(questionNumber) || 0;
    this.metrics.sessions.abandonedAt.set(questionNumber, currentCount + 1);

    this.emit('session:abandoned', { sessionId, questionNumber, timestamp: Date.now() });
    this._checkCompletionRateAlert();
  }

  /**
   * Track performance metric
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   */
  trackPerformance(operation, duration) {
    if (!this.metrics.performance[operation]) {
      this.metrics.performance[operation] = [];
    }

    this.metrics.performance[operation].push({
      duration,
      timestamp: Date.now()
    });

    // Keep only last 1000 measurements
    if (this.metrics.performance[operation].length > 1000) {
      this.metrics.performance[operation] = this.metrics.performance[operation].slice(-1000);
    }

    this.emit('performance:measured', { operation, duration, timestamp: Date.now() });
    this._checkPerformanceAlerts(operation, duration);
  }

  /**
   * Track error
   * @param {string} type - Error type
   * @param {Error} error - Error object
   */
  trackError(type, error) {
    this.metrics.errors.count++;
    const currentCount = this.metrics.errors.byType.get(type) || 0;
    this.metrics.errors.byType.set(type, currentCount + 1);

    if (type === 'signature_verification') {
      this.metrics.errors.signatureFailures++;
    }

    this.emit('error:occurred', { type, error: error.message, timestamp: Date.now() });
    this._checkErrorAlerts(type);
  }

  /**
   * Track distribution metrics from session results
   * @param {Object} results - Session results
   */
  _trackDistributionMetrics(results) {
    // Track face states
    if (results.face_states) {
      Object.values(results.face_states).forEach(faceState => {
        const state = faceState.state || faceState;
        const currentCount = this.metrics.distribution.faceStates.get(state) || 0;
        this.metrics.distribution.faceStates.set(state, currentCount + 1);
      });
    }

    // Track line verdicts
    if (results.line_verdicts) {
      Object.entries(results.line_verdicts).forEach(([family, verdict]) => {
        const currentCount = this.metrics.distribution.lineVerdicts.get(verdict) || 0;
        this.metrics.distribution.lineVerdicts.set(verdict, currentCount + 1);

        if (!this.metrics.distribution.familyVerdicts.has(family)) {
          this.metrics.distribution.familyVerdicts.set(family, new Map());
        }
        const familyCount = this.metrics.distribution.familyVerdicts.get(family).get(verdict) || 0;
        this.metrics.distribution.familyVerdicts.get(family).set(verdict, familyCount + 1);
      });
    }
  }

  /**
   * Check performance alerts
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   */
  _checkPerformanceAlerts(operation, duration) {
    if (operation === 'finalizeSession') {
      const p95 = this._calculatePercentile(this.metrics.performance[operation], 0.95);
      if (p95 > this.alertThresholds.p95Finalize) {
        this._triggerAlert('high_p95_finalize', {
          operation,
          p95,
          threshold: this.alertThresholds.p95Finalize
        });
      }
    }
  }

  /**
   * Check completion rate alert
   */
  _checkCompletionRateAlert() {
    const totalSessions = this.metrics.sessions.started;
    if (totalSessions === 0) return;

    const completionRate = this.metrics.sessions.completed / totalSessions;
    if (completionRate < this.alertThresholds.completionRate) {
      this._triggerAlert('low_completion_rate', {
        completionRate,
        threshold: this.alertThresholds.completionRate,
        totalSessions,
        completed: this.metrics.sessions.completed
      });
    }
  }

  /**
   * Check error alerts
   * @param {string} type - Error type
   */
  _checkErrorAlerts(type) {
    if (type === 'signature_verification') {
      if (this.metrics.errors.signatureFailures > this.alertThresholds.signatureFailures) {
        this._triggerAlert('signature_failures', {
          count: this.metrics.errors.signatureFailures,
          threshold: this.alertThresholds.signatureFailures
        });
      }
    }

    // Check crash rate
    const totalSessions = this.metrics.sessions.started;
    if (totalSessions > 0) {
      const crashRate = this.metrics.errors.count / totalSessions;
      if (crashRate > this.alertThresholds.crashRate) {
        this._triggerAlert('high_crash_rate', {
          crashRate,
          threshold: this.alertThresholds.crashRate,
          errorCount: this.metrics.errors.count,
          totalSessions
        });
      }
    }
  }

  /**
   * Trigger alert
   * @param {string} alertType - Alert type
   * @param {Object} data - Alert data
   */
  _triggerAlert(alertType, data) {
    const alert = {
      type: alertType,
      data,
      timestamp: Date.now(),
      id: `${alertType}_${Date.now()}`
    };

    this.alerts.set(alert.id, alert);
    this.emit('alert:triggered', alert);

    // Auto-resolve after 5 minutes
    setTimeout(() => {
      this.alerts.delete(alert.id);
      this.emit('alert:resolved', alert);
    }, 5 * 60 * 1000);
  }

  /**
   * Calculate percentile
   * @param {Array} values - Array of values
   * @param {number} percentile - Percentile (0-1)
   * @returns {number} Percentile value
   */
  _calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.map(v => v.duration).sort((a, b) => a - b);
    const index = Math.ceil(percentile * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Get dashboard data
   * @returns {Object} Dashboard data
   */
  getDashboardData() {
    const now = Date.now();
    const oneHourAgo = now - (60 * 60 * 1000);
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    return {
      sessions: {
        startRate: this.metrics.sessions.started,
        completionRate: this.metrics.sessions.started > 0 ? 
          this.metrics.sessions.completed / this.metrics.sessions.started : 0,
        averageDuration: this.metrics.sessions.averageDuration,
        abandonAt: Object.fromEntries(this.metrics.sessions.abandonedAt),
        agreeCTR: this._calculateAgreeCTR()
      },
      engineHealth: {
        p50: {
          getNextQuestion: this._calculatePercentile(this.metrics.performance.getNextQuestion, 0.5),
          submitAnswer: this._calculatePercentile(this.metrics.performance.submitAnswer, 0.5),
          finalizeSession: this._calculatePercentile(this.metrics.performance.finalizeSession, 0.5)
        },
        p95: {
          getNextQuestion: this._calculatePercentile(this.metrics.performance.getNextQuestion, 0.95),
          submitAnswer: this._calculatePercentile(this.metrics.performance.submitAnswer, 0.95),
          finalizeSession: this._calculatePercentile(this.metrics.performance.finalizeSession, 0.95)
        },
        errorRate: this.metrics.sessions.started > 0 ? 
          this.metrics.errors.count / this.metrics.sessions.started : 0,
        signatureFailures: this.metrics.errors.signatureFailures
      },
      distribution: {
        faceStates: Object.fromEntries(this.metrics.distribution.faceStates),
        lineVerdicts: Object.fromEntries(this.metrics.distribution.lineVerdicts),
        familyVerdicts: Object.fromEntries(
          Array.from(this.metrics.distribution.familyVerdicts.entries()).map(([family, verdicts]) => 
            [family, Object.fromEntries(verdicts)]
          )
        ),
        dailyDeltas: this._calculateDailyDeltas()
      },
      alerts: Array.from(this.alerts.values()),
      timestamp: now
    };
  }

  /**
   * Calculate agree CTR (placeholder - would need actual data)
   * @returns {number} Agree CTR
   */
  _calculateAgreeCTR() {
    // This would be calculated from actual user behavior data
    // For now, return a placeholder
    return 0.75;
  }

  /**
   * Calculate daily deltas for distribution metrics
   * @returns {Object} Daily deltas
   */
  _calculateDailyDeltas() {
    // This would compare current metrics with previous day
    // For now, return placeholder data
    return {
      faceStates: {},
      lineVerdicts: {},
      familyVerdicts: {}
    };
  }

  /**
   * Get alerts
   * @returns {Array} Active alerts
   */
  getAlerts() {
    return Array.from(this.alerts.values());
  }

  /**
   * Clear alerts
   */
  clearAlerts() {
    this.alerts.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      sessions: {
        started: 0,
        completed: 0,
        abandoned: 0,
        abandonedAt: new Map(),
        averageDuration: 0,
        totalDuration: 0
      },
      performance: {
        getNextQuestion: [],
        submitAnswer: [],
        finalizeSession: []
      },
      distribution: {
        faceStates: new Map(),
        lineVerdicts: new Map(),
        familyVerdicts: new Map()
      },
      errors: {
        count: 0,
        byType: new Map(),
        signatureFailures: 0
      }
    };
  }
}

// Create singleton instance
const monitoring = new EngineMonitoring();

export default monitoring;
