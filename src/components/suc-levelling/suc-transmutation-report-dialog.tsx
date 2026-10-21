'use client';

import React, { useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Printer, Download, GraduationCap, CheckCircle2, AlertTriangle, Building2, ShieldCheck } from 'lucide-react';
import type { SucKraScores, SucLevelThreshold, SucIndicatorSubmission, SucLevellingCycle } from '@/lib/types';
import { DEFAULT_SUC_INDICATORS, evaluateSucClassification, SUC_LEVEL_THRESHOLDS } from '@/lib/suc-levelling-engine';

interface SucTransmutationReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cycle: SucLevellingCycle | null;
  scores: SucKraScores;
  submissions?: SucIndicatorSubmission[];
}

export function SucTransmutationReportDialog({
  open,
  onOpenChange,
  cycle,
  scores,
  submissions = [],
}: SucTransmutationReportDialogProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const evaluation = evaluateSucClassification(scores);

  const handlePrint = () => {
    window.print();
  };

  // Group submissions by indicatorId
  const submissionMap = new Map<string, SucIndicatorSubmission>();
  submissions.forEach((s) => {
    submissionMap.set(s.indicatorId, s);
  });

  // Calculate indicator-level values based on scores or submissions
  const getIndicatorScore = (ind: (typeof DEFAULT_SUC_INDICATORS)[0]) => {
    const sub = submissionMap.get(ind.id);
    if (sub && sub.validationStatus === 'Verified') {
      return {
        claimed: sub.selfAwardedPoints || 0,
        validated: sub.validatedPoints !== undefined ? sub.validatedPoints : sub.selfAwardedPoints || 0,
        hasMov: (sub.movDriveLinks || []).length > 0,
      };
    }
    // Proportional breakdown from KRA baseline score
    const kraTotal =
      ind.kraId === 'KRA_1'
        ? scores.kra1
        : ind.kraId === 'KRA_2'
          ? scores.kra2
          : ind.kraId === 'KRA_3'
            ? scores.kra3
            : scores.kra4;
    const kraMax = ind.kraId === 'KRA_1' ? 35 : ind.kraId === 'KRA_2' ? 30 : ind.kraId === 'KRA_3' ? 20 : 15;
    const ratio = kraTotal / (kraMax || 1);
    const estimated = Math.round(ratio * ind.maxAllowablePoints * 10) / 10;
    return {
      claimed: estimated,
      validated: estimated,
      hasMov: true,
    };
  };

  const currentThreshold =
    SUC_LEVEL_THRESHOLDS.find((t) => t.level === evaluation.achievedLevel) || SUC_LEVEL_THRESHOLDS[1];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white text-slate-900">
        {/* Modal Action Bar (Hidden in Print) */}
        <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b print:hidden">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded bg-amber-500/20 text-amber-400">
              <GraduationCap className="h-5 w-5" />
            </span>
            <div>
              <DialogTitle className="text-base font-bold text-white">
                Official DBM-CHED Joint SUC Levelling Transmutation Scorecard
              </DialogTitle>
              <p className="text-xs text-slate-400">
                Institutional Executive Evaluation Matrix for Board of Regents (BOR) & DBM-CHED JREC Concurrence
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handlePrint} className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs">
              <Printer className="mr-1.5 h-4 w-4" />
              Print / Export PDF
            </Button>
          </div>
        </div>

        {/* Printable Scorecard Body */}
        <div ref={printRef} className="flex-1 overflow-y-auto p-8 space-y-6 print:p-0 print:m-0 print:overflow-visible">
          {/* Institutional Header */}
          <div className="text-center border-b pb-4 space-y-1">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
              Republic of the Philippines
            </div>
            <div className="text-lg font-black tracking-tight text-slate-900 uppercase">Romblon State University</div>
            <div className="text-xs text-slate-600">
              Main Campus, Odiongan, Romblon | Office of Quality Assurance & Strategic Institutional Planning
            </div>
            <div className="inline-block mt-2 px-3 py-1 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs font-black uppercase tracking-wider">
              JOINT DBM-CHED SUC LEVELLING TRANSMUTATION SCORECARD & EVALUATION MATRIX
            </div>
            <div className="text-[11px] text-slate-500 italic mt-0.5">
              Pursuant to DBM-CHED Joint Circular No. 1, s. 2022 (Normative Financing & Levelling Guidelines)
            </div>
          </div>

          {/* Assessment Cycle Metadata & Conferred Level */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs">
            <div>
              <div className="text-slate-500 font-bold uppercase text-[10px]">Institution</div>
              <div className="font-black text-slate-900 text-sm">Romblon State University</div>
              <div className="text-slate-500 text-[10px]">Region IV-B (MIMAROPA)</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold uppercase text-[10px]">Evaluation Horizon</div>
              <div className="font-black text-slate-900 text-sm">
                {cycle ? cycle.cycleName : 'AY 2024–2027 Multi-Year Period'}
              </div>
              <div className="text-slate-500 text-[10px]">Status: {cycle?.status || 'Validated Final'}</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold uppercase text-[10px]">Overall Validated Score</div>
              <div className="font-black text-amber-700 text-base">
                {evaluation.totalScore.toFixed(1)}{' '}
                <span className="text-xs font-normal text-slate-600">/ 100.0 pts</span>
              </div>
              <div className="text-[10px] text-slate-600">Transmuted Percentage</div>
            </div>
            <div>
              <div className="text-slate-500 font-bold uppercase text-[10px]">Conferred Classification</div>
              <div className="font-black text-emerald-800 text-base flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {evaluation.achievedLevel}
              </div>
              <div className="text-[10px] text-emerald-700 font-medium">{evaluation.title}</div>
            </div>
          </div>

          {/* Hard-Floor Rule Compliance Status Table */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-slate-700" />
                DBM-CHED Hard-Floor Rule Compliance Status ({evaluation.achievedLevel} Minimums)
              </h4>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  evaluation.isDemotedByFloor
                    ? 'bg-rose-50 text-rose-800 border-rose-300'
                    : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                }`}
              >
                {evaluation.isDemotedByFloor
                  ? 'Demoted to Lower Level by Hard-Floor Rule'
                  : 'All 4 KRA Floor Minimums Satisfied'}
              </span>
            </div>

            <table className="w-full text-xs border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                  <th className="p-2 text-left font-bold border-r border-slate-300">Key Result Area (KRA)</th>
                  <th className="p-2 text-center font-bold border-r border-slate-300 w-24">Max Ceiling</th>
                  <th className="p-2 text-center font-bold border-r border-slate-300 w-28">
                    Floor Min ({evaluation.achievedLevel})
                  </th>
                  <th className="p-2 text-center font-bold border-r border-slate-300 w-28">Earned Score</th>
                  <th className="p-2 text-center font-bold w-28">Floor Compliance</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium border-r border-slate-200">
                    KRA 1: Higher and Advanced Education (Instruction & Quality)
                  </td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">35.0</td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">
                    {currentThreshold.minKra1.toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-mono font-bold border-r border-slate-200 text-blue-700">
                    {scores.kra1.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-bold">
                    {scores.kra1 >= currentThreshold.minKra1 ? (
                      <span className="text-emerald-700">COMPLIANT</span>
                    ) : (
                      <span className="text-rose-700">
                        DEFICIT (-{(currentThreshold.minKra1 - scores.kra1).toFixed(1)})
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium border-r border-slate-200">
                    KRA 2: Research Capability, IP and Community Extension
                  </td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">30.0</td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">
                    {currentThreshold.minKra2.toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-mono font-bold border-r border-slate-200 text-purple-700">
                    {scores.kra2.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-bold">
                    {scores.kra2 >= currentThreshold.minKra2 ? (
                      <span className="text-emerald-700">COMPLIANT</span>
                    ) : (
                      <span className="text-rose-700">
                        DEFICIT (-{(currentThreshold.minKra2 - scores.kra2).toFixed(1)})
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium border-r border-slate-200">
                    KRA 3: Management of Resources, BUR & Smart Infrastructure
                  </td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">20.0</td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">
                    {currentThreshold.minKra3.toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-mono font-bold border-r border-slate-200 text-emerald-700">
                    {scores.kra3.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-bold">
                    {scores.kra3 >= currentThreshold.minKra3 ? (
                      <span className="text-emerald-700">COMPLIANT</span>
                    ) : (
                      <span className="text-rose-700">
                        DEFICIT (-{(currentThreshold.minKra3 - scores.kra3).toFixed(1)})
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="border-b border-slate-200">
                  <td className="p-2 font-medium border-r border-slate-200">
                    KRA 4: Good Governance, ISO 21001 & Decision Intelligence
                  </td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">15.0</td>
                  <td className="p-2 text-center font-mono border-r border-slate-200">
                    {currentThreshold.minKra4.toFixed(2)}
                  </td>
                  <td className="p-2 text-center font-mono font-bold border-r border-slate-200 text-amber-700">
                    {scores.kra4.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-bold">
                    {scores.kra4 >= currentThreshold.minKra4 ? (
                      <span className="text-emerald-700">COMPLIANT</span>
                    ) : (
                      <span className="text-rose-700">
                        DEFICIT (-{(currentThreshold.minKra4 - scores.kra4).toFixed(1)})
                      </span>
                    )}
                  </td>
                </tr>
                <tr className="bg-slate-100 font-bold">
                  <td className="p-2 border-r border-slate-300">TOTAL TRANSMUTED INSTITUTIONAL POINTS</td>
                  <td className="p-2 text-center font-mono border-r border-slate-300">100.0</td>
                  <td className="p-2 text-center font-mono border-r border-slate-300">
                    {currentThreshold.minTotal.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-mono text-amber-800 text-sm border-r border-slate-300">
                    {evaluation.totalScore.toFixed(1)}
                  </td>
                  <td className="p-2 text-center font-bold text-emerald-800">CONFERRED {evaluation.achievedLevel}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Indicator-by-Indicator Breakdown Matrix */}
          <div className="space-y-1.5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
              Detailed Indicator Breakdown & Means of Verification (MOV) Matrix
            </h4>
            <table className="w-full text-[11px] border border-slate-300 border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                  <th className="p-1.5 text-center font-bold border-r border-slate-300 w-12">Code</th>
                  <th className="p-1.5 text-left font-bold border-r border-slate-300">
                    Performance Indicator Specification
                  </th>
                  <th className="p-1.5 text-center font-bold border-r border-slate-300 w-16">Ceiling</th>
                  <th className="p-1.5 text-center font-bold border-r border-slate-300 w-16">Self Pts</th>
                  <th className="p-1.5 text-center font-bold border-r border-slate-300 w-16">Validated</th>
                  <th className="p-1.5 text-left font-bold">Primary Means of Verification (MOV)</th>
                </tr>
              </thead>
              <tbody>
                {DEFAULT_SUC_INDICATORS.map((ind, idx) => {
                  const scoreInfo = getIndicatorScore(ind);
                  return (
                    <tr key={ind.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                      <td className="p-1.5 text-center font-mono font-bold border-r border-slate-200">{ind.code}</td>
                      <td className="p-1.5 border-r border-slate-200">
                        <div className="font-bold text-slate-900">{ind.title}</div>
                        <div className="text-[10px] text-slate-500 line-clamp-1">{ind.description}</div>
                      </td>
                      <td className="p-1.5 text-center font-mono border-r border-slate-200">
                        {ind.maxAllowablePoints.toFixed(1)}
                      </td>
                      <td className="p-1.5 text-center font-mono text-slate-700 border-r border-slate-200">
                        {scoreInfo.claimed.toFixed(1)}
                      </td>
                      <td className="p-1.5 text-center font-mono font-bold text-amber-700 border-r border-slate-200">
                        {scoreInfo.validated.toFixed(1)}
                      </td>
                      <td className="p-1.5 text-[10px] text-slate-600">{ind.movDescription}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Strategic Decision Support Plan for Top Management */}
          <div className="p-4 rounded-lg bg-amber-50/60 border border-amber-200 space-y-2 text-xs">
            <h4 className="font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
              <GraduationCap className="h-4 w-4 text-amber-700" />
              Strategic Next-Level Roadmap for President & Board of Regents
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-800">
              {evaluation.executiveActionPlan.map((action, i) => (
                <div key={i} className="flex items-start gap-1.5 bg-white p-2 rounded border border-amber-200/60">
                  <span className="font-black text-amber-700">0{i + 1}.</span>
                  <span className="text-[11px] leading-relaxed">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Official Signatories Block */}
          <div className="pt-6 border-t border-slate-300">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-6 text-center">
              Institutional Signatories & DBM-CHED Regional Evaluation Panel
            </div>

            <div className="grid grid-cols-3 gap-8 text-center text-xs">
              <div className="space-y-1">
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900 uppercase">
                  DR. MARIO A. FETALVER, JR.
                </div>
                <div className="text-[10px] text-slate-600 font-medium">
                  Director, Quality Assurance & Accreditation
                </div>
                <div className="text-[9px] text-slate-400 italic">Chair, Institutional SUC Levelling Task Force</div>
              </div>

              <div className="space-y-1">
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900 uppercase">
                  DR. ELVIN F. GAAC
                </div>
                <div className="text-[10px] text-slate-600 font-medium">Vice President for Academic Affairs</div>
                <div className="text-[9px] text-slate-400 italic">Lead Executive Officer, KRA 1 & Instruction</div>
              </div>

              <div className="space-y-1">
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900 uppercase">
                  DR. EDDIE G. FETALVERO
                </div>
                <div className="text-[10px] text-slate-600 font-medium">Vice President for Research & Extension</div>
                <div className="text-[9px] text-slate-400 italic">Lead Executive Officer, KRA 2 & Innovation</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-12 text-center text-xs mt-8">
              <div className="space-y-1 max-w-xs mx-auto">
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900 uppercase">
                  DR. MERIAN C. CATAJAY-MANI
                </div>
                <div className="text-[10px] text-slate-600 font-medium">University President</div>
                <div className="text-[9px] text-slate-400 italic">Romblon State University</div>
              </div>

              <div className="space-y-1 max-w-xs mx-auto">
                <div className="border-b border-slate-400 pb-1 font-bold text-slate-900 uppercase">
                  REGIONAL EVALUATION COMMITTEE
                </div>
                <div className="text-[10px] text-slate-600 font-medium">DBM-CHED Joint SUC Levelling Panel</div>
                <div className="text-[9px] text-slate-400 italic">Region IV-B (MIMAROPA)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer (Hidden in Print) */}
        <DialogFooter className="p-4 border-t bg-slate-50 print:hidden flex justify-between items-center">
          <div className="text-xs text-slate-500">Form Version: DBM-CHED-SUC-LEV-2024.1 | Romblon State University</div>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs font-bold">
            Close Scorecard
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
