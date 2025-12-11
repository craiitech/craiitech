'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

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
import { Label } from '@/components/ui/label';
import { login } from '@/lib/actions';
import type { Role } from '@/lib/types';
import { Logo } from '@/components/logo';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { useToast } from '@/hooks/use-toast';

export default function LoginPage() {
  const [role, setRole] = useState<Role | ''>('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleLogin = async () => {
    if (!role) {
      toast({
        title: 'Login Error',
        description: 'Please select a role to sign in.',
        variant: 'destructive',
      });
      return;
    }
    setIsLoggingIn(true);
    try {
      await login(role);
      // The server action will handle the redirect, but as a fallback:
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Login Failed',
        description:
          error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
      setIsLoggingIn(false);
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
              <h1 className="text-3xl font-bold">RSU EOMS Portal</h1>
            </div>
            <p className="text-balance text-muted-foreground">
              Sign in to your account
            </p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Select Role</Label>
              <Select
                onValueChange={(value) => setRole(value as Role)}
                value={role}
                disabled={isLoggingIn}
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
              onClick={handleLogin}
              disabled={isLoggingIn || !role}
            >
              {isLoggingIn ? 'Signing In...' : 'Sign In'}
            </Button>
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
