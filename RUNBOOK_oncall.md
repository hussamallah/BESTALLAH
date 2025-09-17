# PFF Quiz Engine - Oncall Runbook

## 🚨 Emergency Contacts

- **Primary Oncall**: [Your Name] - [phone] - [email]
- **Secondary Oncall**: [Backup Name] - [phone] - [email]
- **Escalation**: [Manager Name] - [phone] - [email]

## 🔥 Critical Alerts & Response

### High Priority Alerts

#### 1. Engine Performance Degradation
**Alert**: `p95 finalizeSession > 100ms for 5 minutes`
**Impact**: Users experiencing slow quiz completion
**Response**:
1. Check dashboard: `node scripts/monitor-dashboard.js`
2. Review recent deployments
3. Check system resources (CPU, memory)
4. If persistent > 10 minutes: Scale horizontally
5. If > 30 minutes: Rollback to previous version

#### 2. High Error Rate
**Alert**: `crash rate > 0.5% for 5 minutes`
**Impact**: Users unable to complete quizzes
**Response**:
1. Check error logs: `node scripts/check-errors.js`
2. Identify error patterns
3. Check bank hash validation
4. If signature failures: Check bank package integrity
5. If > 10 minutes: Enable maintenance mode

#### 3. Low Completion Rate
**Alert**: `completion < 80% over 1 hour`
**Impact**: Users abandoning quizzes
**Response**:
1. Check abandonment patterns: `node scripts/check-abandonment.js`
2. Review question content for issues
3. Check frontend performance
4. If content issue: Disable problematic questions
5. If technical: Check browser compatibility

#### 4. Signature Verification Failures
**Alert**: `signature failures > 0 in 10 minutes`
**Impact**: Security breach - unauthorized bank packages
**Response**:
1. **IMMEDIATE**: Check bank package integrity
2. Verify bank hash: `node scripts/verify-bank-hash.js`
3. Check for unauthorized deployments
4. If confirmed breach: Rotate signing keys
5. Notify security team

### Medium Priority Alerts

#### 5. High Memory Usage
**Alert**: `memory usage > 80%`
**Response**:
1. Check for memory leaks
2. Restart engine if needed
3. Scale horizontally

#### 6. Database Connection Issues
**Alert**: `database connection failures`
**Response**:
1. Check database health
2. Verify connection pool settings
3. Restart database connections

## 🛠️ Kill Switches & Emergency Controls

### Available Kill Switches

```bash
# Disable results (maintenance mode)
export RESULTS_ENABLED=false

# Disable back navigation
export ALLOW_BACKNAV=false

# Enable verbose logging
export LOG_VERBOSE=true

# Quiz-only mode (no finalization)
export QUIZ_ONLY_MODE=true

# Restrict bank hashes
export ALLOWED_BANK_HASHES='["f3b83f5647111864456d1d73accf7fd4936139e95381c827b0c4d2353749c6df"]'
```

### Emergency Procedures

#### 1. Enable Maintenance Mode
```bash
# Set environment variables
export RESULTS_ENABLED=false
export QUIZ_ONLY_MODE=true

# Restart engine
pm2 restart pff-engine
```

#### 2. Rollback to Previous Version
```bash
# Check current version
node -e "console.log(require('./engine').getVersionInfo())"

# Rollback to previous version
git checkout [previous-commit]
npm install
pm2 restart pff-engine

# Verify rollback
node scripts/verify-rollback.js
```

#### 3. Rotate Signing Keys
```bash
# Generate new keys
node scripts/generate-keys.js

# Sign bank with new keys
node scripts/sign-bank.js sign

# Update allowed hashes
export ALLOWED_BANK_HASHES='["new-hash"]'

# Restart engine
pm2 restart pff-engine
```

## 📊 Monitoring & Diagnostics

### Health Checks

```bash
# Engine status
node -e "console.log(JSON.stringify(require('./engine').getStatus(), null, 2))"

# Dashboard data
node -e "console.log(JSON.stringify(require('./engine').getDashboardData(), null, 2))"

# Configuration
node -e "console.log(JSON.stringify(require('./engine').getConfiguration(), null, 2))"
```

### Performance Monitoring

```bash
# Run performance test
node scripts/load-test.js

# Check specific metrics
node scripts/check-performance.js --metric=finalizeSession --threshold=20

# Monitor real-time
node scripts/monitor-realtime.js
```

### Error Analysis

```bash
# Check error patterns
node scripts/analyze-errors.js --timeframe=1h

# Check specific error type
node scripts/analyze-errors.js --type=signature_verification

# Generate error report
node scripts/generate-error-report.js
```

## 🔧 Common Issues & Solutions

### Issue: Engine Won't Start
**Symptoms**: Engine fails to initialize
**Diagnosis**:
```bash
# Check bank package
node scripts/verify-bank.js

# Check configuration
node scripts/validate-config.js

# Check dependencies
npm list
```
**Solutions**:
1. Verify bank package integrity
2. Check environment variables
3. Reinstall dependencies
4. Check file permissions

### Issue: High Memory Usage
**Symptoms**: Memory usage > 80%
**Diagnosis**:
```bash
# Check memory usage
node scripts/check-memory.js

# Check for leaks
node scripts/check-memory-leaks.js
```
**Solutions**:
1. Restart engine
2. Check for memory leaks
3. Scale horizontally
4. Optimize code

### Issue: Slow Performance
**Symptoms**: p95 > thresholds
**Diagnosis**:
```bash
# Run performance test
node scripts/load-test.js

# Check specific operations
node scripts/profile-operations.js
```
**Solutions**:
1. Check system resources
2. Optimize database queries
3. Scale horizontally
4. Check for bottlenecks

### Issue: Signature Verification Failures
**Symptoms**: Bank hash validation failures
**Diagnosis**:
```bash
# Check bank integrity
node scripts/verify-bank-hash.js

# Check signing keys
node scripts/check-keys.js
```
**Solutions**:
1. Verify bank package
2. Check signing keys
3. Update allowed hashes
4. Rotate keys if compromised

## 📞 Escalation Procedures

### Level 1: Oncall Engineer
- Handle all alerts
- Use kill switches
- Basic troubleshooting
- Document incidents

### Level 2: Senior Engineer
- Complex debugging
- Performance optimization
- Architecture changes
- Key rotation

### Level 3: Engineering Manager
- Major outages
- Security incidents
- Resource allocation
- External communication

## 📝 Post-Incident Procedures

### 1. Document Incident
- Create incident report
- Document timeline
- Record actions taken
- Identify root cause

### 2. Follow-up Actions
- Fix root cause
- Update monitoring
- Improve procedures
- Share learnings

### 3. Prevention
- Update runbooks
- Add monitoring
- Improve testing
- Train team

## 🔗 Useful Commands

```bash
# Quick health check
node scripts/health-check.js

# Emergency stop
pm2 stop pff-engine

# Emergency start
pm2 start pff-engine

# View logs
pm2 logs pff-engine

# Monitor dashboard
node scripts/monitor-dashboard.js

# Check alerts
node scripts/check-alerts.js

# Clear alerts
node scripts/clear-alerts.js

# Reset metrics
node scripts/reset-metrics.js
```

## 📚 Additional Resources

- [Engine Documentation](./README.md)
- [API Documentation](./docs/api.md)
- [Configuration Guide](./docs/configuration.md)
- [Troubleshooting Guide](./docs/troubleshooting.md)
- [Security Guide](./docs/security.md)

---

**Last Updated**: 2025-09-17
**Version**: 1.0.0
**Maintainer**: [Your Name]
