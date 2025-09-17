/**
 * Replay Audit Store - Batch 5 Implementation
 * 
 * Features:
 * - Compliance tracking for N days
 * - Replay audit records
 * - MATCH/MISMATCH detection
 * - Audit data management
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const AUDIT_DIR = path.join(__dirname, '..', 'replays', 'audits');
const RETENTION_DAYS = 90; // Default retention period

// Ensure audit directory exists
if (!fs.existsSync(AUDIT_DIR)) {
  fs.mkdirSync(AUDIT_DIR, { recursive: true });
}

/**
 * Create replay audit record
 */
function createReplayAudit(replayId, bankId, bankHash, payloadHash, finalSnapshotHash, result) {
  const audit = {
    replay_id: replayId,
    bank_id: bankId,
    bank_hash_sha256: bankHash,
    payload_hash: payloadHash,
    final_snapshot_hash: finalSnapshotHash,
    result: result, // MATCH or MISMATCH
    created_at: new Date().toISOString(),
    retention_until: new Date(Date.now() + (RETENTION_DAYS * 24 * 60 * 60 * 1000)).toISOString()
  };
  
  return audit;
}

/**
 * Save replay audit
 */
function saveReplayAudit(audit, filename = null) {
  if (!filename) {
    filename = `audit_${audit.replay_id}_${Date.now()}.json`;
  }
  
  const filePath = path.join(AUDIT_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(audit, null, 2));
  
  return filePath;
}

/**
 * Load replay audit
 */
function loadReplayAudit(filename) {
  const filePath = path.join(AUDIT_DIR, filename);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Audit file not found: ${filename}`);
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Find replay audit by replay ID
 */
function findReplayAudit(replayId) {
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(file => file.startsWith(`audit_${replayId}_`))
    .sort();
  
  if (files.length === 0) {
    return null;
  }
  
  // Return the most recent audit
  const latestFile = files[files.length - 1];
  return loadReplayAudit(latestFile);
}

/**
 * List all replay audits
 */
function listReplayAudits(options = {}) {
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(file => file.endsWith('.json'))
    .sort();
  
  const audits = files.map(file => {
    try {
      return loadReplayAudit(file);
    } catch (error) {
      console.warn(`Warning: Failed to load audit ${file}: ${error.message}`);
      return null;
    }
  }).filter(audit => audit !== null);
  
  // Apply filters
  if (options.bank_id) {
    return audits.filter(audit => audit.bank_id === options.bank_id);
  }
  
  if (options.result) {
    return audits.filter(audit => audit.result === options.result);
  }
  
  if (options.since) {
    const sinceDate = new Date(options.since);
    return audits.filter(audit => new Date(audit.created_at) >= sinceDate);
  }
  
  return audits;
}

/**
 * Get audit statistics
 */
function getAuditStatistics(audits = null) {
  if (!audits) {
    audits = listReplayAudits();
  }
  
  const stats = {
    total_audits: audits.length,
    matches: audits.filter(a => a.result === 'MATCH').length,
    mismatches: audits.filter(a => a.result === 'MISMATCH').length,
    by_bank: {},
    by_date: {},
    retention_status: {
      within_retention: 0,
      expired: 0
    }
  };
  
  const now = new Date();
  
  for (const audit of audits) {
    // Count by bank
    stats.by_bank[audit.bank_id] = (stats.by_bank[audit.bank_id] || 0) + 1;
    
    // Count by date
    const date = audit.created_at.split('T')[0];
    stats.by_date[date] = (stats.by_date[date] || 0) + 1;
    
    // Check retention status
    const retentionUntil = new Date(audit.retention_until);
    if (now <= retentionUntil) {
      stats.retention_status.within_retention++;
    } else {
      stats.retention_status.expired++;
    }
  }
  
  return stats;
}

/**
 * Clean up expired audits
 */
function cleanupExpiredAudits() {
  const audits = listReplayAudits();
  const now = new Date();
  let cleanedCount = 0;
  
  for (const audit of audits) {
    const retentionUntil = new Date(audit.retention_until);
    
    if (now > retentionUntil) {
      try {
        const filename = `audit_${audit.replay_id}_${new Date(audit.created_at).getTime()}.json`;
        const filePath = path.join(AUDIT_DIR, filename);
        
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`Warning: Failed to delete expired audit ${audit.replay_id}: ${error.message}`);
      }
    }
  }
  
  return cleanedCount;
}

/**
 * Export audit data
 */
function exportAuditData(options = {}) {
  const audits = listReplayAudits(options);
  const stats = getAuditStatistics(audits);
  
  return {
    audits,
    statistics: stats,
    export_options: options,
    exported_at: new Date().toISOString()
  };
}

/**
 * Validate audit record
 */
function validateAuditRecord(audit) {
  const errors = [];
  
  if (!audit.replay_id) {
    errors.push('Missing replay_id');
  }
  
  if (!audit.bank_id) {
    errors.push('Missing bank_id');
  }
  
  if (!audit.bank_hash_sha256) {
    errors.push('Missing bank_hash_sha256');
  }
  
  if (!audit.payload_hash) {
    errors.push('Missing payload_hash');
  }
  
  if (!audit.final_snapshot_hash) {
    errors.push('Missing final_snapshot_hash');
  }
  
  if (!audit.result || !['MATCH', 'MISMATCH'].includes(audit.result)) {
    errors.push('Invalid result (must be MATCH or MISMATCH)');
  }
  
  if (!audit.created_at) {
    errors.push('Missing created_at');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate audit report
 */
function generateAuditReport(options = {}) {
  const audits = listReplayAudits(options);
  const stats = getAuditStatistics(audits);
  
  const report = {
    schema: 'audit_report.v1',
    generated_at: new Date().toISOString(),
    filter_options: options,
    summary: {
      total_audits: stats.total_audits,
      match_rate: stats.total_audits > 0 ? (stats.matches / stats.total_audits * 100).toFixed(2) + '%' : '0%',
      mismatch_rate: stats.total_audits > 0 ? (stats.mismatches / stats.total_audits * 100).toFixed(2) + '%' : '0%'
    },
    statistics: stats,
    recommendations: []
  };
  
  // Generate recommendations
  if (stats.mismatches > 0) {
    report.recommendations.push('Investigate mismatch cases for potential issues');
  }
  
  if (stats.retention_status.expired > 0) {
    report.recommendations.push('Run cleanup to remove expired audits');
  }
  
  if (stats.total_audits === 0) {
    report.recommendations.push('No audits found - consider running replay tests');
  }
  
  return report;
}

/**
 * Search audits
 */
function searchAudits(query) {
  const audits = listReplayAudits();
  
  return audits.filter(audit => {
    // Search in replay_id
    if (query.replay_id && !audit.replay_id.includes(query.replay_id)) {
      return false;
    }
    
    // Search in bank_id
    if (query.bank_id && !audit.bank_id.includes(query.bank_id)) {
      return false;
    }
    
    // Search in result
    if (query.result && audit.result !== query.result) {
      return false;
    }
    
    // Search in date range
    if (query.start_date) {
      const startDate = new Date(query.start_date);
      if (new Date(audit.created_at) < startDate) {
        return false;
      }
    }
    
    if (query.end_date) {
      const endDate = new Date(query.end_date);
      if (new Date(audit.created_at) > endDate) {
        return false;
      }
    }
    
    return true;
  });
}

/**
 * Get audit by ID
 */
function getAuditById(auditId) {
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(file => file.includes(auditId))
    .sort();
  
  if (files.length === 0) {
    return null;
  }
  
  return loadReplayAudit(files[0]);
}

/**
 * Update audit record
 */
function updateAuditRecord(auditId, updates) {
  const audit = getAuditById(auditId);
  if (!audit) {
    throw new Error(`Audit not found: ${auditId}`);
  }
  
  const updatedAudit = {
    ...audit,
    ...updates,
    updated_at: new Date().toISOString()
  };
  
  const filename = `audit_${audit.replay_id}_${new Date(audit.created_at).getTime()}.json`;
  saveReplayAudit(updatedAudit, filename);
  
  return updatedAudit;
}

/**
 * Delete audit record
 */
function deleteAuditRecord(auditId) {
  const files = fs.readdirSync(AUDIT_DIR)
    .filter(file => file.includes(auditId));
  
  if (files.length === 0) {
    throw new Error(`Audit not found: ${auditId}`);
  }
  
  for (const file of files) {
    const filePath = path.join(AUDIT_DIR, file);
    fs.unlinkSync(filePath);
  }
  
  return true;
}

module.exports = {
  createReplayAudit,
  saveReplayAudit,
  loadReplayAudit,
  findReplayAudit,
  listReplayAudits,
  getAuditStatistics,
  cleanupExpiredAudits,
  exportAuditData,
  validateAuditRecord,
  generateAuditReport,
  searchAudits,
  getAuditById,
  updateAuditRecord,
  deleteAuditRecord
};
