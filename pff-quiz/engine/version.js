/**
 * Engine Version and Constants Profile Tracking
 * Tracks engine version, constants profile, and compatibility
 */

const crypto = require('crypto');

class EngineVersion {
  constructor() {
    this.version = '1.0.0';
    this.constantsProfile = null;
    this.bankHash = null;
    this.buildDate = new Date().toISOString();
    this.compatibility = {
      minBankVersion: '1.0.0',
      maxBankVersion: '1.0.0',
      supportedConstantsProfiles: ['DEFAULT']
    };
  }

  /**
   * Set constants profile for this engine instance
   * @param {string} profile - Constants profile name
   */
  setConstantsProfile(profile) {
    this.constantsProfile = profile;
  }

  /**
   * Set bank hash for this engine instance
   * @param {string} hash - Bank hash
   */
  setBankHash(hash) {
    this.bankHash = hash;
  }

  /**
   * Get engine version info
   * @returns {Object} Version information
   */
  getVersionInfo() {
    return {
      engine_version: this.version,
      constants_profile: this.constantsProfile,
      bank_hash: this.bankHash,
      build_date: this.buildDate,
      compatibility: this.compatibility
    };
  }

  /**
   * Get release notes for this version
   * @returns {Object} Release notes
   */
  getReleaseNotes() {
    return {
      version: this.version,
      release_date: this.buildDate,
      changes: [
        'Initial release of PFF Quiz Engine',
        'Deterministic question scheduling',
        'Face state computation (LIT/LEAN/GHOST/COLD/ABSENT)',
        'Line verdict computation (C/O/F)',
        'Bank immutability and hash verification',
        'Edge case handling (picks=0, picks=1, picks=7)',
        'Per-screen concentration caps',
        'Contrast tell detection',
        'Family representative resolution'
      ],
      constants_profile: this.constantsProfile,
      bank_hash: this.bankHash,
      performance_targets: {
        getNextQuestion: 'p95 < 10ms',
        submitAnswer: 'p95 < 15ms',
        finalizeSession: 'p95 < 20ms',
        maxQPS: '10k QPS'
      },
      breaking_changes: [],
      deprecations: [],
      security: [
        'Bank package signature verification',
        'Hash integrity checking',
        'Immutable bank storage',
        'No PII in session data'
      ]
    };
  }

  /**
   * Validate compatibility with bank
   * @param {string} bankVersion - Bank version
   * @param {string} constantsProfile - Constants profile
   * @returns {boolean} True if compatible
   */
  validateCompatibility(bankVersion, constantsProfile) {
    // Check bank version compatibility
    const bankVersionParts = bankVersion.split('.').map(Number);
    const minVersionParts = this.compatibility.minBankVersion.split('.').map(Number);
    const maxVersionParts = this.compatibility.maxBankVersion.split('.').map(Number);

    const isVersionCompatible = 
      bankVersionParts[0] >= minVersionParts[0] && bankVersionParts[0] <= maxVersionParts[0] &&
      bankVersionParts[1] >= minVersionParts[1] && bankVersionParts[1] <= maxVersionParts[1] &&
      bankVersionParts[2] >= minVersionParts[2] && bankVersionParts[2] <= maxVersionParts[2];

    // Check constants profile compatibility
    const isProfileCompatible = this.compatibility.supportedConstantsProfiles.includes(constantsProfile);

    return isVersionCompatible && isProfileCompatible;
  }

  /**
   * Generate engine fingerprint
   * @returns {string} Engine fingerprint
   */
  generateFingerprint() {
    const fingerprint = crypto.createHash('sha256')
      .update(this.version)
      .update(this.constantsProfile || '')
      .update(this.bankHash || '')
      .update(this.buildDate)
      .digest('hex')
      .substring(0, 16);
    
    return `ENGINE-${fingerprint}`;
  }

  /**
   * Get engine status
   * @returns {Object} Engine status
   */
  getStatus() {
    return {
      status: 'operational',
      version: this.version,
      constants_profile: this.constantsProfile,
      bank_hash: this.bankHash,
      fingerprint: this.generateFingerprint(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      timestamp: new Date().toISOString()
    };
  }
}

// Create singleton instance
const engineVersion = new EngineVersion();

module.exports = engineVersion;
