'use client';

import { useState, useMemo } from 'react';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { collection, query, where, doc, deleteDoc, addDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { useYear } from '@/lib/year-provider';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import type { PbbSubmission, PbbSettings, Campus, Unit } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Info,
  ExternalLink,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  Building,
  School,
  FileText,
  Search,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export default function PbbSubmissionsPage() {
  const { user, userProfile, isAdmin, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { selectedYear } = useYear();
  const { toast } = useToast();

  // Page States
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYearFilter, setSelectedYearFilter] = useState<string>('all');

  // Submit Form States
  const [formTitle, setFormTitle] = useState('');
  const [formYear, setFormYear] = useState<string>('');
  const [formGoogleLink, setFormGoogleLink] = useState('');
  const [formCampusId, setFormCampusId] = useState<string>('');
  const [formUnitId, setFormUnitId] = useState<string>('');

  // Fetch PBB Settings for authorized units list
  const pbbSettingsRef = useMemoFirebase(
    () => (firestore && user ? doc(firestore, 'system', 'pbbSettings') : null),
    [firestore, user],
  );
  const { data: pbbSettings, isLoading: isLoadingSettings } = useDoc<PbbSettings>(pbbSettingsRef);

  // Check if current user's unit is authorized or user is Admin
  const hasGlobalAccess = useMemo(() => {
    if (isAdmin) return true;
    if (!userProfile?.unitId || !pbbSettings?.authorizedUnitIds) return false;
    return pbbSettings.authorizedUnitIds.includes(userProfile.unitId);
  }, [isAdmin, userProfile?.unitId, pbbSettings?.authorizedUnitIds]);

  // Load campuses & units
  const campusesQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'campuses') : null),
    [firestore, user],
  );
  const { data: campuses } = useCollection<Campus>(campusesQuery);

  const unitsQuery = useMemoFirebase(
    () => (firestore && user ? collection(firestore, 'units') : null),
    [firestore, user],
  );
  const { data: units } = useCollection<Unit>(unitsQuery);

  const campusMap = useMemo(() => new Map(campuses?.map((c) => [c.id, c.name])), [campuses]);
  const unitMap = useMemo(() => new Map(units?.map((u) => [u.id, u])), [units]);

  // Dynamic Year Option Generator (system year +/- 5 years)
  const systemYear = useMemo(() => selectedYear || new Date().getFullYear(), [selectedYear]);
  const yearOptions = useMemo(() => {
    const years: number[] = [];
    for (let y = systemYear - 5; y <= systemYear + 5; y++) {
      years.push(y);
    }
    return years;
  }, [systemYear]);

  // Query submissions
  const pbbSubmissionsQuery = useMemoFirebase(() => {
    if (!firestore || !userProfile || isUserLoading) return null;
    const col = collection(firestore, 'pbbSubmissions');

    // If the user has global access, load all PBB submissions
    if (hasGlobalAccess) {
      return col;
    }
    // Otherwise, restrict to user's unit
    return query(col, where('unitId', '==', userProfile.unitId));
  }, [firestore, userProfile, isUserLoading, hasGlobalAccess]);

  const { data: rawSubmissions, isLoading: isLoadingSubmissions } = useCollection<PbbSubmission>(pbbSubmissionsQuery);

  // Form unit list filtered by campus selection for admin/global submission overrides
  const formFilteredUnits = useMemo(() => {
    if (!units || !formCampusId) return [];
    return units.filter((u) => u.campusIds?.includes(formCampusId)).sort((a, b) => a.name.localeCompare(b.name));
  }, [units, formCampusId]);

  // Filtered Submissions list based on Search Term and Year Filter
  const filteredSubmissions = useMemo(() => {
    if (!rawSubmissions) return [];
    let list = [...rawSubmissions];

    if (selectedYearFilter !== 'all') {
      list = list.filter((s) => s.year.toString() === selectedYearFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      list = list.filter(
        (s) =>
          s.title.toLowerCase().includes(lower) ||
          (s.unitName && s.unitName.toLowerCase().includes(lower)) ||
          (s.campusName && s.campusName.toLowerCase().includes(lower)) ||
          (s.submittedByName && s.submittedByName.toLowerCase().includes(lower)),
      );
    }

    // Sort by submittedAt descending (newest first)
    return list.sort((a, b) => {
      const aTime = a.submittedAt?.seconds || 0;
      const bTime = b.submittedAt?.seconds || 0;
      return bTime - aTime;
    });
  }, [rawSubmissions, selectedYearFilter, searchTerm]);

  // Group submissions by year for organized rendering
  const submissionsGroupedByYear = useMemo(() => {
    const groups: Record<number, PbbSubmission[]> = {};

    filteredSubmissions.forEach((sub) => {
      if (!groups[sub.year]) {
        groups[sub.year] = [];
      }
      groups[sub.year].push(sub);
    });

    // Sort years descending
    return Object.keys(groups)
      .map(Number)
      .sort((a, b) => b - a)
      .map((year) => ({
        year,
        submissions: groups[year],
      }));
  }, [filteredSubmissions]);

  // Format timestamp helper
  const formatSubmissionDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    try {
      const d = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return format(d, 'MMM dd, yyyy hh:mm a');
    } catch {
      return 'N/A';
    }
  };

  // Form submission handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firestore || !user || !userProfile) return;

    if (!formTitle.trim()) {
      toast({ title: 'Validation Error', description: 'Document Title is required.', variant: 'destructive' });
      return;
    }
    if (!formYear) {
      toast({ title: 'Validation Error', description: 'Submission Year is required.', variant: 'destructive' });
      return;
    }
    if (!formGoogleLink.trim() || !formGoogleLink.startsWith('http')) {
      toast({ title: 'Validation Error', description: 'Please provide a valid document URL.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Determine unit and campus info (admin can submit for other units if they specified, otherwise use user's unit)
      const targetUnitId = hasGlobalAccess && formUnitId ? formUnitId : userProfile.unitId;
      const targetCampusId = hasGlobalAccess && formCampusId ? formCampusId : userProfile.campusId;

      const targetUnit = targetUnitId ? unitMap.get(targetUnitId) : null;
      const targetCampusName = targetCampusId ? campusMap.get(targetCampusId) || 'Unknown Campus' : 'Unknown Campus';
      const targetUnitName = targetUnit?.name || userProfile.unitName || 'Unknown Unit';

      const newSubmissionData = {
        unitId: targetUnitId || 'N/A',
        unitName: targetUnitName,
        campusId: targetCampusId || 'N/A',
        campusName: targetCampusName,
        year: Number(formYear),
        submittedAt: serverTimestamp(),
        title: formTitle.trim(),
        googleLink: formGoogleLink.trim(),
        submittedBy: user.uid,
        submittedByName:
          `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || user.email || 'Unknown User',
      };

      await addDoc(collection(firestore, 'pbbSubmissions'), newSubmissionData);

      toast({
        title: 'Success',
        description: 'PBB Document submitted successfully.',
      });

      // Reset form states
      setFormTitle('');
      setFormYear('');
      setFormGoogleLink('');
      setFormCampusId('');
      setFormUnitId('');
      setShowSubmitForm(false);
    } catch (error) {
      console.error('Error submitting PBB document:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to upload document reference.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete submission handler
  const handleDelete = async (id: string) => {
    if (!firestore) return;
    if (!confirm('Are you sure you want to delete this submission?')) return;

    try {
      await deleteDoc(doc(firestore, 'pbbSubmissions', id));
      toast({
        title: 'Deleted',
        description: 'PBB Submission reference removed successfully.',
      });
    } catch (error) {
      console.error('Error deleting PBB submission:', error);
      toast({
        title: 'Delete Failed',
        description: 'Failed to remove the submission.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = isUserLoading || isLoadingSettings || isLoadingSubmissions;

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-tight text-primary">PBB Submissions</h2>
          <p className="text-muted-foreground text-sm">
            {hasGlobalAccess
              ? 'Institutional Overview: Monitor and aggregate Performance-Based Bonus submissions across all campuses.'
              : 'Submit and view Performance-Based Bonus documents for your unit.'}
          </p>
        </div>
        {!showSubmitForm && (
          <Button
            onClick={() => {
              setShowSubmitForm(true);
              setFormYear(systemYear.toString());
              if (hasGlobalAccess) {
                setFormCampusId(userProfile?.campusId || '');
                setFormUnitId(userProfile?.unitId || '');
              }
            }}
            className="shadow-lg shadow-primary/20 font-black uppercase tracking-wider text-[10px]"
          >
            <Plus className="h-4 w-4 mr-2" /> Submit Document
          </Button>
        )}
      </div>

      {/* REQUIRED RESEARCH INSTRUCTION BANNER */}
      <div className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border border-yellow-500/20 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-black uppercase tracking-wider">Required Research Mandate</p>
          <p className="text-sm font-bold italic">"Please research about performance based bunot of the philippines"</p>
        </div>
      </div>

      {/* INLINE SUBMISSION FORM AREA (NOT ALERTDIALOG) */}
      {showSubmitForm && (
        <Card className="border-primary/20 shadow-lg animate-in slide-in-from-top duration-300">
          <CardHeader className="bg-primary/5 border-b">
            <CardTitle>Submit PBB Document</CardTitle>
            <CardDescription>
              Provide the details below to submit your unit's Performance-Based Bonus document.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* TITLE OF DOCUMENT */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                    Document Title
                  </label>
                  <Input
                    placeholder="e.g. FY 2026 Office Performance Commitment and Review"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    required
                    className="font-medium"
                  />
                </div>

                {/* YEAR (5 years below, 5 years ahead) */}
                <div className="space-y-1">
                  <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">Year</label>
                  <Select value={formYear} onValueChange={setFormYear}>
                    <SelectTrigger className="font-bold">
                      <SelectValue placeholder="Select Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {yearOptions.map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* GOOGLE DRIVE LINK */}
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                  Google Link of Document
                </label>
                <Input
                  type="url"
                  placeholder="https://docs.google.com/document/d/... or https://drive.google.com/..."
                  value={formGoogleLink}
                  onChange={(e) => setFormGoogleLink(e.target.value)}
                  required
                  className="font-medium"
                />
              </div>

              {/* ADMIN OVERRIDES (CHOOSE CAMPUS & UNIT) */}
              {hasGlobalAccess && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border">
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      Target Campus
                    </label>
                    <Select
                      value={formCampusId}
                      onValueChange={(val) => {
                        setFormCampusId(val);
                        setFormUnitId('');
                      }}
                    >
                      <SelectTrigger className="font-medium">
                        <SelectValue placeholder="Select Campus" />
                      </SelectTrigger>
                      <SelectContent>
                        {campuses
                          ?.sort((a, b) => a.name.localeCompare(b.name))
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                      Target Unit / Office
                    </label>
                    <Select value={formUnitId} onValueChange={setFormUnitId} disabled={!formCampusId}>
                      <SelectTrigger className="font-medium">
                        <SelectValue placeholder={formCampusId ? 'Select Unit / Office' : 'Select Campus first...'} />
                      </SelectTrigger>
                      <SelectContent>
                        {formFilteredUnits.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* DATES INFO */}
              <div className="p-3 rounded bg-slate-100 dark:bg-slate-800 border text-xs text-muted-foreground italic flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary shrink-0" />
                <span>
                  The exact date and time of submission will be recorded automatically based on system servers.
                </span>
              </div>

              {/* BUTTONS */}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowSubmitForm(false)}
                  disabled={isSubmitting}
                  className="font-bold text-xs uppercase"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-bold text-xs uppercase shadow-lg shadow-primary/20"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting
                    </>
                  ) : (
                    'Submit Document'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* FILTER & SEARCH HUB */}
      <Card className="shadow-sm border-muted">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 items-center w-full md:w-auto">
              <span className="text-xs font-bold uppercase text-muted-foreground whitespace-nowrap">Filter Year:</span>
              <Select value={selectedYearFilter} onValueChange={setSelectedYearFilter}>
                <SelectTrigger className="w-full md:w-[150px] font-bold">
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {yearOptions.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SUBMISSIONS LIST (GROUPED BY YEAR) */}
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : submissionsGroupedByYear.length === 0 ? (
        <div className="border border-dashed rounded-lg p-12 text-center text-muted-foreground">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-20 text-primary" />
          <p className="text-lg font-bold">No Submissions Found</p>
          <p className="text-sm mt-1">Get started by uploading your unit's Performance-Based Bonus documents.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {submissionsGroupedByYear.map(({ year, submissions }) => (
            <Card key={year} className="border-muted shadow-md overflow-hidden">
              <CardHeader className="bg-slate-50 dark:bg-slate-900/60 border-b flex flex-row items-center justify-between py-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg font-black tracking-tight">Submission Year {year}</CardTitle>
                </div>
                <Badge variant="secondary" className="font-black text-xs">
                  {submissions.length} {submissions.length === 1 ? 'Document' : 'Documents'}
                </Badge>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Document Title</TableHead>
                      {hasGlobalAccess && <TableHead>Unit / Office</TableHead>}
                      {hasGlobalAccess && <TableHead>Campus</TableHead>}
                      <TableHead>Date Submitted</TableHead>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Document Link</TableHead>
                      <TableHead className="w-[80px] text-center">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((sub) => (
                      <TableRow key={sub.id} className="hover:bg-muted/30">
                        <TableCell className="font-bold">{sub.title}</TableCell>
                        {hasGlobalAccess && (
                          <TableCell>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                              {sub.unitName || 'Unknown Unit'}
                            </span>
                          </TableCell>
                        )}
                        {hasGlobalAccess && (
                          <TableCell>
                            <Badge variant="outline" className="font-medium bg-slate-50 dark:bg-slate-800">
                              {sub.campusName || 'Unknown Campus'}
                            </Badge>
                          </TableCell>
                        )}
                        <TableCell className="text-xs text-muted-foreground font-mono">
                          {formatSubmissionDate(sub.submittedAt)}
                        </TableCell>
                        <TableCell className="text-xs font-semibold">{sub.submittedByName || 'Unknown'}</TableCell>
                        <TableCell>
                          <a
                            href={sub.googleLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-xs font-bold text-primary hover:underline"
                          >
                            Google Link <ExternalLink className="h-3 w-3 ml-1" />
                          </a>
                        </TableCell>
                        <TableCell className="text-center">
                          {/* Admins can delete any. Normal users can delete their own. */}
                          {isAdmin || sub.submittedBy === user?.uid ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(sub.id)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
