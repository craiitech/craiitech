'use client';

import { useUser } from '@/firebase';
import Image from 'next/image';
import { cn, getDirectDriveLink } from '@/lib/utils';

export function Logo({ className, ...props }: { className?: string }) {
  const { systemSettings } = useUser();

  if (systemSettings?.logoUrl) {
    return (
      <div className={cn('relative h-8 w-8', className)}>
        <Image src={getDirectDriveLink(systemSettings.logoUrl)} alt="University Logo" fill className="object-contain" />
      </div>
    );
  }

  return (
    <Image
      src="/rsulogo.png"
      alt="Romblon State University"
      width={48}
      height={48}
      priority
      className={cn('object-contain', className)}
      {...props}
    />
  );
}
