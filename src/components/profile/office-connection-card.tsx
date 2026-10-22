'use client';

import { useMemo, useState } from 'react';
import { addDoc, collection, query, serverTimestamp, where } from '@/firebase/firestore-wrapper';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { Campus, OfficeConnectionRequest, Role, Unit } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useSessionActivity } from '@/lib/activity-log-provider';
import { NdaAgreementContent } from '@/components/auth/nda-agreement';
import { Building2, CheckCircle2, Clock3, Loader2, Plus, ShieldCheck } from 'lucide-react';

const RSU_EMAIL_DOMAIN = '@rsu.edu.ph';

export function OfficeConnectionCard() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, userProfile, assignments } = useUser();
  const { logSessionActivity } = useSessionActivity();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCampusId, setSelectedCampusId] = useState('');
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [message, setMessage] = useState('');
  const [ndaAccepted, setNdaAccepted] = useState(false);

  const campusesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'campuses') : null), [firestore]);
  const unitsQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'units') : null), [firestore]);
  const rolesQuery = useMemoFirebase(() => (firestore ? collection(firestore, 'roles') : null), [firestore]);
  const requestsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(collection(firestore, 'officeConnectionRequests'), where('requesterId', '==', user.uid));
  }, [firestore, user?.uid]);

  const { data: campuses } = useCollection<Campus>(campusesQuery);
  const { data: units } = useCollection<Unit>(unitsQuery);
  const { data: roles } = useCollection<Role>(rolesQuery);
  const { data: requests } = useCollection<OfficeConnectionRequest>(requestsQuery);

  const isRsuAccount = Boolean(userProfile?.email?.toLowerCase().endsWith(RSU_EMAIL_DOMAIN));

  const availableUnits = useMemo(() => {
    if (!units || !selectedCampusId) return [];
    return units.filter((unit) => unit.campusIds?.includes(selectedCampusId));
  }, [units, selectedCampusId]);

  const availableRoles = useMemo(() => {
    if (!roles) return [];
    return roles.filter(
      (role) => !['admin', 'administrator', 'super admin', 'system administrator'].includes(role.name.toLowerCase()),
    );
  }, [roles]);

  const pendingRequests = useMemo(
    () =>
      (requests || [])
        .filter((request) => request.status === 'pending')
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.()?.getTime?.() || 0;
          const bTime = b.createdAt?.toDate?.()?.getTime?.() || 0;
          return bTime - aTime;
        }),
    [requests],
  );

  const canRequestOffice = isRsuAccount && Boolean(userProfile?.verified);

  const resetForm = () => {
    setSelectedCampusId('');
    setSelectedUnitId('');
    setSelectedRoleId('');
    setMessage('');
    setNdaAccepted(false);
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) resetForm();
  };

  const handleSubmit = async () => {
    if (!firestore || !user || !userProfile) return;

    if (!isRsuAccount) {
      toast({
        title: 'Official RSU account required',
        description: 'Only @rsu.edu.ph accounts can request an additional office connection.',
        variant: 'destructive',
      });
      return;
    }

    const campus = campuses?.find((item) => item.id === selectedCampusId);
    const unit = units?.find((item) => item.id === selectedUnitId);
    const role = roles?.find((item) => item.id === selectedRoleId);

    if (!campus || !unit || !role) {
      toast({
        title: 'Incomplete request',
        description: 'Select a campus, office, and requested role.',
        variant: 'destructive',
      });
      return;
    }

    if (message.trim().length < 10) {
      toast({
        title: 'Request message required',
        description: 'Explain why you need access to this office (at least 10 characters).',
        variant: 'destructive',
      });
      return;
    }

    if (!ndaAccepted) {
      toast({
        title: 'NDA acceptance required',
        description: 'Read and accept the Non-Disclosure Agreement before submitting.',
        variant: 'destructive',
      });
      return;
    }

    const alreadyAssigned = assignments.some(
      (assignment) => assignment.unitId === unit.id && assignment.role === role.name,
    );
    const alreadyPending = pendingRequests.some((request) => request.unitId === unit.id && request.role === role.name);

    if (alreadyAssigned) {
      toast({
        title: 'Already connected',
        description: 'You already have this office and role in your active designations.',
        variant: 'destructive',
      });
      return;
    }

    if (alreadyPending) {
      toast({
        title: 'Request already pending',
        description: 'An administrator is already reviewing this office request.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await addDoc(collection(firestore, 'officeConnectionRequests'), {
        requesterId: user.uid,
        requesterName: `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim(),
        requesterEmail: userProfile.email,
        unitId: unit.id,
        unitName: unit.name,
        campusId: campus.id,
        campusName: campus.name,
        role: role.name,
        roleId: role.id,
        message: message.trim(),
        ndaAccepted: true,
        ndaAcceptedAt: serverTimestamp(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      logSessionActivity(`Requested an additional office connection: ${unit.name}`, {
        action: 'request_office_connection',
        details: { unitId: unit.id, role: role.name },
      });

      toast({
        title: 'Office request submitted',
        description: 'An administrator will review your request in User Settings.',
      });
      handleDialogChange(false);
    } catch (error) {
      console.error('Error submitting office connection request:', error);
      toast({
        title: 'Request failed',
        description: 'Could not submit the office connection request. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Card className="shadow-md border-primary/10">
        <CardHeader className="bg-primary/5 border-b">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-sm font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Connected Offices
              </CardTitle>
              <CardDescription className="text-xs">
                Your active designations and office connection requests.
              </CardDescription>
            </div>
            {canRequestOffice && (
              <Button
                type="button"
                size="sm"
                onClick={() => setIsDialogOpen(true)}
                className="font-black uppercase text-[10px] tracking-wider"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add / Connect Office
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex flex-col gap-1 rounded-lg border bg-muted/20 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-bold">{assignment.unitName || 'Unnamed Office'}</p>
                  <p className="text-xs text-muted-foreground">
                    {assignment.role}
                    {assignment.campusName ? ` • ${assignment.campusName}` : ''}
                  </p>
                </div>
                {assignment.isPrimary && (
                  <Badge variant="secondary" className="w-fit text-[9px] font-black uppercase tracking-wider">
                    Primary
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {pendingRequests.length > 0 && (
            <div className="space-y-2 border-t pt-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pending Requests</p>
              {pendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3"
                >
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="text-sm font-bold">{request.unitName}</p>
                    <p className="text-xs text-muted-foreground">
                      {request.role} • {request.campusName}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.message}</p>
                  </div>
                  <Badge
                    variant="outline"
                    className="ml-auto shrink-0 border-amber-500/40 text-[9px] uppercase text-amber-700"
                  >
                    Pending
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {!isRsuAccount && (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Additional office connections are available only to official <strong>@rsu.edu.ph</strong> accounts.
            </div>
          )}

          {isRsuAccount && !userProfile?.verified && (
            <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground">
              Your account must be verified before you can request an additional office.
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Add / Connect Office
            </DialogTitle>
            <DialogDescription>
              Request access to another RSU office. Your request and NDA acceptance will be reviewed by an administrator
              in User Settings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Campus</Label>
                <Select
                  value={selectedCampusId}
                  onValueChange={(value) => {
                    setSelectedCampusId(value);
                    setSelectedUnitId('');
                  }}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select campus" />
                  </SelectTrigger>
                  <SelectContent>
                    {(campuses || []).map((campus) => (
                      <SelectItem key={campus.id} value={campus.id}>
                        {campus.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase">Office / Unit</Label>
                <Select
                  value={selectedUnitId}
                  onValueChange={setSelectedUnitId}
                  disabled={isSubmitting || !selectedCampusId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedCampusId ? 'Select office' : 'Select campus first'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUnits.map((unit) => (
                      <SelectItem key={unit.id} value={unit.id}>
                        {unit.name}
                      </SelectItem>
                    ))}
                    {selectedCampusId && availableUnits.length === 0 && (
                      <div className="p-4 text-center text-xs italic text-muted-foreground">
                        No offices found for this campus.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Requested Role / Designation</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role for this office" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase">Request Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Explain your designation and why you need access to this office..."
                rows={4}
                disabled={isSubmitting}
              />
              <p className="text-[10px] text-muted-foreground">
                This message will be shown to the administrator reviewing your request.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="flex items-center gap-2 text-sm font-bold">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Non-Disclosure Agreement
                </p>
                <p className="text-xs text-muted-foreground">
                  This NDA applies to the additional office you are requesting access to.
                </p>
              </div>
              <ScrollArea className="h-48 rounded-md border bg-background p-4 text-xs">
                <NdaAgreementContent />
              </ScrollArea>
              <div className="flex items-start gap-2">
                <Checkbox
                  id="office-connection-nda"
                  checked={ndaAccepted}
                  onCheckedChange={(checked) => setNdaAccepted(checked === true)}
                  disabled={isSubmitting}
                />
                <Label htmlFor="office-connection-nda" className="text-xs leading-snug">
                  I have read and accept the Non-Disclosure Agreement for this office connection.
                </Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleDialogChange(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
