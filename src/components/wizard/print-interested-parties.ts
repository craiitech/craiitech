import type { InterestedPartyItem } from '@/lib/types';
import { format } from 'date-fns';

export function printInterestedPartiesForm(
  items: InterestedPartyItem[],
  unitName: string,
  campusName: string = 'Main Campus',
  year: number = new Date().getFullYear(),
  preparedByName: string = 'Unit Head',
  approvedByName?: string,
  neNo?: string,
) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print the official Needs and Expectations of Interested Parties (Form QAO-01-003).');
    return;
  }

  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const rowsHtml =
    items.length === 0
      ? `<tr><td colspan="3" style="text-align: center; padding: 24px; color: #666; font-style: italic;">No interested parties recorded.</td></tr>`
      : items
          .map((item) => {
            const pairs =
              item.pairs && item.pairs.length > 0 ? item.pairs : [{ need: item.needs, expectation: item.expectations }];

            if (pairs.length === 1) {
              return `
            <tr>
              <td style="border: 1px solid black; padding: 8px 10px; font-weight: bold; font-size: 11px; vertical-align: top; width: 30%;">
                ${item.partyName || '—'}
              </td>
              <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
                ${pairs[0].need || '—'}
              </td>
              <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
                ${pairs[0].expectation || '—'}
              </td>
            </tr>
          `;
            }

            return `
          <tr>
            <td rowspan="${pairs.length}" style="border: 1px solid black; padding: 8px 10px; font-weight: bold; font-size: 11px; vertical-align: top; width: 30%;">
              ${item.partyName || '—'}
            </td>
            <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
              ${pairs[0].need || '—'}
            </td>
            <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
              ${pairs[0].expectation || '—'}
            </td>
          </tr>
          ${pairs
            .slice(1)
            .map(
              (p) => `
            <tr>
              <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
                ${p.need || '—'}
              </td>
              <td style="border: 1px solid black; padding: 8px 10px; font-size: 10.5px; vertical-align: top; width: 35%;">
                ${p.expectation || '—'}
              </td>
            </tr>
          `,
            )
            .join('')}
        `;
          })
          .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Form QAO-01-003 - Needs and Expectations of Interested Parties - ${unitName}</title>
        <style>
          @page {
            size: portrait;
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
            margin-bottom: 20px;
          }
          .btn-print {
            background-color: #111827;
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
          .black-banner {
            background-color: #000;
            color: #fff;
            text-align: center;
            padding: 7px 4px;
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 0.5px;
            margin: 12px 0 14px 0;
          }
          .meta-row {
            display: flex;
            justify-content: space-between;
            font-size: 11.5px;
            font-weight: bold;
            margin-bottom: 8px;
            border-bottom: 1px solid black;
            padding-bottom: 6px;
          }
          .main-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          .main-table th {
            border: 1px solid black;
            padding: 8px 6px;
            font-size: 11px;
            font-weight: bold;
            text-align: center;
            background-color: #f9fafb;
          }
          .sig-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          .sig-table td {
            border: 1px solid black;
            padding: 8px 12px;
            font-size: 10.5px;
            vertical-align: top;
          }
          .doc-control {
            display: flex;
            justify-content: space-between;
            margin-top: 25px;
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
          <button class="btn-print" onclick="window.print()">Print Form QAO-01-003</button>
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

        <div style="border-bottom: 2px solid black; margin-bottom: 8px;"></div>

        <!-- Black Header Banner (Exact from Form QAO-01-003) -->
        <div class="black-banner">
          Needs and Expectations of the Interested Parties
        </div>

        <div class="meta-row">
          <div>Unit: <span style="font-weight: normal; text-decoration: underline; text-underline-offset: 3px;">${campusName.toUpperCase()} — ${unitName.toUpperCase()}</span></div>
          <div>Updated as of: <span style="font-weight: normal; text-decoration: underline; text-underline-offset: 3px;">${todayStr}</span></div>
        </div>

        <!-- Main Table -->
        <table class="main-table">
          <thead>
            <tr>
              <th style="width: 30%;">Interested Parties</th>
              <th style="width: 35%;">Needs<br><span style="font-weight: normal; font-size: 9.5px; font-style: italic;">(Stated Services)</span></th>
              <th style="width: 35%;">Expectations<br><span style="font-weight: normal; font-size: 9.5px; font-style: italic;">(Implied Requirements)</span></th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <!-- Signatures Table -->
        <table class="sig-table">
          <tr>
            <td style="width: 50%;">
              <div style="font-weight: bold; margin-bottom: 30px;">Prepared by:</div>
              <div style="text-align: center; font-weight: bold; text-transform: uppercase;">${preparedByName}</div>
              <div style="text-align: center; font-size: 9.5px;">Unit Head</div>
            </td>
            <td style="width: 50%;">
              <div style="font-weight: bold; margin-bottom: 30px;">Approved by:</div>
              <div style="text-align: center; font-weight: bold; text-transform: uppercase;">${approvedByName || 'DIRECTOR / VP'}</div>
              <div style="text-align: center; font-size: 9.5px;">Director / VP</div>
            </td>
          </tr>
        </table>

        <!-- Document Control Footer -->
        <div class="doc-control">
          <div>
            <strong>QAO-01-003</strong><br>
            Creation Date: 2021-02-14<br>
            Revision Date: 2022-01-20
          </div>
          <div style="text-align: right;">
            NE No.: <strong style="font-family: monospace;">${neNo || `NE-${year}-${unitName.slice(0, 4).toUpperCase()}-01`}</strong>
          </div>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
