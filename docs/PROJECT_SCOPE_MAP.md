# Project Scope Map for Acervo

Date: 2026-07-31
Status: Working reference before implementation
Purpose: Capture the current product scope, core domains, risk areas, and safest refactor entry points

## 1. Scope Summary

Acervo is not a small single-purpose application. It is a business-critical web application that combines legal office operations with legal study tools in a single product.

From a product and engineering perspective, the application spans multiple responsibilities:

- legal case and workflow management;
- legal drafting and document generation;
- people/client management;
- document and file storage;
- study and reading workflows;
- flashcards and spaced repetition;
- multi-user collaboration and sharing;
- authentication, roles, permissions, and approvals;
- admin controls and organization-wide templates;
- PWA and partial offline behavior.

This means the codebase should be treated as a multi-domain system rather than a simple static frontend.

## 2. Product Domains

## 2.1 Legal Work Domain

This is the operational side of the app used for legal practice.

Main responsibilities:

- managing causes/cases;
- storing case-related data;
- managing people, clients, and roles;
- drafting legal documents;
- generating outputs for formal legal use;
- supporting office workflows and shared work.

This is one of the most business-critical parts of the application.

## 2.2 Study Domain

This is the educational and knowledge-management side of the app.

Main responsibilities:

- managing a legal library;
- reading and organizing materials;
- writing notes;
- creating and reviewing flashcards;
- tracking learning progress.

This domain is important because it is not just a side module. It is part of the core product identity.

## 2.3 Collaboration Domain

This domain supports shared work between users.

Main responsibilities:

- team connections;
- sharing cases;
- sharing documents and notes;
- sharing books;
- coordinating access across users.

This domain introduces complexity because it crosses product boundaries and depends heavily on correct permissions.

## 2.4 Administration Domain

This domain supports organizational control and account management.

Main responsibilities:

- creating and managing users;
- approval workflows;
- access level control;
- admin-only operations through Edge Functions;
- defining master templates and shared defaults.

This is a high-sensitivity domain because mistakes here can affect all users or expose privileged actions.

## 3. Technical Scope

The current technical scope includes:

- a single-page frontend application delivered as a PWA;
- a large single-file frontend implementation centered in `app/index.html`;
- Supabase Auth for authentication;
- PostgreSQL with RLS for data security;
- Supabase Storage for file handling;
- Supabase Realtime for collaboration updates;
- Edge Functions for admin-only server-side operations;
- Cloudflare Pages or equivalent static hosting;
- CDN-based runtime dependencies for frontend capabilities.

The app is therefore both frontend-heavy and backend-dependent, even if the backend is managed through Supabase.

## 4. Core Business-Critical Areas

These areas should be treated as highest priority for protection during refactors:

- authentication and session handling;
- approval, role, and permission enforcement;
- state loading, saving, and synchronization;
- legal drafting generation logic;
- shared resource access control;
- storage path conventions and authorization behavior;
- admin operations using Edge Functions.

If any of these areas regress, the app may still appear to load correctly while failing in ways that matter to real users.

## 5. Main Risk Areas

## 5.1 Monolithic Frontend Risk

The main frontend file contains too many responsibilities in one place. This increases the risk of:

- accidental regressions during edits;
- hidden coupling between modules;
- unclear ownership of logic;
- slower onboarding for future contributors;
- difficulty isolating bugs.

## 5.2 Incomplete Backend Versioning Risk

The documented schema is not fully represented in versioned SQL files. This creates risk for:

- setting up new environments;
- reproducing production behavior;
- auditing permissions and policies;
- safely evolving database structure.

## 5.3 Permission and Sharing Risk

The product contains several layers of access control:

- client-side visibility rules;
- profile-based permissions;
- RLS policies;
- storage path rules;
- admin validation in Edge Functions.

This is powerful, but also fragile if changed carelessly.

## 5.4 Drafting Engine Risk

The drafting engine appears to be one of the most valuable and specialized parts of the system. It likely contains domain-specific rules that are easy to damage with well-intentioned cleanup.

This area should be refactored only with protection around it.

## 5.5 PWA and Sync Risk

Offline behavior, caching, and synchronization can fail in subtle ways. These failures are often harder to detect than obvious UI bugs.

## 6. Safest Refactor Entry Points

These are the best places to start improving engineering quality with lower risk:

- local reproducibility and Docker setup;
- repository documentation cleanup;
- configuration centralization;
- extraction of low-risk frontend utilities;
- extraction of generic state helpers;
- dependency version pinning;
- adding manual validation checklists;
- adding minimal automated checks around pure logic.

These changes improve maintainability without immediately touching the most sensitive business flows.

## 7. Higher-Risk Refactor Areas

These areas should be postponed until the codebase has better protection:

- authentication flow changes;
- permission model changes;
- RLS-related restructuring;
- storage authorization path changes;
- collaboration synchronization logic;
- legal drafting engine logic;
- admin function behavior.

Work in these areas should happen in smaller steps and only after basic validation guardrails exist.

## 8. Suggested Refactor Strategy

The safest strategy is:

1. Improve reproducibility and documentation first.
2. Add a minimal validation baseline.
3. Extract low-risk modules from the monolith.
4. Version the full backend more accurately.
5. Add targeted checks around core business logic.
6. Only then touch the most sensitive parts.

This approach matches the project’s actual complexity and reduces the chance of breaking real user workflows while “improving quality.”

## 9. Practical Engineering Interpretation

Acervo should be treated as:

- a real multi-user business application;
- a permission-sensitive system;
- a domain-specific document generation tool;
- a product with both operational and educational workflows;
- a codebase that needs careful decomposition rather than broad rewriting.

That interpretation should guide every cleanup decision.

## 10. Immediate Use of This Scope Map

This document should be used to:

- decide refactor order;
- identify which areas require extra caution;
- explain to future contributors why some cleanup steps are delayed;
- keep implementation aligned with product reality rather than with generic “best practices.”
