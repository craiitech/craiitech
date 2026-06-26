export type PermissionGroup = {
  label: string
  permissions: Record<string, string>
}

export const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  submissions: {
    label: 'Submissions',
    permissions: {
      'submissions.create': 'Create',
      'submissions.view_all': 'View All (Cross-Unit)',
      'submissions.edit': 'Edit',
      'submissions.delete': 'Delete',
      'submissions.approve': 'Approve / Reject',
    },
  },
  risks: {
    label: 'Risk & Opportunity',
    permissions: {
      'risks.create': 'Create',
      'risks.view_all': 'View All (Cross-Unit)',
      'risks.edit': 'Edit',
      'risks.delete': 'Delete',
      'risks.approve': 'Approve',
    },
  },
  users: {
    label: 'User Management',
    permissions: {
      'users.view': 'View Users',
      'users.create': 'Create Users',
      'users.edit': 'Edit Users',
      'users.delete': 'Delete Users',
    },
  },
  roles: {
    label: 'Role Management',
    permissions: {
      'roles.view': 'View Roles',
      'roles.create': 'Create Roles',
      'roles.edit': 'Edit Roles',
      'roles.delete': 'Delete Roles',
      'roles.manage_permissions': 'Manage Permissions',
    },
  },
  settings: {
    label: 'System Settings',
    permissions: {
      'settings.access': 'Access Settings Page',
      'settings.system_logo': 'Manage System Logo',
      'settings.signatories': 'Manage Signatories',
      'settings.campuses': 'Manage Campuses',
      'settings.units': 'Manage Units',
    },
  },
  reports: {
    label: 'Reports & Analytics',
    permissions: {
      'reports.view': 'View Reports',
      'reports.export': 'Export Data',
    },
  },
  audit: {
    label: 'Internal Quality Audit',
    permissions: {
      'audit.view': 'View Audit Plans',
      'audit.create': 'Create Audit Plans',
      'audit.edit': 'Edit Audit Plans',
      'audit.delete': 'Delete Audit Plans',
      'audit.conduct': 'Conduct Audits',
      'audit.manage_findings': 'Manage Findings',
    },
  },
  car: {
    label: 'Corrective Action Requests',
    permissions: {
      'car.create': 'Create',
      'car.view_all': 'View All (Cross-Unit)',
      'car.edit': 'Edit',
      'car.delete': 'Delete',
      'car.verify': 'Verify / Close',
    },
  },
  communications: {
    label: 'Communications',
    permissions: {
      'comm.create': 'Create',
      'comm.view_all': 'View All',
      'comm.delete': 'Delete',
    },
  },
  campuses: {
    label: 'Campus Management',
    permissions: {
      'campuses.view': 'View Campuses',
      'campuses.create': 'Create Campuses',
      'campuses.edit': 'Edit Campuses',
      'campuses.delete': 'Delete Campuses',
    },
  },
  units: {
    label: 'Unit Management',
    permissions: {
      'units.view': 'View Units',
      'units.create': 'Create Units',
      'units.edit': 'Edit Units',
      'units.delete': 'Delete Units',
    },
  },
  gad: {
    label: 'GAD Corner',
    permissions: {
      'gad.manage_settings': 'Manage Settings',
      'gad.view_all': 'View All Records',
    },
  },
  programs: {
    label: 'Academic Programs',
    permissions: {
      'programs.view': 'View Programs',
      'programs.create': 'Create Programs',
      'programs.edit': 'Edit Programs',
      'programs.delete': 'Delete Programs',
    },
  },
  faculty_eval: {
    label: 'Faculty Evaluation',
    permissions: {
      'eval.view_results': 'View Results',
      'eval.manage_cycles': 'Manage Cycles',
    },
  },
  manuals: {
    label: 'Procedure Manuals',
    permissions: {
      'manuals.view_all': 'View All',
      'manuals.manage': 'Manage',
    },
  },
  activity_log: {
    label: 'Activity Log',
    permissions: {
      'activity_log.view_all': 'View All Logs',
    },
  },
  monitoring: {
    label: 'Unit Monitoring',
    permissions: {
      'monitoring.view_all': 'View All Records',
      'monitoring.create': 'Create Records',
    },
  },
  visitor_log: {
    label: 'Visitor Logbook',
    permissions: {
      'visitor_log.view_all': 'View All Logs',
    },
  },
  strategic: {
    label: 'Strategic Dashboard',
    permissions: {
      'strategic.view': 'View Dashboard',
    },
  },
  kpi: {
    label: 'KPI Management',
    permissions: {
      'kpi.view': 'View KPI Dashboard',
      'kpi.manage': 'Manage KPI Definitions',
      'kpi.export': 'Export KPI Data',
    },
  },
  okr: {
    label: 'OKR Management',
    permissions: {
      'okr.view': 'View OKRs',
      'okr.create': 'Create OKRs',
      'okr.edit': 'Edit OKRs',
      'okr.delete': 'Delete OKRs',
      'okr.view_all': 'View All OKRs',
      'okr.check_in': 'Perform Check-ins',
    },
  },
}

export const ALL_PERMISSION_IDS: string[] = Object.values(PERMISSION_GROUPS).flatMap(
  (g) => Object.keys(g.permissions),
)

export function getDefaultPermissions(roleName: string): Record<string, boolean> {
  const lower = roleName.toLowerCase()
  const isAdminRole = lower.includes('admin')
  const isVp = lower.includes('vice president')
  const isAuditor = lower.includes('auditor')
  const isSupervisor =
    isAdminRole ||
    isVp ||
    lower.includes('director') ||
    lower.includes('odimo') ||
    lower.includes('president') ||
    lower.includes('head') ||
    lower.includes('dean of instruction') ||
    lower === 'doi'

  if (isAdminRole) {
    const all: Record<string, boolean> = {}
    for (const id of ALL_PERMISSION_IDS) all[id] = true
    return all
  }

  const perms: Record<string, boolean> = {
    'submissions.create': true,
    'risks.create': true,
    'car.create': true,
    'comm.create': true,
    'programs.view': true,
    'manuals.view_all': true,
    'visitor_log.view_all': true,
    'activity_log.view_all': true,
    'kpi.view': true,
    'okr.view': true,
    'okr.check_in': true,
  }

  if (isSupervisor) {
    perms['submissions.view_all'] = true
    perms['submissions.approve'] = true
    perms['submissions.edit'] = true
    perms['submissions.delete'] = true
    perms['risks.view_all'] = true
    perms['risks.approve'] = true
    perms['risks.edit'] = true
    perms['risks.delete'] = true
    perms['car.view_all'] = true
    perms['car.verify'] = true
    perms['car.edit'] = true
    perms['car.delete'] = true
    perms['reports.view'] = true
    perms['reports.export'] = true
    perms['monitoring.view_all'] = true
    perms['monitoring.create'] = true
    perms['gad.view_all'] = true
    perms['strategic.view'] = true
    perms['eval.view_results'] = true
    perms['kpi.manage'] = true
    perms['kpi.export'] = true
    perms['okr.create'] = true
    perms['okr.edit'] = true
    perms['okr.view_all'] = true
    perms['users.view'] = true
    perms['units.view'] = true
    perms['campuses.view'] = true
    perms['comm.view_all'] = true
    perms['settings.access'] = true
    if (!isAdminRole) {
      perms['settings.campuses'] = true
      perms['settings.units'] = true
    }
  }

  if (isAuditor) {
    perms['audit.view'] = true
    perms['audit.conduct'] = true
    perms['audit.manage_findings'] = true
    perms['car.view_all'] = true
  }

  if (isVp) {
    perms['programs.view'] = true
    perms['programs.create'] = true
    perms['programs.edit'] = true
    perms['programs.delete'] = true
    perms['eval.view_results'] = true
    perms['eval.manage_cycles'] = true
  }

  return perms
}
