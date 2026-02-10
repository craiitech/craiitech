'use client';

import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
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
import { PublicSubmissionMatrix } from '@/components/public-submission-matrix';
import { ShieldCheck, ArrowRight, Activity, Globe } from 'lucide-react';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-landing');
  const isoImage = PlaceHolderImages.find(p => p.id === 'iso-certification');
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
        {/* Hero Section */}
        <div className="relative h-screen flex flex-col items-center justify-center text-center text-white overflow-hidden shrink-0">
            {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    priority
                    className="-z-20 object-cover opacity-40"
                    data-ai-hint={heroImage.imageHint}
                />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950 -z-10" />

            <div className="flex flex-col items-center justify-center space-y-8 p-4 max-w-5xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 backdrop-blur-md">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>ISO 21001:2018 Certified Management System</span>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <Logo className="h-16 w-16 text-white" />
                        <h1 className="text-5xl font-bold tracking-tighter sm:text-7xl xl:text-8xl/none">
                            RSU EOMS
                        </h1>
                    </div>
                    <p className="text-xl sm:text-2xl text-white/70 max-w-2xl mx-auto">
                        A centralized platform for monitoring Educational Organizations Management System compliance and document control.
                    </p>
                </div>

                <div className="flex flex-wrap justify-center gap-4">
                    <Button asChild size="lg" variant="default" className="h-14 px-8 text-lg font-semibold shadow-xl shadow-primary/20">
                        <Link href="/login" className="flex items-center gap-2">
                            Access Portal <ArrowRight className="h-5 w-5" />
                        </Link>
                    </Button>
                    <Button asChild size="lg" variant="outline" className="h-14 px-8 text-lg bg-white/5 border-white/20 text-white hover:bg-white/10">
                        <Link href="/register">
                            Create Account
                        </Link>
                    </Button>
                </div>

                <div className="flex gap-8 pt-8">
                    <div className="text-center">
                        <p className="text-3xl font-bold">100%</p>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Transparency</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold">LIVE</p>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Monitoring</p>
                    </div>
                    <div className="text-center">
                        <p className="text-3xl font-bold">QA</p>
                        <p className="text-xs text-white/40 uppercase tracking-widest">Verification</p>
                    </div>
                </div>
            </div>
            
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
                <p className="text-[10px] uppercase tracking-[0.3em] font-bold mb-2">Transparency Board</p>
                <div className="h-10 w-[1px] bg-gradient-to-b from-white to-transparent mx-auto" />
            </div>
        </div>

        {/* Matrix Section */}
        <section className="flex-1 container mx-auto px-4 py-24">
            <div className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-16">
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                            <Activity className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">Live Compliance</h3>
                        <p className="text-white/60">Every unit across our campuses is tracked in real-time. This matrix ensures accountability and continuous improvement.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-accent/20 flex items-center justify-center">
                            <Globe className="h-6 w-6 text-accent" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">One University</h3>
                        <p className="text-white/60">Bridging all sites—from Main to satellite campuses—under a unified quality management framework.</p>
                    </div>
                    <div className="space-y-4">
                        <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center">
                            <ShieldCheck className="h-6 w-6 text-white" />
                        </div>
                        <h3 className="text-2xl font-bold text-white">QA Validated</h3>
                        <p className="text-white/60">Submissions are rigorously checked by the Quality Assurance Office to maintain ISO 21001:2018 standards.</p>
                    </div>
                </div>

                <PublicSubmissionMatrix />
            </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-white/5 py-12 bg-slate-950">
            <div className="container mx-auto px-4 text-center space-y-6">
                <div className="flex justify-center gap-6">
                    <Button variant="link" asChild className="text-white/40 hover:text-white">
                        <Link href="/help">Support Center</Link>
                    </Button>
                    <Button variant="link" asChild className="text-white/40 hover:text-white">
                        <Link href="/terms">Terms & Conditions</Link>
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
                                    <p className="font-bold text-primary mb-1">PROJECT LEADER & DEVELOPER</p>
                                    <p className="text-lg">Dr. Marvin Rick G. Forcado</p>
                                </div>
                                <div className="space-y-2">
                                    <p className="font-semibold text-white/80 px-1">Project Members:</p>
                                    <ul className="grid grid-cols-2 gap-2 text-white/60 text-xs px-1">
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