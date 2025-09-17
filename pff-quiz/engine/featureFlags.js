/**
 * Feature Flags and Kill Switches
 * Controls engine behavior and feature availability
 */

class FeatureFlags {
  constructor() {
    this.flags = new Map();
    this.killSwitches = new Map();
    this.loadFromEnvironment();
  }

  /**
   * Load flags from environment variables
   */
  loadFromEnvironment() {
    // Kill switches
    this.setKillSwitch('ALLOWED_BANK_HASHES', process.env.ALLOWED_BANK_HASHES ? 
      JSON.parse(process.env.ALLOWED_BANK_HASHES) : []);
    this.setKillSwitch('RESULTS_ENABLED', process.env.RESULTS_ENABLED !== 'false');
    this.setKillSwitch('ALLOW_BACKNAV', process.env.ALLOW_BACKNAV !== 'false');
    this.setKillSwitch('LOG_VERBOSE', process.env.LOG_VERBOSE === 'true');
    this.setKillSwitch('QUIZ_ONLY_MODE', process.env.QUIZ_ONLY_MODE === 'true');

    // Feature flags
    this.setFlag('ENABLE_ANALYTICS', process.env.ENABLE_ANALYTICS !== 'false');
    this.setFlag('ENABLE_CACHING', process.env.ENABLE_CACHING !== 'false');
    this.setFlag('ENABLE_COMPRESSION', process.env.ENABLE_COMPRESSION !== 'false');
    this.setFlag('ENABLE_RATE_LIMITING', process.env.ENABLE_RATE_LIMITING !== 'false');
    this.setFlag('ENABLE_DEBUG_MODE', process.env.ENABLE_DEBUG_MODE === 'true');
    this.setFlag('ENABLE_DEV_SHORTCUTS', process.env.ENABLE_DEV_SHORTCUTS === 'true');
  }

  /**
   * Set a feature flag
   * @param {string} name - Flag name
   * @param {*} value - Flag value
   */
  setFlag(name, value) {
    this.flags.set(name, {
      value,
      type: typeof value,
      setAt: new Date().toISOString(),
      source: 'environment'
    });
  }

  /**
   * Get a feature flag value
   * @param {string} name - Flag name
   * @param {*} defaultValue - Default value if flag not set
   * @returns {*} Flag value
   */
  getFlag(name, defaultValue = false) {
    const flag = this.flags.get(name);
    return flag ? flag.value : defaultValue;
  }

  /**
   * Set a kill switch
   * @param {string} name - Switch name
   * @param {*} value - Switch value
   */
  setKillSwitch(name, value) {
    this.killSwitches.set(name, {
      value,
      type: typeof value,
      setAt: new Date().toISOString(),
      source: 'environment'
    });
  }

  /**
   * Get a kill switch value
   * @param {string} name - Switch name
   * @param {*} defaultValue - Default value if switch not set
   * @returns {*} Switch value
   */
  getKillSwitch(name, defaultValue = false) {
    const killSwitch = this.killSwitches.get(name);
    return killSwitch ? killSwitch.value : defaultValue;
  }

  /**
   * Check if a feature is enabled
   * @param {string} name - Feature name
   * @returns {boolean} True if enabled
   */
  isEnabled(name) {
    return this.getFlag(name, false);
  }

  /**
   * Check if a kill switch is active
   * @param {string} name - Kill switch name
   * @returns {boolean} True if active
   */
  isKillSwitchActive(name) {
    return this.getKillSwitch(name, false);
  }

  /**
   * Validate bank hash against allowed list
   * @param {string} bankHash - Bank hash to validate
   * @returns {boolean} True if allowed
   */
  isBankHashAllowed(bankHash) {
    const allowedHashes = this.getKillSwitch('ALLOWED_BANK_HASHES', []);
    if (allowedHashes.length === 0) {
      return true; // No restrictions
    }
    return allowedHashes.includes(bankHash);
  }

  /**
   * Check if results are enabled
   * @returns {boolean} True if results are enabled
   */
  areResultsEnabled() {
    return this.getKillSwitch('RESULTS_ENABLED', true);
  }

  /**
   * Check if back navigation is allowed
   * @returns {boolean} True if back navigation is allowed
   */
  isBackNavigationAllowed() {
    return this.getKillSwitch('ALLOW_BACKNAV', true);
  }

  /**
   * Check if verbose logging is enabled
   * @returns {boolean} True if verbose logging is enabled
   */
  isVerboseLoggingEnabled() {
    return this.getKillSwitch('LOG_VERBOSE', false);
  }

  /**
   * Check if quiz-only mode is enabled
   * @returns {boolean} True if quiz-only mode is enabled
   */
  isQuizOnlyMode() {
    return this.getKillSwitch('QUIZ_ONLY_MODE', false);
  }

  /**
   * Check if analytics are enabled
   * @returns {boolean} True if analytics are enabled
   */
  areAnalyticsEnabled() {
    return this.getFlag('ENABLE_ANALYTICS', true);
  }

  /**
   * Check if caching is enabled
   * @returns {boolean} True if caching is enabled
   */
  isCachingEnabled() {
    return this.getFlag('ENABLE_CACHING', true);
  }

  /**
   * Check if compression is enabled
   * @returns {boolean} True if compression is enabled
   */
  isCompressionEnabled() {
    return this.getFlag('ENABLE_COMPRESSION', true);
  }

  /**
   * Check if rate limiting is enabled
   * @returns {boolean} True if rate limiting is enabled
   */
  isRateLimitingEnabled() {
    return this.getFlag('ENABLE_RATE_LIMITING', true);
  }

  /**
   * Check if debug mode is enabled
   * @returns {boolean} True if debug mode is enabled
   */
  isDebugModeEnabled() {
    return this.getFlag('ENABLE_DEBUG_MODE', false);
  }

  /**
   * Check if dev shortcuts are enabled
   * @returns {boolean} True if dev shortcuts are enabled
   */
  areDevShortcutsEnabled() {
    return this.getFlag('ENABLE_DEV_SHORTCUTS', false);
  }

  /**
   * Get all flags
   * @returns {Object} All flags
   */
  getAllFlags() {
    const flags = {};
    this.flags.forEach((flag, name) => {
      flags[name] = flag.value;
    });
    return flags;
  }

  /**
   * Get all kill switches
   * @returns {Object} All kill switches
   */
  getAllKillSwitches() {
    const switches = {};
    this.killSwitches.forEach((killSwitch, name) => {
      switches[name] = killSwitch.value;
    });
    return switches;
  }

  /**
   * Get all configuration
   * @returns {Object} All flags and kill switches
   */
  getAllConfiguration() {
    return {
      flags: this.getAllFlags(),
      killSwitches: this.getAllKillSwitches(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Override a flag (for testing)
   * @param {string} name - Flag name
   * @param {*} value - Flag value
   */
  overrideFlag(name, value) {
    this.flags.set(name, {
      value,
      type: typeof value,
      setAt: new Date().toISOString(),
      source: 'override'
    });
  }

  /**
   * Override a kill switch (for testing)
   * @param {string} name - Switch name
   * @param {*} value - Switch value
   */
  overrideKillSwitch(name, value) {
    this.killSwitches.set(name, {
      value,
      type: typeof value,
      setAt: new Date().toISOString(),
      source: 'override'
    });
  }

  /**
   * Reset all overrides
   */
  resetOverrides() {
    // Remove overrides and reload from environment
    this.flags.clear();
    this.killSwitches.clear();
    this.loadFromEnvironment();
  }

  /**
   * Validate configuration
   * @returns {Object} Validation result
   */
  validateConfiguration() {
    const errors = [];
    const warnings = [];

    // Check for conflicting settings
    if (this.isQuizOnlyMode() && !this.areResultsEnabled()) {
      warnings.push('Quiz-only mode with results disabled may cause issues');
    }

    if (this.isDebugModeEnabled() && !this.isVerboseLoggingEnabled()) {
      warnings.push('Debug mode without verbose logging may not be useful');
    }

    // Check for security issues
    const allowedHashes = this.getKillSwitch('ALLOWED_BANK_HASHES', []);
    if (allowedHashes.length === 0) {
      warnings.push('No bank hash restrictions - all banks allowed');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const featureFlags = new FeatureFlags();

export default featureFlags;
