/**
 * Acceptance Gates - Batch 5 Implementation
 * 
 * Features:
 * - Auto-block deploys on quality issues
 * - Linter validation
 * - Calibration guardrails
 * - Bank diff validation
 * - Authoring QA checks
 */

/**
 * Acceptance gate definitions
 */
const ACCEPTANCE_GATES = {
  LINTER_ERRORS: {
    name: 'Linter Errors',
    description: 'Linter errors.length > 0',
    severity: 'BLOCKING',
    check: checkLinterErrors
  },
  CALIBRATION_GUARDRAILS: {
    name: 'Calibration Guardrails',
    description: 'Calibration guardrail violated',
    severity: 'BLOCKING',
    check: checkCalibrationGuardrails
  },
  FACE_OPPORTUNITIES: {
    name: 'Face Opportunities',
    description: 'Any face opportunities_total < 6 or signature_opportunities < 2',
    severity: 'BLOCKING',
    check: checkFaceOpportunities
  },
  BANK_DIFF_RISKS: {
    name: 'Bank Diff Risks',
    description: 'Bank Diff R_LINE_FLOW_CHANGE without explicit override',
    severity: 'BLOCKING',
    check: checkBankDiffRisks
  },
  AUTHORING_QA_FAMILIES: {
    name: 'Authoring QA Families',
    description: 'Authoring QA families_missing_any_COF > 0',
    severity: 'BLOCKING',
    check: checkAuthoringQAFamilies
  }
};

/**
 * Check linter errors
 */
function checkLinterErrors(bankPackage, linterReport) {
  if (!linterReport) {
    return {
      passed: false,
      reason: 'No linter report provided',
      details: 'Linter report is required for validation'
    };
  }
  
  if (!linterReport.ok) {
    return {
      passed: false,
      reason: 'Linter errors present',
      details: `Found ${linterReport.errors.length} linter errors`,
      errors: linterReport.errors
    };
  }
  
  if (linterReport.errors && linterReport.errors.length > 0) {
    return {
      passed: false,
      reason: 'Linter errors present',
      details: `Found ${linterReport.errors.length} linter errors`,
      errors: linterReport.errors
    };
  }
  
  return {
    passed: true,
    reason: 'No linter errors found'
  };
}

/**
 * Check calibration guardrails
 */
function checkCalibrationGuardrails(bankPackage, calibrationReport) {
  if (!calibrationReport) {
    return {
      passed: false,
      reason: 'No calibration report provided',
      details: 'Calibration report is required for validation'
    };
  }
  
  // Check LIT rate guardrails
  const litRate = calibrationReport.metrics?.DEFAULT?.pct_sessions_with_LIT_ge_1;
  if (litRate !== undefined) {
    if (litRate < 0.05) {
      return {
        passed: false,
        reason: 'LIT rate too low',
        details: `LIT rate ${(litRate * 100).toFixed(1)}% is below 5% threshold`
      };
    }
    if (litRate > 0.75) {
      return {
        passed: false,
        reason: 'LIT rate too high',
        details: `LIT rate ${(litRate * 100).toFixed(1)}% is above 75% threshold`
      };
    }
  }
  
  // Check QA flags rate
  const qaFlagsRate = calibrationReport.metrics?.DEFAULT?.qa_flags_rate?.QA_FLAG_NO_CONTRAST;
  if (qaFlagsRate !== undefined && qaFlagsRate > 0.15) {
    return {
      passed: false,
      reason: 'QA flags rate too high',
      details: `No contrast flag rate ${(qaFlagsRate * 100).toFixed(1)}% is above 15% threshold`
    };
  }
  
  return {
    passed: true,
    reason: 'Calibration guardrails passed'
  };
}

/**
 * Check face opportunities
 */
function checkFaceOpportunities(bankPackage, authoringQA) {
  if (!authoringQA) {
    return {
      passed: false,
      reason: 'No authoring QA provided',
      details: 'Authoring QA is required for validation'
    };
  }
  
  const errors = [];
  
  // Check opportunities_total >= 6
  for (const face of authoringQA.faces || []) {
    if (face.opportunities_total < 6) {
      errors.push(`Face ${face.face_id} has only ${face.opportunities_total} opportunities, minimum 6 required`);
    }
  }
  
  // Check signature_opportunities >= 2
  for (const face of authoringQA.faces || []) {
    if (face.signature_opportunities < 2) {
      errors.push(`Face ${face.face_id} has only ${face.signature_opportunities} signature opportunities, minimum 2 required`);
    }
  }
  
  if (errors.length > 0) {
    return {
      passed: false,
      reason: 'Face opportunities insufficient',
      details: errors.join('; '),
      errors
    };
  }
  
  return {
    passed: true,
    reason: 'Face opportunities sufficient'
  };
}

/**
 * Check bank diff risks
 */
function checkBankDiffRisks(bankPackage, bankDiff) {
  if (!bankDiff) {
    return {
      passed: true,
      reason: 'No bank diff provided',
      details: 'Bank diff is optional for validation'
    };
  }
  
  // Check for R_LINE_FLOW_CHANGE without override
  if (bankDiff.risks && bankDiff.risks.includes('R_LINE_FLOW_CHANGE')) {
    if (!bankDiff.override_flags || !bankDiff.override_flags.includes('R_LINE_FLOW_CHANGE')) {
      return {
        passed: false,
        reason: 'Line flow change risk without override',
        details: 'R_LINE_FLOW_CHANGE detected but no explicit override provided'
      };
    }
  }
  
  return {
    passed: true,
    reason: 'Bank diff risks acceptable'
  };
}

/**
 * Check authoring QA families
 */
function checkAuthoringQAFamilies(bankPackage, authoringQA) {
  if (!authoringQA) {
    return {
      passed: false,
      reason: 'No authoring QA provided',
      details: 'Authoring QA is required for validation'
    };
  }
  
  if (authoringQA.families_missing_any_COF > 0) {
    return {
      passed: false,
      reason: 'Families missing COF',
      details: `${authoringQA.families_missing_any_COF} families are missing C/O/F questions`
    };
  }
  
  return {
    passed: true,
    reason: 'All families have COF questions'
  };
}

/**
 * Run all acceptance gates
 */
function runAcceptanceGates(bankPackage, validationData) {
  const results = {};
  const blockingFailures = [];
  const warnings = [];
  
  for (const [gateName, gate] of Object.entries(ACCEPTANCE_GATES)) {
    try {
      const result = gate.check(bankPackage, validationData[gateName.toLowerCase()]);
      results[gateName] = result;
      
      if (!result.passed) {
        if (gate.severity === 'BLOCKING') {
          blockingFailures.push({
            gate: gateName,
            reason: result.reason,
            details: result.details
          });
        } else {
          warnings.push({
            gate: gateName,
            reason: result.reason,
            details: result.details
          });
        }
      }
    } catch (error) {
      const errorResult = {
        passed: false,
        reason: 'Gate check failed',
        details: error.message,
        error: error
      };
      results[gateName] = errorResult;
      blockingFailures.push({
        gate: gateName,
        reason: 'Gate check failed',
        details: error.message
      });
    }
  }
  
  const overallPassed = blockingFailures.length === 0;
  
  return {
    passed: overallPassed,
    results,
    blocking_failures: blockingFailures,
    warnings,
    summary: {
      total_gates: Object.keys(ACCEPTANCE_GATES).length,
      passed_gates: Object.values(results).filter(r => r.passed).length,
      failed_gates: Object.values(results).filter(r => !r.passed).length,
      blocking_failures: blockingFailures.length,
      warnings: warnings.length
    }
  };
}

/**
 * Generate acceptance report
 */
function generateAcceptanceReport(gateResults, bankPackage) {
  return {
    schema: 'acceptance_report.v1',
    bank_id: bankPackage.meta.bank_id,
    bank_hash: bankPackage.meta.bank_hash_sha256,
    overall_passed: gateResults.passed,
    gate_results: gateResults.results,
    blocking_failures: gateResults.blocking_failures,
    warnings: gateResults.warnings,
    summary: gateResults.summary,
    generated_at: new Date().toISOString()
  };
}

/**
 * Validate deployment readiness
 */
function validateDeploymentReadiness(bankPackage, validationData) {
  const gateResults = runAcceptanceGates(bankPackage, validationData);
  
  if (!gateResults.passed) {
    throw new Error(`Deployment blocked: ${gateResults.blocking_failures.length} blocking failures`);
  }
  
  return {
    ready: true,
    report: generateAcceptanceReport(gateResults, bankPackage)
  };
}

/**
 * Get gate status
 */
function getGateStatus(gateName) {
  return ACCEPTANCE_GATES[gateName] || null;
}

/**
 * List all gates
 */
function listAllGates() {
  return Object.keys(ACCEPTANCE_GATES);
}

/**
 * Export acceptance gate data
 */
function exportAcceptanceGateData() {
  return {
    gates: ACCEPTANCE_GATES,
    list_gates: listAllGates,
    run_gates: runAcceptanceGates,
    validate_deployment: validateDeploymentReadiness,
    exported_at: new Date().toISOString()
  };
}

module.exports = {
  ACCEPTANCE_GATES,
  runAcceptanceGates,
  generateAcceptanceReport,
  validateDeploymentReadiness,
  getGateStatus,
  listAllGates,
  exportAcceptanceGateData
};
