'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, setDoc, deleteDoc, query, where } from '@/firebase/firestore-wrapper';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, deleteUser } from 'firebase/auth';
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
import { Loader2, Mail, Building, Briefcase, Accessibility, Zap, ShieldCheck, Activity, Info, Save, Type, Palette, Users, Lock, KeyRound, Trash2, AlertTriangle, ShieldAlert, Trophy, Star, Award, CheckCircle2, Clock, XCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import type { Campus, Unit, User, Role, Cycle, Submission } from '@/lib/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

const profileSchema = z.object({
    firstName: z.string().min(1, { message: 'First name is required.' }),
    lastName: z.string().min(1, { message: 'Last name is required.' }),
    sex: z.enum(['Male', 'Female', 'Others (LGBTQI++)'], { required_error: 'Please select your sex identification.' }),
    accessibility: z.object({
        highContrast: z.boolean().default(false),
        dyslexicFont: z.boolean().default(false),
        reducedMotion: z.boolean().default(false),
        fontSize: z.number().default(1.0),
        themeColor: z.enum(['default', 'blue', 'green', 'maroon', 'gold']).default('default'),
    }).optional(),
});

const passwordSchema = z.object({
    currentPassword: z.string().min(1, 'Current password is required to verify identity.'),
    newPassword: z.string().min(6, 'Password must be at least 6 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
});

const deleteAccountSchema = z.object({
    password: z.string().min(1, 'Please enter your password to confirm deletion.'),
});

const fontSizeMap = [0.8, 1.0, 1.2, 1.4];
const fontSizeLabels = ['Small (80%)', 'Default (100%)', 'Large (120%)', 'Extra Large (140%)'];

const colorPalettes = [
    { id: 'default', label: 'University Green & Gold', color: 'bg-[#1B6535]' },
    { id: 'blue', label: 'Professional Blue', color: 'bg-[#3b82f6]' },
    { id: 'green', label: 'Quality Emerald', color: 'bg-[#16a34a]' },
    { id: 'maroon', label: 'RSU Maroon', color: 'bg-[#a51c1c]' },
    { id: 'gold', label: 'University Gold', color: 'bg-[#eab308]' },
];

export default function ProfilePage() {
    const { user, userProfile, isUserLoading } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);
    // Global save loading state
    const [isGlobalSaving, setIsGlobalSaving] = useState(false);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const { logSessionActivity } = useSessionActivity();

    const canEdit = !isSubmitting && !isUpdatingPassword && !isDeletingAccount && !isGlobalSaving;

    const [selectedPointsYear, setSelectedPointsYear] = useState<number>(new Date().getFullYear());
    const [isFirstCycleExpanded, setIsFirstCycleExpanded] = useState(false);
    const [isFinalCycleExpanded, setIsFinalCycleExpanded] = useState(false);

    const submissionsQuery = useMemoFirebase(() => {
        if (!firestore || !userProfile?.unitId || !userProfile?.campusId) return null;
        return query(
            collection(firestore, 'submissions'),
            where('unitId', '==', userProfile.unitId),
            where('campusId', '==', userProfile.campusId)
        );
    }, [firestore, userProfile]);
    const { data: submissions, isLoading: isLoadingSubmissions } = useCollection<Submission>(submissionsQuery);

    const cyclesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'cycles') : null), [firestore]);
    const { data: cycles, isLoading: isLoadingCycles } = useCollection<Cycle>(cyclesQuery);

    const pointsYears = useMemo(() => {
        if (!cycles) return [new Date().getFullYear()];
        const uniqueYears = [...new Set(cycles.map(c => Number(c.year)))];
        if (uniqueYears.length === 0) return [new Date().getFullYear()];
        return uniqueYears.sort((a, b) => b - a);
    }, [cycles]);

    const submissionTypes = [
      'SWOT Analysis',
      'Needs and Expectation of Interested Parties',
      'Operational Plan',
      'Quality Objectives Monitoring',
      'Risk and Opportunity Registry',
      'Risk and Opportunity Action Plan'
    ];

    const computedPointsData = useMemo(() => {
        if (!submissions || !cycles) {
            return {
                totalPoints: 0,
                tier: 'Unranked',
                breakdown: { first: [], final: [] }
            };
        }

        const yearSubmissions = submissions.filter(s => s.year === selectedPointsYear && s.isDraft !== true);

        const firstRorSub = yearSubmissions.find(s => s.cycleId === 'first' && s.reportType === 'Risk and Opportunity Registry');
        const finalRorSub = yearSubmissions.find(s => s.cycleId === 'final' && s.reportType === 'Risk and Opportunity Registry');

        const isFirstActionPlanExempt = firstRorSub?.riskRating === 'low';
        const isFinalActionPlanExempt = finalRorSub?.riskRating === 'low';

        const calculateCycleBreakdown = (cycleId: 'first' | 'final', isActionPlanExempt: boolean) => {
            const cycleDeadline = cycles.find(c => c.name === cycleId && Number(c.year) === selectedPointsYear);
            
            return submissionTypes.map(type => {
                const sub = yearSubmissions.find(s => s.cycleId === cycleId && s.reportType === type);
                const isExempt = type === 'Risk and Opportunity Action Plan' && isActionPlanExempt;
                
                let points = 0;
                let status: 'on-time' | 'late' | 'exempt' | 'missing' = 'missing';
                
                if (isExempt) {
                    points = 1.0;
                    status = 'exempt';
                } else if (sub) {
                    if (cycleDeadline && cycleDeadline.endDate) {
                        const getMs = (val: any) => {
                            if (val?.toDate) return val.toDate().getTime();
                            if (val instanceof Date) return val.getTime();
                            if (val?.seconds) return val.seconds * 1000;
                            return new Date(val).getTime();
                        };
                        const subTime = getMs(sub.submissionDate);
                        const deadlineTime = getMs(cycleDeadline.endDate);
                        
                        if (subTime <= deadlineTime) {
                            points = 1.0;
                            status = 'on-time';
                        } else {
                            points = 0.5;
                            status = 'late';
                        }
                    } else {
                        points = 1.0;
                        status = 'on-time';
                    }
                }
                
                return {
                    type,
                    points,
                    status,
                    submissionDate: sub ? ((sub.submissionDate as any)?.toDate ? (sub.submissionDate as any).toDate() : sub.submissionDate) : null,
                    deadlineDate: cycleDeadline ? (cycleDeadline.endDate?.toDate ? cycleDeadline.endDate.toDate() : cycleDeadline.endDate) : null
                };
            });
        };

        const firstBreakdown = calculateCycleBreakdown('first', isFirstActionPlanExempt);
        const finalBreakdown = calculateCycleBreakdown('final', isFinalActionPlanExempt);

        const firstPoints = firstBreakdown.reduce((sum, item) => sum + item.points, 0);
        const finalPoints = finalBreakdown.reduce((sum, item) => sum + item.points, 0);
        const totalPoints = firstPoints + finalPoints;

        let tier: 'Gold' | 'Silver' | 'Bronze' | 'Unranked' = 'Unranked';
        if (totalPoints >= 11) {
            tier = 'Gold';
        } else if (totalPoints >= 8) {
            tier = 'Silver';
        } else if (totalPoints >= 1) {
            tier = 'Bronze';
        }

        return {
            totalPoints,
            tier,
            breakdown: {
                first: firstBreakdown,
                final: finalBreakdown
            }
        };
    }, [submissions, cycles, selectedPointsYear]);

    const formatDate = (dateVal: any) => {
        if (!dateVal) return 'N/A';
        try {
            const d = dateVal instanceof Date ? dateVal : dateVal?.toDate ? dateVal.toDate() : new Date(dateVal);
            return format(d, 'PPP');
        } catch (e) {
            return 'Invalid Date';
        }
    };

    const renderStars = (points: number) => {
        const stars = [];
        const fullStars = Math.floor(points);
        const hasHalfStar = points % 1 !== 0;
        
        for (let i = 0; i < 12; i++) {
            if (i < fullStars) {
                stars.push(
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-yellow-400 drop-shadow-sm transition-transform hover:scale-110 duration-200" />
                );
            } else if (i === fullStars && hasHalfStar) {
                stars.push(
                    <div key={i} className="relative inline-block transition-transform hover:scale-110 duration-200">
                        <Star className="h-5 w-5 text-slate-200 fill-slate-200" />
                        <div className="absolute top-0 left-0 w-1/2 overflow-hidden">
                            <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                        </div>
                    </div>
                );
            } else {
                stars.push(
                    <Star key={i} className="h-5 w-5 text-slate-200 fill-slate-200" />
                );
            }
        }
        return <div className="flex gap-1.5 items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 border rounded-2xl shadow-inner">{stars}</div>;
    };

    const getTierBadge = (tier: string) => {
        switch (tier) {
            case 'Gold':
                return (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-br from-amber-300 via-yellow-400 to-amber-500 text-amber-950 font-black text-[10px] uppercase tracking-widest shadow-md shadow-yellow-500/20 border border-yellow-200/50">
                        <Trophy className="h-4 w-4" />
                        Gold Compliance
                    </div>
                );
            case 'Silver':
                return (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-br from-slate-200 via-zinc-300 to-slate-400 text-slate-900 dark:text-slate-100 font-black text-[10px] uppercase tracking-widest shadow-md shadow-zinc-400/25 border border-zinc-200/50">
                        <Award className="h-4 w-4" />
                        Silver Compliance
                    </div>
                );
            case 'Bronze':
                return (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-br from-amber-700 via-orange-600 to-amber-900 text-orange-50 font-black text-[10px] uppercase tracking-widest shadow-md shadow-amber-800/30 border border-amber-800/40">
                        <Award className="h-4 w-4" />
                        Bronze Compliance
                    </div>
                );
            default:
                return (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 font-black text-[10px] uppercase tracking-widest border border-slate-200 dark:border-slate-700">
                        <Info className="h-4 w-4" />
                        Unranked
                    </div>
                );
        }
    };

    // Global save handler – sequentially submit each dirty form
    const handleGlobalSave = async () => {
        if (isGlobalSaving) return;
        setIsGlobalSaving(true);
        try {
            if (form.formState.isDirty) {
                await form.handleSubmit(onSubmit)();
            }
            if (passwordForm.formState.isDirty) {
                await passwordForm.handleSubmit(handlePasswordUpdate)();
            }
            if (deleteForm.formState.isDirty) {
                await deleteForm.handleSubmit(handleDeleteAccount)();
            }
            toast({
                title: 'All Changes Saved',
                description: 'Your profile, security settings, and account actions have been updated.',
            });
            // Reset dirty flags after successful global save
            form.reset();
            passwordForm.reset();
            deleteForm.reset();
        } catch (e) {
            // Individual handlers already display error toasts
        } finally {
            setIsGlobalSaving(false);
        }
    };

    const form = useForm<z.infer<typeof profileSchema>>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: '',
            lastName: '',
            sex: undefined,
            accessibility: {
                highContrast: false,
                dyslexicFont: false,
                reducedMotion: false,
                fontSize: 1.0,
                themeColor: 'default',
            }
        },
    });

    const passwordForm = useForm<z.infer<typeof passwordSchema>>({
        resolver: zodResolver(passwordSchema),
        defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' }
    });

    const deleteForm = useForm<z.infer<typeof deleteAccountSchema>>({
        resolver: zodResolver(deleteAccountSchema),
        defaultValues: { password: '' }
    });

    // Determine if any form has unsaved changes (used for global save button state)
    const hasPendingChanges =
        form.formState.isDirty ||
        passwordForm.formState.isDirty ||
        deleteForm.formState.isDirty;

    useEffect(() => {
        if (userProfile && !isUserLoading) {
            form.reset({
                firstName: userProfile.firstName || '',
                lastName: userProfile.lastName || '',
                sex: (userProfile.sex as any) || undefined,
                accessibility: {
                    highContrast: userProfile.accessibility?.highContrast || false,
                    dyslexicFont: userProfile.accessibility?.dyslexicFont || false,
                    reducedMotion: userProfile.accessibility?.reducedMotion || false,
                    fontSize: userProfile.accessibility?.fontSize || 1.0,
                    themeColor: userProfile.accessibility?.themeColor || 'default',
                }
            });
        }
    }, [userProfile, isUserLoading, form]);

    const campusesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'campuses') : null, [firestore]);
    const { data: campuses, isLoading: isLoadingCampuses } = useCollection<Campus>(campusesQuery);

    const unitsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'units') : null, [firestore]);
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

            await updateDoc(userDocRef, {
                firstName: values.firstName,
                lastName: values.lastName,
                sex: values.sex,
                accessibility: values.accessibility,
            });

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

    const handlePasswordUpdate = async (values: z.infer<typeof passwordSchema>) => {
        if (!user || !user.email) return;
        setIsUpdatingPassword(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, values.currentPassword);
            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, values.newPassword);

            logSessionActivity('User successfully updated their account password.', { action: 'update_password' });

            toast({
                title: 'Password Updated',
                description: 'Your security credentials have been refreshed successfully.'
            });

            passwordForm.reset();
        } catch (error: any) {
            console.error('Password Update Error:', error);
            let msg = 'Could not update password. Please check your current credentials.';
            if (error.code === 'auth/wrong-password') {
                msg = 'The "Current Password" you provided is incorrect.';
            } else if (error.code === 'auth/requires-recent-login') {
                msg = 'For security reasons, please logout and log back in before attempting this update again.';
            }

            toast({
                title: 'Security Verification Failed',
                description: msg,
                variant: 'destructive'
            });
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    const handleDeleteAccount = async (values: z.infer<typeof deleteAccountSchema>) => {
        if (!user || !user.email || !firestore) return;
        setIsDeletingAccount(true);

        try {
            const credential = EmailAuthProvider.credential(user.email, values.password);
            await reauthenticateWithCredential(user, credential);

            logSessionActivity(`User self-initiated account deletion. Submissions are preserved.`, {
                action: 'delete_own_account',
                details: { email: user.email }
            });

            const userRef = doc(firestore, 'users', user.uid);
            await deleteDoc(userRef);

            await deleteUser(user);

            toast({ title: 'Account Deleted', description: 'Your personal data and access have been removed. Registry logs were preserved for audit.' });
            router.push('/');
        } catch (error: any) {
            console.error('Account Deletion Error:', error);
            let msg = 'Could not delete account. Please verify your password.';
            if (error.code === 'auth/wrong-password') {
                msg = 'The password you provided is incorrect.';
            }
            toast({ title: 'Operation Failed', description: msg, variant: 'destructive' });
            setIsDeletingAccount(false);
        }
    };

    const isLoading = isUserLoading || isLoadingCampuses || isLoadingUnits;

    const currentFontSize = form.watch('accessibility.fontSize') || 1.0;
    const currentFontSizeIndex = fontSizeMap.indexOf(currentFontSize);

    return (
        <div className="space-y-6">
            {/* Global Save All Changes button */}
            <div className="sticky top-4 z-10 flex justify-center bg-white py-2">
                <Button
                    type="button"
                    onClick={handleGlobalSave}
                    disabled={!hasPendingChanges || isGlobalSaving}
                    className="w-full max-w-md shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest"
                >
                    {isGlobalSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save All Changes
                </Button>
            </div>
            <div>
                <h2 className="text-2xl font-bold tracking-tight">My Profile & Settings</h2>
                <p className="text-muted-foreground">
                    View your institutional data and personalize your accessibility experience.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                                                    <Input placeholder="First Name" {...field} className="h-9 font-bold" disabled={!canEdit} />
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
                                                    <Input placeholder="Last Name" {...field} className="h-9 font-bold" disabled={!canEdit} />
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
                                            <Select
                                                key={field.value || 'profile-sex-selector'}
                                                onValueChange={field.onChange}
                                                value={field.value || ''}
                                                disabled={!canEdit}
                                            >
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
                            <CardFooter className="bg-muted/10 border-t py-4">
                                <Button type="submit" disabled={!canEdit} className="w-full shadow-lg shadow-primary/20 font-black uppercase text-xs tracking-widest">
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                    Save Profile Updates
                                </Button>
                            </CardFooter>
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
                                            onValueChange={(vals) => form.setValue('accessibility.fontSize', fontSizeMap[vals[0]], { shouldDirty: true })}
                                            disabled={!canEdit}
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
                                                    disabled={!canEdit}
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
                                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
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
                                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
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
                                                <Switch checked={field.value} onCheckedChange={field.onChange} disabled={!canEdit} />
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
                        </Card>
                    </form>
                </Form>

                <div className="space-y-6">
                    {/* EOMS Points System Card */}
                    <Card className="shadow-lg border-primary/10 overflow-hidden bg-primary/[0.01]">
                        <CardHeader className="bg-primary/5 border-b py-4 flex flex-row items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-5 w-5 text-yellow-500" />
                                <div>
                                    <CardTitle className="text-sm font-black uppercase tracking-tight">EOMS Points System</CardTitle>
                                    <CardDescription className="text-[10px] font-bold uppercase text-muted-foreground">Compliance stars performance registry</CardDescription>
                                </div>
                            </div>
                            <div className="w-[110px]">
                                <Select value={String(selectedPointsYear)} onValueChange={(v) => setSelectedPointsYear(Number(v))}>
                                    <SelectTrigger className="h-8 text-xs bg-white font-bold">
                                        <SelectValue placeholder="Year" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {pointsYears.map(y => <SelectItem key={y} value={String(y)} className="font-bold">AY {y}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            {isLoadingSubmissions || isLoadingCycles ? (
                                <div className="flex flex-col items-center justify-center py-10 space-y-2">
                                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                    <p className="text-[10px] font-black uppercase text-muted-foreground">Calculating points...</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-primary/10 shadow-inner">
                                        <div className="text-center sm:text-left space-y-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">AY {selectedPointsYear} Score Card</p>
                                            <div className="flex items-baseline justify-center sm:justify-start gap-1">
                                                <span className="text-4xl font-black tracking-tight text-primary">{computedPointsData.totalPoints.toFixed(1)}</span>
                                                <span className="text-sm text-slate-400 font-bold">/ 12.0 Stars</span>
                                            </div>
                                        </div>
                                        <div className="shrink-0 flex items-center justify-center">
                                            {getTierBadge(computedPointsData.tier)}
                                        </div>
                                    </div>

                                    {renderStars(computedPointsData.totalPoints)}

                                    <div className="space-y-4">
                                        {/* First Cycle */}
                                        <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => setIsFirstCycleExpanded(!isFirstCycleExpanded)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">First Submission Cycle</span>
                                                    <Badge variant="secondary" className="h-5 text-[9px] font-black bg-primary/10 text-primary border-none">
                                                        {computedPointsData.breakdown.first.reduce((sum: number, item: any) => sum + item.points, 0).toFixed(1)} / 6.0 Stars
                                                    </Badge>
                                                </div>
                                                {isFirstCycleExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                            </button>
                                            
                                            {isFirstCycleExpanded && (
                                                <div className="border-t divide-y bg-slate-50/[0.3] p-2 space-y-1">
                                                    {computedPointsData.breakdown.first.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-white rounded-lg border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-slate-300">
                                                            <div className="space-y-1 flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.type}</p>
                                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Submitted: {formatDate(item.submissionDate)}</span>
                                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {formatDate(item.deadlineDate)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 flex items-center self-start md:self-center">
                                                                {item.status === 'on-time' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white border-none flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" /> On-Time (+1.0)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'exempt' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-blue-500 hover:bg-blue-600 text-white border-none flex items-center gap-1">
                                                                        <ShieldCheck className="h-3 w-3" /> Exempt (+1.0)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'late' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-white border-none flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" /> Late (+0.5)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'missing' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-slate-200 text-slate-500 border-none flex items-center gap-1">
                                                                        <XCircle className="h-3 w-3" /> Pending (0.0)
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Final Cycle */}
                                        <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => setIsFinalCycleExpanded(!isFinalCycleExpanded)}
                                                className="w-full flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Final Submission Cycle</span>
                                                    <Badge variant="secondary" className="h-5 text-[9px] font-black bg-primary/10 text-primary border-none">
                                                        {computedPointsData.breakdown.final.reduce((sum: number, item: any) => sum + item.points, 0).toFixed(1)} / 6.0 Stars
                                                    </Badge>
                                                </div>
                                                {isFinalCycleExpanded ? <ChevronUp className="h-4 w-4 text-slate-500" /> : <ChevronDown className="h-4 w-4 text-slate-500" />}
                                            </button>
                                            
                                            {isFinalCycleExpanded && (
                                                <div className="border-t divide-y bg-slate-50/[0.3] p-2 space-y-1">
                                                    {computedPointsData.breakdown.final.map((item: any, idx: number) => (
                                                        <div key={idx} className="p-3 bg-white rounded-lg border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 transition-all hover:border-slate-300">
                                                            <div className="space-y-1 flex-1 min-w-0">
                                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.type}</p>
                                                                <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
                                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Submitted: {formatDate(item.submissionDate)}</span>
                                                                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Deadline: {formatDate(item.deadlineDate)}</span>
                                                                </div>
                                                            </div>
                                                            <div className="shrink-0 flex items-center self-start md:self-center">
                                                                {item.status === 'on-time' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-emerald-500 hover:bg-emerald-600 text-white border-none flex items-center gap-1">
                                                                        <CheckCircle2 className="h-3 w-3" /> On-Time (+1.0)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'exempt' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-blue-500 hover:bg-blue-600 text-white border-none flex items-center gap-1">
                                                                        <ShieldCheck className="h-3 w-3" /> Exempt (+1.0)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'late' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-amber-500 hover:bg-amber-600 text-white border-none flex items-center gap-1">
                                                                        <Clock className="h-3 w-3" /> Late (+0.5)
                                                                    </Badge>
                                                                )}
                                                                {item.status === 'missing' && (
                                                                    <Badge className="h-5 text-[9px] font-black uppercase bg-slate-200 text-slate-500 border-none flex items-center gap-1">
                                                                        <XCircle className="h-3 w-3" /> Pending (0.0)
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="shadow-md border-primary/10 h-fit">
                        <CardHeader className="bg-primary/5 border-b">
                            <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                <Lock className="h-4 w-4" />
                                Security & Account Access
                            </CardTitle>
                            <CardDescription className="text-xs">Establish a new secure password for your institutional portal access.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <Form {...passwordForm}>
                                <form onSubmit={passwordForm.handleSubmit(handlePasswordUpdate)} className="space-y-5">
                                    <FormField
                                        control={passwordForm.control}
                                        name="currentPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-slate-500">Confirm Identity: Current Password</FormLabel>
                                                <FormControl>
                                                    <div className="relative">
                                                        <KeyRound className="absolute left-3 top-3 h-3.5 w-3.5 text-muted-foreground opacity-50" />
                                                        <Input type="password" {...field} className="pl-9 bg-slate-50 dark:bg-slate-800/50" placeholder="••••••••" disabled={!canEdit} />
                                                    </div>
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <Separator />

                                    <FormField
                                        control={passwordForm.control}
                                        name="newPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-primary">New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} className="h-10 font-bold" placeholder="Minimum 6 characters" disabled={!canEdit} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={passwordForm.control}
                                        name="confirmPassword"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-[10px] font-black uppercase text-primary">Confirm New Password</FormLabel>
                                                <FormControl>
                                                    <Input type="password" {...field} className="h-10 font-bold" disabled={!canEdit} />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <div className="p-4 rounded-xl border border-dashed bg-muted/5 space-y-2">
                                        <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter">Security Protocol</p>
                                        <p className="text-[10px] text-slate-500 leading-relaxed italic">
                                            Updating your password requires a recent login. If you encounter a security timeout, please sign out and sign back in before attempting this update again.
                                        </p>
                                    </div>

                                    <Button
                                        type="submit"
                                        disabled={!canEdit}
                                        className="w-full h-11 font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
                                    >
                                        {isUpdatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                                        Update Security Credentials
                                    </Button>
                                </form>
                            </Form>
                        </CardContent>
                    </Card>

                    <Card className="border-amber-200 bg-amber-50/10">
                        <CardHeader className="py-4">
                            <CardTitle className="text-xs font-black uppercase text-amber-700 flex items-center gap-2">
                                <Info className="h-4 w-4" /> Account Management Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <p className="text-xs text-amber-800 leading-relaxed font-medium">
                                Your account is currently verified for the <strong>{unitName}</strong> office at the <strong>{campusName}</strong>.
                            </p>
                            <p className="text-[10px] text-amber-700/70 italic">
                                If you need to change your assigned Unit or Role, please contact the Quality Assurance Office directly as these details are locked for audit integrity.
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-destructive/20 bg-destructive/5 overflow-hidden">
                        <CardHeader className="bg-destructive/10 border-b py-4">
                            <CardTitle className="text-sm font-black uppercase text-destructive flex items-center gap-2">
                                <Trash2 className="h-5 w-5" /> Danger Zone
                            </CardTitle>
                            <CardDescription className="text-xs">Irreversible actions for your institutional account.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex flex-col gap-4">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Delete This Account</h4>
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                                        Once deleted, you will no longer have access to the RSU EOMS Portal. Your personal profile data and login credentials will be removed.
                                    </p>
                                </div>

                                <Alert className="bg-white border-primary/20">
                                    <ShieldCheck className="h-4 w-4 text-primary" />
                                    <AlertTitle className="text-[10px] font-black uppercase tracking-tight text-primary">Data Privacy Provision (RA 10173)</AlertTitle>
                                    <AlertDescription className="text-[10px] font-medium leading-tight text-slate-600 dark:text-slate-400">
                                        In accordance with the <strong>Data Privacy Act of 2012 (RA 10173)</strong>, specifically the <em>Right to Erasure or Blocking</em>, you may request the removal of your personal identity data from this system. Note that institutional evidence (submissions) is retained for legal and auditing purposes as permitted by law.
                                    </AlertDescription>
                                </Alert>

                                <Alert variant="destructive" className="bg-white border-destructive/20">
                                    <Info className="h-4 w-4" />
                                    <AlertTitle className="text-[10px] font-black uppercase tracking-tight">Institutional Persistence Note</AlertTitle>
                                    <AlertDescription className="text-[10px] font-medium leading-tight">
                                        To maintain institutional audit integrity, all documents you have <strong>submitted</strong> or <strong>approved</strong> will remain in the university registry linked to your institutional identity string.
                                    </AlertDescription>
                                </Alert>

                                <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="font-black uppercase text-[10px] tracking-widest shadow-lg shadow-destructive/20 h-11">
                                            Permanently Delete Account
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <div className="flex items-center gap-2 text-destructive mb-2">
                                                <ShieldAlert className="h-6 w-6" />
                                                <AlertDialogTitle>Account Deletion Request</AlertDialogTitle>
                                            </div>
                                            <AlertDialogDescription className="space-y-4">
                                                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">Are you absolutely sure you want to delete your institutional account?</p>
                                                <p className="text-xs text-muted-foreground leading-relaxed italic">
                                                    This action will remove your profile and authentication record. Your submissions will be preserved in the RSU EOMS Registry for quality auditing compliance.
                                                </p>
                                                <div className="space-y-4 pt-4 border-t">
                                                    <Form {...deleteForm}>
                                                        <form className="space-y-3">
                                                            <FormField
                                                                control={deleteForm.control}
                                                                name="password"
                                                                render={({ field }) => (
                                                                    <FormItem>
                                                                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Enter Password to Confirm</FormLabel>
                                                                        <FormControl>
                                                                            <Input type="password" {...field} className="h-10 bg-slate-50 dark:bg-slate-800/50" placeholder="••••••••" />
                                                                        </FormControl>
                                                                        <FormMessage />
                                                                    </FormItem>
                                                                )}
                                                            />
                                                        </form>
                                                    </Form>
                                                </div>
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter className="mt-4">
                                            <AlertDialogCancel className="font-bold text-[10px] uppercase">Abort</AlertDialogCancel>
                                            <Button
                                                onClick={deleteForm.handleSubmit(handleDeleteAccount)}
                                                disabled={isDeletingAccount}
                                                className="bg-destructive hover:bg-destructive/90 font-black uppercase text-[10px] tracking-widest h-10 px-8"
                                            >
                                                {isDeletingAccount ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                                                Delete My Data
                                            </Button>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
