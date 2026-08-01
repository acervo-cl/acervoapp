# Phase 5 Frontend Architecture Plan

Date: 2026-08-01
Status: In progress
Branch: `phase-5-frontend-architecture`

## Objective

Continue improving the frontend structure without adding features and without starting backend or database reconstruction work yet.

Phase 5 exists to reduce the remaining structural risk in the frontend before the repo moves to the final backend/schema phase.

## Scope

In scope:

- remaining large frontend blocks still embedded in `app/index.html`;
- extraction of cohesive UI and behavior slices into existing domain folders under `app/js`;
- small structural helpers when they reduce coupling and keep behavior stable;
- updates to documentation when the structure changes materially.

Out of scope:

- Supabase schema reconstruction;
- SQL migrations;
- production database queries;
- new product features;
- framework migration;
- broad redesign work.

## Current Context

By the start of Phase 5:

- Phases 1 through 4 are complete;
- `app/js` is already organized by domain;
- Docker-based local execution exists;
- Docker-based automated checks exist;
- the biggest remaining technical risk on the frontend is concentrated in the residual mixed logic still inside `app/index.html` and in a few oversized frontend modules.

## Working Rules

- keep the current behavior;
- prefer larger but still cohesive extraction slices, not tiny micro-moves;
- do not mix frontend extraction with backend work;
- do not introduce new dependencies unless the value is immediate and obvious;
- run the existing Docker test gate after meaningful structural changes.

## Proposed Work Sequence

### Step 1. Map the remaining embedded frontend blocks

Create or refresh a practical map of the major remaining sections still inside `app/index.html`.

Selection criteria:

- size;
- mixed responsibilities;
- repeated DOM wiring;
- risk of future edits staying inside the monolith.

### Step 2. Extract the largest safe slice first

Preferred targets are blocks that:

- are mostly frontend-only;
- have clear domain ownership;
- already depend on extracted helpers or domain files;
- do not require backend or schema decisions.

### Step 3. Reduce coupling around extracted slices

Where necessary, add small boundaries such as:

- state readers/writers;
- render helpers;
- narrow DOM helper functions.

This is only to stabilize the extraction, not to redesign the app.

### Step 4. Re-run the Docker quality gate

After each meaningful extraction pass:

- `docker compose run --rm test npm test`
- `docker compose run --rm test npm run test:security`
- `docker compose run --rm test npm run test:all`

### Step 5. Record the remaining residual monolith areas

At the end of Phase 5, document what still remains embedded and whether it should be:

- left as-is intentionally;
- handled in a final frontend cleanup pass;
- deferred because it is tightly tied to the backend phase.

## Candidate Extraction Targets

Initial likely candidates:

- remaining dashboard / landing rendering still in `index.html`;
- remaining admin configuration modals still embedded there;
- remaining document/model import flows still embedded there;
- any residual shared UI helpers that are still mixed into the HTML shell.

Final target selection should be based on the current code map before editing.

## Deliverables

- `app/index.html` reduced further;
- additional domain extraction into `app/js`;
- Phase 5 documentation kept current;
- Dockerized tests still passing after each meaningful pass.

## Exit Criteria

Phase 5 is complete when:

- the major remaining frontend monolith sections have been reduced again;
- no backend/schema work was pulled into the phase;
- the Docker test gate still passes;
- the remaining residual frontend debt is clearly documented before Phase 6.
