'use client';

import { useEffect, useState } from 'react';
import { Smartphone, Download, ShieldCheck } from 'lucide-react';

export default function GetAppPage() {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const downloadUrl = `${origin}/downloads/rsu-eoms-portal.apk`;
  const pageUrl = `${origin}/get-app`;
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(pageUrl)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(downloadUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* clipboard not available */ }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto shadow-lg shadow-primary/5">
            <Smartphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 dark:text-slate-200">RSU EOMS Portal</h1>
          <p className="text-sm text-muted-foreground font-medium">
            Install the Android app for quick access to the EOMS quality management system.
          </p>
        </div>

        <div className="bg-white rounded-2xl border shadow-xl p-6 space-y-5">
          <div className="flex justify-center">
            {origin && (
              <img
                src={qrSrc}
                alt="QR code to download the RSU EOMS Portal Android app"
                width={200}
                height={200}
                className="rounded-xl border p-2 bg-white"
              />
            )}
          </div>

          <div className="space-y-2">
            <a
              href={downloadUrl}
              download
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-primary text-white font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform"
            >
              <Download className="h-4 w-4" />
              Install App
            </a>
            <button
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {copied ? 'Link Copied' : 'Copy Download Link'}
            </button>
          </div>

          <div className="flex items-center gap-2 justify-center text-[10px] text-muted-foreground font-medium">
            <ShieldCheck className="h-3 w-3 text-emerald-500" />
            Version 1.0 &bull; 3.9 MB
          </div>
        </div>

        <div className="text-center text-[10px] text-muted-foreground font-medium leading-relaxed">
          Scan the QR code with your phone camera to open this page and install the app.
          <br />
          You may need to enable{' '}
          <span className="font-black text-slate-600 dark:text-slate-400">Install from unknown sources</span> in your device settings.
        </div>
      </div>
    </div>
  );
}
