'use client';

import { AuthForm } from '@/components/auth/auth-form';
import Image from 'next/image';
import { ShieldCheck, UserPlus, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function RegisterPage() {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      {/* Static Background Layer */}
      <div className="fixed inset-0 -z-10 h-full w-full">
        <Image src="/rsulogo.png" alt="RSU Background" fill priority className="object-cover" />
        <div className="absolute inset-0 bg-slate-950/90" />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left Side: Registration Info */}
          <div className="hidden lg:flex flex-col space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
                Romblon State University
              </p>
              <h1 className="text-4xl font-bold text-white uppercase tracking-tight leading-tight">
                Join the <span className="text-primary">EOMS Registry</span>
              </h1>
              <p className="text-slate-300 text-base leading-relaxed max-w-md">
                Create your account using your official RSU email to manage institutional quality evidence.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <Card className="bg-slate-900/90 border-white/10 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <UserPlus className="h-5 w-5 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Institutional Account Setup</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      All registrations are subject to verification by the Quality Assurance Office. Ensure your First
                      and Last names match your official university ID.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/90 border-white/10 shadow-sm">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold text-white">Data Integrity Bound</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      By registering, you acknowledge your responsibility to maintain the integrity of institutional
                      records under <strong className="text-white">RA 10173</strong> and{' '}
                      <strong className="text-white">RA 10175</strong>.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-2.5 text-slate-400">
              <Info className="h-4 w-4" />
              <p className="text-xs font-medium uppercase tracking-wider">RSU Quality Assurance Personnel Registry</p>
            </div>
          </div>

          {/* Right Side: Auth Form Container */}
          <div className="flex justify-center lg:justify-end">
            <AuthForm initialTab="signup" />
          </div>
        </div>
      </div>
    </div>
  );
}
