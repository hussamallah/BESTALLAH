# SYSTEM BRIEF: PFF Quiz Engine (7 Lines + 14 Faces)

> **AUTHORITATIVE SPECIFICATION**: See [18-system-behavior-spec.mdc](mdc:18-system-behavior-spec.mdc) for the complete system behavior specification.

## What we're building
A deterministic quiz engine with two independent layers:
1) **Lines (7 families):** Control, Pace, Boundary, Truth, Recognition, Bonding, Stress. Each family gets a final verdict **C/O/F**.
2) **Faces (14 archetypes):** 2 per family. Presence is inferred from **behavioral tells** attached to answer options; faces never affect line math.

## Canonical data contracts (must not drift)
- **Project bank is read-only at runtime.** Engine only consumes a signed `bank_package.json`.
- **Question bank:** 7 files, each with exactly 3 questions (Q1=C probe, Q2=O probe, Q3=F probe). Every question has exactly two options (A, B). Each option has `lineCOF ∈ {C,O,F}` and `tells[]` of length 0–3, with **≤1 tell per face per option**.
- **Registries:** Families (7), Faces (14), Tells (each tell → exactly one face), Contrast matrix (per-family sibling disambiguation).
- **Constants profile:** thresholds for LIT/LEAN/GHOST and `PER_SCREEN_CAP=0.40`. Never hardcode; read from the package.

## Runtime rules (engine)
- **Scheduling:** 7 family screens total. Picked families get 2 questions; not-picked get 3 (C→O→F). Always exactly **18** questions; apply deterministic edge policies for picks=7 or picks=1.
- **Per-click updates:**
  - Line: set family flags from `lineCOF`. Finalize rule: any F → F; else any O → O; else C (seeds count).
  - Faces: credit each face named in the option’s tells once; context = Clean (C), Bent (O), Broken (F). Mark Signature if on home family; otherwise Adjacent.
- **Face states at finalize:** LIT, LEAN, GHOST, COLD, ABSENT using gates: coverage (questions, families), signature count, context (Clean/Bent/Broken), per-screen concentration ≤ 0.40, and **contrast tell required** for LIT.
- **Outputs:** `{ line_verdicts, face_states, family_reps, anchor_family? }`. No prose, no hidden weights.

## Coding standards (Cursor, obey these)
- Keep the engine **string-blind**: no UI copy, colors, or layouts in core.
- Treat the bank as **untrusted** input: validate schemas, enforce caps, and reject on violations.
- Make all APIs pure and deterministic:
  - `init_session`, `set_picks`, `get_next_question`, `submit_answer`, `finalize_session`.
  - Idempotency: last answer per `qid` wins; single-winner finalize.
- No background network calls in core logic. No randomness except seeded PRNG: `seed = hash(session_seed || bank_hash || constants_profile)`.

## Guardrails (hard “do not” list)
- Do not alter constants at runtime; changing constants requires a new bank/hash.
- Do not mutate registries or question bank shapes in code.
- Do not infer face presence from text or heuristics; only count tells.
- Do not let a single family contribute >40% of a face’s evidence toward LIT.

## Acceptance checks (Cursor, run mentally before proposing edits)
- All public types and JSON I/O match the documented shapes.
- Finalization produces identical results for a given replay file (deterministic replay).
- Unit tests cover: line verdict fold, face ledger updates, state gates (LIT/LEAN/GHOST), per-screen cap, contrast requirement, picks=7 and picks=1 edge policies.

## File boundaries (where to put what)
- `/engine/**`: state machine, schedule, ledger, finalize, APIs.
- `/bank/**`: registries, constants, questions, packer/linter (no engine logic).
- `/tests/**`: replay harness, golden vectors, fuzzers. Keep fixtures small and explicit.

## Technology Stack
- **Backend**: TypeScript (explicit contracts)
- **Server**: Next.js serverless API routes (Vercel) or Node + Fastify (microservice)
- **Store**: Redis (session state TTL) + Postgres JSONB (finalized sessions & bank)
- **Bank Storage**: JSON in Git + S3 (or Postgres)
- **Testing**: Jest + supertest (API) + property tests (deterministic rules)
- **Validation**: ESLint + TypeScript + JSON Schema (ajv)
- **CI**: GitHub Actions (bank validation, unit tests, contract tests)

## When unclear
Prefer completing the task with conservative assumptions that preserve determinism and contracts. If a contract conflict appears, emit a diff of the exact JSON shapes you need clarified.
