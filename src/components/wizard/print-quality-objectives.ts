import type { QualityObjectiveItem } from '@/lib/types';
import { format } from 'date-fns';

export function printQualityObjectivesForm(
  items: QualityObjectiveItem[],
  unitName: string,
  campusName: string = 'Main Campus',
  year: number = new Date().getFullYear(),
  cycle: 'first' | 'final' = 'first',
  preparedByName: string = 'Unit Head',
  approvedByName?: string,
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the Quality Objectives Monitoring Form.');
    return;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const rowsHtml =
    items.length === 0
      ? `<tr><td colspan="18" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No quality objectives or monthly schedules defined.</td></tr>`
      : items
          .map((item, idx) => {
            const monthsCols = Array.from({ length: 12 }, (_, i) => {
              const isActive = item.activeMonths?.includes(i + 1);
              return `<td style="border: 1px solid black; text-align: center; font-size: 10px; font-weight: bold; background-color: ${isActive ? '#dbeafe' : 'transparent'};">
            ${isActive ? '✓' : ''}
          </td>`;
            }).join('');

            return `
          <tr>
            <td style="border: 1px solid black; text-align: center; font-size: 10px; padding: 4px;">${idx + 1}</td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10.5px; vertical-align: top;">
              <div style="font-weight: bold;">${item.objectiveText || '—'}</div>
              <div style="font-size: 9.5px; color: #444; margin-top: 2px;">Activity: ${item.taskText || '—'}</div>
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10.5px; vertical-align: top;">
              ${item.targetIndicator || '—'}
            </td>
            ${monthsCols}
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top;">
              ${item.actualOutput || (cycle === 'first' ? '<span style="color: #999; font-style: italic;">Cycle 2 target</span>' : '—')}
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: center; font-weight: bold;">
              <span style="color: ${item.status === 'Achieved' ? '#059669' : item.status === 'Ongoing' ? '#0284c7' : '#d97706'};">
                ${item.status || 'Pending'}
              </span>
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top;">
              ${item.responsiblePerson || '—'}
            </td>
          </tr>
        `;
          })
          .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Quality Objectives Monitoring - ${unitName}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.35in;
          }
          body {
            font-family: Arial, Helvetica, sans-serif;
            color: #000;
            background: #fff;
            margin: 0;
            padding: 10px;
            font-size: 11px;
          }
          .no-print {
            display: flex;
            justify-content: center;
            margin-bottom: 20px;
          }
          .btn-print {
            background-color: #1e3a8a;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            text-transform: uppercase;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 8px;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .main-table th {
            background-color: #f1f5f9;
            border: 1px solid black;
            padding: 6px 4px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
            page-break-inside: avoid;
          }
          .sig-box { width: 35%; }
          .sig-line {
            border-bottom: 1.5px solid black;
            height: 35px;
            margin-bottom: 4px;
            display: flex;
            align-items: flex-end;
            justify-content: center;
            font-weight: bold;
            text-transform: uppercase;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">Print Quality Objectives Monitoring Form</button>
        </div>

        <!-- Institutional Header -->
        <table class="header-table">
          <tr>
            <td style="width: 80px; text-align: left;">
              <img src="/rsulogo.png" alt="RSU Logo" style="height: 60px; object-fit: contain;" />
            </td>
            <td style="text-align: left; padding-left: 15px;">
              <div style="font-size: 11px; text-transform: uppercase;">Republic of the Philippines</div>
              <div style="font-size: 15px; font-weight: bold;">ROMBLON STATE UNIVERSITY</div>
              <div style="font-size: 11px;">Romblon, Philippines</div>
            </td>
            <td style="width: 140px; text-align: right;">
              <img src="/ISOlogo.jpg" alt="ISO 21001" style="height: 60px; object-fit: contain;" />
            </td>
          </tr>
        </table>

        <div style="border-bottom: 2px solid black; margin-bottom: 10px;"></div>

        <div style="text-align: center; margin-bottom: 12px;">
          <div style="font-size: 15px; font-weight: bold; text-transform: uppercase;">QUALITY OBJECTIVES MONITORING FORM</div>
          <div style="font-size: 11.5px;">Fiscal Year: <strong>${year}</strong> &nbsp;|&nbsp; Cycle: <strong>${cycle === 'first' ? 'First Cycle' : 'Final Cycle'}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
          <div>Campus / Unit: <strong>${campusName.toUpperCase()} — ${unitName.toUpperCase()}</strong></div>
          <div>Updated as of: <strong>${todayStr}</strong></div>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 3%;">#</th>
              <th rowspan="2" style="width: 20%;">Quality Objective & Tasks</th>
              <th rowspan="2" style="width: 18%;">Target Success Indicator</th>
              <th colspan="12" style="width: 30%;">Monthly Action Plan Schedule</th>
              <th rowspan="2" style="width: 14%;">Actual Progress / Output</th>
              <th rowspan="2" style="width: 8%;">Status</th>
              <th rowspan="2" style="width: 7%;">In-Charge</th>
            </tr>
            <tr>
              ${monthNames.map((m) => `<th style="width: 2.5%; font-size: 9px; padding: 2px;">${m}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="footer-section">
          <div class="sig-box">
            <div style="font-weight: bold; margin-bottom: 6px;">Prepared:</div>
            <div class="sig-line">${preparedByName}</div>
            <div style="text-align: center; font-size: 10px; font-weight: bold;">Unit Head</div>
          </div>
          <div class="sig-box">
            <div style="font-weight: bold; margin-bottom: 6px;">Checked / Approved:</div>
            <div class="sig-line">${approvedByName || 'DIRECTOR / VP'}</div>
            <div style="text-align: center; font-size: 10px; font-weight: bold;">Director / VP</div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-top: 25px; font-size: 9.5px; color: #444;">
          <div>Form Code: <strong>RSU-QAO-QOM-001</strong> | Rev. 02</div>
          <div>ISO 21001:2018 Clause 6.2 Certified Quality Management System</div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
