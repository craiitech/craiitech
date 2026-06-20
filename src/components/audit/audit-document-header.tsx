import { ReactNode } from 'react';

interface AuditDocumentHeaderProps {
  docNum?: string;
  standard?: string;
  dateOfAudit?: string;
  reportTitle?: string;
  reportYear?: number;
  campusLocation?: string;
  logoPath?: string;
  children?: ReactNode;
}

export const auditHeaderStyles = `
  .audit-outer-table {
    width: 100%;
    border-collapse: collapse;
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
  }
  @media print {
    .audit-outer-thead {
      display: table-header-group;
    }
  }
  .audit-inner-header {
    width: 100%;
    border-collapse: collapse;
    border: 1.5px solid #000;
    margin-bottom: 0;
  }
  .audit-inner-header td {
    border: 1.5px solid #000;
    padding: 5px 8px;
    vertical-align: middle;
  }
  .audit-header-logo-cell {
    width: 95px;
    text-align: center;
    vertical-align: middle;
  }
  .audit-header-logo {
    max-width: 60px;
    max-height: 60px;
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
    font-size: 10pt;
    background: #f1f5f9;
    white-space: nowrap;
    padding: 5px 8px !important;
    border-right: 1.5px solid #000 !important;
  }
  .audit-header-value {
    font-size: 10pt;
    font-weight: 600;
    padding: 5px 8px !important;
  }
  .audit-header-page-value {
    font-size: 10pt;
    font-weight: 700;
    color: #64748b;
    padding: 5px 8px !important;
  }
`;

export const auditPageNumberScript = `
<script>
  (function(){var b=document.querySelector('base')||document.createElement('base');b.href=location.origin+'/';if(!b.parentNode)document.head.insertBefore(b,document.head.firstChild);})();
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

function HeaderTable({
  docNum = '__________',
  standard = 'ISO 21001:2018',
  dateOfAudit = '__________',
  reportTitle = 'INTERNAL QUALITY AUDIT REPORT',
  reportYear = new Date().getFullYear(),
  campusLocation = 'Main Campus, Odiongan, Romblon',
  logoPath = '/rsulogo.png',
}: AuditDocumentHeaderProps) {
  return (
    <table className="audit-inner-header">
      <tbody>
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
          <td className="audit-header-label" width="130">Doc. Num.</td>
          <td className="audit-header-value" width="130">{docNum}</td>
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
      </tbody>
    </table>
  );
}

export function AuditDocumentHeader(props: AuditDocumentHeaderProps) {
  const { children, logoPath: passedLogoPath, ...restProps } = props;
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const logoPath = passedLogoPath ?? '/rsulogo.png';
  const resolvedLogo = logoPath.startsWith('/') ? origin + logoPath : logoPath;
  const headerProps = { ...restProps, logoPath: resolvedLogo };

  if (!children) {
    return (
      <>
        <style>{auditHeaderStyles}</style>
        <HeaderTable {...headerProps} />
      </>
    );
  }

  return (
    <>
      <style>{auditHeaderStyles}</style>
      <table className="audit-outer-table">
        <thead className="audit-outer-thead">
          <tr>
            <td style={{ padding: 0, border: 'none' }}>
              <HeaderTable {...headerProps} />
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={{ padding: 0, border: 'none', verticalAlign: 'top' }}>
              {children}
            </td>
          </tr>
        </tbody>
      </table>
    </>
  );
}
