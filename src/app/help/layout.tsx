
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function HelpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-gray-100 dark:bg-gray-900">
      <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white px-4 dark:bg-gray-800 sm:px-6">
        <div className="flex items-center gap-4">
          <Logo className="h-8 w-8" />
          <h1 className="text-xl font-semibold">Support Center</h1>
        </div>
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </header>
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="mx-auto max-w-4xl">{children}</div>
      </main>
    </div>
  );
}
