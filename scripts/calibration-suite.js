#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Calibration Suite - Batch 5 Implementation
 * 
 * Features:
 * - Threshold sweeps without lying to yourself
 * - Controlled corpora testing
 * - Guardrails and recommendations
 * - Signed calibration reports
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const CALIBRATION_DIR = path.join(__dirname, '..', 'calibration');

// Ensure calibration directory exists
if (!fs.existsSync(CALIBRATION_DIR)) {
  fs.mkdirSync(CALIBRATION_DIR, { recursive: true });
}

/**
 * Load bank package
 */
function loadBankPackage(bankPath) {
  try {
    const content = fs.readFileSync(bankPath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to load bank package: ${error.message}`);
  }
}

/**
 * Load answer scripts from directory
 */
function loadAnswerScripts(scriptsDir) {
  const scripts = [];
  const scriptSets = fs.readdirSync(scriptsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const set of scriptSets) {
    const setPath = path.join(scriptsDir, set);
    const files = fs.readdirSync(setPath)
      .filter(file => file.endsWith('.json'))
      .sort();
    
    for (const file of files) {
      const filePath = path.join(setPath, file);
      try {
        const script = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        scripts.push({
          set,
          file,
          path: filePath,
          data: script
        });
      } catch (error) {
        console.warn(`Warning: Failed to load script ${filePath}: ${error.message}`);
      }
    }
  }
  
  return scripts;
}

/**
 * Run engine with given constants profile
 */
async function runEngineWithProfile(bankPackage, script, constantsProfile) {
  // This would integrate with the actual engine
  // For now, we'll simulate the results
  
  const { initSession, setPicks, submitAnswer, finalizeSession } = require('../engine/index.js');
  
  try {
    // Initialize session
    const sessionSeed = `calibration_${Date.now()}_${Math.random()}`;
    const session = initSession(sessionSeed, bankPackage);
    
    // Set picks
    setPicks(session.session_id, script.picked_families);
    
    // Submit answers
    for (const answer of script.sequence) {
      submitAnswer(session.session_id, answer.qid, answer.key);
    }
    
    // Finalize session
    const result = finalizeSession(session.session_id);
    
    return {
      success: true,
      result,
      session_id: session.session_id
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      session_id: null
    };
  }
}

/**
 * Compute metrics for a constants profile
 */
function computeMetrics(results) {
  const metrics = {
    pct_sessions_with_LIT_ge_1: 0,
    avg_faces_LIT: 0,
    avg_faces_GHOST: 0,
    avg_families_C: 0,
    qa_flags_rate: {
      QA_FLAG_NO_CONTRAST: 0
    }
  };
  
  if (results.length === 0) return metrics;
  
  let sessionsWithLIT = 0;
  let totalFacesLIT = 0;
  let totalFacesGHOST = 0;
  let totalFamiliesC = 0;
  let noContrastFlags = 0;
  
  for (const result of results) {
    if (!result.success || !result.result) continue;
    
    const { face_states, line_verdicts } = result.result;
    
    // Count LIT faces
    let litCount = 0;
    let ghostCount = 0;
    for (const [faceId, state] of Object.entries(face_states)) {
      if (state.state === 'LIT') litCount++;
      if (state.state === 'GHOST') ghostCount++;
    }
    
    if (litCount >= 1) sessionsWithLIT++;
    totalFacesLIT += litCount;
    totalFacesGHOST += ghostCount;
    
    // Count C families
    let cCount = 0;
    for (const verdict of Object.values(line_verdicts)) {
      if (verdict === 'C') cCount++;
    }
    totalFamiliesC += cCount;
    
    // Check for no contrast flags (simplified)
    if (litCount > 0 && !Object.values(face_states).some(s => s.contrastSeen)) {
      noContrastFlags++;
    }
  }
  
  const validResults = results.filter(r => r.success && r.result).length;
  
  if (validResults > 0) {
    metrics.pct_sessions_with_LIT_ge_1 = sessionsWithLIT / validResults;
    metrics.avg_faces_LIT = totalFacesLIT / validResults;
    metrics.avg_faces_GHOST = totalFacesGHOST / validResults;
    metrics.avg_families_C = totalFamiliesC / validResults;
    metrics.qa_flags_rate.QA_FLAG_NO_CONTRAST = noContrastFlags / validResults;
  }
  
  return metrics;
}

/**
 * Apply guardrails to metrics
 */
function applyGuardrails(metrics) {
  const violations = [];
  
  // Guardrail 1: pct_sessions_with_LIT>=1 < 0.05 or > 0.75
  if (metrics.pct_sessions_with_LIT_ge_1 < 0.05) {
    violations.push('LIT rate too low (< 5%)');
  }
  if (metrics.pct_sessions_with_LIT_ge_1 > 0.75) {
    violations.push('LIT rate too high (> 75%)');
  }
  
  // Guardrail 2: qa_flags_rate.QA_FLAG_NO_CONTRAST > 0.15
  if (metrics.qa_flags_rate.QA_FLAG_NO_CONTRAST > 0.15) {
    violations.push('No contrast flag rate too high (> 15%)');
  }
  
  return {
    passed: violations.length === 0,
    violations
  };
}

/**
 * Generate recommendation
 */
function generateRecommendation(profileMetrics) {
  // Simple recommendation logic
  const profiles = Object.keys(profileMetrics);
  
  // Find profile with best LIT rate (closest to 0.5)
  let bestProfile = profiles[0];
  let bestScore = Math.abs(profileMetrics[bestProfile].pct_sessions_with_LIT_ge_1 - 0.5);
  
  for (const profile of profiles) {
    const score = Math.abs(profileMetrics[profile].pct_sessions_with_LIT_ge_1 - 0.5);
    if (score < bestScore) {
      bestScore = score;
      bestProfile = profile;
    }
  }
  
  return bestProfile;
}

/**
 * Sign calibration report
 */
function signCalibrationReport(report, signingKey) {
  const reportString = JSON.stringify(report, null, 0);
  const signature = crypto.createHmac('sha256', signingKey).update(reportString).digest('hex');
  return signature;
}

/**
 * Main calibration function
 */
async function runCalibration(options = {}) {
  console.log('🎯 Calibration Suite - Batch 5');
  console.log('===============================');
  
  try {
    // 1. Load bank package
    const bankPath = options.bankPath || path.join(PACKAGED_DIR, 'bank_package.json');
    console.log(`📦 Loading bank package: ${bankPath}`);
    
    const bankPackage = loadBankPackage(bankPath);
    console.log(`✅ Bank loaded: ${bankPackage.meta.bank_id}`);
    
    // 2. Load answer scripts
    const scriptsDir = options.scriptsDir || path.join(SCRIPTS_DIR, 'answer_scripts');
    console.log(`📜 Loading answer scripts: ${scriptsDir}`);
    
    if (!fs.existsSync(scriptsDir)) {
      console.log('⚠️  Answer scripts directory not found, creating sample scripts...');
      await createSampleScripts(scriptsDir);
    }
    
    const scripts = loadAnswerScripts(scriptsDir);
    console.log(`✅ Loaded ${scripts.length} scripts`);
    
    // 3. Get constants profiles to test
    const constantsProfiles = options.profiles || ['DEFAULT', 'STRICT', 'LENIENT'];
    console.log(`⚙️  Testing profiles: ${constantsProfiles.join(', ')}`);
    
    // 4. Run calibration for each profile
    const profileMetrics = {};
    
    for (const profile of constantsProfiles) {
      console.log(`\n🔬 Testing profile: ${profile}`);
      
      // Update bank package with profile constants
      const profileBank = JSON.parse(JSON.stringify(bankPackage));
      if (profileBank.constants.profiles[profile]) {
        profileBank.constants.profiles.DEFAULT = profileBank.constants.profiles[profile];
      }
      
      const results = [];
      
      // Run each script
      for (const script of scripts) {
        const result = await runEngineWithProfile(profileBank, script.data, profile);
        results.push(result);
      }
      
      // Compute metrics
      const metrics = computeMetrics(results);
      profileMetrics[profile] = metrics;
      
      console.log(`  📊 LIT rate: ${(metrics.pct_sessions_with_LIT_ge_1 * 100).toFixed(1)}%`);
      console.log(`  📊 Avg LIT faces: ${metrics.avg_faces_LIT.toFixed(2)}`);
      console.log(`  📊 Avg GHOST faces: ${metrics.avg_faces_GHOST.toFixed(2)}`);
      console.log(`  📊 Avg C families: ${metrics.avg_families_C.toFixed(2)}`);
      
      // Check guardrails
      const guardrails = applyGuardrails(metrics);
      if (!guardrails.passed) {
        console.log(`  ❌ Guardrail violations: ${guardrails.violations.join(', ')}`);
      } else {
        console.log(`  ✅ Guardrails passed`);
      }
    }
    
    // 5. Generate recommendation
    console.log('\n🎯 Generating recommendation...');
    const recommendation = generateRecommendation(profileMetrics);
    console.log(`✅ Recommended profile: ${recommendation}`);
    
    // 6. Create calibration report
    const report = {
      schema: 'calibration_report.v1',
      bank_id: bankPackage.meta.bank_id,
      constants_profiles: constantsProfiles,
      metrics: profileMetrics,
      recommendation,
      generated_at: new Date().toISOString(),
      scripts_used: scripts.length
    };
    
    // 7. Sign report
    const signingKey = crypto.randomBytes(32).toString('hex');
    const signature = signCalibrationReport(report, signingKey);
    report.signature = signature;
    
    // 8. Save report
    const reportPath = path.join(CALIBRATION_DIR, `calibration_${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n✅ Calibration complete`);
    console.log(`📊 Report: ${reportPath}`);
    console.log(`🔑 Signature: ${signature.substring(0, 16)}...`);
    
    return report;
    
  } catch (error) {
    console.error('❌ Calibration failed:', error.message);
    throw error;
  }
}

/**
 * Create sample answer scripts for testing
 */
async function createSampleScripts(scriptsDir) {
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  // Create sample script sets
  const sets = [
    { name: 'set_A_clean', count: 10 },
    { name: 'set_B_broken', count: 10 },
    { name: 'set_C_concentrated', count: 10 }
  ];
  
  for (const set of sets) {
    const setDir = path.join(scriptsDir, set.name);
    if (!fs.existsSync(setDir)) {
      fs.mkdirSync(setDir, { recursive: true });
    }
    
    for (let i = 1; i <= set.count; i++) {
      const script = {
        picked_families: ['Control', 'Pace', 'Boundary'],
        sequence: [
          { family: 'Control', qid: 'CTRL_Q1', key: 'A' },
          { family: 'Control', qid: 'CTRL_Q2', key: 'B' },
          { family: 'Pace', qid: 'PACE_Q1', key: 'A' },
          { family: 'Pace', qid: 'PACE_Q2', key: 'B' },
          { family: 'Pace', qid: 'PACE_Q3', key: 'A' },
          { family: 'Boundary', qid: 'BOUND_Q1', key: 'B' },
          { family: 'Boundary', qid: 'BOUND_Q2', key: 'A' },
          { family: 'Boundary', qid: 'BOUND_Q3', key: 'B' },
          { family: 'Truth', qid: 'TRUTH_Q1', key: 'A' },
          { family: 'Truth', qid: 'TRUTH_Q2', key: 'B' },
          { family: 'Truth', qid: 'TRUTH_Q3', key: 'A' },
          { family: 'Recognition', qid: 'RECOG_Q1', key: 'B' },
          { family: 'Recognition', qid: 'RECOG_Q2', key: 'A' },
          { family: 'Recognition', qid: 'RECOG_Q3', key: 'B' },
          { family: 'Bonding', qid: 'BOND_Q1', key: 'A' },
          { family: 'Bonding', qid: 'BOND_Q2', key: 'B' },
          { family: 'Stress', qid: 'STRESS_Q1', key: 'A' },
          { family: 'Stress', qid: 'STRESS_Q2', key: 'B' },
          { family: 'Stress', qid: 'STRESS_Q3', key: 'A' }
        ]
      };
      
      const filePath = path.join(setDir, `${i.toString().padStart(4, '0')}.json`);
      fs.writeFileSync(filePath, JSON.stringify(script, null, 2));
    }
  }
  
  console.log(`✅ Created sample scripts in ${scriptsDir}`);
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--bank':
        options.bankPath = args[++i];
        break;
      case '--scripts':
        options.scriptsDir = args[++i];
        break;
      case '--profiles':
        options.profiles = args[++i].split(',');
        break;
      case '--help':
        console.log('Calibration Suite - Batch 5');
        console.log('');
        console.log('Usage: node calibration-suite.js [options]');
        console.log('');
        console.log('Options:');
        console.log('  --bank <path>      Bank package path');
        console.log('  --scripts <path>   Answer scripts directory');
        console.log('  --profiles <list>  Comma-separated list of profiles');
        console.log('  --help             Show this help');
        process.exit(0);
        break;
    }
  }
  
  runCalibration(options).catch(error => {
    console.error('❌ Calibration failed:', error.message);
    process.exit(1);
  });
}

module.exports = { runCalibration, computeMetrics, applyGuardrails };
