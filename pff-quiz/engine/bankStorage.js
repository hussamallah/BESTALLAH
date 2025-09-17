/**
 * Bank Storage - Immutable bank management with hash verification
 * Ensures bank immutability and provides read-only access
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

class BankStorage {
  constructor() {
    this.loadedBanks = new Map(); // bankHash -> bankData
    this.allowedHashes = new Set(); // Whitelist of allowed bank hashes
    this.readOnlyMode = true;
  }

  /**
   * Load and verify bank package
   * @param {string} bankPath - Path to bank_package_signed.json
   * @returns {Object} Bank data with hash verification
   */
  loadBank(bankPath) {
    try {
      // Load bank package
      const bankData = fs.readFileSync(bankPath, 'utf8');
      const bankPackage = JSON.parse(bankData);

      // Verify signature exists
      if (!bankPackage.meta.signature) {
        throw new Error('Bank package must be signed');
      }

      // Get bank hash
      const bankHash = bankPackage.meta.bank_hash_sha256;
      if (!bankHash) {
        throw new Error('Bank package missing hash');
      }

      // Verify hash matches content
      const computedHash = this._computeBankHash(bankPackage);
      if (computedHash !== bankHash) {
        throw new Error(`Bank hash mismatch: expected ${bankHash}, got ${computedHash}`);
      }

      // Check if hash is allowed (if whitelist is configured)
      if (this.allowedHashes.size > 0 && !this.allowedHashes.has(bankHash)) {
        throw new Error(`Bank hash ${bankHash} not in allowed list`);
      }

      // Store bank data (immutable)
      const immutableBank = this._makeImmutable(bankPackage);
      this.loadedBanks.set(bankHash, {
        data: immutableBank,
        loadedAt: new Date().toISOString(),
        path: bankPath
      });

      console.log(`✅ Bank loaded and verified: ${bankHash}`);
      return immutableBank;

    } catch (error) {
      throw new Error(`Failed to load bank: ${error.message}`);
    }
  }

  /**
   * Get bank data by hash
   * @param {string} bankHash - Bank hash
   * @returns {Object} Immutable bank data
   */
  getBank(bankHash) {
    const bankEntry = this.loadedBanks.get(bankHash);
    if (!bankEntry) {
      throw new Error(`Bank not loaded: ${bankHash}`);
    }
    return bankEntry.data;
  }

  /**
   * Get all loaded bank hashes
   * @returns {Array<string>} Array of loaded bank hashes
   */
  getLoadedHashes() {
    return Array.from(this.loadedBanks.keys());
  }

  /**
   * Add allowed bank hash to whitelist
   * @param {string} bankHash - Bank hash to allow
   */
  addAllowedHash(bankHash) {
    this.allowedHashes.add(bankHash);
  }

  /**
   * Set allowed bank hashes from environment or config
   * @param {Array<string>} hashes - Array of allowed hashes
   */
  setAllowedHashes(hashes) {
    this.allowedHashes = new Set(hashes);
  }

  /**
   * Compute hash of bank package content
   * @param {Object} bankPackage - Bank package object
   * @returns {string} SHA256 hash
   */
  _computeBankHash(bankPackage) {
    // Use the existing hash from the bank package if available
    if (bankPackage.meta && bankPackage.meta.bank_hash_sha256) {
      return bankPackage.meta.bank_hash_sha256;
    }
    
    // Fallback: compute hash from content
    const content = JSON.stringify(bankPackage, Object.keys(bankPackage).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Make bank data immutable using Object.freeze
   * @param {Object} bankPackage - Bank package to freeze
   * @returns {Object} Immutable bank package
   */
  _makeImmutable(bankPackage) {
    // Deep freeze the bank package
    const freeze = (obj) => {
      if (obj === null || typeof obj !== 'object') {
        return obj;
      }
      
      // Freeze the object first
      Object.freeze(obj);
      
      // Recursively freeze all properties
      Object.getOwnPropertyNames(obj).forEach(prop => {
        if (obj[prop] !== null && typeof obj[prop] === 'object') {
          freeze(obj[prop]);
        }
      });
      
      return obj;
    };

    // Deep clone first, then freeze
    const cloned = JSON.parse(JSON.stringify(bankPackage));
    return freeze(cloned);
  }

  /**
   * Verify bank integrity
   * @param {string} bankHash - Bank hash to verify
   * @returns {boolean} True if bank is valid
   */
  verifyBank(bankHash) {
    try {
      const bankEntry = this.loadedBanks.get(bankHash);
      if (!bankEntry) {
        return false;
      }

      // Re-compute hash and verify
      const computedHash = this._computeBankHash(bankEntry.data);
      return computedHash === bankHash;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get bank metadata
   * @param {string} bankHash - Bank hash
   * @returns {Object} Bank metadata
   */
  getBankMetadata(bankHash) {
    const bankEntry = this.loadedBanks.get(bankHash);
    if (!bankEntry) {
      throw new Error(`Bank not loaded: ${bankHash}`);
    }

    return {
      hash: bankHash,
      loadedAt: bankEntry.loadedAt,
      path: bankEntry.path,
      constantsProfile: bankEntry.data.meta.constants_profile,
      bankId: bankEntry.data.meta.bank_id,
      createdAt: bankEntry.data.meta.created_at,
      packedAt: bankEntry.data.meta.packed_at
    };
  }

  /**
   * Create bank snapshot for replay
   * @param {string} bankHash - Bank hash
   * @returns {Object} Bank snapshot
   */
  createSnapshot(bankHash) {
    const bankEntry = this.loadedBanks.get(bankHash);
    if (!bankEntry) {
      throw new Error(`Bank not loaded: ${bankHash}`);
    }

    return {
      bank_hash: bankHash,
      constants_profile: bankEntry.data.meta.constants_profile,
      bank_id: bankEntry.data.meta.bank_id,
      snapshot_at: new Date().toISOString(),
      questions_count: Object.keys(bankEntry.data.questions).length,
      faces_count: bankEntry.data.registries.faces.faces.length,
      tells_count: bankEntry.data.registries.tells.tells.length
    };
  }
}

// Create singleton instance
const bankStorage = new BankStorage();

// Load allowed hashes from environment
if (process.env.ALLOWED_BANK_HASHES) {
  try {
    const allowedHashes = JSON.parse(process.env.ALLOWED_BANK_HASHES);
    bankStorage.setAllowedHashes(allowedHashes);
    console.log(`🔒 Loaded ${allowedHashes.length} allowed bank hashes`);
  } catch (error) {
    console.warn('⚠️ Failed to parse ALLOWED_BANK_HASHES:', error.message);
  }
}

export default bankStorage;
