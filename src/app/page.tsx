
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

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-landing');
  const isoImage = PlaceHolderImages.find(p => p.id === 'iso-certification');
  return (
    <div className="relative flex flex-col min-h-screen w-full items-center justify-center text-center text-white overflow-hidden">
        {heroImage && (
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                fill
                priority
                className="-z-20 object-cover"
                data-ai-hint={heroImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50 -z-10" />

        <div className="flex flex-col items-center justify-center space-y-6 p-4">
            <div className="flex items-center justify-center gap-4">
                <Logo className="h-12 w-12 text-white" />
                <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl xl:text-7xl/none">
                    RSU EOMS Submission Tracker
                </h1>
            </div>
            <p className="max-w-[700px] text-white/80 md:text-xl">
                Educational Organizations Management System or ISO 21001:2018 Submission Portal
                <br />
                <span className="text-base">Managed by the Quality Assurance Office</span>
            </p>
            {isoImage && (
                <div className="mt-4 flex flex-col items-center gap-2">
                    <Image
                        src="/ISOlogo.jpg"
                        alt={isoImage.description}
                        width={200}
                        height={200}
                        quality={100}
                        className="rounded-lg"
                        data-ai-hint={isoImage.imageHint}
                    />
                    <p className="text-xs text-white/70">Certified ISO 21001:2018</p>
                </div>
            )}
            <div className="flex flex-wrap justify-center gap-4">
                <Button asChild size="lg" variant="secondary">
                    <Link href="/login">
                        Login
                    </Link>
                </Button>
                <Button asChild size="lg">
                    <Link href="/register">
                        Register
                    </Link>
                </Button>
                 <Button asChild size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
                    <Link href="/help">
                        Support
                    </Link>
                </Button>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white/10">
                            About
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="text-left text-foreground">
                        <AlertDialogHeader>
                            <AlertDialogTitle>About the Project</AlertDialogTitle>
                            <AlertDialogDescription>
                                This project is a collaboration between the Quality Assurance Office and the Center for Research in Artificial Intelligence and Information Technologies (CRAIITech).
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <div className="text-sm space-y-3">
                            <div>
                                <p className="font-semibold">PROJECT LEADER and DEVELOPER:</p>
                                <p>Dr. Marvin Rick G. Forcado</p>
                            </div>
                            <div>
                                <p className="font-semibold">Members:</p>
                                <ul className="list-disc list-inside text-muted-foreground">
                                    <li>Ms. Sarah Jane F. Fallaria</li>
                                    <li>Ms. Zachary F. Fetalco</li>
                                    <li>Ms. Aimelyn D. Rufon</li>
                                    <li>Ms. Bea Trixia F. Veneracion</li>
                                </ul>
                            </div>
                        </div>
                        <AlertDialogFooter>
                            <div className="text-xs text-muted-foreground w-full text-center">
                                Copyright 2025 RSU-CRAIITech
                            </div>
                            <AlertDialogAction>Close</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
             <p className="text-xs text-white/60">
                &copy; 2025 Romblon State University - Quality Assurance Office. All rights reserved. 
                <Link href="/terms" className="underline hover:text-white ml-1">Read our Terms and Conditions.</Link>
             </p>
        </div>
    </div>
  );
}
