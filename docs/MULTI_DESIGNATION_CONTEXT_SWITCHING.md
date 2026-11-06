# Single Institutional Identity with Active Context Switching

## Architecture & Implementation Blueprint for Multi-Designation Faculty & Staff

> **Target Version:** RSU Quality Portal v2.5  
> **Status:** Planning / Architecture Specification  
> **Author:** Antigravity AI & Romblon State University EOMS Team  
> **Primary Goal:** Enable university personnel with multiple roles, designations, and offices to use a single `@rsu.edu.ph` account, with zero disruption to existing single-unit accounts.

---

## 1. Executive Summary & Problem Definition

In state universities, faculty members frequently hold **concurrent administrative designations**:

- _Example 1:_ An Associate Professor in the **College of Education** is concurrently the **Director of Quality Assurance (QAO)**.
- _Example 2:_ A Faculty member in the **College of Engineering** is concurrently designated as the **GAD Focal Person** and **Research Coordinator**.

### The Problem With Single-Unit Accounts:

1. **Account Proliferation:** Users are forced to register secondary personal Gmail accounts (`marvin.qao@gmail.com`, `marvin.ced@gmail.com`) to manage their different offices.
2. **Security & Quota Vulnerability:** Having open registration to accommodate personal Gmail accounts exposes the free Firebase Spark tier to external bot attacks and quota exhaustion (50,000 daily read limit).
3. **Audit Trail Confusion:** ISO 21001 audits require clear accountability. Personal emails obscure official university actions.

---

## 2. Architectural Blueprint: Single Sign-On + Active Context Switching

### Core Concept:

- **One Identity:** The user authenticates once using their official university email (`juan.cruz@rsu.edu.ph`).
- **Multiple Designations:** Their user profile contains an array of assigned offices and roles.
- **Active Session Context:** A switcher in the top navigation bar toggles their current active role/unit. All dashboards, submissions, and forms react dynamically to the active context.

```
       [ Authenticated as: Dr. Juan Cruz (juan.cruz@rsu.edu.ph) ]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   Active Context: [ Office of Quality Assurance ▼ ]
   ┌─────────────────────────────────────────────────────────────┐
   │  ✓ Director, Quality Assurance Office (Main Campus)          │  <-- Active
   │    Associate Professor, College of Education (Main Campus)   │
   │    Focal Person, Gender and Development (Main Campus)        │
   └─────────────────────────────────────────────────────────────┘
```

---

## 3. Data Schema & 100% Backward Compatibility

To avoid breaking existing users who only have one unit, all existing fields (`unitId`, `role`, `campusId`) remain intact as the **primary fallback**.

### 3.1 Type Definitions (`src/lib/types.ts`)

```typescript
export type UserAssignment = {
  id: string; // Unique assignment ID (e.g., "asgn_qao_head")
  unitId: string; // Target Unit ID
  unitName: string; // e.g. "Quality Assurance Office"
  campusId: string; // e.g. "main"
  campusName: string; // e.g. "Main Campus"
  role: string; // e.g. "Director", "Unit Head", "Faculty"
  roleId?: string; // Corresponding Role document ID
  isPrimary?: boolean; // Marks default assignment upon initial login
  assignedAt?: string; // ISO Date
};

// Extension to existing User type:
export type User = {
  // Existing legacy fields (Preserved for full backward compatibility)
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  roleId: string;
  role: string;
  campusId: string;
  unitId: string;
  unitName?: string;

  // NEW: Multi-Designation Support
  assignments?: UserAssignment[];
  assignedUnitIds?: string[]; // Denormalized string array for fast Firestore Rules

  // Client-side Active Context (stored in session or profile)
  activeAssignmentId?: string;
};
```

---

## 4. Security & Permissions (Firestore Rules)

Currently, [`firestore.rules`](file:///Users/coolviper01/PROJECTS/craiitech/firestore.rules) checks `profile().get('unitId', '') == resource.data.unitId`.

### Updated Helper in `firestore.rules`:

```javascript
// Function checking if user has rights to the target unit (primary or assigned)
function hasUnitAccess(targetUnitId) {
  return isSignedIn() && hasProfile() && (
    isAdmin() ||
    profile().get('unitId', '') == targetUnitId ||
    profile().get('assignedUnitIds', []).hasAny([targetUnitId])
  );
}

// Updated write rule for submissions / operational plans:
allow create: if isSignedIn() && hasProfile() && (
  isAdmin() ||
  hasUnitAccess(request.resource.data.unitId) ||
  (
    profile().get('campusId', '') == request.resource.data.campusId &&
    profile().get('role', '').matches('(?i).*(director|odimo|admin|head|coordinator).*')
  )
);

allow update: if isSignedIn() && hasProfile() && (
  isAdmin() ||
  hasUnitAccess(resource.data.unitId) ||
  (
    profile().get('campusId', '') == resource.data.campusId &&
    profile().get('role', '').matches('(?i).*(director|odimo|admin|head|coordinator).*')
  )
);
```

> [!TIP]
> Storing `assignedUnitIds: ['unitA', 'unitB']` directly as a string array allows Firestore Rules to perform an instant `hasAny()` check without querying any subcollections, keeping execution time and billing at zero extra reads.

---

## 5. Client-Side Context Management (`useUser()`)

In [`src/firebase/provider.tsx`](file:///Users/coolviper01/PROJECTS/craiitech/src/firebase/provider.tsx):

1. **Session State:**
   - Store `activeAssignment: UserAssignment | null` in React state.
   - Default value: Look up `localStorage.getItem('rsu_active_assignment_id')`.
   - Fallback: The assignment marked `isPrimary === true`, or synthesize from legacy `userProfile.unitId` / `userProfile.role`.
2. **Expose Context Switcher in Hook:**
   ```typescript
   const {
     userProfile,
     activeAssignment,
     setActiveAssignmentId, // Function to switch active office
     userRole, // Returns activeAssignment?.role || userProfile.role
     userUnitId, // Returns activeAssignment?.unitId || userProfile.unitId
   } = useUser();
   ```

---

## 6. UI Implementation: Navbar Context Switcher

In [`src/components/dashboard/user-nav.tsx`](file:///Users/coolviper01/PROJECTS/craiitech/src/components/dashboard/user-nav.tsx):

Add a dropdown right next to the user's avatar when `userProfile.assignments.length > 1`:

```tsx
{
  assignments && assignments.length > 1 && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 gap-2 border-primary/20 bg-primary/5">
          <Building2 className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-bold max-w-[140px] truncate">
            {activeAssignment?.unitName || userProfile.unitName}
          </span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
          Active University Designation
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {assignments.map((asgn) => (
          <DropdownMenuItem
            key={asgn.id}
            onClick={() => handleSwitchContext(asgn.id)}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span className="font-bold text-xs">{asgn.unitName}</span>
              {asgn.id === activeAssignment?.id && <Check className="h-3.5 w-3.5 text-primary" />}
            </div>
            <span className="text-[10px] text-muted-foreground">
              {asgn.role} • {asgn.campusName}
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

---

## 7. Admin Assignment Management Interface

In [`src/components/admin/user-management.tsx`](file:///Users/coolviper01/PROJECTS/craiitech/src/components/admin/user-management.tsx):

When editing a user profile, the System Administrator or Campus ODIMO can:

1. View all assigned units for that user.
2. Click **"+ Add Designation"** to assign an additional Unit, Campus, and Role.
3. Automatically syncs `assignedUnitIds: ['...', '...']` on save.

---

## 8. Rollout Plan (Step-by-Step, Non-Disruptive)

| Phase       | Milestone                                                                       | Risk Level | User Impact                                                            |
| :---------- | :------------------------------------------------------------------------------ | :--------: | :--------------------------------------------------------------------- |
| **Phase 1** | Add `UserAssignment` to `types.ts` & update `provider.tsx` with fallback logic. |  **Zero**  | No visual change; existing users function exactly as before.           |
| **Phase 2** | Deploy updated `hasUnitAccess()` in `firestore.rules`.                          |  **Zero**  | Backward compatible; allows both single-unit and multi-unit access.    |
| **Phase 3** | Add **"+ Add Designation"** in Admin User Management.                           |  **Low**   | Admins can now assign secondary offices to specific faculty members.   |
| **Phase 4** | Add the **Designation Switcher** dropdown in `user-nav.tsx`.                    |  **Low**   | Appears only for users who have 2 or more assigned units.              |
| **Phase 5** | Enforce `@rsu.edu.ph` email restriction on the public sign-up page.             |  **Zero**  | Locks out external bots and permanently protects free Firebase quotas. |

---

## 9. Verification & Fallback Guarantees

1. **If a user has no `assignments` array:**
   The system automatically uses their existing `userProfile.unitId`, `userProfile.role`, and `userProfile.campusId`. They will notice zero difference.
2. **If an assigned office is removed by Admin:**
   If the user's active session was on that deleted unit, the system seamlessly falls back to their primary unit.
3. **Audit Trail Guarantee:**
   Every write to `submissions`, `qualityObjectives`, and `operationalPlanItems` records:
   - `userId`: `auth.uid`
   - `userEmail`: `name@rsu.edu.ph`
   - `actingUnitId`: active unit
   - `actingRole`: active designation
