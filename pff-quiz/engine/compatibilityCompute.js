/**
 * Compatibility Compute - Batch 5 Implementation
 * 
 * Features:
 * - User comparison scoring
 * - Line pairing mechanics
 * - Face pairing analysis
 * - Score class determination
 */

/**
 * Compute compatibility between two users
 */
function computeCompatibility(userA, userB, bankId) {
  // Validate input
  validateCompatibilityInput(userA, userB, bankId);
  
  // Compute line pairing
  const linePair = computeLinePairing(userA.line_verdicts, userB.line_verdicts);
  
  // Compute face pairing
  const facePair = computeFacePairing(userA.family_reps, userB.family_reps);
  
  // Determine score class
  const scoreClass = determineScoreClass(linePair, facePair);
  
  // Generate explanatory tags
  const explanatoryTags = generateExplanatoryTags(linePair, facePair);
  
  return {
    version: 'compat.result.v1',
    bank_id: bankId,
    score_class: scoreClass,
    explanatory_tags: explanatoryTags,
    mechanics: {
      line_pair: linePair,
      face_pair: facePair
    },
    computed_at: new Date().toISOString()
  };
}

/**
 * Validate compatibility input
 */
function validateCompatibilityInput(userA, userB, bankId) {
  if (!userA || !userB) {
    throw new Error('Both users must be provided');
  }
  
  if (!userA.line_verdicts || !userB.line_verdicts) {
    throw new Error('Both users must have line_verdicts');
  }
  
  if (!userA.family_reps || !userB.family_reps) {
    throw new Error('Both users must have family_reps');
  }
  
  if (!bankId) {
    throw new Error('bank_id must be provided');
  }
}

/**
 * Compute line pairing mechanics
 */
function computeLinePairing(lineVerdictsA, lineVerdictsB) {
  const linePair = {};
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    const verdictA = lineVerdictsA[family];
    const verdictB = lineVerdictsB[family];
    
    if (!verdictA || !verdictB) {
      linePair[family] = 'unknown';
      continue;
    }
    
    // Determine relationship
    if (verdictA === verdictB) {
      linePair[family] = 'align';
    } else if (isTension(verdictA, verdictB)) {
      linePair[family] = 'tension';
    } else if (isConflict(verdictA, verdictB)) {
      linePair[family] = 'conflict';
    } else {
      linePair[family] = 'offset';
    }
  }
  
  return linePair;
}

/**
 * Check if two verdicts create tension
 */
function isTension(verdictA, verdictB) {
  // Tension: one O/F, other C
  return (verdictA === 'C' && (verdictB === 'O' || verdictB === 'F')) ||
         (verdictB === 'C' && (verdictA === 'O' || verdictA === 'F'));
}

/**
 * Check if two verdicts create conflict
 */
function isConflict(verdictA, verdictB) {
  // Conflict: F vs C/O
  return (verdictA === 'F' && (verdictB === 'C' || verdictB === 'O')) ||
         (verdictB === 'F' && (verdictA === 'C' || verdictA === 'O'));
}

/**
 * Compute face pairing mechanics
 */
function computeFacePairing(familyRepsA, familyRepsB) {
  const facePair = [];
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    const repA = familyRepsA.find(r => r.family === family);
    const repB = familyRepsB.find(r => r.family === family);
    
    if (!repA || !repB) {
      continue;
    }
    
    const relation = determineFaceRelation(repA, repB, family);
    
    facePair.push({
      family,
      A: repA.rep,
      B: repB.rep,
      relation
    });
  }
  
  return facePair;
}

/**
 * Determine face relation
 */
function determineFaceRelation(repA, repB, family) {
  // Same face
  if (repA.rep === repB.rep) {
    return 'same';
  }
  
  // Both faces are in the same family
  if (repA.rep.includes(family) && repB.rep.includes(family)) {
    // Neither is GHOST
    if (repA.rep_state !== 'GHOST' && repB.rep_state !== 'GHOST') {
      return 'complement';
    }
    
    // One is GHOST, other is LIT/LEAN
    if ((repA.rep_state === 'GHOST' && (repB.rep_state === 'LIT' || repB.rep_state === 'LEAN')) ||
        (repB.rep_state === 'GHOST' && (repA.rep_state === 'LIT' || repA.rep_state === 'LEAN'))) {
      return 'clash';
    }
  }
  
  // Different families or other cases
  return 'different';
}

/**
 * Determine score class
 */
function determineScoreClass(linePair, facePair) {
  // Count alignments and conflicts
  const lineAlignments = Object.values(linePair).filter(v => v === 'align').length;
  const lineConflicts = Object.values(linePair).filter(v => v === 'conflict').length;
  const faceClashes = facePair.filter(f => f.relation === 'clash').length;
  
  // GREEN: ≥5 families align and no clash
  if (lineAlignments >= 5 && faceClashes === 0) {
    return 'GREEN';
  }
  
  // RED: ≥3 families conflict or any two clash
  if (lineConflicts >= 3 || faceClashes >= 2) {
    return 'RED';
  }
  
  // YELLOW: everything else
  return 'YELLOW';
}

/**
 * Generate explanatory tags
 */
function generateExplanatoryTags(linePair, facePair) {
  const tags = [];
  
  // Line-based tags
  const lineAlignments = Object.values(linePair).filter(v => v === 'align').length;
  const lineConflicts = Object.values(linePair).filter(v => v === 'conflict').length;
  const lineTensions = Object.values(linePair).filter(v => v === 'tension').length;
  
  if (lineAlignments >= 5) {
    tags.push('high_line_alignment');
  }
  if (lineConflicts >= 3) {
    tags.push('high_line_conflict');
  }
  if (lineTensions >= 4) {
    tags.push('high_line_tension');
  }
  
  // Face-based tags
  const faceSame = facePair.filter(f => f.relation === 'same').length;
  const faceComplement = facePair.filter(f => f.relation === 'complement').length;
  const faceClash = facePair.filter(f => f.relation === 'clash').length;
  
  if (faceSame >= 4) {
    tags.push('high_face_similarity');
  }
  if (faceComplement >= 3) {
    tags.push('good_face_complement');
  }
  if (faceClash >= 2) {
    tags.push('face_clash_detected');
  }
  
  // Specific family tags
  if (linePair.Pace === 'align') {
    tags.push('pace_alignment');
  }
  if (linePair.Boundary === 'conflict') {
    tags.push('boundary_conflict');
  }
  if (linePair.Bonding === 'tension') {
    tags.push('bonding_tension');
  }
  
  return tags;
}

/**
 * Compute compatibility score (0-100)
 */
function computeCompatibilityScore(compatibility) {
  const { line_pair, face_pair } = compatibility.mechanics;
  
  let score = 0;
  let maxScore = 0;
  
  // Line verdict scoring (C=2, O=1, F=0)
  const lineWeights = { C: 2, O: 1, F: 0 };
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    const verdictA = line_pair[family];
    const verdictB = line_pair[family];
    
    if (verdictA && verdictB) {
      const weightA = lineWeights[verdictA] || 0;
      const weightB = lineWeights[verdictB] || 0;
      
      // Similarity bonus
      if (verdictA === verdictB) {
        score += (weightA + weightB) * 2;
      } else {
        score += Math.abs(weightA - weightB);
      }
      
      maxScore += 4; // Max possible per family
    }
  }
  
  // Face relation scoring
  for (const face of face_pair) {
    switch (face.relation) {
      case 'same':
        score += 10;
        break;
      case 'complement':
        score += 7;
        break;
      case 'different':
        score += 3;
        break;
      case 'clash':
        score += 0;
        break;
    }
    maxScore += 10;
  }
  
  return Math.round((score / maxScore) * 100);
}

/**
 * Export compatibility results
 */
function exportCompatibility(compatibility) {
  const score = computeCompatibilityScore(compatibility);
  
  return {
    ...compatibility,
    score,
    summary: {
      line_alignments: Object.values(compatibility.mechanics.line_pair).filter(v => v === 'align').length,
      line_conflicts: Object.values(compatibility.mechanics.line_pair).filter(v => v === 'conflict').length,
      face_same: compatibility.mechanics.face_pair.filter(f => f.relation === 'same').length,
      face_clash: compatibility.mechanics.face_pair.filter(f => f.relation === 'clash').length
    }
  };
}

module.exports = {
  computeCompatibility,
  computeLinePairing,
  computeFacePairing,
  determineScoreClass,
  generateExplanatoryTags,
  computeCompatibilityScore,
  exportCompatibility
};
