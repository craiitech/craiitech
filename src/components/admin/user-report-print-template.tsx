'use client';

import React from 'react';
import type { User, Role, Campus, Unit, Signatories } from '@/lib/types';
import { UniversityHeading } from '@/components/common/university-heading';
import { format } from 'date-fns';

export interface UserReportPrintTemplateProps {
  users: User[];
  roles: Role[];
  campuses: Campus[];
  units: Unit[];
  signatories?: Signatories | null;
  generatedBy?: string;
  scopeTitle?: string;
  selectedCampusName?: string;
  selectedStatusName?: string;
}

export function UserReportPrintTemplate({
  users,
  roles,
  campuses,
  units,
  signatories,
  generatedBy = 'System Administrator',
  scopeTitle = 'Approved Bona Fide User Registry',
  selectedCampusName = 'All Campuses',
  selectedStatusName = 'Approved / Verified Accounts Only',
}: UserReportPrintTemplateProps) {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const formattedCurrentDate = format(currentDate, 'MMMM d, yyyy');
  const refNo = `RSU-QAO-USR-${currentYear}-${format(currentDate, 'MMdd')}`;

  const roleMap = React.useMemo(() => new Map(roles.map((r) => [r.id, r.name])), [roles]);
  const campusMap = React.useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = React.useMemo(() => new Map(units.map((u) => [u.id, u.name])), [units]);

  // Valid registered IDs in the system
  const validCampusIds = React.useMemo(() => new Set(campuses.map((c) => c.id)), [campuses]);
  const validRoleIds = React.useMemo(() => new Set(roles.map((r) => r.id)), [roles]);
  const validUnitIds = React.useMemo(() => new Set(units.map((u) => u.id)), [units]);

  // FILTER: Exclude any accounts that are not yet approved/verified (only bona fide users)
  const approvedUsers = React.useMemo(() => {
    return users.filter((u) => Boolean(u.verified));
  }, [users]);

  // Statistics calculation for approved bona fide users
  const totalApprovedUsers = approvedUsers.length;

  // Only count valid registered campuses represented by approved users
  const distinctCampuses = React.useMemo(() => {
    const represented = new Set(
      approvedUsers.map((u) => u.campusId).filter((id): id is string => Boolean(id) && validCampusIds.has(id)),
    );
    return represented.size;
  }, [approvedUsers, validCampusIds]);

  const resolveUserUnitName = React.useCallback(
    (user: User) => {
      if (user.unitId && unitMap.has(user.unitId)) {
        return unitMap.get(user.unitId)!;
      }
      if (user.unitName && user.unitName.trim() !== '') {
        return user.unitName;
      }
      const roleName = roleMap.get(user.roleId) || user.role || '';
      const roleLower = roleName.toLowerCase();

      if (roleLower.includes('campus odimo') || roleLower.includes('campus director')) {
        const directorUnit = units.find(
          (u) =>
            u.campusIds?.includes(user.campusId) &&
            (u.name.toLowerCase().includes('campus director') ||
              u.name.toLowerCase().includes('office of the campus director')),
        );
        return directorUnit?.name || 'Office of the Campus Director';
      }

      if (roleLower === 'auditor') {
        const iqaUnit = units.find(
          (u) => u.name.toLowerCase() === 'internal quality audit' || u.name.toLowerCase() === 'iqa',
        );
        return iqaUnit?.name || 'Internal Quality Audit';
      }

      return 'Unassigned';
    },
    [unitMap, roleMap, units],
  );

  // Only count valid registered operating units represented by approved users
  const distinctUnits = React.useMemo(() => {
    const represented = new Set(
      approvedUsers
        .map((u) => {
          if (u.unitId && validUnitIds.has(u.unitId)) return u.unitId;
          const resolved = resolveUserUnitName(u);
          if (resolved !== 'Unassigned') {
            const matchedUnit = units.find((un) => un.name.toLowerCase() === resolved.toLowerCase());
            if (matchedUnit) return matchedUnit.id;
            return resolved;
          }
          return null;
        })
        .filter((id): id is string => Boolean(id)),
    );
    return represented.size;
  }, [approvedUsers, validUnitIds, resolveUserUnitName, units]);

  // Only count valid registered roles represented by approved users
  const distinctRoles = React.useMemo(() => {
    const represented = new Set(
      approvedUsers.map((u) => u.roleId).filter((id): id is string => Boolean(id) && validRoleIds.has(id)),
    );
    return represented.size;
  }, [approvedUsers, validRoleIds]);

  // Sorted list: by Campus, then Unit, then Last Name
  const sortedUsers = React.useMemo(() => {
    return [...approvedUsers].sort((a, b) => {
      const campA = campusMap.get(a.campusId) || '';
      const campB = campusMap.get(b.campusId) || '';
      if (campA !== campB) return campA.localeCompare(campB);

      const unitA = resolveUserUnitName(a);
      const unitB = resolveUserUnitName(b);
      if (unitA !== unitB) return unitA.localeCompare(unitB);

      const nameA = `${a.lastName || ''}, ${a.firstName || ''}`;
      const nameB = `${b.lastName || ''}, ${b.firstName || ''}`;
      return nameA.localeCompare(nameB);
    });
  }, [approvedUsers, campusMap, resolveUserUnitName]);

  const qaoDirector = signatories?.qaoDirector || 'Director, Quality Assurance Office';

  return (
    <div
      className="p-8 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-tight print:p-0 print:max-w-full"
      style={{ fontSize: '9pt' }}
    >
      <style>{`
        @media print {
          @page {
            size: 8.5in 13in portrait;
            margin: 0.4in;
          }
          body {
            background: white !important;
            color: black !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          thead {
            display: table-header-group;
          }
        }
      `}</style>

      {/* TOPMOST: "Updated as of: " SECTION (CURRENT DATE ONLY, NO TIME) */}
      <div className="flex justify-between items-center text-[8.5pt] border-b border-slate-400 pb-1 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-slate-700">Updated as of:</span>
          <span className="font-black text-slate-900 tracking-wide">{formattedCurrentDate}</span>
        </div>
        <div className="text-[7.5pt] font-mono text-slate-600">Ref: {refNo}</div>
      </div>

      {/* STANDARD UNIVERSITY HEADING */}
      <UniversityHeading
        officeName="QUALITY ASSURANCE OFFICE"
        subOffice="Institutional EOMS Portal & User Governance Registry"
        reportTitle="OFFICIAL BONA FIDE USER DIRECTORY & ACCESS REGISTRY REPORT"
        reportSubtitle="Educational Organizations Management Systems (ISO 21001:2018) Approved Personnel Record"
        refNo={refNo}
        datePrinted={formattedCurrentDate}
      />

      {/* METADATA & PARAMETERS STRIP */}
      <table className="w-full border-collapse border border-black text-[8pt] mb-3">
        <tbody>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[18%]">REPORT SCOPE:</td>
            <td className="border border-black p-1.5 font-semibold w-[32%]">{scopeTitle}</td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase w-[18%]">CAMPUS FILTER:</td>
            <td className="border border-black p-1.5 font-semibold w-[32%]">{selectedCampusName}</td>
          </tr>
          <tr>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">STATUS SCOPE:</td>
            <td className="border border-black p-1.5 font-semibold text-emerald-800">{selectedStatusName}</td>
            <td className="border border-black p-1.5 font-bold bg-slate-100 uppercase">GENERATED BY:</td>
            <td className="border border-black p-1.5 font-semibold">{generatedBy}</td>
          </tr>
        </tbody>
      </table>

      {/* SUMMARY KPI METRIC BOXES (BONA FIDE USERS ONLY) */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-center">
        <div className="border border-emerald-700 p-2 rounded bg-emerald-50/70">
          <p className="text-[6.5pt] font-black uppercase text-emerald-800 tracking-wider m-0">Approved Users</p>
          <p className="text-lg font-black text-emerald-700 m-0 my-0.5">{totalApprovedUsers}</p>
          <p className="text-[6.5pt] text-emerald-700 m-0 font-bold">Bona Fide Accounts</p>
        </div>
        <div className="border border-slate-900 p-2 rounded bg-slate-50">
          <p className="text-[6.5pt] font-black uppercase text-slate-600 tracking-wider m-0">Campuses</p>
          <p className="text-lg font-black text-slate-900 m-0 my-0.5">{distinctCampuses}</p>
          <p className="text-[6.5pt] text-slate-500 m-0 font-medium">
            {campuses.length > 0 ? `of ${campuses.length} Registered Sites` : 'Represented'}
          </p>
        </div>
        <div className="border border-slate-900 p-2 rounded bg-slate-50">
          <p className="text-[6.5pt] font-black uppercase text-slate-600 tracking-wider m-0">Operating Units</p>
          <p className="text-lg font-black text-slate-900 m-0 my-0.5">{distinctUnits}</p>
          <p className="text-[6.5pt] text-slate-500 m-0 font-medium">
            {units.length > 0 ? `of ${units.length} Units/Offices` : 'Active Units'}
          </p>
        </div>
        <div className="border border-slate-900 p-2 rounded bg-slate-50">
          <p className="text-[6.5pt] font-black uppercase text-slate-600 tracking-wider m-0">Roles</p>
          <p className="text-lg font-black text-slate-900 m-0 my-0.5">{distinctRoles}</p>
          <p className="text-[6.5pt] text-slate-500 m-0 font-medium">
            {roles.length > 0 ? `of ${roles.length} Registered Profiles` : 'Permission Profiles'}
          </p>
        </div>
      </div>

      {/* USER DIRECTORY TABLE (APPROVED USERS ONLY) */}
      <table className="w-full border-collapse border-2 border-slate-900 text-[8pt] mb-6">
        <thead>
          <tr className="bg-slate-100 font-black text-slate-900 uppercase">
            <th className="border border-slate-900 p-1.5 text-center w-[4%]">#</th>
            <th className="border border-slate-900 p-1.5 text-left w-[22%]">User Name</th>
            <th className="border border-slate-900 p-1.5 text-left w-[24%]">Institutional Email</th>
            <th className="border border-slate-900 p-1.5 text-left w-[14%]">Role</th>
            <th className="border border-slate-900 p-1.5 text-left w-[14%]">Campus</th>
            <th className="border border-slate-900 p-1.5 text-left w-[12%]">Operating Unit</th>
            <th className="border border-slate-900 p-1.5 text-center w-[10%]">Status</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user, idx) => {
            const roleName = roleMap.get(user.roleId) || user.role || 'Unassigned';
            const campusName = campusMap.get(user.campusId) || 'Unassigned';
            const unitName = resolveUserUnitName(user);
            const fullName = `${user.lastName || ''}, ${user.firstName || ''}`.trim() || '—';

            return (
              <tr key={user.id || idx} className="hover:bg-slate-50">
                <td className="border border-slate-800 p-1.5 text-center font-mono text-[7.5pt]">{idx + 1}</td>
                <td className="border border-slate-800 p-1.5 font-bold text-slate-900">{fullName}</td>
                <td className="border border-slate-800 p-1.5 font-mono text-[7.5pt] break-all">{user.email || '—'}</td>
                <td className="border border-slate-800 p-1.5">{roleName}</td>
                <td className="border border-slate-800 p-1.5">{campusName}</td>
                <td className="border border-slate-800 p-1.5">{unitName}</td>
                <td className="border border-slate-800 p-1.5 text-center text-[7.5pt] uppercase text-emerald-700 font-bold">
                  APPROVED
                </td>
              </tr>
            );
          })}
          {sortedUsers.length === 0 && (
            <tr>
              <td colSpan={7} className="border border-slate-800 p-6 text-center italic text-slate-500">
                No approved bona fide user records found matching the specified report criteria.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* INSTITUTIONAL SIGNATORIES BLOCK (2-COLUMN: SYSTEM ADMIN & QAO DIRECTOR) */}
      <div className="pt-4 border-t-2 border-slate-900 mt-6" style={{ pageBreakInside: 'avoid' }}>
        <p className="text-[7.5pt] font-black uppercase tracking-wider text-slate-700 mb-6">
          Institutional Verification & Document Endorsement:
        </p>

        <div className="grid grid-cols-2 gap-12 max-w-2xl text-[8pt]">
          {/* Prepared By */}
          <div>
            <p className="text-slate-500 mb-8 font-medium">Prepared & Generated by:</p>
            <p className="font-black uppercase text-slate-900 border-b border-black pb-1 leading-none">{generatedBy}</p>
            <p className="text-[7pt] text-slate-600 mt-1">System Administrator / User Manager</p>
            <p className="text-[6.5pt] text-slate-400 mt-0.5">Romblon State University EOMS Portal</p>
          </div>

          {/* Reviewed & Endorsed By */}
          <div>
            <p className="text-slate-500 mb-8 font-medium">Reviewed & Endorsed by:</p>
            <p className="font-black uppercase text-slate-900 border-b border-black pb-1 leading-none">{qaoDirector}</p>
            <p className="text-[7pt] text-slate-600 mt-1">Director, Quality Assurance Office</p>
            <p className="text-[6.5pt] text-slate-400 mt-0.5">Romblon State University</p>
          </div>
        </div>

        {/* SYSTEM CONTROL FOOTNOTE (DATE ONLY, NO TIME) */}
        <div className="mt-8 pt-2 border-t border-slate-200 text-center text-[6.5pt] text-slate-500">
          Official Romblon State University Electronic Document • Generated via RSU EOMS Portal Quality Management
          Information System • Ref: {refNo} • {formattedCurrentDate}
        </div>
      </div>
    </div>
  );
}

export default UserReportPrintTemplate;
