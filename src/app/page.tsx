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
import { ShieldCheck, ArrowRight } from 'lucide-react';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-landing');
  
  return (
    <div className="relative min-h-screen bg-slate-950 flex flex-col overflow-x-hidden">
        {/* Global Page Background */}
        {heroImage && (
            <div className="fixed inset-0 -z-20">
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    fill
                    priority
                    className="object-cover opacity-20"
                    data-ai-hint={heroImage.imageHint}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-slate-950/40 to-slate-950" />
            </div>
        )}

        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex flex-col items-center justify-center text-center text-white shrink-0 py-20">
            <div className="flex flex-col items-center justify-center space-y-8 p-4 max-w-5xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/80 backdrop-blur-md">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>ISO 21001:2018 Certified Management System</span>
                </div>
                
                <div className="space-y-4">
                    <div className="flex items-center justify-center gap-4">
                        <Logo className="h-12 w-12 text-white" />
                        <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl xl:text-7xl/none">
                            RSU EOMS
                        </h1>
                    </div>
                    <p className="text-lg sm:text-xl text-white/70 max-w-2xl mx-auto">
                        Educational Organizations Management System Submission and Monitoring Portal.
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
            </div>
        </section>

        {/* Matrix Section */}
        <section className="relative flex-1 container mx-auto px-4 pb-24 z-10">
            <div className="max-w-6xl mx-auto">
                <PublicSubmissionMatrix />
            </div>
        </section>

        {/* Footer */}
        <footer className="relative border-t border-white/5 py-12 bg-slate-950/80 backdrop-blur-sm mt-auto">
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