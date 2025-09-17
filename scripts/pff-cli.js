#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * PFF CLI - Batch 5 Implementation
 * 
 * Commands:
 * - pff pack → emits bank package (81)
 * - pff run --replay replay.json --bank bank_package.json → emits snapshot
 * - pff calibrate --bank bank_package.json --scripts scripts/set_* → emits calibration report (82)
 */

const BANK_DIR = path.join(__dirname, '..', 'bank');
const PACKAGED_DIR = path.join(BANK_DIR, 'packaged');
const SCRIPTS_DIR = path.join(__dirname, '..', 'scripts');
const CALIBRATION_DIR = path.join(__dirname, '..', 'calibration');
const REPLAY_DIR = path.join(__dirname, '..', 'replays');

// Ensure directories exist
[PACKAGED_DIR, CALIBRATION_DIR, REPLAY_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

/**
 * Pack command - Build bank package
 */
async function packCommand(options) {
  console.log('📦 PFF Pack - Building bank package');
  console.log('===================================');
  
  try {
    const { buildBank } = require('./bank-builder-cli.js');
    const result = buildBank(options);
    
    console.log('✅ Bank package built successfully');
    console.log(`📦 Package: ${result.packagePath}`);
    console.log(`🔍 Linter report: ${result.linterReportPath}`);
    console.log(`🔑 Signature: ${result.signaturePath}`);
    
    return result;
  } catch (error) {
    console.error('❌ Pack failed:', error.message);
    process.exit(1);
  }
}

/**
 * Run command - Replay session
 */
async function runCommand(options) {
  console.log('🔄 PFF Run - Replaying session');
  console.log('==============================');
  
  try {
    const { runReplay } = require('./replay-format.js');
    const result = await runReplay(options);
    
    if (result.success) {
      console.log('✅ Replay completed successfully');
      console.log(`📊 Session ID: ${result.session_id}`);
    } else {
      console.error('❌ Replay failed:', result.error);
      process.exit(1);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Run failed:', error.message);
    process.exit(1);
  }
}

/**
 * Calibrate command - Run calibration suite
 */
async function calibrateCommand(options) {
  console.log('🎯 PFF Calibrate - Running calibration suite');
  console.log('============================================');
  
  try {
    const { runCalibration } = require('./calibration-suite.js');
    const result = await runCalibration(options);
    
    console.log('✅ Calibration completed successfully');
    console.log(`📊 Recommendation: ${result.recommendation}`);
    console.log(`📈 LIT rate: ${(result.metrics.DEFAULT.pct_sessions_with_LIT_ge_1 * 100).toFixed(1)}%`);
    
    return result;
  } catch (error) {
    console.error('❌ Calibration failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test command - Run all tests
 */
async function testCommand(options) {
  console.log('🧪 PFF Test - Running test suite');
  console.log('================================');
  
  try {
    const { runAllTests } = require('./run-all-tests.js');
    const result = await runAllTests();
    
    if (result.success) {
      console.log('✅ All tests passed');
    } else {
      console.error('❌ Some tests failed');
      process.exit(1);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

/**
 * Validate command - Validate bank package
 */
async function validateCommand(options) {
  console.log('🔍 PFF Validate - Validating bank package');
  console.log('=========================================');
  
  try {
    const { validateBankPackage } = require('./validate-bank-package.js');
    const result = await validateBankPackage(options.bankPath);
    
    if (result.valid) {
      console.log('✅ Bank package is valid');
    } else {
      console.error('❌ Bank package validation failed');
      console.error('Errors:', result.errors);
      process.exit(1);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Help command - Show help information
 */
function helpCommand() {
  console.log('PFF Quiz Engine CLI - Batch 5');
  console.log('==============================');
  console.log('');
  console.log('Usage: node pff-cli.js <command> [options]');
  console.log('');
  console.log('Commands:');
  console.log('  pack                    Build bank package');
  console.log('  run                     Replay session from file');
  console.log('  calibrate               Run calibration suite');
  console.log('  test                    Run all tests');
  console.log('  validate                Validate bank package');
  console.log('  help                    Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --bank <path>           Bank package path');
  console.log('  --replay <file>         Replay file path');
  console.log('  --scripts <dir>         Answer scripts directory');
  console.log('  --profiles <list>       Comma-separated list of profiles');
  console.log('  --output <dir>          Output directory');
  console.log('  --verbose               Verbose output');
  console.log('');
  console.log('Examples:');
  console.log('  node pff-cli.js pack');
  console.log('  node pff-cli.js run --replay replay.json --bank bank_package.json');
  console.log('  node pff-cli.js calibrate --bank bank_package.json --scripts scripts/');
  console.log('  node pff-cli.js test');
  console.log('  node pff-cli.js validate --bank bank_package.json');
}

/**
 * Parse command line arguments
 */
function parseArguments(args) {
  const options = {};
  const command = args[0];
  
  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg) {
      case '--bank':
        options.bankPath = args[++i];
        break;
      case '--replay':
        options.replayFile = args[++i];
        break;
      case '--scripts':
        options.scriptsDir = args[++i];
        break;
      case '--profiles':
        options.profiles = args[++i].split(',');
        break;
      case '--output':
        options.outputDir = args[++i];
        break;
      case '--verbose':
        options.verbose = true;
        break;
      case '--help':
        helpCommand();
        process.exit(0);
        break;
      default:
        if (arg.startsWith('--')) {
          console.error(`Unknown option: ${arg}`);
          process.exit(1);
        }
        break;
    }
  }
  
  return { command, options };
}

/**
 * Main CLI function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    helpCommand();
    process.exit(0);
  }
  
  const { command, options } = parseArguments(args);
  
  if (options.help) {
    helpCommand();
    process.exit(0);
  }
  
  try {
    switch (command) {
      case 'pack':
        await packCommand(options);
        break;
      case 'run':
        await runCommand(options);
        break;
      case 'calibrate':
        await calibrateCommand(options);
        break;
      case 'test':
        await testCommand(options);
        break;
      case 'validate':
        await validateCommand(options);
        break;
      case 'help':
        helpCommand();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run with --help for usage information');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Command failed:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ CLI failed:', error.message);
    process.exit(1);
  });
}

module.exports = {
  packCommand,
  runCommand,
  calibrateCommand,
  testCommand,
  validateCommand,
  helpCommand,
  parseArguments,
  main
};
