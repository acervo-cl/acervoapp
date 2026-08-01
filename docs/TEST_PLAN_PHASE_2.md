# Test Plan for Phase 2 Closure

Date: August 1, 2026
Status: Immediate manual test plan plus short-term automated test targets
Purpose: Define how to close Phase 2 with enough confidence before Phase 3 cleanup

## 1. Testing Goal

Phase 2 focused on structural frontend modularization.

The primary test objective is not feature expansion. It is regression detection across the flows most exposed to module extraction and script-order changes.

## 2. Testing Layers

### Layer A — Manual smoke tests

Use this immediately after meaningful refactors.

This is the current minimum safety net because the app is browser-heavy and strongly dependent on global state, DOM wiring, and runtime data.

Reference:

- [PHASE_2_REGRESSION_CHECKLIST.md](/Users/ignacio/repos/acervo/acervoapp-dev/docs/PHASE_2_REGRESSION_CHECKLIST.md)
- [MANUAL_VALIDATION_CHECKLIST.md](/Users/ignacio/repos/acervo/acervoapp-dev/docs/MANUAL_VALIDATION_CHECKLIST.md)

### Layer B — Structured manual scenario tests

Use this before merging the refactor branch or calling Phase 2 closed.

Recommended scenarios:

1. Admin login and navigation
2. Admin users and permissions
3. Models/template configuration
4. Draft start → step flow → generate editable
5. Draft start → generate PDF
6. Existing document open → edit → save → reopen

### Layer C — Future automated smoke tests

Not implemented yet, but this is the next quality target after Phase 2.

## 3. Manual Test Scenarios

### Scenario 1 — Session integrity

Expected result:

- login works;
- refresh keeps session;
- logout works;
- relogin works.

### Scenario 2 — Admin module stability

Expected result:

- admin screen renders;
- user list loads;
- create/edit user modals open;
- permissions toggles render.

### Scenario 3 — Template admin stability

Expected result:

- modelos screen renders;
- comparecencia editor opens and saves;
- individualization editor opens and saves;
- structure editor opens, updates preview, and saves.

### Scenario 4 — Drafting flow stability

Expected result:

- chooser renders;
- history renders;
- draft resumes/discards correctly;
- cause selection works;
- wizard advances without dead ends.

### Scenario 5 — Draft generation stability

Expected result:

- Generar step opens;
- editor toolbar works;
- editable output saves;
- PDF output generates.

## 4. Automated Test Targets

These are the next tests that should exist after Phase 2.

### A. Browser smoke tests

Recommended tool:

- Playwright

Initial smoke coverage:

- login page loads;
- authenticated app shell loads;
- admin page opens;
- modelos page opens;
- redactar modal opens.

### B. DOM-level tests

Recommended tool:

- Vitest with jsdom, if a JS test runner is introduced

Candidate functions:

- pure or near-pure formatting helpers;
- drafting text helpers;
- tribunal parsing;
- state payload builders.

### C. Contract tests for extracted modules

After globals are reduced, target:

- `auth.js`
- `navigation.js`
- `template-admin.js`
- `redactar-entry.js`
- `redactar-steps.js`

## 5. Minimum Automated Test Backlog

Suggested backlog items:

1. Add a lightweight JS test runner
2. Add one Playwright smoke suite
3. Add tests for tribunal parsing
4. Add tests for state payload and persistence helpers
5. Add a smoke check for Redactar modal open/close

## 6. Recommendation

Before declaring Phase 2 closed:

- run the Phase 2 regression checklist once end-to-end;
- commit the working checkpoint;
- record any skipped test due to missing safe data or environment limits.

After that, Phase 3 can focus on cleanup rather than survival testing.
