import type { Risk } from '@/lib/types';
import { format } from 'date-fns';
import { formatRiskTargetDate } from '@/lib/utils';

export function printRiskActionPlanForm(
  risks: Risk[],
  unitName: string,
  campusName: string = 'Main Campus',
  year: number = new Date().getFullYear(),
  cycle: 'first' | 'final' = 'first',
  preparedByName: string = 'Unit Head',
  approvedByName?: string,
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the Risk and Opportunity Action Plan.');
    return;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  // Filter for Medium and High rating risks
  const actionPlanRisks = risks.filter((r) => {
    const rating = r.preTreatment?.rating?.toLowerCase() || '';
    const magnitude = r.preTreatment?.magnitude || 0;
    return rating.includes('medium') || rating.includes('high') || magnitude >= 5 || Boolean(r.treatmentAction);
  });

  const rowsHtml =
    actionPlanRisks.length === 0
      ? `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No Medium or High rated risks requiring an Action Plan. All risks are within Low/Acceptable thresholds.</td></tr>`
      : actionPlanRisks
          .map((risk, idx) => {
            const rating =
              risk.preTreatment?.rating ||
              (risk.preTreatment?.magnitude && risk.preTreatment.magnitude >= 10 ? 'High' : 'Medium');
            const ratingColor = rating.toLowerCase().includes('high') ? '#be123c' : '#d97706';
            const targetDateStr = formatRiskTargetDate(risk.targetDate, '—');

            return `
          <tr>
            <td style="border: 1px solid black; text-align: center; font-size: 10px; padding: 4px;">${idx + 1}</td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10.5px; vertical-align: top; font-weight: bold;">
              ${risk.objective || '—'}
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top;">
              <div><strong>[${risk.type}]</strong> ${risk.description || '—'}</div>
              <div style="font-size: 9px; color: #555; margin-top: 3px;">Controls: ${risk.currentControls || '—'}</div>
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: center; vertical-align: top;">
              <div>L: ${risk.preTreatment?.likelihood || 1} × C: ${risk.preTreatment?.consequence || 1}</div>
              <div style="font-weight: bold; color: ${ratingColor}; margin-top: 2px;">
                ${risk.preTreatment?.magnitude || 1} (${rating})
              </div>
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top; background-color: #fffbeb;">
              <strong style="color: #92400e;">${risk.treatmentAction || 'To be formulated'}</strong>
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top;">
              ${risk.resourcesNeeded || 'Regular MOOE'}
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; vertical-align: top;">
              ${risk.responsiblePersonName || 'Unit In-Charge'}
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: center; vertical-align: top; font-family: monospace;">
              ${targetDateStr}
            </td>
            <td style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: center; font-weight: bold;">
              <span style="color: ${risk.status === 'Closed' ? '#059669' : '#0284c7'};">
                ${risk.status || 'Open'}
              </span>
            </td>
          </tr>
        `;
          })
          .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Risk & Opportunity Action Plan (QAO-00-027) - ${unitName}</title>
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
            background-color: #b45309;
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
            background-color: #fef3c7;
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
          <button class="btn-print" onclick="window.print()">Print Form QAO-00-027 (ROAP)</button>
        </div>

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
          <div style="font-size: 15px; font-weight: bold; text-transform: uppercase;">RISK AND OPPORTUNITY ACTION PLAN (ROAP)</div>
          <div style="font-size: 10.5px; color: #444;">Form QAO-00-027: Monitoring Tool for Medium & High Rated Risk Treatment</div>
          <div style="font-size: 11.5px; margin-top: 2px;">Fiscal Year: <strong>${year}</strong> &nbsp;|&nbsp; Cycle: <strong>${cycle === 'first' ? 'First Cycle' : 'Final Cycle'}</strong></div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 11px;">
          <div>Campus / Unit: <strong>${campusName.toUpperCase()} — ${unitName.toUpperCase()}</strong></div>
          <div>Updated as of: <strong>${todayStr}</strong></div>
        </div>

        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 3%;">#</th>
              <th style="width: 16%;">Linked Unit Objective</th>
              <th style="width: 18%;">Risk / Opportunity Statement</th>
              <th style="width: 9%;">Pre-Rating (L × C)</th>
              <th style="width: 20%;">Treatment Action Plan</th>
              <th style="width: 10%;">Resources Needed</th>
              <th style="width: 10%;">Responsible Person</th>
              <th style="width: 8%;">Target Date</th>
              <th style="width: 6%;">Status</th>
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
          <div>Form Code: <strong>QAO-00-027</strong> | Rev. 02</div>
          <div>ISO 21001:2018 Clause 6.1 Action to Address Risks and Opportunities</div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
