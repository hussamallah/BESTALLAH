/**
 * Static IDs & Canonicalization - Batch 5 Implementation
 * 
 * Features:
 * - ID standards and normalization
 * - Canonicalization rules
 * - ID validation
 * - Consistent ID generation
 */

/**
 * ID patterns and validation rules
 */
const ID_PATTERNS = {
  QID: {
    pattern: /^[A-Z]{3,8}_Q[1-3]$/,
    description: 'Question ID: 3-8 uppercase letters, underscore, Q, 1-3',
    example: 'CTRL_Q1'
  },
  TELL_ID: {
    pattern: /^TELL\/[A-Z][a-z]+\/[A-Z][a-z]+\/[a-z-]+$/,
    description: 'Tell ID: TELL/Family/Face/kebab-case-slug',
    example: 'TELL/Control/Sovereign/sets-call'
  },
  FACE_ID: {
    pattern: /^FACE\/[A-Z][a-z]+\/[A-Z][a-z]+$/,
    description: 'Face ID: FACE/Family/Face',
    example: 'FACE/Control/Sovereign'
  },
  FAMILY_ID: {
    pattern: /^FAM\/[A-Z][a-z]+$/,
    description: 'Family ID: FAM/Family',
    example: 'FAM/Control'
  },
  SESSION_ID: {
    pattern: /^[a-f0-9]{16}$/,
    description: 'Session ID: 16 character hex string',
    example: 'a1b2c3d4e5f6g7h8'
  }
};

/**
 * Canonicalization rules
 */
const CANONICALIZATION_RULES = {
  // Remove whitespace
  removeWhitespace: (str) => str.replace(/\s+/g, ''),
  
  // Normalize case
  normalizeCase: (str) => str.toLowerCase(),
  
  // Normalize separators
  normalizeSeparators: (str) => str.replace(/[-_]+/g, '_'),
  
  // Sort keys in objects
  sortObjectKeys: (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sortObjectKeys);
    
    const sorted = {};
    Object.keys(obj).sort().forEach(key => {
      sorted[key] = sortObjectKeys(obj[key]);
    });
    return sorted;
  },
  
  // Normalize arrays
  normalizeArrays: (obj) => {
    if (Array.isArray(obj)) {
      return obj.map(normalizeArrays).sort();
    }
    if (typeof obj === 'object' && obj !== null) {
      const normalized = {};
      Object.keys(obj).forEach(key => {
        normalized[key] = normalizeArrays(obj[key]);
      });
      return normalized;
    }
    return obj;
  }
};

/**
 * Validate ID against pattern
 */
function validateId(id, type) {
  const pattern = ID_PATTERNS[type];
  if (!pattern) {
    throw new Error(`Unknown ID type: ${type}`);
  }
  
  const isValid = pattern.pattern.test(id);
  
  return {
    valid: isValid,
    id,
    type,
    pattern: pattern.pattern.toString(),
    description: pattern.description,
    example: pattern.example
  };
}

/**
 * Generate canonical ID
 */
function generateCanonicalId(type, components) {
  switch (type) {
    case 'QID':
      return generateQID(components);
    case 'TELL_ID':
      return generateTellID(components);
    case 'FACE_ID':
      return generateFaceID(components);
    case 'FAMILY_ID':
      return generateFamilyID(components);
    case 'SESSION_ID':
      return generateSessionID(components);
    default:
      throw new Error(`Unknown ID type: ${type}`);
  }
}

/**
 * Generate Question ID
 */
function generateQID(components) {
  const { family, questionNumber } = components;
  
  if (!family || !questionNumber) {
    throw new Error('QID requires family and questionNumber');
  }
  
  const familyPrefix = family.substring(0, 4).toUpperCase();
  const qid = `${familyPrefix}_Q${questionNumber}`;
  
  // Validate generated ID
  const validation = validateId(qid, 'QID');
  if (!validation.valid) {
    throw new Error(`Generated invalid QID: ${qid}`);
  }
  
  return qid;
}

/**
 * Generate Tell ID
 */
function generateTellID(components) {
  const { family, face, slug } = components;
  
  if (!family || !face || !slug) {
    throw new Error('Tell ID requires family, face, and slug');
  }
  
  // Normalize slug to kebab-case
  const normalizedSlug = slug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  
  const tellId = `TELL/${family}/${face}/${normalizedSlug}`;
  
  // Validate generated ID
  const validation = validateId(tellId, 'TELL_ID');
  if (!validation.valid) {
    throw new Error(`Generated invalid Tell ID: ${tellId}`);
  }
  
  return tellId;
}

/**
 * Generate Face ID
 */
function generateFaceID(components) {
  const { family, face } = components;
  
  if (!family || !face) {
    throw new Error('Face ID requires family and face');
  }
  
  const faceId = `FACE/${family}/${face}`;
  
  // Validate generated ID
  const validation = validateId(faceId, 'FACE_ID');
  if (!validation.valid) {
    throw new Error(`Generated invalid Face ID: ${faceId}`);
  }
  
  return faceId;
}

/**
 * Generate Family ID
 */
function generateFamilyID(components) {
  const { family } = components;
  
  if (!family) {
    throw new Error('Family ID requires family');
  }
  
  const familyId = `FAM/${family}`;
  
  // Validate generated ID
  const validation = validateId(familyId, 'FAMILY_ID');
  if (!validation.valid) {
    throw new Error(`Generated invalid Family ID: ${familyId}`);
  }
  
  return familyId;
}

/**
 * Generate Session ID
 */
function generateSessionID(components) {
  const { seed } = components;
  
  if (!seed) {
    throw new Error('Session ID requires seed');
  }
  
  const crypto = require('crypto');
  const hash = crypto.createHash('sha256').update(seed).digest('hex');
  const sessionId = hash.substring(0, 16);
  
  // Validate generated ID
  const validation = validateId(sessionId, 'SESSION_ID');
  if (!validation.valid) {
    throw new Error(`Generated invalid Session ID: ${sessionId}`);
  }
  
  return sessionId;
}

/**
 * Canonicalize object for hashing
 */
function canonicalizeForHashing(obj) {
  // Apply canonicalization rules
  let canonical = obj;
  
  // Remove whitespace from strings
  canonical = removeWhitespaceFromStrings(canonical);
  
  // Sort object keys
  canonical = CANONICALIZATION_RULES.sortObjectKeys(canonical);
  
  // Normalize arrays
  canonical = CANONICALIZATION_RULES.normalizeArrays(canonical);
  
  return canonical;
}

/**
 * Remove whitespace from strings recursively
 */
function removeWhitespaceFromStrings(obj) {
  if (typeof obj === 'string') {
    return obj.replace(/\s+/g, '');
  }
  
  if (Array.isArray(obj)) {
    return obj.map(removeWhitespaceFromStrings);
  }
  
  if (typeof obj === 'object' && obj !== null) {
    const result = {};
    Object.keys(obj).forEach(key => {
      result[key] = removeWhitespaceFromStrings(obj[key]);
    });
    return result;
  }
  
  return obj;
}

/**
 * Generate hash from canonical object
 */
function generateHash(obj, algorithm = 'sha256') {
  const crypto = require('crypto');
  const canonical = canonicalizeForHashing(obj);
  const jsonString = JSON.stringify(canonical, null, 0);
  return crypto.createHash(algorithm).update(jsonString).digest('hex');
}

/**
 * Validate all IDs in object
 */
function validateAllIds(obj, context = '') {
  const errors = [];
  
  function validateRecursive(obj, path = '') {
    if (typeof obj === 'string') {
      // Check if string looks like an ID
      for (const [type, pattern] of Object.entries(ID_PATTERNS)) {
        if (pattern.pattern.test(obj)) {
          const validation = validateId(obj, type);
          if (!validation.valid) {
            errors.push({
              path: path || 'root',
              id: obj,
              type,
              error: 'Invalid ID format'
            });
          }
        }
      }
    } else if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        validateRecursive(item, `${path}[${index}]`);
      });
    } else if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => {
        validateRecursive(obj[key], path ? `${path}.${key}` : key);
      });
    }
  }
  
  validateRecursive(obj);
  
  return {
    valid: errors.length === 0,
    errors,
    context
  };
}

/**
 * Normalize ID to standard format
 */
function normalizeId(id, type) {
  if (!id || typeof id !== 'string') {
    throw new Error('ID must be a non-empty string');
  }
  
  const pattern = ID_PATTERNS[type];
  if (!pattern) {
    throw new Error(`Unknown ID type: ${type}`);
  }
  
  // Apply canonicalization rules
  let normalized = id;
  
  // Remove whitespace
  normalized = CANONICALIZATION_RULES.removeWhitespace(normalized);
  
  // Normalize separators for certain types
  if (type === 'TELL_ID') {
    normalized = normalized.replace(/[-_]+/g, '-');
  }
  
  // Validate normalized ID
  const validation = validateId(normalized, type);
  if (!validation.valid) {
    throw new Error(`Cannot normalize ID ${id} to type ${type}`);
  }
  
  return normalized;
}

/**
 * Extract components from ID
 */
function extractIdComponents(id, type) {
  const pattern = ID_PATTERNS[type];
  if (!pattern) {
    throw new Error(`Unknown ID type: ${type}`);
  }
  
  const match = id.match(pattern.pattern);
  if (!match) {
    throw new Error(`ID ${id} does not match pattern for type ${type}`);
  }
  
  switch (type) {
    case 'QID':
      const [, family, questionNumber] = id.match(/^([A-Z]{3,8})_Q([1-3])$/);
      return { family, questionNumber: parseInt(questionNumber) };
      
    case 'TELL_ID':
      const [, tellFamily, tellFace, slug] = id.match(/^TELL\/([A-Z][a-z]+)\/([A-Z][a-z]+)\/([a-z-]+)$/);
      return { family: tellFamily, face: tellFace, slug };
      
    case 'FACE_ID':
      const [, faceFamily, faceName] = id.match(/^FACE\/([A-Z][a-z]+)\/([A-Z][a-z]+)$/);
      return { family: faceFamily, face: faceName };
      
    case 'FAMILY_ID':
      const [, familyName] = id.match(/^FAM\/([A-Z][a-z]+)$/);
      return { family: familyName };
      
    case 'SESSION_ID':
      return { sessionId: id };
      
    default:
      throw new Error(`Cannot extract components for type ${type}`);
  }
}

/**
 * Export ID utilities
 */
function exportIdUtilities() {
  return {
    ID_PATTERNS,
    CANONICALIZATION_RULES,
    validateId,
    generateCanonicalId,
    canonicalizeForHashing,
    generateHash,
    validateAllIds,
    normalizeId,
    extractIdComponents
  };
}

module.exports = {
  ID_PATTERNS,
  CANONICALIZATION_RULES,
  validateId,
  generateCanonicalId,
  generateQID,
  generateTellID,
  generateFaceID,
  generateFamilyID,
  generateSessionID,
  canonicalizeForHashing,
  generateHash,
  validateAllIds,
  normalizeId,
  extractIdComponents,
  exportIdUtilities
};
