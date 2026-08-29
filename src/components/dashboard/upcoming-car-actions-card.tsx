'use client';

import { useState, useMemo } from 'react';
import type { CorrectiveActionRequest, Unit, Campus } from '@/lib/types';
import { getNextCarActionInfo, getUpcomingCarActions, type UpcomingCarActionItem } from '@/lib/car-utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  CalendarClock,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Building2,
  School,
  Search,
  ExternalLink,
  ShieldAlert,
  Calendar,
  Bell,
  ArrowRight,
  Filter,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Loader2,
  FileText,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useNotifications } from '@/hooks/use-notifications';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from '@/firebase/firestore-wrapper';
import { CAROverdueMemorandumDialog } from '@/components/qa-reports/car-overdue-memorandum-dialog';

interface UpcomingCarActionsCardProps {
  cars: CorrectiveActionRequest[];
  allUnits: Unit[];
  campuses: Campus[];
  selectedYear?: number;
  className?: string;
  showFilters?: boolean;
  maxItems?: number;
}

export function UpcomingCarActionsCard({
  cars,
  allUnits,
  campuses,
  selectedYear,
  className,
  showFilters = true,
  maxItems,
}: UpcomingCarActionsCardProps) {
  const firestore = useFirestore();
  const { isAdmin, userRole, userProfile } = useUser();
  const { toast } = useToast();
  const { triggerLocalNotification } = useNotifications();

  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'overdue' | 'due_soon' | 'due_month' | 'verification'>(
    'all',
  );
  const [campusFilter, setCampusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [notifyingCarId, setNotifyingCarId] = useState<string | null>(null);
  const [isMemoDialogOpen, setIsMemoDialogOpen] = useState<boolean>(false);

  const unitMap = useMemo(() => new Map(allUnits.map((u) => [u.id, u.name])), [allUnits]);
  const campusMap = useMemo(() => new Map(campuses.map((c) => [c.id, c.name])), [campuses]);

  // Compute all upcoming CAR items
  const allActionItems = useMemo(() => {
    return getUpcomingCarActions(cars || []);
  }, [cars]);

  // Metric counts
  const metrics = useMemo(() => {
    let overdue = 0;
    let dueSoon = 0;
    let dueMonth = 0;
    let awaitingVerification = 0;

    allActionItems.forEach((item) => {
      if (item.car.needsVerification || item.car.status === 'For Final Verification') {
        awaitingVerification++;
      }
      if (item.info.urgency === 'overdue') {
        overdue++;
      } else if (item.info.urgency === 'today' || item.info.urgency === 'due_soon') {
        dueSoon++;
      } else if (
        item.info.urgency === 'scheduled' &&
        item.info.daysRemaining !== null &&
        item.info.daysRemaining <= 30
      ) {
        dueMonth++;
      }
    });

    return {
      total: allActionItems.length,
      overdue,
      dueSoon,
      dueMonth,
      awaitingVerification,
    };
  }, [allActionItems]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return allActionItems.filter((item) => {
      // Campus filter
      if (campusFilter !== 'all' && item.car.campusId !== campusFilter) {
        return false;
      }

      // Urgency filter
      if (urgencyFilter === 'overdue' && item.info.urgency !== 'overdue') {
        return false;
      }
      if (urgencyFilter === 'due_soon' && item.info.urgency !== 'today' && item.info.urgency !== 'due_soon') {
        return false;
      }
      if (
        urgencyFilter === 'due_month' &&
        (item.info.daysRemaining === null || item.info.daysRemaining > 30 || item.info.daysRemaining < 0)
      ) {
        return false;
      }
      if (
        urgencyFilter === 'verification' &&
        !item.car.needsVerification &&
        item.car.status !== 'For Final Verification'
      ) {
        return false;
      }

      // Search filter
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const carNo = (item.car.carNumber || '').toLowerCase();
        const procedure = (item.car.procedureTitle || '').toLowerCase();
        const unitName = (unitMap.get(item.car.unitId) || '').toLowerCase();
        const campusName = (campusMap.get(item.car.campusId) || '').toLowerCase();
        const actionLabel = item.info.actionLabel.toLowerCase();

        return (
          carNo.includes(term) ||
          procedure.includes(term) ||
          unitName.includes(term) ||
          campusName.includes(term) ||
          actionLabel.includes(term)
        );
      }

      return true;
    });
  }, [allActionItems, campusFilter, urgencyFilter, searchTerm, unitMap, campusMap]);

  const displayedItems = maxItems ? filteredItems.slice(0, maxItems) : filteredItems;

  const handleNotifyCar = async (car: CorrectiveActionRequest, info: any) => {
    if (!firestore) return;
    try {
      setNotifyingCarId(car.id);
      const unitName = unitMap.get(car.unitId) || 'Accountable Unit';
      const campusName = campusMap.get(car.campusId) || 'Campus';
      const formattedRecipient = `${unitName} (${campusName})`;
      const senderName = userProfile
        ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() || userProfile.email
        : 'QA Administrator';

      const carRef = doc(firestore, 'correctiveActionRequests', car.id);
      await updateDoc(carRef, {
        lastNotifiedAt: serverTimestamp(),
        lastNotifiedBy: senderName,
      });

      triggerLocalNotification(`[CAR Notice] CAR ${car.carNumber} — ${info.actionLabel}`, {
        body: `Upcoming Milestone for ${formattedRecipient}: ${info.actionLabel} is ${info.badgeText}.`,
        category: 'car',
        link: `/qa-reports?tab=car&id=${car.id}`,
      });

      toast({
        title: 'Accountable Unit Notified!',
        description: `Notification dispatched to ${formattedRecipient} for CAR ${car.carNumber} (${info.actionLabel}).`,
      });
    } catch (err: any) {
      console.error('Error notifying unit for CAR:', err);
      toast({
        title: 'Notification Note',
        description: `Reminder noted for CAR ${car.carNumber}.`,
      });
    } finally {
      setNotifyingCarId(null);
    }
  };

  return (
    <Card className={cn('shadow-lg border-primary/20 bg-card rounded-2xl overflow-hidden', className)}>
      <CardHeader className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 border-b border-primary/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/20 text-primary-foreground border border-primary/30 shadow-inner">
              <CalendarClock className="h-6 w-6 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  Upcoming CAR Actions & Milestones Hub
                </CardTitle>
                <Badge className="bg-indigo-500/20 text-indigo-200 border-indigo-400/30 text-[9px] font-black uppercase">
                  Admin Real-Time Tracker
                </Badge>
              </div>
              <CardDescription className="text-xs text-slate-300 font-medium mt-0.5">
                Centralized monitoring of all next follow-up dates, verification checks, corrective action deadlines,
                and reply limits.
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isAdmin && metrics.overdue > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsMemoDialogOpen(true)}
                className="bg-rose-500/20 text-rose-200 border-rose-400/40 hover:bg-rose-500/30 text-xs font-black uppercase tracking-wider gap-1.5 h-8 shrink-0 shadow-sm"
                title="Generate and Release Official University Memorandum for Overdue CAR Responses"
              >
                <FileText className="h-3.5 w-3.5 text-rose-400" /> Overdue Memo ({metrics.overdue})
              </Button>
            )}
            <Link href="/qa-reports?tab=car" passHref>
              <Button
                size="sm"
                variant="outline"
                className="bg-white/10 text-white border-white/20 hover:bg-white/20 text-xs font-black uppercase tracking-wider gap-1.5 h-8 shrink-0"
              >
                Open CAR Registry <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick KPI Stat Tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'overdue' ? 'all' : 'overdue')}
            className={cn(
              'p-3 rounded-xl cursor-pointer transition-all border',
              urgencyFilter === 'overdue'
                ? 'bg-rose-500/30 border-rose-400 ring-2 ring-rose-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> Overdue
              </span>
              <span className="text-xl font-black text-rose-200 tabular-nums">{metrics.overdue}</span>
            </div>
            <p className="text-[9px] text-slate-300 mt-1 font-medium">Passed target date</p>
          </div>

          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'due_soon' ? 'all' : 'due_soon')}
            className={cn(
              'p-3 rounded-xl cursor-pointer transition-all border',
              urgencyFilter === 'due_soon'
                ? 'bg-amber-500/30 border-amber-400 ring-2 ring-amber-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Next 7 Days
              </span>
              <span className="text-xl font-black text-amber-200 tabular-nums">{metrics.dueSoon}</span>
            </div>
            <p className="text-[9px] text-slate-300 mt-1 font-medium">Urgent upcoming</p>
          </div>

          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'due_month' ? 'all' : 'due_month')}
            className={cn(
              'p-3 rounded-xl cursor-pointer transition-all border',
              urgencyFilter === 'due_month'
                ? 'bg-blue-500/30 border-blue-400 ring-2 ring-blue-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" /> Next 30 Days
              </span>
              <span className="text-xl font-black text-blue-200 tabular-nums">{metrics.dueMonth}</span>
            </div>
            <p className="text-[9px] text-slate-300 mt-1 font-medium">Within 1 month</p>
          </div>

          <div
            onClick={() => setUrgencyFilter(urgencyFilter === 'verification' ? 'all' : 'verification')}
            className={cn(
              'p-3 rounded-xl cursor-pointer transition-all border',
              urgencyFilter === 'verification'
                ? 'bg-purple-500/30 border-purple-400 ring-2 ring-purple-400/50'
                : 'bg-white/5 border-white/10 hover:bg-white/10',
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-300 flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5" /> For Verification
              </span>
              <span className="text-xl font-black text-purple-200 tabular-nums">{metrics.awaitingVerification}</span>
            </div>
            <p className="text-[9px] text-slate-300 mt-1 font-medium">Unit response awaiting check</p>
          </div>
        </div>
      </CardHeader>

      {showFilters && (
        <div className="p-4 bg-muted/20 border-b border-border/50 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by CAR #, unit, procedure, or action..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs bg-background"
            />
          </div>
          <div className="sm:col-span-3">
            <Select value={campusFilter} onValueChange={setCampusFilter}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                <SelectValue placeholder="All Campuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites / Campuses</SelectItem>
                {campuses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-3">
            <Select value={urgencyFilter} onValueChange={(v: any) => setUrgencyFilter(v)}>
              <SelectTrigger className="h-9 text-xs font-semibold bg-background">
                <SelectValue placeholder="Filter Milestones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Active CARs ({metrics.total})</SelectItem>
                <SelectItem value="overdue">🚨 Overdue ({metrics.overdue})</SelectItem>
                <SelectItem value="due_soon">⏳ Due in 7 Days ({metrics.dueSoon})</SelectItem>
                <SelectItem value="due_month">📅 Due in 30 Days ({metrics.dueMonth})</SelectItem>
                <SelectItem value="verification">🔍 Awaiting Verification ({metrics.awaitingVerification})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-[10px] font-black uppercase pl-6 py-3.5">CAR No. & Nature</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Accountable Unit</TableHead>
                <TableHead className="text-[10px] font-black uppercase">Next Action to be Done</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase">Next Action Date</TableHead>
                <TableHead className="text-center text-[10px] font-black uppercase">Status</TableHead>
                <TableHead className="text-right text-[10px] font-black uppercase pr-6">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedItems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-40 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="h-8 w-8 text-emerald-500/60" />
                      <p className="text-xs font-bold">No upcoming CAR actions matching current filter.</p>
                      <p className="text-[10px]">All non-conformances and corrective actions are on track.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                displayedItems.map(({ car, info }) => {
                  const unitName = unitMap.get(car.unitId) || 'Unknown Unit';
                  const campusName = campusMap.get(car.campusId) || 'Institutional';

                  const urgencyBadgeClass =
                    info.urgency === 'overdue'
                      ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300'
                      : info.urgency === 'today'
                        ? 'bg-rose-500 text-white animate-pulse'
                        : info.urgency === 'due_soon'
                          ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300'
                          : info.urgency === 'scheduled'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300'
                            : 'bg-muted text-muted-foreground';

                  return (
                    <TableRow key={car.id} className="hover:bg-muted/30 transition-colors group">
                      {/* CAR No & Procedure */}
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-xs text-primary">{car.carNumber}</span>
                            <Badge
                              variant="outline"
                              className={cn(
                                'text-[8px] font-black uppercase px-1.5 py-0 h-4',
                                car.natureOfFinding === 'NC'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-amber-50 text-amber-700 border-amber-200',
                              )}
                            >
                              {car.natureOfFinding}
                            </Badge>
                            {car.auditType === 'EQA' && (
                              <Badge className="text-[8px] font-black uppercase bg-violet-100 text-violet-800 border-violet-200 px-1.5 h-4">
                                EQA
                              </Badge>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[220px] mt-0.5">
                            {car.procedureTitle}
                          </span>
                        </div>
                      </TableCell>

                      {/* Accountable Unit */}
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200">
                            <Building2 className="h-3 w-3 opacity-40 shrink-0" />
                            <span className="truncate max-w-[200px]">{unitName}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[9px] font-bold text-primary/70 uppercase tracking-tighter">
                            <School className="h-2.5 w-2.5 opacity-40" />
                            {campusName}
                          </div>
                        </div>
                      </TableCell>

                      {/* Next Action Milestone */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {info.actionType}
                            </span>
                            {car.needsVerification && (
                              <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[8px] font-black uppercase h-4 px-1">
                                Pending Check
                              </Badge>
                            )}
                          </div>
                          <span className="text-[9px] text-muted-foreground font-medium truncate max-w-[240px]">
                            {info.actionLabel}
                          </span>
                        </div>
                      </TableCell>

                      {/* Next Action Date & Urgency */}
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={cn(
                              'text-xs font-black tabular-nums',
                              info.isOverdue ? 'text-rose-600' : 'text-slate-800 dark:text-slate-200',
                            )}
                          >
                            {info.formattedDate}
                          </span>
                          <Badge
                            variant="outline"
                            className={cn('text-[8px] font-black uppercase h-4 px-1.5', urgencyBadgeClass)}
                          >
                            {info.badgeText}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* CAR Status */}
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[9px] font-black uppercase px-2 h-5 border',
                            car.status === 'Open'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : car.status === 'Awaiting Response/Update'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : car.status === 'For Final Verification'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200',
                          )}
                        >
                          {car.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-1.5">
                          {isAdmin && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={notifyingCarId === car.id}
                              onClick={() => handleNotifyCar(car, info)}
                              className="h-7 text-[9px] font-bold px-2 gap-1 text-amber-600 border-amber-300 hover:bg-amber-50"
                              title="Notify Accountable Unit Head"
                            >
                              {notifyingCarId === car.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Bell className="h-3 w-3" />
                              )}
                              NOTIFY
                            </Button>
                          )}
                          <Link href={`/qa-reports?tab=car&id=${car.id}`} passHref>
                            <Button size="sm" className="h-7 font-black uppercase text-[9px] px-2.5 gap-1 shadow-sm">
                              Manage <ChevronRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {maxItems && filteredItems.length > maxItems && (
        <CardFooter className="p-3 bg-muted/10 border-t flex justify-between items-center text-xs">
          <span className="text-muted-foreground text-[11px] font-medium">
            Showing {maxItems} of {filteredItems.length} active CAR milestones
          </span>
          <Link href="/qa-reports?tab=car" passHref>
            <Button variant="ghost" size="sm" className="text-xs font-black uppercase gap-1 h-7 text-primary">
              View All Milestones <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </CardFooter>
      )}
      {/* OVERDUE CAR RESPONSE MEMORANDUM GENERATOR DIALOG */}
      <CAROverdueMemorandumDialog
        isOpen={isMemoDialogOpen}
        onOpenChange={setIsMemoDialogOpen}
        cars={cars || []}
        units={allUnits || []}
        campuses={campuses || []}
        year={selectedYear || new Date().getFullYear()}
      />
    </Card>
  );
}
