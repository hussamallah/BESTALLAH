# Batch 3 Migration Guide

## Overview

This guide covers migrating from Batch 2 to Batch 3 of the PFF Quiz Engine. Batch 3 introduces significant enhancements to tell taxonomy, determinism, finalization logic, and operational capabilities.

## Major Changes

### 1. Tell Taxonomy (Breaking Change)

**Before (Batch 2):**
```json
{
  "id": "TELL/Control/Sovereign/sets-call",
  "face_id": "FACE/Control/Sovereign",
  "contrast": true
}
```

**After (Batch 3):**
```json
{
  "id": "TELL/Control/Sovereign/sets-call",
  "face_id": "FACE/Control/Sovereign",
  "contrast": true,
  "explicit": true,
  "priority": 1
}
```

**Migration Steps:**
1. Update tell registry schema to v2
2. Add `explicit` field (boolean)
3. Add `priority` field (1-4)
4. Re-package and sign bank

### 2. Bank Package Structure (Breaking Change)

**Before (Batch 2):**
```json
{
  "meta": {
    "schema": "bank.meta.v1",
    "bank_id": "pff.v1.0"
  }
}
```

**After (Batch 3):**
```json
{
  "meta": {
    "schema": "bank.meta.v2",
    "bank_id": "pff.v2.0",
    "tell_taxonomy_version": "tell_registry.v2",
    "determinism_version": "batch3",
    "signature_algorithm": "ed25519",
    "content_hash_sha256": "..."
  }
}
```

**Migration Steps:**
1. Update meta schema to v2
2. Add Batch 3 meta fields
3. Add tell_groups registry
4. Re-package and sign bank

### 3. Constants Structure (Breaking Change)

**Before (Batch 2):**
```json
{
  "schema": "constants.v1",
  "DEFAULT": { ... }
}
```

**After (Batch 3):**
```json
{
  "schema": "constants.v2",
  "DEFAULT": { ... },
  "STRICT": { ... },
  "LENIENT": { ... }
}
```

**Migration Steps:**
1. Update constants schema to v2
2. Add STRICT and LENIENT profiles
3. Add BROKEN_CAP_LIT to DEFAULT profile

### 4. Engine API Changes (Non-Breaking)

**New Methods:**
- `getTellMeta(tellId)` - Get tell metadata
- `isSignatureTell(faceId, familyScreen)` - Check if tell is signature
- `isAdjacentTell(faceId, familyScreen)` - Check if tell is adjacent
- `getTellGroups(faceId)` - Get tell groups for face
- `hasSiblingCollision(tells)` - Check for sibling collisions

**Enhanced Methods:**
- `finalizeSession()` - Now includes QA flags and enhanced logic
- `_processTells()` - Now includes sibling collision detection
- `_creditTell()` - Now includes tell metadata

### 5. New Features (Additive)

**Tell Groups:**
- Optional grouping of related tells
- New registry: `tell_groups`
- Schema: `tell_groups.v1`

**Conflict Rules:**
- Sibling collision detection
- Co-presence validation
- Automatic penalty application

**Recovery Mechanisms:**
- Session state saving
- Crash recovery
- Continuation from pause

**Observability:**
- Structured logging
- Metrics collection
- Health reporting

## Migration Checklist

### Phase 1: Data Migration
- [ ] Update tell registry to v2 schema
- [ ] Add explicit and priority fields to all tells
- [ ] Create tell groups registry
- [ ] Update constants to v2 schema
- [ ] Add STRICT and LENIENT profiles

### Phase 2: Bank Packaging
- [ ] Update bank package meta to v2
- [ ] Add Batch 3 meta fields
- [ ] Include tell_groups in registries
- [ ] Re-package bank
- [ ] Re-sign bank with new content

### Phase 3: Engine Updates
- [ ] Update engine to handle new tell taxonomy
- [ ] Implement conflict rules
- [ ] Add recovery mechanisms
- [ ] Add observability features
- [ ] Update finalization logic

### Phase 4: Testing
- [ ] Run all existing tests
- [ ] Run new Batch 3 tests
- [ ] Validate bank package
- [ ] Test recovery mechanisms
- [ ] Verify deterministic behavior

### Phase 5: Deployment
- [ ] Deploy updated engine
- [ ] Deploy new bank package
- [ ] Monitor for issues
- [ ] Verify all functionality

## Migration Scripts

### 1. Tell Registry Migration
```bash
node scripts/migrate-tell-registry.js
```

### 2. Bank Package Migration
```bash
node scripts/migrate-bank-package.js
```

### 3. Validation
```bash
node scripts/validate-bank-package.js
```

## Rollback Plan

### If Issues Occur:
1. **Immediate**: Revert to previous engine version
2. **Data**: Use previous bank package
3. **Recovery**: Restore from backup
4. **Investigation**: Analyze logs and metrics

### Rollback Steps:
1. Stop current engine
2. Deploy previous engine version
3. Load previous bank package
4. Verify functionality
5. Investigate issues

## Testing Strategy

### Pre-Migration Testing:
- [ ] Run all existing tests
- [ ] Validate current bank package
- [ ] Test edge cases
- [ ] Performance testing

### Post-Migration Testing:
- [ ] Run all tests again
- [ ] Validate new bank package
- [ ] Test new features
- [ ] Regression testing

### Ongoing Testing:
- [ ] Continuous integration
- [ ] Automated testing
- [ ] Performance monitoring
- [ ] Error tracking

## Common Issues and Solutions

### Issue: Tell Registry Validation Fails
**Solution**: Ensure all tells have explicit and priority fields

### Issue: Bank Package Loading Fails
**Solution**: Verify all required meta fields are present

### Issue: Engine Initialization Fails
**Solution**: Check bank package signature and content hash

### Issue: Tell Processing Errors
**Solution**: Verify tell taxonomy implementation

### Issue: Finalization Errors
**Solution**: Check new finalization logic implementation

## Support and Resources

### Documentation:
- `docs/batch3-glossary.md` - Complete glossary
- `HANDOFF_PROMPT.md` - System specification
- `RUNBOOK_*.md` - Operational guides

### Scripts:
- `scripts/validate-*.js` - Validation tools
- `scripts/test-*.js` - Test suites
- `scripts/migrate-*.js` - Migration tools

### Monitoring:
- Engine logs and metrics
- Bank package validation
- Session recovery status
- Error tracking and reporting

## Conclusion

Batch 3 migration introduces significant enhancements while maintaining backward compatibility where possible. Follow this guide carefully and test thoroughly to ensure a smooth transition.

For questions or issues, refer to the documentation or contact the development team.
