/**
 * Data Retention Policies
 * 
 * Manages data retention policies for different types of data.
 * Required: keep final_snapshots for N days (configurable; default 365).
 * Optional: answers retained for 7–30 days for audit; otherwise purge post-finalize.
 */

class RetentionManager {
  constructor() {
    this.policies = this.initializeRetentionPolicies();
    this.retentionLog = [];
    this.purgeHistory = [];
  }

  /**
   * Initialize retention policies
   */
  initializeRetentionPolicies() {
    return {
      final_snapshots: {
        required: true,
        retention_days: 365,
        description: 'Final snapshots must be kept for compliance and audit',
        purge_after: 'retention_days'
      },
      answers: {
        required: false,
        retention_days: 30,
        description: 'Raw answers kept for audit purposes',
        purge_after: 'retention_days'
      },
      analytics_events: {
        required: false,
        retention_days: 90,
        description: 'Analytics events for monitoring and debugging',
        purge_after: 'retention_days'
      },
      error_logs: {
        required: false,
        retention_days: 30,
        description: 'Error logs for debugging and monitoring',
        purge_after: 'retention_days'
      },
      performance_metrics: {
        required: false,
        retention_days: 7,
        description: 'Performance metrics for monitoring',
        purge_after: 'retention_days'
      },
      session_data: {
        required: false,
        retention_days: 7,
        description: 'Session data for debugging',
        purge_after: 'retention_days'
      },
      cache_data: {
        required: false,
        retention_days: 1,
        description: 'Cache data can be purged frequently',
        purge_after: 'retention_days'
      },
      audit_logs: {
        required: true,
        retention_days: 2555, // 7 years
        description: 'Audit logs must be kept for compliance',
        purge_after: 'retention_days'
      }
    };
  }

  /**
   * Check if data should be retained
   */
  shouldRetain(dataType, createdAt) {
    const policy = this.policies[dataType];
    if (!policy) {
      return true; // Default to retain if no policy
    }

    if (policy.required) {
      return true; // Always retain required data
    }

    const ageInDays = this.calculateAgeInDays(createdAt);
    return ageInDays <= policy.retention_days;
  }

  /**
   * Get data eligible for purging
   */
  getDataEligibleForPurge(dataType, dataList) {
    const policy = this.policies[dataType];
    if (!policy) {
      return [];
    }

    if (policy.required) {
      return []; // Never purge required data
    }

    const cutoffDate = this.getCutoffDate(policy.retention_days);
    return dataList.filter(item => {
      const createdAt = this.extractCreatedAt(item);
      return createdAt < cutoffDate;
    });
  }

  /**
   * Purge expired data
   */
  async purgeExpiredData(dataType, dataList) {
    const eligibleData = this.getDataEligibleForPurge(dataType, dataList);
    
    if (eligibleData.length === 0) {
      return {
        dataType,
        purged: 0,
        retained: dataList.length,
        success: true
      };
    }

    try {
      // Perform actual purge (this would be implemented by the storage layer)
      const purgedCount = await this.performPurge(dataType, eligibleData);
      
      const result = {
        dataType,
        purged: purgedCount,
        retained: dataList.length - purgedCount,
        success: true,
        purged_at: new Date().toISOString()
      };

      this.recordPurgeEvent(dataType, result);
      return result;
    } catch (error) {
      console.error(`Failed to purge ${dataType}:`, error.message);
      return {
        dataType,
        purged: 0,
        retained: dataList.length,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Perform actual purge operation
   */
  async performPurge(dataType, dataToPurge) {
    // This would be implemented by the actual storage layer
    // For now, just return the count
    console.log(`Purging ${dataToPurge.length} ${dataType} records`);
    return dataToPurge.length;
  }

  /**
   * Record purge event
   */
  recordPurgeEvent(dataType, result) {
    const purgeEvent = {
      dataType,
      purged: result.purged,
      retained: result.retained,
      success: result.success,
      purged_at: result.purged_at || new Date().toISOString(),
      error: result.error
    };

    this.purgeHistory.push(purgeEvent);
    this.retentionLog.push({
      timestamp: new Date().toISOString(),
      action: 'purge',
      dataType,
      details: purgeEvent
    });
  }

  /**
   * Calculate age in days
   */
  calculateAgeInDays(createdAt) {
    const now = new Date();
    const created = new Date(createdAt);
    const diffTime = Math.abs(now - created);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Get cutoff date for purging
   */
  getCutoffDate(retentionDays) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    return cutoff;
  }

  /**
   * Extract created at timestamp from data item
   */
  extractCreatedAt(item) {
    // Try different common field names
    const possibleFields = ['created_at', 'createdAt', 'timestamp', 'ts', 'date'];
    
    for (const field of possibleFields) {
      if (item[field]) {
        return new Date(item[field]);
      }
    }
    
    // Default to current time if no timestamp found
    return new Date();
  }

  /**
   * Get retention status for all data types
   */
  getRetentionStatus(dataCounts) {
    const status = {};
    
    for (const [dataType, count] of Object.entries(dataCounts)) {
      const policy = this.policies[dataType];
      if (!policy) {
        status[dataType] = {
          count,
          policy: null,
          status: 'unknown'
        };
        continue;
      }

      status[dataType] = {
        count,
        policy: {
          required: policy.required,
          retention_days: policy.retention_days,
          description: policy.description
        },
        status: policy.required ? 'required' : 'optional'
      };
    }
    
    return status;
  }

  /**
   * Get data eligible for purging by type
   */
  getEligibleForPurgeByType(dataByType) {
    const eligible = {};
    
    for (const [dataType, dataList] of Object.entries(dataByType)) {
      eligible[dataType] = this.getDataEligibleForPurge(dataType, dataList);
    }
    
    return eligible;
  }

  /**
   * Purge all expired data
   */
  async purgeAllExpiredData(dataByType) {
    const results = {};
    
    for (const [dataType, dataList] of Object.entries(dataByType)) {
      results[dataType] = await this.purgeExpiredData(dataType, dataList);
    }
    
    return results;
  }

  /**
   * Update retention policy
   */
  updateRetentionPolicy(dataType, newPolicy) {
    if (!this.policies[dataType]) {
      throw new Error(`Data type not found: ${dataType}`);
    }

    const oldPolicy = { ...this.policies[dataType] };
    this.policies[dataType] = { ...this.policies[dataType], ...newPolicy };
    
    this.retentionLog.push({
      timestamp: new Date().toISOString(),
      action: 'policy_update',
      dataType,
      old_policy: oldPolicy,
      new_policy: this.policies[dataType]
    });
  }

  /**
   * Get retention policy
   */
  getRetentionPolicy(dataType) {
    return this.policies[dataType];
  }

  /**
   * Get all retention policies
   */
  getAllRetentionPolicies() {
    return { ...this.policies };
  }

  /**
   * Validate retention policies
   */
  validateRetentionPolicies() {
    const errors = [];
    
    for (const [dataType, policy] of Object.entries(this.policies)) {
      if (!policy.retention_days || policy.retention_days < 0) {
        errors.push(`Invalid retention_days for ${dataType}: ${policy.retention_days}`);
      }
      
      if (typeof policy.required !== 'boolean') {
        errors.push(`Invalid required flag for ${dataType}: ${policy.required}`);
      }
      
      if (!policy.description) {
        errors.push(`Missing description for ${dataType}`);
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Get retention statistics
   */
  getRetentionStatistics() {
    const totalPurged = this.purgeHistory.reduce((sum, event) => sum + event.purged, 0);
    const totalRetained = this.purgeHistory.reduce((sum, event) => sum + event.retained, 0);
    const successfulPurges = this.purgeHistory.filter(event => event.success).length;
    const failedPurges = this.purgeHistory.filter(event => !event.success).length;
    
    return {
      total_purged: totalPurged,
      total_retained: totalRetained,
      successful_purges: successfulPurges,
      failed_purges: failedPurges,
      purge_success_rate: this.purgeHistory.length > 0 ? 
        successfulPurges / this.purgeHistory.length : 0,
      policies_count: Object.keys(this.policies).length,
      required_policies: Object.values(this.policies).filter(p => p.required).length,
      optional_policies: Object.values(this.policies).filter(p => !p.required).length
    };
  }

  /**
   * Get purge history
   */
  getPurgeHistory(limit = 100) {
    return this.purgeHistory
      .sort((a, b) => new Date(b.purged_at) - new Date(a.purged_at))
      .slice(0, limit);
  }

  /**
   * Get retention log
   */
  getRetentionLog(limit = 100) {
    return this.retentionLog
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Schedule automatic purging
   */
  scheduleAutomaticPurging(intervalMs = 24 * 60 * 60 * 1000) { // 24 hours
    setInterval(async () => {
      console.log('Running scheduled data purging...');
      
      try {
        // This would get data from the actual storage layer
        const dataByType = await this.getDataByType();
        const results = await this.purgeAllExpiredData(dataByType);
        
        console.log('Scheduled purging completed:', results);
      } catch (error) {
        console.error('Scheduled purging failed:', error.message);
      }
    }, intervalMs);
  }

  /**
   * Get data by type (placeholder - would be implemented by storage layer)
   */
  async getDataByType() {
    // This would be implemented by the actual storage layer
    return {
      final_snapshots: [],
      answers: [],
      analytics_events: [],
      error_logs: [],
      performance_metrics: [],
      session_data: [],
      cache_data: [],
      audit_logs: []
    };
  }

  /**
   * Export retention configuration
   */
  exportRetentionConfiguration() {
    return {
      schema: 'retention_policies.v1',
      policies: this.policies,
      statistics: this.getRetentionStatistics(),
      purge_history: this.getPurgeHistory(50),
      retention_log: this.getRetentionLog(50)
    };
  }

  /**
   * Clear retention data
   */
  clearRetentionData() {
    this.retentionLog = [];
    this.purgeHistory = [];
  }

  /**
   * Test retention policies
   */
  testRetentionPolicies() {
    const testData = {
      final_snapshots: [
        { id: 1, created_at: new Date(Date.now() - 400 * 24 * 60 * 60 * 1000).toISOString() }, // 400 days old
        { id: 2, created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() }  // 100 days old
      ],
      answers: [
        { id: 1, created_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString() },  // 50 days old
        { id: 2, created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString() }   // 10 days old
      ]
    };

    const results = {};
    
    for (const [dataType, dataList] of Object.entries(testData)) {
      results[dataType] = {
        total: dataList.length,
        eligible_for_purge: this.getDataEligibleForPurge(dataType, dataList).length,
        should_retain: dataList.map(item => this.shouldRetain(dataType, item.created_at))
      };
    }
    
    return results;
  }
}

module.exports = RetentionManager;
