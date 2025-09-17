# PFF Quiz Engine - Replay Runbook

## 🎯 Overview

This runbook explains how to reproduce any session using the replay system. The replay system allows you to:
- Debug specific user sessions
- Verify engine behavior
- Test edge cases
- Validate fixes

## 🔧 Replay System Components

### 1. Replay Format
Replay files contain:
- Session metadata (seed, picks, bank hash)
- Complete answer sequence
- Expected results
- Timestamps and latency data

### 2. Replay Files Location
```
tests/replays/
├── clean-session.json          # Balanced session
├── broken-session.json         # F-heavy session
├── concentrated-session.json   # Single family focus
└── picks-zero-session.json     # No picks session

tests/goldens/
└── f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df/
    ├── clean-session.json
    ├── broken-session.json
    ├── concentrated-session.json
    ├── picks-zero-session.json
    └── picks-seven-session.json
```

## 🚀 Basic Replay Commands

### Run a Specific Replay
```bash
# Run clean session replay
node scripts/run-replay.js tests/replays/clean-session.json

# Run broken session replay
node scripts/run-replay.js tests/replays/broken-session.json

# Run with verbose output
node scripts/run-replay.js tests/replays/clean-session.json --verbose

# Run and save results
node scripts/run-replay.js tests/replays/clean-session.json --output results.json
```

### Run All Replays
```bash
# Run all replay files
node scripts/run-all-replays.js

# Run with validation
node scripts/run-all-replays.js --validate

# Run and generate report
node scripts/run-all-replays.js --report
```

## 🔍 Debugging with Replays

### 1. Debug Specific Session
```bash
# Create debug session
node scripts/create-debug-session.js --seed="user-session-123" --picks="Control,Pace"

# Run with step-by-step output
node scripts/run-replay.js debug-session.json --step-by-step

# Compare with expected results
node scripts/compare-results.js debug-session.json expected-results.json
```

### 2. Analyze Session Behavior
```bash
# Analyze face state progression
node scripts/analyze-session.js tests/replays/clean-session.json --faces

# Analyze line verdict progression
node scripts/analyze-session.js tests/replays/clean-session.json --line-verdicts

# Analyze performance
node scripts/analyze-session.js tests/replays/clean-session.json --performance
```

### 3. Validate Engine Behavior
```bash
# Validate against golden results
node scripts/validate-replay.js tests/replays/clean-session.json

# Check deterministic behavior
node scripts/check-determinism.js tests/replays/clean-session.json

# Verify edge cases
node scripts/verify-edge-cases.js
```

## 🛠️ Creating Custom Replays

### 1. From User Session Data
```bash
# Convert user session to replay format
node scripts/convert-session.js user-session.json --output replay.json

# Validate replay format
node scripts/validate-replay-format.js replay.json
```

### 2. Generate Test Replays
```bash
# Generate clean session
node scripts/generate-replay.js --type=clean --output clean-test.json

# Generate broken session
node scripts/generate-replay.js --type=broken --output broken-test.json

# Generate edge case
node scripts/generate-replay.js --type=edge --picks=0 --output edge-test.json
```

### 3. Modify Existing Replays
```bash
# Modify picks in replay
node scripts/modify-replay.js tests/replays/clean-session.json --picks="Control,Pace,Boundary"

# Change answer sequence
node scripts/modify-replay.js tests/replays/clean-session.json --answers="A,B,A,B,A,B"

# Update expected results
node scripts/update-expected.js tests/replays/clean-session.json
```

## 🔬 Advanced Replay Techniques

### 1. Replay with Different Bank
```bash
# Use different bank package
node scripts/run-replay.js tests/replays/clean-session.json --bank=./bank/packaged/bank_package_v2.json

# Compare results across banks
node scripts/compare-banks.js tests/replays/clean-session.json
```

### 2. Replay with Different Constants
```bash
# Use different constants profile
node scripts/run-replay.js tests/replays/clean-session.json --constants=STRICT

# Test all constants profiles
node scripts/test-all-constants.js tests/replays/clean-session.json
```

### 3. Replay with Monitoring
```bash
# Run with performance monitoring
node scripts/run-replay.js tests/replays/clean-session.json --monitor

# Run with detailed logging
node scripts/run-replay.js tests/replays/clean-session.json --log-level=debug

# Run with profiling
node scripts/run-replay.js tests/replays/clean-session.json --profile
```

## 🐛 Troubleshooting Replays

### Common Issues

#### 1. Replay File Not Found
**Error**: `Replay file not found`
**Solution**:
```bash
# Check file exists
ls -la tests/replays/

# Verify path
node scripts/run-replay.js --list-available
```

#### 2. Invalid Replay Format
**Error**: `Invalid replay format`
**Solution**:
```bash
# Validate format
node scripts/validate-replay-format.js replay.json

# Fix format
node scripts/fix-replay-format.js replay.json --output fixed.json
```

#### 3. Bank Hash Mismatch
**Error**: `Bank hash mismatch`
**Solution**:
```bash
# Check current bank hash
node scripts/get-bank-hash.js

# Update replay with current hash
node scripts/update-bank-hash.js replay.json
```

#### 4. Results Don't Match
**Error**: `Results don't match expected`
**Solution**:
```bash
# Compare results
node scripts/compare-results.js actual.json expected.json

# Analyze differences
node scripts/analyze-differences.js actual.json expected.json

# Update expected results
node scripts/update-expected.js replay.json
```

### Debugging Steps

1. **Check Replay Format**
   ```bash
   node scripts/validate-replay-format.js replay.json
   ```

2. **Verify Bank Compatibility**
   ```bash
   node scripts/check-bank-compatibility.js replay.json
   ```

3. **Run with Verbose Output**
   ```bash
   node scripts/run-replay.js replay.json --verbose --debug
   ```

4. **Check Engine State**
   ```bash
   node scripts/check-engine-state.js replay.json
   ```

5. **Compare Step by Step**
   ```bash
   node scripts/compare-step-by-step.js replay.json expected.json
   ```

## 📊 Replay Analysis Tools

### 1. Session Analysis
```bash
# Analyze session metrics
node scripts/analyze-session-metrics.js replay.json

# Generate session report
node scripts/generate-session-report.js replay.json

# Compare sessions
node scripts/compare-sessions.js session1.json session2.json
```

### 2. Performance Analysis
```bash
# Analyze performance
node scripts/analyze-performance.js replay.json

# Profile operations
node scripts/profile-replay.js replay.json

# Check memory usage
node scripts/check-memory-usage.js replay.json
```

### 3. Statistical Analysis
```bash
# Analyze face state distribution
node scripts/analyze-face-states.js replay.json

# Analyze line verdict distribution
node scripts/analyze-line-verdicts.js replay.json

# Generate statistics
node scripts/generate-statistics.js replay.json
```

## 🔄 Replay Maintenance

### 1. Update Golden Replays
```bash
# Regenerate all golden replays
node scripts/regenerate-goldens.js

# Update specific replay
node scripts/update-golden.js tests/replays/clean-session.json

# Validate all goldens
node scripts/validate-all-goldens.js
```

### 2. Clean Up Replays
```bash
# Remove old replays
node scripts/cleanup-replays.js --older-than=30d

# Archive replays
node scripts/archive-replays.js --output=archive/

# Compress replays
node scripts/compress-replays.js
```

### 3. Backup Replays
```bash
# Backup all replays
node scripts/backup-replays.js --output=backup/

# Restore replays
node scripts/restore-replays.js --input=backup/

# Verify backup
node scripts/verify-backup.js backup/
```

## 📝 Best Practices

### 1. Replay Creation
- Always include complete session data
- Use descriptive names
- Include expected results
- Document special cases

### 2. Replay Testing
- Test with different configurations
- Validate against golden results
- Check edge cases
- Monitor performance

### 3. Replay Maintenance
- Keep replays up to date
- Remove obsolete replays
- Document changes
- Version control

## 🔗 Related Commands

```bash
# List available replays
node scripts/list-replays.js

# Get replay info
node scripts/get-replay-info.js replay.json

# Search replays
node scripts/search-replays.js --pattern="clean"

# Export replay data
node scripts/export-replay-data.js replay.json --format=csv

# Import replay data
node scripts/import-replay-data.js data.csv --output=replay.json
```

## 📚 Additional Resources

- [Replay Format Specification](./docs/replay-format.md)
- [Debugging Guide](./docs/debugging.md)
- [Testing Guide](./docs/testing.md)
- [Performance Guide](./docs/performance.md)

---

**Last Updated**: 2025-09-17
**Version**: 1.0.0
**Maintainer**: [Your Name]
