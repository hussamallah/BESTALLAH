/**
 * Multi-Run Aggregation - Batch 5 Implementation
 * 
 * Features:
 * - Cross-session rollup without back-propagation
 * - Line consensus computation
 * - Face presence rollup
 * - Stability flags
 */

/**
 * Aggregate multiple finalized sessions for a single user
 */
function aggregateSessions(finalSnapshots) {
  if (finalSnapshots.length < 2) {
    throw new Error('At least 2 sessions required for aggregation');
  }
  
  // Validate all sessions are from the same bank
  const bankId = finalSnapshots[0].bank_id;
  for (const snapshot of finalSnapshots) {
    if (snapshot.bank_id !== bankId) {
      throw new Error('All sessions must be from the same bank');
    }
  }
  
  const sessions = finalSnapshots.map(s => s.session_id);
  
  // Compute line consensus
  const lineConsensus = computeLineConsensus(finalSnapshots);
  
  // Compute face presence rollup
  const facePresenceRollup = computeFacePresenceRollup(finalSnapshots);
  
  // Compute stability flags
  const stabilityFlags = computeStabilityFlags(finalSnapshots);
  
  return {
    version: 'aggregate.v1',
    bank_id: bankId,
    sessions,
    line_consensus: lineConsensus,
    face_presence_rollup: facePresenceRollup,
    stability_flags: stabilityFlags,
    aggregated_at: new Date().toISOString()
  };
}

/**
 * Compute line consensus per family
 */
function computeLineConsensus(finalSnapshots) {
  const lineConsensus = {};
  const families = ['Control', 'Pace', 'Boundary', 'Truth', 'Recognition', 'Bonding', 'Stress'];
  
  for (const family of families) {
    const verdicts = finalSnapshots
      .map(s => s.line_verdicts[family])
      .filter(v => v !== undefined);
    
    if (verdicts.length === 0) continue;
    
    // Count verdicts
    const counts = { C: 0, O: 0, F: 0 };
    for (const verdict of verdicts) {
      counts[verdict]++;
    }
    
    // Determine consensus (majority vote C > O > F)
    let consensus = 'C'; // default
    if (counts.F > counts.O && counts.F > counts.C) {
      consensus = 'F';
    } else if (counts.O > counts.C) {
      consensus = 'O';
    } else if (counts.C > 0) {
      consensus = 'C';
    }
    
    // Tie breaker: most recent
    if (counts[consensus] === counts[verdicts[verdicts.length - 1]]) {
      consensus = verdicts[verdicts.length - 1];
    }
    
    lineConsensus[family] = consensus;
  }
  
  return lineConsensus;
}

/**
 * Compute face presence rollup
 */
function computeFacePresenceRollup(finalSnapshots) {
  const faceRollup = [];
  const faceStates = new Map();
  
  // Collect all face states across sessions
  for (const snapshot of finalSnapshots) {
    for (const [faceId, state] of Object.entries(snapshot.face_states)) {
      if (!faceStates.has(faceId)) {
        faceStates.set(faceId, {
          face_id: faceId,
          present_in: 0,
          LIT_count: 0,
          LEAN_count: 0,
          GHOST_count: 0,
          COLD_count: 0,
          ABSENT_count: 0,
          ever_GHOST: false
        });
      }
      
      const rollup = faceStates.get(faceId);
      rollup.present_in++;
      
      switch (state.state) {
        case 'LIT':
          rollup.LIT_count++;
          break;
        case 'LEAN':
          rollup.LEAN_count++;
          break;
        case 'GHOST':
          rollup.GHOST_count++;
          rollup.ever_GHOST = true;
          break;
        case 'COLD':
          rollup.COLD_count++;
          break;
        case 'ABSENT':
          rollup.ABSENT_count++;
          break;
      }
    }
  }
  
  // Convert to array
  for (const rollup of faceStates.values()) {
    faceRollup.push(rollup);
  }
  
  return faceRollup;
}

/**
 * Compute stability flags
 */
function computeStabilityFlags(finalSnapshots) {
  const flags = {};
  
  // Check pace stability
  const paceVerdicts = finalSnapshots
    .map(s => s.line_verdicts.Pace)
    .filter(v => v !== undefined);
  flags.pace_stable = paceVerdicts.length > 1 && 
    paceVerdicts.every(v => v === paceVerdicts[0]);
  
  // Check bonding offset persistence
  const bondingVerdicts = finalSnapshots
    .map(s => s.line_verdicts.Bonding)
    .filter(v => v !== undefined);
  flags.bonding_offset_persistent = bondingVerdicts.length > 1 && 
    bondingVerdicts.every(v => v === bondingVerdicts[0]);
  
  // Check control consistency
  const controlVerdicts = finalSnapshots
    .map(s => s.line_verdicts.Control)
    .filter(v => v !== undefined);
  flags.control_consistent = controlVerdicts.length > 1 && 
    controlVerdicts.every(v => v === controlVerdicts[0]);
  
  // Check face state stability
  const faceStability = checkFaceStateStability(finalSnapshots);
  flags.face_stability = faceStability;
  
  return flags;
}

/**
 * Check face state stability across sessions
 */
function checkFaceStateStability(finalSnapshots) {
  const stability = {};
  const faceStates = new Map();
  
  // Collect face states
  for (const snapshot of finalSnapshots) {
    for (const [faceId, state] of Object.entries(snapshot.face_states)) {
      if (!faceStates.has(faceId)) {
        faceStates.set(faceId, []);
      }
      faceStates.get(faceId).push(state.state);
    }
  }
  
  // Check stability for each face
  for (const [faceId, states] of faceStates) {
    if (states.length < 2) {
      stability[faceId] = 'insufficient_data';
      continue;
    }
    
    // Check if all states are the same
    const firstState = states[0];
    const isStable = states.every(s => s === firstState);
    
    if (isStable) {
      stability[faceId] = 'stable';
    } else {
      // Check for patterns
      const hasLIT = states.includes('LIT');
      const hasLEAN = states.includes('LEAN');
      const hasGHOST = states.includes('GHOST');
      
      if (hasLIT && !hasGHOST) {
        stability[faceId] = 'mostly_stable';
      } else if (hasGHOST && !hasLIT) {
        stability[faceId] = 'unstable';
      } else {
        stability[faceId] = 'mixed';
      }
    }
  }
  
  return stability;
}

/**
 * Validate aggregation input
 */
function validateAggregationInput(finalSnapshots) {
  if (!Array.isArray(finalSnapshots)) {
    throw new Error('finalSnapshots must be an array');
  }
  
  if (finalSnapshots.length < 2) {
    throw new Error('At least 2 sessions required for aggregation');
  }
  
  // Check all snapshots have required fields
  for (const snapshot of finalSnapshots) {
    if (!snapshot.session_id) {
      throw new Error('All snapshots must have session_id');
    }
    if (!snapshot.bank_id) {
      throw new Error('All snapshots must have bank_id');
    }
    if (!snapshot.line_verdicts) {
      throw new Error('All snapshots must have line_verdicts');
    }
    if (!snapshot.face_states) {
      throw new Error('All snapshots must have face_states');
    }
  }
  
  // Check all sessions are from the same bank
  const bankId = finalSnapshots[0].bank_id;
  for (const snapshot of finalSnapshots) {
    if (snapshot.bank_id !== bankId) {
      throw new Error('All sessions must be from the same bank');
    }
  }
}

/**
 * Export aggregation results
 */
function exportAggregation(aggregation) {
  return {
    version: aggregation.version,
    bank_id: aggregation.bank_id,
    sessions: aggregation.sessions,
    line_consensus: aggregation.line_consensus,
    face_presence_rollup: aggregation.face_presence_rollup,
    stability_flags: aggregation.stability_flags,
    aggregated_at: aggregation.aggregated_at,
    summary: {
      total_sessions: aggregation.sessions.length,
      stable_families: Object.values(aggregation.stability_flags).filter(f => f === true).length,
      faces_with_lit: aggregation.face_presence_rollup.filter(f => f.LIT_count > 0).length,
      faces_ever_ghost: aggregation.face_presence_rollup.filter(f => f.ever_GHOST).length
    }
  };
}

module.exports = {
  aggregateSessions,
  computeLineConsensus,
  computeFacePresenceRollup,
  computeStabilityFlags,
  validateAggregationInput,
  exportAggregation
};
