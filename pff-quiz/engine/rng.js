/**
 * RNG Requirements (determinism)
 * 
 * Provides seeded PRNG with reproducible output for deterministic behavior.
 * Uses Xoroshiro128+ algorithm for high-quality randomness.
 */

const crypto = require('crypto');

class DeterministicRNG {
  constructor(seed) {
    this.seed = seed;
    this.state = this.initializeState(seed);
    this.counter = 0;
  }

  /**
   * Initialize RNG state from seed
   */
  initializeState(seed) {
    // Convert seed to 128-bit state
    const hash = crypto.createHash('sha256').update(seed).digest();
    
    // Split into two 64-bit parts
    const state0 = this.bytesToUint64(hash.slice(0, 8));
    const state1 = this.bytesToUint64(hash.slice(8, 16));
    
    return [state0, state1];
  }

  /**
   * Convert bytes to 64-bit unsigned integer
   */
  bytesToUint64(bytes) {
    let result = 0;
    for (let i = 0; i < 8; i++) {
      result = (result << 8) | bytes[i];
    }
    return result >>> 0; // Ensure unsigned
  }

  /**
   * Generate next random number (0-1 range)
   */
  next() {
    this.counter++;
    
    // Xoroshiro128+ algorithm
    const s0 = this.state[0];
    let s1 = this.state[1];
    
    const result = (s0 + s1) >>> 0;
    
    s1 ^= s0;
    this.state[0] = this.rotl(s0, 24) ^ s1 ^ (s1 << 16);
    this.state[1] = this.rotl(s1, 37);
    
    this.state[1] = s1;
    
    // Convert to 0-1 range
    return result / 0x100000000;
  }

  /**
   * Rotate left operation
   */
  rotl(x, k) {
    return ((x << k) | (x >>> (64 - k))) >>> 0;
  }

  /**
   * Generate random integer in range [min, max]
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Generate random boolean
   */
  nextBoolean() {
    return this.next() < 0.5;
  }

  /**
   * Shuffle array deterministically
   */
  shuffle(array) {
    const shuffled = [...array];
    
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    return shuffled;
  }

  /**
   * Select random element from array
   */
  choice(array) {
    if (array.length === 0) return null;
    const index = this.nextInt(0, array.length - 1);
    return array[index];
  }

  /**
   * Sample n elements from array without replacement
   */
  sample(array, n) {
    if (n >= array.length) return this.shuffle(array);
    
    const shuffled = this.shuffle(array);
    return shuffled.slice(0, n);
  }

  /**
   * Get current counter value
   */
  getCounter() {
    return this.counter;
  }

  /**
   * Reset counter
   */
  resetCounter() {
    this.counter = 0;
  }

  /**
   * Get current state for debugging
   */
  getState() {
    return {
      seed: this.seed,
      state: [...this.state],
      counter: this.counter
    };
  }
}

class RNGManager {
  constructor() {
    this.rngs = new Map();
    this.globalCounter = 0;
  }

  /**
   * Create RNG for session
   */
  createSessionRNG(sessionId, sessionSeed, bankHash, constantsProfile) {
    // Create deterministic seed
    const seed = this.generateSeed(sessionSeed, bankHash, constantsProfile);
    
    const rng = new DeterministicRNG(seed);
    this.rngs.set(sessionId, rng);
    
    console.log(`Created RNG for session ${sessionId} with seed ${seed.substring(0, 8)}...`);
    return rng;
  }

  /**
   * Get RNG for session
   */
  getSessionRNG(sessionId) {
    return this.rngs.get(sessionId);
  }

  /**
   * Generate deterministic seed
   */
  generateSeed(sessionSeed, bankHash, constantsProfile) {
    const seedString = `${sessionSeed}:${bankHash}:${constantsProfile}`;
    return crypto.createHash('sha256').update(seedString).digest('hex');
  }

  /**
   * Generate family order for session
   */
  generateFamilyOrder(sessionId, families) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      throw new Error(`No RNG found for session ${sessionId}`);
    }

    return rng.shuffle([...families]);
  }

  /**
   * Handle edge case selections
   */
  handleEdgeCaseSelection(sessionId, options, count) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      throw new Error(`No RNG found for session ${sessionId}`);
    }

    return rng.sample(options, count);
  }

  /**
   * Break ties deterministically
   */
  breakTie(sessionId, items, tiebreaker = 'random') {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      throw new Error(`No RNG found for session ${sessionId}`);
    }

    switch (tiebreaker) {
      case 'random':
        return rng.choice(items);
      case 'first':
        return items[0];
      case 'last':
        return items[items.length - 1];
      default:
        return rng.choice(items);
    }
  }

  /**
   * Generate deterministic probe selection for picks=7
   */
  generateExtraProbes(sessionId, availableProbes, count = 4) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      throw new Error(`No RNG found for session ${sessionId}`);
    }

    return rng.sample(availableProbes, count);
  }

  /**
   * Generate deterministic probe dropping for picks=1
   */
  generateDroppedProbes(sessionId, availableProbes, count = 2) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      throw new Error(`No RNG found for session ${sessionId}`);
    }

    const dropped = rng.sample(availableProbes, count);
    return availableProbes.filter(probe => !dropped.includes(probe));
  }

  /**
   * Validate RNG determinism
   */
  validateDeterminism(sessionId, expectedSeed) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      return false;
    }

    return rng.seed === expectedSeed;
  }

  /**
   * Get RNG statistics
   */
  getRNGStats(sessionId) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      return null;
    }

    return {
      session_id: sessionId,
      seed: rng.seed.substring(0, 8) + '...',
      counter: rng.counter,
      state: rng.getState()
    };
  }

  /**
   * Clear RNG for session
   */
  clearSessionRNG(sessionId) {
    this.rngs.delete(sessionId);
  }

  /**
   * Clear all RNGs
   */
  clearAllRNGs() {
    this.rngs.clear();
  }

  /**
   * Get all RNG statistics
   */
  getAllRNGStats() {
    const stats = [];
    for (const [sessionId, rng] of this.rngs.entries()) {
      stats.push(this.getRNGStats(sessionId));
    }
    return stats;
  }

  /**
   * Test RNG determinism
   */
  testDeterminism(seed, iterations = 1000) {
    const rng1 = new DeterministicRNG(seed);
    const rng2 = new DeterministicRNG(seed);
    
    const results1 = [];
    const results2 = [];
    
    for (let i = 0; i < iterations; i++) {
      results1.push(rng1.next());
      results2.push(rng2.next());
    }
    
    const identical = results1.every((val, i) => val === results2[i]);
    
    return {
      identical: identical,
      iterations: iterations,
      first_10: results1.slice(0, 10),
      last_10: results1.slice(-10)
    };
  }

  /**
   * Generate RNG trace for debugging
   */
  generateRNGTrace(sessionId, operations) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      return null;
    }

    const trace = {
      session_id: sessionId,
      seed: rng.seed,
      operations: [],
      final_state: rng.getState()
    };

    // Record operations
    for (const operation of operations) {
      const beforeCounter = rng.getCounter();
      const result = operation(rng);
      const afterCounter = rng.getCounter();
      
      trace.operations.push({
        operation: operation.name || 'unknown',
        before_counter: beforeCounter,
        after_counter: afterCounter,
        result: result
      });
    }

    return trace;
  }

  /**
   * Validate RNG quality
   */
  validateRNGQuality(sessionId, sampleSize = 10000) {
    const rng = this.getSessionRNG(sessionId);
    if (!rng) {
      return null;
    }

    const samples = [];
    for (let i = 0; i < sampleSize; i++) {
      samples.push(rng.next());
    }

    // Basic statistical tests
    const mean = samples.reduce((sum, val) => sum + val, 0) / samples.length;
    const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    // Chi-square test for uniformity
    const buckets = 10;
    const expected = sampleSize / buckets;
    const observed = new Array(buckets).fill(0);
    
    for (const sample of samples) {
      const bucket = Math.floor(sample * buckets);
      observed[bucket]++;
    }
    
    const chiSquare = observed.reduce((sum, obs) => sum + Math.pow(obs - expected, 2) / expected, 0);

    return {
      mean: mean,
      variance: variance,
      std_dev: stdDev,
      chi_square: chiSquare,
      chi_square_critical: 16.92, // 9 degrees of freedom, 0.05 significance
      uniform: chiSquare < 16.92,
      sample_size: sampleSize
    };
  }
}

module.exports = { DeterministicRNG, RNGManager };
