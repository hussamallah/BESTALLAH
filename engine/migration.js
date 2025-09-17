/**
 * Migration Strategy
 * 
 * Handles forward-only bank migrations and session binding.
 * Banks are immutable; sessions bind to bank id and hash.
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class MigrationManager {
  constructor() {
    this.migrationHistory = new Map();
    this.bankRegistry = new Map();
    this.sessionBindings = new Map();
  }

  /**
   * Register a new bank version
   */
  registerBankVersion(bankPackage) {
    const bankId = bankPackage.meta.bank_id;
    const bankHash = bankPackage.meta.bank_hash_sha256;
    const version = bankPackage.meta.version;

    // Validate bank package
    if (!this.validateBankPackage(bankPackage)) {
      throw new Error(`Invalid bank package for ${bankId}`);
    }

    // Check for hash conflicts
    if (this.bankRegistry.has(bankHash)) {
      const existing = this.bankRegistry.get(bankHash);
      if (existing.bank_id !== bankId) {
        throw new Error(`Hash collision: ${bankHash} already used by ${existing.bank_id}`);
      }
    }

    // Register bank
    this.bankRegistry.set(bankHash, {
      bank_id: bankId,
      bank_hash: bankHash,
      version: version,
      created_at: new Date().toISOString(),
      package: bankPackage,
      active: true
    });

    // Record migration
    this.recordMigration(bankId, version, 'registered');

    console.log(`Registered bank version: ${bankId} (${bankHash.substring(0, 8)}...)`);
  }

  /**
   * Deploy a bank version (make it available for new sessions)
   */
  deployBankVersion(bankHash) {
    const bankInfo = this.bankRegistry.get(bankHash);
    if (!bankInfo) {
      throw new Error(`Bank not found: ${bankHash}`);
    }

    // Deactivate previous versions of the same bank
    for (const [hash, info] of this.bankRegistry.entries()) {
      if (info.bank_id === bankInfo.bank_id && hash !== bankHash) {
        info.active = false;
        info.deprecated_at = new Date().toISOString();
      }
    }

    // Activate this version
    bankInfo.active = true;
    bankInfo.deployed_at = new Date().toISOString();

    this.recordMigration(bankInfo.bank_id, bankInfo.version, 'deployed');

    console.log(`Deployed bank version: ${bankInfo.bank_id} (${bankHash.substring(0, 8)}...)`);
  }

  /**
   * Get active bank version for a bank ID
   */
  getActiveBankVersion(bankId) {
    for (const [hash, info] of this.bankRegistry.entries()) {
      if (info.bank_id === bankId && info.active) {
        return info;
      }
    }
    return null;
  }

  /**
   * Get bank by hash
   */
  getBankByHash(bankHash) {
    return this.bankRegistry.get(bankHash);
  }

  /**
   * Bind session to bank
   */
  bindSessionToBank(sessionId, bankHash) {
    const bankInfo = this.bankRegistry.get(bankHash);
    if (!bankInfo) {
      throw new Error(`Bank not found: ${bankHash}`);
    }

    if (!bankInfo.active) {
      throw new Error(`Bank version is not active: ${bankInfo.bank_id}`);
    }

    this.sessionBindings.set(sessionId, {
      session_id: sessionId,
      bank_id: bankInfo.bank_id,
      bank_hash: bankHash,
      bound_at: new Date().toISOString(),
      version: bankInfo.version
    });

    console.log(`Bound session ${sessionId} to bank ${bankInfo.bank_id} (${bankHash.substring(0, 8)}...)`);
  }

  /**
   * Get session bank binding
   */
  getSessionBankBinding(sessionId) {
    return this.sessionBindings.get(sessionId);
  }

  /**
   * Validate session bank binding
   */
  validateSessionBankBinding(sessionId, expectedBankId) {
    const binding = this.sessionBindings.get(sessionId);
    if (!binding) {
      throw new Error(`Session ${sessionId} not bound to any bank`);
    }

    if (binding.bank_id !== expectedBankId) {
      throw new Error(`Session ${sessionId} bound to ${binding.bank_id}, expected ${expectedBankId}`);
    }

    return binding;
  }

  /**
   * Check if session can continue with current bank
   */
  canSessionContinue(sessionId) {
    const binding = this.sessionBindings.get(sessionId);
    if (!binding) {
      return false;
    }

    const bankInfo = this.bankRegistry.get(binding.bank_hash);
    return bankInfo && bankInfo.active;
  }

  /**
   * Get migration path between bank versions
   */
  getMigrationPath(fromBankId, toBankId) {
    const fromVersions = this.getBankVersions(fromBankId);
    const toVersions = this.getBankVersions(toBankId);

    if (fromVersions.length === 0) {
      throw new Error(`No versions found for bank ${fromBankId}`);
    }

    if (toVersions.length === 0) {
      throw new Error(`No versions found for bank ${toBankId}`);
    }

    const fromLatest = fromVersions[fromVersions.length - 1];
    const toLatest = toVersions[toVersions.length - 1];

    return {
      from: fromLatest,
      to: toLatest,
      migration_required: fromLatest.bank_id !== toLatest.bank_id,
      breaking_changes: this.detectBreakingChanges(fromLatest, toLatest)
    };
  }

  /**
   * Get all versions of a bank
   */
  getBankVersions(bankId) {
    const versions = [];
    for (const [hash, info] of this.bankRegistry.entries()) {
      if (info.bank_id === bankId) {
        versions.push(info);
      }
    }
    return versions.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  /**
   * Detect breaking changes between bank versions
   */
  detectBreakingChanges(fromBank, toBank) {
    const changes = [];

    // Check if it's the same bank
    if (fromBank.bank_id === toBank.bank_id) {
      return changes; // No breaking changes for same bank
    }

    // Different banks are always breaking changes
    changes.push({
      type: 'bank_change',
      from: fromBank.bank_id,
      to: toBank.bank_id,
      breaking: true
    });

    // Check for structural changes
    const fromQuestions = this.flattenQuestions(fromBank.package.questions);
    const toQuestions = this.flattenQuestions(toBank.package.questions);

    // Check for removed questions
    for (const qid of Object.keys(fromQuestions)) {
      if (!toQuestions[qid]) {
        changes.push({
          type: 'question_removed',
          qid: qid,
          breaking: true
        });
      }
    }

    // Check for changed question structure
    for (const qid of Object.keys(toQuestions)) {
      if (fromQuestions[qid]) {
        const fromQ = fromQuestions[qid];
        const toQ = toQuestions[qid];
        
        if (this.hasStructuralChanges(fromQ, toQ)) {
          changes.push({
            type: 'question_structure_changed',
            qid: qid,
            breaking: true
          });
        }
      }
    }

    return changes;
  }

  /**
   * Check for structural changes in questions
   */
  hasStructuralChanges(fromQuestion, toQuestion) {
    // Check option count
    if (fromQuestion.options.length !== toQuestion.options.length) {
      return true;
    }

    // Check option structure
    for (let i = 0; i < fromQuestion.options.length; i++) {
      const fromOption = fromQuestion.options[i];
      const toOption = toQuestion.options[i];

      // Check lineCOF changes
      if (fromOption.lineCOF !== toOption.lineCOF) {
        return true;
      }

      // Check tell structure changes
      const fromTells = fromOption.tells || [];
      const toTells = toOption.tells || [];
      
      if (fromTells.length !== toTells.length) {
        return true;
      }
    }

    return false;
  }

  /**
   * Flatten questions for comparison
   */
  flattenQuestions(questionsByFamily) {
    const flattened = {};
    for (const [family, questions] of Object.entries(questionsByFamily)) {
      for (const question of questions) {
        flattened[question.qid] = question;
      }
    }
    return flattened;
  }

  /**
   * Record migration event
   */
  recordMigration(bankId, version, action) {
    const migrationId = crypto.randomUUID();
    const migration = {
      id: migrationId,
      bank_id: bankId,
      version: version,
      action: action,
      timestamp: new Date().toISOString()
    };

    this.migrationHistory.set(migrationId, migration);
  }

  /**
   * Get migration history
   */
  getMigrationHistory(bankId = null) {
    const history = Array.from(this.migrationHistory.values());
    
    if (bankId) {
      return history.filter(m => m.bank_id === bankId);
    }
    
    return history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  /**
   * Validate bank package
   */
  validateBankPackage(bankPackage) {
    // Check required fields
    if (!bankPackage.meta || !bankPackage.meta.bank_id || !bankPackage.meta.bank_hash_sha256) {
      return false;
    }

    // Check package structure
    if (!bankPackage.registries || !bankPackage.questions) {
      return false;
    }

    // Check signature
    if (!bankPackage.meta.signature) {
      return false;
    }

    return true;
  }

  /**
   * Generate migration report
   */
  generateMigrationReport() {
    const report = {
      timestamp: new Date().toISOString(),
      total_banks: this.bankRegistry.size,
      active_banks: Array.from(this.bankRegistry.values()).filter(b => b.active).length,
      total_sessions: this.sessionBindings.size,
      migration_history: this.getMigrationHistory(),
      bank_versions: {}
    };

    // Group by bank ID
    for (const [hash, info] of this.bankRegistry.entries()) {
      if (!report.bank_versions[info.bank_id]) {
        report.bank_versions[info.bank_id] = [];
      }
      report.bank_versions[info.bank_id].push({
        hash: hash.substring(0, 8) + '...',
        version: info.version,
        active: info.active,
        created_at: info.created_at,
        deployed_at: info.deployed_at
      });
    }

    return report;
  }

  /**
   * Save migration state
   */
  saveMigrationState(filePath) {
    const state = {
      migration_history: Array.from(this.migrationHistory.values()),
      bank_registry: Array.from(this.bankRegistry.entries()),
      session_bindings: Array.from(this.sessionBindings.entries())
    };

    fs.writeFileSync(filePath, JSON.stringify(state, null, 2));
  }

  /**
   * Load migration state
   */
  loadMigrationState(filePath) {
    if (!fs.existsSync(filePath)) {
      return;
    }

    const state = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Restore migration history
    this.migrationHistory.clear();
    for (const migration of state.migration_history || []) {
      this.migrationHistory.set(migration.id, migration);
    }

    // Restore bank registry
    this.bankRegistry.clear();
    for (const [hash, info] of state.bank_registry || []) {
      this.bankRegistry.set(hash, info);
    }

    // Restore session bindings
    this.sessionBindings.clear();
    for (const [sessionId, binding] of state.session_bindings || []) {
      this.sessionBindings.set(sessionId, binding);
    }
  }

  /**
   * Clean up deprecated banks
   */
  cleanupDeprecatedBanks(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    let cleaned = 0;
    for (const [hash, info] of this.bankRegistry.entries()) {
      if (!info.active && info.deprecated_at) {
        const deprecatedDate = new Date(info.deprecated_at);
        if (deprecatedDate < cutoffDate) {
          this.bankRegistry.delete(hash);
          cleaned++;
        }
      }
    }

    console.log(`Cleaned up ${cleaned} deprecated banks`);
    return cleaned;
  }

  /**
   * Get bank compatibility matrix
   */
  getCompatibilityMatrix() {
    const matrix = {};
    const banks = Array.from(this.bankRegistry.values());

    for (const fromBank of banks) {
      matrix[fromBank.bank_id] = {};
      
      for (const toBank of banks) {
        if (fromBank.bank_id === toBank.bank_id) {
          matrix[fromBank.bank_id][toBank.bank_id] = 'same';
        } else {
          const changes = this.detectBreakingChanges(fromBank, toBank);
          matrix[fromBank.bank_id][toBank.bank_id] = changes.length > 0 ? 'breaking' : 'compatible';
        }
      }
    }

    return matrix;
  }
}

module.exports = MigrationManager;
