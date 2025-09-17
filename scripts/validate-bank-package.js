#!/usr/bin/env node

/**
 * Bank Package Validation Script
 * Validates bank package structure and signatures for Batch 3
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class BankPackageValidator {
  constructor() {
    this.errors = [];
    this.warnings = [];
  }

  /**
   * Validate bank package file
   * @param {string} packagePath - Path to bank package
   * @returns {Object} Validation result
   */
  validate(packagePath) {
    this.errors = [];
    this.warnings = [];

    try {
      // Load and parse package
      const packageData = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      
      // Validate structure
      this._validateStructure(packageData);
      
      // Validate signatures
      this._validateSignatures(packageData);
      
      // Validate content integrity
      this._validateContentIntegrity(packageData);
      
      // Validate Batch 3 components
      this._validateBatch3Components(packageData);

      return {
        valid: this.errors.length === 0,
        errors: this.errors,
        warnings: this.warnings,
        packagePath: packagePath
      };
    } catch (error) {
      return {
        valid: false,
        errors: [`Failed to load package: ${error.message}`],
        warnings: this.warnings,
        packagePath: packagePath
      };
    }
  }

  /**
   * Validate basic package structure
   * @param {Object} packageData - Package data
   */
  _validateStructure(packageData) {
    const requiredSections = ['meta', 'constants', 'questions', 'registries'];
    
    requiredSections.forEach(section => {
      if (!packageData[section]) {
        this.errors.push(`Missing required section: ${section}`);
      }
    });

    // Validate meta section
    if (packageData.meta) {
      const requiredMeta = ['bank_id', 'bank_hash_sha256', 'constants_profile', 'created_at', 'packed_at'];
      requiredMeta.forEach(field => {
        if (!packageData.meta[field]) {
          this.errors.push(`Missing required meta field: ${field}`);
        }
      });
    }

    // Validate registries section
    if (packageData.registries) {
      const requiredRegistries = ['families', 'faces', 'tells', 'contrast_matrix'];
      requiredRegistries.forEach(registry => {
        if (!packageData.registries[registry]) {
          this.errors.push(`Missing required registry: ${registry}`);
        }
      });
    }
  }

  /**
   * Validate signatures
   * @param {Object} packageData - Package data
   */
  _validateSignatures(packageData) {
    if (!packageData.meta.signature) {
      this.warnings.push('Package is not signed');
      return;
    }

    // Validate signature format
    const signature = packageData.meta.signature;
    if (!/^[a-f0-9]{64}$/.test(signature)) {
      this.errors.push('Invalid signature format');
    }

    // Validate signed_at timestamp
    if (packageData.meta.signed_at) {
      const signedAt = new Date(packageData.meta.signed_at);
      if (isNaN(signedAt.getTime())) {
        this.errors.push('Invalid signed_at timestamp');
      }
    }

    // Validate signed_by field
    if (!packageData.meta.signed_by) {
      this.warnings.push('Missing signed_by field');
    }
  }

  /**
   * Validate content integrity
   * @param {Object} packageData - Package data
   */
  _validateContentIntegrity(packageData) {
    // Validate bank hash
    if (packageData.meta.bank_hash_sha256) {
      const computedHash = this._computeBankHash(packageData);
      const declaredHash = packageData.meta.bank_hash_sha256;
      
      if (computedHash !== declaredHash) {
        this.errors.push(`Bank hash mismatch: computed ${computedHash}, declared ${declaredHash}`);
      }
    }

    // Validate question count
    if (packageData.questions) {
      const questionCount = Object.values(packageData.questions)
        .reduce((total, family) => total + family.questions.length, 0);
      
      if (questionCount !== 21) {
        this.errors.push(`Expected 21 questions, found ${questionCount}`);
      }
    }

    // Validate face count
    if (packageData.registries && packageData.registries.faces) {
      const faceCount = packageData.registries.faces.faces.length;
      if (faceCount !== 14) {
        this.errors.push(`Expected 14 faces, found ${faceCount}`);
      }
    }
  }

  /**
   * Validate Batch 3 components
   * @param {Object} packageData - Package data
   */
  _validateBatch3Components(packageData) {
    // Check for tell_groups registry
    if (!packageData.registries.tell_groups) {
      this.warnings.push('Missing tell_groups registry (Batch 3 component)');
    }

    // Check for Batch 3 meta fields
    const batch3Fields = ['tell_taxonomy_version', 'determinism_version', 'signature_algorithm', 'content_hash_sha256'];
    batch3Fields.forEach(field => {
      if (!packageData.meta[field]) {
        this.warnings.push(`Missing Batch 3 meta field: ${field}`);
      }
    });

    // Validate tell taxonomy
    if (packageData.registries.tells) {
      const tells = packageData.registries.tells.tells;
      tells.forEach(tell => {
        if (!tell.contrast) {
          this.warnings.push(`Tell ${tell.id} missing contrast field`);
        }
        if (!tell.explicit) {
          this.warnings.push(`Tell ${tell.id} missing explicit field`);
        }
        if (!tell.priority) {
          this.warnings.push(`Tell ${tell.id} missing priority field`);
        }
      });
    }
  }

  /**
   * Compute bank hash
   * @param {Object} packageData - Package data
   * @returns {string} SHA256 hash
   */
  _computeBankHash(packageData) {
    const content = JSON.stringify(packageData, Object.keys(packageData).sort());
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// CLI usage
if (require.main === module) {
  const packagePath = process.argv[2] || './bank/packaged/bank_package_signed.json';
  
  console.log(`🔍 Validating bank package: ${packagePath}`);
  
  const validator = new BankPackageValidator();
  const result = validator.validate(packagePath);
  
  if (result.valid) {
    console.log('✅ Bank package is valid');
  } else {
    console.log('❌ Bank package validation failed');
  }
  
  if (result.errors.length > 0) {
    console.log('\n❌ Errors:');
    result.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  process.exit(result.valid ? 0 : 1);
}

module.exports = BankPackageValidator;
