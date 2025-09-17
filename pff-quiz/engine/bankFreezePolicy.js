/**
 * Bank Freeze Policy - Batch 5 Implementation
 * 
 * Features:
 * - Single active bank per environment
 * - Legacy bank management
 * - Freeze prevention mechanisms
 * - Bank lifecycle management
 */

const fs = require('fs');
const path = require('path');

const FREEZE_DIR = path.join(__dirname, '..', 'freeze');
const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');

// Ensure freeze directory exists
if (!fs.existsSync(FREEZE_DIR)) {
  fs.mkdirSync(FREEZE_DIR, { recursive: true });
}

/**
 * Bank freeze policy configuration
 */
const FREEZE_POLICY = {
  MAX_ACTIVE_BANKS: 1,
  MAX_LEGACY_BANKS: 3,
  FREEZE_PREVENTION: true,
  LEGACY_RETENTION_DAYS: 30
};

/**
 * Bank freeze state
 */
let freezeState = {
  active_bank: null,
  legacy_banks: [],
  frozen: false,
  freeze_reason: null,
  frozen_at: null
};

/**
 * Load freeze state from disk
 */
function loadFreezeState() {
  const statePath = path.join(FREEZE_DIR, 'freeze_state.json');
  
  if (fs.existsSync(statePath)) {
    try {
      const content = fs.readFileSync(statePath, 'utf8');
      freezeState = JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load freeze state:', error.message);
    }
  }
  
  return freezeState;
}

/**
 * Save freeze state to disk
 */
function saveFreezeState() {
  const statePath = path.join(FREEZE_DIR, 'freeze_state.json');
  fs.writeFileSync(statePath, JSON.stringify(freezeState, null, 2));
}

/**
 * Initialize freeze state
 */
function initializeFreezeState() {
  freezeState = {
    active_bank: null,
    legacy_banks: [],
    frozen: false,
    freeze_reason: null,
    frozen_at: null
  };
  saveFreezeState();
}

/**
 * Set active bank
 */
function setActiveBank(bankId, bankPath) {
  if (freezeState.frozen) {
    throw new Error(`Cannot set active bank: system is frozen (${freezeState.freeze_reason})`);
  }
  
  // Move previous active bank to legacy if it exists
  if (freezeState.active_bank) {
    moveToLegacy(freezeState.active_bank);
  }
  
  // Set new active bank
  freezeState.active_bank = {
    bank_id: bankId,
    bank_path: bankPath,
    activated_at: new Date().toISOString()
  };
  
  saveFreezeState();
  console.log(`Active bank set to: ${bankId}`);
}

/**
 * Move bank to legacy
 */
function moveToLegacy(bank) {
  // Add to legacy banks
  freezeState.legacy_banks.push({
    ...bank,
    moved_to_legacy_at: new Date().toISOString()
  });
  
  // Enforce legacy bank limit
  if (freezeState.legacy_banks.length > FREEZE_POLICY.MAX_LEGACY_BANKS) {
    const oldest = freezeState.legacy_banks.shift();
    console.log(`Removed oldest legacy bank: ${oldest.bank_id}`);
  }
  
  saveFreezeState();
}

/**
 * Get active bank
 */
function getActiveBank() {
  return freezeState.active_bank;
}

/**
 * Get legacy banks
 */
function getLegacyBanks() {
  return freezeState.legacy_banks;
}

/**
 * Freeze bank system
 */
function freezeBankSystem(reason) {
  freezeState.frozen = true;
  freezeState.freeze_reason = reason;
  freezeState.frozen_at = new Date().toISOString();
  
  saveFreezeState();
  console.log(`Bank system frozen: ${reason}`);
}

/**
 * Unfreeze bank system
 */
function unfreezeBankSystem() {
  freezeState.frozen = false;
  freezeState.freeze_reason = null;
  freezeState.frozen_at = null;
  
  saveFreezeState();
  console.log('Bank system unfrozen');
}

/**
 * Check if system is frozen
 */
function isSystemFrozen() {
  return freezeState.frozen;
}

/**
 * Get freeze status
 */
function getFreezeStatus() {
  return {
    frozen: freezeState.frozen,
    reason: freezeState.freeze_reason,
    frozen_at: freezeState.frozen_at,
    active_bank: freezeState.active_bank,
    legacy_count: freezeState.legacy_banks.length
  };
}

/**
 * Validate bank before activation
 */
function validateBankForActivation(bankPath) {
  const errors = [];
  
  // Check if bank file exists
  if (!fs.existsSync(bankPath)) {
    errors.push(`Bank file not found: ${bankPath}`);
    return { valid: false, errors };
  }
  
  // Check if system is frozen
  if (isSystemFrozen()) {
    errors.push(`System is frozen: ${freezeState.freeze_reason}`);
    return { valid: false, errors };
  }
  
  // Load and validate bank package
  try {
    const bankPackage = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    
    // Check required fields
    if (!bankPackage.meta || !bankPackage.meta.bank_id) {
      errors.push('Bank package missing meta.bank_id');
    }
    
    if (!bankPackage.meta || !bankPackage.meta.bank_hash_sha256) {
      errors.push('Bank package missing meta.bank_hash_sha256');
    }
    
    if (!bankPackage.meta || !bankPackage.meta.signature) {
      errors.push('Bank package missing signature');
    }
    
    // Check if bank is already active
    if (freezeState.active_bank && freezeState.active_bank.bank_id === bankPackage.meta.bank_id) {
      errors.push('Bank is already active');
    }
    
  } catch (error) {
    errors.push(`Failed to load bank package: ${error.message}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Activate bank
 */
function activateBank(bankPath) {
  const validation = validateBankForActivation(bankPath);
  
  if (!validation.valid) {
    throw new Error(`Bank validation failed: ${validation.errors.join(', ')}`);
  }
  
  const bankPackage = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
  setActiveBank(bankPackage.meta.bank_id, bankPath);
  
  return {
    success: true,
    bank_id: bankPackage.meta.bank_id,
    activated_at: freezeState.active_bank.activated_at
  };
}

/**
 * Rollback to previous bank
 */
function rollbackToPreviousBank() {
  if (freezeState.legacy_banks.length === 0) {
    throw new Error('No previous bank available for rollback');
  }
  
  const previousBank = freezeState.legacy_banks.pop();
  
  // Set as active
  freezeState.active_bank = {
    bank_id: previousBank.bank_id,
    bank_path: previousBank.bank_path,
    activated_at: new Date().toISOString(),
    rolled_back_from: previousBank.moved_to_legacy_at
  };
  
  saveFreezeState();
  console.log(`Rolled back to bank: ${previousBank.bank_id}`);
  
  return {
    success: true,
    bank_id: previousBank.bank_id,
    rolled_back_at: freezeState.active_bank.activated_at
  };
}

/**
 * List available banks
 */
function listAvailableBanks() {
  const banks = [];
  
  // Add active bank
  if (freezeState.active_bank) {
    banks.push({
      bank_id: freezeState.active_bank.bank_id,
      status: 'active',
      activated_at: freezeState.active_bank.activated_at,
      path: freezeState.active_bank.bank_path
    });
  }
  
  // Add legacy banks
  for (const legacy of freezeState.legacy_banks) {
    banks.push({
      bank_id: legacy.bank_id,
      status: 'legacy',
      moved_to_legacy_at: legacy.moved_to_legacy_at,
      path: legacy.bank_path
    });
  }
  
  return banks;
}

/**
 * Clean up expired legacy banks
 */
function cleanupExpiredLegacyBanks() {
  const now = new Date();
  const retentionMs = FREEZE_POLICY.LEGACY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  const beforeCount = freezeState.legacy_banks.length;
  
  freezeState.legacy_banks = freezeState.legacy_banks.filter(bank => {
    const movedAt = new Date(bank.moved_to_legacy_at);
    return (now - movedAt) < retentionMs;
  });
  
  const afterCount = freezeState.legacy_banks.length;
  const cleanedCount = beforeCount - afterCount;
  
  if (cleanedCount > 0) {
    console.log(`Cleaned up ${cleanedCount} expired legacy banks`);
    saveFreezeState();
  }
  
  return cleanedCount;
}

/**
 * Get bank freeze policy
 */
function getBankFreezePolicy() {
  return {
    ...FREEZE_POLICY,
    current_state: getFreezeStatus(),
    available_banks: listAvailableBanks()
  };
}

/**
 * Export bank freeze data
 */
function exportBankFreezeData() {
  return {
    policy: FREEZE_POLICY,
    state: freezeState,
    available_banks: listAvailableBanks(),
    exported_at: new Date().toISOString()
  };
}

/**
 * Initialize freeze system
 */
function initializeFreezeSystem() {
  loadFreezeState();
  
  // Clean up expired legacy banks
  cleanupExpiredLegacyBanks();
  
  console.log('Bank freeze system initialized');
  console.log(`Active bank: ${freezeState.active_bank ? freezeState.active_bank.bank_id : 'None'}`);
  console.log(`Legacy banks: ${freezeState.legacy_banks.length}`);
  console.log(`Frozen: ${freezeState.frozen}`);
}

// Initialize on module load
initializeFreezeSystem();

module.exports = {
  FREEZE_POLICY,
  loadFreezeState,
  saveFreezeState,
  initializeFreezeState,
  setActiveBank,
  getActiveBank,
  getLegacyBanks,
  freezeBankSystem,
  unfreezeBankSystem,
  isSystemFrozen,
  getFreezeStatus,
  validateBankForActivation,
  activateBank,
  rollbackToPreviousBank,
  listAvailableBanks,
  cleanupExpiredLegacyBanks,
  getBankFreezePolicy,
  exportBankFreezeData,
  initializeFreezeSystem
};
