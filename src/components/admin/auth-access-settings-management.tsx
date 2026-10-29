'use client';

import { useEffect, useState } from 'react';
import { useFirestore, useDoc, useMemoFirebase, useUser } from '@/firebase';
import { doc, serverTimestamp, setDoc } from '@/firebase/firestore-wrapper';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { BadgeCheck, Globe, KeyRound, Loader2, Mail, Save, ShieldCheck } from 'lucide-react';
import type { SystemSettings } from '@/lib/types';

export function AuthAccessSettingsManagement() {
  const firestore = useFirestore();
  const { userProfile } = useUser();
  const { toast } = useToast();

  const settingsRef = useMemoFirebase(() => (firestore ? doc(firestore, 'system', 'settings') : null), [firestore]);
  const { data: settings, isLoading } = useDoc<SystemSettings>(settingsRef);

  const [allowExternalGoogleAccounts, setAllowExternalGoogleAccounts] = useState(false);
  const [allowRegisteredExternalEmails, setAllowRegisteredExternalEmails] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setAllowExternalGoogleAccounts(settings.allowExternalGoogleAccounts === true);
      setAllowRegisteredExternalEmails(settings.allowRegisteredExternalEmails === true);
    }
  }, [settings]);

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);
    try {
      await setDoc(
        doc(firestore, 'system', 'settings'),
        {
          allowExternalGoogleAccounts,
          allowRegisteredExternalEmails,
          updatedAt: serverTimestamp(),
          updatedBy: userProfile?.id || 'admin',
        },
        { merge: true },
      );
      toast({
        title: 'Sign-in Access Policy Saved',
        description: allowRegisteredExternalEmails
          ? 'Registered accounts from any email domain can now sign in.'
          : allowExternalGoogleAccounts
            ? 'Non-RSU accounts can now sign in through Google only.'
            : 'Only official @rsu.edu.ph accounts can sign in.',
      });
    } catch (error) {
      console.error('Failed to save sign-in access policy:', error);
      toast({
        title: 'Save Failed',
        description: 'Could not update the sign-in access policy. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const policyLabel = allowRegisteredExternalEmails
    ? 'Registered emails of any domain'
    : allowExternalGoogleAccounts
      ? 'RSU email or Google sign-in'
      : 'Institutional @rsu.edu.ph only';

  return (
    <Card className="border-primary/20 shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-black uppercase tracking-tight">Sign-in Access Policy</CardTitle>
              <CardDescription className="text-xs">
                Control which email domains and sign-in methods can enter the system.
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-black uppercase tracking-wider self-start sm:self-auto">
            Active: {policyLabel}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
              <Globe className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Allow non-RSU Google accounts</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When ON, accounts that are not <strong>@rsu.edu.ph</strong> may still enter if they sign in through
                Google. Email and password access remains limited to <strong>@rsu.edu.ph</strong>.
              </p>
            </div>
          </div>
          <Switch
            checked={allowExternalGoogleAccounts}
            onCheckedChange={setAllowExternalGoogleAccounts}
            disabled={isLoading || isSaving}
            aria-label="Allow non-RSU Google accounts"
          />
        </div>

        <div className="flex items-start justify-between gap-4 rounded-xl border p-4">
          <div className="flex gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Mail className="h-4 w-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold">Allow all registered email addresses</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When ON, any email domain is accepted as long as the account is already registered in the users
                registry. Unregistered emails remain blocked. This takes priority over the Google exception above.
              </p>
            </div>
          </div>
          <Switch
            checked={allowRegisteredExternalEmails}
            onCheckedChange={setAllowRegisteredExternalEmails}
            disabled={isLoading || isSaving}
            aria-label="Allow all registered email addresses"
          />
        </div>

        <div className="flex items-start gap-2.5 rounded-lg bg-muted/50 p-3 text-[11px] text-muted-foreground">
          <KeyRound className="h-4 w-4 shrink-0 text-primary" />
          <p className="leading-relaxed">
            With both options OFF, only official <strong>@rsu.edu.ph</strong> accounts (and the bootstrap system
            administrator) can sign in. Changes apply to the next sign-in attempt.
          </p>
        </div>
      </CardContent>

      <CardFooter className="border-t bg-muted/20 px-6 py-4 flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
          Enforced at sign-in for Google and email/password authentication.
        </p>
        <Button onClick={handleSave} disabled={isSaving || isLoading} size="sm" className="gap-2">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Policy
        </Button>
      </CardFooter>
    </Card>
  );
}
