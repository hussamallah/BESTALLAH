/**
 * Multi-Env Config - Batch 5 Implementation
 * 
 * Features:
 * - Separate signing keys per environment
 * - Distinct bank registries per environment
 * - Environment-specific configuration
 * - No cross-pollination between environments
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const CONFIG_DIR = path.join(__dirname, '..', 'config');
const KEYS_DIR = path.join(__dirname, '..', 'keys');

// Ensure directories exist
if (!fs.existsSync(CONFIG_DIR)) {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
}
if (!fs.existsSync(KEYS_DIR)) {
  fs.mkdirSync(KEYS_DIR, { recursive: true });
}

/**
 * Environment definitions
 */
const ENVIRONMENTS = {
  DEVELOPMENT: 'development',
  STAGING: 'staging',
  PRODUCTION: 'production'
};

/**
 * Environment-specific configuration
 */
const ENV_CONFIGS = {
  [ENVIRONMENTS.DEVELOPMENT]: {
    name: 'Development',
    signing_key_file: 'development.key',
    bank_registry_path: 'bank/registries/dev/',
    constants_profile: 'DEFAULT',
    retention_days: 7,
    debug_mode: true,
    allow_unsigned_banks: true
  },
  [ENVIRONMENTS.STAGING]: {
    name: 'Staging',
    signing_key_file: 'staging.key',
    bank_registry_path: 'bank/registries/staging/',
    constants_profile: 'DEFAULT',
    retention_days: 30,
    debug_mode: false,
    allow_unsigned_banks: false
  },
  [ENVIRONMENTS.PRODUCTION]: {
    name: 'Production',
    signing_key_file: 'production.key',
    bank_registry_path: 'bank/registries/prod/',
    constants_profile: 'DEFAULT',
    retention_days: 90,
    debug_mode: false,
    allow_unsigned_banks: false
  }
};

/**
 * Get current environment
 */
function getCurrentEnvironment() {
  return process.env.NODE_ENV || ENVIRONMENTS.DEVELOPMENT;
}

/**
 * Get environment configuration
 */
function getEnvironmentConfig(environment = null) {
  const env = environment || getCurrentEnvironment();
  
  if (!ENV_CONFIGS[env]) {
    throw new Error(`Unknown environment: ${env}`);
  }
  
  return ENV_CONFIGS[env];
}

/**
 * Load signing key for environment
 */
function loadSigningKey(environment = null) {
  const config = getEnvironmentConfig(environment);
  const keyPath = path.join(KEYS_DIR, config.signing_key_file);
  
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Signing key not found for environment ${environment}: ${keyPath}`);
  }
  
  return fs.readFileSync(keyPath, 'utf8').trim();
}

/**
 * Generate signing key for environment
 */
function generateSigningKey(environment = null) {
  const config = getEnvironmentConfig(environment);
  const keyPath = path.join(KEYS_DIR, config.signing_key_file);
  
  // Generate new key
  const key = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyPath, key);
  
  console.log(`Generated new signing key for ${config.name}: ${keyPath}`);
  return key;
}

/**
 * Get bank registry path for environment
 */
function getBankRegistryPath(environment = null) {
  const config = getEnvironmentConfig(environment);
  return path.join(__dirname, '..', config.bank_registry_path);
}

/**
 * Load bank registry for environment
 */
function loadBankRegistry(environment = null) {
  const registryPath = getBankRegistryPath(environment);
  
  if (!fs.existsSync(registryPath)) {
    throw new Error(`Bank registry not found for environment ${environment}: ${registryPath}`);
  }
  
  const registries = {};
  const registryFiles = ['families.json', 'faces.json', 'tells.json', 'contrast_matrix.json'];
  
  for (const file of registryFiles) {
    const filePath = path.join(registryPath, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      registries[file.replace('.json', '')] = JSON.parse(content);
    }
  }
  
  return registries;
}

/**
 * Save bank registry for environment
 */
function saveBankRegistry(registries, environment = null) {
  const registryPath = getBankRegistryPath(environment);
  
  // Ensure directory exists
  if (!fs.existsSync(registryPath)) {
    fs.mkdirSync(registryPath, { recursive: true });
  }
  
  for (const [name, data] of Object.entries(registries)) {
    const filePath = path.join(registryPath, `${name}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
  
  return registryPath;
}

/**
 * Validate environment isolation
 */
function validateEnvironmentIsolation() {
  const environments = Object.values(ENVIRONMENTS);
  const issues = [];
  
  for (const env of environments) {
    try {
      const config = getEnvironmentConfig(env);
      const registryPath = getBankRegistryPath(env);
      
      // Check if registry path exists and is isolated
      if (fs.existsSync(registryPath)) {
        const files = fs.readdirSync(registryPath);
        if (files.length === 0) {
          issues.push(`Environment ${env} has empty registry directory`);
        }
      } else {
        issues.push(`Environment ${env} missing registry directory`);
      }
      
      // Check signing key
      const keyPath = path.join(KEYS_DIR, config.signing_key_file);
      if (!fs.existsSync(keyPath)) {
        issues.push(`Environment ${env} missing signing key`);
      }
      
    } catch (error) {
      issues.push(`Environment ${env} configuration error: ${error.message}`);
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Initialize environment
 */
function initializeEnvironment(environment) {
  const config = getEnvironmentConfig(environment);
  
  // Generate signing key if it doesn't exist
  const keyPath = path.join(KEYS_DIR, config.signing_key_file);
  if (!fs.existsSync(keyPath)) {
    generateSigningKey(environment);
  }
  
  // Create registry directory if it doesn't exist
  const registryPath = getBankRegistryPath(environment);
  if (!fs.existsSync(registryPath)) {
    fs.mkdirSync(registryPath, { recursive: true });
  }
  
  // Create environment config file
  const configPath = path.join(CONFIG_DIR, `${environment}.json`);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  
  console.log(`Initialized environment: ${config.name}`);
  return config;
}

/**
 * List all environments
 */
function listEnvironments() {
  return Object.values(ENVIRONMENTS);
}

/**
 * Check if environment exists
 */
function environmentExists(environment) {
  return Object.values(ENVIRONMENTS).includes(environment);
}

/**
 * Get environment status
 */
function getEnvironmentStatus(environment) {
  const config = getEnvironmentConfig(environment);
  const status = {
    environment,
    name: config.name,
    initialized: false,
    signing_key_exists: false,
    registry_exists: false,
    config_file_exists: false
  };
  
  // Check signing key
  const keyPath = path.join(KEYS_DIR, config.signing_key_file);
  status.signing_key_exists = fs.existsSync(keyPath);
  
  // Check registry
  const registryPath = getBankRegistryPath(environment);
  status.registry_exists = fs.existsSync(registryPath);
  
  // Check config file
  const configPath = path.join(CONFIG_DIR, `${environment}.json`);
  status.config_file_exists = fs.existsSync(configPath);
  
  // Overall initialization status
  status.initialized = status.signing_key_exists && status.registry_exists && status.config_file_exists;
  
  return status;
}

/**
 * Export environment data
 */
function exportEnvironmentData(environment = null) {
  const env = environment || getCurrentEnvironment();
  const config = getEnvironmentConfig(env);
  const status = getEnvironmentStatus(env);
  
  return {
    environment: env,
    config,
    status,
    exported_at: new Date().toISOString()
  };
}

/**
 * Create environment-specific bank package
 */
function createEnvironmentBankPackage(bankPackage, environment = null) {
  const config = getEnvironmentConfig(environment);
  const envBankPackage = {
    ...bankPackage,
    meta: {
      ...bankPackage.meta,
      environment: environment || getCurrentEnvironment(),
      environment_config: config
    }
  };
  
  // Sign with environment-specific key
  const signingKey = loadSigningKey(environment);
  const packageString = JSON.stringify(envBankPackage, null, 0);
  const signature = crypto.createHmac('sha256', signingKey).update(packageString).digest('hex');
  
  envBankPackage.meta.signature = signature;
  envBankPackage.meta.signed_at = new Date().toISOString();
  envBankPackage.meta.signed_by = environment || getCurrentEnvironment();
  
  return envBankPackage;
}

/**
 * Validate environment bank package
 */
function validateEnvironmentBankPackage(bankPackage, environment = null) {
  const env = environment || getCurrentEnvironment();
  const config = getEnvironmentConfig(env);
  
  const errors = [];
  
  // Check environment matches
  if (bankPackage.meta.environment !== env) {
    errors.push(`Bank package environment ${bankPackage.meta.environment} does not match expected ${env}`);
  }
  
  // Check signature
  if (!bankPackage.meta.signature) {
    errors.push('Bank package is not signed');
  } else {
    try {
      const signingKey = loadSigningKey(env);
      const packageForVerification = { ...bankPackage };
      delete packageForVerification.meta.signature;
      delete packageForVerification.meta.signed_at;
      delete packageForVerification.meta.signed_by;
      
      const expectedSignature = crypto.createHmac('sha256', signingKey)
        .update(JSON.stringify(packageForVerification, null, 0))
        .digest('hex');
      
      if (bankPackage.meta.signature !== expectedSignature) {
        errors.push('Bank package signature is invalid');
      }
    } catch (error) {
      errors.push(`Signature validation failed: ${error.message}`);
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = {
  ENVIRONMENTS,
  ENV_CONFIGS,
  getCurrentEnvironment,
  getEnvironmentConfig,
  loadSigningKey,
  generateSigningKey,
  getBankRegistryPath,
  loadBankRegistry,
  saveBankRegistry,
  validateEnvironmentIsolation,
  initializeEnvironment,
  listEnvironments,
  environmentExists,
  getEnvironmentStatus,
  exportEnvironmentData,
  createEnvironmentBankPackage,
  validateEnvironmentBankPackage
};
