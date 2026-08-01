# Phase 2.5 Index Reduction Plan

Date: August 1, 2026
Status: In progress
Scope: Reduce `app/index.html` further without changing product behavior or expanding features

## 1. Objective

Phase 2 improved the frontend structure, but `app/index.html` still contains a large inline script block and remains too large for comfortable maintenance.

Phase 2.5 is a focused continuation, not a rewrite.

The objective is to remove the next highest-value, lowest-risk logic block from `index.html` while preserving current behavior.

## 2. Current Situation

After Phase 2:

- many core frontend responsibilities were moved into `app/js/`;
- `index.html` was reduced, but it still contains a substantial amount of application logic;
- the remaining inline logic mixes:
  - master configuration sync;
  - base library publishing/loading;
  - collaboration/social helpers;
  - shared books sync;
  - backup/import helpers;
  - dashboard and calendar rendering.

Not all of these should be moved at once.

## 3. Phase 2.5 Strategy

Apply one controlled extraction pass with these rules:

- no new features;
- no framework;
- no data model redesign;
- no broad renaming;
- no multi-area rewrite in one diff;
- keep the extraction domain-based and easy to verify.

## 4. Selected Extraction Scope

This phase will extract one combined collaboration/configuration module from `index.html`:

- master configuration load/publish/apply helpers;
- base library load/publish helpers;
- social/collaboration connection helpers;
- shared books cloud sync helpers.

Reason for choosing this block:

- it is large enough to materially reduce `index.html`;
- it is more self-contained than dashboard rendering;
- it is lower risk than moving a large view-rendering section first;
- it groups Supabase-driven collaboration/configuration behavior in one place.

## 5. Planned Output

Expected code output:

- a new JS module under `app/js/` for this extracted block;
- updated script load order in `app/index.html`;
- the equivalent inline functions removed from `index.html`.

Expected documentation output:

- this Phase 2.5 plan;
- normal commit checkpoint after verification.

## 6. Verification Requirements

Minimum verification after the extraction:

- login still works;
- app does not stall during startup;
- social/collaboration modal opens;
- base library behavior still loads;
- shared books still render;
- admin master configuration flows still open.

## 7. Stop Condition

Phase 2.5 should stop after this extraction pass unless a very small follow-up fix is required.

The goal is reduction with control, not continuous refactoring before the backend/schema work.
