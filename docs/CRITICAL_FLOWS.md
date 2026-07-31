# Critical Flows for Acervo

Date: 2026-07-31
Status: Baseline protection map before structural refactors
Purpose: Identify the application flows that are most important to preserve during engineering cleanup

## 1. Why This Document Exists

Acervo is not a simple static frontend. It contains business-critical workflows across legal work, study, collaboration, storage, and administration.

This document identifies the flows that must be treated as protected during refactors. If one of these flows breaks, the app may still appear functional while failing in meaningful ways for real users.

## 2. Critical Flow Categories

The most important flows fall into these groups:

- access and session flows;
- state persistence and synchronization flows;
- legal work flows;
- drafting flows;
- study flows;
- collaboration and permission flows;
- admin flows;
- storage and file access flows.

## 3. Access and Session Flows

These flows control whether users can enter and remain in the system correctly.

Critical behaviors:

- login works for valid users;
- rejected or non-approved users are handled correctly;
- session persistence behaves as expected;
- logout returns the app to a clean unauthenticated state.

Why this matters:

If session handling breaks, every other workflow becomes unreliable or untestable.

## 4. State Persistence and Synchronization Flows

The app appears to rely heavily on a per-user state model that is loaded, mutated, and saved repeatedly.

Critical behaviors:

- user state loads correctly at startup;
- edits persist correctly;
- refresh does not destroy or duplicate data;
- synchronization does not create obvious inconsistency;
- shared-state updates do not break rendering.

Why this matters:

This is one of the main technical foundations of the app. Regressions here can look like random product instability.

## 5. Legal Work Flows

These flows cover the operational side of the application for legal practice.

Critical behaviors:

- users can open and edit causes/cases;
- cause-related data displays correctly;
- related people/client data remains connected and usable;
- saved legal-work data remains stable after refresh.

Why this matters:

This is direct business workflow. Breakage here affects daily use of the app.

## 6. Drafting Flows

The drafting engine appears to be one of the most specialized and valuable parts of Acervo.

Critical behaviors:

- a drafting workflow can be started from relevant case data;
- document generation completes successfully;
- generated structure remains coherent;
- expected sections still appear in output;
- drafted artifacts can still be saved where supported.

Why this matters:

This is likely one of the app’s highest-value differentiators. Cleanup work must not casually alter its behavior.

## 7. Study Flows

These flows support the educational side of the product.

Critical behaviors:

- users can access the library or reader;
- notes remain available and editable;
- flashcards or study sessions still work;
- study-related state persists properly.

Why this matters:

This is not just a side module. It is part of the core product promise.

## 8. Collaboration and Permission Flows

These flows cross multiple domains and depend on correct access control.

Critical behaviors:

- shared cases, books, and documents remain accessible to the right users;
- access is not unintentionally broadened or removed;
- collaboration views still load and update correctly;
- permission-sensitive UI still matches expected access levels.

Why this matters:

These flows are easy to damage during cleanup because they depend on both frontend logic and backend enforcement.

## 9. Admin Flows

These flows are high impact because they affect users and organization-level behavior.

Critical behaviors:

- admin views still load correctly;
- admin-only actions remain restricted;
- user-management workflows remain intact;
- master-template or organization-wide settings remain usable.

Why this matters:

Mistakes here can affect all users, not just one account.

## 10. Storage and File Access Flows

These flows cover access to uploaded and shared files.

Critical behaviors:

- existing file references remain valid;
- file-linked views still open correctly;
- access control still follows the intended ownership and sharing model;
- file-related workflows do not silently fail after refactors.

Why this matters:

Storage paths and authorization rules are often tightly coupled to application logic and can fail in subtle ways.

## 11. Highest-Risk Refactor Interaction Points

The flows most likely to break during structural cleanup are:

- script load order changes;
- extracted functions losing implicit shared state;
- DOM event handlers being disconnected;
- serialization/deserialization assumptions changing;
- permission checks being moved without preserving call order;
- drafting helpers being split without preserving token behavior;
- views rendering before required state is ready.

These interaction points deserve extra caution during Phase 2.

## 12. Practical Protection Rule

Any cleanup step that touches one of the following should be considered high attention:

- auth/session initialization;
- state load/save code;
- render bootstrapping;
- drafting helpers;
- permission gating;
- sharing logic;
- admin actions;
- storage access helpers.

When touching those areas, the corresponding manual validation flow should be rerun immediately.
