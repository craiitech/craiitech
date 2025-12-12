
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-landing');
  return (
    <div className="relative flex flex-col min-h-screen w-full items-center justify-center text-center text-white overflow-hidden">
        {heroImage && (
            <Image
                src={heroImage.imageUrl}
                alt={heroImage.description}
                layout="fill"
                objectFit="cover"
                className="-z-20"
                data-ai-hint={heroImage.imageHint}
            />
        )}
        <div className="absolute inset-0 bg-black/50 -z-10" />

        <div className="flex flex-col items-center justify-center space-y-6">
            <div className="flex items-center justify-center gap-4">
                <Logo className="h-12 w-12 text-white" />
                <h1 className="text-4xl font-bold tracking-tighter sm:text-6xl xl:text-7xl/none">
                    RSU EOMS
                </h1>
            </div>
            <p className="max-w-[600px] text-white/80 md:text-xl">
                Educational Organizations Management System or ISO 21001:2018 Submission Portal
            </p>
            <div className="flex flex-col gap-4 min-[400px]:flex-row">
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
            </div>
             <p className="text-xs text-white/60">&copy; 2024 Romblon State University. All rights reserved.</p>
        </div>
    </div>
  );
}
