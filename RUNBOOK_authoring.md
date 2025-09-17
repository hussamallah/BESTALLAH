# PFF Quiz Engine - Authoring Runbook

## 🎯 Overview

This runbook explains how to author, validate, and deploy question bank content for the PFF Quiz Engine. The authoring process ensures content quality, consistency, and compliance with engine requirements.

## 📋 Authoring Workflow

### 1. Content Creation
- Author questions in JSON format
- Follow question structure guidelines
- Include proper metadata
- Validate content locally

### 2. Content Review
- Peer review process
- Content validation
- Bias checking
- Technical validation

### 3. Content Deployment
- Package content
- Sign with cryptographic keys
- Deploy to production
- Verify deployment

## 📝 Question Structure

### Basic Question Format
```json
{
  "qid": "unique-question-id",
  "familyScreen": "Control|Pace|Boundary|Truth|Recognition|Bonding|Stress",
  "order_in_family": 1,
  "phase": "picked|not_picked",
  "options": [
    {
      "key": "A",
      "lineCOF": "C|O|F",
      "tells": [
        {
          "face_id": "FACE/Control/Sovereign",
          "tell_id": "TELL/Control/Sovereign/sets-call"
        }
      ]
    }
  ]
}
```

### Required Fields
- `qid`: Unique identifier
- `familyScreen`: One of 7 families
- `order_in_family`: 1, 2, or 3
- `phase`: Derived at runtime
- `options`: Array of 2 options
- `lineCOF`: C, O, or F for each option
- `tells`: Array of face tells (0-3 per option)

### Content Guidelines

#### 1. Question Content
- Clear, unambiguous language
- Culturally appropriate
- Free from bias
- Appropriate for target audience
- Consistent tone and style

#### 2. Option Design
- Exactly 2 options per question
- Balanced difficulty
- Clear distinctions
- No leading questions
- Avoid "none of the above"

#### 3. Tell Assignment
- 0-3 tells per option
- Max 1 tell per face per option
- Appropriate face mapping
- Consistent tell usage
- Avoid tell conflicts

## 🛠️ Authoring Tools

### 1. Content Editor
```bash
# Open content editor
node scripts/edit-content.js

# Edit specific family
node scripts/edit-content.js --family=Control

# Edit specific question
node scripts/edit-content.js --qid=Q001
```

### 2. Content Validator
```bash
# Validate all content
node scripts/validate-content.js

# Validate specific family
node scripts/validate-content.js --family=Control

# Validate with detailed output
node scripts/validate-content.js --verbose

# Validate and fix issues
node scripts/validate-content.js --fix
```

### 3. Content Generator
```bash
# Generate question template
node scripts/generate-question.js --family=Control --order=1

# Generate family template
node scripts/generate-family.js --family=Control

# Generate tell mapping
node scripts/generate-tell-mapping.js
```

## 🔍 Content Validation

### 1. Structure Validation
```bash
# Check JSON structure
node scripts/validate-structure.js

# Check required fields
node scripts/validate-required-fields.js

# Check data types
node scripts/validate-data-types.js
```

### 2. Content Validation
```bash
# Check question content
node scripts/validate-questions.js

# Check option balance
node scripts/validate-options.js

# Check tell assignments
node scripts/validate-tells.js
```

### 3. Consistency Validation
```bash
# Check family consistency
node scripts/validate-family-consistency.js

# Check tell consistency
node scripts/validate-tell-consistency.js

# Check overall consistency
node scripts/validate-overall-consistency.js
```

## 🎨 Content Guidelines

### 1. Question Writing

#### Good Questions
- Clear and specific
- Single concept per question
- Appropriate difficulty level
- Culturally neutral
- Free from jargon

#### Bad Questions
- Ambiguous or vague
- Multiple concepts
- Too easy or too hard
- Culturally specific
- Technical jargon

### 2. Option Design

#### Good Options
- Mutually exclusive
- Balanced length
- Clear distinctions
- Appropriate difficulty
- No obvious answers

#### Bad Options
- Overlapping content
- Uneven length
- Unclear distinctions
- Too easy/hard
- Obvious answers

### 3. Tell Assignment

#### Good Tell Usage
- Appropriate face mapping
- Consistent usage
- Balanced distribution
- Clear behavioral indicators
- Avoid conflicts

#### Bad Tell Usage
- Inappropriate mapping
- Inconsistent usage
- Unbalanced distribution
- Unclear indicators
- Conflicting tells

## 🔧 Content Management

### 1. Version Control
```bash
# Check content status
git status

# Add new content
git add bank/questions/

# Commit changes
git commit -m "Add new Control questions"

# Push changes
git push origin main
```

### 2. Content Backup
```bash
# Backup current content
node scripts/backup-content.js

# Restore content
node scripts/restore-content.js --backup=backup-2025-09-17

# Verify backup
node scripts/verify-backup.js --backup=backup-2025-09-17
```

### 3. Content Migration
```bash
# Migrate content format
node scripts/migrate-content.js --from=v1 --to=v2

# Update content structure
node scripts/update-content-structure.js

# Validate migration
node scripts/validate-migration.js
```

## 🚀 Content Deployment

### 1. Pre-deployment Checks
```bash
# Run all validations
node scripts/run-all-validations.js

# Check content quality
node scripts/check-content-quality.js

# Verify tell coverage
node scripts/verify-tell-coverage.js
```

### 2. Content Packaging
```bash
# Package content
node scripts/pack-bank.js

# Sign content
node scripts/sign-bank.js sign

# Verify signature
node scripts/sign-bank.js verify
```

### 3. Content Deployment
```bash
# Deploy to staging
node scripts/deploy-content.js --env=staging

# Deploy to production
node scripts/deploy-content.js --env=production

# Verify deployment
node scripts/verify-deployment.js
```

## 🔍 Quality Assurance

### 1. Content Review Process
1. **Author Review**: Self-review content
2. **Peer Review**: Colleague review
3. **Technical Review**: Engine compatibility
4. **Bias Review**: Cultural sensitivity
5. **Final Review**: Manager approval

### 2. Review Tools
```bash
# Generate review report
node scripts/generate-review-report.js

# Check for bias
node scripts/check-bias.js

# Analyze content quality
node scripts/analyze-content-quality.js
```

### 3. Review Checklist
- [ ] Content is clear and unambiguous
- [ ] Options are balanced and distinct
- [ ] Tells are appropriately assigned
- [ ] No cultural bias
- [ ] Consistent with style guide
- [ ] Technically valid
- [ ] Peer reviewed
- [ ] Manager approved

## 📊 Content Analytics

### 1. Content Metrics
```bash
# Generate content metrics
node scripts/generate-content-metrics.js

# Analyze question distribution
node scripts/analyze-question-distribution.js

# Check tell coverage
node scripts/check-tell-coverage.js
```

### 2. Performance Analysis
```bash
# Analyze question performance
node scripts/analyze-question-performance.js

# Check answer patterns
node scripts/check-answer-patterns.js

# Identify problematic questions
node scripts/identify-problematic-questions.js
```

### 3. Content Optimization
```bash
# Optimize content
node scripts/optimize-content.js

# Balance question difficulty
node scripts/balance-difficulty.js

# Improve tell distribution
node scripts/improve-tell-distribution.js
```

## 🐛 Troubleshooting

### Common Issues

#### 1. Validation Errors
**Error**: `Validation failed`
**Solution**:
```bash
# Check specific error
node scripts/validate-content.js --verbose

# Fix common issues
node scripts/fix-common-issues.js

# Re-validate
node scripts/validate-content.js
```

#### 2. Tell Conflicts
**Error**: `Tell conflict detected`
**Solution**:
```bash
# Check tell conflicts
node scripts/check-tell-conflicts.js

# Resolve conflicts
node scripts/resolve-tell-conflicts.js

# Validate resolution
node scripts/validate-tell-resolution.js
```

#### 3. Content Inconsistency
**Error**: `Content inconsistency`
**Solution**:
```bash
# Check consistency
node scripts/check-consistency.js

# Fix inconsistencies
node scripts/fix-inconsistencies.js

# Validate fixes
node scripts/validate-fixes.js
```

## 📚 Content Resources

### 1. Style Guide
- [Question Writing Guide](./docs/question-writing.md)
- [Option Design Guide](./docs/option-design.md)
- [Tell Assignment Guide](./docs/tell-assignment.md)
- [Bias Prevention Guide](./docs/bias-prevention.md)

### 2. Templates
- [Question Template](./templates/question-template.json)
- [Family Template](./templates/family-template.json)
- [Tell Template](./templates/tell-template.json)

### 3. Examples
- [Good Questions](./examples/good-questions.json)
- [Bad Questions](./examples/bad-questions.json)
- [Tell Examples](./examples/tell-examples.json)

## 🔗 Related Commands

```bash
# List all content
node scripts/list-content.js

# Search content
node scripts/search-content.js --query="Control"

# Export content
node scripts/export-content.js --format=csv

# Import content
node scripts/import-content.js --file=content.csv

# Compare content versions
node scripts/compare-content.js --v1=old --v2=new

# Generate content report
node scripts/generate-content-report.js
```

## 📝 Best Practices

### 1. Content Creation
- Follow style guide
- Use templates
- Validate early and often
- Get peer review
- Document changes

### 2. Content Management
- Use version control
- Regular backups
- Clear naming conventions
- Document decisions
- Track changes

### 3. Content Deployment
- Test thoroughly
- Deploy gradually
- Monitor performance
- Have rollback plan
- Document issues

---

**Last Updated**: 2025-09-17
**Version**: 1.0.0
**Maintainer**: [Your Name]
