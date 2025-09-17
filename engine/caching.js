/**
 * Caching & Memoization
 * 
 * Provides caching for bank packages, schedules, and face lookup maps.
 * All caches are in-memory and read-only after load.
 */

class CacheManager {
  constructor() {
    this.bankPackageCache = new Map();
    this.scheduleCache = new Map();
    this.faceLookupCache = new Map();
    this.questionCache = new Map();
    this.tellCache = new Map();
    this.contrastCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      total_requests: 0
    };
  }

  /**
   * Cache bank package by hash
   */
  cacheBankPackage(bankHash, bankPackage) {
    this.bankPackageCache.set(bankHash, {
      package: bankPackage,
      cached_at: new Date().toISOString(),
      access_count: 0
    });
    
    console.log(`Cached bank package: ${bankHash.substring(0, 8)}...`);
  }

  /**
   * Get bank package from cache
   */
  getBankPackage(bankHash) {
    this.cacheStats.total_requests++;
    
    const cached = this.bankPackageCache.get(bankHash);
    if (cached) {
      cached.access_count++;
      this.cacheStats.hits++;
      return cached.package;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Cache schedule for session
   */
  cacheSchedule(sessionId, schedule) {
    this.scheduleCache.set(sessionId, {
      schedule: schedule,
      cached_at: new Date().toISOString(),
      access_count: 0
    });
    
    console.log(`Cached schedule for session: ${sessionId}`);
  }

  /**
   * Get schedule from cache
   */
  getSchedule(sessionId) {
    this.cacheStats.total_requests++;
    
    const cached = this.scheduleCache.get(sessionId);
    if (cached) {
      cached.access_count++;
      this.cacheStats.hits++;
      return cached.schedule;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Build and cache face lookup maps
   */
  buildFaceLookupMaps(bankPackage) {
    const tellToFace = new Map();
    const faceToHomeFamily = new Map();
    const faceToContrastTells = new Map();
    
    // Build tell_id → face_id map
    for (const tell of bankPackage.registries.tells) {
      tellToFace.set(tell.tell_id, tell.face_id);
    }
    
    // Build face_id → home_family map
    for (const face of bankPackage.registries.faces) {
      faceToHomeFamily.set(face.id, face.family);
    }
    
    // Build face_id → contrast_tell_set map
    for (const pair of bankPackage.registries.contrast_matrix.pairs) {
      const aTells = new Set(pair.a_contrast_tells);
      const bTells = new Set(pair.b_contrast_tells);
      
      faceToContrastTells.set(pair.a, aTells);
      faceToContrastTells.set(pair.b, bTells);
    }
    
    this.faceLookupCache.set('tell_to_face', tellToFace);
    this.faceLookupCache.set('face_to_home_family', faceToHomeFamily);
    this.faceLookupCache.set('face_to_contrast_tells', faceToContrastTells);
    
    console.log(`Built face lookup maps: ${tellToFace.size} tells, ${faceToHomeFamily.size} faces`);
  }

  /**
   * Get face from tell ID
   */
  getFaceFromTell(tellId) {
    this.cacheStats.total_requests++;
    
    const tellToFace = this.faceLookupCache.get('tell_to_face');
    if (tellToFace) {
      this.cacheStats.hits++;
      return tellToFace.get(tellId);
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Get home family for face ID
   */
  getHomeFamilyForFace(faceId) {
    this.cacheStats.total_requests++;
    
    const faceToHomeFamily = this.faceLookupCache.get('face_to_home_family');
    if (faceToHomeFamily) {
      this.cacheStats.hits++;
      return faceToHomeFamily.get(faceId);
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Get contrast tells for face ID
   */
  getContrastTellsForFace(faceId) {
    this.cacheStats.total_requests++;
    
    const faceToContrastTells = this.faceLookupCache.get('face_to_contrast_tells');
    if (faceToContrastTells) {
      this.cacheStats.hits++;
      return faceToContrastTells.get(faceId);
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Cache question by QID
   */
  cacheQuestion(qid, question) {
    this.questionCache.set(qid, {
      question: question,
      cached_at: new Date().toISOString(),
      access_count: 0
    });
  }

  /**
   * Get question from cache
   */
  getQuestion(qid) {
    this.cacheStats.total_requests++;
    
    const cached = this.questionCache.get(qid);
    if (cached) {
      cached.access_count++;
      this.cacheStats.hits++;
      return cached.question;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Cache tells for option
   */
  cacheTellsForOption(qid, optionKey, tells) {
    const key = `${qid}:${optionKey}`;
    this.tellCache.set(key, {
      tells: tells,
      cached_at: new Date().toISOString(),
      access_count: 0
    });
  }

  /**
   * Get tells for option from cache
   */
  getTellsForOption(qid, optionKey) {
    this.cacheStats.total_requests++;
    
    const key = `${qid}:${optionKey}`;
    const cached = this.tellCache.get(key);
    if (cached) {
      cached.access_count++;
      this.cacheStats.hits++;
      return cached.tells;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Cache contrast matrix
   */
  cacheContrastMatrix(contrastMatrix) {
    this.contrastCache.set('matrix', {
      matrix: contrastMatrix,
      cached_at: new Date().toISOString(),
      access_count: 0
    });
  }

  /**
   * Get contrast matrix from cache
   */
  getContrastMatrix() {
    this.cacheStats.total_requests++;
    
    const cached = this.contrastCache.get('matrix');
    if (cached) {
      cached.access_count++;
      this.cacheStats.hits++;
      return cached.matrix;
    }
    
    this.cacheStats.misses++;
    return null;
  }

  /**
   * Preload all caches for a bank package
   */
  preloadCaches(bankPackage) {
    console.log('Preloading caches...');
    
    // Cache bank package
    this.cacheBankPackage(bankPackage.meta.bank_hash_sha256, bankPackage);
    
    // Build face lookup maps
    this.buildFaceLookupMaps(bankPackage);
    
    // Cache all questions
    for (const [family, questions] of Object.entries(bankPackage.questions)) {
      for (const question of questions) {
        this.cacheQuestion(question.qid, question);
        
        // Cache tells for each option
        for (const option of question.options) {
          if (option.tells) {
            this.cacheTellsForOption(question.qid, option.key, option.tells);
          }
        }
      }
    }
    
    // Cache contrast matrix
    this.cacheContrastMatrix(bankPackage.registries.contrast_matrix);
    
    console.log('Cache preloading complete');
  }

  /**
   * Clear specific cache
   */
  clearCache(cacheName) {
    switch (cacheName) {
      case 'bank_package':
        this.bankPackageCache.clear();
        break;
      case 'schedule':
        this.scheduleCache.clear();
        break;
      case 'face_lookup':
        this.faceLookupCache.clear();
        break;
      case 'question':
        this.questionCache.clear();
        break;
      case 'tell':
        this.tellCache.clear();
        break;
      case 'contrast':
        this.contrastCache.clear();
        break;
      default:
        console.warn(`Unknown cache: ${cacheName}`);
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches() {
    this.bankPackageCache.clear();
    this.scheduleCache.clear();
    this.faceLookupCache.clear();
    this.questionCache.clear();
    this.tellCache.clear();
    this.contrastCache.clear();
    
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      total_requests: 0
    };
    
    console.log('All caches cleared');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const hitRate = this.cacheStats.total_requests > 0 
      ? (this.cacheStats.hits / this.cacheStats.total_requests * 100).toFixed(2)
      : 0;
    
    return {
      ...this.cacheStats,
      hit_rate_percent: hitRate,
      cache_sizes: {
        bank_package: this.bankPackageCache.size,
        schedule: this.scheduleCache.size,
        face_lookup: this.faceLookupCache.size,
        question: this.questionCache.size,
        tell: this.tellCache.size,
        contrast: this.contrastCache.size
      }
    };
  }

  /**
   * Get cache memory usage estimate
   */
  getCacheMemoryUsage() {
    let totalSize = 0;
    
    // Estimate memory usage for each cache
    for (const [key, value] of this.bankPackageCache.entries()) {
      totalSize += key.length * 2; // String length * 2 bytes
      totalSize += JSON.stringify(value).length * 2; // Rough estimate
    }
    
    for (const [key, value] of this.scheduleCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value).length * 2;
    }
    
    for (const [key, value] of this.faceLookupCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value).length * 2;
    }
    
    for (const [key, value] of this.questionCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value).length * 2;
    }
    
    for (const [key, value] of this.tellCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value).length * 2;
    }
    
    for (const [key, value] of this.contrastCache.entries()) {
      totalSize += key.length * 2;
      totalSize += JSON.stringify(value).length * 2;
    }
    
    return {
      total_bytes: totalSize,
      total_kb: (totalSize / 1024).toFixed(2),
      total_mb: (totalSize / (1024 * 1024)).toFixed(2)
    };
  }

  /**
   * Evict least recently used items
   */
  evictLRU(cacheName, maxSize) {
    let cache;
    switch (cacheName) {
      case 'bank_package':
        cache = this.bankPackageCache;
        break;
      case 'schedule':
        cache = this.scheduleCache;
        break;
      case 'question':
        cache = this.questionCache;
        break;
      case 'tell':
        cache = this.tellCache;
        break;
      default:
        return 0;
    }
    
    if (cache.size <= maxSize) {
      return 0;
    }
    
    // Sort by access count and remove least accessed
    const entries = Array.from(cache.entries());
    entries.sort((a, b) => a[1].access_count - b[1].access_count);
    
    const toRemove = entries.slice(0, entries.length - maxSize);
    for (const [key] of toRemove) {
      cache.delete(key);
      this.cacheStats.evictions++;
    }
    
    return toRemove.length;
  }

  /**
   * Warm up cache for session
   */
  warmUpCacheForSession(sessionId, bankPackage) {
    console.log(`Warming up cache for session: ${sessionId}`);
    
    // Preload all caches
    this.preloadCaches(bankPackage);
    
    // Preload session-specific data
    const schedule = this.getSchedule(sessionId);
    if (schedule) {
      // Schedule is already cached
      return;
    }
    
    // Generate and cache schedule
    // This would be done by the scheduling logic
    console.log(`Cache warmed up for session: ${sessionId}`);
  }

  /**
   * Validate cache integrity
   */
  validateCacheIntegrity() {
    const issues = [];
    
    // Check for null/undefined values
    for (const [key, value] of this.bankPackageCache.entries()) {
      if (!value || !value.package) {
        issues.push(`Bank package cache corrupted: ${key}`);
      }
    }
    
    for (const [key, value] of this.scheduleCache.entries()) {
      if (!value || !value.schedule) {
        issues.push(`Schedule cache corrupted: ${key}`);
      }
    }
    
    // Check face lookup maps
    const tellToFace = this.faceLookupCache.get('tell_to_face');
    if (tellToFace && tellToFace.size === 0) {
      issues.push('Face lookup cache empty');
    }
    
    return {
      valid: issues.length === 0,
      issues: issues
    };
  }

  /**
   * Export cache state for debugging
   */
  exportCacheState() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getCacheStats(),
      memory_usage: this.getCacheMemoryUsage(),
      cache_contents: {
        bank_package_keys: Array.from(this.bankPackageCache.keys()),
        schedule_keys: Array.from(this.scheduleCache.keys()),
        face_lookup_keys: Array.from(this.faceLookupCache.keys()),
        question_keys: Array.from(this.questionCache.keys()),
        tell_keys: Array.from(this.tellCache.keys()),
        contrast_keys: Array.from(this.contrastCache.keys())
      }
    };
  }
}

module.exports = CacheManager;
