# Phase 2 Regression Checklist

Date: August 1, 2026
Status: Required before closing frontend modularization work
Purpose: Verify that the Phase 2 modularization did not break critical user flows

## Scope

This checklist is narrower and more concrete than the baseline manual validation checklist.

Use it specifically after:

- frontend module extraction;
- script load-order changes;
- refactors touching auth, admin, drafting, editor, or realtime flows.

## Environment

Recommended local runtime:

```bash
cd /Users/ignacio/repos/acervo/acervoapp-dev
docker compose up --build
```

Recommended browser preparation:

- hard refresh after rebuild;
- clear stale service worker/cache if behavior looks inconsistent;
- keep browser console open while testing.

## Pass/Fail Rule

Phase 2 is not considered closed unless all Priority 1 checks pass.

If any Priority 1 check fails:

- stop new refactors;
- record the failing step;
- fix before continuing.

## Priority 1 — Must Pass

### 1. Session and startup

- App loads without a blank screen.
- Login form renders correctly.
- Admin account can sign in.
- Refresh preserves the session.
- Logout returns to login.
- App does not get stuck on “Verificando tu sesión…”.

### 2. Main navigation

- Inicio loads.
- Trabajo loads.
- Estudio loads.
- Redactar loads.
- Modelos loads.
- Admin loads for admin user.

### 3. Admin user management

- User list renders.
- Permissions panel opens for a non-admin user.
- Edit user modal opens.
- Create user modal opens.
- Storage usage panel loads without obvious failure.

### 4. Models and templates

- Model type tabs switch correctly.
- Comparecencia editor opens.
- Comparecencia save works.
- Individualization editor opens.
- Individualization save works.
- Structure editor opens for at least one type.
- Structure preview updates after changes.
- Structure save works.

### 5. Drafting flow

- Redactar chooser screen opens.
- Draft history view opens.
- A new draft can be started.
- The draft can move across steps.
- The draft can be closed and resumed.
- The draft can be discarded.
- Redactar can be opened from an existing cause.
- “Varias causas” selector opens.

### 6. Drafting generation/editor

- Generar step opens.
- Paginated editor renders at least one page.
- Toolbar actions work at minimum for:

  - bold;
  - italic;
  - alignment;
  - tab indentation.

- Changing font or font size does not break the editor.
- Toggling membrete does not crash the view.

### 7. Save/generate result

- Save editable in cause works.
- Opening the generated editable document works.
- PDF generation works.

## Priority 2 — Strongly Recommended

### 8. Study/editor checks

- Open an editable document or note.
- Paste text into the editor.
- Save changes.
- Reopen and confirm persistence.

### 9. Shared/realtime checks

- Shared/admin-config-driven views still open.
- Returning to the browser tab does not cause visible breakage.
- No obvious duplicate render or broken refresh happens after state changes.

### 10. Mass drafting checks

- Select multiple causes.
- Return to Generar step.
- Generate multi-cause output.
- Open one generated result.

## Console Watchlist

During testing, specifically watch for:

- `ReferenceError`
- `is not defined`
- `Cannot read properties of null`
- duplicate event execution
- script-order failures
- broken modal handlers

## Failure Log Template

Use this format when something fails:

```text
Date:
Branch:
Flow:
Step:
Observed result:
Expected result:
Console error:
Notes:
```

## Closure Criteria for Phase 2

Phase 2 can be called complete only when:

- all Priority 1 checks pass;
- no new console-breaking error appears in tested flows;
- the current refactor branch has a stable checkpoint commit.
