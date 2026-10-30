'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { collection, query, Timestamp, where } from '@/firebase/firestore-wrapper';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import type { CorrectiveActionRequest, ManagementReview, ManagementReviewOutput, QaAuditReport } from '@/lib/types';
import { ISO_21001_CLAUSE_INPUTS } from '@/components/qa-reports/iso-21001-template';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ExternalLink,
  FileText,
  Maximize2,
  Minimize2,
  Presentation,
  Users,
} from 'lucide-react';

type ReviewSlide =
  | { kind: 'overview'; title: string; subtitle: string }
  | { kind: 'agenda'; title: string; subtitle: string; partNumber: number };

const STATUS_COLORS: Record<string, string> = {
  Open: '#b91c1c',
  'On-going': '#d97706',
  'Submit for Closure Verification': '#2563eb',
  Closed: '#15803d',
  'In Progress': '#d97706',
  'Awaiting Response/Update': '#ca8a04',
  'For Final Verification': '#2563eb',
};

function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}

function formatDate(value: unknown): string {
  const date = toDate(value);
  return date
    ? new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(date)
    : 'Not specified';
}

function CountCard({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-2 text-4xl font-black tabular-nums text-emerald-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function StatusChart({ counts }: { counts: Record<string, number> }) {
  const rows = Object.entries(counts).filter(([, count]) => count > 0);
  const total = rows.reduce((sum, [, count]) => sum + count, 0);

  if (total === 0) {
    return <p className="text-sm text-slate-500">No status records are available for this review.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-5 overflow-hidden rounded-full bg-slate-100" aria-label="Status distribution">
        {rows.map(([status, count]) => (
          <div
            key={status}
            title={`${status}: ${count}`}
            style={{ width: `${(count / total) * 100}%`, backgroundColor: STATUS_COLORS[status] || '#64748b' }}
          />
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map(([status, count]) => (
          <div key={status} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <span className="h-3 w-3 rounded-full" style={{ backgroundColor: STATUS_COLORS[status] || '#64748b' }} />
              {status}
            </span>
            <span className="text-lg font-black tabular-nums text-slate-900">{count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutputsTable({ outputs }: { outputs: ManagementReviewOutput[] }) {
  const rows = outputs.slice(0, 5);
  return (
    <div className="mt-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="p-3">Ref.</th>
              <th className="p-3">Decision / action</th>
              <th className="p-3">Responsible unit</th>
              <th className="p-3">Follow-up</th>
              <th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((output, index) => (
                <tr key={output.id} className="border-t border-slate-200 align-top">
                  <td className="p-3 font-bold">{output.lineNumber || index + 1}</td>
                  <td className="max-w-sm p-3">{output.description}</td>
                  <td className="p-3">
                    {output.assignments
                      ?.map((assignment) => assignment.unitId)
                      .filter(Boolean)
                      .join(', ') || '-'}
                  </td>
                  <td className="whitespace-nowrap p-3">{formatDate(output.followUpDate)}</td>
                  <td className="p-3 font-bold">{output.status}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500">
                  No action records are available for this review.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {outputs.length > rows.length && (
        <p className="mt-2 text-right text-xs font-semibold text-slate-500">
          Showing {rows.length} of {outputs.length} actions
        </p>
      )}
    </div>
  );
}

function AuditReportsTable({ reports }: { reports: QaAuditReport[] }) {
  const rows = reports.slice(0, 5);
  return (
    <div className="mt-5">
      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead className="bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="p-3">Type</th>
              <th className="p-3">Report</th>
              <th className="p-3">Standard / body</th>
              <th className="p-3">Start date</th>
              <th className="p-3">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {rows.length ? (
              rows.map((report) => (
                <tr key={report.id} className="border-t border-slate-200 align-top">
                  <td className="p-3 font-black text-emerald-900">{report.type}</td>
                  <td className="p-3 font-semibold">{report.title}</td>
                  <td className="p-3">{report.standard || report.certifyingBody || '-'}</td>
                  <td className="whitespace-nowrap p-3">{formatDate(report.startDate)}</td>
                  <td className="p-3">
                    {report.googleDriveLink ? (
                      <a
                        href={report.googleDriveLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-emerald-800 underline"
                      >
                        Open
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="p-4 text-center text-slate-500">
                  No audit reports are linked to this review cycle.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {reports.length > rows.length && (
        <p className="mt-2 text-right text-xs font-semibold text-slate-500">
          Showing {rows.length} of {reports.length} reports
        </p>
      )}
    </div>
  );
}

function EvidenceLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900 transition-colors hover:bg-emerald-100"
    >
      <ExternalLink className="h-4 w-4" />
      {label}
    </a>
  );
}

export default function ManagementReviewPresentationPage() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const { isAdmin, isAuditor, isVp, isVpOffice, isUserLoading, user, userRole, userError } = useUser();
  const firestore = useFirestore();
  const presentationRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const roleName = userRole?.toLowerCase() || '';
  const canViewPresentation =
    isAdmin ||
    isAuditor ||
    isVp ||
    isVpOffice ||
    roleName.includes('president') ||
    roleName.includes('quality management') ||
    roleName.includes('qms');
  const reviewId = params.reviewId;

  const reviewsQuery = useMemoFirebase(
    () => (firestore && canViewPresentation ? query(collection(firestore, 'managementReviews')) : null),
    [firestore, canViewPresentation],
  );
  const {
    data: reviews,
    isLoading: isLoadingReviews,
    error: reviewsError,
  } = useCollection<ManagementReview>(reviewsQuery);
  const review = useMemo(() => reviews?.find((item) => item.id === reviewId) || null, [reviews, reviewId]);

  const previousReview = useMemo(() => {
    if (!review || !reviews) return null;
    const reviewStart = toDate(review.startDate)?.getTime() ?? 0;
    return (
      reviews
        .filter((item) => item.id !== review.id && (toDate(item.startDate)?.getTime() ?? 0) < reviewStart)
        .sort((a, b) => (toDate(b.startDate)?.getTime() ?? 0) - (toDate(a.startDate)?.getTime() ?? 0))[0] || null
    );
  }, [review, reviews]);

  const outputsQuery = useMemoFirebase(() => {
    if (!firestore || !canViewPresentation || !review) return null;
    const reviewIds = [review.id, ...(previousReview ? [previousReview.id] : [])];
    return query(collection(firestore, 'managementReviewOutputs'), where('mrId', 'in', reviewIds));
  }, [firestore, canViewPresentation, review, previousReview]);
  const {
    data: outputs,
    isLoading: isLoadingOutputs,
    error: outputsError,
  } = useCollection<ManagementReviewOutput>(outputsQuery);

  const carsQuery = useMemoFirebase(
    () =>
      firestore && canViewPresentation
        ? review?.campusId && review.campusId !== 'university-wide'
          ? query(collection(firestore, 'correctiveActionRequests'), where('campusId', '==', review.campusId))
          : collection(firestore, 'correctiveActionRequests')
        : null,
    [firestore, canViewPresentation, review?.campusId],
  );
  const { data: cars, isLoading: isLoadingCars, error: carsError } = useCollection<CorrectiveActionRequest>(carsQuery);

  const reportsQuery = useMemoFirebase(
    () => (firestore && canViewPresentation ? collection(firestore, 'qaAuditReports') : null),
    [firestore, canViewPresentation],
  );
  const {
    data: auditReports,
    isLoading: isLoadingReports,
    error: reportsError,
  } = useCollection<QaAuditReport>(reportsQuery);

  const currentOutputs = useMemo(
    () => (outputs || []).filter((output) => output.mrId === review?.id),
    [outputs, review?.id],
  );
  const previousOutputs = useMemo(
    () => (outputs || []).filter((output) => output.mrId === previousReview?.id),
    [outputs, previousReview?.id],
  );
  const reviewCars = useMemo(
    () =>
      (cars || []).filter((car) => {
        if (review?.campusId !== 'university-wide' && car.campusId !== review?.campusId) return false;
        const carDate = toDate(car.createdAt);
        const reviewDate = toDate(review?.startDate);
        return !carDate || !reviewDate || carDate.getFullYear() === reviewDate.getFullYear();
      }),
    [cars, review?.campusId, review?.startDate],
  );
  const reviewAuditReports = useMemo(
    () =>
      (auditReports || []).filter((report) => {
        const reviewDate = toDate(review?.startDate);
        const reportDate = toDate(report.startDate);
        return (
          Boolean(reviewDate && reportDate && reportDate.getFullYear() === reviewDate.getFullYear()) &&
          (review?.campusId === 'university-wide' || report.campusIds?.includes(review?.campusId || ''))
        );
      }),
    [auditReports, review?.campusId, review?.startDate],
  );

  const agendaParts = useMemo(() => {
    if (!review) return [];
    if (review.agendaParts?.length) return review.agendaParts;
    return ISO_21001_CLAUSE_INPUTS.map((part) => ({
      ...part,
      assignedReporters: part.suggestedReporter,
      status: 'Pending' as const,
      driveFolderLink: '',
    }));
  }, [review]);

  const slides = useMemo<ReviewSlide[]>(() => {
    if (!review) return [];
    return [
      { kind: 'overview', title: 'Management Review', subtitle: 'Session overview and institutional quality snapshot' },
      ...[...agendaParts]
        .sort((a, b) => a.partNumber - b.partNumber)
        .map((part) => ({
          kind: 'agenda' as const,
          title: part.title,
          subtitle: part.clause,
          partNumber: part.partNumber,
        })),
    ];
  }, [review, agendaParts]);

  useEffect(() => {
    setSlideIndex((index) => Math.min(index, Math.max(slides.length - 1, 0)));
  }, [slides.length]);

  const goToSlide = useCallback(
    (index: number) => setSlideIndex(Math.max(0, Math.min(index, slides.length - 1))),
    [slides.length],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await presentationRef.current?.requestFullscreen();
      }
    } catch (error) {
      console.error('Unable to toggle Management Review presentation fullscreen:', error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(document.fullscreenElement === presentationRef.current);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowRight' || event.key === 'PageDown') {
        event.preventDefault();
        goToSlide(slideIndex + 1);
      } else if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
        event.preventDefault();
        goToSlide(slideIndex - 1);
      } else if (event.key === 'Home') {
        goToSlide(0);
      } else if (event.key === 'End') {
        goToSlide(slides.length - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [goToSlide, slideIndex, slides.length]);

  const isLoading =
    isUserLoading ||
    (canViewPresentation && (isLoadingReviews || isLoadingOutputs || isLoadingCars || isLoadingReports));
  const loadError = userError || reviewsError || outputsError || carsError || reportsError;

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 font-sans text-slate-600">
        Loading Management Review presentation…
      </main>
    );
  }

  if (!user || !canViewPresentation) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Institutional access required</h1>
          <p className="mt-2 text-sm text-slate-600">
            This Management Review presentation is available to authorized institutional reviewers and leadership.
          </p>
          <button
            className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white"
            onClick={() => router.push('/qa-reports?tab=mr')}
          >
            Return to Management Review
          </button>
        </section>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <section className="max-w-lg rounded-2xl border border-rose-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-black text-rose-900">Could not load presentation data</h1>
          <p className="mt-2 text-sm text-slate-600">{loadError.message}</p>
          <button
            className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white"
            onClick={() => router.push('/qa-reports?tab=mr')}
          >
            Return to Management Review
          </button>
        </section>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 font-sans">
        <section className="max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-black text-slate-900">Review not found</h1>
          <p className="mt-2 text-sm text-slate-600">The selected Management Review could not be found.</p>
          <button
            className="mt-6 rounded-xl bg-emerald-800 px-5 py-3 text-sm font-bold text-white"
            onClick={() => router.push('/qa-reports?tab=mr')}
          >
            Return to Management Review
          </button>
        </section>
      </main>
    );
  }

  const slide = slides[slideIndex];
  const currentPart =
    slide?.kind === 'agenda' ? agendaParts.find((part) => part.partNumber === slide.partNumber) : null;
  const outputCounts = currentOutputs.reduce<Record<string, number>>((counts, output) => {
    counts[output.status] = (counts[output.status] || 0) + 1;
    return counts;
  }, {});
  const previousOutputCounts = previousOutputs.reduce<Record<string, number>>((counts, output) => {
    counts[output.status] = (counts[output.status] || 0) + 1;
    return counts;
  }, {});
  const carCounts = reviewCars.reduce<Record<string, number>>((counts, car) => {
    counts[car.status] = (counts[car.status] || 0) + 1;
    return counts;
  }, {});
  const iqaCount = reviewCars.filter((car) => car.auditType !== 'EQA').length;
  const eqaCount = reviewCars.filter((car) => car.auditType === 'EQA').length;

  return (
    <main
      ref={presentationRef}
      className="flex min-h-screen flex-col bg-slate-50 font-sans text-slate-900"
      style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <button
          onClick={() => router.push('/qa-reports?tab=mr')}
          className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" /> Exit presentation
        </button>
        <div className="flex items-center gap-2">
          <span className="mr-2 text-sm font-bold tabular-nums text-slate-500">
            {slideIndex + 1} / {slides.length}
          </span>
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold hover:bg-slate-100"
            aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            {isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          </button>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-5 py-6 md:px-10 md:py-10">
        <div className="mb-6 flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-800">
          <Presentation className="h-4 w-4" /> RSU · Quality Assurance Office
        </div>

        {slide?.kind === 'overview' ? (
          <div className="flex flex-1 flex-col justify-center">
            <div className="mb-8 border-l-8 border-amber-400 pl-6">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-800">
                {review.year || toDate(review.startDate)?.getFullYear() || 'Management Review'}
                {review.academicYear ? ` · ${review.academicYear}` : ''}
              </p>
              <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-6xl">
                {review.title}
              </h1>
              {review.theme && <p className="mt-4 max-w-4xl text-lg text-slate-600">{review.theme}</p>}
              <p className="mt-5 text-base font-semibold text-slate-600">
                {formatDate(review.startDate)}
                {toDate(review.endDate)?.getTime() !== toDate(review.startDate)?.getTime()
                  ? ` – ${formatDate(review.endDate)}`
                  : ''}
                {' · '}
                {review.venue || 'Venue not specified'} · {review.modality || 'Modality not specified'}
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <CountCard
                label="Agenda inputs"
                value={agendaParts.length}
                detail={review.agendaParts?.length ? 'Configured for this review' : 'Standard Clause 9.3 template'}
              />
              <CountCard
                label="Attendees"
                value={review.attendees?.length || 0}
                detail={`${review.attendees?.filter((attendee) => attendee.status === 'Attended').length || 0} recorded as attended`}
              />
              <CountCard label="Review outputs" value={currentOutputs.length} detail="Decisions/actions logged" />
              <CountCard label="CARs" value={reviewCars.length} detail={`${iqaCount} IQA · ${eqaCount} EQA`} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-black text-slate-900">Decision and action status</h2>
                <StatusChart counts={outputCounts} />
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-black text-slate-900">Corrective action status</h2>
                <StatusChart counts={carCounts} />
              </div>
            </div>

            {review.attendees && review.attendees.length > 0 && (
              <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 text-lg font-black">
                  <Users className="h-5 w-5 text-emerald-800" /> Participants
                </h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {review.attendees.map((attendee) => (
                    <div key={attendee.id} className="rounded-xl bg-slate-50 px-4 py-3">
                      <p className="font-bold">{attendee.name}</p>
                      <p className="text-sm text-slate-500">{attendee.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : currentPart ? (
          <div className="flex flex-1 flex-col justify-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-800">
              Clause 9.3 input · Part {currentPart.partNumber}
            </p>
            <h1 className="mt-3 max-w-5xl text-4xl font-black leading-tight tracking-tight text-slate-950 md:text-5xl">
              {currentPart.title}
            </h1>
            <p className="mt-3 text-lg font-bold text-amber-700">{currentPart.clause}</p>
            <div className="mt-8 grid gap-5 lg:grid-cols-5">
              <article className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-[0.14em] text-slate-500">Review input</h2>
                  <p className="mt-2 text-xl leading-relaxed text-slate-800">
                    {currentPart.description || 'No input description has been recorded for this agenda item.'}
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Assigned presenter</p>
                    <p className="mt-2 font-bold">{currentPart.assignedReporters || 'Presenter not assigned'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-500">Preparation status</p>
                    <p className="mt-2 font-bold">{currentPart.status || 'Pending'}</p>
                  </div>
                </div>

                {currentPart.partNumber === 1 && (
                  <div className="border-t border-slate-200 pt-5">
                    <h2 className="mb-4 text-lg font-black">
                      {previousReview ? `Previous cycle · ${previousReview.title}` : 'Previous review actions'}
                    </h2>
                    {previousReview ? (
                      <>
                        <StatusChart counts={previousOutputCounts} />
                        <OutputsTable outputs={previousOutputs} />
                      </>
                    ) : (
                      <p className="text-sm text-slate-500">No earlier Management Review is recorded in the archive.</p>
                    )}
                  </div>
                )}

                {currentPart.partNumber === 6 && (
                  <div className="border-t border-slate-200 pt-5">
                    <h2 className="mb-4 text-lg font-black">Audit and corrective action snapshot</h2>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <CountCard label="IQA CARs" value={iqaCount} detail="In the review year" />
                      <CountCard label="EQA CARs" value={eqaCount} detail="In the review year" />
                      <CountCard
                        label="Audit reports"
                        value={reviewAuditReports.length}
                        detail="Available for this cycle"
                      />
                    </div>
                    <div className="mt-4">
                      <StatusChart counts={carCounts} />
                    </div>
                    <AuditReportsTable reports={reviewAuditReports} />
                  </div>
                )}

                {currentPart.partNumber === 10 && (
                  <div className="border-t border-slate-200 pt-5">
                    <h2 className="mb-4 text-lg font-black">Outputs from this Management Review</h2>
                    <StatusChart counts={outputCounts} />
                    <OutputsTable outputs={currentOutputs} />
                  </div>
                )}

                {![1, 6, 10].includes(currentPart.partNumber) && (
                  <p className="border-t border-slate-200 pt-5 text-sm text-slate-500">
                    This topic is presented from its assigned evidence repository. The system does not currently have
                    structured metrics configured for this input.
                  </p>
                )}
              </article>

              <aside className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
                <h2 className="flex items-center gap-2 text-lg font-black">
                  <FileText className="h-5 w-5 text-emerald-800" /> Evidence and session details
                </h2>
                {currentPart.driveFolderLink ? (
                  <EvidenceLink href={currentPart.driveFolderLink} label="Open agenda evidence folder" />
                ) : (
                  <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
                    No evidence folder is linked to this agenda item.
                  </p>
                )}
                {review.minutesLink && <EvidenceLink href={review.minutesLink} label="Open meeting minutes" />}
                {review.masterDriveLink && (
                  <EvidenceLink href={review.masterDriveLink} label="Open master repository" />
                )}
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-slate-500">Management Review</p>
                  <p className="mt-2 font-bold">{review.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <CalendarDays className="h-4 w-4" /> {formatDate(review.startDate)}
                  </p>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <div>
              <h1 className="text-2xl font-black">Agenda input unavailable</h1>
              <p className="mt-2 text-slate-600">The selected agenda input could not be loaded.</p>
            </div>
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-4 md:px-10">
        <p className="text-xs font-semibold text-slate-500">Use ← / → or Page Up / Page Down to navigate slides</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => goToSlide(slideIndex - 1)}
            disabled={slideIndex <= 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold disabled:opacity-40"
          >
            <ArrowLeft className="h-4 w-4" /> Previous
          </button>
          <button
            onClick={() => goToSlide(slideIndex + 1)}
            disabled={slideIndex >= slides.length - 1}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-40"
          >
            Next <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </main>
  );
}
