import { Button } from '@/components/ui/button';
import { Logo } from '@/components/logo';
import Link from 'next/link';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { FileText, GanttChartSquare, MessageSquare, UserPlus } from 'lucide-react';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-landing');
  const featureImage = PlaceHolderImages.find(p => p.id === 'feature-landing');
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-14 flex items-center bg-card border-b">
        <Link href="#" className="flex items-center justify-center" prefetch={false}>
          <Logo className="h-6 w-6 text-primary" />
          <span className="ml-2 font-semibold text-lg">RSU EOMS</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button asChild variant="ghost">
            <Link href="/login">
                Login
            </Link>
          </Button>
          <Button asChild>
             <Link href="/register">
                Register
            </Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        {/* Hero Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_550px] lg:gap-12 xl:grid-cols-[1fr_650px]">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    RSU EOMS Submission Portal
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Welcome to the Romblon State University Extension Office Management System. The centralized hub for all your compliance and operational reporting needs.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/login">
                      Get Started
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="lg">
                     <Link href="/register">
                      Learn More
                    </Link>
                  </Button>
                </div>
              </div>
                {heroImage && (
                <Image
                    src={heroImage.imageUrl}
                    alt={heroImage.description}
                    width="650"
                    height="400"
                    className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last"
                    data-ai-hint={heroImage.imageHint}
                />
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
         <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
                <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Simplify Your Workflow</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Our portal is designed to make the submission and approval process as seamless as possible, saving you time and effort.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <div className="grid gap-1 text-center">
                 <FileText className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Streamlined Submissions</h3>
                <p className="text-muted-foreground">Easily upload and manage all your required documents through a single, intuitive interface.</p>
              </div>
              <div className="grid gap-1 text-center">
                <GanttChartSquare className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Real-time Tracking</h3>
                <p className="text-muted-foreground">Monitor the status of your submissions in real-time, from initial upload to final approval.</p>
              </div>
               <div className="grid gap-1 text-center">
                <MessageSquare className="h-10 w-10 mx-auto text-primary" />
                <h3 className="text-xl font-bold">Centralized Communication</h3>
                <p className="text-muted-foreground">Receive feedback and communicate with approvers directly on the platform.</p>
              </div>
            </div>
          </div>
        </section>

         {/* How It Works Section */}
        <section className="w-full py-12 md:py-24 lg:py-32 bg-card">
          <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
            <div className="space-y-3">
              <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">How It Works</h2>
              <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Getting started is easy. Follow these three simple steps to begin streamlining your submission process.
              </p>
            </div>
            <div className="grid w-full grid-cols-1 md:grid-cols-3 items-start gap-8">
              <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">1</div>
                <h3 className="text-lg font-bold">Register Account</h3>
                <p className="text-sm text-muted-foreground">Create your secure account and complete your profile to get started.</p>
              </div>
               <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">2</div>
                <h3 className="text-lg font-bold">Submit Documents</h3>
                <p className="text-sm text-muted-foreground">Upload your reports and documents through our easy-to-use submission forms.</p>
              </div>
               <div className="flex flex-col items-center gap-2">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold text-xl">3</div>
                <h3 className="text-lg font-bold">Track Progress</h3>
                <p className="text-sm text-muted-foreground">Receive notifications and track the status of your submissions until approval.</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="w-full py-12 md:py-24 lg:py-32">
            <div className="container grid items-center justify-center gap-4 px-4 text-center md:px-6">
                <div className="space-y-3">
                <h2 className="text-3xl font-bold tracking-tighter md:text-4xl/tight">
                    Ready to Streamline Your Workflow?
                </h2>
                <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                    Create an account today and experience a more efficient way to manage your office submissions.
                </p>
                </div>
                <div className="flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/register">
                            <UserPlus className="mr-2 h-5 w-5" />
                            Sign Up Now
                        </Link>
                    </Button>
                </div>
            </div>
        </section>


      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t">
        <p className="text-xs text-muted-foreground">&copy; 2024 Romblon State University. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Terms of Service
          </Link>
          <Link href="#" className="text-xs hover:underline underline-offset-4" prefetch={false}>
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}
