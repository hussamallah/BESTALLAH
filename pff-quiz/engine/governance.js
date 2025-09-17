/**
 * Governance System - Batch 5 Implementation
 * 
 * Features:
 * - Roles and permissions
 * - Promotion checklist
 * - Approval workflows
 * - Promotion records
 */

/**
 * Role definitions
 */
const ROLES = {
  AUTHOR: 'Author',
  QA: 'QA',
  OWNER: 'Owner',
  OBSERVER: 'Observer'
};

/**
 * Permission matrix
 */
const PERMISSIONS = {
  [ROLES.AUTHOR]: [
    'edit_bank_source',
    'create_bank_version',
    'submit_for_qa'
  ],
  [ROLES.QA]: [
    'run_linter',
    'run_calibration',
    'sign_off_qa',
    'generate_qa_dashboard'
  ],
  [ROLES.OWNER]: [
    'approve_promotion',
    'hold_signing_key',
    'freeze_bank',
    'rollback_bank'
  ],
  [ROLES.OBSERVER]: [
    'read_bank',
    'view_reports',
    'view_audits'
  ]
};

/**
 * Promotion checklist requirements
 */
const PROMOTION_CHECKLIST = {
  linter_ok: {
    description: 'Linter ok=true, errors=[]',
    required: true
  },
  calibration_recommendation: {
    description: 'Calibration report recommendation present and not rejected by guardrails',
    required: true
  },
  authoring_qa_summary: {
    description: 'Authoring QA summary shows every face opportunities_total ≥ 6 and signature_opportunities ≥ 2',
    required: true
  },
  bank_diff_acknowledged: {
    description: 'Bank Diff risks acknowledged for deltas vs previous prod',
    required: true
  },
  families_have_cof: {
    description: 'Every family has C/O/F authored',
    required: true
  }
};

/**
 * Check if user has permission
 */
function hasPermission(userRole, permission) {
  const rolePermissions = PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

/**
 * Validate promotion checklist
 */
function validatePromotionChecklist(checklistData) {
  const results = {};
  const errors = [];
  
  for (const [key, requirement] of Object.entries(PROMOTION_CHECKLIST)) {
    const value = checklistData[key];
    
    if (requirement.required && !value) {
      errors.push(`Missing required item: ${requirement.description}`);
      results[key] = { passed: false, error: 'Missing' };
    } else if (value === false) {
      errors.push(`Failed requirement: ${requirement.description}`);
      results[key] = { passed: false, error: 'Failed' };
    } else {
      results[key] = { passed: true };
    }
  }
  
  return {
    passed: errors.length === 0,
    results,
    errors
  };
}

/**
 * Create promotion record
 */
function createPromotionRecord(bankId, fromBank, approvals, metadata) {
  const record = {
    schema: 'promotion_record.v1',
    bank_id: bankId,
    from_bank: fromBank,
    approvals: approvals.map(approval => ({
      role: approval.role,
      user: approval.user,
      ts: approval.ts || new Date().toISOString()
    })),
    calibration_report_hash: metadata.calibration_report_hash,
    authoring_qa_hash: metadata.authoring_qa_hash,
    diff_hash: metadata.diff_hash,
    created_at: new Date().toISOString()
  };
  
  return record;
}

/**
 * Validate promotion record
 */
function validatePromotionRecord(record) {
  const errors = [];
  
  if (!record.schema || record.schema !== 'promotion_record.v1') {
    errors.push('Invalid schema');
  }
  
  if (!record.bank_id) {
    errors.push('Missing bank_id');
  }
  
  if (!record.approvals || !Array.isArray(record.approvals)) {
    errors.push('Missing or invalid approvals');
  }
  
  // Check for required approvals
  const roles = record.approvals.map(a => a.role);
  if (!roles.includes(ROLES.QA)) {
    errors.push('Missing QA approval');
  }
  if (!roles.includes(ROLES.OWNER)) {
    errors.push('Missing Owner approval');
  }
  
  // Validate approval format
  for (const approval of record.approvals) {
    if (!approval.role || !approval.user || !approval.ts) {
      errors.push('Invalid approval format');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Check promotion eligibility
 */
function checkPromotionEligibility(bankId, checklistData, userRole) {
  // Check permissions
  if (!hasPermission(userRole, 'approve_promotion')) {
    return {
      eligible: false,
      reason: 'Insufficient permissions'
    };
  }
  
  // Validate checklist
  const checklistValidation = validatePromotionChecklist(checklistData);
  if (!checklistValidation.passed) {
    return {
      eligible: false,
      reason: 'Checklist validation failed',
      errors: checklistValidation.errors
    };
  }
  
  return {
    eligible: true,
    checklist: checklistValidation.results
  };
}

/**
 * Generate promotion summary
 */
function generatePromotionSummary(record, checklistData) {
  const summary = {
    bank_id: record.bank_id,
    from_bank: record.from_bank,
    approval_count: record.approvals.length,
    qa_approved: record.approvals.some(a => a.role === ROLES.QA),
    owner_approved: record.approvals.some(a => a.role === ROLES.OWNER),
    checklist_summary: {
      total_items: Object.keys(PROMOTION_CHECKLIST).length,
      passed_items: Object.values(checklistData).filter(v => v === true).length,
      failed_items: Object.values(checklistData).filter(v => v === false).length
    },
    created_at: record.created_at
  };
  
  return summary;
}

/**
 * Audit promotion process
 */
function auditPromotionProcess(record, checklistData) {
  const audit = {
    bank_id: record.bank_id,
    audit_timestamp: new Date().toISOString(),
    issues: [],
    recommendations: []
  };
  
  // Check approval timing
  const approvals = record.approvals.sort((a, b) => new Date(a.ts) - new Date(b.ts));
  const qaApproval = approvals.find(a => a.role === ROLES.QA);
  const ownerApproval = approvals.find(a => a.role === ROLES.OWNER);
  
  if (qaApproval && ownerApproval) {
    const timeDiff = new Date(ownerApproval.ts) - new Date(qaApproval.ts);
    if (timeDiff < 0) {
      audit.issues.push('Owner approved before QA');
    }
  }
  
  // Check checklist completeness
  const checklistValidation = validatePromotionChecklist(checklistData);
  if (!checklistValidation.passed) {
    audit.issues.push('Checklist validation failed');
    audit.issues.push(...checklistValidation.errors);
  }
  
  // Generate recommendations
  if (audit.issues.length === 0) {
    audit.recommendations.push('Promotion process completed successfully');
  } else {
    audit.recommendations.push('Address identified issues before promotion');
    audit.recommendations.push('Review approval workflow');
  }
  
  return audit;
}

/**
 * Get role permissions
 */
function getRolePermissions(role) {
  return PERMISSIONS[role] || [];
}

/**
 * List all roles
 */
function listRoles() {
  return Object.values(ROLES);
}

/**
 * Check if role exists
 */
function isValidRole(role) {
  return Object.values(ROLES).includes(role);
}

/**
 * Export governance data
 */
function exportGovernanceData() {
  return {
    roles: ROLES,
    permissions: PERMISSIONS,
    promotion_checklist: PROMOTION_CHECKLIST,
    exported_at: new Date().toISOString()
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  PROMOTION_CHECKLIST,
  hasPermission,
  validatePromotionChecklist,
  createPromotionRecord,
  validatePromotionRecord,
  checkPromotionEligibility,
  generatePromotionSummary,
  auditPromotionProcess,
  getRolePermissions,
  listRoles,
  isValidRole,
  exportGovernanceData
};
