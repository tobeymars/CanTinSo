# CanTinSo – Master Architecture v1

**Status:** Architecture baseline for implementation planning  
**Branch:** `feature/ubnd-ward-school-access`  
**Version:** 1.0  
**Date:** 2026-11-17

## 1. Product and deployment model

CanTinSo is one centrally operated platform managed by the CanTinSo company. Multiple wards use the same application and shared database infrastructure, but each ward has its own administrative scope and must not access another ward's operational data.

This is a logical multi-tenant model by ward, not a separate application/database deployment for every ward.

- The company operates the platform and provisions ward-level administrators.
- Each ward administers its own schools and kitchens.
- Schools and kitchens operate within the ward that owns them.
- Cross-ward access is denied by default.

## 2. Tenant boundary and data isolation

The ward is the primary administrative boundary.

- A school belongs to one ward through `School.wardId`.
- A ward administrator (`UBND_ADMIN`) is assigned to exactly one ward through `User.wardId`.
- Every ward-scoped API must derive the allowed ward from the authenticated user on the server.
- Client-supplied `wardId`, `schoolId`, or `kitchenId` must never be trusted as proof of authorization.
- List, detail, create, update, delete, export, report, and nested-resource endpoints must all enforce the same scope.
- `SUPER_ADMIN` is the platform operator and may provision/configure wards; this role is not an ordinary ward operational account.

The shared database is acceptable for v1 only if all tenant-scoped reads and writes are consistently authorized in the backend. Database row-level security may be evaluated as additional defense-in-depth in a later security hardening phase.

## 3. Roles and responsibilities

| Role | Scope and responsibility |
|---|---|
| `SUPER_ADMIN` | Platform-wide administration; create/manage wards and provision initial UBND administrators. |
| `UBND_ADMIN` | Administer schools and central kitchens belonging to its assigned ward; assign eligible same-ward schools to kitchens; view ward reports. |
| `CENTRAL_KITCHEN` | Operate only its own central kitchen and its authorized same-ward school assignments. |
| `SCHOOL_ADMIN` | Administer its assigned school only. |
| `SCHOOL_KITCHEN` | Operate the on-site kitchen associated with its school only. |

Role creation and delegation must be enforced in backend services, not merely hidden in the frontend.

## 4. Ward and school ownership

- `School.wardId` is the source of truth for school ownership.
- A school with no `wardId` is not eligible for ward-scoped kitchen assignment or ward reporting until it is explicitly assigned to a ward.
- A ward administrator may only manage schools where `school.wardId = currentUser.wardId`.
- Changing a school's ward is a privileged administrative operation. It must be audited and must not silently transfer historical records or grant cross-ward access.

## 5. Kitchen ownership and service rule

### 5.1 Kitchen ownership

- A central kitchen belongs to exactly one ward.
- An on-site school kitchen belongs to exactly one school; its ward is derived from that school's `wardId`.
- For central kitchens, add an explicit `Kitchen.wardId` and require it for `KitchenType.CENTRAL`.
- For on-site kitchens, `Kitchen.schoolId` identifies the school; do not allow a school kitchen to claim a different ward from its school.

### 5.2 Same-ward-only service

A kitchen may serve a school only when both resolve to the same non-null ward:

`centralKitchen.wardId === school.wardId`

A central kitchen in Ward A must never be assigned to a school in Ward B.

The backend must validate this rule when creating or changing assignments. The frontend should filter/disable ineligible schools for usability, but frontend filtering is not a security control.

### 5.3 One primary meal provider per school

At any point in time, a school may have at most one active primary meal provider:
- its on-site school kitchen, or
- one central kitchen assignment.

The system must reject overlapping active assignments and reject an active central assignment when an on-site kitchen is active (and vice versa). Provider changes must close the previous assignment with an end timestamp before activating the new one. Preserve assignment history.

## 6. Data ownership for operational modules

Operational records must have an unambiguous owning school or kitchen.

- School-originated records (students, attendance, school receipt, school-level meal service and checks) are scoped by their school and therefore by the school's ward.
- Central-kitchen-originated records (production, kitchen inventory, supplier/ingredient lots and dispatch) are scoped by the owning kitchen and its ward.
- A central kitchen may share only the delivery/meal information needed by its assigned schools; it must not expose unrelated kitchen records to those schools or their ward.
- Existing models that are currently school-scoped must not be assumed to support central-kitchen ownership until their data model and APIs are explicitly reviewed.

Avoid adding redundant ward columns to every table without a data-ownership analysis. Prefer deriving ward scope through the owning school or kitchen where practical. If denormalized tenant keys are introduced for security/performance, enforce consistency and backfill safely.

## 7. API authorization requirements

For every endpoint:
1. Authenticate the user.
2. Authorize the role.
3. Resolve the user's allowed ward/school/kitchen scope from trusted database relations.
4. Apply that scope inside the database query itself.
5. Validate ownership on referenced IDs before mutation.
6. Return no cross-ward data, including through nested relations, counts, exports, and error messages.

Do not rely on frontend route guards, dropdown filtering, or hidden controls.

## 8. Migration and data-safety policy

- Never change existing school, student, user, or ward UUIDs.
- Do not delete or recreate existing business records to introduce ward scope.
- Before any migration deployment: inspect SQL, run Prisma validation/generation/build, take and verify a database backup, inspect existing records that could violate new constraints, and prepare a rollback/recovery plan.
- Do not run `prisma migrate deploy` until the migration is reviewed and the operator explicitly approves it.
- Schema changes must be additive where possible. Any required backfill must be a separately reviewed, deterministic operation with before/after counts.

## 9. Implementation sequence

1. **Baseline and inventory:** inspect all modules, routes, data models, and current authorization checks.
2. **Kitchen ownership:** add ward ownership to central kitchens and define on-site kitchen ownership through schools.
3. **Ward-scoped kitchen administration:** allow `UBND_ADMIN` to create/list/manage central kitchens only in its ward; keep platform provisioning permissions for `SUPER_ADMIN`.
4. **Assignment enforcement:** validate same-ward service and the one-active-provider rule in backend transactions.
5. **Operational data ownership:** review suppliers, ingredients, inventory, meal plans, production, dispatch, receipt, and food-safety records before enabling central-kitchen workflows.
6. **Frontend:** expose only authorized ward-scoped data and controls.
7. **Security and regression tests:** test cross-ward denial, same-ward success, role escalation denial, assignment conflicts, and historical assignment retention.
8. **Deployment:** deploy only after review, backup verification, and explicit approval.

## 10. Current known gaps (from repository review)

- The current `Kitchen` model does not yet have `wardId`.
- Central-kitchen creation/assignment logic currently validates school existence and existing active assignments, but does not enforce same-ward ownership.
- The active-assignment unique index covers central assignment rows; it does not by itself prevent a simultaneous on-site kitchen and central-kitchen provider.
- Existing school-scoped supplier, inventory, and meal-plan models are not yet a complete central-kitchen operational data model.
- The current UBND school-list endpoint is ward-filtered, but every other module/API still requires a route-by-route authorization audit.

This document records the agreed v1 architecture and implementation constraints. It does not itself authorize database migration or imply that all listed controls are already implemented.
