# Engineering Quality Improvement Plan for Acervo

Date: 2026-07-31
Last updated: 2026-08-01
Status: In progress
Scope: Improve quality, maintainability, reproducibility, and security without adding new features

## Current Implementation Status

- Phase 0 baseline documents created.
- Phase 1 Docker-based local reproducibility completed.
- Phase 2 frontend modularization implemented and manually validated in the local Docker environment.
- Phase 2.5 additional `index.html` reduction completed in three controlled extraction passes.
- Phase 2 closure documents created:
  - `docs/PHASE_2_REGRESSION_CHECKLIST.md`
  - `docs/TEST_PLAN_PHASE_2.md`
- Phase 3 will continue with remaining frontend extraction work before backend/schema reconstruction.
- Phase 4 automated checks are defined but not yet implemented.

## 1. Objective

This plan is meant to move Acervo from a codebase that is functional but fragile toward one that is more maintainable, reproducible, and auditable, with a clear software engineering approach. The guiding principle is to preserve current behavior while reducing technical risk.

The goal is not to rewrite the product or change the stack for fashion reasons. The goal is to clarify responsibilities, properly version the system, and leave behind a reliable way to keep working.

## 2. Current Problems Observed

- The main frontend lives in one very large `app/index.html` file.
- Business logic, rendering, persistence, synchronization, and utilities are tightly coupled.
- The real Supabase schema is not fully versioned in SQL.
- Local execution depends on manual steps and is not consistently reproducible.
- There is no minimal layer of automated checks to protect refactors.
- Some CDN-loaded dependencies could be versioned more explicitly, and operational decisions are spread across multiple places.

## 3. Working Principles

- Do not add features during this effort.
- Do not change behavior unless there is a clear reliability, security, or maintainability reason.
- Make changes small, clear, and reversible.
- Prioritize extraction and organization before rewriting.
- Version everything needed to reconstruct the system.
- Add only tools that provide real value.

## 4. Expected Outcome

At the end of this plan, Acervo should have:

- a more modular and readable frontend structure;
- a consistent way to run locally with Docker;
- a more completely versioned backend and database schema;
- minimal checks to detect regressions;
- clearer technical and operational documentation;
- a safer foundation for future refactors.

## 5. Proposed Phases

## Phase 0. Baseline and Protection

Objective: make sure we understand the current state before moving pieces around.

Tasks:

- Identify the critical flows that must not break.
- Record the external dependencies used by the frontend.
- Review and consolidate the repository’s minimum configuration.
- Define a short list of initial manual validation checks.

Deliverables:

- manual validation checklist;
- inventory of dependencies and sensitive areas;
- phase-based plan confirmed for execution.

## Phase 1. Local Reproducibility with Docker

Status: Completed on 2026-08-01

Objective: make it possible to run the app locally in a simple and consistent way.

Tasks:

- Add a `Dockerfile` to serve `app/` as a static site.
- Add `docker-compose.yml` for local development.
- Add `.dockerignore`.
- Document the local Docker-based workflow in `README.md`.

Recommended decision:

- Start by using Docker only to serve the static frontend.
- Do not try to bring in a local Supabase stack in this first phase.

Reason:

This gives immediate value with low risk and keeps Docker from becoming unnecessary complexity.

Deliverables:

- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- documented instructions

## Phase 2. Safe Frontend Modularization

Status: Implemented on 2026-08-01, pending final closure checkpoint

Objective: reduce the risk of the single-file frontend without changing features.

Tasks:

- Extract JavaScript out of `app/index.html` into domain-based files.
- Keep the main HTML file as the application shell.
- Extract lower-risk modules first.

Suggested extraction order:

- `config`
- `utils`
- `state`
- `storage`
- `auth`
- `render`
- `shared`
- `admin`
- `drafting`
- `study`

Rules for this phase:

- Do not introduce a framework.
- Do not rename data structures unless there is a real need.
- Do not mix structural refactors with business logic changes.
- Keep every step verifiable.

Deliverables:

- an organized frontend scripts folder;
- a smaller and easier-to-read `index.html`;
- behavior equivalent to the current app.

Closure requirements:

- run the full Phase 2 regression checklist;
- keep one stable checkpoint commit before starting Phase 3;
- record any intentionally skipped test or environment limitation.

## Phase 3. Remaining Frontend Reduction and Delayed Backend Versioning

Status: Next

Objective: continue reducing the remaining high-risk monolith areas in `app/index.html`, then finish backend reconstruction work after the frontend extraction boundary is clearer.

Tasks:

- Extract the remaining frontend logic still embedded in `app/index.html`, prioritizing by risk and cohesion.
- Delay production-schema-dependent work until the remaining frontend reduction reaches a reasonable stopping point.
- Keep the existing repo-only backend gap analysis as the reference for later database work.
- Only after the frontend extraction pass stabilizes:
  - identify tables, functions, policies, and columns that are currently missing from versioned SQL;
  - create migrations or consolidated scripts to cover:
    - `acervo_state`
    - `profiles`
    - `acervo_master`
    - `shared_causas`
    - `shared_books`
    - related RLS functions and policies;
  - review consistency across existing scripts;
  - document the correct application order.

Main risk:

- if frontend extraction continues without control, regressions become more likely;
- if backend reconstruction keeps being deferred indefinitely, any new environment will remain only a partial reconstruction.

Deliverables:

- a smaller and more maintainable `index.html`;
- additional extracted frontend modules;
- a more complete schema in versioned files;
- more precise installation documentation;
- less dependence on manual dashboard state.

Recommended starting point:

1. continue extracting the remaining non-trivial `index.html` blocks in controlled passes;
2. stop before broad rendering rewrites or behavior changes;
3. once the frontend reduction reaches a clean boundary, resume the backend/schema work already mapped in the Phase 3 gap analysis;
4. only then prepare the exact bootstrap sequence for a new environment.

## Phase 4. Minimal Checks for Safe Refactoring

Status: Planned

Objective: create a small but useful safety net.

Tasks:

- Add one test or self-check for basic app loading.
- Cover basic state serialization and persistence.
- Cover at least one important function from the drafting engine.
- Cover at least one critical rule related to permissions or validation.

Approach:

- Start small.
- Test pure logic before complex UI.
- Avoid introducing a heavy testing infrastructure unless it is truly needed.

Deliverables:

- a minimum set of repeatable checks;
- a base for increasing coverage where it actually brings value.

## Phase 5. Operational and Technical Hardening

Status: Planned

Objective: reduce maintenance and production risk.

Tasks:

- Pin external versions where they are currently too open-ended.
- Review CORS and validations in Edge Functions.
- Review the Service Worker cache strategy.
- Centralize non-secret sensitive configuration.
- Improve consistency in technical documentation.
- Evaluate linting and formatting with the minimum useful tooling.

Deliverables:

- less implicit behavior;
- lower risk from uncontrolled changes;
- better operational visibility.

## 6. Recommended Priorities

Recommended execution order:

1. Docker and local reproducibility.
2. Validation checklist and baseline.
3. Safe frontend modularization.
4. Additional controlled `index.html` reduction.
5. Complete database versioning.
6. Minimal automated checks.
7. Technical hardening.

Note:

Even though complete database versioning is critical, it still makes sense to begin with Docker and the baseline because that lowers friction and makes the rest of the work easier from day one.

## 7. What Not to Do Yet

- Do not migrate to React, Vue, or another framework at this stage.
- Do not redesign the UI.
- Do not add new features.
- Do not introduce too many build dependencies.
- Do not rewrite the drafting engine before putting minimal protection around it.
- Do not mix structural changes with product changes.

## 8. Success Criteria

We should consider this initiative successful if:

- a new developer can run the project locally with clear steps;
- the frontend no longer depends on one massive file for its main logic;
- the backend schema can be reconstructed from the repository with higher fidelity;
- the riskiest refactors have at least a minimal validation safety net;
- the codebase is ready for future changes with lower risk.

## 9. Immediate Implementation Proposal

The original first block has already been executed:

1. Add basic Docker support to serve the app.
2. Document the local Docker workflow.
3. Define a manual validation checklist.
4. Prepare the extraction of JavaScript from `index.html` in small cuts.

Immediate next block:

1. Close Phase 2 / Phase 2.5 with stable checkpoint commits.
2. Continue the remaining controlled frontend extraction work from `index.html`.
3. Resume backend/schema reconstruction only after that frontend reduction reaches a sensible stop point.
4. Add the first minimal automated checks for extracted pure logic.
5. Only after that, continue with hardening tasks.
