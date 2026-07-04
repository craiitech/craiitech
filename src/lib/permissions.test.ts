import { describe, it, expect } from 'vitest';
import { getDefaultPermissions, ALL_PERMISSION_IDS, PERMISSION_GROUPS } from './permissions';

describe('PERMISSION_GROUPS', () => {
  it('has all permission IDs unique', () => {
    const allIds = Object.values(PERMISSION_GROUPS).flatMap((g) => Object.keys(g.permissions));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it('ALL_PERMISSION_IDS matches flat keys', () => {
    const flat = Object.values(PERMISSION_GROUPS).flatMap((g) => Object.keys(g.permissions));
    expect(ALL_PERMISSION_IDS.sort()).toEqual(flat.sort());
  });
});

describe('getDefaultPermissions', () => {
  it('grants all permissions for admin roles', () => {
    const perms = getDefaultPermissions('Admin');
    for (const id of ALL_PERMISSION_IDS) {
      expect(perms[id]).toBe(true);
    }
  });

  it('grants base permissions for regular roles', () => {
    const perms = getDefaultPermissions('Employee');
    expect(perms['submissions.create']).toBe(true);
    expect(perms['risks.create']).toBe(true);
    expect(perms['submissions.view_all']).toBeUndefined();
    expect(perms['submissions.approve']).toBeUndefined();
  });

  it('grants supervisor permissions for director roles', () => {
    const perms = getDefaultPermissions('Campus Director');
    expect(perms['submissions.view_all']).toBe(true);
    expect(perms['submissions.approve']).toBe(true);
    expect(perms['reports.view']).toBe(true);
    expect(perms['monitoring.create']).toBe(true);
  });

  it('grants auditor permissions', () => {
    const perms = getDefaultPermissions('Internal Auditor');
    expect(perms['audit.view']).toBe(true);
    expect(perms['audit.conduct']).toBe(true);
    expect(perms['audit.manage_findings']).toBe(true);
  });

  it('grants VP permissions for vice president roles', () => {
    const perms = getDefaultPermissions('Vice President for Academic Affairs');
    expect(perms['programs.create']).toBe(true);
    expect(perms['eval.manage_cycles']).toBe(true);
  });

  it('handles case-insensitive matching', () => {
    const adminPerms = getDefaultPermissions('ADMINISTRATOR');
    expect(adminPerms['submissions.create']).toBe(true);

    const directorPerms = getDefaultPermissions('CAMPUS DIRECTOR');
    expect(directorPerms['submissions.view_all']).toBe(true);
  });
});
