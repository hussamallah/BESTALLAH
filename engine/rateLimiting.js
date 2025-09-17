/**
 * Rate Limiting & Quotas
 * 
 * Implements leaky-bucket rate limiting per session and per IP/token.
 * Returns HTTP 429 + retry-after on violation.
 */

class RateLimiter {
  constructor(windowMs, maxCalls) {
    this.windowMs = windowMs;
    this.maxCalls = maxCalls;
    this.calls = [];
    this.lastReset = Date.now();
  }

  /**
   * Check if call is allowed
   */
  isAllowed() {
    const now = Date.now();
    
    // Reset if window has passed
    if (now - this.lastReset >= this.windowMs) {
      this.calls = [];
      this.lastReset = now;
    }

    // Check if limit exceeded
    if (this.calls.length >= this.maxCalls) {
      return {
        allowed: false,
        resetTime: this.lastReset + this.windowMs,
        remaining: 0,
        retryAfter: Math.ceil((this.lastReset + this.windowMs - now) / 1000)
      };
    }

    // Add current call
    this.calls.push(now);

    return {
      allowed: true,
      resetTime: this.lastReset + this.windowMs,
      remaining: this.maxCalls - this.calls.length,
      retryAfter: 0
    };
  }

  /**
   * Get current status
   */
  getStatus() {
    const now = Date.now();
    const timeUntilReset = Math.max(0, this.lastReset + this.windowMs - now);
    
    return {
      calls: this.calls.length,
      maxCalls: this.maxCalls,
      remaining: Math.max(0, this.maxCalls - this.calls.length),
      resetIn: timeUntilReset,
      windowMs: this.windowMs
    };
  }

  /**
   * Reset limiter
   */
  reset() {
    this.calls = [];
    this.lastReset = Date.now();
  }
}

class RateLimitManager {
  constructor() {
    this.sessionLimiters = new Map();
    this.tokenLimiters = new Map();
    this.ipLimiters = new Map();
    this.globalLimiter = new RateLimiter(60000, 10000); // 10k calls per minute globally
    
    // Default limits
    this.defaultLimits = {
      per_session: { windowMs: 60000, maxCalls: 120 }, // 2 rps average
      per_token: { windowMs: 60000, maxCalls: 600 },   // 10 rps average
      per_ip: { windowMs: 60000, maxCalls: 1000 }      // 16.7 rps average
    };
  }

  /**
   * Check rate limit for session
   */
  checkSessionLimit(sessionId) {
    if (!this.sessionLimiters.has(sessionId)) {
      const limits = this.defaultLimits.per_session;
      this.sessionLimiters.set(sessionId, new RateLimiter(limits.windowMs, limits.maxCalls));
    }

    const limiter = this.sessionLimiters.get(sessionId);
    return limiter.isAllowed();
  }

  /**
   * Check rate limit for token
   */
  checkTokenLimit(token) {
    if (!this.tokenLimiters.has(token)) {
      const limits = this.defaultLimits.per_token;
      this.tokenLimiters.set(token, new RateLimiter(limits.windowMs, limits.maxCalls));
    }

    const limiter = this.tokenLimiters.get(token);
    return limiter.isAllowed();
  }

  /**
   * Check rate limit for IP
   */
  checkIPLimit(ip) {
    if (!this.ipLimiters.has(ip)) {
      const limits = this.defaultLimits.per_ip;
      this.ipLimiters.set(ip, new RateLimiter(limits.windowMs, limits.maxCalls));
    }

    const limiter = this.ipLimiters.get(ip);
    return limiter.isAllowed();
  }

  /**
   * Check global rate limit
   */
  checkGlobalLimit() {
    return this.globalLimiter.isAllowed();
  }

  /**
   * Check all applicable rate limits
   */
  checkAllLimits(sessionId, token, ip) {
    const results = {
      session: null,
      token: null,
      ip: null,
      global: null,
      allowed: true,
      retryAfter: 0
    };

    // Check session limit
    if (sessionId) {
      results.session = this.checkSessionLimit(sessionId);
      if (!results.session.allowed) {
        results.allowed = false;
        results.retryAfter = Math.max(results.retryAfter, results.session.retryAfter);
      }
    }

    // Check token limit
    if (token) {
      results.token = this.checkTokenLimit(token);
      if (!results.token.allowed) {
        results.allowed = false;
        results.retryAfter = Math.max(results.retryAfter, results.token.retryAfter);
      }
    }

    // Check IP limit
    if (ip) {
      results.ip = this.checkIPLimit(ip);
      if (!results.ip.allowed) {
        results.allowed = false;
        results.retryAfter = Math.max(results.retryAfter, results.ip.retryAfter);
      }
    }

    // Check global limit
    results.global = this.checkGlobalLimit();
    if (!results.global.allowed) {
      results.allowed = false;
      results.retryAfter = Math.max(results.retryAfter, results.global.retryAfter);
    }

    return results;
  }

  /**
   * Get rate limit status for session
   */
  getSessionStatus(sessionId) {
    if (!this.sessionLimiters.has(sessionId)) {
      return null;
    }
    return this.sessionLimiters.get(sessionId).getStatus();
  }

  /**
   * Get rate limit status for token
   */
  getTokenStatus(token) {
    if (!this.tokenLimiters.has(token)) {
      return null;
    }
    return this.tokenLimiters.get(token).getStatus();
  }

  /**
   * Get rate limit status for IP
   */
  getIPStatus(ip) {
    if (!this.ipLimiters.has(ip)) {
      return null;
    }
    return this.ipLimiters.get(ip).getStatus();
  }

  /**
   * Get global rate limit status
   */
  getGlobalStatus() {
    return this.globalLimiter.getStatus();
  }

  /**
   * Reset rate limit for session
   */
  resetSessionLimit(sessionId) {
    if (this.sessionLimiters.has(sessionId)) {
      this.sessionLimiters.get(sessionId).reset();
    }
  }

  /**
   * Reset rate limit for token
   */
  resetTokenLimit(token) {
    if (this.tokenLimiters.has(token)) {
      this.tokenLimiters.get(token).reset();
    }
  }

  /**
   * Reset rate limit for IP
   */
  resetIPLimit(ip) {
    if (this.ipLimiters.has(ip)) {
      this.ipLimiters.get(ip).reset();
    }
  }

  /**
   * Reset all rate limits
   */
  resetAllLimits() {
    for (const limiter of this.sessionLimiters.values()) {
      limiter.reset();
    }
    for (const limiter of this.tokenLimiters.values()) {
      limiter.reset();
    }
    for (const limiter of this.ipLimiters.values()) {
      limiter.reset();
    }
    this.globalLimiter.reset();
  }

  /**
   * Update rate limit configuration
   */
  updateLimits(limitType, windowMs, maxCalls) {
    this.defaultLimits[limitType] = { windowMs, maxCalls };
    
    // Update existing limiters
    switch (limitType) {
      case 'per_session':
        for (const limiter of this.sessionLimiters.values()) {
          limiter.windowMs = windowMs;
          limiter.maxCalls = maxCalls;
        }
        break;
      case 'per_token':
        for (const limiter of this.tokenLimiters.values()) {
          limiter.windowMs = windowMs;
          limiter.maxCalls = maxCalls;
        }
        break;
      case 'per_ip':
        for (const limiter of this.ipLimiters.values()) {
          limiter.windowMs = windowMs;
          limiter.maxCalls = maxCalls;
        }
        break;
    }
  }

  /**
   * Clean up old limiters
   */
  cleanupOldLimiters(maxAge = 3600000) { // 1 hour
    const now = Date.now();
    
    // Clean up session limiters
    for (const [sessionId, limiter] of this.sessionLimiters.entries()) {
      if (now - limiter.lastReset > maxAge) {
        this.sessionLimiters.delete(sessionId);
      }
    }
    
    // Clean up token limiters
    for (const [token, limiter] of this.tokenLimiters.entries()) {
      if (now - limiter.lastReset > maxAge) {
        this.tokenLimiters.delete(token);
      }
    }
    
    // Clean up IP limiters
    for (const [ip, limiter] of this.ipLimiters.entries()) {
      if (now - limiter.lastReset > maxAge) {
        this.ipLimiters.delete(ip);
      }
    }
  }

  /**
   * Get rate limit statistics
   */
  getStatistics() {
    const now = Date.now();
    let activeSessions = 0;
    let activeTokens = 0;
    let activeIPs = 0;
    
    // Count active limiters
    for (const limiter of this.sessionLimiters.values()) {
      if (now - limiter.lastReset < limiter.windowMs) {
        activeSessions++;
      }
    }
    
    for (const limiter of this.tokenLimiters.values()) {
      if (now - limiter.lastReset < limiter.windowMs) {
        activeTokens++;
      }
    }
    
    for (const limiter of this.ipLimiters.values()) {
      if (now - limiter.lastReset < limiter.windowMs) {
        activeIPs++;
      }
    }
    
    return {
      active_sessions: activeSessions,
      active_tokens: activeTokens,
      active_ips: activeIPs,
      total_sessions: this.sessionLimiters.size,
      total_tokens: this.tokenLimiters.size,
      total_ips: this.ipLimiters.size,
      global_status: this.getGlobalStatus(),
      default_limits: this.defaultLimits
    };
  }

  /**
   * Generate rate limit response
   */
  generateRateLimitResponse(retryAfter) {
    return {
      status: 429,
      error: 'E_RATE_LIMIT',
      message: 'Rate limit exceeded',
      retry_after: retryAfter,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': '120',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': new Date(Date.now() + retryAfter * 1000).toISOString()
      }
    };
  }

  /**
   * Generate rate limit headers
   */
  generateRateLimitHeaders(sessionId, token, ip) {
    const headers = {};
    
    if (sessionId) {
      const sessionStatus = this.getSessionStatus(sessionId);
      if (sessionStatus) {
        headers['X-RateLimit-Session-Limit'] = sessionStatus.maxCalls.toString();
        headers['X-RateLimit-Session-Remaining'] = sessionStatus.remaining.toString();
        headers['X-RateLimit-Session-Reset'] = new Date(sessionStatus.resetIn).toISOString();
      }
    }
    
    if (token) {
      const tokenStatus = this.getTokenStatus(token);
      if (tokenStatus) {
        headers['X-RateLimit-Token-Limit'] = tokenStatus.maxCalls.toString();
        headers['X-RateLimit-Token-Remaining'] = tokenStatus.remaining.toString();
        headers['X-RateLimit-Token-Reset'] = new Date(tokenStatus.resetIn).toISOString();
      }
    }
    
    if (ip) {
      const ipStatus = this.getIPStatus(ip);
      if (ipStatus) {
        headers['X-RateLimit-IP-Limit'] = ipStatus.maxCalls.toString();
        headers['X-RateLimit-IP-Remaining'] = ipStatus.remaining.toString();
        headers['X-RateLimit-IP-Reset'] = new Date(ipStatus.resetIn).toISOString();
      }
    }
    
    const globalStatus = this.getGlobalStatus();
    headers['X-RateLimit-Global-Limit'] = globalStatus.maxCalls.toString();
    headers['X-RateLimit-Global-Remaining'] = globalStatus.remaining.toString();
    headers['X-RateLimit-Global-Reset'] = new Date(globalStatus.resetIn).toISOString();
    
    return headers;
  }

  /**
   * Test rate limiting
   */
  testRateLimiting(identifier, limitType = 'per_session', calls = 10) {
    const results = [];
    
    for (let i = 0; i < calls; i++) {
      let result;
      switch (limitType) {
        case 'per_session':
          result = this.checkSessionLimit(identifier);
          break;
        case 'per_token':
          result = this.checkTokenLimit(identifier);
          break;
        case 'per_ip':
          result = this.checkIPLimit(identifier);
          break;
        default:
          result = this.checkGlobalLimit();
      }
      
      results.push({
        call: i + 1,
        allowed: result.allowed,
        remaining: result.remaining,
        retryAfter: result.retryAfter
      });
    }
    
    return results;
  }

  /**
   * Export rate limit configuration
   */
  exportConfiguration() {
    return {
      schema: 'rate_limits.v1',
      default_limits: this.defaultLimits,
      active_limiters: {
        sessions: this.sessionLimiters.size,
        tokens: this.tokenLimiters.size,
        ips: this.ipLimiters.size
      },
      statistics: this.getStatistics()
    };
  }
}

module.exports = { RateLimiter, RateLimitManager };
