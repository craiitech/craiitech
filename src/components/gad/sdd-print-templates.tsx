'use client';

/**
 * @fileOverview Official Gender and Development (GAD) Sex-Disaggregated Data (SDD) print templates.
 */

import type { GadSettings, Signatories } from '@/lib/types';
import { format } from 'date-fns';

export type SDDCountPair = {
  male: number;
  female: number;
  total?: number;
};

export type SDDLevelRow = SDDCountPair & {
  label: string;
};

export type SDDSectorRow = SDDCountPair & {
  sector: string;
  total: number;
};

export type SDDTermBlock = {
  term: string;
  academicYear?: string;
  levels: SDDLevelRow[];
  sectors: SDDSectorRow[];
  male: number;
  female: number;
  total?: number;
};

export type SDDStudentSection = {
  title: string;
  terms: SDDTermBlock[];
  grand: SDDCountPair;
};

export type StudentSDDReportData = {
  academicYear: string;
  unitName: string;
  scopeLabel?: string;
  sections: SDDStudentSection[];
  appendices: SDDStudentSection[];
  grand: SDDCountPair;
};

export type SDDEmployeeGroup = {
  label: string;
  male: number;
  female: number;
  sectors: SDDSectorRow[];
};

export type SDDEmployeeUnitRow = {
  unitName: string;
  teachingMale: number;
  teachingFemale: number;
  nonTeachingMale: number;
  nonTeachingFemale: number;
};

export type SDDEmployeeYearBlock = {
  academicYear: string;
  groups: SDDEmployeeGroup[];
  units: SDDEmployeeUnitRow[];
  grand: SDDCountPair;
  showUnitBreakdown: boolean;
};

export type SDDEmployeeSection = {
  title: string;
  years: SDDEmployeeYearBlock[];
  grand: SDDCountPair;
};

export type EmployeeSDDReportData = {
  academicYear: string;
  unitName: string;
  scopeLabel?: string;
  sections: SDDEmployeeSection[];
  appendices: SDDEmployeeSection[];
  grand: SDDCountPair;
  note?: string;
};

interface SDDReportTemplateProps<T> {
  data: T;
  signatories?: Signatories;
  gadSettings?: GadSettings;
}

function ReportHeader({
  office,
  title,
  academicYear,
  unitName,
  subtitle,
}: {
  office: string;
  title: string;
  academicYear: string;
  unitName: string;
  subtitle: string;
}) {
  return (
    <div className="text-center mb-5 border-b-2 border-black pb-3">
      <h1 className="text-lg font-bold uppercase tracking-wide">Romblon State University</h1>
      <h2 className="text-base font-bold uppercase mt-1">{office}</h2>
      <h3 className="text-sm font-black uppercase mt-1">{title}</h3>
      <p className="text-[11px] font-black mt-1">Academic Year {academicYear}</p>
      <p className="text-[10px] italic mt-1 uppercase">{unitName}</p>
      <p className="text-[9px] mt-1 normal-case">{subtitle}</p>
    </div>
  );
}

function ReportFooter({ signatories, gadSettings }: { signatories?: Signatories; gadSettings?: GadSettings }) {
  const directorName = gadSettings?.gadDirector || signatories?.gadDirector || '';
  const presidentName = signatories?.universityPresident || '';

  return (
    <div className="mt-8 border-t border-black pt-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
      <p className="text-[9px] italic mb-4">
        This report is generated from the Sex-Disaggregated Data records maintained by the Gender and Development Office
        as of {format(new Date(), 'MMMM d, yyyy')}.
      </p>
      <div className="grid grid-cols-2 gap-8 text-[9px]">
        <div>
          <p className="font-bold uppercase">Prepared by:</p>
          <p className="mt-8 border-t border-black pt-1 font-black uppercase">{directorName || '—'}</p>
          <p className="text-[8px] uppercase">Gender and Development Director</p>
        </div>
        <div>
          <p className="font-bold uppercase">Approved by:</p>
          <p className="mt-8 border-t border-black pt-1 font-black uppercase">{presidentName || '—'}</p>
          <p className="text-[8px] uppercase">University President</p>
        </div>
      </div>
      <p className="mt-4 border-t border-black pt-2 text-center text-[8px] font-bold uppercase tracking-wide">
        This is a system-generated report. No signature is required.
      </p>
    </div>
  );
}

function TotalRow({ male, female, total, label = 'TOTAL' }: SDDCountPair & { label?: string }) {
  return (
    <tr className="bg-slate-100 font-black">
      <td className="border border-black p-1.5 uppercase">{label}</td>
      <td className="border border-black p-1.5 text-right tabular-nums">{male.toLocaleString()}</td>
      <td className="border border-black p-1.5 text-right tabular-nums">{female.toLocaleString()}</td>
      <td className="border border-black p-1.5 text-right tabular-nums">{(total ?? male + female).toLocaleString()}</td>
    </tr>
  );
}

function SectorTable({ sectors }: { sectors: SDDSectorRow[] }) {
  if (sectors.length === 0) {
    return <p className="text-[9px] italic opacity-70">No sectoral data recorded.</p>;
  }

  return (
    <table
      className="w-full border-collapse border border-black text-[9px]"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <thead>
        <tr className="bg-slate-200 font-black uppercase">
          <th className="border border-black p-1.5 text-left">Vulnerable / Priority Sector</th>
          <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
          <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
          <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
        </tr>
      </thead>
      <tbody>
        {sectors.map((sector) => (
          <tr key={sector.sector}>
            <td className="border border-black p-1.5">{sector.sector}</td>
            <td className="border border-black p-1.5 text-right tabular-nums">{sector.male.toLocaleString()}</td>
            <td className="border border-black p-1.5 text-right tabular-nums">{sector.female.toLocaleString()}</td>
            <td className="border border-black p-1.5 text-right tabular-nums">{sector.total.toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function groupTermsByYear(terms: SDDTermBlock[]) {
  return terms.reduce<{ academicYear?: string; terms: SDDTermBlock[] }[]>((groups, term) => {
    const key = term.academicYear || '';
    const lastGroup = groups[groups.length - 1];
    if (lastGroup && (lastGroup.academicYear || '') === key) {
      lastGroup.terms.push(term);
    } else {
      groups.push({ academicYear: term.academicYear, terms: [term] });
    }
    return groups;
  }, []);
}

function renderStudentTerm(term: SDDTermBlock, keyPrefix: string) {
  return (
    <div
      key={`${keyPrefix}-${term.academicYear || ''}-${term.term}`}
      className="mb-6"
      style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
    >
      <h4 className="bg-slate-200 border border-black font-black uppercase text-[10px] px-2 py-1">
        {term.academicYear ? `AY ${term.academicYear} — ${term.term}` : term.term}
      </h4>

      <table
        className="w-full border-collapse border border-black text-[9px] mb-3"
        style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
      >
        <thead>
          <tr className="bg-slate-100 font-black uppercase">
            <th className="border border-black p-1.5 text-left">Year Level</th>
            <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
            <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
            <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
          </tr>
        </thead>
        <tbody>
          {term.levels.map((level) => (
            <tr key={`${keyPrefix}-${level.label}`}>
              <td className="border border-black p-1.5">{level.label}</td>
              <td className="border border-black p-1.5 text-right tabular-nums">{level.male.toLocaleString()}</td>
              <td className="border border-black p-1.5 text-right tabular-nums">{level.female.toLocaleString()}</td>
              <td className="border border-black p-1.5 text-right tabular-nums">
                {(level.total ?? level.male + level.female).toLocaleString()}
              </td>
            </tr>
          ))}
          <TotalRow male={term.male} female={term.female} total={term.total} />
        </tbody>
      </table>

      <h5 className="font-black uppercase text-[9px] mb-1">Sectoral Disaggregation</h5>
      <SectorTable sectors={term.sectors} />
    </div>
  );
}

function StudentSectionBody({ section, sectionKey }: { section: SDDStudentSection; sectionKey: string }) {
  const termsByYear = groupTermsByYear(section.terms);
  const programMarker = ' — Program: ';
  const markerIndex = section.title.indexOf(programMarker);
  const campusLabel = markerIndex >= 0 ? section.title.slice(0, markerIndex) : '';
  const programName = markerIndex >= 0 ? section.title.slice(markerIndex + programMarker.length) : '';

  return (
    <>
      {section.title &&
        (programName ? (
          <div className="mb-4 border-b-2 border-black pb-1.5">
            <p className="text-[9px] font-black uppercase tracking-wide text-slate-600">{campusLabel}</p>
            <p
              className="mt-1 inline-block border border-indigo-900 bg-indigo-800 px-2.5 py-1 text-[13px] font-black uppercase tracking-wide text-white"
              style={{ WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
            >
              {programName}
            </p>
          </div>
        ) : (
          <h3 className="mb-3 border-b-2 border-black pb-1 text-[11px] font-black uppercase">{section.title}</h3>
        ))}
      {termsByYear.map((yearGroup, yearIndex) => (
        <div
          key={`${sectionKey}-year-${yearGroup.academicYear || yearIndex}`}
          style={{
            pageBreakBefore: yearIndex > 0 ? 'always' : undefined,
            breakBefore: yearIndex > 0 ? 'page' : undefined,
            pageBreakInside: 'avoid',
            breakInside: 'avoid',
          }}
        >
          {yearGroup.terms.map((term) => renderStudentTerm(term, sectionKey))}
        </div>
      ))}
      {programName && section.grand.male + section.grand.female > 0 && (
        <div className="mt-4" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <table
            className="w-full border-collapse border border-black text-[9px]"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <thead>
              <tr className="bg-slate-200 font-black uppercase">
                <th className="border border-black p-1.5 text-left">Program Total Enrollees</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
              </tr>
            </thead>
            <tbody>
              <TotalRow
                male={section.grand.male}
                female={section.grand.female}
                total={section.grand.total}
                label="Total Enrollees"
              />
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function SDDStudentReportTemplate({
  data,
  signatories,
  gadSettings,
}: SDDReportTemplateProps<StudentSDDReportData>) {
  const primaryTerms = data.sections.flatMap((section) => section.terms);

  return (
    <div className="p-4 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-tight text-[9px]">
      <ReportHeader
        office="Gender and Development (GAD)"
        title="Sex-Disaggregated Data (SDD) Report — Students"
        academicYear={data.academicYear}
        unitName={data.unitName}
        subtitle="Student enrollment by sex, year level, and vulnerable sector per semester"
      />

      {data.scopeLabel && (
        <p className="text-center text-[9px] font-bold uppercase tracking-wide mb-4">{data.scopeLabel}</p>
      )}

      {data.sections.length === 0 || primaryTerms.length === 0 ? (
        <p className="text-center italic py-8">
          No student enrollment data is available for the selected academic year.
        </p>
      ) : (
        <>
          {data.sections.map((section, sectionIndex) => (
            <div
              key={`primary-${section.title || sectionIndex}`}
              style={{
                pageBreakBefore: sectionIndex > 0 ? 'always' : undefined,
                breakBefore: sectionIndex > 0 ? 'page' : undefined,
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
              }}
            >
              <StudentSectionBody section={section} sectionKey={`primary-${sectionIndex}`} />
            </div>
          ))}

          <div
            className="mt-6"
            style={{
              pageBreakBefore: 'always',
              breakBefore: 'page',
              pageBreakInside: 'avoid',
              breakInside: 'avoid',
            }}
          >
            <h4 className="bg-slate-200 border border-black font-black uppercase text-[10px] px-2 py-1">
              Overall Student SDD Summary
            </h4>
            <table
              className="w-full border-collapse border border-black text-[9px]"
              style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
            >
              <thead>
                <tr className="bg-slate-100 font-black uppercase">
                  <th className="border border-black p-1.5 text-left w-[20%]">Year</th>
                  <th className="border border-black p-1.5 text-left">Semester</th>
                  <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
                  <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
                  <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
                </tr>
              </thead>
              <tbody>
                {primaryTerms.map((term) => (
                  <tr key={`summary-${term.academicYear || ''}-${term.term}`}>
                    <td className="border border-black p-1.5">{term.academicYear ? `AY ${term.academicYear}` : '—'}</td>
                    <td className="border border-black p-1.5">{term.term}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">{term.male.toLocaleString()}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">
                      {term.female.toLocaleString()}
                    </td>
                    <td className="border border-black p-1.5 text-right tabular-nums">
                      {(term.total ?? term.male + term.female).toLocaleString()}
                    </td>
                  </tr>
                ))}
                <tr className="bg-slate-100 font-black">
                  <td className="border border-black p-1.5 uppercase" colSpan={2}>
                    Grand Total
                  </td>
                  <td className="border border-black p-1.5 text-right tabular-nums">
                    {data.grand.male.toLocaleString()}
                  </td>
                  <td className="border border-black p-1.5 text-right tabular-nums">
                    {data.grand.female.toLocaleString()}
                  </td>
                  <td className="border border-black p-1.5 text-right tabular-nums">
                    {(data.grand.total ?? data.grand.male + data.grand.female).toLocaleString()}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {data.appendices.length > 0 && (
            <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <h2 className="text-center text-[12px] font-black uppercase border-b-2 border-black pb-2 mb-4">
                SDD Breakdown Appendices
              </h2>
              {data.appendices.map((section, sectionIndex) => (
                <div
                  key={`appendix-${section.title || sectionIndex}`}
                  style={{
                    pageBreakBefore: sectionIndex > 0 ? 'always' : undefined,
                    breakBefore: sectionIndex > 0 ? 'page' : undefined,
                    pageBreakInside: 'avoid',
                    breakInside: 'avoid',
                  }}
                >
                  <StudentSectionBody section={section} sectionKey={`appendix-${sectionIndex}`} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ReportFooter signatories={signatories} gadSettings={gadSettings} />
    </div>
  );
}

function EmployeeYearBlock({ yearBlock, yearIndex }: { yearBlock: SDDEmployeeYearBlock; yearIndex: number }) {
  return (
    <div
      className="mb-8"
      style={{
        pageBreakBefore: yearIndex > 0 ? 'always' : undefined,
        breakBefore: yearIndex > 0 ? 'page' : undefined,
      }}
    >
      <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-1 mb-3">
        Academic Year {yearBlock.academicYear}
      </h3>

      {yearBlock.groups.map((group) => (
        <div
          key={`${yearBlock.academicYear}-${group.label}`}
          className="mb-6"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <h4 className="bg-slate-200 border border-black font-black uppercase text-[10px] px-2 py-1">{group.label}</h4>

          <table
            className="w-full border-collapse border border-black text-[9px] mb-3"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <thead>
              <tr className="bg-slate-100 font-black uppercase">
                <th className="border border-black p-1.5 text-left">Personnel Category</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
                <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-1.5">{group.label}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">{group.male.toLocaleString()}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">{group.female.toLocaleString()}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">
                  {(group.male + group.female).toLocaleString()}
                </td>
              </tr>
              <TotalRow male={group.male} female={group.female} />
            </tbody>
          </table>

          <h5 className="font-black uppercase text-[9px] mb-1">Sectoral Disaggregation</h5>
          <SectorTable sectors={group.sectors} />
        </div>
      ))}

      <div className="mt-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
        <h4 className="bg-slate-200 border border-black font-black uppercase text-[10px] px-2 py-1">
          Overall Employee SDD Summary — AY {yearBlock.academicYear}
        </h4>
        <table
          className="w-full border-collapse border border-black text-[9px]"
          style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
        >
          <thead>
            <tr className="bg-slate-100 font-black uppercase">
              <th className="border border-black p-1.5 text-left">Personnel Category</th>
              <th className="border border-black p-1.5 text-right w-[15%]">Male</th>
              <th className="border border-black p-1.5 text-right w-[15%]">Female</th>
              <th className="border border-black p-1.5 text-right w-[15%]">Total</th>
            </tr>
          </thead>
          <tbody>
            {yearBlock.groups.map((group) => (
              <tr key={`${yearBlock.academicYear}-summary-${group.label}`}>
                <td className="border border-black p-1.5">{group.label}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">{group.male.toLocaleString()}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">{group.female.toLocaleString()}</td>
                <td className="border border-black p-1.5 text-right tabular-nums">
                  {(group.male + group.female).toLocaleString()}
                </td>
              </tr>
            ))}
            <TotalRow male={yearBlock.grand.male} female={yearBlock.grand.female} label="GRAND TOTAL" />
          </tbody>
        </table>
      </div>

      {yearBlock.showUnitBreakdown && yearBlock.units.length > 0 && (
        <div className="mt-6" style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}>
          <h4 className="bg-slate-200 border border-black font-black uppercase text-[10px] px-2 py-1">
            Employee SDD by Unit — AY {yearBlock.academicYear}
          </h4>
          <table
            className="w-full border-collapse border border-black text-[9px]"
            style={{ pageBreakInside: 'avoid', breakInside: 'avoid' }}
          >
            <thead>
              <tr className="bg-slate-100 font-black uppercase">
                <th className="border border-black p-1.5 text-left">Unit</th>
                <th className="border border-black p-1.5 text-right">Teaching M</th>
                <th className="border border-black p-1.5 text-right">Teaching F</th>
                <th className="border border-black p-1.5 text-right">Non-Teaching M</th>
                <th className="border border-black p-1.5 text-right">Non-Teaching F</th>
                <th className="border border-black p-1.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {yearBlock.units.map((unit) => {
                const total = unit.teachingMale + unit.teachingFemale + unit.nonTeachingMale + unit.nonTeachingFemale;
                return (
                  <tr key={`${yearBlock.academicYear}-${unit.unitName}`}>
                    <td className="border border-black p-1.5">{unit.unitName}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">{unit.teachingMale}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">{unit.teachingFemale}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">{unit.nonTeachingMale}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums">{unit.nonTeachingFemale}</td>
                    <td className="border border-black p-1.5 text-right tabular-nums font-bold">
                      {total.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              <TotalRow male={yearBlock.grand.male} female={yearBlock.grand.female} label="Total" />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EmployeeSectionBody({ section, sectionKey }: { section: SDDEmployeeSection; sectionKey: string }) {
  return (
    <>
      {section.title && (
        <h3 className="text-[11px] font-black uppercase border-b-2 border-black pb-1 mb-3">{section.title}</h3>
      )}
      {section.years.map((yearBlock, yearIndex) => (
        <EmployeeYearBlock
          key={`${sectionKey}-${yearBlock.academicYear}`}
          yearBlock={yearBlock}
          yearIndex={yearIndex}
        />
      ))}
    </>
  );
}

export function SDDEmployeeReportTemplate({
  data,
  signatories,
  gadSettings,
}: SDDReportTemplateProps<EmployeeSDDReportData>) {
  const hasData = data.grand.male + data.grand.female > 0;

  return (
    <div className="p-4 text-black bg-white max-w-[8.5in] mx-auto font-sans leading-tight text-[9px]">
      <ReportHeader
        office="Gender and Development (GAD)"
        title="Sex-Disaggregated Data (SDD) Report — Employees"
        academicYear={data.academicYear}
        unitName={data.unitName}
        subtitle="Teaching and non-teaching personnel by sex and vulnerable sector (annual personnel census)"
      />

      {data.scopeLabel && (
        <p className="text-center text-[9px] font-bold uppercase tracking-wide mb-4">{data.scopeLabel}</p>
      )}

      {data.note && <p className="text-[9px] italic mb-4">{data.note}</p>}

      {!hasData ? (
        <p className="text-center italic py-8">No employee census data is available for the selected period.</p>
      ) : (
        <>
          {data.sections.map((section, sectionIndex) => (
            <div
              key={`primary-${section.title || sectionIndex}`}
              style={{
                pageBreakBefore: sectionIndex > 0 ? 'always' : undefined,
                breakBefore: sectionIndex > 0 ? 'page' : undefined,
              }}
            >
              <EmployeeSectionBody section={section} sectionKey={`primary-${sectionIndex}`} />
            </div>
          ))}

          {data.appendices.length > 0 && (
            <div style={{ pageBreakBefore: 'always', breakBefore: 'page' }}>
              <h2 className="text-center text-[12px] font-black uppercase border-b-2 border-black pb-2 mb-4">
                SDD Breakdown Appendices
              </h2>
              {data.appendices.map((section, sectionIndex) => (
                <div
                  key={`appendix-${section.title || sectionIndex}`}
                  style={{
                    pageBreakBefore: sectionIndex > 0 ? 'always' : undefined,
                    breakBefore: sectionIndex > 0 ? 'page' : undefined,
                  }}
                >
                  <EmployeeSectionBody section={section} sectionKey={`appendix-${sectionIndex}`} />
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <ReportFooter signatories={signatories} gadSettings={gadSettings} />
    </div>
  );
}
