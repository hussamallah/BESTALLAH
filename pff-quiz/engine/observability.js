/**
 * Minimal Observability and Logging for Batch 3
 * Provides structured logging and metrics collection
 */

const fs = require('fs');
const path = require('path');

class Observability {
  constructor() {
    this.metrics = {
      sessions: {
        total: 0,
        completed: 0,
        aborted: 0,
        average_duration: 0
      },
      questions: {
        total_served: 0,
        average_response_time: 0
      },
      errors: {
        total: 0,
        by_type: new Map()
      },
      performance: {
        bank_load_time: 0,
        finalization_time: 0
      }
    };
    
    this.logs = [];
    this.maxLogs = 1000; // Keep last 1000 log entries
  }

  /**
   * Log an event with structured data
   * @param {string} level - Log level (info, warn, error, debug)
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  log(level, event, data = {}) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: level,
      event: event,
      data: data,
      session_id: data.session_id || null
    };

    this.logs.push(logEntry);
    
    // Trim logs if over limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output for development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[${level.toUpperCase()}] ${event}:`, data);
    }
  }

  /**
   * Track session metrics
   * @param {string} event - Session event
   * @param {Object} data - Session data
   */
  trackSession(event, data) {
    switch (event) {
      case 'start':
        this.metrics.sessions.total++;
        this.log('info', 'session_started', data);
        break;
      case 'complete':
        this.metrics.sessions.completed++;
        if (data.duration) {
          this._updateAverageDuration(data.duration);
        }
        this.log('info', 'session_completed', data);
        break;
      case 'abort':
        this.metrics.sessions.aborted++;
        this.log('warn', 'session_aborted', data);
        break;
    }
  }

  /**
   * Track question metrics
   * @param {string} event - Question event
   * @param {Object} data - Question data
   */
  trackQuestion(event, data) {
    switch (event) {
      case 'served':
        this.metrics.questions.total_served++;
        this.log('debug', 'question_served', data);
        break;
      case 'answered':
        if (data.response_time) {
          this._updateAverageResponseTime(data.response_time);
        }
        this.log('debug', 'question_answered', data);
        break;
    }
  }

  /**
   * Track error metrics
   * @param {string} errorType - Error type
   * @param {Object} error - Error object
   */
  trackError(errorType, error) {
    this.metrics.errors.total++;
    
    const errorCount = this.metrics.errors.by_type.get(errorType) || 0;
    this.metrics.errors.by_type.set(errorType, errorCount + 1);
    
    this.log('error', 'error_occurred', {
      error_type: errorType,
      error_message: error.message,
      error_code: error.code || null,
      stack: error.stack || null
    });
  }

  /**
   * Track performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   */
  trackPerformance(operation, duration) {
    switch (operation) {
      case 'bank_load':
        this.metrics.performance.bank_load_time = duration;
        break;
      case 'finalization':
        this.metrics.performance.finalization_time = duration;
        break;
    }
    
    this.log('debug', 'performance_metric', {
      operation: operation,
      duration_ms: duration
    });
  }

  /**
   * Get current metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      errors: {
        total: this.metrics.errors.total,
        by_type: Object.fromEntries(this.metrics.errors.by_type)
      }
    };
  }

  /**
   * Get recent logs
   * @param {number} limit - Number of logs to return
   * @returns {Array} Recent log entries
   */
  getRecentLogs(limit = 100) {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by level
   * @param {string} level - Log level to filter by
   * @returns {Array} Filtered log entries
   */
  getLogsByLevel(level) {
    return this.logs.filter(log => log.level === level);
  }

  /**
   * Export logs to file
   * @param {string} filePath - Path to export file
   */
  exportLogs(filePath) {
    const logData = {
      exported_at: new Date().toISOString(),
      total_logs: this.logs.length,
      logs: this.logs
    };
    
    fs.writeFileSync(filePath, JSON.stringify(logData, null, 2));
    this.log('info', 'logs_exported', { file_path: filePath, count: this.logs.length });
  }

  /**
   * Clear all logs and reset metrics
   */
  reset() {
    this.logs = [];
    this.metrics = {
      sessions: { total: 0, completed: 0, aborted: 0, average_duration: 0 },
      questions: { total_served: 0, average_response_time: 0 },
      errors: { total: 0, by_type: new Map() },
      performance: { bank_load_time: 0, finalization_time: 0 }
    };
    
    this.log('info', 'observability_reset', {});
  }

  /**
   * Update average session duration
   * @param {number} duration - New duration
   */
  _updateAverageDuration(duration) {
    const current = this.metrics.sessions.average_duration;
    const count = this.metrics.sessions.completed;
    
    if (count === 1) {
      this.metrics.sessions.average_duration = duration;
    } else {
      this.metrics.sessions.average_duration = (current * (count - 1) + duration) / count;
    }
  }

  /**
   * Update average response time
   * @param {number} responseTime - New response time
   */
  _updateAverageResponseTime(responseTime) {
    const current = this.metrics.questions.average_response_time;
    const count = this.metrics.questions.total_served;
    
    if (count === 1) {
      this.metrics.questions.average_response_time = responseTime;
    } else {
      this.metrics.questions.average_response_time = (current * (count - 1) + responseTime) / count;
    }
  }

  /**
   * Generate health report
   * @returns {Object} Health report
   */
  getHealthReport() {
    const errorRate = this.metrics.sessions.total > 0 
      ? (this.metrics.errors.total / this.metrics.sessions.total) * 100 
      : 0;
    
    const completionRate = this.metrics.sessions.total > 0
      ? (this.metrics.sessions.completed / this.metrics.sessions.total) * 100
      : 0;

    return {
      status: errorRate < 5 && completionRate > 90 ? 'healthy' : 'degraded',
      error_rate: errorRate,
      completion_rate: completionRate,
      total_sessions: this.metrics.sessions.total,
      recent_errors: this.getLogsByLevel('error').length,
      uptime: process.uptime(),
      memory_usage: process.memoryUsage()
    };
  }
}

// Create singleton instance
const observability = new Observability();

module.exports = observability;
