# Firebase Usage Analysis and Appwrite Migration Plan

## Executive decision

Do not migrate `audit` or `notifications` to Appwrite based on the earlier architecture guide. Those labels do not match the current application's data model:

- The portal has substantive QA audit records (`auditPlans`, `auditSchedules`, `auditFindings`, and related records). These power workflows and reports; they are not disposable telemetry.
- There is no Firestore `notifications` collection. The dashboard builds notifications from existing business collections and the notification inbox/read state is stored in browser `localStorage`.
- The closest generic activity trail is `activityLogs`. The application writes it server-side and uses it for the admin audit-log view and auditor offline download. That makes it a possible later pilot only if measured usage justifies the migration; it is not currently proven to be a major quota driver.

The strongest static indicators point instead to repeated, live reads of broad collections by dashboard, KPI, reporting, and notification surfaces. The first step should be to measure and optimize those Firestore reads. Appwrite should remain a conditional, feature-scoped option after a production usage baseline and access-control design exist.

## Evidence from the current code

This is a static source review performed on 2026-11-06. It identifies likely workload patterns; it does **not** establish production read/write volume, document counts, or quota exhaustion.

An AST scan of TypeScript/TSX under `src/` found:

| Static indicator                      | Count | Interpretation                                                              |
| ------------------------------------- | ----: | --------------------------------------------------------------------------- |
| `collection()` call expressions       |   566 | Collection references across the app; one reference is not one billed read. |
| Statically named collection IDs       |    83 | The app uses a broad Firestore data model, not just a few log collections.  |
| `useCollection()` call expressions    |   399 | Most collection-backed screens use the shared collection hook.              |
| `useDoc()` call expressions           |   106 | Document-backed reads also need measurement.                                |
| `useGetCollection()` call expressions |     7 | One-shot reads exist, but are a small share of the hook call sites.         |

Most referenced collection IDs by static call-site count:

| Collection                 | Call sites | Notes                                     |
| -------------------------- | ---------: | ----------------------------------------- |
| `units`                    |         61 | Widely used institutional reference data. |
| `campuses`                 |         56 | Widely used institutional reference data. |
| `submissions`              |         36 | Core workflow and reporting data.         |
| `risks`                    |         24 | Core workflow and reporting data.         |
| `cycles`                   |         22 | Used throughout the portal.               |
| `users`                    |         21 | Identity/profile and reporting data.      |
| `correctiveActionRequests` |         20 | Core workflow and reporting data.         |
| `programCompliances`       |         17 | Core program-monitoring data.             |
| `managementReviewOutputs`  |         13 | Workflow/reporting data.                  |
| `auditFindings`            |         12 | Substantive QA audit data.                |
| `auditSchedules`           |         11 | Substantive QA audit data.                |

These are source references, **not** rankings of actual reads or costs. A collection referenced many times may be small or infrequently used; a single broad query may be expensive if it returns many documents.

### Likely read hotspots to measure first

- The shared collection hook defaults to live `onSnapshot` listeners in [`use-collection.tsx`](../src/firebase/firestore/use-collection.tsx); one-shot reads must explicitly use `useGetCollection()` or another non-live path.
- The dashboard page subscribes to about 14 datasets, the dashboard layout to about 14, the KPI dashboard to about 17, and the reports page to about 11. These counts come from visible `useCollection()` call sites. Layout subscriptions can remain active while users navigate between dashboard routes.
- The dashboard and reports pages include collection reads for core data such as submissions, risks, corrective actions, users, campuses, units, audit records, and program compliance. Some queries are role- or scope-filtered, while some are collection-wide. Confirm returned document counts and whether each listener needs to be live.
- The dashboard layout derives notification items from submissions, risks, corrective actions, program compliance, management-review outputs, communications, and request collections. Its listeners read those source collections; migrating a nonexistent `notifications` collection would not remove that work.
- The KPI dashboard and auditor offline manager are additional read-heavy candidates. The offline manager intentionally downloads reference and audit data, including schedules and findings, so its cost should be measured separately from ordinary page visits.

Relevant implementation areas include [`dashboard/page.tsx`](../src/app/%28dashboard%29/dashboard/page.tsx), [`layout.tsx`](../src/app/%28dashboard%29/layout.tsx), [`kpi-dashboard/page.tsx`](../src/app/%28dashboard%29/kpi-dashboard/page.tsx), [`reports/page.tsx`](../src/app/%28dashboard%29/reports/page.tsx), and [`auditor-offline-manager.tsx`](../src/components/audit/auditor-offline-manager.tsx).

### What the app currently calls logs and notifications

- **`activityLogs`:** A server-side append-only trail written by [`activity-logger.ts`](../src/lib/activity-logger.ts), with another system-backup log write in [`actions.ts`](../src/lib/actions.ts). The auth form calls the activity logger during registration. The app reads this collection in the admin audit-log page and for an admin's auditor-offline download. Firestore rules allow signed-in creation and admin-only reads in [`firestore.rules`](../firestore.rules). The source does not prove that it logs every view, download, or status change as the earlier guide claims.
- **`fiamoActivityLogs` and `formDownloadLogs`:** These are real log-like collections with their own feature and permission requirements. They are much narrower than the proposed catch-all `audit_logs`/`activity_trails` mapping.
- **`auditPlans`, `auditSchedules`, `auditFindings`, `correctiveActionPlans`, and `clauseRevisits`:** These represent audit planning, execution, findings, and corrective follow-up. They are operational records and should stay with their workflows unless a separately designed migration covers querying, permissions, offline mode, backfill, and rollback.
- **Notifications:** [`use-notifications.ts`](../src/hooks/use-notifications.ts) stores local inbox/read/deleted state in `localStorage`; notification items are also derived from Firestore-backed feature data in the dashboard layout. There is no current `notifications` Firestore collection in the application source or rules.

### Existing quota/offline behavior is not database failover

[`custom-firestore-wrapper.ts`](../src/firebase/custom-firestore-wrapper.ts) queues certain wrapper-mediated writes when it sees a quota error and retries them periodically. This is a local browser queue, not Appwrite failover; it does not provide a read fallback, does not cover every direct SDK import, and callers may not receive a durable server-commit result when a write is queued. Treat it as a separate reliability concern to test and document before changing write paths.

## Revised plan

### Phase 0 — Establish a production baseline

1. In Firebase/Google Cloud consoles, capture Firestore document reads, writes, deletes, stored bytes, and relevant quota/error metrics for representative periods (at least a normal week and a known busy period, if available).
2. Record current billing plan and configured quotas; do not assume the free-tier daily limits apply to this production project.
3. Inventory approximate document counts and growth for the collections listed above and the real log collections. Note the query surfaces that access each collection.
4. Add privacy-safe application instrumentation or sampled traces if collection-level attribution is unavailable from platform metrics. Record operation, collection, route/screen, result-size bucket, duration, and listener lifecycle; do not record document contents or user identity.
5. Produce a baseline by screen and user role for first-load reads, ongoing listener reads, writes, and offline-download activity. Confirm the top cost drivers with observed data before selecting a migration target.

**Gate:** No Appwrite migration target is chosen until runtime evidence identifies a material cost or reliability problem and the expected benefit can be measured.

### Phase 1 — Reduce avoidable Firestore reads first

1. Review the dashboard layout's long-lived notification-source listeners. Avoid subscribing to data for hidden or irrelevant notification groups; prefer scoped queries and load details on demand where product behavior permits.
2. For each high-use dashboard/KPI/report query, check whether it needs real-time updates. Use one-shot reads for data that is only needed at page load or manual refresh.
3. Add pagination, date/year/role filters, or bounded query limits where the screen does not require the entire collection. Preserve existing permission checks and report correctness.
4. Avoid duplicate subscriptions to the same data across a mounted layout and child page. Consider consolidated, permission-scoped dashboard summaries only if their freshness and invalidation behavior are explicit.
5. Measure the same workload after each change and check that user-visible freshness, offline behavior, report totals, and access boundaries remain correct.

**Success measure:** Compare reads per representative screen/session and daily project totals against the Phase 0 baseline; define numeric reduction targets after the baseline is known.

### Phase 2 — Decide whether an Appwrite pilot is justified

If measured data still shows a suitable high-volume append-only collection, evaluate one narrowly scoped candidate. `activityLogs` may be considered because it is append-only, but its source-level call pattern does not currently establish high volume. Evaluate `fiamoActivityLogs` and `formDownloadLogs` separately because their readers and permissions differ.

Before selecting a candidate, specify:

- authoritative datastore during pilot and after cutover;
- Firebase-authenticated user identity validation and Appwrite authorization;
- role/scope permissions equivalent to current Firestore rules;
- schema, document IDs, query filters, pagination, retention, export, and audit requirements;
- backfill, idempotent writes, retry/reconciliation, observability, and rollback;
- measurable reduction in Firestore operations and acceptable added cost/operational burden.

Do not enable Appwrite's public `Any` role for institutional or user-related data. Firebase Auth does not automatically grant Appwrite permissions. Prefer a server-mediated integration that verifies Firebase identity and keeps privileged Appwrite credentials server-side, unless a reviewed identity/permission bridge is deliberately designed.

### Phase 3 — Pilot, reconcile, and gate cutover

1. Add Appwrite integration behind a feature-specific server/data-access boundary; do not introduce a generic CRUD router that claims to replace all Firestore semantics.
2. Test in staging using representative roles, real query shapes, pagination, concurrent updates, retries, and offline/reconnect scenarios.
3. Backfill with stable IDs and reconciliation checks. During any temporary dual-write period, surface and repair mirror failures; do not fire-and-forget mirror writes or report success before the authoritative write is durable.
4. Compare read/write volumes, latency, failures, permissions, data parity, and operating cost. Keep a documented rollback path.
5. Cut over only the pilot feature after its owner accepts the results. Keep core operational records in Firestore unless a separate migration is justified and tested.

## Explicitly out of scope until the gates pass

- Replacing Firebase Authentication or user profiles.
- Switching the whole portal with a global environment toggle.
- Sending every Firestore collection to Appwrite or dual-writing all collections.
- Treating `auditFindings`/`auditSchedules` as generic telemetry.
- Creating an Appwrite `notifications` collection merely to offload notification UI state.
- Assuming a successful Firebase failure fallback guarantees cross-database consistency.

## Reference implementation locations

- Firebase client and Auth initialization: [`src/firebase/index.ts`](../src/firebase/index.ts), [`src/firebase/provider.tsx`](../src/firebase/provider.tsx)
- Firestore hooks and default live-listener behavior: [`src/firebase/firestore/use-collection.tsx`](../src/firebase/firestore/use-collection.tsx), [`src/firebase/firestore/use-get-collection.tsx`](../src/firebase/firestore/use-get-collection.tsx)
- Quota/offline write wrapper: [`src/firebase/custom-firestore-wrapper.ts`](../src/firebase/custom-firestore-wrapper.ts)
- Authorization rules: [`firestore.rules`](../firestore.rules)
- Current deployment configuration: [`apphosting.yaml`](../apphosting.yaml), [`firebase.json`](../firebase.json)
