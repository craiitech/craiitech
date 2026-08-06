# FIAMO Monitoring System - Complete Implementation Plan

## Overview

FIAMO = Facilities, Infrastructure and Auxiliary Management Office
Responsible for: Physical Facilities Maintenance (buildings), Ground Maintenance, Plumbing Maintenance, Electrical Maintenance of the University

## Phase 1: MVP - Repair Request Module with Role-Based Access

### 1. Data Models (Added to `src/lib/types.ts`)

```typescript
// FIAMO Roles
export type FiamoRole =
  | 'Unit Coordinator' // FIAMO Approver - reviews, assigns, approves
  | 'Unit ODIMO' // FIAMO Overseer - read-only oversight
  | 'VPAF' // Vice President for Admin & Finance - budget dashboard
  | 'FIAMO Staff' // Assigned tasks by worker type, provides evidence
  | 'Unit Head' // Submits repair/vehicle requests
  | 'Driver/Operator/Mechanic'; // Vehicle tasks

// Repair Request
export type RepairCategory = 'Ceiling' | 'Roofing' | 'ComfortRoom' | 'Walls' | 'Other';

export type RepairRequestStatus = 'Submitted' | 'Reviewed' | 'Assigned' | 'InProgress' | 'Completed' | 'Filed';

export interface RepairRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  category: RepairCategory;
  description: string;
  location: string;
  status: RepairRequestStatus;
  assignedStaffId?: string;
  assignedStaffName?: string;
  assignedWorkerTypeId?: string;
  assignedWorkerTypeName?: string;
  programOfWorkRef?: string;
  completionNotes?: string;
  photos?: string[];
  evidenceSubmitted?: RepairCompletionEvidence[];
  approvedBy?: string;
  approvedByName?: string;
  approvedAt?: any;
  createdAt: any;
  reviewedAt?: any;
  assignedAt?: any;
  startedAt?: any;
  completedAt?: any;
  filedAt?: any;
  unitId: string;
  campusId: string;
}

// Evidence System
export interface RepairCompletionEvidence {
  evidenceTypeId: string;
  evidenceTypeLabel: string;
  evidenceCategory: 'photo' | 'document' | 'checklist' | 'receipt' | 'signoff';
  fileUrl?: string;
  remarks?: string;
  submittedAt: any;
  submittedBy: string;
  submittedByName: string;
}

export interface FiamoEvidenceType {
  id: string;
  label: string;
  description: string;
  category: 'photo' | 'document' | 'checklist' | 'receipt' | 'signoff';
  isRequired: boolean;
  sortOrder: number;
  campusId: string;
  unitId: string;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

export interface FiamoWorkerType {
  id: string;
  name: string;
  description: string;
  unitId: string;
  unitName?: string;
  campusId: string;
  requiredEvidenceTypeIds: string[];
  isActive: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: any;
  updatedAt?: any;
}

// Activity Log
export type FiamoActivityLogType =
  | 'repair_request_created'
  | 'repair_request_reviewed'
  | 'repair_request_assigned'
  | 'repair_request_started'
  | 'repair_request_completed'
  | 'repair_request_approved'
  | 'repair_request_filed'
  | 'repair_request_rejected'
  | 'evidence_submitted'
  | 'worker_type_created'
  | 'worker_type_updated'
  | 'evidence_type_created'
  | 'evidence_type_updated';

export interface FiamoActivityLog {
  id: string;
  type: FiamoActivityLogType;
  module: 'RepairRequest' | 'WorkerType' | 'EvidenceType';
  recordId: string;
  userId: string;
  userName: string;
  userRole: string;
  description: string;
  details?: Record<string, any>;
  timestamp: any;
  campusId: string;
  unitId: string;
}

// Settings
export interface FiamoSettings {
  enabled: boolean;
  officeName: string;
  directorId?: string;
  directorName?: string;
  coordinatorIds: string[];
  coordinatorNames: string[];
  odimoIds: string[];
  odimoNames: string[];
  vpafIds: string[];
  vpafNames: string[];
  staffIds: string[];
  campuses: string[];
  units: string[];
  notificationChannels: ('in-app' | 'email' | 'sms')[];
  presidentApprovalMode: 'digital' | 'pdf_upload';
  updatedAt: any;
  updatedBy: string;
}

// Extend User type
declare module '@/lib/types' {
  interface User {
    fiamoRole?: FiamoRole;
    workerTypeId?: string;
    workerTypeName?: string;
  }
}
```

### 2. Permissions (Added to `src/lib/permissions.ts`)

```typescript
fiamo: {
  label: 'FIAMO Monitoring',
  permissions: {
    'fiamo.repair_request.create': 'Submit Repair Request',
    'fiamo.repair_request.view_all': 'View All Repair Requests',
    'fiamo.repair_request.review': 'Review Repair Requests',
    'fiamo.repair_request.assign': 'Assign Repair Requests to Staff',
    'fiamo.repair_request.approve': 'Approve Repair Request Completion',
    'fiamo.repair_request.execute': 'Execute Assigned Repairs',
    'fiamo.repair_request.close': 'File Completed Repairs',
    'fiamo.worker_type.manage': 'Manage Worker Types',
    'fiamo.evidence_type.manage': 'Manage Evidence Types',
    'fiamo.settings.manage': 'Manage FIAMO Settings',
    'fiamo.dashboard.view': 'View FIAMO Dashboard',
    'fiamo.activity_log.view': 'View FIAMO Activity Log',
    'fiamo.oversight.view': 'View FIAMO Oversight (Read-only)',
  },
},
```

### 3. Role Detection (Updated `src/firebase/provider.tsx`)

Added FIAMO-specific role flags:

- `isUnitCoordinator` - role includes "unit coordinator"
- `isUnitOdimo` - role includes "unit odimo" or ("odimo" + "unit")
- `isVpaf` - role includes "vice president" + ("admin" or "finance")
- `isFiamoStaff` - role includes "fiamo staff" or "fiamo-staff"
- `isUnitHead` - role includes "unit head"
- `isDriverMechanic` - role includes "driver" or "mechanic" or "operator"

### 4. Permission Matrix for RepairRequest

| Action                                        | Unit Head | Unit Coordinator | Unit ODIMO | FIAMO Staff | VPAF | Admin |
| --------------------------------------------- | --------- | ---------------- | ---------- | ----------- | ---- | ----- |
| Submit Request                                | ✅        | ✅               | ✅         | ❌          | ❌   | ✅    |
| View All                                      | Own       | ✅               | ✅         | Assigned    | ✅   | ✅    |
| Review (Submitted→Reviewed)                   | ❌        | ✅               | ❌         | ❌          | ❌   | ✅    |
| Assign Staff (Reviewed→Assigned)              | ❌        | ✅               | ❌         | ❌          | ❌   | ✅    |
| Start Work (Assigned→InProgress)              | ❌        | ❌               | ❌         | ✅ (own)    | ❌   | ✅    |
| Submit Completion + Evidence                  | ❌        | ❌               | ❌         | ✅ (own)    | ❌   | ✅    |
| **Approve Completion** (InProgress→Completed) | ❌        | ✅               | ❌         | ❌          | ❌   | ✅    |
| File (Completed→Filed)                        | ❌        | ✅               | ❌         | ❌          | ❌   | ✅    |
| View Dashboard/KPIs                           | ❌        | ✅               | ✅         | ❌          | ✅   | ✅    |

### 5. State Machine for RepairRequest

```
Submitted → Reviewed → Assigned → InProgress → Completed → Filed
    ↑         ↑           ↑           ↑            ↑         ↑
 Unit Head  Coord.     Coord.      Staff       Staff      Coord.
```

Only **Unit Coordinator** can approve completion (InProgress → Completed).

### 6. Evidence Type System

**Configurable by Unit Coordinator in Settings:**

- Global evidence types (Photo - Before/After, Completion Report, Material Receipt/RIS, Inspection Checklist, Client Sign-off)
- Per worker type: required evidence type IDs
- Staff "My Tasks": Evidence dropdown shows ONLY required types for their worker type
- Cannot free-text - must select from system list

### 7. Components to Build

```
src/components/fiamo/
├── settings/
│   └── FiamoSettingsManagement.tsx      // Admin config + Evidence/Worker types
├── repair-request/
│   ├── RepairRequestForm.tsx            // Unit Head submit form
│   ├── RepairRequestInbox.tsx           // Unit Coordinator inbox (review/assign/approve)
│   ├── RepairRequestOversight.tsx       // Unit ODIMO read-only view
│   ├── RepairRequestMyTasks.tsx         // Staff my tasks with evidence selection
│   ├── RepairRequestList.tsx            // Shared list component
│   ├── RepairRequestCard.tsx            // Card display
│   └── RepairRequestDetail.tsx          // Detail view
├── activity-log/
│   └── FiamoActivityLog.tsx             // Auto-generated log viewer
└── shared/
    ├── FiamoStatusBadge.tsx             // Status indicators
    ├── FiamoRoleGuard.tsx               // Role-based rendering
    └── EvidenceSelector.tsx             // Evidence type dropdown

src/app/(dashboard)/fiamo/
├── page.tsx                             // Main FIAMO hub (tabs)
├── repair-requests/
│   ├── page.tsx                         // List view (all roles)
│   ├── new/page.tsx                     // Unit Head create
│   ├── inbox/page.tsx                   // Unit Coordinator inbox
│   ├── oversight/page.tsx               // Unit ODIMO oversight
│   ├── my-tasks/page.tsx                // Staff my tasks
│   └── [id]/page.tsx                    // Detail view
├── settings/
│   └── page.tsx                         // FIAMO settings (Unit Coordinator)
└── activity-log/
    └── page.tsx                         // Activity log viewer

src/app/(dashboard)/settings/
└── fiamo-settings/page.tsx              // Admin FIAMO configuration
```

### 8. Auto Activity Logging

Every status transition + evidence submission writes immutable log:

```typescript
async function logFiamoActivity(
  type: FiamoActivityLogType,
  module: 'RepairRequest' | 'WorkerType' | 'EvidenceType',
  recordId: string,
  userId: string,
  userName: string,
  userRole: string,
  description: string,
  details?: Record<string, any>,
) {
  await addDoc(collection(firestore, 'fiamoActivityLogs'), {
    type,
    module,
    recordId,
    userId,
    userName,
    userRole,
    description,
    details,
    timestamp: serverTimestamp(),
    campusId: userProfile.campusId,
    unitId: userProfile.unitId,
  });
}
```

### 9. Navigation Integration

Add to sidebar/layout:

```typescript
{
  label: 'FIAMO Monitoring',
  href: '/dashboard/fiamo',
  icon: Building2,
  roles: ['Unit Coordinator', 'Unit ODIMO', 'VPAF', 'FIAMO Staff', 'Unit Head', 'Driver/Operator/Mechanic'],
  permission: 'fiamo.dashboard.view'
}
```

### 10. Admin Settings (`/settings/fiamo`)

System Admin configures:

- Enable/disable FIAMO
- Office name
- Assign Unit Coordinator(s) - can approve
- Assign Unit ODIMO(s) - read-only oversight
- Assign VPAF(s) - budget dashboard
- Assign Staff
- Campuses/Units covered
- Notification channels
- President approval mode

Unit Coordinator manages (in `/fiamo/settings`):

- Worker Types (name, unit, required evidence types)
- Evidence Types (label, category, required, sort order)

---

## Phase 2: Maintenance Planning (Future)

- Annual Maintenance Plans (Building/Infrastructure vs Housekeeping)
- Inspection Checklists (Electrical, Water, Building, Housekeeping)
- Auto-escalation: Inspection "NeedsAction" → creates RepairRequest
- Dashboard KPIs

## Phase 3: Vehicle/Fleet Management (Future)

- Vehicle Registry
- Vehicle Maintenance Schedule + RIS
- Vehicle Request + Dispatch + Trip Tickets
- Auto-flag from trip completion → maintenance

## Phase 4: Polish (Future)

- Full Dashboard with all KPIs
- Filing/Log Search with filters
- File Attachments (photos, PDFs)
- Admin config enhancements

---

## Implementation Order

1. ✅ Types (`src/lib/types.ts`)
2. ✅ Permissions (`src/lib/permissions.ts`)
3. ✅ Role Detection (`src/firebase/provider.tsx`)
4. 🔄 FIAMO Settings Component (Admin + Unit Coordinator)
5. 🔄 Repair Request Module:
   - Unit Head Submit Form
   - Unit Coordinator Inbox
   - Unit ODIMO Oversight
   - Staff My Tasks with Evidence Selector
6. 🔄 Auto Activity Logging
7. 🔄 Navigation Integration
8. 🔄 Firestore Security Rules (to be added)

---

## Firestore Collections Needed

```
fiamoSettings (single doc at system/fiamoSettings)
fiamoEvidenceTypes (collection)
fiamoWorkerTypes (collection)
repairRequests (collection)
fiamoActivityLogs (collection)
```

---

## Security Rules Considerations

- Unit Head: read/write own repairRequests (where requestedBy == uid)
- Unit Coordinator: read all in campus/unit, write review/assign/approve
- Unit ODIMO: read all in campus/unit, no write
- FIAMO Staff: read assigned (where assignedStaffId == uid), write execute/complete
- VPAF: read all dashboard data
- Admin: full access
- Activity logs: read by permission, write by system only
