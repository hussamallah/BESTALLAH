/**
 * Incident Playbook - Batch 5 Implementation
 * 
 * Features:
 * - Incident triggers and detection
 * - Data toggles for freeze/rollback
 * - Incident reporting
 * - Recovery procedures
 */

/**
 * Incident triggers
 */
const INCIDENT_TRIGGERS = {
  E_BANK_DEFECT_RUNTIME: {
    threshold: 0,
    description: 'Bank defect runtime errors detected',
    severity: 'HIGH'
  },
  QA_FLAGS_RATE_DOUBLE: {
    threshold: 2.0,
    description: 'QA flags rate doubles',
    severity: 'MEDIUM'
  },
  FINALIZE_SUCCESS_DIP: {
    threshold: 0.95,
    description: 'Finalize success rate below SLO',
    severity: 'HIGH'
  }
};

/**
 * Incident actions
 */
const INCIDENT_ACTIONS = {
  FREEZE_BANK: 'freeze',
  ROLLBACK_BANK: 'rollback',
  MARK_SESSIONS_INVALID: 'mark_invalid',
  ALERT_TEAM: 'alert_team',
  ESCALATE: 'escalate'
};

/**
 * Incident severity levels
 */
const SEVERITY_LEVELS = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4
};

/**
 * Check for incident triggers
 */
function checkIncidentTriggers(metrics) {
  const incidents = [];
  
  // Check E_BANK_DEFECT_RUNTIME
  if (metrics.E_BANK_DEFECT_RUNTIME > INCIDENT_TRIGGERS.E_BANK_DEFECT_RUNTIME.threshold) {
    incidents.push({
      type: 'E_BANK_DEFECT_RUNTIME',
      severity: INCIDENT_TRIGGERS.E_BANK_DEFECT_RUNTIME.severity,
      value: metrics.E_BANK_DEFECT_RUNTIME,
      threshold: INCIDENT_TRIGGERS.E_BANK_DEFECT_RUNTIME.threshold,
      description: INCIDENT_TRIGGERS.E_BANK_DEFECT_RUNTIME.description
    });
  }
  
  // Check QA flags rate
  if (metrics.qa_flags_rate && metrics.qa_flags_rate > INCIDENT_TRIGGERS.QA_FLAGS_RATE_DOUBLE.threshold) {
    incidents.push({
      type: 'QA_FLAGS_RATE_DOUBLE',
      severity: INCIDENT_TRIGGERS.QA_FLAGS_RATE_DOUBLE.severity,
      value: metrics.qa_flags_rate,
      threshold: INCIDENT_TRIGGERS.QA_FLAGS_RATE_DOUBLE.threshold,
      description: INCIDENT_TRIGGERS.QA_FLAGS_RATE_DOUBLE.description
    });
  }
  
  // Check finalize success rate
  if (metrics.finalize_success_rate && metrics.finalize_success_rate < INCIDENT_TRIGGERS.FINALIZE_SUCCESS_DIP.threshold) {
    incidents.push({
      type: 'FINALIZE_SUCCESS_DIP',
      severity: INCIDENT_TRIGGERS.FINALIZE_SUCCESS_DIP.severity,
      value: metrics.finalize_success_rate,
      threshold: INCIDENT_TRIGGERS.FINALIZE_SUCCESS_DIP.threshold,
      description: INCIDENT_TRIGGERS.FINALIZE_SUCCESS_DIP.description
    });
  }
  
  return incidents;
}

/**
 * Create incident report
 */
function createIncidentReport(bankId, incidents, actions, affectedSessions = 0) {
  const report = {
    schema: 'incident_report.v1',
    bank_id: bankId,
    started_at: new Date().toISOString(),
    ended_at: null,
    symptoms: incidents.map(i => i.type),
    actions: actions,
    affected_sessions: affectedSessions,
    severity: getHighestSeverity(incidents),
    status: 'ACTIVE'
  };
  
  return report;
}

/**
 * Get highest severity from incidents
 */
function getHighestSeverity(incidents) {
  if (incidents.length === 0) return 'LOW';
  
  const severities = incidents.map(i => i.severity);
  const severityValues = severities.map(s => SEVERITY_LEVELS[s]);
  const maxSeverity = Math.max(...severityValues);
  
  return Object.keys(SEVERITY_LEVELS).find(key => SEVERITY_LEVELS[key] === maxSeverity);
}

/**
 * Freeze bank
 */
function freezeBank(bankId, reason) {
  return {
    action: INCIDENT_ACTIONS.FREEZE_BANK,
    bank_id: bankId,
    reason: reason,
    timestamp: new Date().toISOString(),
    effect: 'Blocks init_session except for replay'
  };
}

/**
 * Rollback bank
 */
function rollbackBank(fromBankId, toBankId, reason) {
  return {
    action: INCIDENT_ACTIONS.ROLLBACK_BANK,
    from_bank: fromBankId,
    to_bank: toBankId,
    reason: reason,
    timestamp: new Date().toISOString(),
    effect: 'Swaps package pointer to previous version'
  };
}

/**
 * Mark sessions as invalid
 */
function markSessionsInvalid(sessionIds, reason) {
  return {
    action: INCIDENT_ACTIONS.MARK_SESSIONS_INVALID,
    session_ids: sessionIds,
    reason: reason,
    timestamp: new Date().toISOString(),
    effect: 'Marks sessions started under bad bank as invalid in metadata'
  };
}

/**
 * Alert team
 */
function alertTeam(incident, severity) {
  return {
    action: INCIDENT_ACTIONS.ALERT_TEAM,
    incident: incident,
    severity: severity,
    timestamp: new Date().toISOString(),
    effect: 'Sends alert to on-call team'
  };
}

/**
 * Escalate incident
 */
function escalateIncident(incident, reason) {
  return {
    action: INCIDENT_ACTIONS.ESCALATE,
    incident: incident,
    reason: reason,
    timestamp: new Date().toISOString(),
    effect: 'Escalates to higher level support'
  };
}

/**
 * Execute incident response
 */
function executeIncidentResponse(incidents, bankId, options = {}) {
  const actions = [];
  
  for (const incident of incidents) {
    switch (incident.type) {
      case 'E_BANK_DEFECT_RUNTIME':
        actions.push(freezeBank(bankId, incident.description));
        actions.push(alertTeam(incident, incident.severity));
        break;
        
      case 'QA_FLAGS_RATE_DOUBLE':
        actions.push(rollbackBank(bankId, options.previousBankId, incident.description));
        actions.push(alertTeam(incident, incident.severity));
        break;
        
      case 'FINALIZE_SUCCESS_DIP':
        actions.push(freezeBank(bankId, incident.description));
        actions.push(escalateIncident(incident, 'Critical service degradation'));
        break;
    }
  }
  
  return actions;
}

/**
 * Resolve incident
 */
function resolveIncident(incidentReport, resolution) {
  return {
    ...incidentReport,
    ended_at: new Date().toISOString(),
    status: 'RESOLVED',
    resolution: resolution,
    resolved_by: resolution.resolved_by,
    resolution_notes: resolution.notes
  };
}

/**
 * Get incident statistics
 */
function getIncidentStatistics(incidentReports) {
  const stats = {
    total_incidents: incidentReports.length,
    active_incidents: incidentReports.filter(r => r.status === 'ACTIVE').length,
    resolved_incidents: incidentReports.filter(r => r.status === 'RESOLVED').length,
    by_severity: {},
    by_type: {},
    average_resolution_time: 0
  };
  
  // Count by severity
  for (const report of incidentReports) {
    const severity = report.severity || 'UNKNOWN';
    stats.by_severity[severity] = (stats.by_severity[severity] || 0) + 1;
  }
  
  // Count by type
  for (const report of incidentReports) {
    for (const symptom of report.symptoms) {
      stats.by_type[symptom] = (stats.by_type[symptom] || 0) + 1;
    }
  }
  
  // Calculate average resolution time
  const resolvedReports = incidentReports.filter(r => r.status === 'RESOLVED' && r.ended_at);
  if (resolvedReports.length > 0) {
    const totalTime = resolvedReports.reduce((sum, report) => {
      const start = new Date(report.started_at);
      const end = new Date(report.ended_at);
      return sum + (end - start);
    }, 0);
    stats.average_resolution_time = totalTime / resolvedReports.length;
  }
  
  return stats;
}

/**
 * Generate incident summary
 */
function generateIncidentSummary(incidentReports) {
  const stats = getIncidentStatistics(incidentReports);
  
  return {
    summary: {
      total_incidents: stats.total_incidents,
      active_incidents: stats.active_incidents,
      resolved_incidents: stats.resolved_incidents
    },
    severity_breakdown: stats.by_severity,
    type_breakdown: stats.by_type,
    average_resolution_time_ms: stats.average_resolution_time,
    generated_at: new Date().toISOString()
  };
}

/**
 * Validate incident report
 */
function validateIncidentReport(report) {
  const errors = [];
  
  if (!report.schema || report.schema !== 'incident_report.v1') {
    errors.push('Invalid schema');
  }
  
  if (!report.bank_id) {
    errors.push('Missing bank_id');
  }
  
  if (!report.started_at) {
    errors.push('Missing started_at');
  }
  
  if (!report.symptoms || !Array.isArray(report.symptoms)) {
    errors.push('Missing or invalid symptoms');
  }
  
  if (!report.actions || !Array.isArray(report.actions)) {
    errors.push('Missing or invalid actions');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Export incident data
 */
function exportIncidentData(incidentReports) {
  return {
    incidents: incidentReports,
    statistics: getIncidentStatistics(incidentReports),
    summary: generateIncidentSummary(incidentReports),
    exported_at: new Date().toISOString()
  };
}

module.exports = {
  INCIDENT_TRIGGERS,
  INCIDENT_ACTIONS,
  SEVERITY_LEVELS,
  checkIncidentTriggers,
  createIncidentReport,
  freezeBank,
  rollbackBank,
  markSessionsInvalid,
  alertTeam,
  escalateIncident,
  executeIncidentResponse,
  resolveIncident,
  getIncidentStatistics,
  generateIncidentSummary,
  validateIncidentReport,
  exportIncidentData
};
