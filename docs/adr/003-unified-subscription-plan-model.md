# ADR 003: Unified Salon Model & Subscription-Tier Quotas

**Status:** Accepted  
**Date:** 2026-11-04  
**Decision Maker:** Core Engineering  

---

## Context
Initial prototypes branched code between a "SOLO" mode (single-barber village shop) and a "MULTI" mode (modern multi-chair salon). Maintaining two parallel codebases, routing logics, and UI branches caused code duplication, inconsistent bug fixes, and upgrade barriers.

## Decision
We eliminated all code branching between "SOLO" and "MULTI" in favor of a **Unified Salon Model**:
1. Every salon runs the identical core state machine, API endpoints, and UI layout.
2. Scale is dictated purely by the organization's **Subscription Plan**:
   - `STARTER` (`maxBranches: 1`, `maxStylistsPerBranch: 2`)
   - `PRO` (`maxBranches: 5`, `maxStylistsPerBranch: 8`)
   - `ENTERPRISE` (`maxBranches: 99`, `maxStylistsPerBranch: 99`)
3. When a salon has 1 chair, the UI elegantly renders a single active chair; when it adds 5 chairs, the same components seamlessly display the expanded bays.

## Consequences & Benefits
- Single codebase to test, deploy, and maintain.
- Frictionless upgrade: an owner upgrades from Starter to Pro in `/admin/billing` and instantly unlocks multi-chair capacity without data migration.
