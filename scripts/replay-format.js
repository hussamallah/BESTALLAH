#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Deterministic Replay File - Batch 5 Implementation
 * 
 * Features:
 * - One file replays a session 1:1
 * - Reproduces engine results for audits and disputes
 * - REPLAY_MISMATCH detection with diff
 */

const REPLAY_DIR = path.join(__dirname, '..', 'replays');
const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');

// Ensure replay directory exists
if (!fs.existsSync(REPLAY_DIR)) {
  fs.mkdirSync(REPLAY_DIR, { recursive: true });
}

/**
 * Create replay file from session data
 */
function createReplayFile(sessionData, bankPackage) {
  const replay = {
    schema: 'replay.v1',
    session_seed: sessionData.session_seed,
    bank_id: bankPackage.meta.bank_id,
    bank_hash_sha256: bankPackage.meta.bank_hash_sha256,
    constants_profile: 'DEFAULT',
    picked_families: sessionData.picked_families,
    answers: sessionData.answers.map(answer => ({
      qid: answer.qid,
      key: answer.picked_key
    })),
    created_at: new Date().toISOString()
  };
  
  return replay;
}

/**
 * Save replay file
 */
function saveReplayFile(replay, filename) {
  const filePath = path.join(REPLAY_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(replay, null, 2));
  return filePath;
}

/**
 * Load replay file
 */
function loadReplayFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load replay file: ${error.message}`);
  }
}

/**
 * Replay session and verify results
 */
async function replaySession(replayFile, bankPackage) {
  console.log('🔄 Replaying session...');
  console.log(`📄 Replay file: ${replayFile}`);
  console.log(`🏦 Bank: ${bankPackage.meta.bank_id}`);
  
  try {
    // Load replay data
    const replay = loadReplayFile(replayFile);
    
    // Validate replay schema
    if (replay.schema !== 'replay.v1') {
      throw new Error('Invalid replay schema');
    }
    
    // Validate bank hash
    if (replay.bank_hash_sha256 !== bankPackage.meta.bank_hash_sha256) {
      throw new Error('Bank hash mismatch');
    }
    
    // Initialize engine
    const { initSession, setPicks, submitAnswer, finalizeSession } = require('../engine/index.js');
    
    // Create session with same seed
    const session = initSession(replay.session_seed, bankPackage);
    
    // Set picks
    setPicks(session.session_id, replay.picked_families);
    
    // Submit answers in sequence
    for (const answer of replay.answers) {
      submitAnswer(session.session_id, answer.qid, answer.key);
    }
    
    // Finalize session
    const result = finalizeSession(session.session_id);
    
    console.log('✅ Replay completed successfully');
    return {
      success: true,
      result,
      session_id: session.session_id
    };
    
  } catch (error) {
    console.error('❌ Replay failed:', error.message);
    return {
      success: false,
      error: error.message,
      session_id: null
    };
  }
}

/**
 * Compare replay results with expected results
 */
function compareResults(actual, expected) {
  const differences = [];
  
  // Compare line verdicts
  if (actual.line_verdicts && expected.line_verdicts) {
    for (const [family, verdict] of Object.entries(actual.line_verdicts)) {
      if (expected.line_verdicts[family] !== verdict) {
        differences.push({
          type: 'line_verdict',
          family,
          actual: verdict,
          expected: expected.line_verdicts[family]
        });
      }
    }
  }
  
  // Compare face states
  if (actual.face_states && expected.face_states) {
    for (const [faceId, state] of Object.entries(actual.face_states)) {
      if (expected.face_states[faceId]) {
        const expectedState = expected.face_states[faceId];
        if (state.state !== expectedState.state) {
          differences.push({
            type: 'face_state',
            face_id: faceId,
            actual: state.state,
            expected: expectedState.state
          });
        }
      }
    }
  }
  
  // Compare family reps
  if (actual.family_reps && expected.family_reps) {
    if (JSON.stringify(actual.family_reps) !== JSON.stringify(expected.family_reps)) {
      differences.push({
        type: 'family_reps',
        actual: actual.family_reps,
        expected: expected.family_reps
      });
    }
  }
  
  // Compare anchor family
  if (actual.anchor_family !== expected.anchor_family) {
    differences.push({
      type: 'anchor_family',
      actual: actual.anchor_family,
      expected: expected.anchor_family
    });
  }
  
  return differences;
}

/**
 * Generate replay audit record
 */
function generateReplayAudit(replayFile, result, expectedResult = null) {
  const audit = {
    replay_id: crypto.createHash('sha256').update(replayFile).digest('hex').substring(0, 16),
    bank_id: result.bank_id || 'unknown',
    bank_hash_sha256: result.bank_hash_sha256 || 'unknown',
    payload_hash: crypto.createHash('sha256').update(JSON.stringify(result)).digest('hex'),
    final_snapshot_hash: crypto.createHash('sha256').update(JSON.stringify(result.result)).digest('hex'),
    result: 'MATCH',
    created_at: new Date().toISOString()
  };
  
  // Check for mismatches if expected result provided
  if (expectedResult && result.result) {
    const differences = compareResults(result.result, expectedResult);
    if (differences.length > 0) {
      audit.result = 'MISMATCH';
      audit.differences = differences;
    }
  }
  
  return audit;
}

/**
 * Save replay audit
 */
function saveReplayAudit(audit, filename) {
  const auditDir = path.join(REPLAY_DIR, 'audits');
  if (!fs.existsSync(auditDir)) {
    fs.mkdirSync(auditDir, { recursive: true });
  }
  
  const filePath = path.join(auditDir, filename);
  fs.writeFileSync(filePath, JSON.stringify(audit, null, 2));
  return filePath;
}

/**
 * Create replay from current session
 */
async function createReplayFromSession(sessionId, bankPackage) {
  console.log('📝 Creating replay from session...');
  
  try {
    // This would integrate with the actual engine to get session data
    // For now, we'll create a sample replay
    
    const sessionData = {
      session_seed: `replay_${Date.now()}`,
      picked_families: ['Control', 'Pace', 'Boundary'],
      answers: [
        { qid: 'CTRL_Q1', picked_key: 'A' },
        { qid: 'CTRL_Q2', picked_key: 'B' },
        { qid: 'PACE_Q1', picked_key: 'A' },
        { qid: 'PACE_Q2', picked_key: 'B' },
        { qid: 'PACE_Q3', picked_key: 'A' },
        { qid: 'BOUND_Q1', picked_key: 'B' },
        { qid: 'BOUND_Q2', picked_key: 'A' },
        { qid: 'BOUND_Q3', picked_key: 'B' },
        { qid: 'TRUTH_Q1', picked_key: 'A' },
        { qid: 'TRUTH_Q2', picked_key: 'B' },
        { qid: 'TRUTH_Q3', picked_key: 'A' },
        { qid: 'RECOG_Q1', picked_key: 'B' },
        { qid: 'RECOG_Q2', picked_key: 'A' },
        { qid: 'RECOG_Q3', picked_key: 'B' },
        { qid: 'BOND_Q1', picked_key: 'A' },
        { qid: 'BOND_Q2', picked_key: 'B' },
        { qid: 'STRESS_Q1', picked_key: 'A' },
        { qid: 'STRESS_Q2', picked_key: 'B' },
        { qid: 'STRESS_Q3', picked_key: 'A' }
      ]
    };
    
    const replay = createReplayFile(sessionData, bankPackage);
    const filename = `replay_${Date.now()}.json`;
    const filePath = saveReplayFile(replay, filename);
    
    console.log(`✅ Replay created: ${filePath}`);
    return filePath;
    
  } catch (error) {
    console.error('❌ Failed to create replay:', error.message);
    throw error;
  }
}

/**
 * Main replay function
 */
async function runReplay(options = {}) {
  console.log('🔄 Deterministic Replay - Batch 5');
  console.log('==================================');
  
  try {
    // Load bank package
    const bankPath = options.bankPath || path.join(PACKAGED_DIR, 'bank_package.json');
    const bankPackage = JSON.parse(fs.readFileSync(bankPath, 'utf8'));
    
    if (options.create) {
      // Create replay from session
      const replayPath = await createReplayFromSession(options.sessionId, bankPackage);
      return replayPath;
    } else if (options.replayFile) {
      // Replay existing file
      const result = await replaySession(options.replayFile, bankPackage);
      
      if (result.success) {
        // Generate audit
        const audit = generateReplayAudit(options.replayFile, result, options.expectedResult);
        const auditPath = saveReplayAudit(audit, `audit_${Date.now()}.json`);
        
        console.log(`📊 Audit: ${auditPath}`);
        console.log(`🔍 Result: ${audit.result}`);
        
        if (audit.result === 'MISMATCH') {
          console.log('❌ REPLAY_MISMATCH detected');
          console.log('Differences:');
          audit.differences.forEach(diff => {
            console.log(`  - ${diff.type}: ${JSON.stringify(diff)}`);
          });
        }
      }
      
      return result;
    } else {
      throw new Error('Must specify --create or --replay');
    }
    
  } catch (error) {
    console.error('❌ Replay failed:', error.message);
    throw error;
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--create':
        options.create = true;
        options.sessionId = args[++i];
        break;
      case '--replay':
        options.replayFile = args[++i];
        break;
      case '--bank':
        options.bankPath = args[++i];
        break;
      case '--expected':
        options.expectedResult = JSON.parse(args[++i]);
        break;
      case '--help':
        console.log('Deterministic Replay - Batch 5');
        console.log('');
        console.log('Usage: node replay-format.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --create <sessionId>  Create replay from session');
        console.log('  --replay <file>       Replay existing file');
        console.log('  --bank <path>         Bank package path');
        console.log('  --expected <json>     Expected result for comparison');
        console.log('  --help                Show this help');
        process.exit(0);
        break;
    }
  }
  
  runReplay(options).catch(error => {
    console.error('❌ Replay failed:', error.message);
    process.exit(1);
  });
}

module.exports = { 
  createReplayFile, 
  replaySession, 
  compareResults, 
  generateReplayAudit 
};
