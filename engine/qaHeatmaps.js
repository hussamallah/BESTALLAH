/**
 * Extended QA Heatmaps - Batch 5 Implementation
 * 
 * Features:
 * - Opportunity analysis per face
 * - Family distribution analysis
 * - Heatmap generation for offline QA
 * - Diagnostic tools for FAM gate failures
 */

/**
 * Generate opportunity heatmap for a face
 */
function generateFaceOpportunityHeatmap(faceId, bankPackage) {
  const heatmap = {
    schema: 'opportunity_heatmap.v1',
    face_id: faceId,
    families: [],
    total_opportunities: 0,
    signature_opportunities: 0,
    adjacent_opportunities: 0,
    contrast_opportunities: 0
  };
  
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    const opportunities = countFaceOpportunitiesInFamily(faceId, family, bankPackage);
    heatmap.families.push({
      family,
      opportunities: opportunities.total,
      signature: opportunities.signature,
      adjacent: opportunities.adjacent,
      contrast: opportunities.contrast
    });
    
    heatmap.total_opportunities += opportunities.total;
    heatmap.signature_opportunities += opportunities.signature;
    heatmap.adjacent_opportunities += opportunities.adjacent;
    heatmap.contrast_opportunities += opportunities.contrast;
  }
  
  return heatmap;
}

/**
 * Count face opportunities in a specific family
 */
function countFaceOpportunitiesInFamily(faceId, family, bankPackage) {
  const familyQuestions = bankPackage.questions[family.toLowerCase()];
  if (!familyQuestions || !familyQuestions.questions) {
    return { total: 0, signature: 0, adjacent: 0, contrast: 0 };
  }
  
  let total = 0;
  let signature = 0;
  let adjacent = 0;
  let contrast = 0;
  
  for (const question of familyQuestions.questions) {
    if (!question.options) continue;
    
    for (const option of question.options) {
      if (!option.tells) continue;
      
      for (const tell of option.tells) {
        if (tell.face_id === faceId) {
          total++;
          
          // Check if this is a signature opportunity (home family)
          if (isSignatureFamily(faceId, family)) {
            signature++;
          } else {
            adjacent++;
          }
          
          // Check if this is a contrast tell
          if (isContrastTell(tell.tell_id, bankPackage)) {
            contrast++;
          }
        }
      }
    }
  }
  
  return { total, signature, adjacent, contrast };
}

/**
 * Check if face belongs to signature family
 */
function isSignatureFamily(faceId, family) {
  // Extract family from face ID (e.g., "FACE/Control/Sovereign" -> "Control")
  const faceFamily = faceId.split('/')[1];
  return faceFamily === family;
}

/**
 * Check if tell is a contrast tell
 */
function isContrastTell(tellId, bankPackage) {
  if (!bankPackage.registries.tells || !bankPackage.registries.tells.tells) {
    return false;
  }
  
  const tell = bankPackage.registries.tells.tells.find(t => t.id === tellId);
  return tell && tell.contrast === true;
}

/**
 * Generate comprehensive QA heatmap
 */
function generateComprehensiveQAHeatmap(bankPackage) {
  const heatmaps = [];
  const faces = bankPackage.registries.faces.faces;
  
  for (const face of faces) {
    const heatmap = generateFaceOpportunityHeatmap(face.id, bankPackage);
    heatmaps.push(heatmap);
  }
  
  return {
    schema: 'comprehensive_qa_heatmap.v1',
    bank_id: bankPackage.meta.bank_id,
    generated_at: new Date().toISOString(),
    face_heatmaps: heatmaps,
    summary: generateHeatmapSummary(heatmaps)
  };
}

/**
 * Generate heatmap summary
 */
function generateHeatmapSummary(heatmaps) {
  const summary = {
    total_faces: heatmaps.length,
    faces_with_sufficient_opportunities: 0,
    faces_with_insufficient_opportunities: 0,
    faces_missing_signature_opportunities: 0,
    faces_missing_adjacent_opportunities: 0,
    faces_missing_contrast_opportunities: 0,
    average_opportunities_per_face: 0,
    minimum_opportunities: Infinity,
    maximum_opportunities: 0
  };
  
  let totalOpportunities = 0;
  
  for (const heatmap of heatmaps) {
    const opportunities = heatmap.total_opportunities;
    totalOpportunities += opportunities;
    
    if (opportunities >= 6) {
      summary.faces_with_sufficient_opportunities++;
    } else {
      summary.faces_with_insufficient_opportunities++;
    }
    
    if (heatmap.signature_opportunities < 2) {
      summary.faces_missing_signature_opportunities++;
    }
    
    if (heatmap.adjacent_opportunities < 4) {
      summary.faces_missing_adjacent_opportunities++;
    }
    
    if (heatmap.contrast_opportunities < 1) {
      summary.faces_missing_contrast_opportunities++;
    }
    
    summary.minimum_opportunities = Math.min(summary.minimum_opportunities, opportunities);
    summary.maximum_opportunities = Math.max(summary.maximum_opportunities, opportunities);
  }
  
  summary.average_opportunities_per_face = totalOpportunities / heatmaps.length;
  
  return summary;
}

/**
 * Diagnose FAM gate failures
 */
function diagnoseFAMGateFailures(heatmaps) {
  const failures = [];
  
  for (const heatmap of heatmaps) {
    const faceId = heatmap.face_id;
    const issues = [];
    
    // Check total opportunities
    if (heatmap.total_opportunities < 6) {
      issues.push({
        type: 'INSUFFICIENT_OPPORTUNITIES',
        current: heatmap.total_opportunities,
        required: 6,
        description: 'Face has insufficient total opportunities'
      });
    }
    
    // Check signature opportunities
    if (heatmap.signature_opportunities < 2) {
      issues.push({
        type: 'INSUFFICIENT_SIGNATURE_OPPORTUNITIES',
        current: heatmap.signature_opportunities,
        required: 2,
        description: 'Face has insufficient signature opportunities'
      });
    }
    
    // Check adjacent opportunities
    if (heatmap.adjacent_opportunities < 4) {
      issues.push({
        type: 'INSUFFICIENT_ADJACENT_OPPORTUNITIES',
        current: heatmap.adjacent_opportunities,
        required: 4,
        description: 'Face has insufficient adjacent opportunities'
      });
    }
    
    // Check contrast opportunities
    if (heatmap.contrast_opportunities < 1) {
      issues.push({
        type: 'INSUFFICIENT_CONTRAST_OPPORTUNITIES',
        current: heatmap.contrast_opportunities,
        required: 1,
        description: 'Face has insufficient contrast opportunities'
      });
    }
    
    if (issues.length > 0) {
      failures.push({
        face_id: faceId,
        issues,
        severity: issues.length > 2 ? 'HIGH' : issues.length > 1 ? 'MEDIUM' : 'LOW'
      });
    }
  }
  
  return failures;
}

/**
 * Generate family distribution analysis
 */
function generateFamilyDistributionAnalysis(heatmaps) {
  const analysis = {
    families: {},
    recommendations: []
  };
  
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    analysis.families[family] = {
      total_opportunities: 0,
      faces_with_opportunities: 0,
      average_opportunities_per_face: 0,
      faces: []
    };
  }
  
  for (const heatmap of heatmaps) {
    for (const familyData of heatmap.families) {
      const family = familyData.family;
      analysis.families[family].total_opportunities += familyData.opportunities;
      
      if (familyData.opportunities > 0) {
        analysis.families[family].faces_with_opportunities++;
        analysis.families[family].faces.push({
          face_id: heatmap.face_id,
          opportunities: familyData.opportunities
        });
      }
    }
  }
  
  // Calculate averages and generate recommendations
  for (const family of families) {
    const familyData = analysis.families[family];
    if (familyData.faces_with_opportunities > 0) {
      familyData.average_opportunities_per_face = familyData.total_opportunities / familyData.faces_with_opportunities;
    }
    
    // Generate recommendations
    if (familyData.total_opportunities < 20) {
      analysis.recommendations.push({
        type: 'LOW_OPPORTUNITIES',
        family,
        current: familyData.total_opportunities,
        recommended: 20,
        description: `Family ${family} has low opportunity count`
      });
    }
    
    if (familyData.faces_with_opportunities < 10) {
      analysis.recommendations.push({
        type: 'LOW_FACE_COVERAGE',
        family,
        current: familyData.faces_with_opportunities,
        recommended: 10,
        description: `Family ${family} has low face coverage`
      });
    }
  }
  
  return analysis;
}

/**
 * Export heatmap data
 */
function exportHeatmapData(heatmaps, format = 'json') {
  if (format === 'csv') {
    return generateCSVExport(heatmaps);
  }
  
  return {
    schema: 'qa_heatmap_export.v1',
    generated_at: new Date().toISOString(),
    heatmaps,
    summary: generateHeatmapSummary(heatmaps),
    failures: diagnoseFAMGateFailures(heatmaps),
    family_analysis: generateFamilyDistributionAnalysis(heatmaps)
  };
}

/**
 * Generate CSV export
 */
function generateCSVExport(heatmaps) {
  const csv = [];
  
  // Header
  csv.push('face_id,total_opportunities,signature_opportunities,adjacent_opportunities,contrast_opportunities');
  
  // Data rows
  for (const heatmap of heatmaps) {
    csv.push([
      heatmap.face_id,
      heatmap.total_opportunities,
      heatmap.signature_opportunities,
      heatmap.adjacent_opportunities,
      heatmap.contrast_opportunities
    ].join(','));
  }
  
  return csv.join('\n');
}

/**
 * Validate heatmap data
 */
function validateHeatmapData(heatmap) {
  const errors = [];
  
  if (!heatmap.schema || heatmap.schema !== 'opportunity_heatmap.v1') {
    errors.push('Invalid heatmap schema');
  }
  
  if (!heatmap.face_id) {
    errors.push('Missing face_id');
  }
  
  if (!heatmap.families || !Array.isArray(heatmap.families)) {
    errors.push('Missing or invalid families array');
  }
  
  if (heatmap.total_opportunities < 0) {
    errors.push('Total opportunities cannot be negative');
  }
  
  if (heatmap.signature_opportunities < 0) {
    errors.push('Signature opportunities cannot be negative');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Generate heatmap visualization data
 */
function generateHeatmapVisualization(heatmaps) {
  const visualization = {
    type: 'heatmap',
    data: [],
    families: ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'],
    faces: heatmaps.map(h => h.face_id)
  };
  
  for (const heatmap of heatmaps) {
    for (const familyData of heatmap.families) {
      visualization.data.push({
        face: heatmap.face_id,
        family: familyData.family,
        opportunities: familyData.opportunities,
        signature: familyData.signature,
        adjacent: familyData.adjacent,
        contrast: familyData.contrast
      });
    }
  }
  
  return visualization;
}

module.exports = {
  generateFaceOpportunityHeatmap,
  generateComprehensiveQAHeatmap,
  generateHeatmapSummary,
  diagnoseFAMGateFailures,
  generateFamilyDistributionAnalysis,
  exportHeatmapData,
  validateHeatmapData,
  generateHeatmapVisualization
};
