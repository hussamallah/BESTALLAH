/**
 * Concurrency & Idempotency
 * 
 * Handles concurrent operations and ensures idempotency.
 * submit_answer is idempotent per (session_id, qid); last write wins.
 */

class ConcurrencyManager {
  constructor() {
    this.locks = new Map();
    this.operations = new Map();
    this.idempotencyKeys = new Map();
    this.pendingOperations = new Map();
  }

  /**
   * Acquire lock for session
   */
  async acquireLock(sessionId, operation = 'general', timeout = 5000) {
    const lockKey = `${sessionId}:${operation}`;
    
    // Check if lock already exists
    if (this.locks.has(lockKey)) {
      const lock = this.locks.get(lockKey);
      if (Date.now() - lock.acquiredAt < timeout) {
        throw new Error(`Lock already held for ${lockKey}`);
      } else {
        // Lock expired, remove it
        this.locks.delete(lockKey);
      }
    }

    // Acquire new lock
    const lock = {
      sessionId,
      operation,
      acquiredAt: Date.now(),
      timeout
    };

    this.locks.set(lockKey, lock);
    console.log(`Acquired lock for ${lockKey}`);
    
    return lockKey;
  }

  /**
   * Release lock
   */
  releaseLock(lockKey) {
    if (this.locks.has(lockKey)) {
      this.locks.delete(lockKey);
      console.log(`Released lock for ${lockKey}`);
    }
  }

  /**
   * Execute operation with lock
   */
  async executeWithLock(sessionId, operation, fn, timeout = 5000) {
    const lockKey = await this.acquireLock(sessionId, operation, timeout);
    
    try {
      const result = await fn();
      return result;
    } finally {
      this.releaseLock(lockKey);
    }
  }

  /**
   * Check if operation is idempotent
   */
  isIdempotent(sessionId, qid, operationType) {
    const idempotencyKey = `${sessionId}:${qid}:${operationType}`;
    return this.idempotencyKeys.has(idempotencyKey);
  }

  /**
   * Mark operation as idempotent
   */
  markIdempotent(sessionId, qid, operationType, result) {
    const idempotencyKey = `${sessionId}:${qid}:${operationType}`;
    this.idempotencyKeys.set(idempotencyKey, {
      result,
      timestamp: Date.now()
    });
  }

  /**
   * Get idempotent result
   */
  getIdempotentResult(sessionId, qid, operationType) {
    const idempotencyKey = `${sessionId}:${qid}:${operationType}`;
    return this.idempotencyKeys.get(idempotencyKey);
  }

  /**
   * Handle submit_answer idempotency
   */
  async handleSubmitAnswerIdempotency(sessionId, qid, optionKey, operationFn) {
    const idempotencyKey = `${sessionId}:${qid}:submit_answer`;
    
    // Check if we already have a result for this exact operation
    if (this.idempotencyKeys.has(idempotencyKey)) {
      const existing = this.idempotencyKeys.get(idempotencyKey);
      
      // Check if it's the same option key
      if (existing.optionKey === optionKey) {
        console.log(`Idempotent operation detected for ${sessionId}:${qid}`);
        return existing.result;
      } else {
        // Different option key, this is a replacement
        console.log(`Answer replacement detected for ${sessionId}:${qid}`);
      }
    }

    // Execute the operation
    const result = await operationFn();
    
    // Store the result for idempotency
    this.markIdempotent(sessionId, qid, 'submit_answer', {
      optionKey,
      result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Handle finalize_session concurrency
   */
  async handleFinalizeSessionConcurrency(sessionId, finalizeFn) {
    const lockKey = `${sessionId}:finalize`;
    
    // Check if finalization is already in progress
    if (this.pendingOperations.has(lockKey)) {
      const pending = this.pendingOperations.get(lockKey);
      
      if (pending.status === 'in_progress') {
        // Wait for the existing operation to complete
        return await this.waitForOperation(lockKey);
      } else if (pending.status === 'completed') {
        // Return the existing result
        return pending.result;
      }
    }

    // Start finalization
    const operation = {
      status: 'in_progress',
      startedAt: Date.now(),
      result: null
    };

    this.pendingOperations.set(lockKey, operation);

    try {
      const result = await finalizeFn();
      
      // Mark as completed
      operation.status = 'completed';
      operation.result = result;
      operation.completedAt = Date.now();
      
      return result;
    } catch (error) {
      // Mark as failed
      operation.status = 'failed';
      operation.error = error.message;
      operation.failedAt = Date.now();
      
      throw error;
    } finally {
      // Clean up after a delay
      setTimeout(() => {
        this.pendingOperations.delete(lockKey);
      }, 30000); // 30 seconds
    }
  }

  /**
   * Wait for operation to complete
   */
  async waitForOperation(lockKey, maxWait = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      const operation = this.pendingOperations.get(lockKey);
      
      if (!operation) {
        throw new Error('Operation not found');
      }
      
      if (operation.status === 'completed') {
        return operation.result;
      }
      
      if (operation.status === 'failed') {
        throw new Error(operation.error);
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Operation timeout');
  }

  /**
   * Handle row-level locking for answers
   */
  async handleAnswerLocking(sessionId, qid, operationFn) {
    const lockKey = `${sessionId}:${qid}:answer`;
    
    return await this.executeWithLock(sessionId, `answer:${qid}`, async () => {
      // Check for existing answer
      const existingAnswer = this.getIdempotentResult(sessionId, qid, 'submit_answer');
      
      if (existingAnswer) {
        console.log(`Answer already exists for ${sessionId}:${qid}, replacing`);
      }
      
      // Execute the operation
      const result = await operationFn();
      
      return result;
    });
  }

  /**
   * Handle atomic upserts
   */
  async handleAtomicUpsert(sessionId, qid, answerData, upsertFn) {
    const lockKey = `${sessionId}:${qid}`;
    
    return await this.executeWithLock(sessionId, `upsert:${qid}`, async () => {
      // Check if answer already exists
      const existing = this.getIdempotentResult(sessionId, qid, 'submit_answer');
      
      if (existing) {
        // Update existing answer
        console.log(`Updating existing answer for ${sessionId}:${qid}`);
        return await upsertFn(answerData, true);
      } else {
        // Insert new answer
        console.log(`Inserting new answer for ${sessionId}:${qid}`);
        return await upsertFn(answerData, false);
      }
    });
  }

  /**
   * Handle concurrent session access
   */
  async handleConcurrentSessionAccess(sessionId, operation, operationFn) {
    const lockKey = `${sessionId}:session`;
    
    return await this.executeWithLock(sessionId, `session:${operation}`, async () => {
      // Check session state
      const session = this.getSession(sessionId);
      if (!session) {
        throw new Error(`Session not found: ${sessionId}`);
      }
      
      // Execute the operation
      return await operationFn(session);
    });
  }

  /**
   * Handle race conditions in finalization
   */
  async handleFinalizationRace(sessionId, finalizeFn) {
    const lockKey = `${sessionId}:finalize_race`;
    
    return await this.executeWithLock(sessionId, 'finalize_race', async () => {
      // Check if already finalized
      const session = this.getSession(sessionId);
      if (session && session.status === 'FINALIZED') {
        console.log(`Session ${sessionId} already finalized`);
        return session.finalResult;
      }
      
      // Check if finalization is in progress
      if (this.pendingOperations.has(`${sessionId}:finalize`)) {
        const pending = this.pendingOperations.get(`${sessionId}:finalize`);
        if (pending.status === 'in_progress') {
          throw new Error('Finalization already in progress');
        }
      }
      
      // Proceed with finalization
      return await finalizeFn();
    });
  }

  /**
   * Clean up expired locks
   */
  cleanupExpiredLocks() {
    const now = Date.now();
    const expiredLocks = [];
    
    for (const [lockKey, lock] of this.locks.entries()) {
      if (now - lock.acquiredAt > lock.timeout) {
        expiredLocks.push(lockKey);
      }
    }
    
    for (const lockKey of expiredLocks) {
      this.locks.delete(lockKey);
      console.log(`Cleaned up expired lock: ${lockKey}`);
    }
    
    return expiredLocks.length;
  }

  /**
   * Clean up old idempotency keys
   */
  cleanupOldIdempotencyKeys(maxAge = 3600000) { // 1 hour
    const now = Date.now();
    const oldKeys = [];
    
    for (const [key, data] of this.idempotencyKeys.entries()) {
      if (now - data.timestamp > maxAge) {
        oldKeys.push(key);
      }
    }
    
    for (const key of oldKeys) {
      this.idempotencyKeys.delete(key);
    }
    
    return oldKeys.length;
  }

  /**
   * Get concurrency statistics
   */
  getConcurrencyStats() {
    return {
      active_locks: this.locks.size,
      pending_operations: this.pendingOperations.size,
      idempotency_keys: this.idempotencyKeys.size,
      lock_details: Array.from(this.locks.entries()).map(([key, lock]) => ({
        key,
        sessionId: lock.sessionId,
        operation: lock.operation,
        age: Date.now() - lock.acquiredAt
      })),
      pending_details: Array.from(this.pendingOperations.entries()).map(([key, op]) => ({
        key,
        status: op.status,
        age: Date.now() - op.startedAt
      }))
    };
  }

  /**
   * Test concurrency scenarios
   */
  async testConcurrencyScenarios() {
    const results = [];
    
    // Test 1: Concurrent submit_answer for same qid
    const sessionId = 'test-session-1';
    const qid = 'TEST_Q1';
    
    try {
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          this.handleSubmitAnswerIdempotency(sessionId, qid, 'A', async () => {
            await new Promise(resolve => setTimeout(resolve, 100));
            return { success: true, attempt: i + 1 };
          })
        );
      }
      
      const results1 = await Promise.all(promises);
      results.push({
        test: 'concurrent_submit_answer',
        success: true,
        results: results1
      });
    } catch (error) {
      results.push({
        test: 'concurrent_submit_answer',
        success: false,
        error: error.message
      });
    }
    
    // Test 2: Concurrent finalization
    try {
      const promises = [];
      for (let i = 0; i < 3; i++) {
        promises.push(
          this.handleFinalizationRace(sessionId, async () => {
            await new Promise(resolve => setTimeout(resolve, 200));
            return { finalized: true, attempt: i + 1 };
          })
        );
      }
      
      const results2 = await Promise.all(promises);
      results.push({
        test: 'concurrent_finalization',
        success: true,
        results: results2
      });
    } catch (error) {
      results.push({
        test: 'concurrent_finalization',
        success: false,
        error: error.message
      });
    }
    
    return results;
  }

  /**
   * Get session (placeholder - would be implemented by the engine)
   */
  getSession(sessionId) {
    // This would be implemented by the main engine
    return null;
  }

  /**
   * Export concurrency configuration
   */
  exportConfiguration() {
    return {
      schema: 'concurrency.v1',
      active_locks: this.locks.size,
      pending_operations: this.pendingOperations.size,
      idempotency_keys: this.idempotencyKeys.size,
      statistics: this.getConcurrencyStats()
    };
  }
}

module.exports = ConcurrencyManager;
