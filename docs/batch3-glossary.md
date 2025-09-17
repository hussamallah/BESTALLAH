# Batch 3 Glossary and Documentation

## Core Concepts

### Tell Taxonomy
- **Signature Tells**: Primary behavioral indicators for a face in its home family
- **Adjacent Tells**: Secondary behavioral indicators used across different families
- **Contrast Tells**: Behavioral indicators that distinguish between sibling faces
- **Tell Priority**: Ranking system (1-4) for tell importance and selection

### Tell Groups
- **Tell Group**: Optional grouping of related tells for offline QA
- **Group ID**: Unique identifier for a tell group (e.g., "SOv_clear_call")
- **Group Schema**: Versioned schema for tell group structure

### Determinism Hardening
- **Bank Hash**: SHA256 hash of the entire bank package content
- **Content Hash**: SHA256 hash of normalized bank content
- **Bank ID**: Unique identifier for bank version (e.g., "pff.v2.0")
- **Determinism Version**: Version identifier for determinism features ("batch3")

### Finalization Logic
- **Face Metrics**: Computed values (Q, FAM, SIG, CLEAN, BENT, BROKEN, etc.)
- **State Gates**: Priority-ordered rules for face state determination
- **QA Flags**: Sanity cross-checks that don't affect engine outputs
- **Family Representatives**: Primary face selection per family

### Edge Cases
- **Picks=7**: All families picked, 14 questions total
- **Picks=1**: Single family picked, 20 questions total
- **Missing Probes**: Handling of missing C/O/F probes
- **Zero Tells**: Options with no behavioral tells

### Conflict Rules
- **Sibling Collision**: Multiple tells from same family in single option
- **Co-presence**: Both siblings having high states (LIT/LEAN)
- **Collision Penalty**: Automatic downgrade for sibling conflicts
- **Contrast Detection**: Identification of opposing behavioral patterns

### Operational Knobs
- **Constants Profile**: Runtime configuration (DEFAULT, STRICT, LENIENT)
- **Per-Screen Cap**: Maximum 40% concentration per family screen
- **LIT Thresholds**: Minimum requirements for LIT state
- **LEAN Thresholds**: Minimum requirements for LEAN state

### Observability
- **Structured Logging**: JSON-formatted log entries with levels
- **Metrics Collection**: Session, question, error, and performance metrics
- **Health Reporting**: System health status and error rates
- **Log Export**: Export logs to file for analysis

### Recovery Mechanisms
- **Session State**: Complete session state for recovery
- **Checkpoint**: Manual session state save point
- **Crash Recovery**: Automatic recovery from system crashes
- **Continuation**: Resume paused sessions

### Bank Packaging
- **Bank Package**: Complete bank bundle with all components
- **Signature Verification**: Ed25519 signature validation
- **Content Integrity**: Hash-based content validation
- **Schema Validation**: Structure and field validation

## Technical Terms

### Data Structures
- **Session State**: Complete engine state for a quiz session
- **Face Ledger**: Per-face tracking of behavioral evidence
- **Line State**: Per-family COF tracking
- **Answer Event**: Structured answer submission data

### API Contracts
- **init_session**: Initialize new quiz session
- **set_picks**: Set family picks from Screen 1
- **get_next_question**: Get next question in sequence
- **submit_answer**: Submit answer and update state
- **finalize_session**: Complete session and compute results

### Validation
- **Schema Validation**: JSON schema compliance checking
- **Bank Validation**: Complete bank structure validation
- **Runtime Guards**: Input validation during execution
- **Integrity Checks**: Content and signature verification

### Testing
- **Golden Tests**: Deterministic replay tests
- **Stress Tests**: High-load and edge case testing
- **Fuzzing**: Random input testing
- **Compliance Tests**: Audit and regulatory testing

## Batch 3 Specific Terms

### Tell Processing
- **Priority Sorting**: Contrast > Explicit > Priority > Lexical
- **Per-Face Caps**: Maximum 1 tell per face per option
- **Total Caps**: Maximum 3 tells per option
- **Sibling Detection**: Automatic sibling collision detection

### State Computation
- **Stepwise Finalization**: Deterministic, ordered state computation
- **Gate Application**: Priority-ordered state rule application
- **QA Flagging**: Non-blocking sanity checks
- **Representative Selection**: Family face selection logic

### Edge Policies
- **Question Scheduling**: Deterministic question ordering
- **Probe Management**: C/O/F probe handling
- **Family Distribution**: Question allocation across families
- **Screen Balancing**: Per-screen concentration limits

### Operational Features
- **Profile Switching**: Runtime constants profile changes
- **Bank Binding**: Session-to-bank hash binding
- **Event Ordering**: Deterministic answer processing
- **Recovery Points**: Automatic state saving

## Compliance Terms

### Audit Trail
- **Final Snapshot**: Complete session state at completion
- **Raw Answers**: Unprocessed answer events
- **QA Flags**: Quality assurance indicators
- **Bank Binding**: Session-to-bank version binding

### Regulatory
- **Deterministic Behavior**: Identical outputs for identical inputs
- **Content Integrity**: Tamper-proof bank packages
- **Session Isolation**: Independent session processing
- **Error Handling**: Graceful failure modes

### Quality Assurance
- **Sanity Checks**: Cross-validation of results
- **Flag Generation**: Non-blocking quality indicators
- **Coverage Analysis**: Tell distribution validation
- **Contrast Verification**: Sibling differentiation checks

## File Organization

### Bank Structure
- `bank/registries/` - Core registries (families, faces, tells, etc.)
- `bank/questions/` - Question data per family
- `bank/constants/` - Operational constants and profiles
- `bank/templates/` - Authoring templates
- `bank/packaged/` - Packaged and signed bank files

### Engine Structure
- `engine/index.js` - Main engine API
- `engine/bankLoader.js` - Bank loading and indexing
- `engine/conflictRules.js` - Conflict and co-presence rules
- `engine/observability.js` - Logging and metrics
- `engine/recovery.js` - Recovery and continuation

### Scripts Structure
- `scripts/test-*.js` - Test suites
- `scripts/validate-*.js` - Validation scripts
- `scripts/pack-bank.js` - Bank packaging
- `scripts/sign-bank.js` - Bank signing

### Documentation
- `docs/batch3-glossary.md` - This glossary
- `HANDOFF_PROMPT.md` - Complete system specification
- `RUNBOOK_*.md` - Operational runbooks

## Version Information

- **Batch 3 Version**: 3.0.0
- **Tell Taxonomy**: v2
- **Determinism**: batch3
- **Bank Schema**: v2
- **Constants Schema**: v2
- **Signature Algorithm**: ed25519

## Migration Notes

### From Batch 2 to Batch 3
- Tell registry schema updated to v2
- Bank package schema updated to v2
- New tell taxonomy and priority rules
- Enhanced finalization logic
- New operational knobs and profiles
- Recovery and observability features

### Breaking Changes
- Tell registry structure changed
- Bank package structure updated
- New required fields in meta section
- Enhanced validation requirements

### Backward Compatibility
- Engine can load v1 bank packages
- Graceful degradation for missing fields
- Automatic migration of tell data
- Fallback to default values
