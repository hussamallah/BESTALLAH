/**
 * Recovery and Continuation Mechanisms for Batch 3
 * Handles session recovery, crash recovery, and continuation
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class RecoveryManager {
  constructor() {
    this.recoveryDir = './recovery';
    this.maxRecoveryFiles = 100;
    this.ensureRecoveryDir();
  }

  /**
   * Ensure recovery directory exists
   */
  ensureRecoveryDir() {
    if (!fs.existsSync(this.recoveryDir)) {
      fs.mkdirSync(this.recoveryDir, { recursive: true });
    }
  }

  /**
   * Save session state for recovery
   * @param {string} sessionId - Session ID
   * @param {Object} session - Session state
   * @param {string} reason - Reason for saving (crash, pause, etc.)
   */
  saveSessionState(sessionId, session, reason = 'manual') {
    try {
      const recoveryData = {
        session_id: sessionId,
        saved_at: new Date().toISOString(),
        reason: reason,
        bank_hash: session.bankHash,
        bank_id: session.bankId,
        constants_profile: session.constantsProfile,
        state: session.state,
        picks: Array.from(session.picks || []),
        schedule: session.schedule || [],
        answers: session.answers || [],
        line_state: this._serializeMap(session.lineState),
        face_ledger: this._serializeMap(session.faceLedger),
        screen_face_count: this._serializeMap(session.screenFaceCount),
        started_at: session.startedAt,
        qa_flags: session.qaFlags || []
      };

      const recoveryFile = path.join(this.recoveryDir, `session_${sessionId}_${Date.now()}.json`);
      fs.writeFileSync(recoveryFile, JSON.stringify(recoveryData, null, 2));
      
      // Clean up old recovery files
      this._cleanupOldRecoveryFiles();
      
      return recoveryFile;
    } catch (error) {
      throw new Error(`Failed to save session state: ${error.message}`);
    }
  }

  /**
   * Load session state from recovery
   * @param {string} sessionId - Session ID
   * @returns {Object|null} Recovered session state or null
   */
  loadSessionState(sessionId) {
    try {
      const recoveryFiles = fs.readdirSync(this.recoveryDir)
        .filter(file => file.startsWith(`session_${sessionId}_`))
        .sort()
        .reverse(); // Get most recent first

      if (recoveryFiles.length === 0) {
        return null;
      }

      const latestFile = path.join(this.recoveryDir, recoveryFiles[0]);
      const recoveryData = JSON.parse(fs.readFileSync(latestFile, 'utf8'));
      
      return this._deserializeSessionState(recoveryData);
    } catch (error) {
      throw new Error(`Failed to load session state: ${error.message}`);
    }
  }

  /**
   * List available recovery files
   * @returns {Array} List of recovery files
   */
  listRecoveryFiles() {
    try {
      return fs.readdirSync(this.recoveryDir)
        .filter(file => file.startsWith('session_') && file.endsWith('.json'))
        .map(file => {
          const filePath = path.join(this.recoveryDir, file);
          const stats = fs.statSync(filePath);
          return {
            file: file,
            path: filePath,
            size: stats.size,
            modified: stats.mtime
          };
        })
        .sort((a, b) => b.modified - a.modified);
    } catch (error) {
      return [];
    }
  }

  /**
   * Recover session from crash
   * @param {string} sessionId - Session ID
   * @param {Object} engine - Engine instance
   * @returns {Object} Recovery result
   */
  recoverFromCrash(sessionId, engine) {
    try {
      const recoveredState = this.loadSessionState(sessionId);
      if (!recoveredState) {
        return {
          success: false,
          error: 'No recovery data found for session'
        };
      }

      // Validate bank compatibility
      const currentBankHash = engine.bankLoader.getBankHash();
      if (recoveredState.bankHash !== currentBankHash) {
        return {
          success: false,
          error: 'Bank hash mismatch - session cannot be recovered with current bank'
        };
      }

      // Restore session to engine
      engine.sessions.set(sessionId, recoveredState);
      
      return {
        success: true,
        session: recoveredState,
        message: 'Session recovered successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Recovery failed: ${error.message}`
      };
    }
  }

  /**
   * Continue session from pause
   * @param {string} sessionId - Session ID
   * @param {Object} engine - Engine instance
   * @returns {Object} Continuation result
   */
  continueFromPause(sessionId, engine) {
    try {
      const session = engine.sessions.get(sessionId);
      if (!session) {
        return {
          success: false,
          error: 'Session not found'
        };
      }

      if (session.state !== 'PAUSED') {
        return {
          success: false,
          error: 'Session is not in PAUSED state'
        };
      }

      // Resume session
      session.state = 'IN_PROGRESS';
      session.resumed_at = new Date().toISOString();
      
      return {
        success: true,
        session: session,
        message: 'Session resumed successfully'
      };
    } catch (error) {
      return {
        success: false,
        error: `Continuation failed: ${error.message}`
      };
    }
  }

  /**
   * Create session checkpoint
   * @param {string} sessionId - Session ID
   * @param {Object} session - Session state
   * @returns {string} Checkpoint file path
   */
  createCheckpoint(sessionId, session) {
    return this.saveSessionState(sessionId, session, 'checkpoint');
  }

  /**
   * Restore from checkpoint
   * @param {string} checkpointFile - Checkpoint file path
   * @returns {Object} Restored session state
   */
  restoreFromCheckpoint(checkpointFile) {
    try {
      const checkpointData = JSON.parse(fs.readFileSync(checkpointFile, 'utf8'));
      return this._deserializeSessionState(checkpointData);
    } catch (error) {
      throw new Error(`Failed to restore from checkpoint: ${error.message}`);
    }
  }

  /**
   * Clean up recovery files
   * @param {number} keepCount - Number of files to keep
   */
  cleanupRecoveryFiles(keepCount = 10) {
    try {
      const files = this.listRecoveryFiles();
      if (files.length <= keepCount) {
        return;
      }

      const filesToDelete = files.slice(keepCount);
      filesToDelete.forEach(file => {
        fs.unlinkSync(file.path);
      });
    } catch (error) {
      console.error('Failed to cleanup recovery files:', error.message);
    }
  }

  /**
   * Serialize Map to object
   * @param {Map} map - Map to serialize
   * @returns {Object} Serialized map
   */
  _serializeMap(map) {
    if (!map) return {};
    const obj = {};
    map.forEach((value, key) => {
      if (value instanceof Map) {
        obj[key] = this._serializeMap(value);
      } else if (value instanceof Set) {
        obj[key] = Array.from(value);
      } else {
        obj[key] = value;
      }
    });
    return obj;
  }

  /**
   * Deserialize object to Map
   * @param {Object} obj - Object to deserialize
   * @returns {Map} Deserialized map
   */
  _deserializeMap(obj) {
    if (!obj) return new Map();
    const map = new Map();
    Object.entries(obj).forEach(([key, value]) => {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        map.set(key, this._deserializeMap(value));
      } else if (Array.isArray(value)) {
        map.set(key, new Set(value));
      } else {
        map.set(key, value);
      }
    });
    return map;
  }

  /**
   * Deserialize session state from recovery data
   * @param {Object} recoveryData - Recovery data
   * @returns {Object} Session state
   */
  _deserializeSessionState(recoveryData) {
    return {
      sessionId: recoveryData.session_id,
      bankHash: recoveryData.bank_hash,
      bankId: recoveryData.bank_id,
      constantsProfile: recoveryData.constants_profile,
      state: recoveryData.state,
      picks: new Set(recoveryData.picks || []),
      schedule: recoveryData.schedule || [],
      answers: recoveryData.answers || [],
      lineState: this._deserializeMap(recoveryData.line_state),
      faceLedger: this._deserializeMap(recoveryData.face_ledger),
      screenFaceCount: this._deserializeMap(recoveryData.screen_face_count),
      startedAt: recoveryData.started_at,
      qaFlags: recoveryData.qa_flags || [],
      recovered_at: new Date().toISOString()
    };
  }

  /**
   * Clean up old recovery files
   */
  _cleanupOldRecoveryFiles() {
    this.cleanupRecoveryFiles(this.maxRecoveryFiles);
  }
}

module.exports = RecoveryManager;
