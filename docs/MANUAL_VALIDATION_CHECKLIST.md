# Manual Validation Checklist for Acervo

Date: 2026-07-31
Status: Baseline checklist before structural refactors
Purpose: Define the minimum manual checks to run before and after engineering-quality changes

## 1. How to Use This Checklist

This checklist is intended for use before and after structural changes, especially frontend modularization and backend/schema cleanup.

The goal is not exhaustive QA. The goal is to protect the most important user-facing and business-critical flows while the codebase is being reorganized.

## 2. Validation Rules

- Run this checklist on the current working branch before starting a risky refactor.
- Run it again after each meaningful structural change.
- Record failures immediately and stop chaining unrelated changes.
- If a flow cannot be tested locally, note the limitation explicitly.

## 3. Core Access and Session Checks

- The app loads without a blank screen or obvious console-breaking failure.
- The login screen renders correctly.
- A valid user can sign in successfully.
- Session persistence behaves as expected after refresh.
- Logout works and returns the user to the correct state.
- A non-approved user flow, if testable, still behaves correctly.

## 4. State Load and Save Checks

- User state loads correctly after login.
- Existing data appears in the expected views.
- A simple state change is saved successfully.
- Refreshing the page preserves the saved change.
- No obvious duplicated or missing state appears after refresh.

## 5. Legal Work Domain Checks

- The causes/cases view loads correctly.
- Opening an existing cause works.
- Editing basic cause data works.
- People/client-related information displays correctly.
- A saved legal-work change persists after refresh.

## 6. Drafting Flow Checks

- The drafting area opens correctly.
- A basic drafting workflow can be started from an existing cause.
- A document can be generated without a visible failure.
- The generated output contains expected sections and formatting structure.
- Saving the drafted result still works if that flow is available in the current environment.

## 7. Study Domain Checks

- The library or reader view loads correctly.
- Notes load without obvious corruption.
- Flashcards or study sessions start correctly.
- A simple study-related change persists after refresh.

## 8. Collaboration and Sharing Checks

- Shared resources load without visible errors.
- A shared case, document, or book view opens correctly if test data is available.
- Membership-based access appears consistent with expected permissions.
- No obvious unauthorized action is exposed through the UI.

## 9. Admin Checks

- The admin area loads for an admin account.
- User management views render correctly.
- Admin-only actions are visible only where expected.
- If safe test accounts exist, a non-destructive admin workflow still works.

## 10. Storage and File Checks

- Existing uploaded files, if available, remain accessible.
- File-linked views do not show broken references unexpectedly.
- A basic upload or access flow still works if it can be tested safely.

## 11. PWA and Runtime Checks

- The app loads correctly through the normal local runtime.
- The Service Worker does not obviously break the current version.
- Refresh behavior is normal after local changes.
- No stale asset issue is immediately visible during basic testing.

## 12. Error and Regression Watchlist

Watch specifically for:

- blank screens;
- missing event handlers;
- state not saving;
- duplicated records after refresh;
- permission-related UI inconsistencies;
- drafting output shape changing unexpectedly;
- views that render but no longer respond to input;
- silent failures caused by moved script order.

## 13. Minimum Pass Threshold

Before moving to the next structural change, the following must remain true:

- login works;
- state load/save works;
- at least one cause flow works;
- at least one drafting flow works;
- at least one study flow works;
- admin area still loads for admin users;
- no obvious permission regression appears in tested flows.

## 14. Known Limits

This checklist does not replace:

- automated tests;
- RLS policy verification;
- Edge Function-level validation;
- browser compatibility testing;
- full production acceptance testing.

It is only the minimum manual safety net for refactoring work.
