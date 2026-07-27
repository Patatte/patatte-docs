---
title: Patatte Backend Two-Stage Production Migration Deployment Roadmap
description: Staged rollout from JPA-managed schema changes to Flyway-managed migrations.
status: Draft — deployment rehearsal and named owners pending
owner: Head of Infrastructure
last_updated: 2026-07-27
source_template: https://github.com/Patatte/patatte-docs/blob/main/Migration_Deployment%20SOP.md
---

# Patatte Backend Two-Stage Production Migration Deployment Roadmap

> **Scope:** Sandbox → Production (`main`) using two immediately consecutive releases  
> **Repository:** `Patatte/core-backend-api`  
> **Status:** Draft — for Development and Infrastructure review  
> **Owner:** Head of Infrastructure, Patatte

---

## 1. Purpose and Ownership

Patatte historically allowed JPA/Hibernate ORM to apply database schema changes. That works for many entity-driven changes, but PostgreSQL enum/check-constraint changes require direct SQL. To remove the need for engineers to log in to test and production databases and run SQL manually, the backend is moving to versioned Flyway migrations executed by the application/deployment pipeline.

Production did not receive the final ORM-era changes before Flyway was introduced on the development line. The `sandbox` history therefore contains:

1. A final group of changes whose schema effects depend on JPA/Hibernate.
2. Later application changes that introduce Flyway and versioned SQL migrations.

The deployment will consequently use two releases in one controlled window:

- **Stage 1 — ORM baseline:** deploy the final pre-Flyway code so JPA/Hibernate applies the outstanding ORM-era schema changes.
- **Stage 2 — Flyway adoption:** immediately deploy the Flyway-enabled release, allowing Flyway to establish its history and apply the versioned migrations.

This ordering avoids asking Flyway migrations to run against a production schema that has not first reached the expected pre-Flyway baseline.

### Ownership split

| Area | Owner | Responsibility |
|---|---|---|
| ORM/Flyway boundary | Development | Confirm the selected commit is the complete and deployable ORM baseline |
| Migration scripts | Development | Review, test, and own SQL correctness and compatibility |
| Production execution | Infrastructure | Backup, scheduling, traffic control, deployment, monitoring, and rollback |
| Database verification | Development + Infrastructure | Validate the schema and `flyway_schema_history` after each stage |
| Application validation | Development + Infrastructure | Verify startup and critical user flows after each stage |
| Business communication | Infrastructure / Product | Notify stakeholders and affected users |

### Verified code boundary

| Item | Reference |
|---|---|
| Stage-1 branch | [`release/orm-pre-flyway-stage-1`](https://github.com/Patatte/core-backend-api/tree/release/orm-pre-flyway-stage-1) |
| Last verified commit without Flyway | [`9f2995e0e4eb094ad430af531d9b34c16f3be1de`](https://github.com/Patatte/core-backend-api/commit/9f2995e0e4eb094ad430af531d9b34c16f3be1de) — “Add menu context type support” |
| First merged Flyway change | [`42290a4be4d234c6adaf93c05a5f7f648551cec8`](https://github.com/Patatte/core-backend-api/commit/42290a4be4d234c6adaf93c05a5f7f648551cec8) — PR #1234 |
| First Flyway changes | `order-service/pom.xml` adds `flyway-core`; migrations `V2__update_enum_constraints.sql` and `V3__guest_order_schema_changes.sql` are added |
| Frozen Stage-2 branch | [`release/flyway-stage-2`](https://github.com/Patatte/core-backend-api/tree/release/flyway-stage-2) |
| Frozen Stage-2 commit | [`1089a581866eab441c0c0779e76852865686b47f`](https://github.com/Patatte/core-backend-api/commit/1089a581866eab441c0c0779e76852865686b47f) |
| Flyway services | `order-service` and `user-service` only |

> **Repository warning:** `main` and `sandbox` are diverged. At review time, `sandbox` is 109 commits ahead and 83 commits behind `main`. The Stage-1 boundary branch is seven commits ahead and 120 commits behind `main`. Do not treat a green merge button as sufficient evidence: resolve conflicts deliberately and verify that the resulting Stage-1 artifact still contains all seven intended pre-Flyway changes and no Flyway dependency or migration files.

### Confirmed schema-management configuration

| Release/service | Hibernate setting | Flyway setting |
|---|---|---|
| Stage 1, pre-Flyway services | `ddl-auto=update` | Flyway not present |
| Stage 2, `order-service` | `ddl-auto=validate` | `spring.flyway.baseline-on-migrate=true` |
| Stage 2, `user-service` | `ddl-auto=none` | `spring.flyway.baseline-on-migrate=true` |

Repository inspection confirms that only `order-service/pom.xml` and `user-service/pom.xml` contain Flyway dependencies on the frozen Stage-2 branch. The other module POMs do not contain Flyway.

Flyway's default `baselineVersion` is `1`. On a non-empty schema without a history table, `baseline-on-migrate=true` should therefore create the baseline at version 1 and apply migrations above version 1, including the repository's `V2+` scripts. This exact behavior must be captured in the rehearsal rather than assumed. See the official [baseline-on-migrate](https://documentation.red-gate.com/flyway/reference/configuration/flyway-namespace/flyway-baseline-on-migrate-setting) and [baseline version](https://documentation.red-gate.com/fd/flyway-baseline-version-setting-277578975.html) documentation.

> **Authentication-service discrepancy:** Authentication functionality is understood to have been merged into `user-service`, but the frozen Stage-2 root `pom.xml` still lists `authentication-service`, and that directory still has a POM. Confirm during rehearsal that the deployment pipeline does not build or deploy the obsolete standalone service. Remove the stale module separately if appropriate; do not mix an unreviewed cleanup into this migration window.

### Deployment configuration packages

The service configuration packages are generated separately from this documentation repository. Store them in the restricted deployment-artifact location used by Infrastructure; do not commit environment configuration archives to this repository.

Each archive contains the supplied configuration for:

- `menu-service`
- `notification-service`
- `order-service`
- `patatte-gateway`
- `payment-service`
- `service-registry`
- `user-service`

The supplied `stuff.cmd` file is intentionally excluded because it is not an application configuration file. Apart from the schema-management settings described below, the supplied service configurations are unchanged.

#### Stage 1 — ORM baseline configuration

The Stage-1 package prepares the two database-owning services to apply the remaining ORM-era schema changes:

| Service | Required setting |
|---|---|
| `order-service` | `spring.jpa.hibernate.ddl-auto=update` |
| `user-service` | `spring.jpa.hibernate.ddl-auto=update` |

All `spring.flyway.*` properties are removed from both services in Stage 1. Flyway-specific debug logging is also removed from `user-service`.

The other five service configurations are byte-for-byte copies of the supplied files.

#### Stage 2 — Flyway migration configuration

The Stage-2 package changes schema ownership from Hibernate to Flyway:

| Service | Hibernate behavior |
|---|---|
| `order-service` | `spring.jpa.hibernate.ddl-auto=validate` — Hibernate checks that mappings match the migrated schema but does not modify it |
| `user-service` | `spring.jpa.hibernate.ddl-auto=none` — Hibernate performs no schema-management operation |

Both services contain the following Flyway settings:

```properties
spring.flyway.enabled=true
spring.flyway.locations=classpath:db/migration
spring.flyway.baseline-on-migrate=true
spring.flyway.baseline-version=1
```

`spring.flyway.enabled` must remain `true` for the Stage-2 deployment; setting it to `false` would prevent the packaged migrations from running. `baseline-on-migrate` also remains `true` for this initial adoption against the existing non-empty schemas. Any decision to disable automatic baselining after the first successful migration must be handled as a separate, reviewed post-deployment configuration change.

#### Configuration promotion rule

Use the same reviewed configuration archive in rehearsal and production. Do not edit a property directly on a production host. If rehearsal requires a configuration correction:

1. Update the source configuration.
2. Produce a newly versioned archive.
3. Record its checksum.
4. Repeat the affected rehearsal checks.
5. Promote that exact archive to production.

---

## 2. Intake Requirements From Development

Infrastructure must not schedule the production deployment until every required item is complete.

| Item | Description | Status |
|---|---|---|
| Boundary approval | Development confirms `9f2995e` is the correct last pre-Flyway state | [x] |
| Stage-1 change list | All seven commits/differences up to `9f2995e` will be merged into `main` | [x] |
| Stage-1 build artifact | Immutable image/artifact built from the reviewed merge result | [ ] |
| Stage-2 change list | Frozen at `release/flyway-stage-2` / `1089a581...` | [x] |
| Stage-2 build artifact | Immutable Flyway-enabled image/artifact built from the reviewed merge result | [ ] |
| Migration inventory | Every order-service and user-service migration, in execution order | [ ] |
| Flyway baseline strategy | `spring.flyway.baseline-on-migrate=true` for both Flyway-enabled services; behavior must be proven in rehearsal | [x] |
| Schema prerequisites | SQL checks proving production matches the expected pre-Flyway baseline after Stage 1 | [ ] |
| DDL mode | Stage 1 `update`; Stage 2 order `validate`, user `none` | [x] |
| Backward compatibility | Confirm Stage 1 can run safely before Stage 2 and migrations tolerate the Stage-1 schema | [ ] |
| Duplicate-object safety | Confirm migrations will not fail if ORM already created a column/table/constraint | [ ] |
| Test evidence | Full two-stage rehearsal against a production-like database snapshot | [ ] |
| Runtime/locking | Estimated duration and lock impact for each migration | [ ] |
| Reversal method | Reverse SQL or restore decision for every non-additive change | [ ] |
| Retry behavior | Confirm Flyway repair/resume procedure after partial failure | [ ] |

> **Gate:** If the production-parallel two-stage rehearsal fails, or its resulting schema/Flyway history differs from the approved evidence, do not deploy.

---

## 3. Risk Classification

**Classification: HIGH**

The deployment changes both the application and the mechanism responsible for schema evolution. It includes enum/check-constraint changes and two closely coupled application releases. The releases are not independently equivalent, and a failed Stage 2 could leave production running the temporary Stage-1 application state.

Primary risks:

- Flyway sees a non-empty schema without an accepted baseline and refuses to migrate.
- JPA creates an object during Stage 1 that a later migration tries to create without `IF NOT EXISTS`.
- A check constraint is replaced while existing rows contain an unsupported value.
- Stage 1 starts successfully but is not compatible with current production traffic.
- Stage 2 fails after one service migrates while another service has not.
- The long-diverged branches introduce merge conflicts or omit changes from `main`.
- Rolling back only the application leaves the database incompatible with the restored version.

---

## 4. Pre-Deployment Checklist

### 4.1 Branch and artifact controls

- [ ] Open a Stage-1 PR from `release/orm-pre-flyway-stage-1` to `main`
- [ ] Resolve conflicts without removing current `main` fixes
- [ ] Confirm the PR contains the seven intended pre-Flyway commits/differences
- [ ] Confirm Stage 1 contains no `flyway-core` dependency
- [ ] Confirm Stage 1 contains no `src/main/resources/db/migration` files
- [ ] Record the reviewed Stage-1 merge SHA: `[SHA]`
- [ ] Merge/rebase the frozen `release/flyway-stage-2` work only after Stage 1 is accepted
- [x] Record the frozen Stage-2 source SHA: `1089a581866eab441c0c0779e76852865686b47f`
- [ ] Record the resulting Stage-2 merge SHA after conflict resolution: `[SHA]`
- [ ] Build and retain immutable artifacts for both SHAs
- [ ] Retain the current known-good production artifact
- [x] Stage-1 configuration archive created: `Patatte_Stage_1_ORM_Configs.zip`
- [x] Stage-2 configuration archive created: `Patatte_Stage_2_Flyway_Configs.zip`
- [ ] Record the SHA-256 checksum of each configuration archive in restricted deployment evidence
- [ ] Verify both configuration checksums before rehearsal and production deployment
- [ ] Confirm the rehearsal and production pipelines consume the same reviewed archives

### 4.2 Database and Flyway readiness

- [ ] Take a full production backup immediately before Stage 1
- [ ] Restore-test that backup in a scratch environment
- [ ] Capture pre-deployment schema DDL for affected tables
- [ ] Capture affected-table row counts and constraint definitions
- [ ] Confirm point-in-time recovery and retention
- [ ] Rehearse Stage 1 then Stage 2 on a production-like restored snapshot
- [ ] Run the rehearsal in the planned production-parallel environment
- [ ] Verify all migrations execute exactly once
- [ ] Verify `flyway_schema_history` contents, order, checksums, and success flags
- [ ] Verify Stage 2 does not depend on JPA continuing to mutate schemas
- [ ] Confirm how each service behaves if another service's migration fails
- [ ] Confirm the obsolete standalone `authentication-service` is not deployed

### 4.3 Required production queries/evidence

- [ ] Pre-Stage-1 schema snapshot saved: `[reference]`
- [ ] Post-Stage-1 schema diff saved: `[reference]`
- [ ] Post-Stage-2 schema diff saved: `[reference]`
- [ ] Flyway history query output saved: `[reference]`
- [ ] Enum/check-constraint validation query set approved: `[reference]`

### 4.4 People and communication

- [ ] Deployment window: `[date/time/time zone]`
- [ ] Expected maintenance duration: `[duration]`
- [ ] Final go/no-go owner: `[name]`
- [ ] Rollback owner: `[name]`
- [ ] Database owner: `[name]`
- [ ] Development standby: `[name(s)]`
- [ ] Stakeholder channel: `[channel]`

---

## 5. Backup and Recovery Strategy

Take the backup immediately before Stage 1. It must use the database platform's native snapshot/dump mechanism, be stored away from the primary host, and be restore-tested.

**Backup reference:** `[reference]`  
**PITR window:** `[hours/days]`  
**Retention:** `[days]`

### Rollback checkpoints

- **Checkpoint A — before Stage 1:** current known-good production application and database.
- **Checkpoint B — after Stage 1:** temporary ORM-baselined database plus Stage-1 application. Record evidence before Stage 2.
- **Checkpoint C — after Stage 2:** Flyway-managed target state.

Do not assume an application rollback alone is safe after Stage 2. If a migration is not backward-compatible, restore the database to the appropriate checkpoint and deploy the matching application artifact.

### Rollback triggers

- Either application artifact fails to start.
- Stage-1 schema verification differs from the approved baseline.
- Flyway validation/migration fails or any history row is unsuccessful.
- Runtime or lock duration exceeds the approved limit.
- Constraint validation, row-count, or integrity checks fail.
- Critical application flow fails or error rate exceeds `[threshold]`.
- Any service reaches a different migration state from the intended release.

---

## 6. Two-Stage Rollout Plan

| Step | Action | Owner | Gate / Evidence |
|---|---|---|---|
| 1 | Freeze non-essential deployments and announce start | Infrastructure | Stakeholders notified |
| 2 | Drain traffic / enable maintenance mode | Infrastructure | No production writes, if required |
| 3 | Take and verify backup; record Checkpoint A | Infrastructure | Backup ID and restore evidence |
| 4 | Deploy immutable Stage-1 artifact with Stage-1 ORM configuration archive | Infrastructure | Artifact SHA and configuration checksum match the approved release |
| 5 | Allow ORM-era schema update/startup to complete | Infrastructure + Development | All services healthy |
| 6 | Verify Stage-1 schema and critical flows | Development + Infrastructure | Approved schema diff and smoke tests |
| 7 | Record Checkpoint B; make explicit Stage-2 go/no-go decision | Go/no-go owner | Signed decision |
| 8 | Deploy immutable Stage-2 Flyway-enabled artifact with Stage-2 configuration archive immediately | Infrastructure | Artifact SHA and configuration checksum match the approved release |
| 9 | Observe Flyway validation and migration for every service | Infrastructure + Development | Successful logs and history rows |
| 10 | Verify target schema, constraints, and data | Development + Infrastructure | Approved post-migration evidence |
| 11 | Run full smoke-test checklist | Development + Infrastructure | All checks pass |
| 12 | Restore traffic / disable maintenance mode | Infrastructure | Health stable |
| 13 | Monitor logs, DB locks, errors, and business flows | Infrastructure | `[60–120]` minutes |
| 14 | Announce completion and retain evidence | Infrastructure | Stakeholders notified |

### Execution gates

1. Stage 2 must not start merely because Stage 1 deployed. The Stage-1 schema checks and smoke tests must pass.
2. If Stage 1 fails before changing the schema, redeploy the previous application.
3. If Stage 1 partially changes the schema, use the approved reverse path or restore Checkpoint A.
4. If Stage 2 fails, keep traffic disabled. Decide between a tested forward repair and restoration; do not improvise SQL in production.

### Why use a frozen Stage-2 branch?

The Stage-2 branch prevents later work pushed to `sandbox` from silently entering the production release after the rehearsal. The rehearsal and production deployments can therefore use the same source commit.

Do not move `release/flyway-stage-2` after rehearsal begins. Any required fix should be reviewed explicitly, produce a new immutable commit, and cause the affected rehearsal checks to be repeated.

### Maintenance mode

Maintenance mode is a temporary state in which users cannot perform normal write operations while deployment is in progress. It may be implemented as a maintenance page, API write rejection, load-balancer traffic drain, or temporarily scaling public application instances down.

Its purpose here is to prevent orders, payments, and other writes from changing the database between the backup, Stage-1 schema update, Stage-2 migration, and verification. If Patatte has no maintenance-mode mechanism, the rehearsal must demonstrate that both stages and all migrations are safe while live traffic continues. Otherwise, schedule a short service interruption or add a traffic-draining mechanism before production.

### Flyway verification

- [ ] Flyway connects to the intended production database/schema
- [ ] Baseline behavior matches the approved strategy
- [ ] Each service records baseline version `1` on its existing schema
- [ ] Each expected `V2+` migration then runs exactly once
- [ ] Expected migrations appear in version order
- [ ] Every applied migration has `success = true`
- [ ] Stored checksums match the reviewed repository files
- [ ] No pending or out-of-order migration is unexpected
- [ ] Application logs contain no JPA schema-validation errors
- [ ] Hibernate is not making unintended schema changes in Stage 2

### Patatte smoke tests

- [ ] User login
- [ ] Menu retrieval and context behavior
- [ ] Order creation, including guest/batch behavior where enabled
- [ ] Payment confirmation
- [ ] Order status and locking transitions
- [ ] Kitchen order visibility
- [ ] Vendor fulfilment update
- [ ] Organisation confirmation / receipt flow
- [ ] Notification delivery
- [ ] Reporting / reconciliation visibility

---

## 7. Rollback Procedure

1. Keep or re-enable maintenance mode and stop the pipeline.
2. Identify whether failure occurred before Stage 1, between stages, or during/after Stage 2.
3. Capture logs, Flyway history, applied DDL, and database health before changing state.
4. Use an approved reverse migration only when it was rehearsed and no destructive step makes reversal unsafe.
5. Otherwise restore Checkpoint A (or the explicitly validated Checkpoint B recovery artifact, if one exists).
6. Deploy the application artifact that matches the restored database.
7. Run schema checks and smoke tests.
8. Restore traffic only after the go/no-go owner signs off.
9. Notify stakeholders and schedule a retrospective before retrying.

---

## 8. Communication Plan

| When | Audience | Channel | Message |
|---|---|---|---|
| T-2 days | Stakeholders | `[channel]` | Two-stage migration scheduled for `[date/time]`; expected impact `[impact]` |
| T-1 hour | Deployment team | `[channel]` | Owners, artifacts, backup, and rollback readiness confirmed |
| T-0 | Users/stakeholders | Status page / `[channel]` | Maintenance started |
| After Stage 1 | Deployment team | `[channel]` | ORM baseline verified; Stage-2 go/no-go decision |
| Completion | Stakeholders | `[channel]` | Flyway adoption complete; verification passed |
| Rollback | Stakeholders | `[channel]` | Deployment stopped; system restored to `[checkpoint]`; review pending |

---

## 9. Sign-Off

| Item | Confirmed By | Date |
|---|---|---|
| Commit boundary approved |  |  |
| Stage-1 PR/conflict resolution reviewed |  |  |
| Stage-2 PR/range reviewed |  |  |
| Flyway baseline strategy approved |  |  |
| Production-like two-stage rehearsal passed |  |  |
| Backup restore test passed |  |  |
| Rollback procedure rehearsed |  |  |
| Deployment window communicated |  |  |
| Final go-ahead |  |  |

---

## 10. Deployment Roles in Plain Language

One person may hold more than one role, but every role must have a named primary and backup before deployment.

| Role | Plain-language responsibility |
|---|---|
| Deployment operator | Runs the deployment steps and records evidence |
| Database owner | Checks backups, schema changes, Flyway history, locks, and recovery |
| Development standby | Diagnoses application or migration failures and validates expected behavior |
| Go/no-go owner | Has final authority to continue from Stage 1 to Stage 2 or stop the deployment |
| Rollback owner | Directs restoration and ensures the database and application versions match |
| Communications owner | Updates stakeholders and users during completion, delay, or rollback |

## 11. Clarifications Required Before Final Approval

1. Has Flyway already run against sandbox/test, and what rows currently exist in each service's `flyway_schema_history`?
2. Which database engine/version and deployment platform are used in production?
3. Does Patatte currently have maintenance mode or a way to drain/block write traffic?
4. Which people will fill the roles in Section 10?
5. What deployment date, time zone, expected duration, alert threshold, and communication channel should be recorded?

## Appendix

Attach:

- Stage-1 and Stage-2 PR links and immutable artifact SHAs
- Full migration inventory and reviewed SQL
- Pre-, intermediate-, and post-deployment schema snapshots
- Two-stage rehearsal evidence
- Backup and restore-test references
- Verification queries and outputs
- Smoke-test evidence
- Flyway history output
- Monitoring notes and any rollback evidence
