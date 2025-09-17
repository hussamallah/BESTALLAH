/**
 * Conflict and Co-presence Rules for Batch 3
 * Handles sibling collision detection and co-presence validation
 */

class ConflictRules {
  constructor() {
    this.siblingPairs = new Map();
    this.coPresenceRules = new Map();
  }

  /**
   * Initialize sibling pairs from face registry
   * @param {Array} faces - Array of face objects
   */
  initializeSiblingPairs(faces) {
    const familyGroups = new Map();
    
    // Group faces by family
    faces.forEach(face => {
      if (!familyGroups.has(face.family)) {
        familyGroups.set(face.family, []);
      }
      familyGroups.get(face.family).push(face.id);
    });

    // Create sibling pairs
    familyGroups.forEach((faceIds, family) => {
      if (faceIds.length === 2) {
        this.siblingPairs.set(family, {
          face_a: faceIds[0],
          face_b: faceIds[1],
          family: family
        });
      }
    });
  }

  /**
   * Check for sibling collision in tells
   * @param {Array} tells - Array of tell objects
   * @returns {Object} Collision detection result
   */
  detectSiblingCollision(tells) {
    const faceIds = new Set();
    const familyCounts = new Map();
    
    // Collect face IDs and count by family
    tells.forEach(tell => {
      const faceId = tell.face_id;
      faceIds.add(faceId);
      
      // Extract family from face ID
      const family = this._extractFamilyFromFaceId(faceId);
      if (family) {
        familyCounts.set(family, (familyCounts.get(family) || 0) + 1);
      }
    });

    // Check for sibling collisions
    const collisions = [];
    familyCounts.forEach((count, family) => {
      if (count > 1) {
        const siblingPair = this.siblingPairs.get(family);
        if (siblingPair) {
          collisions.push({
            family: family,
            face_a: siblingPair.face_a,
            face_b: siblingPair.face_b,
            count: count,
            severity: count === 2 ? 'warning' : 'error'
          });
        }
      }
    });

    return {
      hasCollision: collisions.length > 0,
      collisions: collisions,
      severity: collisions.some(c => c.severity === 'error') ? 'error' : 'warning'
    };
  }

  /**
   * Validate co-presence rules
   * @param {Object} faceStates - Face states object
   * @returns {Object} Co-presence validation result
   */
  validateCoPresence(faceStates) {
    const violations = [];
    
    this.siblingPairs.forEach((pair, family) => {
      const stateA = faceStates[pair.face_a];
      const stateB = faceStates[pair.face_b];
      
      if (!stateA || !stateB) return;

      // Rule 1: Both siblings cannot be LIT
      if (stateA.state === 'LIT' && stateB.state === 'LIT') {
        violations.push({
          rule: 'CO_PRESENCE_LIT_LIT',
          family: family,
          face_a: pair.face_a,
          face_b: pair.face_b,
          state_a: stateA.state,
          state_b: stateB.state,
          severity: 'error',
          message: 'Both siblings cannot be LIT simultaneously'
        });
      }

      // Rule 2: LIT + LEAN co-presence is allowed but flagged
      if ((stateA.state === 'LIT' && stateB.state === 'LEAN') ||
          (stateA.state === 'LEAN' && stateB.state === 'LIT')) {
        violations.push({
          rule: 'CO_PRESENCE_LIT_LEAN',
          family: family,
          face_a: pair.face_a,
          face_b: pair.face_b,
          state_a: stateA.state,
          state_b: stateB.state,
          severity: 'warning',
          message: 'LIT + LEAN co-presence detected'
        });
      }

      // Rule 3: Both siblings GHOST is suspicious
      if (stateA.state === 'GHOST' && stateB.state === 'GHOST') {
        violations.push({
          rule: 'CO_PRESENCE_GHOST_GHOST',
          family: family,
          face_a: pair.face_a,
          face_b: pair.face_b,
          state_a: stateA.state,
          state_b: stateB.state,
          severity: 'warning',
          message: 'Both siblings are GHOST - may indicate authoring issue'
        });
      }
    });

    return {
      hasViolations: violations.length > 0,
      violations: violations,
      severity: violations.some(v => v.severity === 'error') ? 'error' : 'warning'
    };
  }

  /**
   * Apply sibling collision penalty
   * @param {Object} faceStates - Face states object
   * @param {Object} collision - Collision detection result
   * @returns {Object} Updated face states with penalties
   */
  applySiblingPenalty(faceStates, collision) {
    if (!collision.hasCollision) return faceStates;

    const updatedStates = { ...faceStates };
    
    collision.collisions.forEach(collision => {
      const stateA = updatedStates[collision.face_a];
      const stateB = updatedStates[collision.face_b];
      
      if (stateA && stateB) {
        // Apply penalty: downgrade both faces by one level
        if (stateA.state === 'LIT') {
          stateA.state = 'LEAN';
          stateA.penalty_applied = 'sibling_collision';
        } else if (stateA.state === 'LEAN') {
          stateA.state = 'COLD';
          stateA.penalty_applied = 'sibling_collision';
        }
        
        if (stateB.state === 'LIT') {
          stateB.state = 'LEAN';
          stateB.penalty_applied = 'sibling_collision';
        } else if (stateB.state === 'LEAN') {
          stateB.state = 'COLD';
          stateB.penalty_applied = 'sibling_collision';
        }
      }
    });

    return updatedStates;
  }

  /**
   * Extract family name from face ID
   * @param {string} faceId - Face ID (e.g., "FACE/Control/Sovereign")
   * @returns {string|null} Family name
   */
  _extractFamilyFromFaceId(faceId) {
    const parts = faceId.split('/');
    return parts.length >= 2 ? parts[1] : null;
  }

  /**
   * Get sibling pair for a face
   * @param {string} faceId - Face ID
   * @returns {Object|null} Sibling pair information
   */
  getSiblingPair(faceId) {
    const family = this._extractFamilyFromFaceId(faceId);
    if (!family) return null;
    
    const pair = this.siblingPairs.get(family);
    if (!pair) return null;
    
    return {
      family: family,
      sibling: pair.face_a === faceId ? pair.face_b : pair.face_a,
      pair: pair
    };
  }

  /**
   * Check if two faces are siblings
   * @param {string} faceId1 - First face ID
   * @param {string} faceId2 - Second face ID
   * @returns {boolean} True if siblings
   */
  areSiblings(faceId1, faceId2) {
    const family1 = this._extractFamilyFromFaceId(faceId1);
    const family2 = this._extractFamilyFromFaceId(faceId2);
    
    return family1 === family2 && family1 !== null;
  }
}

module.exports = ConflictRules;
