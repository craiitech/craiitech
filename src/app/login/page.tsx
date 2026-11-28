'use client';

import { useEffect } from 'react';
import { AuthForm } from '@/components/auth/auth-form';
import Image from 'next/image';
import { ShieldCheck, Info, Gavel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function LoginPage() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('rsu_eoms_announcement_spoken_session');
        sessionStorage.removeItem('rsu_eoms_voice_prompt_answered_session');
      } catch {
        // Ignore sessionStorage access errors (e.g. in private browsing modes)
      }
    }
  }, []);

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      {/* Static Campus Background */}
      <div className="fixed inset-0 -z-10 h-full w-full bg-slate-950 overflow-hidden">
        <div
          className="absolute inset-0 w-full h-full bg-cover bg-center opacity-25"
          style={{ backgroundImage: "url('/rsupage.png')" }}
        />
        <div className="absolute inset-0 bg-slate-950/85" />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Institutional & Legal Information */}
          <div className="hidden lg:flex flex-col space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Romblon State University
              </p>
              <h1 className="text-4xl font-bold text-white uppercase tracking-tight leading-tight">
                UAQA <span className="text-primary">Portal</span>
              </h1>
              <p className="text-slate-300 text-base leading-relaxed max-w-md">
                Secure digital portal for Romblon State University&apos;s Quality Management System.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-slate-900/90 border-white/10 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Data Privacy &amp; Security</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      In accordance with <strong className="text-white">RA 10173 (Data Privacy Act of 2012)</strong>,
                      records are protected with <strong className="text-white">AES-256</strong> storage encryption,{' '}
                      <strong className="text-white">TLS</strong> transport security, and{' '}
                      <strong className="text-white">HMAC-SHA-256</strong> verification.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/90 border-white/10 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Gavel className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Legal &amp; Ethical Compliance</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      By logging in, you agree to be bound by{' '}
                      <strong className="text-white">RA 10175 (Cybercrime Prevention Act of 2012)</strong>. Unauthorized
                      access or data modification is strictly prohibited and subject to university disciplinary action.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-2.5 text-slate-400">
                <Info className="h-4 w-4" />
                <p className="text-xs font-medium uppercase tracking-wider">
                  ISO 21001:2018 Certified Management System
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-medium uppercase text-slate-400 tracking-wider">Protected by:</span>
                <a
                  href="https://letsencrypt.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80 transition-opacity block"
                >
                  <Image
                    src="/ssl.png"
                    alt="Protected by Let's Encrypt SSL"
                    width={130}
                    height={35}
                    className="object-contain h-7 w-auto"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Right Side: Auth Form Container */}
          <div className="flex justify-center lg:justify-end">
            <AuthForm initialTab="signin" />
          </div>
        </div>
      </div>
    </div>
  );
}
