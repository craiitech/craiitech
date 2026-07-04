export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function openPrintWindow(title: string, bodyHtml: string): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const sanitizedBody = bodyHtml.replace(
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    '',
  );

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
        <style>
          @page { size: 8.5in 13in; margin: 0.5in; }
          @media print { body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact; } .no-print { display: none !important; } }
          body { font-family: sans-serif; background: #f9fafb; padding: 40px; color: black; }
        </style>
      </head>
      <body>
        <div class="no-print mb-8 flex justify-center">
          <button onclick="window.print()" class="bg-blue-600 text-white px-8 py-3 rounded shadow-xl hover:bg-blue-700 font-black uppercase text-xs tracking-widest transition-all">
            Click to Print
          </button>
        </div>
        <div id="print-content">${sanitizedBody}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
}
