import { describe, expect, it } from 'vitest';
import { buildEqaCampusFindingRows } from './car-registry-report-data';

describe('buildEqaCampusFindingRows', () => {
  it('includes only campuses present on mapped EQA CAR records', () => {
    const rows = buildEqaCampusFindingRows(
      [
        { auditType: 'IQA', campusId: 'iqa-campus', natureOfFinding: 'NC', status: 'Open' },
        { auditType: 'EQA', campusId: 'eqa-campus', natureOfFinding: 'NC', status: 'Open' },
        { auditType: 'EQA', campusId: 'eqa-campus', natureOfFinding: 'OFI', status: 'Closed' },
        { auditType: 'EQA', campusId: 'unmapped-campus', natureOfFinding: 'NC', status: 'Open' },
      ],
      new Map([
        ['iqa-campus', 'IQA Campus'],
        ['eqa-campus', 'EQA Campus'],
      ]),
    );

    expect(rows).toEqual([
      {
        campusId: 'eqa-campus',
        campus: 'EQA Campus',
        NC: 1,
        OFI: 1,
        Compliant: 0,
        Open: 1,
        Ongoing: 0,
        Closed: 1,
      },
    ]);
  });
});
