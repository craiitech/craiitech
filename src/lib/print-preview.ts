export interface PrintPreviewOptions {
  title: string;
  contentHtml: string;
  pageSize?: string;
  previewWidth?: string;
  toolbarLabel?: string;
  description?: string;
  extraCss?: string;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    };
    return entities[character] ?? character;
  });

/**
 * Opens a print preview window that reuses the application's compiled styles.
 * This keeps arbitrary Tailwind values, CSS variables, and custom report
 * components rendering exactly as they do in the app instead of relying on a
 * limited CDN build of Tailwind.
 */
export function openInstitutionalPrintPreview({
  title,
  contentHtml,
  pageSize = '13in 8.5in',
  previewWidth = '13in',
  toolbarLabel = 'Print / Save as PDF',
  description = 'Preview the report below, then print or save it as a PDF.',
  extraCss = '',
}: PrintPreviewOptions): Window | null {
  if (typeof window === 'undefined') return null;

  const styleMarkup = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => node.outerHTML)
    .join('\n');

  const printWindow = window.open('', '_blank');
  if (!printWindow) return null;

  printWindow.document.open();
  printWindow.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <base href="${window.location.origin}/" />
  <title>${escapeHtml(title)}</title>
  ${styleMarkup}
  <style>
    @page { size: ${pageSize}; margin: 0.35in; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { background: #fff !important; color: #0f172a; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Arial, sans-serif; }
    #print-document { background: #fff; }
    .print-toolbar { display: none; }
    @media screen {
      body { background: #eef2f7; padding: 24px; }
      #print-document {
        width: ${previewWidth};
        max-width: 100%;
        margin: 0 auto;
        padding: 0.35in;
        box-sizing: border-box;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
      }
      .print-toolbar {
        display: flex !important;
        justify-content: center;
        align-items: center;
        gap: 12px;
        padding: 16px;
        margin-bottom: 16px;
        background: #f1f5f9;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
      }
    }
    @media print {
      body { padding: 0 !important; }
      #print-document {
        width: auto !important;
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
      }
      .print-toolbar { display: none !important; }
    }
    ${extraCss}
  </style>
</head>
<body>
  <div class="print-toolbar">
    <button onclick="window.print()" style="padding: 12px 28px; background: #1B6535; color: #fff; border: none; border-radius: 8px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; cursor: pointer;">
      ${escapeHtml(toolbarLabel)}
    </button>
    <span style="font-size: 11px; color: #475569;">${escapeHtml(description)}</span>
  </div>
  <main id="print-document">
    <div id="print-content">${contentHtml}</div>
  </main>
</body>
</html>`);
  printWindow.document.close();

  return printWindow;
}
