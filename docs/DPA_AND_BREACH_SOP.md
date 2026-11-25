# Third-Party Processor Governance, Cross-Border Transfers & Breach Response SOP

**System:** RSU EOMS Portal (UAQA Portal)  
**Compliance Basis:** Republic Act No. 10173 (Data Privacy Act of 2012), IRR Sec. 26–28, 38, 43–45; NPC Circular 16-03 (Personal Data Breach Management); NPC Circular 2020-03 (Data Sharing Agreements)

---

## 1. Third-Party Processor & Cross-Border Transfer Checklist (Sec. 21; IRR Sec. 43–45)

| Processor                                               | Purpose                                                                | Hosting / Region                                    | Required Governance Document                                                             |
| :------------------------------------------------------ | :--------------------------------------------------------------------- | :-------------------------------------------------- | :--------------------------------------------------------------------------------------- |
| **Google LLC (Firebase / GCP)**                         | Authentication, Cloud Firestore, App Hosting, Cloud Functions          | `asia-southeast1` (Singapore) & Google Cloud Global | Google Cloud Data Processing Addendum (CDPA) accepted in Google Cloud / Firebase Console |
| **Google LLC (Google Workspace / Drive & Apps Script)** | Institutional EOMS document storage & link validation                  | Google Workspace Cloud                              | Google Workspace / Cloud DPA & institutional Drive folder access policy                  |
| **Upstash, Inc. (Upstash Redis)**                       | Serverless API rate limiting (IP / UID counters only, no PII payloads) | Cloud Redis (`UPSTASH_REDIS_REST_URL`)              | Upstash Data Processing Agreement (DPA) & minimal-key TTL policy                         |

---

## 2. Data Breach Response Team (DBRT) & 72-Hour Notification Runbook (IRR Sec. 38; NPC Circular 16-03)

1. **Detection & Containment (0–4 Hours):**
   - Monitor Firestore `errorReports`, `activityLogs`, and Firebase Auth / App Hosting logs.
   - Immediately revoke compromised credentials, rotate `NEXT_PUBLIC_ATTENDANCE_*` salts and `FIREBASE_SERVICE_ACCOUNT` keys, and tighten affected `firestore.rules`.
2. **Assessment & Escalation (4–24 Hours):**
   - Report incident to the **RSU Data Protection Officer (`dpo@rsu.edu.ph`)** and DBRT.
   - Determine whether sensitive personal information or credentials of data subjects were exposed, triggering mandatory notification criteria (NPC Circular 16-03).
3. **Mandatory Notification (Within 72 Hours):**
   - DPO notifies the **National Privacy Commission (NPC)** and affected data subjects within **72 hours** of knowledge/reasonable belief of a reportable breach.
4. **Post-Incident Review & Documentation:**
   - Record root cause, affected records, containment actions, and preventive updates in the DPO Risk Register and PIA.

---

## 3. Data Subject Rights (DSR) Fulfillment Procedure (Sec. 16–18)

- **Access & Portability (`exportUserData`):** Use the `exportUserData` Cloud Function (`asia-southeast1`) to export a data subject's profile, submissions, risks, and activity logs in structured JSON.
- **Rectification:** Users may update their profile via `/profile`; `syncUserProfileChanges` automatically propagates changes across denormalized collections.
- **Erasure / Blocking (`eraseUserData`):** Upon DPO-verified erasure request, Admins invoke `eraseUserData` to redact `users/{uid}` and scrub denormalized names across `activityLogs`, `risks`, `softwareEvaluations`, `unitActivityAttendanceLogs`, `unitFormRequests`, and `unitMonitoringRecords`.
- **Automated Retention (`enforceDataRetentionPolicy`):** Runs weekly (`every sunday 02:00`, `Asia/Manila`) to anonymize `visitorLogs` older than 365 days and purge `unitActivityAttendanceLogs`, `errorReports`, and `activityLogs` older than 730 days (2 years).
