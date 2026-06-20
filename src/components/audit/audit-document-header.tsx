interface AuditDocumentHeaderProps {
  docNum?: string;
  standard?: string;
  dateOfAudit?: string;
  reportTitle?: string;
  reportYear?: number;
  campusLocation?: string;
  logoPath?: string;
}

export const auditHeaderStyles = `
  .audit-header-table {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #000;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    margin-bottom: 16px;
  }
  .audit-header-table td {
    border: 1.5px solid #000;
    padding: 6px 8px;
    vertical-align: middle;
  }
  .audit-header-logo-cell {
    width: 110px;
    text-align: center;
    vertical-align: middle;
  }
  .audit-header-logo {
    max-width: 72px;
    max-height: 72px;
    display: block;
    margin: 0 auto;
  }
  .audit-header-center {
    text-align: center;
    vertical-align: middle;
  }
  .audit-header-univ {
    font-weight: 700;
    font-size: 11pt;
    color: #1e293b;
    margin: 0 0 2px 0;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .audit-header-iqa {
    font-weight: 900;
    font-size: 10pt;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    color: #1e293b;
    margin: 0 0 2px 0;
  }
  .audit-header-divider {
    height: 1px;
    background: #94a3b8;
    width: 80px;
    margin: 4px auto;
  }
  .audit-header-report-title {
    font-weight: 900;
    font-size: 9pt;
    text-transform: uppercase;
    color: #0f172a;
    margin: 0 0 2px 0;
  }
  .audit-header-campus {
    font-size: 9pt;
    font-style: italic;
    color: #475569;
    margin: 0;
  }
  .audit-header-label {
    font-weight: 700;
    font-size: 9pt;
    background: #f1f5f9;
    white-space: nowrap;
    width: 40%;
    border-right: 1.5px solid #000 !important;
  }
  .audit-header-value {
    font-size: 9pt;
    font-weight: 600;
  }
  .audit-header-page-value {
    font-size: 9pt;
    font-weight: 700;
    color: #64748b;
  }
  @media print {
    .audit-header-repeat {
      display: table-header-group;
    }
  }
`;

export const auditPageNumberScript = `
<script>
  function updatePageNumbers() {
    var pageEls = document.querySelectorAll('.page-number');
    var totalEls = document.querySelectorAll('.total-pages');
    if (!pageEls.length) return;
    var printContent = document.getElementById('print-content');
    if (!printContent) return;
    var pageHeight = 11 * 96;
    var totalHeight = printContent.scrollHeight;
    var totalPages = Math.ceil(totalHeight / pageHeight) || 1;
    for (var i = 0; i < pageEls.length; i++) {
      pageEls[i].textContent = i + 1;
    }
    for (var j = 0; j < totalEls.length; j++) {
      totalEls[j].textContent = totalPages;
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updatePageNumbers);
  } else {
    updatePageNumbers();
  }
  window.addEventListener('beforeprint', function() {
    setTimeout(updatePageNumbers, 100);
  });
</script>
`;

export function AuditDocumentHeader({
  docNum = '__________',
  standard = 'ISO 21001:2018',
  dateOfAudit = '__________',
  reportTitle = 'INTERNAL QUALITY AUDIT REPORT',
  reportYear = new Date().getFullYear(),
  campusLocation = 'Main Campus, Odiongan, Romblon',
  logoPath = '/rsulogo.png',
}: AuditDocumentHeaderProps) {
  return (
    <>
      <style>{auditHeaderStyles}</style>
      <table className="audit-header-table">
      <thead className="audit-header-repeat">
        <tr>
          <td rowSpan={4} className="audit-header-logo-cell">
            <img src={logoPath} alt="RSU Logo" className="audit-header-logo" />
          </td>
          <td rowSpan={4} className="audit-header-center">
            <p className="audit-header-univ">Romblon State University</p>
            <p className="audit-header-iqa">INTERNAL QUALITY AUDIT</p>
            <div className="audit-header-divider" />
            <p className="audit-header-report-title">{reportYear} {reportTitle}</p>
            <p className="audit-header-campus">{campusLocation}</p>
          </td>
          <td className="audit-header-label">Doc. Num.</td>
          <td className="audit-header-value">{docNum}</td>
        </tr>
        <tr>
          <td className="audit-header-label">Standard</td>
          <td className="audit-header-value">{standard}</td>
        </tr>
        <tr>
          <td className="audit-header-label">Date of Audit</td>
          <td className="audit-header-value">{dateOfAudit}</td>
        </tr>
        <tr>
          <td className="audit-header-label">Page</td>
          <td className="audit-header-page-value">
            Page <span className="page-number">1</span> of <span className="total-pages">1</span>
          </td>
        </tr>
        </thead>
      </table>
    </>
  );
}
