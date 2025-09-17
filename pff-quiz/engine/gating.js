/**
 * A/B Gating & Config Rollouts
 * 
 * Provides deterministic A/B testing and configuration rollouts.
 * All gating is configured at bank load time and does not branch logic during sessions.
 */

const crypto = require('crypto');

class ABGatingManager {
  constructor() {
    this.experiments = new Map();
    this.assignments = new Map();
    this.configProfiles = new Map();
  }

  /**
   * Load gating configuration from bank package
   */
  loadGatingConfig(gatingConfig) {
    if (!gatingConfig || !gatingConfig.experiments) {
      return;
    }

    // Load experiments
    for (const experiment of gatingConfig.experiments) {
      this.experiments.set(experiment.id, {
        id: experiment.id,
        allocation: experiment.allocation,
        arms: experiment.arms,
        enabled: true
      });
    }

    // Load assignment configuration
    this.assignmentConfig = gatingConfig.assignment || {
      seed_source: 'session_id',
      salt: 'default-salt'
    };

    console.log(`Loaded ${this.experiments.size} A/B experiments`);
  }

  /**
   * Assign session to experiment arms
   * This happens at init_session and is deterministic
   */
  assignSession(sessionId, sessionSeed) {
    const assignments = {};

    for (const [experimentId, experiment] of this.experiments) {
      if (!experiment.enabled) {
        continue;
      }

      const arm = this.deterministicAssignment(
        sessionId,
        sessionSeed,
        experimentId,
        experiment.allocation
      );

      assignments[experimentId] = {
        experiment_id: experimentId,
        arm: arm,
        config_profile: experiment.arms[arm].constants_profile || 'DEFAULT'
      };
    }

    this.assignments.set(sessionId, assignments);
    return assignments;
  }

  /**
   * Get assigned configuration profile for session
   */
  getAssignedProfile(sessionId) {
    const assignments = this.assignments.get(sessionId);
    if (!assignments) {
      return 'DEFAULT';
    }

    // Find the most specific profile (experiment with highest priority)
    let selectedProfile = 'DEFAULT';
    
    for (const assignment of Object.values(assignments)) {
      const experiment = this.experiments.get(assignment.experiment_id);
      if (experiment && experiment.arms[assignment.arm]) {
        const profile = experiment.arms[assignment.arm].constants_profile;
        if (profile && profile !== 'DEFAULT') {
          selectedProfile = profile;
        }
      }
    }

    return selectedProfile;
  }

  /**
   * Get all assignments for a session
   */
  getSessionAssignments(sessionId) {
    return this.assignments.get(sessionId) || {};
  }

  /**
   * Check if session is in experiment
   */
  isInExperiment(sessionId, experimentId) {
    const assignments = this.assignments.get(sessionId);
    return assignments && assignments[experimentId];
  }

  /**
   * Get experiment arm for session
   */
  getExperimentArm(sessionId, experimentId) {
    const assignments = this.assignments.get(sessionId);
    if (!assignments || !assignments[experimentId]) {
      return null;
    }
    return assignments[experimentId].arm;
  }

  /**
   * Deterministic assignment using hash-based selection
   */
  deterministicAssignment(sessionId, sessionSeed, experimentId, allocation) {
    // Create deterministic seed from session data
    const seedString = `${sessionId}:${sessionSeed}:${experimentId}:${this.assignmentConfig.salt}`;
    const hash = crypto.createHash('sha256').update(seedString).digest('hex');
    
    // Convert first 8 characters to number (0-1 range)
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;
    
    // Assign based on allocation percentages
    let cumulative = 0;
    for (const [arm, percentage] of Object.entries(allocation)) {
      cumulative += percentage;
      if (hashValue <= cumulative) {
        return arm;
      }
    }
    
    // Fallback to first arm
    return Object.keys(allocation)[0];
  }

  /**
   * Load configuration profiles
   */
  loadConfigProfiles(profiles) {
    for (const [profileName, config] of Object.entries(profiles)) {
      this.configProfiles.set(profileName, config);
    }
  }

  /**
   * Get configuration for assigned profile
   */
  getConfigForProfile(profileName) {
    return this.configProfiles.get(profileName) || this.configProfiles.get('DEFAULT') || {};
  }

  /**
   * Get configuration for session
   */
  getSessionConfig(sessionId) {
    const profile = this.getAssignedProfile(sessionId);
    return this.getConfigForProfile(profile);
  }

  /**
   * Enable/disable experiment
   */
  setExperimentEnabled(experimentId, enabled) {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.enabled = enabled;
    }
  }

  /**
   * Update experiment allocation
   */
  updateExperimentAllocation(experimentId, allocation) {
    const experiment = this.experiments.get(experimentId);
    if (experiment) {
      experiment.allocation = allocation;
    }
  }

  /**
   * Add new experiment
   */
  addExperiment(experimentId, allocation, arms) {
    this.experiments.set(experimentId, {
      id: experimentId,
      allocation: allocation,
      arms: arms,
      enabled: true
    });
  }

  /**
   * Remove experiment
   */
  removeExperiment(experimentId) {
    this.experiments.delete(experimentId);
  }

  /**
   * Get experiment statistics
   */
  getExperimentStats(experimentId) {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      return null;
    }

    const stats = {
      experiment_id: experimentId,
      enabled: experiment.enabled,
      total_sessions: 0,
      arm_distribution: {},
      config_profiles: {}
    };

    // Count sessions by arm
    for (const assignment of this.assignments.values()) {
      if (assignment[experimentId]) {
        stats.total_sessions++;
        const arm = assignment[experimentId].arm;
        stats.arm_distribution[arm] = (stats.arm_distribution[arm] || 0) + 1;
        
        const profile = assignment[experimentId].config_profile;
        stats.config_profiles[profile] = (stats.config_profiles[profile] || 0) + 1;
      }
    }

    return stats;
  }

  /**
   * Get all experiment statistics
   */
  getAllExperimentStats() {
    const stats = {};
    for (const experimentId of this.experiments.keys()) {
      stats[experimentId] = this.getExperimentStats(experimentId);
    }
    return stats;
  }

  /**
   * Validate gating configuration
   */
  validateGatingConfig(gatingConfig) {
    const errors = [];

    if (!gatingConfig.experiments) {
      errors.push('Missing experiments configuration');
      return errors;
    }

    for (const experiment of gatingConfig.experiments) {
      // Validate experiment structure
      if (!experiment.id) {
        errors.push('Experiment missing id');
        continue;
      }

      if (!experiment.allocation) {
        errors.push(`Experiment ${experiment.id} missing allocation`);
        continue;
      }

      if (!experiment.arms) {
        errors.push(`Experiment ${experiment.id} missing arms`);
        continue;
      }

      // Validate allocation percentages sum to 1.0
      const totalAllocation = Object.values(experiment.allocation).reduce((sum, val) => sum + val, 0);
      if (Math.abs(totalAllocation - 1.0) > 0.001) {
        errors.push(`Experiment ${experiment.id} allocation percentages must sum to 1.0 (got ${totalAllocation})`);
      }

      // Validate arms exist for all allocation keys
      for (const arm of Object.keys(experiment.allocation)) {
        if (!experiment.arms[arm]) {
          errors.push(`Experiment ${experiment.id} missing arm configuration for ${arm}`);
        }
      }
    }

    return errors;
  }

  /**
   * Generate gating configuration template
   */
  generateGatingTemplate() {
    return {
      schema: 'gating.v1',
      experiments: [
        {
          id: 'exp_strict_face_lit',
          allocation: { 'A': 0.5, 'B': 0.5 },
          arms: {
            'A': { constants_profile: 'DEFAULT' },
            'B': { constants_profile: 'STRICT' }
          }
        },
        {
          id: 'exp_per_screen_cap',
          allocation: { 'control': 0.7, 'treatment': 0.3 },
          arms: {
            'control': { constants_profile: 'DEFAULT' },
            'treatment': { constants_profile: 'LENIENT' }
          }
        }
      ],
      assignment: {
        seed_source: 'session_id',
        salt: 'fixed-string'
      }
    };
  }

  /**
   * Clear all assignments (for testing)
   */
  clearAssignments() {
    this.assignments.clear();
  }

  /**
   * Export gating configuration
   */
  exportGatingConfig() {
    return {
      schema: 'gating.v1',
      experiments: Array.from(this.experiments.values()),
      assignment: this.assignmentConfig,
      config_profiles: Object.fromEntries(this.configProfiles)
    };
  }
}

module.exports = ABGatingManager;
