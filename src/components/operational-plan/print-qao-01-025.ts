import type { OperationalPlanDocument, OperationalPlanItem } from '@/lib/types';
import { getAgendaList } from '@/lib/constants';
import { format } from 'date-fns';

export function printOperationalPlanForm(
  plan: OperationalPlanDocument,
  items: OperationalPlanItem[],
  campusName: string = 'Main Campus',
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the official Form QAO-01-025.');
    return;
  }

  const updatedDateStr = plan.updatedAt?.toDate
    ? format(plan.updatedAt.toDate(), 'yyyy-MM-dd')
    : plan.updatedAt instanceof Date
      ? format(plan.updatedAt, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd');

  const preparedDateStr = plan.preparedAt?.toDate
    ? format(plan.preparedAt.toDate(), 'yyyy-MM-dd')
    : plan.preparedAt instanceof Date
      ? format(plan.preparedAt, 'yyyy-MM-dd')
      : '—';

  const approvedDateStr = plan.approvedAt?.toDate
    ? format(plan.approvedAt.toDate(), 'yyyy-MM-dd')
    : plan.approvedAt instanceof Date
      ? format(plan.approvedAt, 'yyyy-MM-dd')
      : 'Pending Review';

  const isFirst = plan.cycleId === 'first';
  const isFinal = plan.cycleId === 'final';

  // Group items by objective for proper Form QAO-01-025 tabular presentation
  const groupedItems: Array<{
    objective: string;
    vpObjectiveTitle?: string;
    archipelagicPillar?: string;
    sucLevellingKra?: string;
    tenPointAgenda?: string;
    tenPointAgendas?: string[];
    qualityObjective?: string;
    tasks: OperationalPlanItem[];
  }> = [];
  const groupMap = new Map<string, (typeof groupedItems)[0]>();

  const sortedItems = [...items].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  sortedItems.forEach((item) => {
    const key = item.objective?.trim() || '—';
    let g = groupMap.get(key);
    if (!g) {
      g = {
        objective: key,
        vpObjectiveTitle: item.vpObjectiveTitle,
        archipelagicPillar: item.archipelagicPillar,
        sucLevellingKra: item.sucLevellingKra,
        tenPointAgenda: item.tenPointAgenda,
        tenPointAgendas: item.tenPointAgendas,
        qualityObjective: item.qualityObjective,
        tasks: [],
      };
      groupMap.set(key, g);
      groupedItems.push(g);
    }
    g.tasks.push(item);
  });

  const rowsHtml =
    items.length === 0
      ? `<tr><td colspan="9" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No operational tasks or activities recorded.</td></tr>`
      : groupedItems
          .map((group) => {
            return group.tasks
              .map((item, tIdx) => {
                const budgetFormatted = item.budget ? `₱${Number(item.budget).toLocaleString()}` : '—';
                const agendaSpans = getAgendaList(group.tenPointAgenda, group.tenPointAgendas)
                  .map(
                    (agenda) =>
                      `<span style="display:inline-block; font-size:8.5px; background:#ecfdf5; color:#047857; border:1px solid #a7f3d0; border-radius:3px; padding:1px 4px; margin-right:3px; margin-top:3px;">Agenda: ${agenda}</span>`,
                  )
                  .join('');

                const alignmentsHtml = [
                  group.archipelagicPillar
                    ? `<span style="display:inline-block; font-size:8.5px; background:#faf5ff; color:#7e22ce; border:1px solid #e9d5ff; border-radius:3px; padding:1px 4px; margin-right:3px; margin-top:3px;">Archipelagic (AQ): ${group.archipelagicPillar}</span>`
                    : '',
                  group.sucLevellingKra
                    ? `<span style="display:inline-block; font-size:8.5px; background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe; border-radius:3px; padding:1px 4px; margin-right:3px; margin-top:3px;">SUC: ${group.sucLevellingKra}</span>`
                    : '',
                  agendaSpans,
                  group.qualityObjective
                    ? `<span style="display:inline-block; font-size:8.5px; background:#fffbeb; color:#b45309; border:1px solid #fde68a; border-radius:3px; padding:1px 4px; margin-top:3px;">ISO: ${group.qualityObjective}</span>`
                    : '',
                ]
                  .filter(Boolean)
                  .join('');

                const objectiveCell =
                  tIdx === 0
                    ? `<td rowspan="${group.tasks.length}" style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top; background-color: #fafafa;">
                      <div style="font-weight: bold; margin-bottom: 3px;">${group.objective}</div>
                      ${group.vpObjectiveTitle ? `<div style="font-size: 9px; color: #555;">Institutional: ${group.vpObjectiveTitle}</div>` : ''}
                      ${alignmentsHtml ? `<div style="margin-top: 4px;">${alignmentsHtml}</div>` : ''}
                    </td>`
                    : '';

                return `
                <tr>
                  ${objectiveCell}
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    ${item.tasks || '—'}
                    ${item.hasGadComponent ? `<div style="margin-top:3px;"><span style="display:inline-block; font-size:8.5px; background:#f3e8ff; color:#6b21a8; border:1px solid #d8b4fe; border-radius:3px; padding:1px 4px; font-weight:bold;">GAD Component (${item.gadCategory || 'Client-Focused'})</span></div>` : ''}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top; text-align: center;">
                    ${item.timelineStart && item.timelineEnd ? `${item.timelineStart} to ${item.timelineEnd}` : item.timelineStart || item.timelineEnd || '—'}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    ${item.personsResponsible || '—'}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    ${item.resources || '—'}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top; text-align: right; white-space: nowrap;">
                    ${budgetFormatted}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    <div style="font-weight: 500;">${item.successIndicator || '—'}</div>
                    ${item.targetMetricValue !== undefined ? `<div style="font-size: 9.5px; color: #0284c7; margin-top: 2px;">Target: ${item.targetMetricValue} ${item.targetMetricUnit || ''}</div>` : ''}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    <div>${item.progressUpdates || (isFirst ? '<span style="color: #999; font-style: italic;">To be updated in Final Cycle</span>' : '—')}</div>
                    ${item.actualMetricValue !== undefined ? `<div style="font-size: 9.5px; color: #059669; font-weight: bold; margin-top: 2px;">Actual: ${item.actualMetricValue} ${item.targetMetricUnit || ''}</div>` : ''}
                  </td>
                  <td style="border: 1px solid black; padding: 6px 8px; font-size: 11px; vertical-align: top;">
                    ${item.remarks || (isFirst ? '<span style="color: #999; font-style: italic;">To be updated in Final Cycle</span>' : '—')}
                  </td>
                </tr>
              `;
              })
              .join('');
          })
          .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Form QAO-01-025 - Operational Plan - ${plan.unitName}</title>
        <style>
          @page {
            size: landscape;
            margin: 0.4in;
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
            gap: 12px;
            margin-bottom: 20px;
          }
          .btn-print {
            background-color: #047857;
            color: white;
            border: none;
            padding: 10px 24px;
            border-radius: 6px;
            font-weight: bold;
            font-size: 13px;
            cursor: pointer;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .btn-print:hover { background-color: #065f46; }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .header-table td {
            vertical-align: middle;
            border: none;
            padding: 0;
          }
          .title-area {
            text-align: center;
            margin: 10px 0 14px 0;
          }
          .op-title {
            font-size: 16px;
            font-weight: bold;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0 0 4px 0;
          }
          .op-meta-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 6px;
            font-size: 12px;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .main-table th {
            background-color: #F8B808;
            border: 1px solid black;
            padding: 8px 6px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            color: #000;
          }
          .footer-section {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
            page-break-inside: avoid;
          }
          .sig-box {
            width: 40%;
          }
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
          .sig-title {
            text-align: center;
            font-size: 11px;
            font-weight: bold;
          }
          .sig-date {
            margin-top: 8px;
            font-size: 11px;
          }
          .doc-control {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            margin-top: 30px;
            font-size: 10px;
            color: #333;
          }
          @media print {
            .no-print { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="no-print">
          <button class="btn-print" onclick="window.print()">Print Official Form QAO-01-025</button>
        </div>

        <!-- Institutional Header -->
        <table class="header-table">
          <tr>
            <td style="width: 80px; text-align: left;">
              <img src="/rsulogo.png" alt="RSU Logo" style="height: 65px; object-fit: contain;" />
            </td>
            <td style="text-align: left; padding-left: 15px;">
              <div style="font-size: 11px; text-transform: uppercase;">Republic of the Philippines</div>
              <div style="font-size: 16px; font-weight: bold; letter-spacing: 0.5px;">ROMBLON STATE UNIVERSITY</div>
              <div style="font-size: 11px;">Romblon, Philippines</div>
            </td>
            <td style="width: 140px; text-align: right;">
              <img src="/ISOlogo.jpg" alt="ISO 21001" style="height: 65px; object-fit: contain;" />
            </td>
          </tr>
        </table>

        <div style="border-bottom: 2px solid black; margin-bottom: 12px;"></div>

        <!-- Document Title & Meta -->
        <div class="title-area">
          <div class="op-title">OPERATIONAL PLAN</div>
          <div style="font-size: 12px;">
            Fiscal Year: <strong>${plan.year}</strong> &nbsp;&nbsp;&nbsp;&nbsp;
            [${isFirst ? '<strong>X</strong>' : '&nbsp;&nbsp;'}] First &nbsp;&nbsp;&nbsp;&nbsp;
            [${isFinal ? '<strong>X</strong>' : '&nbsp;&nbsp;'}] Final
          </div>
        </div>

        <div class="op-meta-row">
          <div>
            Campus / College / Unit: <strong style="text-decoration: underline; text-underline-offset: 4px;">${campusName.toUpperCase()} — ${plan.unitName.toUpperCase()}</strong>
          </div>
          <div>
            Updated as of (yyyy-mm-dd): <strong style="text-decoration: underline; text-underline-offset: 4px;">${updatedDateStr}</strong>
          </div>
        </div>

        <!-- Main Form Grid (Matching Form QAO-01-025) -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 14%;">Objective/s<br><span style="font-weight: normal; font-size: 9.5px;">(From Strategic Plan / IPCR)</span></th>
              <th style="width: 17%;">Tasks / Activities</th>
              <th style="width: 9%;">Timeline<br><span style="font-weight: normal; font-size: 9.5px;">(start-end)</span></th>
              <th style="width: 11%;">Persons Responsible</th>
              <th style="width: 11%;">Resources</th>
              <th style="width: 8%;">Budget</th>
              <th style="width: 13%;">Success Indicators</th>
              <th style="width: 9%;">Progress / Updates</th>
              <th style="width: 8%;">Remarks</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Signatures Block -->
        <div class="footer-section">
          <div class="sig-box">
            <div style="font-weight: bold; margin-bottom: 8px;">Prepared:</div>
            <div class="sig-line">${plan.preparedByName || 'UNIT HEAD'}</div>
            <div class="sig-title">Unit Head</div>
            <div class="sig-date">Date: <strong>${preparedDateStr}</strong></div>
          </div>

          <div class="sig-box">
            <div style="font-weight: bold; margin-bottom: 8px;">Checked/Approved:</div>
            <div class="sig-line">${plan.approvedByName || (plan.status === 'Approved' ? 'DIRECTOR / VP' : 'PENDING APPROVAL')}</div>
            <div class="sig-title">Director / VP's</div>
            <div class="sig-date">Date: <strong>${approvedDateStr}</strong></div>
          </div>
        </div>

        <!-- Official ISO Document Control Footer -->
        <div class="doc-control">
          <div>
            <strong>QAO-01-025</strong><br>
            Creation Date: 2021-02-14<br>
            Revision Date: 2024-01-22
          </div>
          <div style="text-align: right;">
            OP No.: <strong style="font-family: monospace; font-size: 11px;">${plan.opControlNumber || `OP-${plan.year}-${plan.unitId.slice(0, 6).toUpperCase()}`}</strong>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
}
