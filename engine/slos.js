/**
 * SLOs & Alerts (engine health)
 * 
 * Defines Service Level Objectives and alerting for engine health monitoring.
 * Includes SLOs for finalize success rate, latency, and error rates.
 */

class SLOsManager {
  constructor() {
    this.slos = this.initializeSLOs();
    this.alerts = new Map();
    this.alertHistory = [];
    this.metrics = new Map();
    this.windows = new Map();
  }

  /**
   * Initialize SLOs
   */
  initializeSLOs() {
    return {
      finalize_success_rate: {
        target: 0.995, // 99.5%
        window_ms: 15 * 60 * 1000, // 15 minutes
        measurement: 'success_rate',
        alert_threshold: 0.99, // Alert if below 99%
        critical_threshold: 0.95 // Critical if below 95%
      },
      finalize_latency_p95: {
        target: 100, // 100ms p95
        window_ms: 5 * 60 * 1000, // 5 minutes
        measurement: 'latency_p95',
        alert_threshold: 150, // Alert if above 150ms
        critical_threshold: 200 // Critical if above 200ms
      },
      answer_latency_p95: {
        target: 50, // 50ms p95
        window_ms: 5 * 60 * 1000, // 5 minutes
        measurement: 'latency_p95',
        alert_threshold: 75, // Alert if above 75ms
        critical_threshold: 100 // Critical if above 100ms
      },
      bank_defect_rate: {
        target: 0, // 0% (should never happen)
        window_ms: 60 * 60 * 1000, // 1 hour
        measurement: 'error_rate',
        alert_threshold: 0.001, // Alert if above 0.1%
        critical_threshold: 0.01 // Critical if above 1%
      },
      qa_flags_spike: {
        target: 0, // 0% (should be minimal)
        window_ms: 24 * 60 * 60 * 1000, // 24 hours
        measurement: 'qa_flags_rate',
        alert_threshold: 0.02, // Alert if above 2%
        critical_threshold: 0.05 // Critical if above 5%
      }
    };
  }

  /**
   * Record metric
   */
  recordMetric(metricName, value, timestamp = Date.now()) {
    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    this.metrics.get(metricName).push({
      value,
      timestamp
    });

    // Clean up old metrics (keep last 24 hours)
    this.cleanupOldMetrics(metricName, 24 * 60 * 60 * 1000);

    // Check SLOs
    this.checkSLOs(metricName);
  }

  /**
   * Record finalization success
   */
  recordFinalizationSuccess(sessionId, durationMs) {
    this.recordMetric('finalization_success', 1);
    this.recordMetric('finalization_latency', durationMs);
  }

  /**
   * Record finalization failure
   */
  recordFinalizationFailure(sessionId, errorCode, durationMs) {
    this.recordMetric('finalization_success', 0);
    this.recordMetric('finalization_latency', durationMs);
    this.recordMetric('finalization_errors', 1);
  }

  /**
   * Record answer latency
   */
  recordAnswerLatency(sessionId, qid, latencyMs) {
    this.recordMetric('answer_latency', latencyMs);
  }

  /**
   * Record bank defect
   */
  recordBankDefect(bankId, errorCode) {
    this.recordMetric('bank_defects', 1);
  }

  /**
   * Record QA flag
   */
  recordQAFlag(flagCode, flagDetail) {
    this.recordMetric('qa_flags', 1);
  }

  /**
   * Check SLOs for a metric
   */
  checkSLOs(metricName) {
    for (const [sloName, slo] of Object.entries(this.slos)) {
      if (this.isMetricRelevant(sloName, metricName)) {
        this.evaluateSLO(sloName, slo);
      }
    }
  }

  /**
   * Check if metric is relevant to SLO
   */
  isMetricRelevant(sloName, metricName) {
    const relevantMetrics = {
      finalize_success_rate: ['finalization_success'],
      finalize_latency_p95: ['finalization_latency'],
      answer_latency_p95: ['answer_latency'],
      bank_defect_rate: ['bank_defects'],
      qa_flags_spike: ['qa_flags']
    };

    return relevantMetrics[sloName]?.includes(metricName) || false;
  }

  /**
   * Evaluate SLO
   */
  evaluateSLO(sloName, slo) {
    const currentValue = this.calculateSLOValue(sloName, slo);
    const threshold = this.getCurrentThreshold(sloName, slo);

    if (currentValue !== null && this.isSLOViolated(sloName, currentValue, threshold)) {
      this.triggerAlert(sloName, slo, currentValue, threshold);
    }
  }

  /**
   * Calculate SLO value
   */
  calculateSLOValue(sloName, slo) {
    const now = Date.now();
    const windowStart = now - slo.window_ms;

    switch (slo.measurement) {
      case 'success_rate':
        return this.calculateSuccessRate(windowStart, now);
      case 'latency_p95':
        return this.calculateLatencyP95(windowStart, now);
      case 'error_rate':
        return this.calculateErrorRate(windowStart, now);
      case 'qa_flags_rate':
        return this.calculateQAFlagsRate(windowStart, now);
      default:
        return null;
    }
  }

  /**
   * Calculate success rate
   */
  calculateSuccessRate(windowStart, windowEnd) {
    const successMetrics = this.getMetricsInWindow('finalization_success', windowStart, windowEnd);
    
    if (successMetrics.length === 0) {
      return null;
    }

    const successes = successMetrics.filter(m => m.value === 1).length;
    return successes / successMetrics.length;
  }

  /**
   * Calculate latency P95
   */
  calculateLatencyP95(windowStart, windowEnd) {
    const latencyMetrics = this.getMetricsInWindow('finalization_latency', windowStart, windowEnd);
    
    if (latencyMetrics.length === 0) {
      return null;
    }

    const values = latencyMetrics.map(m => m.value).sort((a, b) => a - b);
    const p95Index = Math.floor(values.length * 0.95);
    return values[p95Index];
  }

  /**
   * Calculate error rate
   */
  calculateErrorRate(windowStart, windowEnd) {
    const errorMetrics = this.getMetricsInWindow('bank_defects', windowStart, windowEnd);
    const totalMetrics = this.getMetricsInWindow('finalization_success', windowStart, windowEnd);
    
    if (totalMetrics.length === 0) {
      return null;
    }

    return errorMetrics.length / totalMetrics.length;
  }

  /**
   * Calculate QA flags rate
   */
  calculateQAFlagsRate(windowStart, windowEnd) {
    const qaFlagMetrics = this.getMetricsInWindow('qa_flags', windowStart, windowEnd);
    const totalMetrics = this.getMetricsInWindow('finalization_success', windowStart, windowEnd);
    
    if (totalMetrics.length === 0) {
      return null;
    }

    return qaFlagMetrics.length / totalMetrics.length;
  }

  /**
   * Get metrics in time window
   */
  getMetricsInWindow(metricName, windowStart, windowEnd) {
    const metrics = this.metrics.get(metricName) || [];
    return metrics.filter(m => m.timestamp >= windowStart && m.timestamp <= windowEnd);
  }

  /**
   * Get current threshold
   */
  getCurrentThreshold(sloName, slo) {
    // Check if we're in a critical state
    const recentAlerts = this.alertHistory.filter(a => 
      a.slo_name === sloName && 
      a.severity === 'critical' && 
      Date.now() - a.timestamp < 30 * 60 * 1000 // Last 30 minutes
    );

    if (recentAlerts.length > 0) {
      return slo.critical_threshold;
    }

    return slo.alert_threshold;
  }

  /**
   * Check if SLO is violated
   */
  isSLOViolated(sloName, currentValue, threshold) {
    const slo = this.slos[sloName];
    
    switch (sloName) {
      case 'finalize_success_rate':
        return currentValue < threshold;
      case 'finalize_latency_p95':
      case 'answer_latency_p95':
        return currentValue > threshold;
      case 'bank_defect_rate':
      case 'qa_flags_spike':
        return currentValue > threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(sloName, slo, currentValue, threshold) {
    const severity = this.determineSeverity(sloName, currentValue, threshold);
    const alertId = `${sloName}_${Date.now()}`;
    
    const alert = {
      id: alertId,
      slo_name: sloName,
      severity: severity,
      current_value: currentValue,
      threshold: threshold,
      target: slo.target,
      timestamp: Date.now(),
      message: this.generateAlertMessage(sloName, currentValue, threshold, severity),
      status: 'active'
    };

    this.alerts.set(alertId, alert);
    this.alertHistory.push(alert);

    console.log(`🚨 ALERT: ${alert.message}`);
    
    // Send alert notification
    this.sendAlertNotification(alert);
  }

  /**
   * Determine alert severity
   */
  determineSeverity(sloName, currentValue, threshold) {
    const slo = this.slos[sloName];
    
    if (sloName === 'finalize_success_rate') {
      return currentValue < slo.critical_threshold ? 'critical' : 'warning';
    } else if (sloName === 'finalize_latency_p95' || sloName === 'answer_latency_p95') {
      return currentValue > slo.critical_threshold ? 'critical' : 'warning';
    } else if (sloName === 'bank_defect_rate' || sloName === 'qa_flags_spike') {
      return currentValue > slo.critical_threshold ? 'critical' : 'warning';
    }
    
    return 'warning';
  }

  /**
   * Generate alert message
   */
  generateAlertMessage(sloName, currentValue, threshold, severity) {
    const slo = this.slos[sloName];
    const severityEmoji = severity === 'critical' ? '🔴' : '🟡';
    
    switch (sloName) {
      case 'finalize_success_rate':
        return `${severityEmoji} Finalize success rate is ${(currentValue * 100).toFixed(2)}% (threshold: ${(threshold * 100).toFixed(2)}%, target: ${(slo.target * 100).toFixed(2)}%)`;
      case 'finalize_latency_p95':
        return `${severityEmoji} Finalize latency P95 is ${currentValue.toFixed(2)}ms (threshold: ${threshold}ms, target: ${slo.target}ms)`;
      case 'answer_latency_p95':
        return `${severityEmoji} Answer latency P95 is ${currentValue.toFixed(2)}ms (threshold: ${threshold}ms, target: ${slo.target}ms)`;
      case 'bank_defect_rate':
        return `${severityEmoji} Bank defect rate is ${(currentValue * 100).toFixed(3)}% (threshold: ${(threshold * 100).toFixed(3)}%, target: ${(slo.target * 100).toFixed(3)}%)`;
      case 'qa_flags_spike':
        return `${severityEmoji} QA flags rate is ${(currentValue * 100).toFixed(3)}% (threshold: ${(threshold * 100).toFixed(3)}%, target: ${(slo.target * 100).toFixed(3)}%)`;
      default:
        return `${severityEmoji} SLO violation: ${sloName}`;
    }
  }

  /**
   * Send alert notification
   */
  sendAlertNotification(alert) {
    // This would integrate with actual alerting systems
    // For now, just log the alert
    console.log(`Alert notification sent: ${alert.id}`);
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId, acknowledgedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'acknowledged';
      alert.acknowledged_by = acknowledgedBy;
      alert.acknowledged_at = Date.now();
    }
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId, resolvedBy) {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolved_by = resolvedBy;
      alert.resolved_at = Date.now();
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts() {
    return Array.from(this.alerts.values()).filter(a => a.status === 'active');
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get SLO status
   */
  getSLOStatus() {
    const status = {};
    
    for (const [sloName, slo] of Object.entries(this.slos)) {
      const currentValue = this.calculateSLOValue(sloName, slo);
      const threshold = this.getCurrentThreshold(sloName, slo);
      
      status[sloName] = {
        target: slo.target,
        current_value: currentValue,
        threshold: threshold,
        status: currentValue !== null && this.isSLOViolated(sloName, currentValue, threshold) ? 'violated' : 'healthy',
        window_ms: slo.window_ms
      };
    }
    
    return status;
  }

  /**
   * Clean up old metrics
   */
  cleanupOldMetrics(metricName, maxAge) {
    const metrics = this.metrics.get(metricName);
    if (!metrics) return;

    const cutoff = Date.now() - maxAge;
    const filtered = metrics.filter(m => m.timestamp > cutoff);
    this.metrics.set(metricName, filtered);
  }

  /**
   * Clean up old alerts
   */
  cleanupOldAlerts(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 days
    const cutoff = Date.now() - maxAge;
    
    // Remove old alerts from active alerts
    for (const [alertId, alert] of this.alerts.entries()) {
      if (alert.timestamp < cutoff) {
        this.alerts.delete(alertId);
      }
    }
    
    // Remove old alerts from history
    this.alertHistory = this.alertHistory.filter(a => a.timestamp > cutoff);
  }

  /**
   * Get health summary
   */
  getHealthSummary() {
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
    const warningAlerts = activeAlerts.filter(a => a.severity === 'warning');
    
    const sloStatus = this.getSLOStatus();
    const violatedSLOs = Object.values(sloStatus).filter(s => s.status === 'violated').length;
    
    return {
      overall_status: criticalAlerts.length > 0 ? 'critical' : 
                     warningAlerts.length > 0 ? 'warning' : 'healthy',
      active_alerts: activeAlerts.length,
      critical_alerts: criticalAlerts.length,
      warning_alerts: warningAlerts.length,
      violated_slos: violatedSLOs,
      total_slos: Object.keys(this.slos).length,
      slo_status: sloStatus
    };
  }

  /**
   * Export SLO configuration
   */
  exportSLOConfiguration() {
    return {
      schema: 'slos.v1',
      slos: this.slos,
      active_alerts: this.getActiveAlerts(),
      health_summary: this.getHealthSummary()
    };
  }
}

module.exports = SLOsManager;
