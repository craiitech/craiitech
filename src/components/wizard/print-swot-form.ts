import type { SwotAnalysisItem, SwotMetadata } from '@/lib/types';
import { format } from 'date-fns';

export function printSwotAnalysisForm(
  items: SwotAnalysisItem[],
  metadata: SwotMetadata | null,
  unitName: string,
  campusName: string = 'Main Campus',
  year: number = new Date().getFullYear(),
  preparedByName: string = 'Unit Head',
  approvedByName?: string,
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the official SWOT Analysis Form (QAO-01-001).');
    return;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const defaultMission =
    metadata?.mission ||
    'Romblon State University is committed to provide advanced education, higher technological and professional instruction to provide progressive leadership in arts, sciences and fields of specialization.';
  const defaultVision =
    metadata?.vision ||
    'A research-based, student-centered university committed to societal transformation and inclusive sustainable development.';
  const defaultPolicy =
    metadata?.qualityPolicy ||
    'Romblon State University commits to deliver quality educational services by continually improving its Educational Organizations Management System compliant with statutory and regulatory standards.';

  const rowsHtml =
    items.length === 0
      ? `<tr><td colspan="5" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No SWOT focus areas recorded.</td></tr>`
      : items
          .map(
            (item) => `
        <tr>
          <td style="border: 1px solid black; padding: 6px 8px; font-weight: bold; font-size: 10.5px; vertical-align: top; background-color: #fafafa;">
            ${item.focusArea || '—'}
          </td>
          <td style="border: 1px solid black; padding: 6px 8px; font-size: 10px; vertical-align: top;">
            ${item.strengths || '—'}
          </td>
          <td style="border: 1px solid black; padding: 6px 8px; font-size: 10px; vertical-align: top;">
            ${item.weaknesses || '—'}
          </td>
          <td style="border: 1px solid black; padding: 6px 8px; font-size: 10px; vertical-align: top;">
            ${item.opportunities || '—'}
          </td>
          <td style="border: 1px solid black; padding: 6px 8px; font-size: 10px; vertical-align: top;">
            ${item.threats || '—'}
          </td>
        </tr>
      `,
          )
          .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Form QAO-01-001 - SWOT Analysis - ${unitName}</title>
        <style>
          @page {
            size: portrait;
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
          .title-area {
            text-align: center;
            margin: 12px 0;
          }
          .meta-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
          }
          .meta-table td {
            border: 1px solid black;
            padding: 4px 6px;
            font-size: 10.5px;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .main-table th {
            border: 1px solid black;
            padding: 6px 4px;
            font-size: 10px;
            font-weight: bold;
            text-align: center;
          }
          .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          .sig-table td {
            border: 1px solid black;
            padding: 6px;
            font-size: 10.5px;
            vertical-align: top;
          }
          .doc-control {
            display: flex;
            justify-content: space-between;
            margin-top: 20px;
            font-size: 9.5px;
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
          <button class="btn-print" onclick="window.print()">Print Official Form QAO-01-001</button>
        </div>

        <!-- Institutional Header -->
        <table class="header-table">
          <tr>
            <td style="width: 75px; text-align: left; vertical-align: middle;">
              <img src="/rsulogo.png" alt="RSU Seal" style="height: 55px; object-fit: contain;" />
            </td>
            <td style="text-align: left; padding-left: 12px; vertical-align: middle;">
              <div style="font-size: 10.5px; text-transform: uppercase;">Republic of the Philippines</div>
              <div style="font-size: 15px; font-weight: bold;">ROMBLON STATE UNIVERSITY</div>
              <div style="font-size: 10.5px;">Romblon, Philippines</div>
            </td>
            <td style="width: 130px; text-align: right; vertical-align: middle;">
              <img src="/ISOlogo.jpg" alt="ISO 21001" style="height: 55px; object-fit: contain;" />
            </td>
          </tr>
        </table>

        <div style="border-bottom: 2px solid black; margin-bottom: 12px;"></div>

        <div class="title-area">
          <h2 style="margin: 0; font-size: 15px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px;">
            SWOT ANALYSIS
          </h2>
        </div>

        <!-- Unit & Vision/Mission Table -->
        <table class="meta-table">
          <tr>
            <td style="width: 20%; font-weight: bold; background-color: #fafafa;">Unit</td>
            <td style="font-weight: bold;">${campusName.toUpperCase()} — ${unitName.toUpperCase()}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #fafafa;">Mission</td>
            <td>${defaultMission}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #fafafa;">Vision</td>
            <td>${defaultVision}</td>
          </tr>
          <tr>
            <td style="font-weight: bold; background-color: #fafafa;">Quality Policy</td>
            <td>${defaultPolicy}</td>
          </tr>
        </table>

        <!-- Main SWOT Matrix -->
        <table class="main-table">
          <thead>
            <tr>
              <th rowspan="2" style="width: 18%; background-color: #e5e7eb;">Focus Area</th>
              <th colspan="2" style="width: 41%; background-color: #e5e7eb;">
                Internal Issues<br>
                <span style="font-weight: normal; font-size: 8.5px;">(issues related to values, culture, knowledge, and performance of the organization)</span>
              </th>
              <th colspan="2" style="width: 41%; background-color: #e5e7eb;">
                External Issues<br>
                <span style="font-weight: normal; font-size: 8.5px;">(issues arising from legal, technological, competitive, market, cultural, social and economic environments)</span>
              </th>
            </tr>
            <tr>
              <th style="width: 20.5%; background-color: #f3f4f6;">Strength</th>
              <th style="width: 20.5%; background-color: #f3f4f6;">Weaknesses</th>
              <th style="width: 20.5%; background-color: #f3f4f6;">Opportunities</th>
              <th style="width: 20.5%; background-color: #f3f4f6;">Threat</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Final Approval Section -->
        <div style="font-size: 10px; font-weight: bold; text-align: center; border: 1px solid black; border-bottom: none; background-color: #fafafa; padding: 4px;">
          FINAL APPROVAL
        </div>
        <table class="sig-table">
          <tr>
            <td style="width: 35%;">
              <div style="font-weight: bold; margin-bottom: 25px;">Prepared by:</div>
              <div style="text-align: center; font-weight: bold; text-transform: uppercase;">${preparedByName}</div>
              <div style="text-align: center; font-size: 9.5px;">Unit Head</div>
            </td>
            <td style="width: 35%;">
              <div style="font-weight: bold; margin-bottom: 25px;">Approved by:</div>
              <div style="text-align: center; font-weight: bold; text-transform: uppercase;">${approvedByName || 'DIRECTOR / VP'}</div>
              <div style="text-align: center; font-size: 9.5px;">Director / VP</div>
            </td>
            <td style="width: 30%;">
              <div style="font-weight: bold; margin-bottom: 25px;">Updated as of:</div>
              <div style="text-align: center; font-weight: bold;">${todayStr}</div>
            </td>
          </tr>
        </table>

        <!-- Document Control Footer -->
        <div class="doc-control">
          <div>
            <strong>QAO-01-001</strong><br>
            Creation Date: 2021-02-14<br>
            Revision Date: 2022-01-20
          </div>
          <div style="text-align: right;">
            SA No.: <strong style="font-family: monospace;">${metadata?.saNo || `SA-${year}-${unitName.slice(0, 4).toUpperCase()}-01`}</strong>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
