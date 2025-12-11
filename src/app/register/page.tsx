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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/lib/actions';
import type { Role } from '@/lib/types';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

export default function RegisterPage() {
  const [role, setRole] = useState<Role | ''>('');
  const [isRegistering, setIsRegistering] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleRegister = async () => {
    if (!role) {
      toast({
        title: 'Registration Error',
        description: 'Please select a role to register.',
        variant: 'destructive',
      });
      return;
    }
    setIsRegistering(true);
    // In a real app, you'd have a register server action.
    // For now, we'll just simulate a login to show the flow.
    try {
      await login(role);
      toast({
        title: 'Registration Successful',
        description: "You've been registered and logged in.",
      });
      router.push('/dashboard');
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
                <Input id="full-name" placeholder="Juan Dela Cruz" required />
            </div>
             <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@rsu.edu.ph"
                  required
                />
              </div>
            <div className="grid gap-2">
              <Label htmlFor="role">Select Role</Label>
              <Select
                onValueChange={(value) => setRole(value as Role)}
                value={role}
                disabled={isRegistering}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Campus Director">Campus Director</SelectItem>
                  <SelectItem value="Campus ODIMO">Campus ODIMO</SelectItem>
                  <SelectItem value="Unit ODIMO">Unit ODIMO</SelectItem>
                  <SelectItem value="Employee">Employee</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              className="w-full"
              onClick={handleRegister}
              disabled={isRegistering || !role}
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
