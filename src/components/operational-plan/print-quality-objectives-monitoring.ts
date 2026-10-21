import type { OperationalPlanDocument, QualityObjectiveItem } from '@/lib/types';
import { format } from 'date-fns';

export function printQualityObjectivesMonitoringForm(
  plan: Partial<OperationalPlanDocument>,
  items: QualityObjectiveItem[],
  campusName: string = 'Main Campus',
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the Quality Objectives Monitoring Form.');
    return;
  }

  const updatedDateStr = plan.updatedAt?.toDate
    ? format(plan.updatedAt.toDate(), 'yyyy-MM-dd')
    : plan.updatedAt instanceof Date
      ? format(plan.updatedAt, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');

  const monthNames = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'Jun.', 'Jul.', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  const monthAbbrs = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  // Calculate monthly stats
  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    let planCount = 0;
    let actualCount = 0;

    items.forEach((item) => {
      const isPlanned = item.activeMonths?.includes(month);
      const isActual =
        Boolean(item.monthlyAccomplishments?.[month]?.implemented) || Boolean(item.actualMonths?.includes(month));

      if (isPlanned) planCount++;
      if (isActual) actualCount++;
    });

    const percent = planCount > 0 ? Math.round((actualCount / planCount) * 100) : actualCount > 0 ? 100 : 0;
    return {
      monthName: monthAbbrs[i],
      planCount,
      actualCount,
      percent,
    };
  });

  const totalPlan = monthlyStats.reduce((acc, curr) => acc + curr.planCount, 0);
  const totalActual = monthlyStats.reduce((acc, curr) => acc + curr.actualCount, 0);
  const totalPercent = totalPlan > 0 ? Math.round((totalActual / totalPlan) * 100) : totalActual > 0 ? 100 : 0;

  // Max value for visual bars in chart illustration
  const maxVal = Math.max(1, ...monthlyStats.map((s) => Math.max(s.planCount, s.actualCount)));

  const matrixRowsHtml =
    items.length === 0
      ? `<tr><td colspan="16" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No action plans or monitoring items created yet.</td></tr>`
      : items
          .map((item, idx) => {
            const planMonthCells = Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const isPlanned = item.activeMonths?.includes(month);
              return `<td style="border: 1px solid black; padding: 0; height: 16px; background-color: ${isPlanned ? '#b91c1c' : 'white'};"></td>`;
            }).join('');

            const actualMonthCells = Array.from({ length: 12 }, (_, i) => {
              const month = i + 1;
              const isActual =
                Boolean(item.monthlyAccomplishments?.[month]?.implemented) ||
                Boolean(item.actualMonths?.includes(month));
              return `<td style="border: 1px solid black; padding: 0; height: 16px; background-color: ${isActual ? '#1d4ed8' : 'white'};"></td>`;
            }).join('');

            const inCharge = item.inCharge || item.responsiblePerson || 'QA UNIT';
            const resources = item.resourcesNeeded || 'Human Resource / Budget / Supplies & Materials';
            const status =
              item.status === 'Achieved' ? 'Done' : item.status === 'Ongoing' ? 'On-Going' : item.status || 'On-Going';

            return `
          <tr>
            <td rowspan="2" style="border: 1px solid black; text-align: center; font-weight: bold; font-size: 10px; width: 25px;">${idx + 1}</td>
            <td rowspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 10px; vertical-align: top; max-width: 220px;">
              <strong>${item.taskText || item.objectiveText || '—'}</strong>
              ${item.objectiveText && item.taskText && item.objectiveText !== item.taskText ? `<div style="font-size: 8.5px; color: #555; margin-top: 2px;">Obj: ${item.objectiveText}</div>` : ''}
            </td>
            ${planMonthCells}
            <td rowspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 9.5px; vertical-align: middle; text-align: center; width: 85px;">
              ${inCharge}
            </td>
            <td rowspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 9px; vertical-align: middle; width: 140px;">
              ${resources}
            </td>
            <td rowspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 9.5px; vertical-align: middle; text-align: center; font-weight: bold; width: 80px;">
              ${status}
            </td>
          </tr>
          <tr>
            ${actualMonthCells}
          </tr>
        `;
          })
          .join('');

  const dataInfoRowsHtml = monthlyStats
    .map(
      (s) => `
    <tr>
      <td style="border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 9px; font-weight: bold;">${s.monthName}</td>
      <td style="border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 9px;">${s.planCount}</td>
      <td style="border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 9px;">${s.actualCount}</td>
      <td style="border: 1px solid black; text-align: center; padding: 2px 4px; font-size: 9px; font-weight: bold;">${s.percent}%</td>
    </tr>
  `,
    )
    .join('');

  // SVG Chart Bars & Line for the print output
  const chartWidth = 560;
  const chartHeight = 170;
  const colWidth = chartWidth / 14;

  const points = monthlyStats.map((s, idx) => {
    const x = 35 + idx * colWidth + colWidth / 2;
    const y = 145 - (s.percent / 120) * 115;
    return `${x},${y}`;
  });
  // Total point
  const totalX = 35 + 12 * colWidth + colWidth / 2;
  const totalY = 145 - (totalPercent / 120) * 115;
  points.push(`${totalX},${totalY}`);

  const barsSvg = monthlyStats
    .map((s, idx) => {
      const x = 35 + idx * colWidth;
      const planH = (s.planCount / maxVal) * 105;
      const actualH = (s.actualCount / maxVal) * 105;
      return `
      <rect x="${x + 2}" y="${145 - planH}" width="10" height="${planH}" fill="#fb7185" stroke="#e11d48" stroke-width="0.5" />
      <rect x="${x + 13}" y="${145 - actualH}" width="10" height="${actualH}" fill="#7dd3fc" stroke="#0284c7" stroke-width="0.5" />
      <text x="${x + colWidth / 2}" y="158" font-size="7.5" text-anchor="middle" font-weight="bold">${s.monthName}</text>
    `;
    })
    .join('');

  // Total bars
  const totalPlanH = (totalPlan / (maxVal * 12 || 1)) * 105;
  const totalActualH = (totalActual / (maxVal * 12 || 1)) * 105;
  const totalBarsSvg = `
    <rect x="${totalX - 11}" y="${145 - Math.min(105, totalPlanH)}" width="10" height="${Math.min(105, totalPlanH)}" fill="#fb7185" stroke="#e11d48" stroke-width="0.5" />
    <rect x="${totalX}" y="${145 - Math.min(105, totalActualH)}" width="10" height="${Math.min(105, totalActualH)}" fill="#7dd3fc" stroke="#0284c7" stroke-width="0.5" />
    <text x="${totalX}" y="158" font-size="7.5" text-anchor="middle" font-weight="bold">TOTAL</text>
  `;

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quality Objectives Monitoring - ${plan.unitName || 'Unit'}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.3in;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 8px;
            font-size: 10px;
          }
          .no-print {
            display: flex;
            justify-content: center;
            margin-bottom: 15px;
          }
          .btn-print {
            background-color: #1e3a8a;
            color: white;
            border: none;
            padding: 8px 22px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 12px;
            cursor: pointer;
            text-transform: uppercase;
          }
          table {
            border-collapse: collapse;
          }
          .header-box {
            width: 100%;
            border: 1.5px solid black;
            margin-bottom: 6px;
          }
          .main-matrix {
            width: 100%;
            border: 1.5px solid black;
            margin-bottom: 8px;
          }
          .main-matrix th {
            border: 1px solid black;
            background-color: #ffffff;
            font-size: 9px;
            padding: 3px 2px;
            text-align: center;
          }
          .bottom-container {
            display: flex;
            gap: 12px;
            width: 100%;
            margin-bottom: 8px;
          }
          .bottom-table {
            width: 32%;
            border: 1.5px solid black;
          }
          .bottom-chart {
            width: 68%;
            border: 1.5px solid black;
            padding: 4px;
          }
          .analysis-container {
            display: flex;
            gap: 12px;
            width: 100%;
          }
          .analysis-box {
            width: 50%;
            border: 1.5px solid black;
            min-height: 48px;
            padding: 4px 6px;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">Print Official Quality Objectives Monitoring Form</button>
        </div>

        <!-- Official Header with RSU and TÜV Logos -->
        <table style="width: 100%; margin-bottom: 4px;">
          <tr>
            <td style="width: 65px; text-align: left; vertical-align: middle;">
              <img src="/rsulogo.png" alt="RSU" style="height: 48px; object-fit: contain;" />
            </td>
            <td style="text-align: left; vertical-align: middle; padding-left: 8px;">
              <div style="font-size: 9px; text-transform: uppercase;">Republic of the Philippines</div>
              <div style="font-size: 13px; font-weight: bold; letter-spacing: 0.5px;">ROMBLON STATE UNIVERSITY</div>
              <div style="font-size: 9px;">Romblon, Philippines</div>
            </td>
            <td style="text-align: center; vertical-align: middle;">
              <div style="font-size: 15px; font-weight: 900; letter-spacing: 1px;">QUALITY OBJECTIVES MONITORING</div>
            </td>
            <td style="width: 160px; text-align: right; vertical-align: middle;">
              <div style="font-size: 9.5px; font-weight: bold; margin-bottom: 3px;">Updated as of: &nbsp; ${updatedDateStr}</div>
              <img src="/ISOlogo.jpg" alt="TÜV ISO Certified" style="height: 40px; object-fit: contain;" />
            </td>
          </tr>
        </table>

        <!-- Metadata Header Table Matching Form -->
        <table class="header-box">
          <tr>
            <td style="width: 15%; background-color: #fef08a; border: 1px solid black; font-weight: bold; padding: 4px 6px; font-size: 9.5px;">
              Campus / Unit
            </td>
            <td style="width: 25%; background-color: #fef08a; border: 1px solid black; font-weight: bold; padding: 4px 6px; font-size: 9.5px;">
              ${plan.unitName || 'Quality Assurance Office'}
            </td>
            <td style="width: 20%; border: 1px solid black; padding: 4px 6px; font-size: 9px; text-align: center;">
              <div style="font-weight: bold; margin-bottom: 3px;">Baseline Data</div>
              <div>${plan.baselineData || '2021: 100%'}</div>
            </td>
            <td style="width: 40%; border: 1px solid black; padding: 4px 6px; font-size: 9px;" rowspan="3">
              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div style="width: 48%;">
                  <div style="font-weight: bold; font-size: 8px; color: #444;">Prepared by:</div>
                  <div style="font-weight: bold; font-size: 9.5px; margin-top: 12px; border-bottom: 1px solid black; text-align: center;">
                    ${plan.preparedByName || 'Accreditation Head'}
                  </div>
                  <div style="font-size: 8px; text-align: center; color: #555;">${plan.preparedByTitle || 'Unit Head / Accreditation'}</div>
                </div>
                <div style="width: 48%;">
                  <div style="font-weight: bold; font-size: 8px; color: #444;">Reviewed by:</div>
                  <div style="font-weight: bold; font-size: 9.5px; margin-top: 12px; border-bottom: 1px solid black; text-align: center;">
                    ${plan.reviewedByName || '—'}
                  </div>
                  <div style="font-size: 8px; text-align: center; color: #555;">${plan.reviewedByTitle || 'Supervising Official'}</div>
                </div>
              </div>
              <div style="margin-top: 4px;">
                <div style="font-weight: bold; font-size: 8px; color: #444;">Approved by:</div>
                <div style="font-weight: bold; font-size: 9.5px; margin-top: 10px; border-bottom: 1px solid black; text-align: center;">
                  ${plan.approvedByName || 'DR. MERIAN P. CATAJAY-MANI'}
                </div>
                <div style="font-size: 8px; text-align: center; color: #555;">${plan.approvedByTitle || 'University President'}</div>
              </div>
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; font-weight: bold; padding: 4px 6px; font-size: 8.5px;">
              Policy Indicator<br><span style="font-size: 7.5px; font-weight: normal;">(University Quality Objectives)</span>
            </td>
            <td colspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 8.5px;">
              ${plan.policyIndicator || 'Relevant and quality tertiary education is ensured and inclusive growth and access of deserving but poor students to quality tertiary education are increased'}
            </td>
          </tr>
          <tr>
            <td style="border: 1px solid black; font-weight: bold; padding: 4px 6px; font-size: 8.5px;">
              Unit Quality Objective
            </td>
            <td colspan="2" style="border: 1px solid black; padding: 4px 6px; font-size: 8.5px;">
              ${plan.unitQualityObjective || 'To ensure that institutional systems are fully certified by National and International Assessment Bodies'}
            </td>
          </tr>
        </table>

        <!-- Main Action Plans Matrix Table -->
        <table class="main-matrix">
          <thead>
            <tr>
              <th rowspan="2" style="width: 25px;">#</th>
              <th rowspan="2" style="min-width: 180px;">Action Plans/ Programs<br><span style="font-size: 8px; font-weight: normal;">(from Operational Plan)</span></th>
              <th colspan="12" style="font-weight: bold;">${plan.year || new Date().getFullYear()}</th>
              <th rowspan="2" style="width: 85px;">In-charge</th>
              <th rowspan="2" style="width: 140px;">Resources Needed</th>
              <th rowspan="2" style="width: 80px;">Status / Remarks</th>
            </tr>
            <tr>
              ${monthNames.map((m) => `<th style="width: 22px; font-size: 8px; padding: 2px;">${m}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${matrixRowsHtml}
          </tbody>
        </table>

        <!-- Legend -->
        <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 6px; font-size: 9px; font-weight: bold;">
          <div>Legend:</div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>Plan</span>
            <span style="display: inline-block; width: 36px; height: 11px; background-color: #b91c1c; border: 1px solid black;"></span>
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <span>Actual</span>
            <span style="display: inline-block; width: 36px; height: 11px; background-color: #1d4ed8; border: 1px solid black;"></span>
          </div>
        </div>

        <!-- Data Information & Illustration Section -->
        <div class="bottom-container">
          <!-- Left: Data Information -->
          <table class="bottom-table">
            <thead>
              <tr style="background-color: #f8fafc;">
                <th colspan="4" style="border: 1px solid black; padding: 4px; font-size: 9.5px; font-weight: bold;">
                  Data Information [${plan.year || new Date().getFullYear()}]
                </th>
              </tr>
              <tr style="background-color: #f1f5f9;">
                <th style="border: 1px solid black; padding: 3px; font-size: 8.5px;">Month</th>
                <th style="border: 1px solid black; padding: 3px; font-size: 8px;">Plan and activities to be conducted</th>
                <th style="border: 1px solid black; padding: 3px; font-size: 8px;">Actual Activity Conducted</th>
                <th style="border: 1px solid black; padding: 3px; font-size: 8.5px;">% Accomplishment</th>
              </tr>
            </thead>
            <tbody>
              ${dataInfoRowsHtml}
              <tr style="font-weight: bold; background-color: #e2e8f0;">
                <td style="border: 1px solid black; text-align: center; padding: 3px; font-size: 9px;">TOTAL</td>
                <td style="border: 1px solid black; text-align: center; padding: 3px; font-size: 9px;">${totalPlan}</td>
                <td style="border: 1px solid black; text-align: center; padding: 3px; font-size: 9px;">${totalActual}</td>
                <td style="border: 1px solid black; text-align: center; padding: 3px; font-size: 9px;">${totalPercent}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Right: Illustration Chart -->
          <div class="bottom-chart">
            <div style="font-size: 11px; font-weight: bold; text-align: center; margin-bottom: 2px;">Illustration</div>
            <div style="font-size: 9.5px; font-weight: bold; text-align: center; color: #444; margin-bottom: 4px;">
              [${plan.unitName || 'Unit'}] Performance Rating
            </div>
            <svg viewBox="0 0 ${chartWidth} ${chartHeight}" style="width: 100%; height: 160px; background-color: #f8fafc; border: 1px solid #cbd5e1;">
              <!-- Grid lines -->
              <line x1="35" y1="30" x2="${chartWidth - 20}" y2="30" stroke="#e2e8f0" stroke-width="1" />
              <line x1="35" y1="65" x2="${chartWidth - 20}" y2="65" stroke="#e2e8f0" stroke-width="1" />
              <line x1="35" y1="105" x2="${chartWidth - 20}" y2="105" stroke="#e2e8f0" stroke-width="1" />
              <line x1="35" y1="145" x2="${chartWidth - 20}" y2="145" stroke="#64748b" stroke-width="1.5" />

              <!-- Left Y-Axis labels (Counts) -->
              <text x="30" y="34" font-size="7" text-anchor="end" fill="#64748b">${maxVal}</text>
              <text x="30" y="85" font-size="7" text-anchor="end" fill="#64748b">${Math.round(maxVal / 2)}</text>
              <text x="30" y="147" font-size="7" text-anchor="end" fill="#64748b">0</text>

              <!-- Right Y-Axis labels (Percent) -->
              <text x="${chartWidth - 16}" y="34" font-size="7" text-anchor="start" fill="#64748b">120%</text>
              <text x="${chartWidth - 16}" y="85" font-size="7" text-anchor="start" fill="#64748b">60%</text>
              <text x="${chartWidth - 16}" y="147" font-size="7" text-anchor="start" fill="#64748b">0%</text>

              <!-- Bars -->
              ${barsSvg}
              ${totalBarsSvg}

              <!-- Line Chart (% Accomplishment) -->
              <polyline points="${points.join(' ')}" fill="none" stroke="#22c55e" stroke-width="2" />
              ${points
                .map((pt) => {
                  const [x, y] = pt.split(',');
                  return `<circle cx="${x}" cy="${y}" r="3" fill="#22c55e" stroke="#ffffff" stroke-width="1" />`;
                })
                .join('')}
            </svg>

            <!-- Chart Legend -->
            <div style="display: flex; justify-content: center; gap: 18px; margin-top: 4px; font-size: 8px;">
              <div style="display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #fb7185; border: 1px solid #e11d48;"></span>
                <span>Plan and activities to be conducted</span>
              </div>
              <div style="display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 10px; height: 10px; background-color: #7dd3fc; border: 1px solid #0284c7;"></span>
                <span>Actual Activity Conducted</span>
              </div>
              <div style="display: flex; align-items: center; gap: 3px;">
                <span style="display: inline-block; width: 12px; height: 2px; background-color: #22c55e;"></span>
                <span>% Accomplishment</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Analysis & Problems Encountered -->
        <div class="analysis-container">
          <div class="analysis-box">
            <div style="font-weight: bold; font-size: 8.5px; margin-bottom: 3px;">Analysis of why performance is below the target:</div>
            <div style="font-size: 8.5px; color: #222;">${plan.analysisBelowTarget || 'None. Targets were addressed according to the unit operational matrix.'}</div>
          </div>
          <div class="analysis-box">
            <div style="font-weight: bold; font-size: 8.5px; margin-bottom: 3px;">Problems encountered:</div>
            <div style="font-size: 8.5px; color: #222;">${plan.problemsEncountered || 'None. Deliverables proceeded according to resource allocation and unit schedule.'}</div>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
