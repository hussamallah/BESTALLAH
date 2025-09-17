/**
 * Performance Envelope - Batch 5 Implementation
 * 
 * Features:
 * - Latency and memory targets
 * - Performance monitoring
 * - SLO enforcement
 * - Performance regression detection
 */

/**
 * Performance targets (engine only, excluding I/O)
 */
const PERFORMANCE_TARGETS = {
  SUBMIT_ANSWER: {
    avg_ms: 1,
    p95_ms: 5,
    p99_ms: 10,
    max_ms: 20
  },
  FINALIZE_SESSION: {
    avg_ms: 5,
    p95_ms: 20,
    p99_ms: 50,
    max_ms: 100
  },
  MEMORY_PER_SESSION: {
    typical_kb: 64,
    max_kb: 128,
    warning_kb: 96
  },
  THROUGHPUT: {
    min_qps: 1000,
    target_qps: 10000,
    max_qps: 50000
  }
};

/**
 * Performance metrics collector
 */
class PerformanceCollector {
  constructor() {
    this.metrics = {
      submit_answer: [],
      finalize_session: [],
      memory_usage: [],
      throughput: []
    };
    this.startTime = Date.now();
  }
  
  /**
   * Record submit answer performance
   */
  recordSubmitAnswer(duration, memoryUsage) {
    this.metrics.submit_answer.push({
      duration,
      memoryUsage,
      timestamp: Date.now()
    });
  }
  
  /**
   * Record finalize session performance
   */
  recordFinalizeSession(duration, memoryUsage) {
    this.metrics.finalize_session.push({
      duration,
      memoryUsage,
      timestamp: Date.now()
    });
  }
  
  /**
   * Record memory usage
   */
  recordMemoryUsage(usage) {
    this.metrics.memory_usage.push({
      usage,
      timestamp: Date.now()
    });
  }
  
  /**
   * Record throughput
   */
  recordThroughput(operations, duration) {
    const qps = operations / (duration / 1000);
    this.metrics.throughput.push({
      qps,
      operations,
      duration,
      timestamp: Date.now()
    });
  }
  
  /**
   * Get performance summary
   */
  getPerformanceSummary() {
    const summary = {
      submit_answer: this.calculateStats(this.metrics.submit_answer, 'duration'),
      finalize_session: this.calculateStats(this.metrics.finalize_session, 'duration'),
      memory_usage: this.calculateStats(this.metrics.memory_usage, 'usage'),
      throughput: this.calculateStats(this.metrics.throughput, 'qps'),
      uptime_ms: Date.now() - this.startTime
    };
    
    return summary;
  }
  
  /**
   * Calculate statistics for a metric
   */
  calculateStats(data, field) {
    if (data.length === 0) {
      return { count: 0, avg: 0, p95: 0, p99: 0, max: 0, min: 0 };
    }
    
    const values = data.map(d => d[field]).sort((a, b) => a - b);
    const count = values.length;
    const avg = values.reduce((sum, val) => sum + val, 0) / count;
    const p95 = values[Math.floor(count * 0.95)];
    const p99 = values[Math.floor(count * 0.99)];
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    return { count, avg, p95, p99, max, min };
  }
  
  /**
   * Check if performance meets targets
   */
  checkPerformanceTargets() {
    const summary = this.getPerformanceSummary();
    const violations = [];
    
    // Check submit answer targets
    const submitTargets = PERFORMANCE_TARGETS.SUBMIT_ANSWER;
    if (summary.submit_answer.avg > submitTargets.avg_ms) {
      violations.push({
        metric: 'submit_answer_avg',
        actual: summary.submit_answer.avg,
        target: submitTargets.avg_ms,
        severity: 'HIGH'
      });
    }
    if (summary.submit_answer.p95 > submitTargets.p95_ms) {
      violations.push({
        metric: 'submit_answer_p95',
        actual: summary.submit_answer.p95,
        target: submitTargets.p95_ms,
        severity: 'HIGH'
      });
    }
    
    // Check finalize session targets
    const finalizeTargets = PERFORMANCE_TARGETS.FINALIZE_SESSION;
    if (summary.finalize_session.avg > finalizeTargets.avg_ms) {
      violations.push({
        metric: 'finalize_session_avg',
        actual: summary.finalize_session.avg,
        target: finalizeTargets.avg_ms,
        severity: 'HIGH'
      });
    }
    if (summary.finalize_session.p95 > finalizeTargets.p95_ms) {
      violations.push({
        metric: 'finalize_session_p95',
        actual: summary.finalize_session.p95,
        target: finalizeTargets.p95_ms,
        severity: 'HIGH'
      });
    }
    
    // Check memory targets
    const memoryTargets = PERFORMANCE_TARGETS.MEMORY_PER_SESSION;
    if (summary.memory_usage.avg > memoryTargets.typical_kb) {
      violations.push({
        metric: 'memory_usage_avg',
        actual: summary.memory_usage.avg,
        target: memoryTargets.typical_kb,
        severity: 'MEDIUM'
      });
    }
    if (summary.memory_usage.max > memoryTargets.max_kb) {
      violations.push({
        metric: 'memory_usage_max',
        actual: summary.memory_usage.max,
        target: memoryTargets.max_kb,
        severity: 'HIGH'
      });
    }
    
    return {
      meets_targets: violations.length === 0,
      violations,
      summary
    };
  }
}

/**
 * Performance monitor singleton
 */
let performanceCollector = null;

/**
 * Get performance collector instance
 */
function getPerformanceCollector() {
  if (!performanceCollector) {
    performanceCollector = new PerformanceCollector();
  }
  return performanceCollector;
}

/**
 * Reset performance collector
 */
function resetPerformanceCollector() {
  performanceCollector = new PerformanceCollector();
}

/**
 * Measure function execution time
 */
function measureExecution(func, context, ...args) {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  try {
    const result = func.apply(context, args);
    
    // If result is a promise, wait for it
    if (result && typeof result.then === 'function') {
      return result.then(res => {
        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
        
        getPerformanceCollector().recordSubmitAnswer(duration, memoryUsage);
        
        return res;
      });
    } else {
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
      
      getPerformanceCollector().recordSubmitAnswer(duration, memoryUsage);
      
      return result;
    }
  } catch (error) {
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
    
    getPerformanceCollector().recordSubmitAnswer(duration, memoryUsage);
    
    throw error;
  }
}

/**
 * Measure finalize session performance
 */
function measureFinalizeSession(func, context, ...args) {
  const start = process.hrtime.bigint();
  const startMemory = process.memoryUsage();
  
  try {
    const result = func.apply(context, args);
    
    if (result && typeof result.then === 'function') {
      return result.then(res => {
        const end = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        
        const duration = Number(end - start) / 1000000; // Convert to milliseconds
        const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
        
        getPerformanceCollector().recordFinalizeSession(duration, memoryUsage);
        
        return res;
      });
    } else {
      const end = process.hrtime.bigint();
      const endMemory = process.memoryUsage();
      
      const duration = Number(end - start) / 1000000; // Convert to milliseconds
      const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
      
      getPerformanceCollector().recordFinalizeSession(duration, memoryUsage);
      
      return result;
    }
  } catch (error) {
    const end = process.hrtime.bigint();
    const endMemory = process.memoryUsage();
    
    const duration = Number(end - start) / 1000000; // Convert to milliseconds
    const memoryUsage = (endMemory.heapUsed - startMemory.heapUsed) / 1024; // Convert to KB
    
    getPerformanceCollector().recordFinalizeSession(duration, memoryUsage);
    
    throw error;
  }
}

/**
 * Check if performance is within acceptable limits
 */
function checkPerformanceLimits() {
  const collector = getPerformanceCollector();
  return collector.checkPerformanceTargets();
}

/**
 * Generate performance report
 */
function generatePerformanceReport() {
  const collector = getPerformanceCollector();
  const summary = collector.getPerformanceSummary();
  const targets = collector.checkPerformanceTargets();
  
  return {
    schema: 'performance_report.v1',
    generated_at: new Date().toISOString(),
    targets: PERFORMANCE_TARGETS,
    summary,
    compliance: targets,
    recommendations: generatePerformanceRecommendations(summary, targets)
  };
}

/**
 * Generate performance recommendations
 */
function generatePerformanceRecommendations(summary, compliance) {
  const recommendations = [];
  
  if (!compliance.meets_targets) {
    recommendations.push('Performance targets not met - investigate bottlenecks');
  }
  
  if (summary.submit_answer.avg > PERFORMANCE_TARGETS.SUBMIT_ANSWER.avg_ms * 0.8) {
    recommendations.push('Submit answer performance approaching limits - consider optimization');
  }
  
  if (summary.finalize_session.avg > PERFORMANCE_TARGETS.FINALIZE_SESSION.avg_ms * 0.8) {
    recommendations.push('Finalize session performance approaching limits - consider optimization');
  }
  
  if (summary.memory_usage.avg > PERFORMANCE_TARGETS.MEMORY_PER_SESSION.typical_kb * 0.8) {
    recommendations.push('Memory usage approaching limits - consider memory optimization');
  }
  
  if (summary.throughput.avg < PERFORMANCE_TARGETS.THROUGHPUT.target_qps * 0.5) {
    recommendations.push('Throughput below target - consider scaling or optimization');
  }
  
  return recommendations;
}

/**
 * Monitor performance in real-time
 */
function startPerformanceMonitoring(intervalMs = 10000) {
  const interval = setInterval(() => {
    const compliance = checkPerformanceLimits();
    
    if (!compliance.meets_targets) {
      console.warn('Performance targets not met:', compliance.violations);
    }
    
    // Log performance summary every minute
    if (Date.now() % 60000 < intervalMs) {
      const summary = getPerformanceCollector().getPerformanceSummary();
      console.log('Performance summary:', {
        submit_answer_avg: summary.submit_answer.avg.toFixed(2) + 'ms',
        finalize_session_avg: summary.finalize_session.avg.toFixed(2) + 'ms',
        memory_usage_avg: summary.memory_usage.avg.toFixed(2) + 'KB'
      });
    }
  }, intervalMs);
  
  return interval;
}

/**
 * Stop performance monitoring
 */
function stopPerformanceMonitoring(interval) {
  if (interval) {
    clearInterval(interval);
  }
}

/**
 * Export performance data
 */
function exportPerformanceData() {
  const collector = getPerformanceCollector();
  const summary = collector.getPerformanceSummary();
  const compliance = collector.checkPerformanceTargets();
  
  return {
    targets: PERFORMANCE_TARGETS,
    summary,
    compliance,
    exported_at: new Date().toISOString()
  };
}

module.exports = {
  PERFORMANCE_TARGETS,
  PerformanceCollector,
  getPerformanceCollector,
  resetPerformanceCollector,
  measureExecution,
  measureFinalizeSession,
  checkPerformanceLimits,
  generatePerformanceReport,
  startPerformanceMonitoring,
  stopPerformanceMonitoring,
  exportPerformanceData
};
