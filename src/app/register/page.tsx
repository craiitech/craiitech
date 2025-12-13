
'use client';

import { AuthForm } from '@/components/auth/auth-form';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function RegisterPage() {
  const bgImage = PlaceHolderImages.find((p) => p.id === 'auth-background');
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden">
      {bgImage && (
        <Image
          src={bgImage.imageUrl}
          alt={bgImage.description}
          fill
          className="-z-10 object-cover"
          data-ai-hint={bgImage.imageHint}
        />
      )}
      <AuthForm initialTab="signup" />
    </div>
  );
}
