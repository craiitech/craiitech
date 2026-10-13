# Data Handling Requirements

Based on the RSU EOMS/FIAMO system analysis, the following data handling requirements apply to all collected data across the platform.

## 1. Collection Requirements

### 1.1 Source Validation

- All data must originate from authorized sources only (Firebase Auth, configured forms, or system API calls)
- User-provided fields must be validated against expected types before storage
- Required fields must be present before submission (e.g., repair requests need category, description, location)

### 1.2 Collection Context

- Every data entry must include `campusId` and `unitId` for proper query filtering
- Timestamps must use `serverTimestamp()` for consistency across distributed clients
- User identity (`uid`) must be captured on creation for audit trails

### 1.3 Evidence Collection

- Evidence must be selected from system-configured types only (`/fiamoEvidenceTypes`)
- Free-text evidence fields are prohibited — must use dropdown from configured list
- Per-worker-type required evidence types must filter available options
- Evidence metadata (type, timestamp, uploader) must be persisted alongside the reference

## 2. Storage Requirements

### 2.1 Firestore Collection Structure

| Collection              | Notes                                                                                         |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| `/fiamoActivityLogs`    | Immutable logs only; system writes only                                                       |
| `/fiamoEvidenceTypes`   | Configurable by admins; contains `category`, `isRequired`, `sortOrder`                        |
| `/fiamoWorkerTypes`     | Maps to required evidence type IDs; contains `name`, `description`, `requiredEvidenceTypeIds` |
| `/repairRequests`       | State machine–driven; guardrails on transitions                                               |
| `/system/fiamoSettings` | Single config doc; enables/disables FIAMO, office name, role assignments                      |
| `/users`                | Extended with FIAMO fields: `fiamoRole`, `workerTypeId`, `workerTypeName`                     |

### 2.2 Document Identifiers

- Repair requests: auto-generated control numbers
- Settings: single document at `system/fiamoSettings`
- User profiles: `doc(firestore, 'users', uid)`
- Activity logs: auto-ID; must not be manually assigned

### 2.3 Data Nesting Limits

- Avoid deep nesting beyond 3 levels
- Use collection/document references where cross-collection relationships exist
- Store IDs only; fetch full data via queries

## 3. Validation Requirements

### 3.1 Field-Level Validation

- **Strings**: min/max length enforced; trim whitespace before storage
- **Numbers**: positive values only where applicable (likelihood, consequence magnitudes)
- **Enums**: validated against allowed values (risk type, status, evidence category)
- **Dates**: must be valid ISO strings; end dates must be >= start dates

### 3.2 Cross-Field Validation

- Repair request: `category` must be one of `[Ceiling, Roofing, ComfortRoom, Walls, Other]`
- Status transitions must follow: `Submitted → Reviewed → Assigned → InProgress → Completed → Filed`
- Only Unit Coordinator can transition `InProgress → Completed`
- Worker type must be assigned before evidence submission is allowed

### 3.3 Uniqueness Constraints

- Control numbers for repair requests must be unique across the system
- User email must be unique per Firebase Auth domain

## 4. Permission & Access Requirements

### 4.1 Role-Based Data Access

| Role             | Read Access                                     | Write Access                          |
| ---------------- | ----------------------------------------------- | ------------------------------------- |
| Unit Head        | Own repairRequests (where `requestedBy == uid`) | Submit new requests                   |
| Unit Coordinator | All in campus/unit                              | Review, assign, approve completion    |
| Unit ODIMO       | All in campus/unit                              | Read-only (no approval/assignment)    |
| FIAMO Staff      | Assigned tasks (where `assignedStaffId == uid`) | Execute, submit completion + evidence |
| VPAF             | All dashboard data                              | Oversight view only                   |
| Admin            | Full access across all collections              | Full CRUD                             |

### 4.2 Permission Checks

- Check role doc permissions first
- Fall back to default permissions per role
- Admin override available for emergency access
- All writes must go through permission-checked paths (Firebase Rules or server-side middleware)

### 4.3 Data Modification Restrictions

- Admins may modify any field
- Unit Heads may only modify their own submitted requests
- Unit Coordinators may review/assign/approve within their campus/unit
- Staff may only execute/complete tasks assigned to them
- ODIMOs may not write to any repairRequest document

## 5. State Machine Requirements (Repair Requests)

### 5.1 Valid Progression

```
Submitted → Reviewed → Assigned → InProgress → Completed → Filed
```

### 5.2 Transition Guardrails

| From → To              | Allowed By               | Conditions                              |
| ---------------------- | ------------------------ | --------------------------------------- |
| Submitted → Reviewed   | System/Any authenticated | Initial submission                      |
| Reviewed → Assigned    | Unit Coordinator         | Unit Coordinator assigns to staff       |
| Assigned → InProgress  | Assigned Staff           | Staff marks as started                  |
| InProgress → Completed | Unit Coordinator         | Only Coordinator can approve completion |
| Completed → Filed      | Unit Coordinator         | Final filing after verification         |

### 5.3 Invalid Transitions

- Any transition not in the valid progression sequence is rejected
- `Completed → InProgress` is not allowed (no re-opening completed requests)
- ODIMOs cannot initiate any transition

### 5.4 State Persistence

- Each transition must log an activity entry via `logFiamoActivity()`
- Old state must be preserved in the document for audit purposes
- Status badge UI must reflect current state only

## 6. Evidence Handling Requirements

### 6.1 Evidence Selection

- Available options sourced from `/fiamoEvidenceTypes` collection
- Only types marked as available for the user's worker type are shown
- Required evidence types show with `(Required)` badge
- Selection is final — changing evidence requires creating a new request

### 6.2 Evidence Metadata

- Each evidence entry must store:
  - `evidenceTypeId` (reference to `/fiamoEvidenceTypes`)
  - `url` / `path` (storage location)
  - `uploadedBy` (uid)
  - `uploadedAt` (server timestamp)
  - `isValid` (boolean, verified by coordinator)

### 6.3 Evidence Validation

- File type must match configured `category` (photo/document/checklist/receipt/signoff)
- File size limits enforced per category
- At least required number of evidence pieces must be submitted before status can advance
- Duplicate evidence (same type + url) is rejected

## 7. Logging Requirements

### 7.1 Activity Log Format

Every significant action must produce a log entry with:

```
{
  type: 'repair_request' | 'evidence' | 'status' | 'user',
  module: 'repair-requests' | 'fiamo-evidence' | ...,
  recordId: string (the affected document ID),
  userId: string (the acting user's uid),
  userName: string,
  userRole: string,
  description: string (human-readable action summary),
  details: object (optional, additional context),
  timestamp: serverTimestamp,
  campusId: string,
  unitId: string
}
```

### 7.2 Log Writing Rules

- **System-only writes**: `fiamoActivityLogs` collection is written by `logFiamoActivity()` helper
- **No client-side direct writes**: Use `logSessionActivity()` for session tracking only
- **Immutable once written**: Log documents must not be modified after creation
- **Retention**: Minimum 2 years per compliance requirements

### 7.3 Log Queryability

- Logs must be filterable by `recordId`, `userId`, `campusId`, `unitId`, `timestamp` range
- Admin queries can retrieve all logs; role-based queries filtered by permissions

## 8. Security & Privacy Requirements

### 8.1 Data Minimization

- Collect only fields necessary for the use case
- Remove or anonymize data no longer needed after closure
- Do not store personal identifiers beyond what's required for role assignment

### 8.2 Firestore Security Rules Pattern

```
match /repairRequests/{requestId} {
  allow read: if isUnitHead(requestId) ||
                isUnitCoordinator(requestId, request.resource.data.campusId, request.resource.data.unitId) ||
                isUnitOdimo(requestId, request.resource.data.campusId, request.resource.data.unitId) ||
                isFiamoStaff(requestId, request.resource.data.assignedStaffId) ||
                isVpaf(requestId) ||
                isAdmin(requestId);

  allow write: if isUnitHead(requestId && request.resource.data.requestedBy == request.auth.uid) ||
               isUnitCoordinator(requestId) && request.auth.token.role == 'unit_coordinator' &&
                 ['review', 'assign', 'approve'].has(request.auth.token.action) ||
               isFiamoStaff(requestId) && request.auth.token.action == 'execute' ||
               isAdmin(requestId);
}
```

### 8.3 Sensitive Data Fields

- Do not expose raw passwords, tokens, or secret keys in logs or UI
- User emails are visible only within the same domain/organization
- Campus/unit context must be included in all queries to prevent cross-campus data leakage

### 8.4 Data Export & Deletion

- Data export must respect role-based visibility limits
- Delete operations require admin authorization
- User-initiated data removal follows GDPR/POPIA guidelines with 30-day retention before purging

## 9. Compliance Checklist

### 9.1 Pre-Collection

- [ ] Verify data source authorization
- [ ] Confirm required fields are present
- [ ] Validate enum/choice fields against configured values
- [ ] Ensure campusId and unitId are attached

### 9.2 During Storage

- [ ] Use serverTimestamp() for all timestamps
- [ ] Write activity logs for state transitions
- [ ] Check permissions before write operation
- [ ] Validate evidence type availability

### 9.3 Post-Operation

- [ ] Verify data consistency across related collections
- [ ] Confirm state machine invariants are preserved
- [ ] Audit log entry created and stored
- [ ] Permissions properly enforced

### 9.4 Ongoing Maintenance

- [ ] Quarterly review of evidence type configuration
- [ ] Annual permission matrix audit
- [ ] Log retention policy review
- [ ] Type definitions updated when collections change
