'use client';

import { AuthForm } from '@/components/auth/auth-form';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { ShieldCheck, Lock, Scale, Info, Gavel } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function LoginPage() {
  const bgImage = PlaceHolderImages.find((p) => p.id === 'auth-background');
  
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden p-4 lg:p-0">
      {/* Background Image Layer */}
      <div className="fixed inset-0 -z-10 h-full w-full">
          <Image
              src="/rsupage.png"
              alt="RSU Background"
              fill
              priority
              className="object-cover"
          />
          <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
      </div>

      <div className="container relative z-10 mx-auto max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Left Side: Institutional & Legal Information */}
          <div className="hidden lg:flex flex-col space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
            <div className="space-y-4">
              <Badge variant="outline" className="text-primary border-primary/40 bg-primary/5 px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em]">
                Institutional Security Gateway
              </Badge>
              <h1 className="text-5xl font-black text-white uppercase tracking-tighter leading-none">
                RSU EOMS <br />
                <span className="text-primary">Portal Access</span>
              </h1>
              <p className="text-slate-300 text-lg font-medium leading-relaxed max-w-md">
                Secure digital environment for Romblon State University's Quality Management System.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Data Privacy Assurance</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      In accordance with <strong className="text-white">RA 10173 (Data Privacy Act of 2012)</strong>, all personal data and evidence logs are encrypted. Your institutional identity is protected by multi-layer access control.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 backdrop-blur-md border-white/10 shadow-2xl">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Gavel className="h-6 w-6 text-amber-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-black text-white uppercase tracking-tight">Legal & Ethical Compliance</h4>
                    <p className="text-xs text-slate-300 leading-relaxed font-medium">
                      By logging in, you agree to be bound by <strong className="text-white">RA 10175 (Cybercrime Prevention Act of 2012)</strong>. Unauthorized access or data modification is strictly prohibited and subject to university disciplinary action.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex items-center gap-3 pl-2 opacity-50">
               <Info className="h-4 w-4 text-white" />
               <p className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">ISO 21001:2018 Certified Management System</p>
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
