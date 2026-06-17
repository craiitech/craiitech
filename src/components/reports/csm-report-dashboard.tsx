'use client';

import { useMemo, useState } from 'react';
import type { Campus, Unit, User as AppUser, Cycle, CsmDeployment } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LabelList,
  Radar, 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis,
  Legend,
  ComposedChart,
  Line
} from 'recharts';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Printer, 
  FileText, 
  Info, 
  ThumbsUp, 
  HelpCircle,
  Building2,
  Calendar,
  Smile,
  ShieldCheck,
  Percent,
  XCircle,
  Loader2,
  Radio,
  Download,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp, collection } from '@/firebase/firestore-wrapper';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const maskName = (name: string) => {
  if (!name) return 'Anonymous';
  const parts = name.trim().split(/\s+/);
  return parts.map(part => {
    if (part.length <= 1) return part;
    if (part.length === 2) return part.charAt(0) + '*';
    return part.charAt(0) + '*'.repeat(part.length - 2) + part.charAt(part.length - 1);
  }).join(' ');
};

// FY 2025 Baseline Report Constants
const BASELINE_2025 = {
  overallSatisfactionRate: 92,
  participationRate: 92,
  cc1AwarePercent: 75,
  cc2VisibilityPercent: 95,
  cc3HelpfulnessPercent: 100,
  totalResponses: 1000,
  totalVisitors: 1086,
  demographics: {
    sex: [
      { name: 'Female', value: 540, fill: 'hsl(var(--chart-2))' },
      { name: 'Male', value: 400, fill: 'hsl(var(--chart-1))' },
      { name: 'LGBTQ+', value: 40, fill: 'hsl(var(--chart-3))' },
      { name: 'Did not specify', value: 20, fill: 'hsl(var(--chart-4))' },
    ],
    customerType: [
      { name: 'Student', value: 750, fill: 'hsl(var(--chart-2))' },
      { name: 'Government Employees', value: 40, fill: 'hsl(var(--chart-1))' },
      { name: 'Business', value: 0, fill: 'hsl(var(--chart-3))' },
      { name: 'Other Stakeholders', value: 50, fill: 'hsl(var(--chart-4))' },
      { name: 'No Response', value: 160, fill: 'hsl(var(--chart-5))' },
    ],
    stakeholders: [
      { name: 'Internal Stakeholders', value: 750, fill: '#1b6535' },
      { name: 'External Stakeholders', value: 250, fill: '#fb923c' }
    ],
    age: [
      { name: '19 or lower', value: 250 },
      { name: '20-34', value: 450 },
      { name: '35-49', value: 150 },
      { name: '50-64', value: 120 },
      { name: '65 or higher', value: 30 },
    ],
    campus: [
      { name: 'Main Campus', value: 620 },
      { name: 'San Andres', value: 80 },
      { name: 'Calatrava', value: 50 },
      { name: 'San Agustin', value: 60 },
      { name: 'Sta. Maria', value: 40 },
      { name: 'Sta. Fe', value: 30 },
      { name: 'Romblon', value: 50 },
      { name: 'Cajidiocan', value: 30 },
      { name: 'San Fernando', value: 30 },
      { name: 'Agpudlos', value: 10 },
    ],
  },
  ccResults: {
    cc1: [0, 550, 120, 80, 250], // counts for option 1 to 4
    cc2: [0, 750, 200, 30, 20, 0], // counts for option 1 to 5
    cc3: [0, 850, 150, 0, 0], // counts for option 1 to 4
  },
  sqd: [
    { id: 1, name: "SQD1. Responsiveness", key: "sqd1", desc: "Spent reasonable amount of time", avg: 4.40, positivePercent: 88, counts: [0, 10, 30, 80, 130, 750] },
    { id: 2, name: "SQD2. Reliability", key: "sqd2", desc: "Followed charter steps/requirements", avg: 4.50, positivePercent: 90, counts: [0, 15, 25, 60, 120, 780] },
    { id: 3, name: "SQD3. Access & Facilities", key: "sqd3", desc: "Clean, comfortable, and accessible office", avg: 4.35, positivePercent: 87, counts: [0, 20, 40, 70, 150, 720] },
    { id: 4, name: "SQD4. Communication", key: "sqd4", desc: "Clear guidelines and friendly explanations", avg: 4.70, positivePercent: 94, counts: [0, 5, 15, 40, 120, 820] },
    { id: 5, name: "SQD5. Costs", key: "sqd5", desc: "Fees paid were just and reasonable", avg: 4.55, positivePercent: 91, counts: [0, 10, 20, 60, 120, 790] },
    { id: 6, name: "SQD6. Integrity", key: "sqd6", desc: "Free from corruption and under-the-table actions", avg: 4.90, positivePercent: 98, counts: [0, 2, 3, 15, 60, 920] },
    { id: 7, name: "SQD7. Assurance", key: "sqd7", desc: "Felt safe, staff was professional and courteous", avg: 4.75, positivePercent: 95, counts: [0, 5, 10, 35, 80, 870] },
    { id: 8, name: "SQD8. Outcome", key: "sqd8", desc: "Office delivered the requested service/result", avg: 4.65, positivePercent: 93, counts: [0, 7, 18, 45, 100, 830] },
  ],
  services: [
    { name: "Issuance of Service Record", campus: "Main Campus", count: 120, satisfactionRate: 96, avgRating: 4.80 },
    { name: "Filing of Leave of Absence of Students", campus: "Main Campus", count: 80, satisfactionRate: 50, avgRating: 2.50 },
    { name: "Cross Enrollees", campus: "Cajidiocan", count: 15, satisfactionRate: 47, avgRating: 2.35 },
    { name: "Issuance of Transcript of Records", campus: "Main Campus", count: 350, satisfactionRate: 94, avgRating: 4.70 },
    { name: "Re-admission of Returning Students", campus: "San Andres", count: 45, satisfactionRate: 92, avgRating: 4.60 },
    { name: "Enrollment Verification", campus: "Calatrava", count: 60, satisfactionRate: 97, avgRating: 4.85 },
    { name: "Issuance of Certificate of Grades", campus: "San Agustin", count: 110, satisfactionRate: 91, avgRating: 4.55 },
    { name: "Processing of Student Clearance", campus: "Romblon", count: 250, satisfactionRate: 93, avgRating: 4.65 },
    { name: "Scholarship Application Processing", campus: "Main Campus", count: 180, satisfactionRate: 88, avgRating: 4.40 },
    { name: "Evaluation of Student Records", campus: "Sta. Fe", count: 35, satisfactionRate: 94, avgRating: 4.70 },
    { name: "Issuance of Certificate of Honorable Dismissal", campus: "Sta. Maria", count: 25, satisfactionRate: 96, avgRating: 4.80 },
    { name: "Processing of Graduation Application", campus: "San Fernando", count: 40, satisfactionRate: 95, avgRating: 4.75 },
    { name: "Issuance of Student ID Card", campus: "Agpudlos", count: 50, satisfactionRate: 98, avgRating: 4.90 },
  ],
  qualitativeComments: [
    { visitorName: "Juan Dela Cruz", comments: "Mabagal ang release ng TOR", category: "Responsiveness (SQD1)", campus: "Main Campus", type: "Student" },
    { visitorName: "Maria Santos", comments: "Sobrang init po", category: "Access & Facilities (SQD3)", campus: "Main Campus", type: "Student" },
    { visitorName: "Jose Rizal", comments: "Wait time for clearance processing is too long", category: "Responsiveness (SQD1)", campus: "Romblon", type: "Student" },
    { visitorName: "Andres Bonifacio", comments: "No ventilation in the waiting lobby", category: "Access & Facilities (SQD3)", campus: "Cajidiocan", type: "Student" },
    { visitorName: "Apolinario Mabini", comments: "Lack of directional signs inside the building", category: "Communication (SQD4)", campus: "San Fernando", type: "Student" },
    { visitorName: "Emilio Aguinaldo", comments: "Convenience fee for online payments is too high", category: "Costs (SQD5)", campus: "Main Campus", type: "Government Employees" },
    { visitorName: "Gabriela Silang", comments: "Accommodating and very polite frontline staff", category: "Assurance (SQD7)", campus: "San Agustin", type: "Other Stakeholders" },
    { visitorName: "Melchora Aquino", comments: "Got my service record in less than 30 minutes, thank you!", category: "Outcome (SQD8)", campus: "Main Campus", type: "Government Employees" },
  ],
  pareto: [
    { theme: "Responsiveness (SQD1)", count: 42, cumulativePercent: 38 },
    { theme: "Access & Facilities (SQD3)", count: 28, cumulativePercent: 64 },
    { theme: "Reliability (SQD2)", count: 15, cumulativePercent: 77 },
    { theme: "Communication (SQD4)", count: 10, cumulativePercent: 86 },
    { theme: "Assurance (SQD7)", count: 8, cumulativePercent: 94 },
    { theme: "Costs (SQD5)", count: 5, cumulativePercent: 98 },
    { theme: "Outcome (SQD8)", count: 3, cumulativePercent: 100 },
    { theme: "Integrity (SQD6)", count: 0, cumulativePercent: 100 },
  ]
};

interface CsmReportDashboardProps {
  csmResponses: any[];
  visitorLogs: any[];
  campuses: Campus[];
  units: Unit[];
  selectedYear: number;
  selectedCampusId: string | null;
  userProfile: AppUser | null;
  isAdmin: boolean;
  isCsmManager: boolean;
  csmDeployments: CsmDeployment[];
  cycles: Cycle[];
}

export function CsmReportDashboard({
  csmResponses,
  visitorLogs,
  campuses,
  units,
  selectedYear,
  selectedCampusId,
  userProfile,
  isAdmin,
  isCsmManager,
  csmDeployments,
  cycles,
}: CsmReportDashboardProps) {

  const hasAccessToAll = isAdmin || isCsmManager;

  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [localCampusId, setLocalCampusId] = useState<string>(selectedCampusId || 'all');
  const [dataSource, setDataSource] = useState<'live' | 'baseline25'>('live');
  const [unitSearchQuery, setUnitSearchQuery] = useState('');
  const [commentSearch, setCommentSearch] = useState('');

  useMemo(() => {
    if (selectedCampusId) {
      setLocalCampusId(selectedCampusId);
    }
  }, [selectedCampusId]);

  // Pre-fill and restrict selectors for unit coordinators/supervisors
  useMemo(() => {
    if (!hasAccessToAll && userProfile) {
      if (userProfile.campusId) {
        setLocalCampusId(userProfile.campusId);
      }
      if (userProfile.unitId) {
        setSelectedUnitId(userProfile.unitId);
      }
    }
  }, [hasAccessToAll, userProfile]);

  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const [deployingCycleIds, setDeployingCycleIds] = useState<Record<string, boolean>>({});
  const [serviceSearch, setServiceSearch] = useState('');
  const [servicePage, setServicePage] = useState(0);
  const servicePageSize = 5;

  const firestore = useFirestore();
  const { toast } = useToast();

  const deploymentsMap = useMemo(() => {
    const dMap = new Map<string, boolean>();
    csmDeployments?.forEach(d => {
      dMap.set(d.id, d.isPublished);
    });
    return dMap;
  }, [csmDeployments]);

  // Handle deployments publish toggles
  const handleTogglePublishCycle = async (cycle: Cycle, isCurrentlyPublished: boolean) => {
    if (!firestore || !userProfile) return;
    const dId = `${cycle.year}-${cycle.name}`;
    setDeployingCycleIds(prev => ({ ...prev, [dId]: true }));
    try {
      const docRef = doc(firestore, 'csmDeployments', dId);
      const existing = csmDeployments.find(d => d.id === dId);
      
      await setDoc(docRef, {
        id: dId,
        academicYear: Number(cycle.year),
        cycleId: cycle.name,
        isPublished: !isCurrentlyPublished,
        publishedUnitIds: existing?.publishedUnitIds || [],
        deployedAt: serverTimestamp(),
        deployedBy: userProfile.id,
      }, { merge: true });

      toast({
        title: !isCurrentlyPublished ? 'CSM Report Deployed' : 'CSM Report Recalled',
        description: !isCurrentlyPublished 
          ? `The CSM report for AY ${cycle.year} ${cycle.name} cycle has been successfully deployed.`
          : `The CSM report for AY ${cycle.year} ${cycle.name} cycle has been recalled and is now hidden.`,
      });
    } catch (error) {
      console.error('Error toggling CSM cycle deployment:', error);
      toast({
        title: 'Action Failed',
        description: 'Could not update the deployment state.',
        variant: 'destructive',
      });
    } finally {
      setDeployingCycleIds(prev => ({ ...prev, [dId]: false }));
    }
  };

  // Filter units based on selected campus and search query
  const dropdownUnits = useMemo(() => {
    if (!units) return [];
    let list = units;
    if (localCampusId && localCampusId !== 'all') {
      list = list.filter(u => u.campusIds?.includes(localCampusId));
    }
    if (unitSearchQuery.trim()) {
      const q = unitSearchQuery.toLowerCase();
      list = list.filter(u => u.name.toLowerCase().includes(q));
    }
    return list.sort((a,b) => a.name.localeCompare(b.name));
  }, [units, localCampusId, unitSearchQuery]);

  // Reset selected unit if campus changes and it's no longer in the list of units belonging to that campus
  useMemo(() => {
    if (selectedUnitId !== 'all') {
      const selectedUnit = units?.find(u => u.id === selectedUnitId);
      if (selectedUnit && localCampusId && localCampusId !== 'all') {
        const belongsToCampus = selectedUnit.campusIds?.includes(localCampusId);
        if (!belongsToCampus) {
          setSelectedUnitId('all');
        }
      }
    }
  }, [localCampusId, selectedUnitId, units]);


  // Check if the selected unit's report is approved/deployed for the selected year
  const isUnitApproved = useMemo(() => {
    if (selectedUnitId === 'all') return false;
    return csmDeployments?.some(d => 
      d.academicYear === selectedYear && 
      d.isPublished && 
      d.publishedUnitIds?.includes(selectedUnitId)
    ) || false;
  }, [csmDeployments, selectedYear, selectedUnitId]);

  const handleToggleUnitApproval = async () => {
    if (!firestore || !userProfile || selectedUnitId === 'all') return;
    setIsUpdatingApproval(true);
    try {
      const yearDeployments = csmDeployments.filter(d => d.academicYear === selectedYear);
      const targetDocIds: string[] = [];
      if (yearDeployments.length > 0) {
        yearDeployments.forEach(d => targetDocIds.push(d.id));
      } else {
        targetDocIds.push(`${selectedYear}-first`, `${selectedYear}-final`);
      }

      for (const docId of targetDocIds) {
        const docRef = doc(firestore, 'csmDeployments', docId);
        const existing = csmDeployments.find(d => d.id === docId);
        const currentList = existing?.publishedUnitIds || [];
        
        let newList: string[];
        if (isUnitApproved) {
          newList = currentList.filter(id => id !== selectedUnitId);
        } else {
          newList = [...new Set([...currentList, selectedUnitId])];
        }

        await setDoc(docRef, {
          id: docId,
          academicYear: selectedYear,
          cycleId: docId.endsWith('-final') ? 'final' : 'first',
          isPublished: existing ? existing.isPublished : true,
          publishedUnitIds: newList,
          deployedAt: serverTimestamp(),
          deployedBy: userProfile.id,
        }, { merge: true });
      }

      const unitName = units.find(u => u.id === selectedUnitId)?.name || 'Unit';
      toast({
        title: isUnitApproved ? 'Approval Recalled' : 'Report Approved & Deployed',
        description: isUnitApproved 
          ? `CSM Reports for ${unitName} are now hidden from their coordinators.`
          : `CSM Reports for ${unitName} have been approved and published for their viewing.`,
      });
    } catch (error) {
      console.error('Error toggling unit approval:', error);
      toast({
        title: 'Action Failed',
        description: 'Could not update the unit approval state.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingApproval(false);
    }
  };

  // Filter dynamic responses from DB
  const filteredResponses = useMemo(() => {
    if (!csmResponses) return [];
    return csmResponses.filter(res => {
      const date = res.createdAt?.toDate ? res.createdAt.toDate() : new Date(res.createdAt);
      const resYear = date.getFullYear();
      
      const matchesYear = resYear === selectedYear;
      const matchesCampus = !localCampusId || localCampusId === 'all' || res.campusId === localCampusId;
      
      const matchesUnit = hasAccessToAll
        ? (selectedUnitId === 'all' ? true : res.unitId === selectedUnitId)
        : res.unitId === userProfile?.unitId;
      
      return matchesYear && matchesCampus && matchesUnit;
    });
  }, [csmResponses, selectedYear, localCampusId, hasAccessToAll, selectedUnitId, userProfile]);

  const filteredVisitorLogs = useMemo(() => {
    if (!visitorLogs) return [];
    return visitorLogs.filter(log => {
      const date = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      const logYear = date.getFullYear();
      
      const matchesYear = logYear === selectedYear;
      const matchesCampus = !localCampusId || localCampusId === 'all' || log.campusId === localCampusId;
      
      const matchesUnit = hasAccessToAll
        ? (selectedUnitId === 'all' ? true : log.unitId === selectedUnitId)
        : log.unitId === userProfile?.unitId;
      
      return matchesYear && matchesCampus && matchesUnit;
    });
  }, [visitorLogs, selectedYear, localCampusId, hasAccessToAll, selectedUnitId, userProfile]);

  // Unified stats calculator based on selected source (live vs baseline)
  const activeCampusName = useMemo(() => {
    if (!localCampusId || localCampusId === 'all') return 'all';
    return campuses.find(c => c.id === localCampusId)?.name || 'all';
  }, [localCampusId, campuses]);

  const selectedUnitName = useMemo(() => {
    if (selectedUnitId === 'all') return 'all';
    return units?.find(u => u.id === selectedUnitId)?.name || 'all';
  }, [selectedUnitId, units]);

  const displayStats = useMemo(() => {
    if (dataSource === 'baseline25') {
      const isFiltered = activeCampusName !== 'all';
      
      // If a specific campus is filtered, scale down baseline values logically
      let totalResponses = BASELINE_2025.totalResponses;
      let totalVisitors = BASELINE_2025.totalVisitors;
      let services = BASELINE_2025.services;
      let comments = BASELINE_2025.qualitativeComments;

      if (isFiltered) {
        const campusInfo = BASELINE_2025.demographics.campus.find(c => c.name.toLowerCase().includes(activeCampusName.toLowerCase()));
        const ratio = campusInfo ? campusInfo.value / 1000 : 0.1;
        totalResponses = Math.round(BASELINE_2025.totalResponses * ratio);
        totalVisitors = Math.round(BASELINE_2025.totalVisitors * ratio);
        services = BASELINE_2025.services.filter(s => s.campus.toLowerCase().includes(activeCampusName.toLowerCase()));
        comments = BASELINE_2025.qualitativeComments.filter(s => s.campus.toLowerCase().includes(activeCampusName.toLowerCase()));
      }

      // Simulate filtering by selected unit in baseline mode
      if (selectedUnitId !== 'all') {
        const uName = selectedUnitName.toLowerCase();
        if (uName.includes('registrar') || uName.includes('admission') || uName.includes('records')) {
          services = services.filter(s => 
            s.name.includes('Leave of Absence') || 
            s.name.includes('Enrollees') || 
            s.name.includes('Transcript') || 
            s.name.includes('Re-admission') || 
            s.name.includes('Verification') || 
            s.name.includes('Grades') || 
            s.name.includes('Clearance') || 
            s.name.includes('Evaluation') || 
            s.name.includes('Dismissal') || 
            s.name.includes('Graduation')
          );
        } else if (uName.includes('hr') || uName.includes('human resource') || uName.includes('admin') || uName.includes('personnel')) {
          services = services.filter(s => s.name.includes('Service Record'));
        } else if (uName.includes('student affairs') || uName.includes('osa') || uName.includes('scholarship') || uName.includes('kiosk')) {
          services = services.filter(s => s.name.includes('Scholarship') || s.name.includes('ID Card'));
        } else {
          const charCodeSum = uName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
          services = services.filter((_, idx) => (idx + charCodeSum) % 3 === 0);
        }

        totalResponses = services.reduce((sum, s) => sum + s.count, 0) || 15;
        totalVisitors = Math.round(totalResponses * 1.15);

        comments = comments.filter(c => {
          if (uName.includes('registrar') && (c.category.includes('Responsiveness') || c.category.includes('Reliability'))) return true;
          if (uName.includes('hr') && c.visitorName.includes('Melchora')) return true;
          return false;
        });
        if (comments.length === 0 && services.length > 0) {
          comments = BASELINE_2025.qualitativeComments.slice(0, 2);
        }
      }

      // Demographic distribution for charts
      const sexData = BASELINE_2025.demographics.sex.map(s => ({
        ...s,
        value: Math.round(s.value * (totalResponses / BASELINE_2025.totalResponses))
      })).filter(x => x.value > 0);

      const clientTypeData = BASELINE_2025.demographics.customerType.map(c => ({
        ...c,
        value: Math.round(c.value * (totalResponses / BASELINE_2025.totalResponses))
      })).filter(x => x.value > 0);

      const internalCount = clientTypeData
        .filter(c => c.name === 'Student' || c.name === 'Internal Employees')
        .reduce((sum, item) => sum + item.value, 0);

      const externalCount = clientTypeData
        .filter(c => c.name !== 'Student' && c.name !== 'Internal Employees')
        .reduce((sum, item) => sum + item.value, 0);

      const stakeholderData = [
        { name: 'Internal Stakeholders', value: internalCount, fill: '#1b6535' },
        { name: 'External Stakeholders', value: externalCount, fill: '#fb923c' }
      ].filter(x => x.value > 0);

      const ageData = BASELINE_2025.demographics.age.map(a => ({
        ...a,
        value: Math.round(a.value * (totalResponses / BASELINE_2025.totalResponses))
      }));

      const campusData = BASELINE_2025.demographics.campus;

      // Citizen's charter percentages
      const cc1 = BASELINE_2025.ccResults.cc1.map(v => Math.round(v * (totalResponses / BASELINE_2025.totalResponses)));
      const cc2 = BASELINE_2025.ccResults.cc2.map(v => Math.round(v * (totalResponses / BASELINE_2025.totalResponses)));
      const cc3 = BASELINE_2025.ccResults.cc3.map(v => Math.round(v * (totalResponses / BASELINE_2025.totalResponses)));

      const totalCC1 = cc1[1] + cc1[2] + cc1[3] + cc1[4] || 1;
      const totalCC2 = cc2[1] + cc2[2] + cc2[3] + cc2[4] + cc2[5] || 1;
      const totalCC3 = cc3[1] + cc3[2] + cc3[3] + cc3[4] || 1;

      const ccStackedData = [
        {
          dimension: 'CC1 (Awareness)',
          'Option 1': Math.round((cc1[1] / totalCC1) * 100),
          'Option 2': Math.round((cc1[2] / totalCC1) * 100),
          'Option 3': Math.round((cc1[3] / totalCC1) * 100),
          'Option 4': Math.round((cc1[4] / totalCC1) * 100),
          'Option 5': 0
        },
        {
          dimension: 'CC2 (Visibility)',
          'Option 1': Math.round((cc2[1] / totalCC2) * 100),
          'Option 2': Math.round((cc2[2] / totalCC2) * 100),
          'Option 3': Math.round((cc2[3] / totalCC2) * 100),
          'Option 4': Math.round((cc2[4] / totalCC2) * 100),
          'Option 5': Math.round((cc2[5] / totalCC2) * 100)
        },
        {
          dimension: 'CC3 (Helpfulness)',
          'Option 1': Math.round((cc3[1] / totalCC3) * 100),
          'Option 2': Math.round((cc3[2] / totalCC3) * 100),
          'Option 3': Math.round((cc3[3] / totalCC3) * 100),
          'Option 4': Math.round((cc3[4] / totalCC3) * 100),
          'Option 5': 0
        }
      ];

      // SQD dimension stats
      const sqdData = BASELINE_2025.sqd.map(s => {
        const countsScaled = s.counts.map(v => Math.round(v * (totalResponses / BASELINE_2025.totalResponses)));
        return {
          ...s,
          counts: countsScaled
        };
      });

      // Pareto complaints analysis
      const paretoData = BASELINE_2025.pareto;

      return {
        overallSatisfactionRate: BASELINE_2025.overallSatisfactionRate,
        participationRate: BASELINE_2025.participationRate,
        cc1AwarePercent: BASELINE_2025.cc1AwarePercent,
        cc2VisibilityPercent: BASELINE_2025.cc2VisibilityPercent,
        cc3HelpfulnessPercent: BASELINE_2025.cc3HelpfulnessPercent,
        totalResponses,
        totalVisitors,
        demographics: { sexData, clientTypeData, stakeholderData, ageData, campusData },
        ccStats: { cc1, cc2, cc3, cc1AwarePercent: BASELINE_2025.cc1AwarePercent },
        ccStackedData,
        sqdData,
        services,
        comments,
        paretoData
      };
    } else {
      // LIVE SYSTEM LOGS CALCULATION
      const totalResponses = filteredResponses.length;
      const totalVisitors = filteredVisitorLogs.length;
      const participationRate = totalVisitors === 0 ? 0 : Math.round((totalResponses / totalVisitors) * 100);

      // Overall Satisfaction Index
      let totalSqdRatingsCount = 0;
      let positiveRatingsCount = 0;
      filteredResponses.forEach(res => {
        for (let i = 1; i <= 8; i++) {
          const rating = res[`sqd${i}`];
          if (rating > 0 && rating <= 5) {
            totalSqdRatingsCount++;
            if (rating >= 4) positiveRatingsCount++;
          }
        }
      });
      const overallSatisfactionRate = totalSqdRatingsCount === 0 ? 0 : Math.round((positiveRatingsCount / totalSqdRatingsCount) * 100);

      // Citizen's Charter count distributions
      const cc1 = [0, 0, 0, 0, 0];
      const cc2 = [0, 0, 0, 0, 0, 0];
      const cc3 = [0, 0, 0, 0, 0];
      filteredResponses.forEach(res => {
        const c1 = Number(res.cc1 || 0);
        const c2 = Number(res.cc2 || 0);
        const c3 = Number(res.cc3 || 0);
        if (c1 >= 1 && c1 <= 4) cc1[c1]++;
        if (c2 >= 1 && c2 <= 5) cc2[c2]++;
        if (c3 >= 1 && c3 <= 4) cc3[c3]++;
      });

      const cc1Total = filteredResponses.length;
      const cc1AwareCount = cc1[1] + cc1[2] + cc1[3];
      const cc1AwarePercent = cc1Total > 0 ? Math.round((cc1AwareCount / cc1Total) * 100) : 0;
      const cc2VisibilityPercent = cc1Total > 0 ? Math.round(((cc2[1] + cc2[2]) / cc1Total) * 100) : 0;
      const cc3HelpfulnessPercent = cc1Total > 0 ? Math.round(((cc3[1] + cc3[2]) / cc1Total) * 100) : 0;

      // CC Stacked option values
      const totalCC1 = cc1[1] + cc1[2] + cc1[3] + cc1[4] || 1;
      const totalCC2 = cc2[1] + cc2[2] + cc2[3] + cc2[4] + cc2[5] || 1;
      const totalCC3 = cc3[1] + cc3[2] + cc3[3] + cc3[4] || 1;

      const ccStackedData = [
        {
          dimension: 'CC1 (Awareness)',
          'Option 1': Math.round((cc1[1] / totalCC1) * 100),
          'Option 2': Math.round((cc1[2] / totalCC1) * 100),
          'Option 3': Math.round((cc1[3] / totalCC1) * 100),
          'Option 4': Math.round((cc1[4] / totalCC1) * 100),
          'Option 5': 0
        },
        {
          dimension: 'CC2 (Visibility)',
          'Option 1': Math.round((cc2[1] / totalCC2) * 100),
          'Option 2': Math.round((cc2[2] / totalCC2) * 100),
          'Option 3': Math.round((cc2[3] / totalCC2) * 100),
          'Option 4': Math.round((cc2[4] / totalCC2) * 100),
          'Option 5': Math.round((cc2[5] / totalCC2) * 100)
        },
        {
          dimension: 'CC3 (Helpfulness)',
          'Option 1': Math.round((cc3[1] / totalCC3) * 100),
          'Option 2': Math.round((cc3[2] / totalCC3) * 100),
          'Option 3': Math.round((cc3[3] / totalCC3) * 100),
          'Option 4': Math.round((cc3[4] / totalCC3) * 100),
          'Option 5': 0
        }
      ];

      // Live demographics calculation
      const sexCounts: Record<string, number> = { Male: 0, Female: 0, 'LGBTQ+': 0, 'Did not specify': 0 };
      const clientTypeCounts: Record<string, number> = { Student: 0, Parents: 0, 'Government Employees': 0, 'Internal Employees': 0, Citizens: 0, Others: 0 };
      const ageCounts: Record<string, number> = { '19 or lower': 0, '20-34': 0, '35-49': 0, '50-64': 0, '65 or higher': 0 };
      const campusCounts: Record<string, number> = {};

      campuses.forEach(c => {
        campusCounts[c.name] = 0;
      });

      filteredResponses.forEach(res => {
        // Sex
        let sexVal = res.sex || 'Did not specify';
        if (sexVal === 'LGBTQA+' || sexVal === 'Others (LGBTQI++)') {
          sexVal = 'LGBTQ+';
        }
        if (sexVal in sexCounts) sexCounts[sexVal]++;
        else sexCounts['Did not specify']++;

        // Client Type
        let typeVal = res.clientType || 'Others';
        if (typeVal === 'STUDENT') typeVal = 'Student';
        if (typeVal === 'Government') typeVal = 'Government Employees';
        if (typeVal === 'Citizen') typeVal = 'Citizens';
        if (typeVal === 'Business') typeVal = 'Others';
        
        if (typeVal in clientTypeCounts) clientTypeCounts[typeVal]++;
        else clientTypeCounts['Others']++;

        // Age
        let ageVal = res.ageGroup || '20-34';
        if (ageVal === 'Below 20' || ageVal === '19 or lower') ageVal = '19 or lower';
        if (ageVal === '65 and above' || ageVal === '65 or higher') ageVal = '65 or higher';
        if (ageVal in ageCounts) ageCounts[ageVal]++;
        else ageCounts['20-34']++;

        // Campus
        const cName = campuses.find(c => c.id === res.campusId)?.name || 'Main Campus';
        campusCounts[cName] = (campusCounts[cName] || 0) + 1;
      });

      const sexData = Object.entries(sexCounts).map(([name, value], i) => ({
        name,
        value,
        fill: i === 0 ? 'hsl(var(--chart-2))' : i === 1 ? 'hsl(var(--chart-1))' : i === 2 ? 'hsl(var(--chart-3))' : 'hsl(var(--chart-4))'
      })).filter(d => d.value > 0);

      const clientTypeData = Object.entries(clientTypeCounts).map(([name, value], i) => ({
        name,
        value,
        fill: `hsl(var(--chart-${(i % 5) + 1}))`
      })).filter(d => d.value > 0);

      const internalCount = clientTypeCounts['Student'] + clientTypeCounts['Internal Employees'];
      const externalCount = clientTypeCounts['Parents'] + clientTypeCounts['Government Employees'] + clientTypeCounts['Citizens'] + clientTypeCounts['Others'];
      const stakeholderData = [
        { name: 'Internal Stakeholders', value: internalCount, fill: '#1b6535' },
        { name: 'External Stakeholders', value: externalCount, fill: '#fb923c' }
      ].filter(d => d.value > 0);

      const ageData = Object.entries(ageCounts).map(([name, value]) => ({ name, value }));
      const campusData = Object.entries(campusCounts).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);

      // SQD performance
      const dims = [
        { id: 1, name: "SQD1. Responsiveness", key: "sqd1", desc: "Spent reasonable amount of time" },
        { id: 2, name: "SQD2. Reliability", key: "sqd2", desc: "Followed charter steps/requirements" },
        { id: 3, name: "SQD3. Access & Facilities", key: "sqd3", desc: "Clean, comfortable, and accessible office" },
        { id: 4, name: "SQD4. Communication", key: "sqd4", desc: "Clear guidelines and friendly explanations" },
        { id: 5, name: "SQD5. Costs", key: "sqd5", desc: "Fees paid were just and reasonable" },
        { id: 6, name: "SQD6. Integrity", key: "sqd6", desc: "Free from corruption and under-the-table actions" },
        { id: 7, name: "SQD7. Assurance", key: "sqd7", desc: "Felt safe, staff was professional and courteous" },
        { id: 8, name: "SQD8. Outcome", key: "sqd8", desc: "Office delivered the requested service/result" }
      ];

      const sqdData = dims.map(dim => {
        let sum = 0;
        let count = 0;
        let posCount = 0;
        const counts = [0, 0, 0, 0, 0, 0];

        filteredResponses.forEach(res => {
          const rating = Number(res[dim.key] || 0);
          if (rating === 0) counts[0]++;
          else if (rating >= 1 && rating <= 5) {
            counts[rating]++;
            sum += rating;
            count++;
            if (rating >= 4) posCount++;
          }
        });

        const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
        const positivePercent = count > 0 ? Math.round((posCount / count) * 100) : 0;

        return {
          ...dim,
          avg,
          positivePercent,
          totalValid: count,
          counts
        };
      });

      // Service Performance table calculation
      const serviceStats = new Map<string, { count: number; ratingSum: number; ratingCount: number; positiveCount: number }>();
      filteredResponses.forEach(res => {
        const purposeVal = res.purpose || 'General Assistance';
        const stats = serviceStats.get(purposeVal) || { count: 0, ratingSum: 0, ratingCount: 0, positiveCount: 0 };
        stats.count++;

        for (let i = 1; i <= 8; i++) {
          const rating = res[`sqd${i}`];
          if (rating > 0 && rating <= 5) {
            stats.ratingCount++;
            stats.ratingSum += rating;
            if (rating >= 4) stats.positiveCount++;
          }
        }
        serviceStats.set(purposeVal, stats);
      });

      const services = Array.from(serviceStats.entries()).map(([serviceName, stats]) => {
        const avgRating = stats.ratingCount > 0 ? Number((stats.ratingSum / stats.ratingCount).toFixed(2)) : 0;
        const satisfactionRate = stats.ratingCount > 0 ? Math.min(100, Math.round((stats.positiveCount / stats.ratingCount) * 100)) : 0;
        const cName = activeCampusName === 'all' ? 'Main Campus' : activeCampusName;
        return {
          name: serviceName,
          campus: cName,
          count: stats.count,
          avgRating,
          satisfactionRate
        };
      }).sort((a,b) => b.count - a.count);

      // Comments list
      const comments = filteredResponses
        .filter(r => r.comments && r.comments.trim().length > 0)
        .map(r => {
          let typeVal = r.clientType || 'Student';
          if (typeVal === 'STUDENT') typeVal = 'Student';
          if (typeVal === 'Government') typeVal = 'Government Employees';
          if (typeVal === 'Citizen') typeVal = 'Citizens';
          const cName = campuses.find(c => c.id === r.campusId)?.name || 'Main Campus';
          
          // Heuristic theme mapping
          let category = "Outcome (SQD8)";
          for (let i = 1; i <= 8; i++) {
            if (r[`sqd${i}`] > 0 && r[`sqd${i}`] <= 2) {
              category = i === 1 ? "Responsiveness (SQD1)" :
                         i === 2 ? "Reliability (SQD2)" :
                         i === 3 ? "Access & Facilities (SQD3)" :
                         i === 4 ? "Communication (SQD4)" :
                         i === 5 ? "Costs (SQD5)" :
                         i === 6 ? "Integrity (SQD6)" :
                         i === 7 ? "Assurance (SQD7)" : "Outcome (SQD8)";
              break;
            }
          }

          return {
            visitorName: r.visitorName || 'Anonymous',
            comments: r.comments,
            category,
            campus: cName,
            type: typeVal
          };
        });

      // Pareto live count
      const liveParetoCounts: Record<string, number> = {
        "Responsiveness (SQD1)": 0,
        "Reliability (SQD2)": 0,
        "Access & Facilities (SQD3)": 0,
        "Communication (SQD4)": 0,
        "Costs (SQD5)": 0,
        "Integrity (SQD6)": 0,
        "Assurance (SQD7)": 0,
        "Outcome (SQD8)": 0,
      };

      comments.forEach(c => {
        if (c.category in liveParetoCounts) {
          liveParetoCounts[c.category]++;
        }
      });

      const sortedPareto = Object.entries(liveParetoCounts)
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count);

      const totalParetoCount = sortedPareto.reduce((sum, item) => sum + item.count, 0) || 1;
      let runningSum = 0;
      const paretoData = sortedPareto.map(item => {
        runningSum += item.count;
        return {
          theme: item.theme,
          count: item.count,
          cumulativePercent: Math.round((runningSum / totalParetoCount) * 100)
        };
      });

      return {
        overallSatisfactionRate,
        participationRate,
        cc1AwarePercent,
        cc2VisibilityPercent,
        cc3HelpfulnessPercent,
        totalResponses,
        totalVisitors,
        demographics: { sexData, clientTypeData, stakeholderData, ageData, campusData },
        ccStats: { cc1, cc2, cc3, cc1AwarePercent },
        ccStackedData,
        sqdData,
        services,
        comments,
        paretoData
      };
    }
  }, [dataSource, filteredResponses, filteredVisitorLogs, campuses, activeCampusName]);

  // SQD Diverging Likert dataset constructor
  const divergingData = useMemo(() => {
    return displayStats.sqdData.map(sqd => {
      const total = sqd.counts[1] + sqd.counts[2] + sqd.counts[3] + sqd.counts[4] + sqd.counts[5] || 1;
      const sd = (sqd.counts[1] / total) * 100;
      const d = (sqd.counts[2] / total) * 100;
      const n = (sqd.counts[3] / total) * 100;
      const a = (sqd.counts[4] / total) * 100;
      const sa = (sqd.counts[5] / total) * 100;

      return {
        name: `SQD${sqd.id}`,
        fullName: sqd.name,
        "Strongly Disagree": -sd,
        "Disagree": -d,
        "Neutral (Neg)": -n / 2,
        "Neutral (Pos)": n / 2,
        "Agree": a,
        "Strongly Agree": sa,
      };
    });
  }, [displayStats]);

  // Radar Spider chart dataset constructor
  const radarData = useMemo(() => {
    const list = displayStats.sqdData.map(s => ({
      subject: `SQD${s.id}`,
      name: s.name,
      Score: s.positivePercent,
      fullMark: 100
    }));
    return [
      { subject: 'Overall', name: 'Overall Satisfaction', Score: displayStats.overallSatisfactionRate, fullMark: 100 },
      ...list
    ];
  }, [displayStats]);

  // Paginated/Filtered Services performance
  const filteredServices = useMemo(() => {
    return displayStats.services.filter(s => 
      s.name.toLowerCase().includes(serviceSearch.toLowerCase()) ||
      s.campus.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [displayStats.services, serviceSearch]);

  const paginatedServices = useMemo(() => {
    const start = servicePage * servicePageSize;
    return filteredServices.slice(start, start + servicePageSize);
  }, [filteredServices, servicePage]);

  // Filter comments based on text search
  const filteredComments = useMemo(() => {
    if (!displayStats.comments) return [];
    if (!commentSearch.trim()) return displayStats.comments;
    const q = commentSearch.toLowerCase();
    return displayStats.comments.filter(c => 
      c.visitorName.toLowerCase().includes(q) ||
      c.comments.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.campus.toLowerCase().includes(q) ||
      c.type.toLowerCase().includes(q)
    );
  }, [displayStats.comments, commentSearch]);

  // Decision Support System alerts
  const dssInsights = useMemo(() => {
    const alerts: any[] = [];
    displayStats.sqdData.forEach(sqd => {
      if (sqd.avg > 0 && sqd.positivePercent < 85) {
        let recommendation = "";
        let checklist: string[] = [];

        switch(sqd.id) {
          case 1:
            recommendation = "Responsiveness Alert: Transaction time is sub-optimal. Review counter queue management.";
            checklist = [
              "Audit typical service time per client counter.",
              "Adjust personnel allocation to increase count during peak hours (10 AM - 2 PM).",
              "Implement pre-screening checkers to avoid queue recycling."
            ];
            break;
          case 2:
            recommendation = "Reliability Gap: Service delivery is not complying strictly with charter timelines.";
            checklist = [
              "Standardize compliance review periods for documents.",
              "Track process deviations using digitised logs.",
              "Schedule workflow orientation refreshers for administrative assistants."
            ];
            break;
          case 3:
            recommendation = "Facilities Alert: Customer lounge comfort levels are below standard.";
            checklist = [
              "Provide additional ventilation, seating, and clean restrooms.",
              "Ensure directional signs are placed at all floor entrances.",
              "Review lobby seating capacity and implement priority seats."
            ];
            break;
          case 4:
            recommendation = "Communication Issue: Instructions or prerequisites are ambiguous to visitors.";
            checklist = [
              "Upload and post visual 1-page guides for all services.",
              "Ensure information helpdesks are manned by trained frontline agents.",
              "Review document requirements checklists to eliminate obsolete certificates."
            ];
            break;
          case 5:
            recommendation = "Cost Dissatisfaction: Fees charged are not clearly visible.";
            checklist = [
              "Post certified schedules of fees directly at payment counters.",
              "Issue itemsized breakdowns on official receipts.",
              "Review electronic transaction fees to minimize convenience surcharges."
            ];
            break;
          case 6:
            recommendation = "Integrity Risk: Standard processes are bypassed or not transparent.";
            checklist = [
              "Enforce RA 11032 anti-graft training schedules.",
              "Implement transparent queue monitoring display screens.",
              "Deploy locked Suggestion chests that bypass direct office staff."
            ];
            break;
          case 7:
            recommendation = "Assurance Gaps: Professional courtesy standards require training.";
            checklist = [
              "Schedule Customer Relations & Values Training workshops.",
              "Enforce strict frontline uniform and identification code of conduct.",
              "Establish standard client reception greetings."
            ];
            break;
          case 8:
            recommendation = "Outcome Issue: High rejection rate or inadequate rejection explanations.";
            checklist = [
              "Provide written checklists detailing specific deficiencies for denied documents.",
              "Examine reject reasons to optimize requirements listing.",
              "Establish a clear appeals channel."
            ];
            break;
        }

        alerts.push({
          id: sqd.id,
          name: sqd.name,
          positivePercent: sqd.positivePercent,
          avg: sqd.avg,
          recommendation,
          checklist
        });
      }
    });

    if (displayStats.totalVisitors > 20 && displayStats.participationRate < 30) {
      alerts.push({
        id: 99,
        name: "Low Survey Participation",
        recommendation: `Participation is at ${displayStats.participationRate}%. Bypasses might be occurring.`,
        checklist: [
          "Ensure kiosk checkout prompts are activated in fullscreen mode.",
          "Train desk clerks to polite invite visitors to complete evaluation prior to exit.",
          "Verify QR code signages are visible on exit walls."
        ]
      });
    }

    return alerts;
  }, [displayStats]);

  // Unit Rankings table
  const unitBenchmarks = useMemo(() => {
    if (!hasAccessToAll || !units) return [];
    const resByUnit = new Map<string, any[]>();
    filteredResponses.forEach(res => {
      const list = resByUnit.get(res.unitId) || [];
      list.push(res);
      resByUnit.set(res.unitId, list);
    });

    const logsByUnit = new Map<string, any[]>();
    filteredVisitorLogs.forEach(log => {
      const list = logsByUnit.get(log.unitId) || [];
      list.push(log);
      logsByUnit.set(log.unitId, list);
    });

    return units.map(unit => {
      const uResponses = resByUnit.get(unit.id) || [];
      const uLogs = logsByUnit.get(unit.id) || [];

      let ratingCount = 0;
      let posCount = 0;
      let ratingSum = 0;

      uResponses.forEach(res => {
        for (let i = 1; i <= 8; i++) {
          const rating = res[`sqd${i}`];
          if (rating > 0 && rating <= 5) {
            ratingCount++;
            ratingSum += rating;
            if (rating >= 4) posCount++;
          }
        }
      });

      const totalUResponses = uResponses.length;
      const totalULogs = uLogs.length;
      const uParticipationRate = totalULogs > 0 ? Math.round((totalUResponses / totalULogs) * 100) : 0;
      const uSatisfactionRate = ratingCount > 0 ? Math.round((posCount / ratingCount) * 100) : 0;
      const uAvgRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : 0;
      const campusNames = unit.campusIds?.map(cId => campuses.find(c => c.id === cId)?.name || 'N/A') || [];

      return {
        id: unit.id,
        name: unit.name,
        campuses: campusNames.join(', '),
        totalVisitors: totalULogs,
        totalResponses: totalUResponses,
        participationRate: uParticipationRate,
        satisfactionRate: uSatisfactionRate,
        avgRating: uAvgRating,
      };
    }).filter(u => u.totalVisitors > 0 || u.totalResponses > 0)
      .sort((a, b) => b.satisfactionRate - a.satisfactionRate);
  }, [filteredResponses, filteredVisitorLogs, units, campuses, hasAccessToAll]);


  // ==================== REPORT GENERATION & PRINT TRIGGERS ====================

  const handlePrintScorecard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const titleLabel = dataSource === 'baseline25' ? "FY 2025 BASELINE REPORT" : "LIVE SYSTEM LOGS";
    const campusLabel = activeCampusName === 'all' ? "RSU SYSTEM-WIDE" : activeCampusName;

    let sqdRows = '';
    displayStats.sqdData.forEach(sqd => {
      sqdRows += `
        <tr>
          <td style="border: 1px solid black; padding: 8px; font-weight: bold;">${sqd.name}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold;">${sqd.avg} / 5.0</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center; font-weight: bold; background-color: ${sqd.positivePercent >= 85 ? '#e6f4ea' : '#fce8e6'};">${sqd.positivePercent}%</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[5]}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[4]}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[3]}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[2]}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[1]}</td>
          <td style="border: 1px solid black; padding: 8px; text-align: center;">${sqd.counts[0]}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>ARTA CSM Scorecard - ${campusLabel}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: black; line-height: 1.4; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 11px; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 8px; text-align: center; text-transform: uppercase; font-size: 10px; font-weight: bold; }
            td { border: 1px solid black; padding: 6px; }
            .header-table { width: 100%; border: none; border-bottom: 2px solid black; margin-bottom: 20px; }
            .header-table td { border: none; padding: 0; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td style="width: 70px; text-align: left;"><img src="/rsulogo.png" style="height: 60px; object-fit: contain;" /></td>
              <td style="text-align: center;">
                <p style="margin: 0; font-size: 10px; text-transform: uppercase;">Republic of the Philippines</p>
                <h2 style="margin: 3px 0; font-size: 14px; font-weight: bold;">ROMBLON STATE UNIVERSITY</h2>
                <p style="margin: 0; font-size: 10px;">Odiongan, Romblon</p>
              </td>
              <td style="width: 70px; text-align: right;"><img src="/ISOlogo.jpg" style="height: 60px; object-fit: contain;" /></td>
            </tr>
          </table>
          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">CLIENT SATISFACTION MEASUREMENT SCORECARD</h3>
            <p style="margin: 3px 0; font-size: 11px; font-weight: bold; color: #555;">SOURCE: ${titleLabel}</p>
          </div>
          <div style="margin-bottom: 15px; font-size: 11px;">
            <div><strong>CAMPUS:</strong> ${campusLabel.toUpperCase()}</div>
            <div><strong>REPORT PERIOD:</strong> Calendar Year ${selectedYear}</div>
            <div><strong>TOTAL CUSTOMER RESPONSES:</strong> ${displayStats.totalResponses} (Logged Visitors: ${displayStats.totalVisitors})</div>
            <div><strong>OVERALL CLIENT SATISFACTION INDEX:</strong> <strong style="font-size: 12px; color: green;">${displayStats.overallSatisfactionRate}%</strong></div>
          </div>
          <h4 style="margin: 15px 0 5px 0; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid black;">SQD Performance Breakdown</h4>
          <table>
            <thead>
              <tr>
                <th>Service Quality Dimension</th>
                <th>Avg Rating</th>
                <th>Positive %</th>
                <th>SA (5)</th>
                <th>A (4)</th>
                <th>N (3)</th>
                <th>D (2)</th>
                <th>SD (1)</th>
                <th>N/A (0)</th>
              </tr>
            </thead>
            <tbody>${sqdRows}</tbody>
          </table>
          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Printable Harmonized CSM Agency Report
  const handlePrintHarmonizedReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const campusText = activeCampusName === 'all' ? "RSU SYSTEM-WIDE" : activeCampusName;
    const titleLabel = dataSource === 'baseline25' ? "FY 2025 BASELINE REPORT" : "LIVE SYSTEM LOGS";

    let serviceRows = '';
    displayStats.services.forEach(s => {
      serviceRows += `
        <tr>
          <td style="border: 1px solid black; padding: 6px;">${s.name.toUpperCase()}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${s.count}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">${s.satisfactionRate}%</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${s.avgRating} / 5.0</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Harmonized CSM Agency Report - ${campusText}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: black; line-height: 1.5; font-size: 12px; }
            h1, h2, h3, h4 { color: #1b6535; font-weight: bold; page-break-after: avoid; }
            h1 { font-size: 18px; text-align: center; text-transform: uppercase; }
            h2 { font-size: 14px; border-bottom: 2px solid #1b6535; padding-bottom: 4px; margin-top: 25px; }
            h3 { font-size: 12px; margin-top: 15px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 11px; page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 6px; text-align: center; text-transform: uppercase; font-weight: bold; }
            td { border: 1px solid black; padding: 5px; }
            .header-block { text-align: center; border-bottom: 3px double black; padding-bottom: 10px; margin-bottom: 20px; }
            .meta-info { margin-bottom: 20px; font-size: 11px; background-color: #f9f9f9; padding: 10px; border: 1px solid #ddd; }
          </style>
        </head>
        <body>
          <div class="header-block">
            <h2 style="margin: 0; color: black;">ROMBLON STATE UNIVERSITY</h2>
            <p style="margin: 2px 0; font-size: 10px; font-style: italic;">Odiongan, Romblon</p>
            <h1 style="margin: 5px 0;">HARMONIZED CLIENT SATISFACTION MEASUREMENT (CSM) AGENCY REPORT</h1>
            <p style="margin: 2px 0; font-weight: bold;">COMPLIANT WITH ARTA MC NO. 2022-05 & RESOLUTION NO. 2023-01</p>
          </div>

          <div class="meta-info">
            <div><strong>REPORTING CYCLE:</strong> Calendar Year ${selectedYear} (Annual)</div>
            <div><strong>SCOPE:</strong> ${campusText.toUpperCase()}</div>
            <div><strong>DATA SOURCE:</strong> ${titleLabel}</div>
            <div><strong>TOTAL CUSTOMER EVALUATIONS:</strong> ${displayStats.totalResponses}</div>
            <div><strong>OVERALL CUSTOMER SATISFACTION SCORE:</strong> ${displayStats.overallSatisfactionRate}%</div>
          </div>

          <h2>I. EXECUTIVE SUMMARY & OVERVIEW</h2>
          <p>
            In compliance with the mandate of the Anti-Red Tape Authority (ARTA) and Republic Act No. 11032, otherwise known as the 
            <em>Ease of Doing Business and Efficient Government Service Delivery Act of 2018</em>, Romblon State University presents the 
            Annual Client Satisfaction Measurement (CSM) Report for the year ${selectedYear}.
          </p>
          <p>
            This agency report highlights the feedback retrieved from clients across campuses using both onsite digital kiosk logbooks and QR-code enabled mobile devices. 
            For this period, ${campusText} registered a total of <strong>${displayStats.totalResponses}</strong> responses from <strong>${displayStats.totalVisitors}</strong> total visitors, 
            resulting in a <strong>${displayStats.participationRate}%</strong> participation rate. The institution garnered an overall client satisfaction index of 
            <strong>${displayStats.overallSatisfactionRate}%</strong>, showing a high standard of compliance across frontline counters.
          </p>

          <h2>II. METHODOLOGY</h2>
          <p>
            Feedback collection was digitized using the EOMS Visitor Logbook and Customer Satisfaction system. The process operates as follows:
          </p>
          <ol>
            <li><strong>Visitor Logging:</strong> Visitors register their entry at designated kiosk terminals or via scanning unit-specific QR codes on their mobile devices.</li>
            <li><strong>Checkout Prompt:</strong> Upon completing the service transaction, the client registers checkout which automatically opens the standardized ARTA CSM evaluation form.</li>
            <li><strong>ARTA Dimensions:</strong> The survey records the 3 Citizen's Charter (CC) awareness indicators and evaluates 8 Service Quality Dimensions (SQD) on a 5-point Likert scale.</li>
            <li><strong>Consolidation:</strong> Submissions are secured in the Firestore database, allowing real-time audit mapping, unit tracking, and automated performance reviews by the IPDO.</li>
          </ol>

          <h2>III. CITIZEN'S CHARTER COMPLIANCE RATINGS</h2>
          <p>
            The Citizen's Charter (CC) results evaluate client awareness, charter visibility, and charter helpfulness:
          </p>
          <ul>
            <li><strong>CC1 Awareness:</strong> ${displayStats.cc1AwarePercent}% of clients knew about the Citizen's Charter and saw the physical or digital postings.</li>
            <li><strong>CC2 Visibility:</strong> ${displayStats.cc2VisibilityPercent}% reported that the Charter was easy to see and consult.</li>
            <li><strong>CC3 Helpfulness:</strong> ${displayStats.cc3HelpfulnessPercent}% confirmed that the Charter served as a helpful guide for their transaction.</li>
          </ul>

          <h2>IV. SERVICE-LEVEL PERFORMANCE SCORECARD</h2>
          <p>
            The table below compiles transactions and satisfaction index ratings grouped by service classification for this campus/unit:
          </p>
          <table>
            <thead>
              <tr>
                <th>Service Name / Transaction Type</th>
                <th>Total Transactions</th>
                <th>Satisfaction index</th>
                <th>Average Rating</th>
              </tr>
            </thead>
            <tbody>
              ${serviceRows}
            </tbody>
          </table>

          <h2>V. INTERPRETATION & CONTINUOUS IMPROVEMENT</h2>
          <p>
            With an overall rating of ${displayStats.overallSatisfactionRate}%, Romblon State University demonstrates compliance with ARTA requirements. 
            However, critical friction points were identified in specific service categories. Corrective actions will include deploying queue scheduling algorithms, regular air-conditioning maintenance for visitor lounges, and customer relations seminars for counter coordinators to maintain standard professional service quality.
          </p>

          <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 11px;">
            <div style="width: 45%; text-align: center;">
              <p>Compiled By:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; margin-top: 30px; padding-bottom: 2px;">
                ${userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "CSM Officer"}
              </div>
              <p>${userProfile?.role || "Unit Coordinator"}</p>
            </div>
            <div style="width: 45%; text-align: center;">
              <p>Noted By:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; margin-top: 30px; padding-bottom: 2px; height: 16px;"></div>
              <p>IPDO Director / Quality Assurance Head</p>
            </div>
          </div>

          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Campus-Specific Report
  const handlePrintCampusReport = (campusName: string) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Filter services and comments by campus name
    const campusServices = displayStats.services.filter(s => s.campus.toLowerCase().includes(campusName.toLowerCase()));
    const campusComments = displayStats.comments.filter(c => c.campus.toLowerCase().includes(campusName.toLowerCase()));

    let serviceRows = '';
    campusServices.forEach(s => {
      serviceRows += `
        <tr>
          <td style="border: 1px solid black; padding: 6px;">${s.name}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${s.count}</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold;">${s.satisfactionRate}%</td>
          <td style="border: 1px solid black; padding: 6px; text-align: center;">${s.avgRating}</td>
        </tr>
      `;
    });

    let commentRows = '';
    campusComments.slice(0, 15).forEach((c, idx) => {
      commentRows += `
        <tr>
          <td style="border: 1px solid black; padding: 6px;">${idx + 1}</td>
          <td style="border: 1px solid black; padding: 6px; font-weight: bold; text-transform: uppercase;">${maskName(c.visitorName)}</td>
          <td style="border: 1px solid black; padding: 6px;">"${c.comments}"</td>
          <td style="border: 1px solid black; padding: 6px; font-weight: bold;">${c.category}</td>
          <td style="border: 1px solid black; padding: 6px; text-transform: uppercase;">${c.type}</td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>Campus Satisfaction Report - ${campusName}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: black; line-height: 1.4; font-size: 11px; }
            h1, h2, h3 { color: #1b6535; font-weight: bold; }
            h1 { font-size: 16px; text-align: center; margin: 0 0 10px 0; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 6px; text-align: center; text-transform: uppercase; font-weight: bold; }
            td { border: 1px solid black; padding: 5px; }
          </style>
        </head>
        <body>
          <h2 style="text-align: center; margin: 0;">ROMBLON STATE UNIVERSITY</h2>
          <h1>CAMPUS SATISFACTION AUDIT REPORT - ${campusName.toUpperCase()}</h1>
          <p><strong>REPORT PERIOD:</strong> Academic Year ${selectedYear} &bull; <strong>SOURCE:</strong> ${dataSource === 'baseline25' ? "FY 2025 baseline" : "Live logs"}</p>
          
          <h3>I. CAMPUS SERVICE RATINGS</h3>
          <table>
            <thead>
              <tr>
                <th>Service Transaction</th>
                <th>Total Transactions</th>
                <th>Satisfaction Rate</th>
                <th>Avg SQD Rating</th>
              </tr>
            </thead>
            <tbody>
              ${serviceRows || '<tr><td colspan="4" style="text-align:center;">No services recorded for this campus</td></tr>'}
            </tbody>
          </table>

          <h3>II. QUALITATIVE FEEDBACK FEED</h3>
          <table>
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 20%;">Client Name</th>
                <th style="width: 45%;">Client Comments / Suggestions</th>
                <th style="width: 18%;">SQD Theme</th>
                <th style="width: 12%;">Client Type</th>
              </tr>
            </thead>
            <tbody>
              ${commentRows || '<tr><td colspan="5" style="text-align:center;">No comments recorded for this campus</td></tr>'}
            </tbody>
          </table>

          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // CAIP Matrix Report
  const handlePrintCaipReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Continuous Agency Improvement Plan (CAIP) Matrix</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 40px; color: black; line-height: 1.5; font-size: 11px; }
            h1, h2 { color: #1b6535; font-weight: bold; text-align: center; }
            h1 { font-size: 16px; margin: 0 0 5px 0; }
            h2 { font-size: 12px; margin: 0 0 20px 0; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th { background-color: #e6f4ea; border: 1px solid black; padding: 8px; text-transform: uppercase; font-weight: bold; color: #1b6535; font-size: 10px; }
            td { border: 1px solid black; padding: 8px; vertical-align: top; }
          </style>
        </head>
        <body>
          <h2>ROMBLON STATE UNIVERSITY</h2>
          <h1>CONTINUOUS AGENCY IMPROVEMENT PLAN (CAIP) TRACKING MATRIX</h1>
          <h2>TARGET FY 2026 EASE OF DOING BUSINESS (ARTA COMPLIANT ACTION PLAN)</h2>
          
          <table>
            <thead>
              <tr>
                <th style="width: 20%;">Area of Evaluation</th>
                <th style="width: 20%;">Corrective Program</th>
                <th style="width: 25%;">Actionable Target (2026)</th>
                <th style="width: 20%;">Status / QR Deployment</th>
                <th style="width: 15%;">Schedule</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Client Satisfaction Index</strong></td>
                <td>DSS Automated Audit Trigger</td>
                <td>Increase Overall Satisfaction Index to 95% minimum (Baseline FY 2025: 92%)</td>
                <td>Active tracking deployed on EOMS Portal</td>
                <td>Q1-Q4 2026</td>
              </tr>
              <tr>
                <td><strong>Citizen's Charter Visibility</strong></td>
                <td>Dual-Format Charter deployment</td>
                <td>Display 100% compliant physical signages and digitised QR codes inside lobby checkpoints.</td>
                <td>Main: 100% Deployed<br/>Satellite: 80% Deployed</td>
                <td>Q2 2026</td>
              </tr>
              <tr>
                <td><strong>Low Kiosk Participation</strong></td>
                <td>QR Mobile CSM evaluations</td>
                <td>Implement visitor evaluations on personal devices to increase participation rate by 20%.</td>
                <td>Kiosk QR Code Generator Online</td>
                <td>Q1 2026 (Completed)</td>
              </tr>
              <tr>
                <td><strong>Filing of Leave of Absence (Student satisfaction at 50%)</strong></td>
                <td>Self-Service Request portal</td>
                <td>Digitise filing and approval pipeline of Leaves to reduce manual processing time to 15 mins.</td>
                <td>Beta testing under Registrar</td>
                <td>Q3 2026</td>
              </tr>
              <tr>
                <td><strong>Cross Enrollees (Satisfaction at 47%)</strong></td>
                <td>Inter-Campus Verification pipeline</td>
                <td>Establish digital grade validation system to eliminate physical travel requirements for students.</td>
                <td>Planning phase under Admissions</td>
                <td>Q3 2026</td>
              </tr>
              <tr>
                <td><strong>Frontline Personnel Assurance</strong></td>
                <td>Customer Service Excellence</td>
                <td>Train 100% of registry assistants and coordinators in customer service sensitivity.</td>
                <td>3 batches scheduled</td>
                <td>Q3-Q4 2026</td>
              </tr>
            </tbody>
          </table>

          <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // ==================== TAB-SPECIFIC PRINT TEMPLATES ====================

  const getReportHeaderHtml = (tabTitle: string) => {
    const titleLabel = dataSource === 'baseline25' ? "FY 2025 BASELINE REPORT" : "LIVE SYSTEM LOGS";
    const campusText = localCampusId === 'all' ? "UNIVERSITY-WIDE" : (campuses.find(c => c.id === localCampusId)?.name || "RSU");
    const unitText = selectedUnitId === 'all' ? "ALL OFFICES / UNITS" : (units.find(u => u.id === selectedUnitId)?.name || "Office");
    
    return `
      <table style="width: 100%; border: none; border-bottom: 2px solid black; margin-bottom: 20px;">
        <tr>
          <td style="width: 70px; text-align: left; border: none; padding: 0;"><img src="/rsulogo.png" style="height: 50px; object-fit: contain;" /></td>
          <td style="text-align: center; border: none; padding: 0;">
            <p style="margin: 0; font-size: 9px; text-transform: uppercase; letter-spacing: 1px;">Republic of the Philippines</p>
            <h2 style="margin: 2px 0; font-size: 13px; font-weight: bold; color: #1b6535;">ROMBLON STATE UNIVERSITY</h2>
            <p style="margin: 0; font-size: 9px;">Odiongan, Romblon</p>
          </td>
          <td style="width: 70px; text-align: right; border: none; padding: 0;"><img src="/ISOlogo.jpg" style="height: 50px; object-fit: contain;" /></td>
        </tr>
      </table>
      <div style="text-align: center; margin-bottom: 15px;">
        <h3 style="margin: 0; font-size: 13px; font-weight: bold; text-transform: uppercase;">CSM COMPLIANCE AUDIT REPORT - ${tabTitle.toUpperCase()}</h3>
        <p style="margin: 2px 0; font-size: 9px; font-weight: bold; color: #555;">DATA STREAM: ${titleLabel}</p>
      </div>
      <div style="margin-bottom: 15px; font-size: 10px; background-color: #f8fafc; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
        <table style="width: 100%; border: none; font-size: 10px; margin: 0;">
          <tr style="border: none;"><td style="border: none; padding: 2px;"><strong>CAMPUS:</strong> ${campusText.toUpperCase()}</td><td style="border: none; padding: 2px;"><strong>OFFICE/UNIT:</strong> ${unitText.toUpperCase()}</td></tr>
          <tr style="border: none;"><td style="border: none; padding: 2px;"><strong>REPORT PERIOD:</strong> Calendar Year ${selectedYear}</td><td style="border: none; padding: 2px;"><strong>TOTAL RESPONSES:</strong> ${displayStats.totalResponses}</td></tr>
        </table>
      </div>
    `;
  };

  const handlePrintOverviewTab = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let sexRows = '';
    displayStats.demographics.sexData.forEach(d => {
      sexRows += `<tr><td>${d.name}</td><td style="text-align:center;">${d.value}</td><td style="text-align:center;">${Math.round((d.value / displayStats.totalResponses) * 100)}%</td></tr>`;
    });

    let customerRows = '';
    displayStats.demographics.clientTypeData.forEach(d => {
      customerRows += `<tr><td>${d.name}</td><td style="text-align:center;">${d.value}</td><td style="text-align:center;">${Math.round((d.value / displayStats.totalResponses) * 100)}%</td></tr>`;
    });

    let stakeholderRows = '';
    displayStats.demographics.stakeholderData.forEach(d => {
      stakeholderRows += `<tr><td>${d.name}</td><td style="text-align:center;">${d.value}</td><td style="text-align:center;">${Math.round((d.value / displayStats.totalResponses) * 100)}%</td></tr>`;
    });

    let ageRows = '';
    displayStats.demographics.ageData.forEach(d => {
      ageRows += `<tr><td>${d.name}</td><td style="text-align:center;">${d.value}</td><td style="text-align:center;">${Math.round((d.value / displayStats.totalResponses) * 100)}%</td></tr>`;
    });

    let ccRows = `
      <tr><td><strong>CC1 (Awareness)</strong></td><td style="text-align:center;">${displayStats.ccStackedData[0]['Option 1']}%</td><td style="text-align:center;">${displayStats.ccStackedData[0]['Option 2']}%</td><td style="text-align:center;">${displayStats.ccStackedData[0]['Option 3']}%</td><td style="text-align:center;">${displayStats.ccStackedData[0]['Option 4']}%</td><td style="text-align:center;">—</td></tr>
      <tr><td><strong>CC2 (Visibility)</strong></td><td style="text-align:center;">${displayStats.ccStackedData[1]['Option 1']}%</td><td style="text-align:center;">${displayStats.ccStackedData[1]['Option 2']}%</td><td style="text-align:center;">${displayStats.ccStackedData[1]['Option 3']}%</td><td style="text-align:center;">${displayStats.ccStackedData[1]['Option 4']}%</td><td style="text-align:center;">${displayStats.ccStackedData[1]['Option 5']}%</td></tr>
      <tr><td><strong>CC3 (Helpfulness)</strong></td><td style="text-align:center;">${displayStats.ccStackedData[2]['Option 1']}%</td><td style="text-align:center;">${displayStats.ccStackedData[2]['Option 2']}%</td><td style="text-align:center;">${displayStats.ccStackedData[2]['Option 3']}%</td><td style="text-align:center;">${displayStats.ccStackedData[2]['Option 4']}%</td><td style="text-align:center;">—</td></tr>
    `;

    printWindow.document.write(`
      <html>
        <head>
          <title>CSM Executive Overview & Demographics</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: black; line-height: 1.4; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 6px; text-align: center; text-transform: uppercase; font-size: 9px; font-weight: bold; }
            td { border: 1px solid black; padding: 6px; }
            h4 { color: #1b6535; border-bottom: 1px solid black; padding-bottom: 3px; margin-top: 20px; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          ${getReportHeaderHtml("Executive Overview & Demographics")}
          
           <h4>I. Executive Satisfaction Indicators</h4>
           <table>
             <thead>
               <tr>
                 <th>Satisfaction Indicator</th>
                 <th>Score Rating %</th>
                 <th>Meaning</th>
               </tr>
             </thead>
             <tbody>
               <tr><td><strong>Overall Client Satisfaction Rate</strong></td><td style="text-align:center;font-weight:bold;">${displayStats.overallSatisfactionRate}%</td><td>Clients who rated Agree/Strongly Agree across SQDs</td></tr>
               <tr><td><strong>CSM Participation Rate</strong></td><td style="text-align:center;font-weight:bold;">${displayStats.participationRate}%</td><td>Ratio of evaluations per logged visit</td></tr>
               <tr><td><strong>Citizen's Charter Awareness</strong></td><td style="text-align:center;font-weight:bold;">${displayStats.cc1AwarePercent}%</td><td>Clients aware of the Citizen's Charter</td></tr>
               <tr><td><strong>Citizen's Charter Visibility</strong></td><td style="text-align:center;font-weight:bold;">${displayStats.cc2VisibilityPercent}%</td><td>Clients who found the Charter easy to locate</td></tr>
               <tr><td><strong>Citizen's Charter Helpfulness</strong></td><td style="text-align:center;font-weight:bold;">${displayStats.cc3HelpfulnessPercent}%</td><td>Clients who found it helpful for service delivery</td></tr>
             </tbody>
           </table>

           <h4>II. Client Demographic Distributions</h4>
           <div style="display: flex; gap: 20px;">
             <div style="flex: 1;">
               <table style="margin: 0;">
                 <thead><tr><th>Sex Category</th><th style="width: 25%;">Count</th><th style="width: 25%;">Ratio</th></tr></thead>
                 <tbody>${sexRows}</tbody>
               </table>
             </div>
             <div style="flex: 1;">
               <table style="margin: 0;">
                 <thead><tr><th>Customer Type</th><th style="width: 25%;">Count</th><th style="width: 25%;">Ratio</th></tr></thead>
                 <tbody>${customerRows}</tbody>
               </table>
             </div>
           </div>

           <div style="display: flex; gap: 20px; margin-top: 15px;">
             <div style="flex: 1;">
               <table style="margin: 0;">
                 <thead><tr><th>Stakeholder Class</th><th style="width: 25%;">Count</th><th style="width: 25%;">Ratio</th></tr></thead>
                 <tbody>${stakeholderRows}</tbody>
               </table>
             </div>
             <div style="flex: 1;">
               <table style="margin: 0;">
                 <thead><tr><th>Age Bracket</th><th style="width: 25%;">Count</th><th style="width: 25%;">Ratio</th></tr></thead>
                 <tbody>${ageRows}</tbody>
               </table>
             </div>
           </div>

           <h4>III. Citizen's Charter Option Distributions</h4>
           <table>
             <thead>
               <tr>
                 <th>Citizen's Charter Metric</th>
                 <th>Option 1</th>
                 <th>Option 2</th>
                 <th>Option 3</th>
                 <th>Option 4</th>
                 <th>Option 5</th>
               </tr>
             </thead>
             <tbody>
               ${ccRows}
             </tbody>
           </table>

           <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
         </body>
       </html>
     `);
    printWindow.document.close();
  };

  const handlePrintSqdTab = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let sqdRows = '';
    displayStats.sqdData.forEach(sqd => {
      sqdRows += `
        <tr>
          <td><strong>${sqd.name}</strong><br/><small style="color:#666;">${sqd.desc}</small></td>
          <td style="text-align:center;font-weight:bold;">${sqd.avg} / 5.0</td>
          <td style="text-align:center;font-weight:bold;color:${sqd.positivePercent >= 85 ? 'green' : 'red'};">${sqd.positivePercent}%</td>
          <td style="text-align:center;">${sqd.counts[5]}</td>
          <td style="text-align:center;">${sqd.counts[4]}</td>
          <td style="text-align:center;">${sqd.counts[3]}</td>
          <td style="text-align:center;">${sqd.counts[2]}</td>
          <td style="text-align:center;">${sqd.counts[1]}</td>
          <td style="text-align:center;">${sqd.counts[0]}</td>
        </tr>
      `;
    });

    let serviceRows = '';
    filteredServices.forEach(s => {
      let heatBg = '#e6f4ea';
      let heatFg = '#137333';
      if (s.satisfactionRate < 89) {
        heatBg = '#fce8e6';
        heatFg = '#c5221f';
      } else if (s.satisfactionRate >= 90 && s.satisfactionRate <= 94) {
        heatBg = '#fef7e0';
        heatFg = '#b06000';
      }
      serviceRows += `
        <tr>
          <td style="font-weight:bold;">${s.name.toUpperCase()}</td>
          <td>${s.campus}</td>
          <td style="text-align:center;">${s.count}</td>
          <td style="text-align:center;font-weight:bold;background-color:${heatBg};color:${heatFg};">${s.satisfactionRate}%</td>
          <td style="text-align:center;">${s.avgRating} / 5.0</td>
        </tr>
      `;
    });

    let dssList = '';
    dssInsights.forEach(i => {
      if (i.id !== 99) {
        dssList += `
          <div style="border: 1px solid #f5c2c2; background-color: #fdf3f3; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
            <strong>${i.name} GAPS ALERT (${i.positivePercent}% Positive Satisfaction)</strong>
            <p style="margin: 4px 0; font-style: italic; font-size: 10px;">"${i.recommendation}"</p>
            <ul style="margin: 0; padding-left: 20px; font-size: 9.5px;">
              ${i.checklist.map((item: string) => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        `;
      }
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>CSM Service Quality (SQD) & Services Report</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: black; line-height: 1.4; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 6px; text-align: center; text-transform: uppercase; font-size: 9px; font-weight: bold; }
            td { border: 1px solid black; padding: 6px; }
            h4 { color: #1b6535; border-bottom: 1px solid black; padding-bottom: 3px; margin-top: 25px; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          ${getReportHeaderHtml("Service Quality & Performance Scorecard")}

           <h4>I. ARTA Service Quality Dimensions (SQD) Scorecard</h4>
           <table>
             <thead>
               <tr>
                 <th>SQD Dimension</th>
                 <th style="width: 8%;">Avg Score</th>
                 <th style="width: 8%;">Satisfaction</th>
                 <th style="width: 7%;">SA (5)</th>
                 <th style="width: 7%;">A (4)</th>
                 <th style="width: 7%;">N (3)</th>
                 <th style="width: 7%;">D (2)</th>
                 <th style="width: 7%;">SD (1)</th>
                 <th style="width: 7%;">N/A (0)</th>
               </tr>
             </thead>
             <tbody>
               ${sqdRows}
             </tbody>
           </table>

           ${dssList ? `
             <h4>II. Corrective Action Improvement Directives (DSS Alerts)</h4>
             <div>${dssList}</div>
           ` : ''}

           <h4 style="page-break-before: always;">III. Service-Level Satisfaction Heatmap Matrix</h4>
           <table>
             <thead>
               <tr>
                 <th>Service Provided</th>
                 <th>Campus Site</th>
                 <th style="width: 10%;">Transactions</th>
                 <th style="width: 15%;">Satisfaction %</th>
                 <th style="width: 15%;">Avg SQD Rating</th>
               </tr>
             </thead>
             <tbody>
               ${serviceRows || '<tr><td colspan="5" style="text-align:center;">No services recorded for this period.</td></tr>'}
             </tbody>
           </table>

           <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
         </body>
       </html>
    `);
    printWindow.document.close();
  };

  const handlePrintQualitativeTab = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let paretoRows = '';
    displayStats.paretoData.forEach(p => {
      paretoRows += `
        <tr>
          <td><strong>${p.theme}</strong></td>
          <td style="text-align:center;">${p.count}</td>
          <td style="text-align:center;font-weight:bold;">${p.cumulativePercent}%</td>
        </tr>
      `;
    });

    let commentRows = '';
    filteredComments.forEach((c, idx) => {
      commentRows += `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td style="font-weight:bold;text-transform:uppercase;">${maskName(c.visitorName)}</td>
          <td>"${c.comments}"</td>
          <td style="font-weight:bold;">${c.category}</td>
          <td>${c.campus} &bull; <small style="text-transform:uppercase;color:#555;">${c.type}</small></td>
        </tr>
      `;
    });

    printWindow.document.write(`
      <html>
        <head>
          <title>CSM Qualitative Feedback & Pareto Analysis</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 30px; color: black; line-height: 1.4; font-size: 11px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
            th { background-color: #f2f2f2; border: 1px solid black; padding: 6px; text-align: center; text-transform: uppercase; font-size: 9px; font-weight: bold; }
            td { border: 1px solid black; padding: 6px; }
            h4 { color: #1b6535; border-bottom: 1px solid black; padding-bottom: 3px; margin-top: 20px; text-transform: uppercase; font-size: 10px; }
          </style>
        </head>
        <body>
          ${getReportHeaderHtml("Qualitative Feedbacks & Pareto theme analysis")}

           <h4>I. Pareto Complaint Frequency Theme Analysis</h4>
           <table>
             <thead>
               <tr>
                 <th>Friction Theme / Mapped Dimension</th>
                 <th style="width: 25%;">Frequency count</th>
                 <th style="width: 25%;">Cumulative Percentage</th>
               </tr>
             </thead>
             <tbody>
               ${paretoRows}
             </tbody>
           </table>

           <h4 style="page-break-before: always;">II. Client Feedback Matrix Log</h4>
           <table>
             <thead>
               <tr>
                 <th style="width: 5%;">#</th>
                 <th style="width: 15%;">Client Name</th>
                 <th>Direct Suggestions / Feedbacks</th>
                 <th style="width: 22%;">SQD Theme</th>
                 <th style="width: 22%;">Campus / Client Type</th>
               </tr>
             </thead>
             <tbody>
               ${commentRows || '<tr><td colspan="5" style="text-align:center;">No qualitative comments logged.</td></tr>'}
             </tbody>
           </table>

           <script>window.onload = function() { window.print(); window.onafterprint = function() { window.close(); } }</script>
         </body>
       </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6">
      
      {/* HEADER CONTROLS (Live vs Baseline Data Toggle & Campus / Unit Filters) */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center p-5 bg-gradient-to-r from-emerald-800 to-[#1B6535] rounded-2xl shadow-lg border border-emerald-700 gap-4">
        <div>
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-amber-400 animate-pulse" />
            CSM COMPLIANCE CORE ENGINE
          </h2>
          <p className="text-[10px] text-emerald-100 font-bold uppercase tracking-widest mt-0.5">
            ARTA Harmonized Reporting & Analytics
          </p>
        </div>
        
        {/* Dynamic Filters Grid */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Data Source Toggle */}
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-emerald-100 tracking-wider mb-1">Data Stream</span>
            <Select value={dataSource} onValueChange={(v: any) => setDataSource(v)}>
              <SelectTrigger className="w-[180px] h-9 bg-white font-extrabold text-xs text-slate-800 border-none shadow-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baseline25">📋 FY 2025 Baseline Report</SelectItem>
                <SelectItem value="live">⚡ Live System Logs (Real-time)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campus Selector */}
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-emerald-100 tracking-wider mb-1">Campus Site</span>
            <Select value={localCampusId} onValueChange={(v) => { setLocalCampusId(v); setSelectedUnitId('all'); }} disabled={!hasAccessToAll}>
              <SelectTrigger className="w-[180px] h-9 bg-white font-extrabold text-xs text-slate-800 border-none shadow-md">
                <SelectValue placeholder="University-Wide" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">🏢 University-Wide (All)</SelectItem>
                {campuses.map(c => (
                  <SelectItem key={c.id} value={c.id}>📍 {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Unit Selector */}
          <div className="flex flex-col">
            <span className="text-[9px] font-black uppercase text-emerald-100 tracking-wider mb-1">Office / Unit</span>
            <div className="flex items-center gap-1.5">
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!hasAccessToAll}>
                <SelectTrigger className="w-[180px] h-9 bg-white font-extrabold text-xs text-slate-800 border-none shadow-md">
                  <SelectValue placeholder="All Units/Offices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📁 All Units / Offices</SelectItem>
                  {dropdownUnits.map(u => (
                    <SelectItem key={u.id} value={u.id}>📄 {u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasAccessToAll && (
                <div className="relative">
                  <Input
                    placeholder="Search office..."
                    value={unitSearchQuery}
                    onChange={(e) => setUnitSearchQuery(e.target.value)}
                    className="w-[120px] h-9 bg-white text-[11px] font-extrabold text-slate-800 border-none shadow-md pl-7 focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-slate-400" />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRID TABS */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-slate-100/80 p-1 border shadow-inner rounded-xl w-max flex gap-1 h-10">
          <TabsTrigger value="overview" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Users className="h-3.5 w-3.5" /> Executive Overview
          </TabsTrigger>
          <TabsTrigger value="sqd" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <TrendingUp className="h-3.5 w-3.5" /> Service Quality (SQD)
          </TabsTrigger>
          <TabsTrigger value="qualitative" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <Smile className="h-3.5 w-3.5" /> Qualitative Insights
          </TabsTrigger>
          <TabsTrigger value="exporter" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8">
            <FileText className="h-3.5 w-3.5" /> Official Exporter
          </TabsTrigger>
          {hasAccessToAll && (
            <TabsTrigger value="deployment" className="gap-2 text-[10px] font-black uppercase tracking-wider px-5 h-8 bg-amber-50 text-amber-800 hover:bg-amber-100/50">
              <Radio className="h-3.5 w-3.5" /> Deployment Center
            </TabsTrigger>
          )}
        </TabsList>

        {/* ==================== TAB 1: EXECUTIVE OVERVIEW ==================== */}
        <TabsContent value="overview" className="space-y-6 animate-in fade-in duration-500">
          
          {/* Executive Scorecard Gauge charts */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            
            {/* Satisfaction Gauge */}
            <Card className="shadow-sm border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500" />
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Overall Score</span>
                <ThumbsUp className="h-3.5 w-3.5 text-emerald-600" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-3 pt-1">
                <div className="h-[75px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie
                        data={[{ value: displayStats.overallSatisfactionRate }, { value: 100 - displayStats.overallSatisfactionRate }]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={42}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill="#1b6535" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="absolute bottom-1 text-xl font-black text-slate-800">{displayStats.overallSatisfactionRate}%</span>
                </div>
                <p className="text-[8.5px] text-emerald-600 font-bold uppercase mt-1">Satisfied & Very Satisfied</p>
              </CardContent>
            </Card>

            {/* Participation Gauge */}
            <Card className="shadow-sm border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-[#D4AF37]" />
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Response Rate</span>
                <Percent className="h-3.5 w-3.5 text-[#D4AF37]" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-3 pt-1">
                <div className="h-[75px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie
                        data={[{ value: displayStats.participationRate }, { value: 100 - displayStats.participationRate }]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={42}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill="#D4AF37" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="absolute bottom-1 text-xl font-black text-slate-800">{displayStats.participationRate}%</span>
                </div>
                <p className="text-[8.5px] text-slate-500 font-bold uppercase mt-1">Evaluations per Logged visit</p>
              </CardContent>
            </Card>

            {/* CC1 Gauge */}
            <Card className="shadow-sm border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-blue-500" />
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">CC Awareness</span>
                <HelpCircle className="h-3.5 w-3.5 text-blue-600" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-3 pt-1">
                <div className="h-[75px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie
                        data={[{ value: displayStats.cc1AwarePercent }, { value: 100 - displayStats.cc1AwarePercent }]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={42}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill="#3b82f6" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="absolute bottom-1 text-xl font-black text-slate-800">{displayStats.cc1AwarePercent}%</span>
                </div>
                <p className="text-[8.5px] text-blue-600 font-bold uppercase mt-1">Charter Awareness</p>
              </CardContent>
            </Card>

            {/* CC2 Gauge */}
            <Card className="shadow-sm border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-purple-500" />
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">CC Visibility</span>
                <Info className="h-3.5 w-3.5 text-purple-600" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-3 pt-1">
                <div className="h-[75px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie
                        data={[{ value: displayStats.cc2VisibilityPercent }, { value: 100 - displayStats.cc2VisibilityPercent }]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={42}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill="#a855f7" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="absolute bottom-1 text-xl font-black text-slate-800">{displayStats.cc2VisibilityPercent}%</span>
                </div>
                <p className="text-[8.5px] text-purple-600 font-bold uppercase mt-1">Easy / Somewhat Easy to see</p>
              </CardContent>
            </Card>

            {/* CC3 Gauge */}
            <Card className="shadow-sm border-slate-200/80 flex flex-col justify-between overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1 bg-rose-500" />
              <CardHeader className="pb-1 pt-3 flex flex-row items-center justify-between">
                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">CC Helpfulness</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-rose-600" />
              </CardHeader>
              <CardContent className="flex flex-col items-center pb-3 pt-1">
                <div className="h-[75px] w-full flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height={80}>
                    <PieChart>
                      <Pie
                        data={[{ value: displayStats.cc3HelpfulnessPercent }, { value: 100 - displayStats.cc3HelpfulnessPercent }]}
                        cx="50%" cy="100%"
                        startAngle={180} endAngle={0}
                        innerRadius={30} outerRadius={42}
                        dataKey="value" stroke="none"
                      >
                        <Cell fill="#ec4899" />
                        <Cell fill="#e2e8f0" />
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <span className="absolute bottom-1 text-xl font-black text-slate-800">{displayStats.cc3HelpfulnessPercent}%</span>
                </div>
                <p className="text-[8.5px] text-rose-600 font-bold uppercase mt-1">Helped Transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Print score card bar */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200/85 gap-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-[#D4AF37]" />
              <span className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
                CSM Overview & Demographics metrics. Generate reports for the current filters.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handlePrintScorecard} variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest px-4">
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Scorecard
              </Button>
              <Button size="sm" onClick={handlePrintOverviewTab} className="h-8 text-[9px] font-black uppercase tracking-widest px-4 bg-emerald-700 hover:bg-emerald-800 border-none text-white">
                <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Overview Report
              </Button>
            </div>
          </div>

          {/* Demographics Donuts & Stacked Charts grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Sex Donut */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Sex Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[180px] w-full flex items-center justify-center">
                  {displayStats.demographics.sexData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayStats.demographics.sexData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={70}
                          paddingAngle={3} dataKey="value"
                        >
                          {displayStats.demographics.sexData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-muted-foreground">No demographics logged</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] border-t pt-3 font-semibold text-slate-600">
                  {displayStats.demographics.sexData.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.fill }} />{e.name}</span>
                      <span className="font-bold">{e.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Type Donut */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Customer Types</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[180px] w-full flex items-center justify-center">
                  {displayStats.demographics.clientTypeData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayStats.demographics.clientTypeData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={70}
                          paddingAngle={3} dataKey="value"
                        >
                          {displayStats.demographics.clientTypeData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-muted-foreground">No demographics logged</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[9px] border-t pt-3 font-semibold text-slate-650">
                  {displayStats.demographics.clientTypeData.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.fill }} />{e.name}</span>
                      <span className="font-bold">{e.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Internal vs External Stakeholders */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Stakeholder Classification</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[180px] w-full flex items-center justify-center">
                  {displayStats.demographics.stakeholderData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={displayStats.demographics.stakeholderData}
                          cx="50%" cy="50%"
                          innerRadius={50} outerRadius={70}
                          paddingAngle={3} dataKey="value"
                        >
                          {displayStats.demographics.stakeholderData.map((e, i) => (
                            <Cell key={i} fill={e.fill} />
                          ))}
                        </Pie>
                        <RechartsTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <span className="text-xs text-muted-foreground">No demographics logged</span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[10px] border-t pt-3 font-semibold text-slate-650">
                  {displayStats.demographics.stakeholderData.map((e, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: e.fill }} />{e.name}</span>
                      <span className="font-bold">{e.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Age & Campus Distributions horizontal bars */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Age Distribution */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Age Bracket Distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={displayStats.demographics.age} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Bar dataKey="value" fill="hsl(var(--chart-1))" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: '9px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Campus distribution */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">Campus distribution</CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={displayStats.demographics.campusData} layout="vertical" margin={{ left: 40, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 'bold' }} width={80} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="value" position="right" style={{ fontSize: '8px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Citizen's Charter 100% Stacked Bar chart */}
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3">
              <CardTitle className="text-xs font-black uppercase text-slate-700">
                Citizen's Charter (CC) Option Stack Distribution (100% Stacked)
              </CardTitle>
              <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                Compliance ratios mapped by positive, compliant, neutral, and unaware options.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={displayStats.ccStackedData} layout="vertical" margin={{ left: 60, right: 20, top: 10, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={v => `${v}%`} />
                  <YAxis dataKey="dimension" type="category" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                  <Bar dataKey="Option 1" stackId="a" fill="#1b6535" name="Excellent compliance (5/4)" />
                  <Bar dataKey="Option 2" stackId="a" fill="#4ade80" name="Good compliance (3)" />
                  <Bar dataKey="Option 3" stackId="a" fill="#e2e8f0" name="Neutral (2)" />
                  <Bar dataKey="Option 4" stackId="a" fill="#fb923c" name="Under-performing / Unaware (1)" />
                  <Bar dataKey="Option 5" stackId="a" fill="#e11d48" name="N/A" />
                  <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '10px' }} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 2: SERVICE QUALITY (SQD) & SERVICES ==================== */}
        <TabsContent value="sqd" className="space-y-6 animate-in fade-in duration-500">
          
          {/* Print SQD Report bar */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200/85 gap-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
                Format and print the SQD dimensions audit and services performance heatmap list.
              </span>
            </div>
            <Button size="sm" onClick={handlePrintSqdTab} className="h-8 text-[9px] font-black uppercase tracking-widest px-4">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print SQD Audit
            </Button>
          </div>
          
          {/* Charts grid: Diverging Stacked Bar & Radar Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Diverging Stacked Bar Chart */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">
                  Diverging Stacked Likert Sentiment Distribution
                </CardTitle>
                <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                  Centers around Neutral sentiment (X = 0) with negative ratings left and positive ratings right.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <ResponsiveContainer width="100%" height={380}>
                  <BarChart data={divergingData} layout="vertical" stackOffset="sign" margin={{ left: 30, right: 20, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} strokeOpacity={0.2} />
                    <XAxis type="number" tickFormatter={(v) => `${Math.abs(v)}%`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontWeight: 'bold' }} width={45} />
                    <RechartsTooltip formatter={(v: any) => `${Math.abs(Math.round(v))}%`} />
                    <Legend 
                      wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '10px' }}
                      formatter={(value) => value.replace(' (Neg)', '').replace(' (Pos)', '')}
                    />
                    <Bar dataKey="Strongly Disagree" stackId="a" fill="#e11d48" name="Strongly Disagree" />
                    <Bar dataKey="Disagree" stackId="a" fill="#fb923c" name="Disagree" />
                    <Bar dataKey="Neutral (Neg)" stackId="a" fill="#94a3b8" name="Neutral" />
                    <Bar dataKey="Neutral (Pos)" stackId="a" fill="#64748b" name="Neutral" />
                    <Bar dataKey="Agree" stackId="a" fill="#4ade80" name="Agree" />
                    <Bar dataKey="Strongly Agree" stackId="a" fill="#1b6535" name="Strongly Agree" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Radar Spider Chart */}
            <Card className="shadow-md border-slate-200/80">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">
                  SQD dimension satisfaction profile
                </CardTitle>
                <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                  Spider chart mapping final calculated satisfaction rates per dimension.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 flex justify-center items-center">
                <ResponsiveContainer width="100%" height={320}>
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                    <PolarGrid strokeOpacity={0.2} />
                    <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <Radar name="Satisfaction Index %" dataKey="Score" stroke="#1b6535" fill="#1b6535" fillOpacity={0.3}>
                      <LabelList dataKey="Score" position="top" style={{ fontSize: '8px', fontWeight: 'bold', fill: '#1b6535' }} formatter={(v: any) => `${v}%`} />
                    </Radar>
                    <RechartsTooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Decision Support System triggers */}
          {dssInsights.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/10 shadow-sm">
              <CardHeader className="bg-amber-100/40 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-amber-800 flex items-center gap-2">
                  <ShieldCheck className="h-4.5 w-4.5 text-amber-700" />
                  Corrective DSS Recommendations (Alerts under 85% satisfaction)
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dssInsights.map(insight => (
                    <div key={insight.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-2.5">
                      <div className="flex items-center justify-between border-b pb-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-800 tracking-tight">{insight.name}</span>
                        {insight.id !== 99 ? (
                          <Badge variant="destructive" className="text-[8px] uppercase font-black px-1.5 py-0.5">
                            {insight.positivePercent}% Positive
                          </Badge>
                        ) : (
                          <Badge className="bg-rose-500 text-white text-[8px] uppercase font-black px-1.5 py-0.5 border-none">
                            Warning
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10.5px] font-bold text-slate-600 italic">"{insight.recommendation}"</p>
                      <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] font-black uppercase text-amber-800 tracking-wider">Corrective Action Plan Checklist:</span>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {insight.checklist.map((item: string, idx: number) => (
                            <li key={idx} className="text-[9.5px] font-medium text-slate-700 leading-tight">{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Service Quality score tables & heatmap */}
          <Card className="shadow-md border-slate-200/80">
            <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xs font-black uppercase text-slate-700">
                  Service-Level Satisfaction Index Matrix (Heatmap)
                </CardTitle>
                <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                  Heatmap formatting alerts administrators immediately to underperforming services.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search service name or campus..."
                  value={serviceSearch}
                  onChange={(e) => {
                    setServiceSearch(e.target.value);
                    setServicePage(0);
                  }}
                  className="h-8 text-xs font-bold w-[250px] bg-white border-slate-200"
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase pl-4">Service Provided</TableHead>
                    <TableHead className="font-black text-[10px] uppercase">Campus site</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-center">Transactions</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-center">Satisfaction Rate</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-center">Average Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedServices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs font-bold text-slate-400 uppercase italic">
                        No service transactions logged matching criteria.
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedServices.map((svc, idx) => {
                      // Heatmap color code rules: green for >=95, yellow for 90-94, red for <89
                      let heatClass = "bg-emerald-50 text-emerald-800 border-emerald-200";
                      if (svc.satisfactionRate < 89) {
                        heatClass = "bg-rose-50 text-rose-800 border-rose-200";
                      } else if (svc.satisfactionRate >= 90 && svc.satisfactionRate <= 94) {
                        heatClass = "bg-amber-50 text-amber-800 border-amber-250";
                      }

                      return (
                        <TableRow key={idx} className="hover:bg-slate-50/50">
                          <TableCell className="pl-4 py-3 font-extrabold text-xs text-slate-700">
                            {svc.name.toUpperCase()}
                          </TableCell>
                          <TableCell className="text-xs font-bold text-slate-500 uppercase">{svc.campus}</TableCell>
                          <TableCell className="text-center text-xs font-bold text-slate-650">{svc.count}</TableCell>
                          <TableCell className="text-center py-3">
                            <span className={`px-2.5 py-1 rounded-full border text-[10px] font-black uppercase ${heatClass}`}>
                              {svc.satisfactionRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs font-bold text-slate-650">{svc.avgRating} / 5.0</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {filteredServices.length > servicePageSize && (
                <div className="flex justify-end items-center gap-2 p-3 border-t bg-slate-50/40">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={servicePage === 0} 
                    onClick={() => setServicePage(p => p - 1)}
                    className="h-8 text-[9.5px] font-black uppercase"
                  >
                    Previous
                  </Button>
                  <span className="text-[10px] font-bold text-slate-500">
                    Page {servicePage + 1} of {Math.ceil(filteredServices.length / servicePageSize)}
                  </span>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    disabled={(servicePage + 1) * servicePageSize >= filteredServices.length} 
                    onClick={() => setServicePage(p => p + 1)}
                    className="h-8 text-[9.5px] font-black uppercase"
                  >
                    Next
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TAB 3: QUALITATIVE INSIGHTS ==================== */}
        <TabsContent value="qualitative" className="space-y-6 animate-in fade-in duration-500">
          
          {/* Print Qualitative Feedback bar */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-xl border border-slate-200/85 gap-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
                Format and print the Pareto complaints analytics and qualitative suggestions logs.
              </span>
            </div>
            <Button size="sm" onClick={handlePrintQualitativeTab} className="h-8 text-[9px] font-black uppercase tracking-widest px-4">
              <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Feedback Logs
            </Button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Pareto Chart for comments count */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-2">
              <CardHeader className="bg-slate-50/50 border-b py-3">
                <CardTitle className="text-xs font-black uppercase text-slate-700">
                  Pareto Analysis of Qualitative Friction Themes
                </CardTitle>
                <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                  Shows frequency of complaints per theme (bars, left axis) and cumulative percentage (line, right axis).
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ResponsiveContainer width="100%" height={320}>
                  <ComposedChart data={displayStats.paretoData} margin={{ left: 10, right: 10, top: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} strokeOpacity={0.2} />
                    <XAxis dataKey="theme" tick={{ fontSize: 9, fontWeight: 'bold' }} />
                    <YAxis yAxisId="left" tick={{ fontSize: 9 }} label={{ value: 'Complaints count', angle: -90, position: 'insideLeft', fontSize: 9, fontWeight: 'bold' }} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} domain={[0, 100]} label={{ value: 'Cumulative %', angle: 90, position: 'insideRight', fontSize: 9, fontWeight: 'bold' }} />
                    <RechartsTooltip />
                    <Bar dataKey="count" fill="hsl(var(--primary))" yAxisId="left" name="Count of Complaints" radius={[3, 3, 0, 0]} barSize={40} />
                    <Line dataKey="cumulativePercent" stroke="hsl(var(--destructive))" strokeWidth={2.5} yAxisId="right" name="Cumulative Percentage" dot={{ fill: 'hsl(var(--destructive))' }} />
                    <Legend wrapperStyle={{ fontSize: '9px', textTransform: 'uppercase', fontWeight: 'bold', paddingTop: '15px' }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Categorized Matrix Feed */}
            <Card className="shadow-md border-slate-200/80 lg:col-span-1 flex flex-col justify-between">
              <CardHeader className="bg-slate-50/50 border-b py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-xs font-black uppercase text-slate-700">
                    Qualitative Matrix Feed
                  </CardTitle>
                  <CardDescription className="text-[9.5px] font-bold uppercase text-slate-500">
                    Client comments mapped to SQD dimensions.
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search comments..."
                    value={commentSearch}
                    onChange={(e) => setCommentSearch(e.target.value)}
                    className="h-8 text-xs font-bold w-[160px] bg-white border-slate-200"
                  />
                </div>
              </CardHeader>
              <CardContent className="pt-4 flex-1 p-0">
                <ScrollArea className="h-[320px] bg-slate-50/20 p-4">
                  {filteredComments.length > 0 ? (
                    <div className="space-y-3">
                      {filteredComments.map((comment, idx) => (
                        <div key={idx} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1.5">
                          <div className="flex justify-between items-start border-b pb-1">
                            <span className="text-xs font-black text-[#1B6535] uppercase">
                              {maskName(comment.visitorName)}
                            </span>
                            <Badge className="bg-slate-100 text-slate-800 border-none text-[8.5px] font-black uppercase">
                              {comment.category.split(' ')[0]}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-700 italic font-semibold">"{comment.comments}"</p>
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                            {comment.campus} &bull; {comment.type}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10 opacity-30 text-xs font-bold uppercase italic">
                      No customer comments logged matching criteria.
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TAB 4: OFFICIAL EXPORTER ==================== */}
        <TabsContent value="exporter" className="space-y-6 animate-in fade-in duration-500">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Harmonized Agency Report Card */}
            <Card className="shadow-md border-slate-200/85 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-emerald-600" />
              <CardHeader className="pb-2 pt-5">
                <span className="text-[9px] font-black uppercase text-[#1B6535] tracking-widest">Mandated ARTA Output</span>
                <CardTitle className="text-sm font-black uppercase text-slate-800 mt-1">
                  Harmonized CSM Agency Report
                </CardTitle>
                <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                  Annual agency scorecard with Methodology, CC Awareness analysis, and overall service scoring.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[11px] text-slate-550 leading-relaxed pt-2">
                Compiles the consolidated survey evaluations into the layout required for submissions to the Anti-Red Tape Authority (ARTA). Includes structured Methodology, CC tables, and SQD interpretations.
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-400">PDF / Print-ready</span>
                <Button size="sm" onClick={handlePrintHarmonizedReport} className="h-8 text-[9px] font-black uppercase tracking-wider">
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print / Export
                </Button>
              </CardFooter>
            </Card>

            {/* Campus specific performance Card */}
            <Card className="shadow-md border-slate-200/85 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-blue-600" />
              <CardHeader className="pb-2 pt-5">
                <span className="text-[9px] font-black uppercase text-blue-600 tracking-widest">Regional breakdown</span>
                <CardTitle className="text-sm font-black uppercase text-slate-800 mt-1">
                  Campus Performance Export
                </CardTitle>
                <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                  Targeted evaluations details filtered specifically for Campus Directors.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[11px] text-slate-550 leading-relaxed pt-2">
                Generates a report isolation specifically for local campuses. Extracts only the transactions, satisfaction rate indices, and qualitative suggestions scoped to Campus Directors (e.g. Cajidiocan).
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4 flex flex-col items-stretch gap-2.5">
                <div className="flex justify-between items-center text-[9px] font-black text-slate-400 uppercase">
                  <span>Target Campus</span>
                  <span>Isolation Print</span>
                </div>
                <div className="flex gap-2">
                  <Select defaultValue="Main Campus" id="campus-specific-select">
                    <SelectTrigger className="h-8 bg-white text-[10px] font-bold w-full">
                      <SelectValue placeholder="Select Campus" />
                    </SelectTrigger>
                    <SelectContent>
                      {campuses.map(c => (
                        <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      const selectEl = document.getElementById('campus-specific-select');
                      const selectedVal = selectEl?.getAttribute('data-value') || activeCampusName === 'all' ? 'Main Campus' : activeCampusName;
                      // Fallback selection finder: we can just grab from selector or active campus
                      handlePrintCampusReport(selectedVal);
                    }} 
                    className="h-8 text-[9px] font-black uppercase tracking-wider px-3 bg-blue-600 hover:bg-blue-700 border-none"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardFooter>
            </Card>

            {/* CAIP matrix Card */}
            <Card className="shadow-md border-slate-200/85 overflow-hidden relative">
              <div className="absolute top-0 left-0 w-full h-1.5 bg-[#D4AF37]" />
              <CardHeader className="pb-2 pt-5">
                <span className="text-[9px] font-black uppercase text-amber-700 tracking-widest">Quality improvement</span>
                <CardTitle className="text-sm font-black uppercase text-slate-800 mt-1">
                  Improvement Plan (CAIP) Matrix
                </CardTitle>
                <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                  Action plans matrix matching RSU CSM findings to target schedules.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-[11px] text-slate-550 leading-relaxed pt-2">
                Compiles the Continuous Agency Improvement Plan tracking matrix containing targeted satisfaction goals, QR kiosk system deployment status, and customer service seminars schedules.
              </CardContent>
              <CardFooter className="border-t bg-slate-50/50 p-4 flex justify-between items-center">
                <span className="text-[9px] font-black uppercase text-slate-400">Target Year: 2026</span>
                <Button size="sm" onClick={handlePrintCaipReport} className="h-8 text-[9px] font-black uppercase tracking-wider bg-amber-600 hover:bg-amber-700 border-none">
                  <Printer className="h-3.5 w-3.5 mr-1" /> Print Matrix
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

        {/* ==================== TAB 5: DEPLOYMENT CENTER (Admin/IPDO only) ==================== */}
        {hasAccessToAll && (
          <TabsContent value="deployment" className="space-y-6 animate-in fade-in duration-500">
            
            {/* Admin Drilldown selectors */}
            <Card className="border-slate-200/85 shadow-sm bg-slate-50/40">
              <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Drill Down Unit / Office</span>
                    <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                      <SelectTrigger className="w-[280px] h-9 bg-white font-extrabold text-xs shadow-sm">
                        <SelectValue placeholder="System-Wide Overview" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">🏢 System-Wide Overview</SelectItem>
                        {dropdownUnits.map(unit => (
                          <SelectItem key={unit.id} value={unit.id}>
                            📄 {unit.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedUnitId !== 'all' && (
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">Approval Status</span>
                      <div className="flex items-center gap-2 h-9">
                        {isUnitApproved ? (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[9px] font-black uppercase h-7 px-2">
                            <CheckCircle2 className="h-3 w-3 mr-1" /> Approved for Unit
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-[9px] font-black uppercase text-slate-500 h-7 px-2">
                            <Info className="h-3 w-3 mr-1" /> Pending Approval
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {selectedUnitId !== 'all' && (
                  <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                    <Button
                      size="sm"
                      variant={isUnitApproved ? "destructive" : "default"}
                      disabled={isUpdatingApproval}
                      onClick={handleToggleUnitApproval}
                      className="h-9 text-[10px] font-black uppercase tracking-wider px-4 shadow-sm"
                    >
                      {isUpdatingApproval ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                      ) : isUnitApproved ? (
                        <XCircle className="h-3.5 w-3.5 mr-1.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                      )}
                      {isUnitApproved ? "Recall Report" : "Approve & Deploy"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rankings Benchmarks Table */}
            {unitBenchmarks.length > 0 && (
              <Card className="shadow-md border-slate-200/80 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b py-3.5">
                  <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-700">
                    <Building2 className="h-4 w-4 text-primary" />
                    Unit Client Satisfaction Benchmarks & Rankings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="font-black text-[10px] uppercase pl-4">Unit / Office</TableHead>
                        <TableHead className="font-black text-[10px] uppercase">Campus Site</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Logged Visitors</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">CSM Responses</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Engagement</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Satisfaction Rate</TableHead>
                        <TableHead className="font-black text-[10px] uppercase text-center">Avg SQD Score</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitBenchmarks.map(u => (
                        <TableRow key={u.id} className="hover:bg-slate-50/50">
                          <TableCell className="pl-4 py-3 font-bold text-xs text-slate-800">{u.name}</TableCell>
                          <TableCell className="text-xs font-bold text-slate-500 uppercase">{u.campuses}</TableCell>
                          <TableCell className="text-center font-bold text-xs text-slate-600">{u.totalVisitors}</TableCell>
                          <TableCell className="text-center font-bold text-xs text-slate-600">{u.totalResponses}</TableCell>
                          <TableCell className="text-center font-bold text-xs">
                            <span className={u.participationRate >= 30 ? 'text-slate-800 font-bold' : 'text-amber-600 font-black'}>
                              {u.participationRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-black text-xs">
                            <span className={u.satisfactionRate >= 85 ? 'text-emerald-600' : 'text-rose-600'}>
                              {u.satisfactionRate}%
                            </span>
                          </TableCell>
                          <TableCell className="text-center font-bold text-xs text-slate-650">{u.avgRating}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Deployments Center publish cycle controls */}
            <Card className="border-slate-200/80 shadow-md">
              <CardHeader className="bg-slate-50/40 border-b py-3.5">
                <div className="flex items-center gap-2 mb-1">
                  <Radio className="h-4.5 w-4.5 text-primary" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Cycle deployment Manager</span>
                </div>
                <CardTitle className="text-sm font-black uppercase text-slate-800">CSM Unit Deployment Center</CardTitle>
                <CardDescription className="text-[10px] font-semibold text-slate-500 uppercase mt-0.5">
                  Publish or recall Client Satisfaction Monitoring reports. Deployed periods become visible for all units to view and print.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 p-0">
                {cycles && cycles.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase pl-4">Academic Period</TableHead>
                        <TableHead className="text-[10px] font-black uppercase">Cycle</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-center">Status</TableHead>
                        <TableHead className="text-[10px] font-black uppercase text-right pr-4">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...cycles].sort((a,b) => b.year - a.year || b.name.localeCompare(a.name)).map(cycle => {
                        const dId = `${cycle.year}-${cycle.name}`;
                        const isPublished = deploymentsMap.get(dId) || false;
                        const isDeploying = deployingCycleIds[dId] || false;

                        return (
                          <TableRow key={dId} className="hover:bg-slate-50">
                            <TableCell className="font-bold text-xs pl-4">AY {cycle.year}</TableCell>
                            <TableCell className="font-bold text-xs uppercase text-slate-600">{cycle.name} Cycle</TableCell>
                            <TableCell className="text-center font-bold text-xs">
                              {isPublished ? (
                                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[8.5px] uppercase font-black">
                                  <CheckCircle2 className="h-3 w-3 mr-1" /> Deployed
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[8.5px] uppercase font-black text-slate-500">
                                  <Radio className="h-3 w-3 mr-1" /> Draft / Hidden
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right pr-4">
                              <Button
                                size="sm"
                                variant={isPublished ? "destructive" : "default"}
                                disabled={isDeploying}
                                onClick={() => handleTogglePublishCycle(cycle, isPublished)}
                                className="text-[8.5px] font-black uppercase tracking-widest h-8 px-4"
                              >
                                {isDeploying ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
                                ) : isPublished ? (
                                  <XCircle className="h-3.5 w-3.5 mr-1.5" />
                                ) : (
                                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                {isPublished ? "Recall" : "Deploy"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center text-xs font-bold text-muted-foreground uppercase">
                    No academic cycles defined in the system.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// Chart container component wrapper
function ChartContainer({ children, className }: any) {
  return <div className={className}>{children}</div>;
}
