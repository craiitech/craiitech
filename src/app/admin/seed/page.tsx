'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@/firebase';
import { collection, addDoc, Timestamp, getDocs, limit } from 'firebase/firestore';

const KPI_DEFINITIONS = [
  {
    name: 'Submission Completion Rate',
    description: 'Percentage of units that have submitted all required reports for the cycle.',
    category: 'eoms_compliance',
    formula: 'submission_completion_rate',
    dataSource: 'submission_completion_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Submission On-Time Rate',
    description: 'Percentage of submissions completed before the cycle deadline.',
    category: 'eoms_compliance',
    formula: 'submission_on_time_rate',
    dataSource: 'submission_on_time_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Submission Approval Rate',
    description: 'Percentage of submissions that have been approved.',
    category: 'eoms_compliance',
    formula: 'submission_approval_rate',
    dataSource: 'submission_approval_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 75, poor: 50, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Closure Rate',
    description: 'Percentage of identified risks that have been closed.',
    category: 'risk_management',
    formula: 'risk_closure_rate',
    dataSource: 'risk_closure_rate',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'High Risk Percentage',
    description: 'Percentage of risks rated as high or critical. Lower is better.',
    category: 'risk_management',
    formula: 'high_risk_percentage',
    dataSource: 'high_risk_percentage',
    unit: '%',
    thresholds: { good: 10, satisfactory: 20, poor: 35, direction: 'lower_is_better' },
    defaultTarget: 10,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Overdue Ratio',
    description: 'Percentage of open risks past their target closure date. Lower is better.',
    category: 'risk_management',
    formula: 'risk_overdue_ratio',
    dataSource: 'risk_overdue_ratio',
    unit: '%',
    thresholds: { good: 10, satisfactory: 20, poor: 35, direction: 'lower_is_better' },
    defaultTarget: 10,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Risk Treatment Effectiveness',
    description: 'Percentage of risk treatments that successfully reduced risk magnitude.',
    category: 'risk_management',
    formula: 'risk_treatment_effectiveness',
    dataSource: 'risk_treatment_effectiveness',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'CAR Closure Rate',
    description: 'Percentage of Corrective Action Requests that have been closed.',
    category: 'audit_car',
    formula: 'car_closure_rate',
    dataSource: 'car_closure_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 70, poor: 45, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'Audit Completion Rate',
    description: 'Percentage of scheduled audits that have been completed with a closing meeting.',
    category: 'audit_car',
    formula: 'audit_completion_rate',
    dataSource: 'audit_completion_rate',
    unit: '%',
    thresholds: { good: 90, satisfactory: 70, poor: 45, direction: 'higher_is_better' },
    defaultTarget: 90,
    weight: 1,
    isActive: true,
  },
  {
    name: 'CSM Client Satisfaction Score',
    description: 'Average client satisfaction score from CSM surveys, converted to percentage.',
    category: 'csm_service_quality',
    formula: 'csm_satisfaction_score',
    dataSource: 'csm_satisfaction_score',
    unit: '%',
    thresholds: { good: 85, satisfactory: 65, poor: 40, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
  {
    name: 'GAD Budget Utilization',
    description: 'Percentage of allocated GAD budget that has been utilized.',
    category: 'gad',
    formula: 'gad_budget_utilization',
    dataSource: 'gad_budget_utilization',
    unit: '%',
    thresholds: { good: 85, satisfactory: 60, poor: 35, direction: 'higher_is_better' },
    defaultTarget: 85,
    weight: 1,
    isActive: true,
  },
];

export default function SeedKpiDefinitionsPage() {
  const { user, userProfile, isAdmin, firestore, isUserLoading } = useUser();
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const seed = useCallback(async () => {
    if (!firestore || !isAdmin) return;
    setStatus('loading');
    setMessage('Checking for existing KPI definitions...');
    try {
      const col = collection(firestore, 'kpiDefinitions');
      const existing = await getDocs(col);
      if (!existing.empty) {
        setStatus('done');
        setMessage(`Already seeded (${existing.size} KPI definitions exist).`);
        return;
      }
      let count = 0;
      const now = Timestamp.now();
      for (const kpi of KPI_DEFINITIONS) {
        await addDoc(col, { ...kpi, createdAt: now, updatedAt: now });
        count++;
      }
      setStatus('done');
      setMessage(`Seeded ${count} KPI definitions successfully.`);
    } catch (err: any) {
      setStatus('error');
      setMessage(`Error: ${err.message}`);
    }
  }, [firestore, isAdmin]);

  if (isUserLoading) return <div className="p-8 text-sm">Loading user...</div>;
  if (!user) return <div className="p-8 text-sm">You must be logged in to access this page.</div>;
  if (!isAdmin) return <div className="p-8 text-sm">Admin access required.</div>;

  return (
    <div className="p-8 max-w-md mx-auto mt-12">
      <h1 className="text-lg font-bold mb-2">Seed KPI Definitions</h1>
      <p className="text-xs text-muted-foreground mb-6">
        Creates 11 baseline KPI definitions in Firestore. Idempotent — safe to re-run.
      </p>
      {status === 'idle' && (
        <button onClick={seed} className="px-4 py-2 bg-primary text-white text-sm font-bold rounded-lg">
          Seed KPI Definitions
        </button>
      )}
      {status === 'loading' && <p className="text-sm text-muted-foreground">{message}</p>}
      {status === 'done' && <p className="text-sm text-emerald-600 font-bold">{message}</p>}
      {status === 'error' && <p className="text-sm text-red-600">{message}</p>}
    </div>
  );
}
