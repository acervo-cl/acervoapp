# Phase 3.5 JS Folder Organization Plan

Date: 2026-08-01
Status: In progress

## Objective

Organize `app/js` into clearer domain folders without changing runtime behavior.

## Scope

This phase does not add features and does not change execution order.

It only:

- groups scripts by domain;
- updates `index.html` script paths;
- keeps the current global-script loading model.

## Folder Strategy

Proposed structure:

- `app/js/core`
  - bootstrap, state, storage, utils, auth, modals, navigation, realtime
- `app/js/library`
  - library views, dashboard, rail, calendar, stats, mindmap, documentos/reader, subject/delete, file import
- `app/js/cases`
  - expedientes, collaboration, backup flows
- `app/js/drafting`
  - drafting entry, steps, generation, editor core
- `app/js/admin`
  - admin permissions, admin users, admin library viewer, template admin, structure editor, redaccion admin
- `app/js/study`
  - flashcards and study flows

## Rules

- preserve current script load order;
- do not rename globals;
- do not rewrite module internals;
- do not mix this with feature work.

## Validation

After moving files, validate:

- app loads without missing script errors;
- login still works;
- library renders;
- reader opens;
- causas open;
- redactar opens;
- flashcards render.

## Expected Outcome

- `app/js` becomes easier to scan;
- future refactors have a clearer place to land;
- Phase 4 and later work can target folders by domain instead of one flat script directory.
