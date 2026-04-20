
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
    ShieldAlert, 
    ClipboardCheck, 
    BookOpen, 
    LayoutList, 
    HandHeart, 
    CheckCircle2,
    Target,
    ListChecks,
    UserCheck,
    BarChart3,
    ChevronRight,
    Search
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const features = [
    {
        title: "EOMS Submission Hub",
        desc: "ISO 7.5.3 Compliance. Streamlined workflow for the 6 core EOMS documents with automated revision control and standardized control numbering.",
        icon: <FileText className="h-6 w-6 text-primary" />,
        tag: "ISO 7.5"
    },
    {
        title: "Risk & Opportunity",
        desc: "ISO 6.1 Compliance. Integrated digital registry for identifying, analyzing, and mitigating institutional vulnerabilities with AI-powered treatment suggestions.",
        icon: <Target className="h-6 w-6 text-rose-600" />,
        tag: "ISO 6.1"
    },
    {
        title: "IQA Strategic Planning",
        desc: "ISO 9.2 Compliance. Digital conduct of Internal Quality Audits with real-time evidence logging, auditor assignments, and consolidated reporting.",
        icon: <ClipboardCheck className="h-6 w-6 text-indigo-600" />,
        tag: "ISO 9.2"
    },
    {
        title: "Academic Monitoring",
        desc: "Quality Excellence. Real-time tracking of CHED COPC, AACCUP accreditation, faculty alignment, and institutional graduation outcomes.",
        icon: <BookOpen className="h-6 w-6 text-emerald-600" />,
        tag: "ACADEMIC"
    },
    {
        title: "Unit Monitoring Hub",
        desc: "Operational Integrity. On-site verification tool for facility maintenance, 7S compliance, and physical posting of institutional quality directives.",
        icon: <LayoutList className="h-6 w-6 text-amber-600" />,
        tag: "OPERATIONS"
    },
    {
        title: "Unit Form Control",
        desc: "Document Governance. Centralized roster of approved unit forms with a formal registration workflow (DRF) and authorized download auditing.",
        icon: <ListChecks className="h-6 w-6 text-blue-600" />,
        tag: "CONTROL"
    },
    {
        title: "Institutional Activity Log",
        desc: "Performance Tracking. Daily task registry for personnel and Work From Home (WFH) accomplishment sheets with integrated supervisor verification.",
        icon: <UserCheck className="h-6 w-6 text-slate-700" />,
        tag: "PERSONNEL"
    },
    {
        title: "GAD Corner Hub",
        desc: "Institutional Inclusivity. Consolidated sex-disaggregated data (SDD) and gender-responsive project tracking aligned with PCW standards.",
        icon: <HandHeart className="h-6 w-6 text-purple-600" />,
        tag: "GAD"
    },
    {
        title: "Strategic Dashboard",
        desc: "Decision Support. High-level institutional analytics featuring maturity radar charts, compliance heatmaps, and implementation velocity trends.",
        icon: <BarChart3 className="h-6 w-6 text-cyan-600" />,
        tag: "ANALYTICS"
    }
];

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col overflow-x-hidden bg-slate-50">
        {/* Full-Page Fixed Background */}
        <div className="fixed inset-0 -z-20 h-full w-full">
            <Image
                src="/rsupage.png"
                alt="Romblon State University Background"
                fill
                priority
                className="object-cover"
            />
            {/* Dark overlay to ensure readability */}
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-[2px]" />
        </div>

        {/* Hero Section */}
        <section className="relative flex flex-col items-center justify-center text-center text-white min-h-[90vh] px-4">
            <div className="flex flex-col items-center justify-center space-y-8 max-w-5xl animate-in fade-in zoom-in duration-1000">
                <div className="flex flex-col items-center gap-6">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
                        <ShieldCheck className="h-4 w-4 text-primary" />
                        <span className="font-bold tracking-tight">ISO 21001:2018 Certified Management System</span>
                    </div>
                </div>
                
                <div className="space-y-4">
                    <div className="flex flex-col items-center justify-center gap-4">
                        <h1 className="text-5xl font-black tracking-tighter sm:text-7xl xl:text-8xl/none uppercase">
                            RSU EOMS
                        </h1>
                    </div>
                    <p className="text-lg sm:text-xl text-white/70 max-w-3xl mx-auto leading-relaxed">
                        Educational Organizations Management System Submission and Monitoring Portal. A state-of-the-art digital solution for the Romblon State University - Quality Assurance Office.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4 pt-6">
                    <Button asChild size="lg" variant="default" className="h-14 px-10 text-lg font-black uppercase tracking-widest shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95">
                        <Link href="/login" className="flex items-center gap-2">
                            Access Portal <ArrowRight className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-14 px-10 text-lg bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold uppercase tracking-widest transition-all">
                        <Link href="/register">
                            Create Account
                        </Link>
                    </Button>
                </div>
            </div>
        </section>

        {/* Features Section */}
        <section className="relative py-24 px-4 bg-white/95 backdrop-blur-xl border-t border-white/20">
            <div className="container mx-auto max-w-7xl">
                <div className="text-center mb-16 space-y-3">
                    <Badge className="bg-primary text-white px-4 py-1 font-black uppercase text-[10px] tracking-[0.2em]">Platform Capabilities</Badge>
                    <h2 className="text-3xl font-black text-slate-900 sm:text-4xl uppercase tracking-tight">Operational Excellence, Digitized.</h2>
                    <p className="text-slate-500 max-w-2xl mx-auto font-medium">A comprehensive suite of modules designed to ensure institutional compliance, risk proactivity, and academic quality parity.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, idx) => (
                        <Card key={idx} className="group border-slate-100 shadow-sm transition-all hover:shadow-xl hover:-translate-y-2 duration-500 flex flex-col h-full bg-white/95 backdrop-blur-xl">
                            <CardHeader className="p-8 pb-4">
                                <div className="flex items-start justify-between">
                                    <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center group-hover:bg-primary/10 transition-colors duration-500">
                                        {feature.icon}
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-black tracking-widest border-slate-200 text-slate-400 group-hover:text-primary group-hover:border-primary/40 transition-colors uppercase">{feature.tag}</Badge>
                                </div>
                                <CardTitle className="text-lg font-black text-slate-900 mt-6 group-hover:text-primary transition-colors uppercase tracking-tight leading-tight">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="p-8 pt-0 flex-1">
                                <p className="text-sm text-slate-600 leading-relaxed font-medium">{feature.desc}</p>
                            </CardContent>
                            <CardFooter className="p-8 pt-0 mt-auto">
                                <div className="flex items-center gap-2 text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                                    Institutional Standard Compliance <ChevronRight className="h-3 w-3" />
                                </div>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            </div>
        </section>

        {/* Statistics Banner */}
        <section className="relative py-20 bg-slate-900 text-white overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10" />
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
                    <div className="space-y-2">
                        <p className="text-4xl font-black tabular-nums tracking-tighter">100%</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Digital Traceability</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black tabular-nums tracking-tighter">ISO</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">21001:2018 Standards</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black tabular-nums tracking-tighter">6</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Core EOMS Reports</p>
                    </div>
                    <div className="space-y-2">
                        <p className="text-4xl font-black tabular-nums tracking-tighter">7S</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Active Monitoring</p>
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
                            <Button variant="link" className="text-white/40 hover:text-white">About Project</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
                            <AlertDialogHeader>
                                <AlertDialogTitle>About the Project</AlertDialogTitle>
                                <AlertDialogDescription className="text-white/60">
                                    This project is a collaboration between the Quality Assurance Office and the Center for Research in Artificial Intelligence and Information Technologies (CRAIITech).
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <div className="text-sm space-y-4 py-4">
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
                            </div>
                            <AlertDialogFooter className="border-t border-white/5 pt-4">
                                <div className="text-[10px] text-white/20 w-full text-center">
                                    Copyright © 2025 RSU-CRAIITech
                                </div>
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
  );
}
