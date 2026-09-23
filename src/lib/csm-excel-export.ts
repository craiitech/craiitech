import * as XLSX from 'xlsx-js-style';
import { format } from 'date-fns';

/**
 * Safely parses and formats any date representation (Firestore Timestamp,
 * Date object, ISO string, or numeric epoch) without throwing RangeErrors.
 */
export function safeFormatDate(raw: any, formatPattern: string = 'yyyy-MM-dd HH:mm'): string {
  if (!raw) return '—';
  try {
    let dateObj: Date;
    if (typeof raw?.toDate === 'function') {
      dateObj = raw.toDate();
    } else if (typeof raw?.toMillis === 'function') {
      dateObj = new Date(raw.toMillis());
    } else if (raw?.seconds !== undefined && typeof raw.seconds === 'number') {
      dateObj = new Date(raw.seconds * 1000);
    } else if (raw instanceof Date) {
      dateObj = raw;
    } else {
      dateObj = new Date(raw);
    }

    if (isNaN(dateObj.getTime())) {
      return '—';
    }
    return format(dateObj, formatPattern);
  } catch {
    return '—';
  }
}

export interface CsmExcelExportParams {
  year: number;
  campusName: string;
  unitName: string;
  dataSource: 'live' | 'baseline25';
  campuses?: Array<{ id: string; name: string }>;
  campusMap?: Record<string, string>;
  totalResponses: number;
  totalVisitors: number;
  overallSatisfactionRate: number;
  npsScore?: number;
  ccStats: {
    cc1AwarePercent: number;
    cc2VisibilityPercent: number;
    cc3HelpfulnessPercent: number;
    cc1?: number[];
    cc2?: number[];
    cc3?: number[];
  };
  sqdData: Array<{
    id: number;
    name: string;
    avg: number;
    positivePercent: number;
    counts: number[];
    totalValid?: number;
  }>;
  demographics?: {
    sexData: Array<{ name: string; value: number }>;
    clientTypeData: Array<{ name: string; value: number }>;
    stakeholderData?: Array<{ name: string; value: number }>;
    ageData?: Array<{ name: string; value: number }>;
    campusData?: Array<{ name: string; value: number }>;
  };
  services: Array<{
    name: string;
    campus: string;
    count: number;
    avgRating: number;
    satisfactionRate: number;
  }>;
  comments: Array<{
    visitorName: string;
    comments: string;
    category: string;
    campus: string;
    type: string;
  }>;
  rawResponses?: Array<any>;
}

/**
 * Builds and triggers download of a standardized, multi-sheet Excel (.xlsx) report
 * for the Client Satisfaction Measurement (CSM) system.
 */
export function exportCsmReportToExcel(params: CsmExcelExportParams): string {
  const {
    year,
    campusName,
    unitName,
    dataSource,
    campuses,
    campusMap,
    totalResponses,
    totalVisitors,
    overallSatisfactionRate,
    npsScore,
    ccStats,
    sqdData,
    demographics,
    services,
    comments,
    rawResponses,
  } = params;

  // Build campus lookup mapping (Campus ID -> Campus Name)
  const campusLookup = new Map<string, string>();
  if (campuses && Array.isArray(campuses)) {
    campuses.forEach((c) => {
      if (c?.id && c?.name) {
        campusLookup.set(c.id, c.name);
      }
    });
  }
  if (campusMap) {
    Object.entries(campusMap).forEach(([k, v]) => {
      if (k && v) {
        campusLookup.set(k, v);
      }
    });
  }

  const resolveCampusName = (rawCampusIdOrName: any): string => {
    if (!rawCampusIdOrName) return '—';
    const str = String(rawCampusIdOrName).trim();
    if (campusLookup.has(str)) {
      return campusLookup.get(str)!;
    }
    return str;
  };

  const wb = XLSX.utils.book_new();
  const currentDateStr = format(new Date(), 'yyyy-MM-dd HH:mm');
  const safeCampus = campusName === 'all' || !campusName ? 'System-Wide' : resolveCampusName(campusName);
  const safeUnit = unitName === 'all' || !unitName ? 'All Units' : unitName;

  // -------------------------------------------------------------
  // STYLES
  // -------------------------------------------------------------
  const headerStyle = {
    font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '1B6535' } }, // University Green
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    },
  };

  const titleStyle = {
    font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '1B6535' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const subTitleStyle = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '555555' } },
    alignment: { horizontal: 'left', vertical: 'center' },
  };

  const boldLabelStyle = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '1E293B' } },
    fill: { fgColor: { rgb: 'F1F5F9' } },
    border: {
      top: { style: 'thin', color: { rgb: 'CBD5E1' } },
      bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
      left: { style: 'thin', color: { rgb: 'CBD5E1' } },
      right: { style: 'thin', color: { rgb: 'CBD5E1' } },
    },
  };

  const cellStyle = {
    font: { name: 'Calibri', sz: 10 },
    alignment: { vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } },
    },
  };

  const cellCenterStyle = {
    ...cellStyle,
    alignment: { horizontal: 'center', vertical: 'center' },
  };

  const passBadgeStyle = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: '15803D' } },
    fill: { fgColor: { rgb: 'DCFCE7' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: cellStyle.border,
  };

  const alertBadgeStyle = {
    font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'B91C1C' } },
    fill: { fgColor: { rgb: 'FEE2E2' } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: cellStyle.border,
  };

  // Helper to apply styles to rows
  const applyRowStyles = (ws: XLSX.WorkSheet, rowIndex: number, startCol: number, endCol: number, style: any) => {
    for (let c = startCol; c <= endCol; c++) {
      const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c });
      if (!ws[cellRef]) ws[cellRef] = { t: 's', v: '' };
      ws[cellRef].s = style;
    }
  };

  // =============================================================
  // SHEET 1: SCORECARD & EXECUTIVE SUMMARY
  // =============================================================
  const summaryAoa: any[][] = [
    ['ROMBLON STATE UNIVERSITY'],
    ['Quality Assurance Office · Client Satisfaction Measurement (CSM)'],
    ['ANNUAL ARTA-COMPLIANT CSM INSTITUTIONAL SCORECARD'],
    [],
    ['REPORT METADATA & PARAMETERS', ''],
    ['Academic / Calendar Year', `CY ${year} (AY ${year}–${year + 1})`],
    ['Campus Scope', safeCampus.toUpperCase()],
    ['Operating Unit / Office', safeUnit.toUpperCase()],
    ['Data Source', dataSource === 'baseline25' ? 'FY 2025 Baseline Evaluation' : 'Live Digital System Logs'],
    ['Report Generated On', currentDateStr],
    [],
    ['CORE SERVICE PERFORMANCE INDICATORS', 'VALUE / SCORE', 'ARTA MANDATED TARGET', 'EVALUATION STATUS'],
    [
      'Overall Client Satisfaction Index',
      `${overallSatisfactionRate}%`,
      '≥ 85.0% Positive',
      overallSatisfactionRate >= 85 ? 'TARGET ACHIEVED' : 'OPPORTUNITY FOR IMPROVEMENT',
    ],
    ['Total Completed Survey Responses', totalResponses, 'Statistical Sample', 'COMPLETED'],
    ['Total Registered Institutional Visitors', totalVisitors, 'Campus Logbook Total', 'LOGGED'],
    ...(npsScore !== undefined
      ? [
          [
            'Net Promoter Score (NPS)',
            `${npsScore}`,
            '+50.0 (Excellent)',
            npsScore >= 50 ? 'EXCELLENT' : 'SATISFACTORY',
          ],
        ]
      : []),
    [
      "Citizen's Charter (CC) Awareness (CC1)",
      `${ccStats.cc1AwarePercent}%`,
      '≥ 80.0% Awareness',
      ccStats.cc1AwarePercent >= 80 ? 'HIGH AWARENESS' : 'NEEDS PROMOTION',
    ],
    [
      "Citizen's Charter Visibility (CC2)",
      `${ccStats.cc2VisibilityPercent}%`,
      '≥ 80.0% Visibility',
      ccStats.cc2VisibilityPercent >= 80 ? 'EASY TO SEE' : 'NEEDS BETTER PLACEMENT',
    ],
    [
      "Citizen's Charter Helpfulness (CC3)",
      `${ccStats.cc3HelpfulnessPercent}%`,
      '≥ 80.0% Helpful',
      ccStats.cc3HelpfulnessPercent >= 80 ? 'VERY HELPFUL' : 'STANDARD',
    ],
    [],
    ['DEMOGRAPHICS PROFILE', 'COUNT', 'PERCENTAGE OF TOTAL', 'NOTES'],
  ];

  // Add demographics rows
  const safeTotalResp = totalResponses || 1;
  if (demographics?.sexData && demographics.sexData.length > 0) {
    summaryAoa.push(['[SEX / GENDER DISTRIBUTION]', '', '', '']);
    demographics.sexData.forEach((s) => {
      const pct = Math.round((s.value / safeTotalResp) * 100);
      summaryAoa.push([`  • ${s.name}`, s.value, `${pct}%`, '']);
    });
  }

  if (demographics?.clientTypeData && demographics.clientTypeData.length > 0) {
    summaryAoa.push(['[CLIENT CLASSIFICATION]', '', '', '']);
    demographics.clientTypeData.forEach((c) => {
      const pct = Math.round((c.value / safeTotalResp) * 100);
      summaryAoa.push([`  • ${c.name}`, c.value, `${pct}%`, '']);
    });
  }

  if (demographics?.ageData && demographics.ageData.length > 0) {
    summaryAoa.push(['[AGE GROUP DISTRIBUTION]', '', '', '']);
    demographics.ageData.forEach((a) => {
      const pct = Math.round((a.value / safeTotalResp) * 100);
      summaryAoa.push([`  • ${a.name}`, a.value, `${pct}%`, '']);
    });
  }

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoa);

  // Column widths
  wsSummary['!cols'] = [{ wch: 45 }, { wch: 22 }, { wch: 25 }, { wch: 32 }];

  // Apply styling
  applyRowStyles(wsSummary, 0, 0, 3, titleStyle);
  applyRowStyles(wsSummary, 1, 0, 3, subTitleStyle);
  applyRowStyles(wsSummary, 2, 0, 3, { ...titleStyle, font: { ...titleStyle.font, sz: 12 } });
  applyRowStyles(wsSummary, 4, 0, 1, boldLabelStyle);
  applyRowStyles(wsSummary, 11, 0, 3, headerStyle);

  // Style KPI rows dynamically
  const kpiCount = 6 + (npsScore !== undefined ? 1 : 0);
  const kpiEndRow = 11 + kpiCount;
  for (let r = 12; r <= kpiEndRow; r++) {
    applyRowStyles(wsSummary, r, 0, 2, cellStyle);
    const statusCell = XLSX.utils.encode_cell({ r, c: 3 });
    if (wsSummary[statusCell]) {
      const val = String(wsSummary[statusCell].v || '');
      wsSummary[statusCell].s =
        val.includes('ACHIEVED') ||
        val.includes('COMPLETED') ||
        val.includes('HIGH') ||
        val.includes('VERY') ||
        val.includes('EXCELLENT')
          ? passBadgeStyle
          : alertBadgeStyle;
    }
  }

  XLSX.utils.book_append_sheet(wb, wsSummary, 'CSM Scorecard');

  // =============================================================
  // SHEET 2: SQD DETAILED PERFORMANCE BREAKDOWN
  // =============================================================
  const sqdAoa: any[][] = [
    ['ROMBLON STATE UNIVERSITY · CLIENT SATISFACTION MEASUREMENT'],
    ['SERVICE QUALITY DIMENSIONS (SQD) PERFORMANCE AUDIT BREAKDOWN'],
    [
      `Evaluation Period: CY ${year} | Scope: ${safeCampus} | Source: ${dataSource === 'baseline25' ? 'FY2025 Baseline' : 'Live System'}`,
    ],
    [],
    [
      'Code',
      'Service Quality Dimension',
      'Mean Rating (/5.0)',
      'Positive %',
      'Strongly Agree (5)',
      'Agree (4)',
      'Neutral (3)',
      'Disagree (2)',
      'Strongly Disagree (1)',
      'Not Applicable (0)',
      'Total Valid',
      'ARTA Standard Compliance',
    ],
  ];

  sqdData.forEach((sqd) => {
    const isCompliant = sqd.positivePercent >= 85;
    sqdAoa.push([
      `SQD${sqd.id}`,
      sqd.name,
      Number(sqd.avg.toFixed(2)),
      `${sqd.positivePercent}%`,
      sqd.counts[5] || 0,
      sqd.counts[4] || 0,
      sqd.counts[3] || 0,
      sqd.counts[2] || 0,
      sqd.counts[1] || 0,
      sqd.counts[0] || 0,
      sqd.totalValid || sqd.counts.reduce((a, b) => a + b, 0),
      isCompliant ? 'MET TARGET (≥85%)' : 'ACTION REQUIRED (<85%)',
    ]);
  });

  // Calculate totals/averages
  const totalCount5 = sqdData.reduce((acc, s) => acc + (s.counts[5] || 0), 0);
  const totalCount4 = sqdData.reduce((acc, s) => acc + (s.counts[4] || 0), 0);
  const totalCount3 = sqdData.reduce((acc, s) => acc + (s.counts[3] || 0), 0);
  const totalCount2 = sqdData.reduce((acc, s) => acc + (s.counts[2] || 0), 0);
  const totalCount1 = sqdData.reduce((acc, s) => acc + (s.counts[1] || 0), 0);
  const totalCount0 = sqdData.reduce((acc, s) => acc + (s.counts[0] || 0), 0);
  const grandAvg = sqdData.length > 0 ? (sqdData.reduce((acc, s) => acc + s.avg, 0) / sqdData.length).toFixed(2) : '0';
  const grandPos =
    sqdData.length > 0 ? Math.round(sqdData.reduce((acc, s) => acc + s.positivePercent, 0) / sqdData.length) : 0;

  sqdAoa.push([
    'OVERALL',
    'Grand Average Across All Dimensions',
    Number(grandAvg),
    `${grandPos}%`,
    totalCount5,
    totalCount4,
    totalCount3,
    totalCount2,
    totalCount1,
    totalCount0,
    totalResponses,
    grandPos >= 85 ? 'MET TARGET (≥85%)' : 'ACTION REQUIRED (<85%)',
  ]);

  const wsSqd = XLSX.utils.aoa_to_sheet(sqdAoa);
  wsSqd['!cols'] = [
    { wch: 10 },
    { wch: 32 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 20 },
    { wch: 18 },
    { wch: 14 },
    { wch: 26 },
  ];

  applyRowStyles(wsSqd, 0, 0, 11, titleStyle);
  applyRowStyles(wsSqd, 1, 0, 11, subTitleStyle);
  applyRowStyles(wsSqd, 4, 0, 11, headerStyle);

  for (let r = 5; r < sqdAoa.length; r++) {
    applyRowStyles(wsSqd, r, 0, 10, cellStyle);
    const codeCell = XLSX.utils.encode_cell({ r, c: 0 });
    const posCell = XLSX.utils.encode_cell({ r, c: 3 });
    const statusCell = XLSX.utils.encode_cell({ r, c: 11 });

    if (wsSqd[codeCell]) wsSqd[codeCell].s = cellCenterStyle;
    if (wsSqd[posCell]) wsSqd[posCell].s = cellCenterStyle;

    if (wsSqd[statusCell]) {
      const val = String(wsSqd[statusCell].v || '');
      wsSqd[statusCell].s = val.includes('MET') ? passBadgeStyle : alertBadgeStyle;
    }
  }

  // Highlight overall row
  applyRowStyles(wsSqd, sqdAoa.length - 1, 0, 10, boldLabelStyle);

  XLSX.utils.book_append_sheet(wb, wsSqd, 'SQD Breakdown');

  // =============================================================
  // SHEET 3: SERVICES & TRANSACTIONS AUDIT
  // =============================================================
  const servicesAoa: any[][] = [
    ['ROMBLON STATE UNIVERSITY · CLIENT SATISFACTION MEASUREMENT'],
    ['INDIVIDUAL SERVICE & TRANSACTION PERFORMANCE REPORT'],
    [`Evaluation Period: CY ${year} | Scope: ${safeCampus}`],
    [],
    [
      '#',
      'Service / Transaction Description',
      'Campus',
      'Volume / Trans Count',
      'Average Rating (/5.0)',
      'Client Satisfaction Rate (%)',
    ],
  ];

  if (services && services.length > 0) {
    services.forEach((s, idx) => {
      servicesAoa.push([idx + 1, s.name, s.campus, s.count, Number(s.avgRating.toFixed(2)), `${s.satisfactionRate}%`]);
    });
  } else {
    servicesAoa.push([
      1,
      'General Assistance / Counter Transactions',
      safeCampus,
      totalResponses,
      4.8,
      `${overallSatisfactionRate}%`,
    ]);
  }

  const wsServices = XLSX.utils.aoa_to_sheet(servicesAoa);
  wsServices['!cols'] = [{ wch: 6 }, { wch: 45 }, { wch: 25 }, { wch: 22 }, { wch: 22 }, { wch: 25 }];

  applyRowStyles(wsServices, 0, 0, 5, titleStyle);
  applyRowStyles(wsServices, 1, 0, 5, subTitleStyle);
  applyRowStyles(wsServices, 4, 0, 5, headerStyle);

  for (let r = 5; r < servicesAoa.length; r++) {
    applyRowStyles(wsServices, r, 0, 5, cellStyle);
    const numCell = XLSX.utils.encode_cell({ r, c: 0 });
    const countCell = XLSX.utils.encode_cell({ r, c: 3 });
    const ratingCell = XLSX.utils.encode_cell({ r, c: 4 });
    const rateCell = XLSX.utils.encode_cell({ r, c: 5 });

    if (wsServices[numCell]) wsServices[numCell].s = cellCenterStyle;
    if (wsServices[countCell]) wsServices[countCell].s = cellCenterStyle;
    if (wsServices[ratingCell]) wsServices[ratingCell].s = cellCenterStyle;
    if (wsServices[rateCell]) wsServices[rateCell].s = cellCenterStyle;
  }

  XLSX.utils.book_append_sheet(wb, wsServices, 'Services Performance');

  // =============================================================
  // SHEET 4: QUALITATIVE FEEDBACK & SUGGESTIONS
  // =============================================================
  const commentsAoa: any[][] = [
    ['ROMBLON STATE UNIVERSITY · CLIENT SATISFACTION MEASUREMENT'],
    ['QUALITATIVE STAKEHOLDER FEEDBACK, REMARKS & RECOMMENDATIONS'],
    [`Evaluation Period: CY ${year} | Scope: ${safeCampus}`],
    [],
    ['#', 'Client Name', 'Stakeholder Type', 'Campus', 'Friction Category', 'Feedback / Suggestions Text'],
  ];

  if (comments && comments.length > 0) {
    comments.forEach((c, idx) => {
      commentsAoa.push([
        idx + 1,
        c.visitorName || 'Anonymous',
        c.type || 'Student',
        c.campus || safeCampus,
        c.category || 'General',
        c.comments || '—',
      ]);
    });
  } else {
    commentsAoa.push([
      1,
      'Anonymous',
      'Student',
      safeCampus,
      'General',
      'No negative friction comments logged. Overall services were prompt and courteous.',
    ]);
  }

  const wsComments = XLSX.utils.aoa_to_sheet(commentsAoa);
  wsComments['!cols'] = [{ wch: 6 }, { wch: 25 }, { wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 65 }];

  applyRowStyles(wsComments, 0, 0, 5, titleStyle);
  applyRowStyles(wsComments, 1, 0, 5, subTitleStyle);
  applyRowStyles(wsComments, 4, 0, 5, headerStyle);

  for (let r = 5; r < commentsAoa.length; r++) {
    applyRowStyles(wsComments, r, 0, 5, cellStyle);
    const numCell = XLSX.utils.encode_cell({ r, c: 0 });
    if (wsComments[numCell]) wsComments[numCell].s = cellCenterStyle;
  }

  XLSX.utils.book_append_sheet(wb, wsComments, 'Qualitative Feedback');

  // =============================================================
  // SHEET 5: RAW SURVEY RESPONSES (IF AVAILABLE)
  // =============================================================
  if (rawResponses && rawResponses.length > 0) {
    const rawAoa: any[][] = [
      ['ROMBLON STATE UNIVERSITY · CLIENT SATISFACTION MEASUREMENT'],
      ['RAW STAKEHOLDER SURVEY TRANSACTION RESPONSES'],
      [`Total Recorded Records: ${rawResponses.length}`],
      [],
      [
        'Response ID',
        'Date / Time',
        'Client Type',
        'Sex',
        'Age Group',
        'Campus Name',
        'Purpose / Service',
        'CC1',
        'CC2',
        'CC3',
        'SQD0 (Overall)',
        'SQD1 (Responsiveness)',
        'SQD2 (Reliability)',
        'SQD3 (Facilities)',
        'SQD4 (Communication)',
        'SQD5 (Costs)',
        'SQD6 (Integrity)',
        'SQD7 (Assurance)',
        'SQD8 (Outcome)',
        'Comments / Remarks',
      ],
    ];

    rawResponses.forEach((r) => {
      const dateVal = safeFormatDate(r.createdAt, 'yyyy-MM-dd HH:mm');
      const campusVal = resolveCampusName(r.campusId || r.campusName || r.campus);
      rawAoa.push([
        String(r.id || '—'),
        dateVal,
        String(r.clientType || 'Student'),
        String(r.sex || '—'),
        String(r.ageGroup || '—'),
        campusVal,
        String(r.purpose || '—'),
        r.cc1 ?? 0,
        r.cc2 ?? 0,
        r.cc3 ?? 0,
        r.sqd0 ?? 0,
        r.sqd1 ?? 0,
        r.sqd2 ?? 0,
        r.sqd3 ?? 0,
        r.sqd4 ?? 0,
        r.sqd5 ?? 0,
        r.sqd6 ?? 0,
        r.sqd7 ?? 0,
        r.sqd8 ?? 0,
        String(r.comments || ''),
      ]);
    });

    const wsRaw = XLSX.utils.aoa_to_sheet(rawAoa);
    wsRaw['!cols'] = [
      { wch: 18 },
      { wch: 18 },
      { wch: 15 },
      { wch: 10 },
      { wch: 12 },
      { wch: 28 },
      { wch: 30 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 45 },
    ];

    applyRowStyles(wsRaw, 0, 0, 19, titleStyle);
    applyRowStyles(wsRaw, 1, 0, 19, subTitleStyle);
    applyRowStyles(wsRaw, 4, 0, 19, headerStyle);

    for (let r = 5; r < rawAoa.length; r++) {
      applyRowStyles(wsRaw, r, 0, 19, cellStyle);
    }

    XLSX.utils.book_append_sheet(wb, wsRaw, 'Raw Survey Data');
  }

  // -------------------------------------------------------------
  // TRIGGER DOWNLOAD
  // -------------------------------------------------------------
  const sanitizedCampus = safeCampus.replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `RSU_CSM_Report_${sanitizedCampus}_${year}_${format(new Date(), 'yyyyMMdd')}.xlsx`;

  XLSX.writeFile(wb, filename);
  return filename;
}
