/**
 * Deprecation & Sunset - Batch 5 Implementation
 * 
 * Features:
 * - Bank lifecycle management
 * - Sunset procedures
 * - Compatibility mapping
 * - Data retention policies
 */

const fs = require('fs');
const path = require('path');

const SUNSET_DIR = path.join(__dirname, '..', 'sunset');
const COMPATIBILITY_DIR = path.join(__dirname, '..', 'compatibility');

// Ensure directories exist
if (!fs.existsSync(SUNSET_DIR)) {
  fs.mkdirSync(SUNSET_DIR, { recursive: true });
}
if (!fs.existsSync(COMPATIBILITY_DIR)) {
  fs.mkdirSync(COMPATIBILITY_DIR, { recursive: true });
}

/**
 * Deprecation policy configuration
 */
const DEPRECATION_POLICY = {
  SUNSET_NOTICE_DAYS: 30,
  RETENTION_DAYS: 90,
  COMPATIBILITY_RETENTION_DAYS: 365,
  REGULATORY_RETENTION_DAYS: 2555 // 7 years
};

/**
 * Bank lifecycle states
 */
const LIFECYCLE_STATES = {
  ACTIVE: 'active',
  DEPRECATED: 'deprecated',
  SUNSET: 'sunset',
  ARCHIVED: 'archived'
};

/**
 * Load sunset registry
 */
function loadSunsetRegistry() {
  const registryPath = path.join(SUNSET_DIR, 'sunset_registry.json');
  
  if (fs.existsSync(registryPath)) {
    try {
      const content = fs.readFileSync(registryPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.warn('Failed to load sunset registry:', error.message);
    }
  }
  
  return {
    banks: [],
    compatibility_maps: [],
    last_updated: new Date().toISOString()
  };
}

/**
 * Save sunset registry
 */
function saveSunsetRegistry(registry) {
  const registryPath = path.join(SUNSET_DIR, 'sunset_registry.json');
  registry.last_updated = new Date().toISOString();
  fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}

/**
 * Mark bank as deprecated
 */
function markBankAsDeprecated(bankId, reason, sunsetDate) {
  const registry = loadSunsetRegistry();
  
  // Check if bank already exists
  const existingIndex = registry.banks.findIndex(b => b.bank_id === bankId);
  
  const bankEntry = {
    bank_id: bankId,
    state: LIFECYCLE_STATES.DEPRECATED,
    deprecated_at: new Date().toISOString(),
    sunset_date: sunsetDate,
    reason: reason,
    notice_period_days: DEPRECATION_POLICY.SUNSET_NOTICE_DAYS
  };
  
  if (existingIndex >= 0) {
    registry.banks[existingIndex] = bankEntry;
  } else {
    registry.banks.push(bankEntry);
  }
  
  saveSunsetRegistry(registry);
  console.log(`Bank ${bankId} marked as deprecated: ${reason}`);
  
  return bankEntry;
}

/**
 * Sunset bank
 */
function sunsetBank(bankId) {
  const registry = loadSunsetRegistry();
  const bankIndex = registry.banks.findIndex(b => b.bank_id === bankId);
  
  if (bankIndex === -1) {
    throw new Error(`Bank ${bankId} not found in registry`);
  }
  
  const bank = registry.banks[bankIndex];
  
  if (bank.state !== LIFECYCLE_STATES.DEPRECATED) {
    throw new Error(`Bank ${bankId} must be deprecated before sunset`);
  }
  
  // Check if sunset date has passed
  const sunsetDate = new Date(bank.sunset_date);
  const now = new Date();
  
  if (now < sunsetDate) {
    throw new Error(`Bank ${bankId} sunset date has not been reached`);
  }
  
  // Update bank state
  registry.banks[bankIndex] = {
    ...bank,
    state: LIFECYCLE_STATES.SUNSET,
    sunset_at: new Date().toISOString()
  };
  
  saveSunsetRegistry(registry);
  console.log(`Bank ${bankId} has been sunset`);
  
  return registry.banks[bankIndex];
}

/**
 * Archive bank
 */
function archiveBank(bankId) {
  const registry = loadSunsetRegistry();
  const bankIndex = registry.banks.findIndex(b => b.bank_id === bankId);
  
  if (bankIndex === -1) {
    throw new Error(`Bank ${bankId} not found in registry`);
  }
  
  const bank = registry.banks[bankIndex];
  
  if (bank.state !== LIFECYCLE_STATES.SUNSET) {
    throw new Error(`Bank ${bankId} must be sunset before archiving`);
  }
  
  // Check if retention period has passed
  const sunsetDate = new Date(bank.sunset_at);
  const now = new Date();
  const retentionMs = DEPRECATION_POLICY.RETENTION_DAYS * 24 * 60 * 60 * 1000;
  
  if ((now - sunsetDate) < retentionMs) {
    throw new Error(`Bank ${bankId} retention period has not expired`);
  }
  
  // Update bank state
  registry.banks[bankIndex] = {
    ...bank,
    state: LIFECYCLE_STATES.ARCHIVED,
    archived_at: new Date().toISOString()
  };
  
  saveSunsetRegistry(registry);
  console.log(`Bank ${bankId} has been archived`);
  
  return registry.banks[bankIndex];
}

/**
 * Create compatibility map
 */
function createCompatibilityMap(fromBankId, toBankId, mapping) {
  const registry = loadSunsetRegistry();
  
  const compatibilityMap = {
    from_bank: fromBankId,
    to_bank: toBankId,
    mapping: mapping,
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + DEPRECATION_POLICY.COMPATIBILITY_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()
  };
  
  registry.compatibility_maps.push(compatibilityMap);
  saveSunsetRegistry(registry);
  
  // Save compatibility map file
  const mapPath = path.join(COMPATIBILITY_DIR, `compatibility_${fromBankId}_to_${toBankId}.json`);
  fs.writeFileSync(mapPath, JSON.stringify(compatibilityMap, null, 2));
  
  console.log(`Compatibility map created: ${fromBankId} -> ${toBankId}`);
  
  return compatibilityMap;
}

/**
 * Get compatibility map
 */
function getCompatibilityMap(fromBankId, toBankId) {
  const registry = loadSunsetRegistry();
  
  return registry.compatibility_maps.find(map => 
    map.from_bank === fromBankId && map.to_bank === toBankId
  );
}

/**
 * List banks by state
 */
function listBanksByState(state) {
  const registry = loadSunsetRegistry();
  
  return registry.banks.filter(bank => bank.state === state);
}

/**
 * Get bank lifecycle status
 */
function getBankLifecycleStatus(bankId) {
  const registry = loadSunsetRegistry();
  const bank = registry.banks.find(b => b.bank_id === bankId);
  
  if (!bank) {
    return {
      bank_id: bankId,
      state: LIFECYCLE_STATES.ACTIVE,
      status: 'Not in sunset registry'
    };
  }
  
  const now = new Date();
  const status = {
    bank_id: bankId,
    state: bank.state,
    deprecated_at: bank.deprecated_at,
    sunset_date: bank.sunset_date,
    sunset_at: bank.sunset_at,
    archived_at: bank.archived_at,
    reason: bank.reason
  };
  
  // Calculate time until sunset
  if (bank.state === LIFECYCLE_STATES.DEPRECATED && bank.sunset_date) {
    const sunsetDate = new Date(bank.sunset_date);
    const daysUntilSunset = Math.ceil((sunsetDate - now) / (24 * 60 * 60 * 1000));
    status.days_until_sunset = daysUntilSunset;
  }
  
  // Calculate time until archive
  if (bank.state === LIFECYCLE_STATES.SUNSET && bank.sunset_at) {
    const sunsetDate = new Date(bank.sunset_at);
    const retentionMs = DEPRECATION_POLICY.RETENTION_DAYS * 24 * 60 * 60 * 1000;
    const archiveDate = new Date(sunsetDate.getTime() + retentionMs);
    const daysUntilArchive = Math.ceil((archiveDate - now) / (24 * 60 * 60 * 1000));
    status.days_until_archive = daysUntilArchive;
  }
  
  return status;
}

/**
 * Clean up expired data
 */
function cleanupExpiredData() {
  const registry = loadSunsetRegistry();
  const now = new Date();
  let cleanedCount = 0;
  
  // Clean up expired compatibility maps
  const beforeCount = registry.compatibility_maps.length;
  registry.compatibility_maps = registry.compatibility_maps.filter(map => {
    const expiresAt = new Date(map.expires_at);
    return now < expiresAt;
  });
  const afterCount = registry.compatibility_maps.length;
  cleanedCount += beforeCount - afterCount;
  
  // Clean up archived banks (if regulatory retention not required)
  const archivedBanks = registry.banks.filter(bank => bank.state === LIFECYCLE_STATES.ARCHIVED);
  for (const bank of archivedBanks) {
    const archivedDate = new Date(bank.archived_at);
    const regulatoryRetentionMs = DEPRECATION_POLICY.REGULATORY_RETENTION_DAYS * 24 * 60 * 60 * 1000;
    
    if ((now - archivedDate) > regulatoryRetentionMs) {
      // Remove from registry
      const index = registry.banks.findIndex(b => b.bank_id === bank.bank_id);
      if (index >= 0) {
        registry.banks.splice(index, 1);
        cleanedCount++;
      }
    }
  }
  
  if (cleanedCount > 0) {
    saveSunsetRegistry(registry);
    console.log(`Cleaned up ${cleanedCount} expired entries`);
  }
  
  return cleanedCount;
}

/**
 * Generate sunset report
 */
function generateSunsetReport() {
  const registry = loadSunsetRegistry();
  const now = new Date();
  
  const report = {
    schema: 'sunset_report.v1',
    generated_at: now.toISOString(),
    policy: DEPRECATION_POLICY,
    summary: {
      total_banks: registry.banks.length,
      active_banks: registry.banks.filter(b => b.state === LIFECYCLE_STATES.ACTIVE).length,
      deprecated_banks: registry.banks.filter(b => b.state === LIFECYCLE_STATES.DEPRECATED).length,
      sunset_banks: registry.banks.filter(b => b.state === LIFECYCLE_STATES.SUNSET).length,
      archived_banks: registry.banks.filter(b => b.state === LIFECYCLE_STATES.ARCHIVED).length,
      compatibility_maps: registry.compatibility_maps.length
    },
    banks: registry.banks.map(bank => getBankLifecycleStatus(bank.bank_id)),
    upcoming_sunsets: registry.banks
      .filter(bank => bank.state === LIFECYCLE_STATES.DEPRECATED && bank.sunset_date)
      .map(bank => {
        const sunsetDate = new Date(bank.sunset_date);
        const daysUntilSunset = Math.ceil((sunsetDate - now) / (24 * 60 * 60 * 1000));
        return {
          bank_id: bank.bank_id,
          sunset_date: bank.sunset_date,
          days_until_sunset: daysUntilSunset,
          reason: bank.reason
        };
      })
      .sort((a, b) => a.days_until_sunset - b.days_until_sunset)
  };
  
  return report;
}

/**
 * Export sunset data
 */
function exportSunsetData() {
  const registry = loadSunsetRegistry();
  
  return {
    registry,
    policy: DEPRECATION_POLICY,
    lifecycle_states: LIFECYCLE_STATES,
    exported_at: new Date().toISOString()
  };
}

/**
 * Validate sunset registry
 */
function validateSunsetRegistry() {
  const registry = loadSunsetRegistry();
  const errors = [];
  
  // Validate banks
  for (const bank of registry.banks) {
    if (!bank.bank_id) {
      errors.push('Bank missing bank_id');
    }
    
    if (!Object.values(LIFECYCLE_STATES).includes(bank.state)) {
      errors.push(`Bank ${bank.bank_id} has invalid state: ${bank.state}`);
    }
    
    if (bank.state === LIFECYCLE_STATES.DEPRECATED && !bank.sunset_date) {
      errors.push(`Bank ${bank.bank_id} is deprecated but missing sunset_date`);
    }
  }
  
  // Validate compatibility maps
  for (const map of registry.compatibility_maps) {
    if (!map.from_bank || !map.to_bank) {
      errors.push('Compatibility map missing from_bank or to_bank');
    }
    
    if (!map.mapping) {
      errors.push('Compatibility map missing mapping data');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  DEPRECATION_POLICY,
  LIFECYCLE_STATES,
  loadSunsetRegistry,
  saveSunsetRegistry,
  markBankAsDeprecated,
  sunsetBank,
  archiveBank,
  createCompatibilityMap,
  getCompatibilityMap,
  listBanksByState,
  getBankLifecycleStatus,
  cleanupExpiredData,
  generateSunsetReport,
  exportSunsetData,
  validateSunsetRegistry
};
