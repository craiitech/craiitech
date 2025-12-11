'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useFirestore } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();

  const handleRegister = async () => {
    if (!email || !password || !fullName) {
      toast({
        title: 'Registration Error',
        description: 'Please fill out all fields.',
        variant: 'destructive',
      });
      return;
    }
    setIsRegistering(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      await updateProfile(user, {
        displayName: fullName,
      });

      const [firstName, ...lastName] = fullName.split(' ');

      // Create user document in Firestore
      await setDoc(doc(firestore, 'users', user.uid), {
        id: user.uid,
        email: user.email,
        firstName: firstName,
        lastName: lastName.join(' '),
        roleId: '',
        campusId: '',
        unitId: '',
        verified: false,
      });

      toast({
        title: 'Account Created!',
        description: "Please complete your registration.",
      });
      router.push('/register/campus');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsRegistering(false);
    }
  };

  const loginImage = PlaceHolderImages.find(p => p.id === 'login-background');

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2 xl:min-h-screen">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <Logo className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">Create an Account</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Enter your information to create an account
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
                <Label htmlFor="full-name">Full name</Label>
                <Input 
                  id="full-name" 
                  placeholder="Juan Dela Cruz" 
                  required 
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={isRegistering}
                />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@rsu.edu.ph"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isRegistering}
                />
              </div>
               <div className="grid gap-2">
                <Label htmlFor="password">Password</Label>
                <Input 
                  id="password" 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isRegistering}
                />
              </div>
            <Button
              type="submit"
              className="w-full"
              onClick={handleRegister}
              disabled={isRegistering || !email || !password || !fullName}
            >
              {isRegistering ? 'Creating Account...' : 'Create Account'}
            </Button>
          </div>
           <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Link href="/login" className="underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
             <Image
                src={loginImage.imageUrl}
                alt={loginImage.description}
                width="1920"
                height="1080"
                className="h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
                data-ai-hint={loginImage.imageHint}
              />
        )}
      </div>
    </div>
  );
}
