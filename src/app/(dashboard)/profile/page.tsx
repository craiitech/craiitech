'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Building, Briefcase, Accessibility, Zap, ShieldCheck, Activity, Info, Save, Type, Palette, Users } from 'lucide-react';
import type { Campus, Unit, Role } from '@/lib/types';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const profileSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required.' }),
  lastName: z.string().min(1, { message: 'Last name is required.' }),
  sex: z.enum(['Male', 'Female', 'Others (LGBTQI++)'], { required_error: 'Please select your sex.' }),
  accessibility: z.object({
    highContrast: z.boolean().default(false),
    dyslexicFont: z.boolean().default(false),
    reducedMotion: z.boolean().default(false),
    fontSize: z.number().default(1.0),
    themeColor: z.enum(['default', 'blue', 'green', 'maroon', 'gold']).default('default'),
  }).optional(),
});

const fontSizeMap = [0.8, 1.0, 1.2, 1.4];
const fontSizeLabels = ['Small (80%)', 'Default (100%)', 'Large (120%)', 'Extra Large (140%)'];

const colorPalettes = [
    { id: 'default', label: 'Institutional Indigo', color: 'bg-[#3F51B5]' },
    { id: 'blue', label: 'Professional Blue', color: 'bg-[#3b82f6]' },
    { id: 'green', label: 'Quality Green', color: 'bg-[#16a34a]' },
    { id: 'maroon', label: 'RSU Maroon', color: 'bg-[#a51c1c]' },
    { id: 'gold', label: 'University Gold', color: 'bg-[#eab308]' },
];

export default function ProfilePage() {
  const { user, userProfile, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { logSessionActivity } = useSessionActivity();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      sex: 'Female',
      accessibility: {
        highContrast: false,
        dyslexicFont: false,
        reducedMotion: false,
        fontSize: 1.0,
        themeColor: 'default',
      }
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        sex: (userProfile.sex as any) || 'Female',
        accessibility: {
          highContrast: userProfile.accessibility?.highContrast || false,
          dyslexicFont: userProfile.accessibility?.dyslexicFont || false,
          reducedMotion: userProfile.accessibility?.reducedMotion || false,
          fontSize: userProfile.accessibility?.fontSize || 1.0,
          themeColor: userProfile.accessibility?.themeColor || 'default',
        }
      });
    }
  }, [userProfile, form]);
  
  const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses'): null, [firestore]);
  const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units'): null, [firestore]);
  const { data: allUnits, isLoading: isLoadingUnits } = useCollection<Unit>(unitsQuery);
  
  const campusName = useMemo(() => {
    if (!campuses || !userProfile?.campusId) return '...';
    return campuses.find(c => c.id === userProfile.campusId)?.name || 'N/A';
  }, [campuses, userProfile]);

  const unitName = useMemo(() => {
    if (!allUnits || !userProfile?.unitId) return '...';
    return allUnits.find(u => u.id === userProfile.unitId)?.name || 'N/A';
  }, [allUnits, userProfile]);


  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    if (!user || !firestore) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile.',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      const userDocRef = doc(firestore, 'users', user.uid);
      
      // Use setDoc with merge: true to be more robust than updateDoc
      await setDoc(userDocRef, {
        firstName: values.firstName,
        lastName: values.lastName,
        sex: values.sex,
        accessibility: values.accessibility,
      }, { merge: true });

      logSessionActivity('User updated their profile and accessibility preferences', { action: 'update_profile' });

      toast({
        title: 'Profile Updated',
        description: 'Your information and accessibility settings have been successfully updated.',
      });

      router.push('/dashboard');

    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Update Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits;

  const currentFontSize = form.watch('accessibility.fontSize') || 1.0;
  const currentFontSizeIndex = fontSizeMap.indexOf(currentFontSize);

  return (
    <div className="space-y-6">
       <div>
        <h2 className="text-2xl font-bold tracking-tight">My Profile & Settings</h2>
        <p className="text-muted-foreground">
          View your institutional data and personalize your accessibility experience.
        </p>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-muted/30 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Institutional Identity
                  </CardTitle>
                  <CardDescription className="text-xs">Your verified profile details within RSU.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="firstName"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase">First Name</FormLabel>
                              <FormControl>
                              <Input placeholder="First Name" {...field} className="h-9 font-bold" />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                        <FormField
                          control={form.control}
                          name="lastName"
                          render={({ field }) => (
                          <FormItem>
                              <FormLabel className="text-[10px] font-bold uppercase">Last Name</FormLabel>
                              <FormControl>
                              <Input placeholder="Last Name" {...field} className="h-9 font-bold" />
                              </FormControl>
                              <FormMessage />
                          </FormItem>
                          )}
                      />
                  </div>

                  <FormField
                    control={form.control}
                    name="sex"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase">Sex Identification (GAD Standard)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger className="h-9 font-bold">
                              <Users className="h-3.5 w-3.5 mr-2 opacity-40" />
                              <SelectValue placeholder="Select sex" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                            <SelectItem value="Others (LGBTQI++)">Others (LGBTQI++)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[9px]">Used for institutional Gender and Development (GAD) reporting.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Email</Label>
                      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-medium">
                        <Mail className="mr-2 h-3.5 w-3.5" />
                        {userProfile?.email}
                      </div>
                  </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Role</Label>
                          <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-medium">
                            <Briefcase className="mr-2 h-3.5 w-3.5" />
                            {userProfile?.role}
                          </div>
                      </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-bold uppercase text-muted-foreground">Campus</Label>
                            <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-medium">
                            <Building className="mr-2 h-3.5 w-3.5" />
                            {isLoading ? '...' : campusName}
                          </div>
                      </div>
                  </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Unit / Office</Label>
                      <div className="flex h-9 w-full items-center rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground font-medium">
                        <Building className="mr-2 h-3.5 w-3.5" />
                        {isLoading ? '...' : unitName}
                      </div>
                  </div>
              </CardContent>
            </Card>

            <Card id="accessibility" className="shadow-md border-primary/10 flex flex-col scroll-mt-20">
              <CardHeader className="bg-primary/5 border-b">
                  <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                    <Accessibility className="h-4 w-4" />
                    Accessibility & Inclusivity
                  </CardTitle>
                  <CardDescription className="text-xs">Customize the interface to suit your visual and cognitive needs.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 flex-1">
                  <div className="space-y-4 p-4 rounded-lg border bg-muted/5 shadow-sm">
                    <div className="space-y-1">
                        <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <Type className="h-3.5 w-3.5 text-primary" /> Font Size Scaling
                        </FormLabel>
                        <p className="text-[10px] text-muted-foreground">Adjust the system-wide text size for optimal readability.</p>
                    </div>
                    <div className="pt-2 px-2">
                        <Slider 
                            min={0} 
                            max={3} 
                            step={1} 
                            value={[currentFontSizeIndex]} 
                            onValueChange={(vals) => form.setValue('accessibility.fontSize', fontSizeMap[vals[0]])}
                        />
                        <div className="flex justify-between mt-2 text-[9px] font-black uppercase text-muted-foreground tracking-tighter">
                            <span>Small</span>
                            <span className="text-primary font-black">{fontSizeLabels[currentFontSizeIndex]}</span>
                            <span>X-Large</span>
                        </div>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="accessibility.themeColor"
                    render={({ field }) => (
                      <FormItem className="space-y-3 p-4 rounded-lg border bg-muted/5 shadow-sm">
                        <FormLabel className="text-sm font-bold flex items-center gap-2">
                          <Palette className="h-3.5 w-3.5 text-primary" /> System Color Palette
                        </FormLabel>
                        <FormDescription className="text-[10px]">Choose a primary color scheme for your dashboard experience.</FormDescription>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            value={field.value}
                            className="flex flex-wrap gap-4 pt-2"
                          >
                            {colorPalettes.map((palette) => (
                              <div key={palette.id} className="flex items-center space-x-2">
                                <RadioGroupItem value={palette.id} id={`palette-${palette.id}`} className="sr-only" />
                                <Label
                                  htmlFor={`palette-${palette.id}`}
                                  className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-full border cursor-pointer transition-all hover:bg-muted",
                                    field.value === palette.id ? "bg-primary/10 border-primary shadow-sm" : "bg-white border-transparent"
                                  )}
                                >
                                  <div className={cn("h-4 w-4 rounded-full border border-white/20 shadow-sm", palette.color)} />
                                  <span className={cn("text-[10px] font-black uppercase tracking-tight", field.value === palette.id ? "text-primary" : "text-muted-foreground")}>
                                    {palette.label}
                                  </span>
                                </Label>
                              </div>
                            ))}
                          </RadioGroup>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessibility.highContrast"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <Zap className="h-3.5 w-3.5 text-amber-500" /> High Contrast Mode
                          </FormLabel>
                          <FormDescription className="text-[10px]">Increases readability by sharpening colors and border definitions.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessibility.dyslexicFont"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5 text-blue-500" /> Dyslexic-Friendly Layout
                          </FormLabel>
                          <FormDescription className="text-[10px]">Optimizes character spacing and line height for improved cognitive flow.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accessibility.reducedMotion"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4 shadow-sm bg-muted/5">
                        <div className="space-y-0.5">
                          <FormLabel className="text-sm font-bold flex items-center gap-2">
                            <Activity className="h-3.5 w-3.5 text-indigo-500" /> Reduced Motion
                          </FormLabel>
                          <FormDescription className="text-[10px]">Disables UI animations and transitions to prevent vestibular triggers.</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="p-4 rounded-lg bg-blue-50 border border-blue-100 mt-4">
                    <div className="flex gap-3">
                      <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[10px] text-blue-800 leading-relaxed italic">
                        <strong>Inclusivity Standard:</strong> These settings are persistent across devices and sessions, ensuring a consistent and accessible environment for all institutional users as mandated by RSU EOMS accessibility protocols.
                      </p>
                    </div>
                  </div>
              </CardContent>
              <CardFooter className="bg-muted/10 border-t py-4">
                  <Button type="submit" disabled={isSubmitting || isLoading} className="w-full shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest">
                      {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Profile & Preferences
                  </Button>
              </CardFooter>
            </Card>
          </div>
        </form>
      </Form>
    </div>
  );
}
