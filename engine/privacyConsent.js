/**
 * Privacy & Consent Hooks - Batch 5 Implementation
 * 
 * Features:
 * - Consent version tracking
 * - Privacy flags for data export gating
 * - HTTP 403 responses for restricted exports
 * - Privacy-compliant data handling
 */

/**
 * Privacy flags
 */
const PRIVACY_FLAGS = {
  ALLOW_EXPORT: 'allow_export',
  ALLOW_ANALYTICS: 'allow_analytics',
  ALLOW_REPLAY: 'allow_replay',
  ALLOW_AGGREGATION: 'allow_aggregation'
};

/**
 * Consent versions
 */
const CONSENT_VERSIONS = {
  V1: 1,
  V2: 2,
  V3: 3
};

/**
 * Default privacy settings
 */
const DEFAULT_PRIVACY_SETTINGS = {
  consent_version: CONSENT_VERSIONS.V1,
  privacy_flags: {
    [PRIVACY_FLAGS.ALLOW_EXPORT]: false,
    [PRIVACY_FLAGS.ALLOW_ANALYTICS]: false,
    [PRIVACY_FLAGS.ALLOW_REPLAY]: false,
    [PRIVACY_FLAGS.ALLOW_AGGREGATION]: false
  }
};

/**
 * Create privacy context for session
 */
function createPrivacyContext(sessionId, consentVersion = CONSENT_VERSIONS.V1, privacyFlags = {}) {
  const context = {
    session_id: sessionId,
    consent_version: consentVersion,
    privacy_flags: {
      ...DEFAULT_PRIVACY_SETTINGS.privacy_flags,
      ...privacyFlags
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  
  return context;
}

/**
 * Update privacy context
 */
function updatePrivacyContext(context, updates) {
  const updatedContext = {
    ...context,
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  return updatedContext;
}

/**
 * Check if privacy flag is enabled
 */
function isPrivacyFlagEnabled(context, flag) {
  if (!context || !context.privacy_flags) {
    return false;
  }
  
  return context.privacy_flags[flag] === true;
}

/**
 * Check if export is allowed
 */
function isExportAllowed(context) {
  return isPrivacyFlagEnabled(context, PRIVACY_FLAGS.ALLOW_EXPORT);
}

/**
 * Check if analytics is allowed
 */
function isAnalyticsAllowed(context) {
  return isPrivacyFlagEnabled(context, PRIVACY_FLAGS.ALLOW_ANALYTICS);
}

/**
 * Check if replay is allowed
 */
function isReplayAllowed(context) {
  return isPrivacyFlagEnabled(context, PRIVACY_FLAGS.ALLOW_REPLAY);
}

/**
 * Check if aggregation is allowed
 */
function isAggregationAllowed(context) {
  return isPrivacyFlagEnabled(context, PRIVACY_FLAGS.ALLOW_AGGREGATION);
}

/**
 * Create privacy-compliant response
 */
function createPrivacyResponse(context, data, exportType) {
  if (!isExportAllowed(context)) {
    return {
      error: 'PRIVACY_RESTRICTED',
      message: 'Data export not allowed due to privacy settings',
      code: 403,
      hint: 'User consent required for data export'
    };
  }
  
  // Filter data based on privacy flags
  const filteredData = filterDataByPrivacyFlags(data, context);
  
  return {
    data: filteredData,
    privacy_context: {
      consent_version: context.consent_version,
      export_type: exportType,
      exported_at: new Date().toISOString()
    }
  };
}

/**
 * Filter data based on privacy flags
 */
function filterDataByPrivacyFlags(data, context) {
  const filteredData = { ...data };
  
  // Remove sensitive fields if analytics not allowed
  if (!isAnalyticsAllowed(context)) {
    delete filteredData.analytics;
    delete filteredData.telemetry;
    delete filteredData.metrics;
  }
  
  // Remove replay data if replay not allowed
  if (!isReplayAllowed(context)) {
    delete filteredData.replay_data;
    delete filteredData.session_replay;
  }
  
  // Remove aggregation data if aggregation not allowed
  if (!isAggregationAllowed(context)) {
    delete filteredData.aggregation_data;
    delete filteredData.cross_session_data;
  }
  
  return filteredData;
}

/**
 * Create consent request
 */
function createConsentRequest(sessionId, requestedFlags) {
  return {
    session_id: sessionId,
    requested_flags: requestedFlags,
    consent_required: true,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
  };
}

/**
 * Process consent response
 */
function processConsentResponse(context, consentResponse) {
  if (!consentResponse.granted) {
    return {
      ...context,
      privacy_flags: {
        ...context.privacy_flags,
        [PRIVACY_FLAGS.ALLOW_EXPORT]: false,
        [PRIVACY_FLAGS.ALLOW_ANALYTICS]: false,
        [PRIVACY_FLAGS.ALLOW_REPLAY]: false,
        [PRIVACY_FLAGS.ALLOW_AGGREGATION]: false
      }
    };
  }
  
  const updatedFlags = { ...context.privacy_flags };
  
  for (const flag of consentResponse.granted_flags || []) {
    if (Object.values(PRIVACY_FLAGS).includes(flag)) {
      updatedFlags[flag] = true;
    }
  }
  
  return {
    ...context,
    privacy_flags: updatedFlags,
    consent_granted_at: new Date().toISOString()
  };
}

/**
 * Validate privacy context
 */
function validatePrivacyContext(context) {
  const errors = [];
  
  if (!context.session_id) {
    errors.push('Missing session_id');
  }
  
  if (!context.consent_version) {
    errors.push('Missing consent_version');
  }
  
  if (!context.privacy_flags) {
    errors.push('Missing privacy_flags');
  }
  
  if (context.privacy_flags) {
    for (const flag of Object.values(PRIVACY_FLAGS)) {
      if (typeof context.privacy_flags[flag] !== 'boolean') {
        errors.push(`Invalid privacy flag ${flag}: must be boolean`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Create privacy audit log
 */
function createPrivacyAuditLog(context, action, details = {}) {
  return {
    session_id: context.session_id,
    action,
    details,
    consent_version: context.consent_version,
    privacy_flags: context.privacy_flags,
    timestamp: new Date().toISOString()
  };
}

/**
 * Export privacy-compliant data
 */
function exportPrivacyCompliantData(sessionData, context, exportType) {
  if (!isExportAllowed(context)) {
    throw new Error('Export not allowed due to privacy settings');
  }
  
  const filteredData = filterDataByPrivacyFlags(sessionData, context);
  
  return {
    export_type: exportType,
    data: filteredData,
    privacy_metadata: {
      consent_version: context.consent_version,
      exported_at: new Date().toISOString(),
      privacy_flags: context.privacy_flags
    }
  };
}

/**
 * Get privacy summary
 */
function getPrivacySummary(context) {
  return {
    session_id: context.session_id,
    consent_version: context.consent_version,
    privacy_flags: context.privacy_flags,
    export_allowed: isExportAllowed(context),
    analytics_allowed: isAnalyticsAllowed(context),
    replay_allowed: isReplayAllowed(context),
    aggregation_allowed: isAggregationAllowed(context),
    created_at: context.created_at,
    updated_at: context.updated_at
  };
}

/**
 * Create privacy policy
 */
function createPrivacyPolicy(version = CONSENT_VERSIONS.V1) {
  const policies = {
    [CONSENT_VERSIONS.V1]: {
      version: 1,
      description: 'Basic privacy protection',
      data_retention_days: 30,
      allowed_exports: ['line_verdicts', 'face_states'],
      restricted_exports: ['raw_answers', 'analytics', 'replay_data']
    },
    [CONSENT_VERSIONS.V2]: {
      version: 2,
      description: 'Enhanced privacy protection',
      data_retention_days: 14,
      allowed_exports: ['line_verdicts'],
      restricted_exports: ['face_states', 'raw_answers', 'analytics', 'replay_data']
    },
    [CONSENT_VERSIONS.V3]: {
      version: 3,
      description: 'Maximum privacy protection',
      data_retention_days: 7,
      allowed_exports: [],
      restricted_exports: ['line_verdicts', 'face_states', 'raw_answers', 'analytics', 'replay_data']
    }
  };
  
  return policies[version] || policies[CONSENT_VERSIONS.V1];
}

/**
 * Check data retention compliance
 */
function checkDataRetentionCompliance(context, dataAge) {
  const policy = createPrivacyPolicy(context.consent_version);
  const maxAge = policy.data_retention_days * 24 * 60 * 60 * 1000; // Convert to milliseconds
  
  return {
    compliant: dataAge <= maxAge,
    max_age_days: policy.data_retention_days,
    data_age_days: Math.floor(dataAge / (24 * 60 * 60 * 1000)),
    policy_version: policy.version
  };
}

/**
 * Export privacy utilities
 */
function exportPrivacyUtilities() {
  return {
    PRIVACY_FLAGS,
    CONSENT_VERSIONS,
    DEFAULT_PRIVACY_SETTINGS,
    createPrivacyContext,
    updatePrivacyContext,
    isExportAllowed,
    isAnalyticsAllowed,
    isReplayAllowed,
    isAggregationAllowed,
    createPrivacyResponse,
    filterDataByPrivacyFlags,
    createConsentRequest,
    processConsentResponse,
    validatePrivacyContext,
    createPrivacyAuditLog,
    exportPrivacyCompliantData,
    getPrivacySummary,
    createPrivacyPolicy,
    checkDataRetentionCompliance
  };
}

module.exports = {
  PRIVACY_FLAGS,
  CONSENT_VERSIONS,
  DEFAULT_PRIVACY_SETTINGS,
  createPrivacyContext,
  updatePrivacyContext,
  isExportAllowed,
  isAnalyticsAllowed,
  isReplayAllowed,
  isAggregationAllowed,
  createPrivacyResponse,
  filterDataByPrivacyFlags,
  createConsentRequest,
  processConsentResponse,
  validatePrivacyContext,
  createPrivacyAuditLog,
  exportPrivacyCompliantData,
  getPrivacySummary,
  createPrivacyPolicy,
  checkDataRetentionCompliance,
  exportPrivacyUtilities
};
