import { describe, it, expect, vi } from 'vitest';
import { exportCsmReportToExcel } from './csm-excel-export';
import * as XLSX from 'xlsx-js-style';

vi.mock('xlsx-js-style', async (importOriginal) => {
  const actual: any = await importOriginal();
  const base = actual.default || actual;
  return {
    ...base,
    default: {
      ...base,
      writeFile: vi.fn(),
    },
    utils: base.utils,
    writeFile: vi.fn(),
  };
});

describe('exportCsmReportToExcel', () => {
  it('generates a valid filename and creates workbook sheets', () => {
    const filename = exportCsmReportToExcel({
      year: 2026,
      campusName: 'Main Campus',
      unitName: 'All Units',
      dataSource: 'baseline25',
      totalResponses: 1000,
      totalVisitors: 1150,
      overallSatisfactionRate: 98,
      npsScore: 84,
      ccStats: {
        cc1AwarePercent: 88,
        cc2VisibilityPercent: 91,
        cc3HelpfulnessPercent: 94,
      },
      sqdData: [
        {
          id: 0,
          name: 'Overall Satisfaction',
          avg: 4.85,
          positivePercent: 98,
          counts: [0, 0, 5, 15, 300, 680],
          totalValid: 1000,
        },
        {
          id: 1,
          name: 'Responsiveness',
          avg: 4.82,
          positivePercent: 97,
          counts: [0, 1, 8, 20, 310, 661],
          totalValid: 1000,
        },
      ],
      demographics: {
        sexData: [
          { name: 'Male', value: 450 },
          { name: 'Female', value: 540 },
          { name: 'LGBTQ+', value: 10 },
        ],
        clientTypeData: [
          { name: 'Student', value: 850 },
          { name: 'Citizens', value: 150 },
        ],
      },
      services: [
        {
          name: 'Certificate of Enrollment',
          campus: 'Main Campus',
          count: 320,
          avgRating: 4.9,
          satisfactionRate: 99,
        },
      ],
      comments: [
        {
          visitorName: 'Juan Dela Cruz',
          comments: 'Fast and courteous service.',
          category: 'Responsiveness (SQD1)',
          campus: 'Main Campus',
          type: 'Student',
        },
      ],
    });

    expect(filename).toContain('RSU_CSM_Report_Main_Campus_2026');
    expect(filename.endsWith('.xlsx')).toBe(true);
    expect(XLSX.writeFile).toHaveBeenCalled();
  });
});
