
'use client';

import { FileText } from 'lucide-react';
import { useUser } from '@/firebase';
import Image from 'next/image';
import { cn } from '@/lib/utils';

export function Logo({ className, ...props }: { className?: string }) {
  const { systemSettings } = useUser();

  if (systemSettings?.logoUrl) {
    return (
      <div className={cn("relative h-8 w-8", className)}>
        <Image 
          src={systemSettings.logoUrl} 
          alt="University Logo" 
          fill 
          className="object-contain" 
        />
      </div>
    );
  }

  return (
    <FileText
      className={cn("text-primary", className)}
      {...props}
    />
  );
}
