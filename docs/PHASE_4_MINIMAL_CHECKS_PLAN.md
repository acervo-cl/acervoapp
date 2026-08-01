# Phase 4 Minimal Checks Plan

Date: 2026-08-01
Status: In progress
Branch: `phase-4-minimal-checks`

## Objective

Add a small automated safety net for future refactors without introducing heavy infrastructure.

## Principles

- start with pure logic, not UI automation;
- keep setup minimal;
- prefer deterministic checks with no network and no database access;
- cover code that protects future refactors most directly.

## Proposed Tooling

Recommended first tool:

- Node.js test runner using `node:test`

Reason:

- no external framework is required;
- lowest setup cost;
- enough for pure helper tests;
- easy to run in CI later.

Recommended execution path:

- run the tests through Docker using a dedicated Node service;
- do not require a host Node installation.

## First Test Targets

### 1. Study logic

File:

- `app/js/study/flashcards-study.js`

Candidate checks:

- `isDue`
- `dueCount`

Why:

- pure logic;
- small surface;
- easy to validate with fixed dates.

### 2. Formatting helpers

Files:

- `app/js/admin/redaccion-admin.js`
- `app/js/cases/expedientes.js`

Candidate checks:

- `numeroAPalabras`
- `palabrasANumero`
- `fmtRut`
- `_normMatch`

Why:

- high reuse;
- low DOM coupling;
- good regression value.

### 3. State helpers

File:

- `app/js/core/state.js`

Candidate checks:

- serialization-safe shape rules;
- guard behavior around state defaults, if extracted into testable helpers.

Why:

- state breakage affects the whole app.

## Recommended Implementation Strategy

### Step 1

Create a tiny `tests/` folder and one Node-based test entry.

### Step 2

Extract or mirror only the smallest pure helpers needed for tests into reusable helper files if direct testing is too coupled.

### Step 3

Add an npm script like:

- `npm test`

### Step 4

Add 4 to 8 focused tests only.

## Explicitly Deferred

Not part of this first Phase 4 step:

- Playwright;
- browser E2E;
- jsdom UI tests;
- Supabase-connected tests;
- any production data usage.

## Exit Criteria

Phase 4 initial step is complete when:

- the repo can run a local test command;
- at least 3 small pure-logic areas are covered;
- the checks run without browser setup;
- future refactors can use them as a fast checkpoint.
