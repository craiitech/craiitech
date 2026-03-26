
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck, Image as ImageIcon, Save, Info } from 'lucide-react';
import type { SystemSettings } from '@/lib/types';
import Image from 'next/image';

const logoSchema = z.object({
  logoUrl: z.string().url('Please enter a valid URL for the university logo.').min(1, 'Logo URL is required.'),
});

export function LogoManagement() {
  const firestore = useFirestore();
  const { userProfile, systemSettings } = useUser();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof logoSchema>>({
    resolver: zodResolver(logoSchema),
    defaultValues: {
      logoUrl: '',
    },
  });

  useEffect(() => {
    if (systemSettings?.logoUrl) {
      form.reset({ logoUrl: systemSettings.logoUrl });
    }
  }, [systemSettings, form]);

  const onSubmit = async (values: z.infer<typeof logoSchema>) => {
    if (!firestore || !userProfile) return;
    setIsSubmitting(true);
    try {
      await setDoc(doc(firestore, 'system', 'settings'), {
        ...values,
        updatedAt: serverTimestamp(),
        updatedBy: userProfile.id,
      }, { merge: true });
      toast({ title: 'System Logo Updated', description: 'The institutional logo has been successfully updated across all reports and headers.' });
    } catch (error) {
      console.error('Error updating system logo:', error);
      toast({
        title: 'Update Failed',
        description: 'Could not update system settings.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const watchLogoUrl = form.watch('logoUrl');

  return (
    <Card className="max-w-2xl border-primary/20 shadow-md">
      <CardHeader className="bg-primary/5 border-b">
        <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="h-5 w-5 text-primary" />
            <span className="text-[10px] font-black uppercase tracking-widest text-primary">Institutional Branding</span>
        </div>
        <CardTitle>University Logo Configuration</CardTitle>
        <CardDescription>
          Set the official logo that will be used in all PDF reports, notices, and dashboard headers.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6 pt-6">
            
            <div className="flex flex-col items-center justify-center p-8 border border-dashed rounded-2xl bg-muted/5 gap-4">
                <div className="relative h-32 w-32 rounded-full overflow-hidden border-4 border-white shadow-xl bg-white flex items-center justify-center">
                    {watchLogoUrl ? (
                        <Image 
                            src={watchLogoUrl} 
                            alt="Logo Preview" 
                            fill 
                            className="object-contain"
                            onError={() => toast({ title: 'Invalid Image', description: 'The provided URL could not be loaded as an image.', variant: 'destructive' })}
                        />
                    ) : (
                        <ImageIcon className="h-12 w-12 text-muted-foreground opacity-20" />
                    )}
                </div>
                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Logo Live Preview</p>
            </div>

            <FormField
              control={form.control}
              name="logoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-slate-700">Official Logo URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://..." {...field} className="h-11 font-bold" />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Provide a direct link to the university logo (PNG/JPG). Ensure the image has a transparent or white background for optimal report rendering.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                    <p className="text-xs font-black uppercase text-blue-800">Deployment Note</p>
                    <p className="text-[10px] text-blue-700 leading-relaxed italic">
                        Changing this URL will immediately update the branding on all generated PDF reports (IQA, CAR, Monitoring) and institutional notices.
                    </p>
                </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/10 border-t py-4">
            <Button type="submit" disabled={isSubmitting} className="shadow-lg shadow-primary/20 font-black uppercase tracking-widest text-[10px]">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Commit Branding Update
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
