'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ShieldCheck,
  ArrowRight,
  FileText,
  ClipboardCheck,
  BookOpen,
  LayoutList,
  HandHeart,
  Target,
  ListChecks,
  UserCheck,
  BarChart3,
  QrCode,
  Camera,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
  {
    title: 'EOMS Submission Hub',
    desc: 'Streamlined workflow for the 6 core EOMS documents (ISO 7.5.3) with revision tracking and standardized control numbering.',
    icon: <FileText className="h-5 w-5 text-primary" />,
    tag: 'ISO 7.5',
  },
  {
    title: 'Risk & Opportunity',
    desc: 'Digital registry for identifying, analyzing, and mitigating institutional risks (ISO 6.1) with baseline and residual impact scoring.',
    icon: <Target className="h-5 w-5 text-rose-600" />,
    tag: 'ISO 6.1',
  },
  {
    title: 'IQA Strategic Planning',
    desc: 'Internal Quality Audit scheduling, evidence logging, auditor assignments, and consolidated audit reporting (ISO 9.2).',
    icon: <ClipboardCheck className="h-5 w-5 text-indigo-600" />,
    tag: 'ISO 9.2',
  },
  {
    title: 'Academic Monitoring',
    desc: 'Tracking of CHED COPC, AACCUP accreditation levels, faculty alignment, and program graduation outcomes.',
    icon: <BookOpen className="h-5 w-5 text-emerald-600" />,
    tag: 'ACADEMIC',
  },
  {
    title: 'Unit Monitoring Hub',
    desc: 'On-site verification tool for facility maintenance, 7S compliance, and posting of institutional quality directives.',
    icon: <LayoutList className="h-5 w-5 text-amber-600" />,
    tag: 'OPERATIONS',
  },
  {
    title: 'Unit Form Control',
    desc: 'Centralized roster of approved unit forms with formal registration workflows (DRF) and download auditing.',
    icon: <ListChecks className="h-5 w-5 text-blue-600" />,
    tag: 'CONTROL',
  },
  {
    title: 'Institutional Activity Log',
    desc: 'Daily task registry for personnel and Work From Home (WFH) accomplishment sheets with supervisor verification.',
    icon: <UserCheck className="h-5 w-5 text-slate-700 dark:text-slate-300" />,
    tag: 'PERSONNEL',
  },
  {
    title: 'GAD Corner Hub',
    desc: 'Consolidated sex-disaggregated data (SDD) and gender-responsive project tracking aligned with PCW standards.',
    icon: <HandHeart className="h-5 w-5 text-purple-600" />,
    tag: 'GAD',
  },
  {
    title: 'Strategic Dashboard',
    desc: 'Institutional analytics featuring maturity charts, compliance heatmaps, and implementation progress tracking.',
    icon: <BarChart3 className="h-5 w-5 text-cyan-600" />,
    tag: 'ANALYTICS',
  },
];

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* Full-Page Fixed Background */}
      <div className="fixed inset-0 -z-10 h-full w-full">
        <Image src="/rsupage.png" alt="Romblon State University Background" fill priority className="object-cover" />
        {/* Dark overlay to ensure high contrast for text */}
        <div className="absolute inset-0 bg-slate-950/85" />
      </div>

      {/* Content Wrapper */}
      <div className="relative z-10 flex flex-col overflow-x-hidden">
        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center text-center text-white min-h-[85dvh] px-4 py-16">
          <div className="flex flex-col items-center justify-center space-y-8 max-w-4xl">
            <div className="flex flex-col items-center gap-5">
              {/* Logos Container */}
              <div className="flex items-center justify-center gap-5 sm:gap-8 px-6 py-4 bg-white/10 rounded-xl border border-white/15">
                {/* RSU Logo */}
                <div className="relative w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20">
                  <Image
                    src="/rsulogo.png"
                    alt="Romblon State University Logo"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 56px, (max-width: 768px) 72px, 80px"
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="h-10 w-[1px] bg-white/20" />

                {/* QA Logo */}
                <div className="relative w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20">
                  <Image
                    src="/qa_logo.png"
                    alt="Quality Assurance Logo"
                    fill
                    unoptimized
                    sizes="(max-width: 640px) 56px, (max-width: 768px) 72px, 80px"
                    className="object-contain"
                    priority
                  />
                </div>

                <div className="h-10 w-[1px] bg-white/20" />

                {/* ISO Logo */}
                <a
                  href="https://www.certipedia.com/quality_marks/9000018803?locale=en"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative w-24 h-14 sm:w-32 sm:h-18 md:w-36 md:h-20 hover:opacity-90 transition-opacity"
                >
                  <Image
                    src="/ISOlogo.jpg"
                    alt="ISO Certification Logo"
                    fill
                    unoptimized
                    className="object-contain rounded-md"
                    priority
                  />
                </a>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-1.5 text-xs sm:text-sm text-white">
                <ShieldCheck className="h-4 w-4 text-primary" />
                <span className="font-semibold tracking-tight">ISO 21001:2018 Certified Management System</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center">
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight uppercase flex flex-wrap items-baseline justify-center gap-x-3">
                  <span>RSU</span>
                  <span className="text-primary">UAQA</span>
                  <span>PORTAL</span>
                </h1>
                <span className="mt-2.5 text-xs sm:text-sm font-semibold tracking-widest text-emerald-300 uppercase text-center">
                  Unified Archipelagic Quality Assurance Portal
                </span>
              </div>
              <p className="text-base sm:text-lg text-white/85 max-w-2xl mx-auto leading-relaxed font-normal">
                Official Educational Organizations Management System (ISO 21001:2018) portal for the Romblon State
                University Quality Assurance Office.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-4 pt-4">
              <Button
                asChild
                size="lg"
                variant="default"
                className="w-full max-w-[260px] sm:w-auto h-12 px-8 text-sm font-semibold tracking-wide shadow-md flex justify-center items-center gap-2"
              >
                <Link href="/login">
                  Access Portal <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="w-full max-w-[260px] sm:w-auto h-12 px-8 text-sm bg-white/5 border-white/30 text-white hover:bg-white/15 font-semibold tracking-wide flex justify-center items-center"
              >
                <Link href="/register">Create Account</Link>
              </Button>
              {/* My Attendance — device-bound QR shortcut (Mobile/Tablet only) */}
              <Button
                asChild
                size="lg"
                className="lg:hidden w-full max-w-[260px] sm:w-auto h-12 px-8 text-sm font-semibold tracking-wide shadow-md bg-emerald-700 hover:bg-emerald-600 border-none text-white flex justify-center items-center"
              >
                <Link href="/attendance-app" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  My Attendance
                </Link>
              </Button>
              {/* Scan QR — mobile camera QR scanner (Mobile/Tablet only) */}
              <Button
                asChild
                size="lg"
                className="lg:hidden w-full max-w-[260px] sm:w-auto h-12 px-8 text-sm font-semibold tracking-wide shadow-md bg-amber-600 hover:bg-amber-500 border-none text-white flex justify-center items-center"
              >
                <Link href="/scan" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" />
                  Scan QR
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="relative py-20 px-4 bg-white border-t border-slate-200">
          <div className="container mx-auto max-w-7xl">
            <div className="text-center mb-12 space-y-2">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">Core Modules</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Institutional Quality &amp; Compliance Workflows
              </h2>
              <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
                Integrated tools for EOMS document control, internal quality audits, risk management, academic
                monitoring, and institutional reporting.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, idx) => (
                <Card
                  key={idx}
                  className="border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full bg-white"
                >
                  <CardHeader className="p-6 pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center">
                        {feature.icon}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-[10px] font-semibold tracking-wider border-slate-200 text-slate-600 uppercase"
                      >
                        {feature.tag}
                      </Badge>
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 mt-4 leading-tight">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 flex-1">
                    <p className="text-sm text-slate-600 leading-relaxed">{feature.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Statistics Banner */}
        <section className="relative py-16 bg-slate-900 text-white border-t border-slate-800">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums tracking-tight">100%</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Digital Traceability</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums tracking-tight">ISO</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">21001:2018 Standards</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums tracking-tight">6</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Core EOMS Reports</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold tabular-nums tracking-tight">7S</p>
                <p className="text-xs font-medium uppercase tracking-wider text-slate-400">Active Monitoring</p>
              </div>
            </div>
          </div>
        </section>

        {/* Simple Footer */}
        <footer className="relative border-t border-white/10 py-12 bg-black/40 backdrop-blur-md mt-auto">
          <div className="container mx-auto px-4 text-center space-y-6">
            <div className="flex flex-wrap justify-center gap-6">
              <Button variant="link" asChild className="text-white/40 hover:text-white">
                <Link href="/help">Support Center</Link>
              </Button>
              <Button variant="link" asChild className="text-white/40 hover:text-white">
                <Link href="/privacy">Data Privacy</Link>
              </Button>
              <Button variant="link" asChild className="text-white/40 hover:text-white">
                <Link href="/terms">Terms & Conditions</Link>
              </Button>
              <Button variant="link" asChild className="text-white/40 hover:text-white">
                <Link href="/evaluate" className="flex items-center gap-1">
                  <ShieldCheck className="h-3 w-3" /> Software Quality
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="link" className="text-white/40 hover:text-white">
                    About Project
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>About the Project</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      This project is a collaboration between the Quality Assurance Office and the Center for Research
                      in Artificial Intelligence and Information Technologies (CRAIITech).
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="text-sm space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-1">
                    <div className="p-4 rounded-lg bg-white/5 border border-white/5">
                      <p className="font-bold text-primary mb-1 text-[10px] uppercase tracking-widest">Project Lead</p>
                      <p className="text-lg">Dr. Marvin Rick G. Forcado</p>
                    </div>
                    <div className="space-y-2">
                      <p className="font-semibold text-white/80 px-1 text-xs">Project Members:</p>
                      <ul className="grid grid-cols-2 gap-2 text-white/60 text-[10px] px-1">
                        <li>Ms. Sarah Jane F. Fallaria</li>
                        <li>Ms. Zachary F. Fetalco</li>
                        <li>Ms. Aimelyn D. Rufon</li>
                        <li>Ms. Bea Trixia F. Veneracion</li>
                      </ul>
                    </div>
                    <div className="border-t border-white/10 pt-4 space-y-3">
                      <p className="font-bold text-primary px-1 text-xs uppercase tracking-widest">
                        About the IDIMAS Project Researcher
                      </p>
                      <div className="p-4 rounded-lg bg-white/5 border border-white/5 space-y-3">
                        <div>
                          <p className="font-bold text-white/40 text-[9px] uppercase tracking-widest mb-0.5">Lead</p>
                          <p className="text-sm font-semibold">Dr. Marvin Rick G. Forcado</p>
                        </div>
                        <div>
                          <p className="font-bold text-white/40 text-[9px] uppercase tracking-widest mb-1">Members</p>
                          <ul className="grid grid-cols-2 gap-2 text-white/60 text-[10px]">
                            <li>Engr. Julie F. Fallaria</li>
                            <li>Ms. Sarah Jane F. Fallaria</li>
                            <li>Ms. Wennie D. Fajutnao</li>
                            <li>Mr. Turner Evon F. De Torres</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                  <AlertDialogFooter className="border-t border-white/5 pt-4">
                    <div className="text-[10px] text-white/20 w-full text-center">Copyright © 2025 RSU-CRAIITech</div>
                    <AlertDialogAction className="bg-primary hover:bg-primary/90 text-white">Close</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-white/40">&copy; 2025 Romblon State University - Quality Assurance Office.</p>
              <p className="text-[10px] text-white/20 uppercase tracking-[0.2em]">Crafted by CRAIITech</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
