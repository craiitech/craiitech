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

  it('handles live survey responses with Firestore Timestamps without throwing', () => {
    const filename = exportCsmReportToExcel({
      year: 2026,
      campusName: 'Site 1 - Main Campus',
      unitName: 'All Units',
      dataSource: 'live',
      totalResponses: 1,
      totalVisitors: 2,
      overallSatisfactionRate: 100,
      ccStats: {
        cc1AwarePercent: 95,
        cc2VisibilityPercent: 80,
        cc3HelpfulnessPercent: 85,
        cc1: [0, 1, 0, 0, 0],
        cc2: [0, 1, 0, 0, 0, 0],
        cc3: [0, 1, 0, 0, 0],
      },
      sqdData: [
        {
          id: 0,
          name: 'Overall Satisfaction',
          avg: 5.0,
          positivePercent: 100,
          counts: [0, 0, 0, 0, 0, 1],
          totalValid: 1,
        },
      ],
      services: [
        {
          name: 'Registrar Assistance',
          campus: 'Site 1 - Main Campus',
          count: 1,
          avgRating: 5.0,
          satisfactionRate: 100,
        },
      ],
      comments: [
        {
          visitorName: 'M**K L***S',
          comments: 'Friendly staff',
          category: 'Outcome (SQD8)',
          campus: 'Site 1 - Main Campus',
          type: 'Student',
        },
      ],
      rawResponses: [
        {
          id: 'test-doc-123',
          createdAt: {
            seconds: 1727103823,
            nanoseconds: 0,
            toDate: () => new Date('2026-09-23T15:00:00Z'),
          },
          clientType: 'Student',
          sex: 'Male',
          ageGroup: '20-34',
          campusId: 'site-1',
          purpose: 'Registrar Assistance',
          cc1: 1,
          cc2: 1,
          cc3: 1,
          sqd0: 5,
          sqd1: 5,
          sqd2: 5,
          sqd3: 5,
          sqd4: 5,
          sqd5: 5,
          sqd6: 5,
          sqd7: 5,
          sqd8: 5,
          comments: 'Friendly staff',
        },
      ],
    });

    expect(filename).toContain('RSU_CSM_Report_Site_1_-_Main_Campus_2026');
    expect(filename.endsWith('.xlsx')).toBe(true);
  });
});
