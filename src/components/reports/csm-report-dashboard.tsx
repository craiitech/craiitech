'use client';

import { useMemo, useState } from 'react';
import type { Campus, Unit, User as AppUser } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  LabelList
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
  Loader2
} from 'lucide-react';
import { useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CsmDeployment } from '@/lib/types';

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
}: CsmReportDashboardProps) {

  const hasAccessToAll = isAdmin || isCsmManager;

  const [selectedUnitId, setSelectedUnitId] = useState<string>('all');
  const [isUpdatingApproval, setIsUpdatingApproval] = useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  // Filter units based on selected campus
  const dropdownUnits = useMemo(() => {
    if (!units) return [];
    if (!selectedCampusId || selectedCampusId === 'all') return units.sort((a,b) => a.name.localeCompare(b.name));
    return units.filter(u => u.campusIds?.includes(selectedCampusId)).sort((a,b) => a.name.localeCompare(b.name));
  }, [units, selectedCampusId]);

  // Reset selected unit if campus changes and it's no longer in the list
  useMemo(() => {
    if (selectedUnitId !== 'all') {
      const belongs = dropdownUnits.some(u => u.id === selectedUnitId);
      if (!belongs) {
        setSelectedUnitId('all');
      }
    }
  }, [dropdownUnits, selectedUnitId]);

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

  // 1. FILTER RESPONSES
  const filteredResponses = useMemo(() => {
    if (!csmResponses) return [];
    return csmResponses.filter(res => {
      const date = res.createdAt?.toDate ? res.createdAt.toDate() : new Date(res.createdAt);
      const resYear = date.getFullYear();
      
      const matchesYear = resYear === selectedYear;
      const matchesCampus = !selectedCampusId || selectedCampusId === 'all' || res.campusId === selectedCampusId;
      
      const matchesUnit = hasAccessToAll
        ? (selectedUnitId === 'all' ? true : res.unitId === selectedUnitId)
        : res.unitId === userProfile?.unitId;
      
      return matchesYear && matchesCampus && matchesUnit;
    });
  }, [csmResponses, selectedYear, selectedCampusId, hasAccessToAll, selectedUnitId, userProfile]);

  // 2. FILTER VISITOR LOGS
  const filteredVisitorLogs = useMemo(() => {
    if (!visitorLogs) return [];
    return visitorLogs.filter(log => {
      const date = log.createdAt?.toDate ? log.createdAt.toDate() : new Date(log.createdAt);
      const logYear = date.getFullYear();
      
      const matchesYear = logYear === selectedYear;
      const matchesCampus = !selectedCampusId || selectedCampusId === 'all' || log.campusId === selectedCampusId;
      
      const matchesUnit = hasAccessToAll
        ? (selectedUnitId === 'all' ? true : log.unitId === selectedUnitId)
        : log.unitId === userProfile?.unitId;
      
      return matchesYear && matchesCampus && matchesUnit;
    });
  }, [visitorLogs, selectedYear, selectedCampusId, hasAccessToAll, selectedUnitId, userProfile]);

  // 3. STATS CALCULATIONS
  const totalResponses = filteredResponses.length;
  const totalVisitors = filteredVisitorLogs.length;

  const participationRate = useMemo(() => {
    if (totalVisitors === 0) return 0;
    return Math.round((totalResponses / totalVisitors) * 100);
  }, [totalResponses, totalVisitors]);

  // Calculate Overall Satisfaction (Agree or Strongly Agree count / Total Ratings)
  const overallSatisfactionRate = useMemo(() => {
    if (totalResponses === 0) return 0;
    let totalSqdRatingsCount = 0;
    let positiveRatingsCount = 0;

    filteredResponses.forEach(res => {
      for (let i = 1; i <= 8; i++) {
        const rating = res[`sqd${i}`];
        if (rating > 0 && rating <= 5) {
          totalSqdRatingsCount++;
          if (rating >= 4) {
            positiveRatingsCount++;
          }
        }
      }
    });

    if (totalSqdRatingsCount === 0) return 0;
    return Math.round((positiveRatingsCount / totalSqdRatingsCount) * 100);
  }, [filteredResponses, totalResponses]);

  // Citizen's Charter Stats
  const ccStats = useMemo(() => {
    const counts = { cc1: [0, 0, 0, 0, 0], cc2: [0, 0, 0, 0, 0, 0], cc3: [0, 0, 0, 0, 0] };
    filteredResponses.forEach(res => {
      const c1 = Number(res.cc1 || 0);
      const c2 = Number(res.cc2 || 0);
      const c3 = Number(res.cc3 || 0);

      if (c1 >= 1 && c1 <= 4) counts.cc1[c1]++;
      if (c2 >= 1 && c2 <= 5) counts.cc2[c2]++;
      if (c3 >= 1 && c3 <= 4) counts.cc3[c3]++;
    });

    const cc1Total = filteredResponses.length;
    const cc1AwareCount = counts.cc1[1] + counts.cc1[2] + counts.cc1[3];
    const cc1AwarePercent = cc1Total > 0 ? Math.round((cc1AwareCount / cc1Total) * 100) : 0;

    return {
      cc1: counts.cc1,
      cc2: counts.cc2,
      cc3: counts.cc3,
      cc1AwarePercent,
    };
  }, [filteredResponses]);

  // 4. SQD DETAILED PERFORMANCE
  const sqdData = useMemo(() => {
    const dims = [
      { id: 1, name: "SQD1. Responsiveness", key: "sqd1", desc: "Spent reasonable amount of time" },
      { id: 2, name: "SQD2. Reliability", key: "sqd2", desc: "Followed charter steps/requirements" },
      { id: 3, name: "SQD3. Access & Facilities", key: "sqd3", desc: "Clean, comfortable, and accessible office" },
      { id: 4, name: "SQD4. Communication", desc: "Clear guidelines and friendly explanations", key: "sqd4" },
      { id: 5, name: "SQD5. Costs", key: "sqd5", desc: "Fees paid were just and reasonable" },
      { id: 6, name: "SQD6. Integrity", key: "sqd6", desc: "Free from corruption and under-the-table actions" },
      { id: 7, name: "SQD7. Assurance", key: "sqd7", desc: "Felt safe, staff was professional and courteous" },
      { id: 8, name: "SQD8. Outcome", key: "sqd8", desc: "Office delivered the requested service/result" }
    ];

    return dims.map(dim => {
      let sum = 0;
      let count = 0;
      let posCount = 0; // rating 4 or 5
      const counts = [0, 0, 0, 0, 0, 0]; // index 0=N/A, 1=SD, 2=D, 3=N, 4=A, 5=SA

      filteredResponses.forEach(res => {
        const rating = Number(res[dim.key] || 0);
        if (rating === 0) {
          counts[0]++;
        } else if (rating >= 1 && rating <= 5) {
          counts[rating]++;
          sum += rating;
          count++;
          if (rating >= 4) {
            posCount++;
          }
        }
      });

      const avg = count > 0 ? Number((sum / count).toFixed(2)) : 0;
      const positivePercent = count > 0 ? Math.round((posCount / count) * 100) : 0;

      return {
        ...dim,
        avg,
        positivePercent,
        totalValid: count,
        counts,
      };
    });
  }, [filteredResponses]);

  // 5. DECISION SUPPORT ENGINE (DSS)
  const dssInsights = useMemo(() => {
    const alerts: any[] = [];

    sqdData.forEach(sqd => {
      if (sqd.totalValid > 3 && sqd.positivePercent < 85) {
        let recommendation = "";
        let checklist: string[] = [];

        switch(sqd.id) {
          case 1: // Responsiveness
            recommendation = "Low speed of transaction identified. Immediate staff rescheduling and queue reviews are recommended.";
            checklist = [
              "Audit typical transaction duration and identify bottlenecks.",
              "Adjust workforce shifts to increase counters during peak hours (e.g. 10 AM - 2 PM).",
              "Review documentation checklists to avoid repeated client queueing."
            ];
            break;
          case 2: // Reliability
            recommendation = "Process reliability issue. The office procedures may not be matching the Citizen's Charter.";
            checklist = [
              "Review the physical Citizen's Charter board and compare it with the active steps frontline staff enforce.",
              "Conduct workflow refresher training for frontline personnel.",
              "Establish a checklist validator tool to ensure all steps are followed strictly."
            ];
            break;
          case 3: // Access & Facilities
            recommendation = "Office environment, cleanliness, or layout needs improvement.";
            checklist = [
              "Conduct restroom cleanliness audits and establish regular janitorial cleaning logs.",
              "Inspect airconditioning units and lobby seating capacities.",
              "Ensure directional signs are placed at major lobby entry points."
            ];
            break;
          case 4: // Communication
            recommendation = "Communication gaps identified. Guidelines are not clear to visitors.";
            checklist = [
              "Prepare and distribute visual one-page brochures outlining transaction requirements.",
              "Designate a public assistance officer or information desk guide in the lobby.",
              "Standardize language in rejection messages or deficiency letters."
            ];
            break;
          case 5: // Costs
            recommendation = "Transaction cost dissatisfaction. Verify fee visibility and justification.";
            checklist = [
              "Ensure official fee schedules matching the Citizen's Charter are posted conspicuously near the cashier.",
              "Provide detailed receipts breaking down all charges.",
              "Review whether payment channels can be digitalized to lower convenience fees."
            ];
            break;
          case 6: // Integrity
            recommendation = "WARNING: Safety or integrity indicators flagged by clients.";
            checklist = [
              "Mandate ARTA Ease of Doing Business (R.A. 11032) seminar refreshers for all unit staff.",
              "Review the unit's document routing trails to ensure transparency.",
              "Ensure feedback boxes for confidential integrity logs are visible and lockable."
            ];
            break;
          case 7: // Assurance
            recommendation = "Staff professional courtesy or service sensitivity requires attention.";
            checklist = [
              "Schedule customer service excellence or values orientation training for frontline workers.",
              "Implement standard greeting scripts and guidelines.",
              "Review administrative logs for customer complaints."
            ];
            break;
          case 8: // Outcome
            recommendation = "Transaction outcome failure or rejection explanation is unsatisfactory.";
            checklist = [
              "Establish a transparent 'deficiency explanation form' that outlines why request was denied and how to resolve it.",
              "Audit success rate ratios of submitted service applications.",
              "Review application requirements list to ensure they are not unnecessarily burdensome."
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

    // Low Participation warning
    if (totalVisitors > 20 && participationRate < 30) {
      alerts.push({
        id: 99,
        name: "Low Survey Participation",
        recommendation: `Only ${participationRate}% of checked-out visitors submitted feedback. The unit's kiosk may be being bypassed.`,
        checklist: [
          "Ensure the logbook computer/tablet screen is directly in front of visitors checking out.",
          "Train reception personnel to politely request feedback completion upon checking visitors out.",
          "Check if the logbook checkout kiosk is operating in fullscreen kiosk mode."
        ]
      });
    }

    return alerts;
  }, [sqdData, totalVisitors, participationRate]);

  // 6. UNIT BENCHMARKING (For Admin/IPDU only)
  const unitBenchmarks = useMemo(() => {
    if (!hasAccessToAll || !units) return [];

    // Group CSM Responses by Unit
    const resByUnit = new Map<string, any[]>();
    filteredResponses.forEach(res => {
      const list = resByUnit.get(res.unitId) || [];
      list.push(res);
      resByUnit.set(res.unitId, list);
    });

    // Group logs by Unit
    const logsByUnit = new Map<string, any[]>();
    filteredVisitorLogs.forEach(log => {
      const list = logsByUnit.get(log.unitId) || [];
      list.push(log);
      logsByUnit.set(log.unitId, list);
    });

    return units.map(unit => {
      const uResponses = resByUnit.get(unit.id) || [];
      const uLogs = logsByUnit.get(unit.id) || [];

      // Calculate unit satisfaction
      let ratingCount = 0;
      let posCount = 0;
      let ratingSum = 0;

      uResponses.forEach(res => {
        for (let i = 1; i <= 8; i++) {
          const rating = res[`sqd${i}`];
          if (rating > 0 && rating <= 5) {
            ratingCount++;
            ratingSum += rating;
            if (rating >= 4) {
              posCount++;
            }
          }
        }
      });

      const totalUResponses = uResponses.length;
      const totalULogs = uLogs.length;
      const uParticipationRate = totalULogs > 0 ? Math.round((totalUResponses / totalULogs) * 100) : 0;
      const uSatisfactionRate = ratingCount > 0 ? Math.round((posCount / ratingCount) * 100) : 0;
      const uAvgRating = ratingCount > 0 ? Number((ratingSum / ratingCount).toFixed(2)) : 0;

      // Find campus
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

  // 7. PRINT FUNCTION FOR OFFICIAL ARTA CSM SCORECARD
  const handlePrintScorecard = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const unitNameLabel = hasAccessToAll
      ? (selectedCampusId === 'all' ? "RSU SYSTEM-WIDE" : (campuses.find(c => c.id === selectedCampusId)?.name || "RSU"))
      : (userProfile?.unitName || "Office");

    const ccRows = `
      <tr>
        <td style="border: 1px solid black; padding: 8px; font-weight: bold;">CC1. Awareness of Citizen's Charter</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${ccStats.cc1AwarePercent}% Aware</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;">${100 - ccStats.cc1AwarePercent}% Unaware</td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 8px; font-weight: bold;">CC2. Visibility of Citizen's Charter</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;" colspan="2">
          Easy/Somewhat Easy: ${Math.round(((ccStats.cc2[1] + ccStats.cc2[2]) / (totalResponses || 1)) * 100)}%
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid black; padding: 8px; font-weight: bold;">CC3. Helpfulness of Citizen's Charter</td>
        <td style="border: 1px solid black; padding: 8px; text-align: center;" colspan="2">
          Helped Very Much/Somewhat: ${Math.round(((ccStats.cc3[1] + ccStats.cc3[2]) / (totalResponses || 1)) * 100)}%
        </td>
      </tr>
    `;

    let sqdRows = '';
    sqdData.forEach(sqd => {
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
          <title>ARTA CSM Scorecard - ${unitNameLabel}</title>
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
              <td style="width: 70px; text-align: left;">
                <img src="/rsupage.png" style="height: 60px; object-fit: contain;" onerror="this.style.display='none'" />
              </td>
              <td style="text-align: center;">
                <p style="margin: 0; font-size: 10px; text-transform: uppercase;">Republic of the Philippines</p>
                <h2 style="margin: 3px 0; font-size: 14px; font-weight: bold;">ROMBLON STATE UNIVERSITY</h2>
                <p style="margin: 0; font-size: 10px;">Odiongan, Romblon</p>
              </td>
              <td style="width: 70px; text-align: right;">
                <img src="/ISOlogo.jpg" style="height: 60px; object-fit: contain;" onerror="this.style.display='none'" />
              </td>
            </tr>
          </table>

          <div style="text-align: center; margin-bottom: 20px;">
            <h3 style="margin: 0; font-size: 14px; font-weight: bold; text-transform: uppercase;">CLIENT SATISFACTION MEASUREMENT (CSM) REPORT</h3>
            <p style="margin: 3px 0; font-size: 11px; font-weight: bold; color: #555;">HARMONIZED ARTA MC 2022-05 COMPLIANT SCORECARD</p>
          </div>

          <div style="margin-bottom: 15px; font-size: 11px;">
            <div><strong>CAMPUS/OFFICE:</strong> ${unitNameLabel.toUpperCase()}</div>
            <div><strong>REPORT PERIOD:</strong> Calendar Year ${selectedYear}</div>
            <div><strong>TOTAL CUSTOMER RESPONSES:</strong> ${totalResponses} (Logged Visitors: ${totalVisitors})</div>
            <div><strong>OVERALL CLIENT SATISFACTION INDEX:</strong> <strong style="font-size: 12px; color: ${overallSatisfactionRate >= 85 ? 'green' : 'red'};">${overallSatisfactionRate}%</strong></div>
          </div>

          <h4 style="margin: 15px 0 5px 0; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid black; padding-bottom: 2px;">I. Citizen's Charter (CC) Metric Summary</h4>
          <table>
            <thead>
              <tr>
                <th style="width: 50%;">CC Dimension</th>
                <th style="width: 25%;">Positive Rating</th>
                <th style="width: 25%;">Negative Rating</th>
              </tr>
            </thead>
            <tbody>
              ${ccRows}
            </tbody>
          </table>

          <h4 style="margin: 20px 0 5px 0; text-transform: uppercase; font-size: 11px; border-bottom: 1px solid black; padding-bottom: 2px;">II. Service Quality Dimensions (SQD) Scorecard</h4>
          <table>
            <thead>
              <tr>
                <th>Service Quality Dimension</th>
                <th style="width: 10%;">Avg Rating</th>
                <th style="width: 10%;">Positive %</th>
                <th style="width: 8%;">Strongly Agree (5)</th>
                <th style="width: 8%;">Agree (4)</th>
                <th style="width: 8%;">Neutral (3)</th>
                <th style="width: 8%;">Disagree (2)</th>
                <th style="width: 8%;">Strongly Disagree (1)</th>
                <th style="width: 8%;">N/A (0)</th>
              </tr>
            </thead>
            <tbody>
              ${sqdRows}
            </tbody>
          </table>

          <div style="margin-top: 50px; display: flex; justify-content: space-between; font-size: 10px;">
            <div style="text-align: center; width: 45%;">
              <p style="margin-bottom: 40px;">Prepared By:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; text-transform: uppercase; padding-bottom: 3px;">
                ${userProfile ? `${userProfile.firstName} ${userProfile.lastName}` : "CSM Staff"}
              </div>
              <p style="margin-top: 3px; color: #555;">${userProfile?.role || "Unit Officer"}</p>
            </div>

            <div style="text-align: center; width: 45%;">
              <p style="margin-bottom: 40px;">Noted By:</p>
              <div style="border-bottom: 1px solid black; font-weight: bold; text-transform: uppercase; padding-bottom: 3px; height: 16px;"></div>
              <p style="margin-top: 3px; color: #555;">Designated CSM Authority Head / IPDU Director</p>
            </div>
          </div>

          <div style="margin-top: 40px; text-align: center; font-size: 8px; color: #777; text-transform: uppercase;">
            Report generated via Romblon State University EOMS Portal on ${format(new Date(), 'MM/dd/yyyy hh:mm a')}
          </div>

          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); }
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Pie chart dataset for CC1
  const cc1PieData = useMemo(() => {
    return [
      { name: 'CC1.1 Saw Charter', value: ccStats.cc1[1] + ccStats.cc1[3], fill: 'hsl(var(--chart-2))' },
      { name: 'CC1.2 Aware but did not see', value: ccStats.cc1[2], fill: 'hsl(var(--chart-1))' },
      { name: 'CC1.3 Completely Unaware', value: ccStats.cc1[4], fill: 'hsl(var(--destructive))' }
    ].filter(d => d.value > 0);
  }, [ccStats]);

  return (
    <div className="space-y-6">
      
      {/* Admin/IPDU Drill-down & Unit Publication Panel */}
      {hasAccessToAll && (
        <Card className="border-primary/15 shadow-sm bg-slate-50/50">
          <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
              <div className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Drill Down Unit / Office</span>
                <Select value={selectedUnitId} onValueChange={setSelectedUnitId}>
                  <SelectTrigger className="w-[280px] h-9 bg-white font-bold text-xs shadow-sm">
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
                  <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Approval Status</span>
                  <div className="flex items-center gap-2 h-9">
                    {isUnitApproved ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-250 text-[10px] font-black uppercase h-7 px-2">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Approved for Unit
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] font-black uppercase text-slate-500 h-7 px-2">
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
      )}

      {/* 1. TOP CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Total Responses */}
        <Card className="shadow-sm border-primary/15 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Total Responses</span>
            <Users className="h-4 w-4 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800 tabular-nums">{totalResponses}</div>
            <p className="text-[9px] text-muted-foreground font-bold mt-1 uppercase">Across {totalVisitors} logged visits</p>
          </CardContent>
        </Card>

        {/* Participation Rate */}
        <Card className="shadow-sm border-primary/15 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Participation Rate</span>
            <Percent className="h-4 w-4 text-[#D4AF37]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800 tabular-nums">{participationRate}%</div>
            <Progress value={participationRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {/* Overall Satisfaction */}
        <Card className="shadow-sm border-primary/15 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Overall Satisfaction</span>
            <ThumbsUp className="h-4 w-4 text-emerald-600 animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800 tabular-nums">{overallSatisfactionRate}%</div>
            <p className="text-[9px] text-emerald-600 font-black mt-1 uppercase">Satisfied & Very Satisfied</p>
          </CardContent>
        </Card>

        {/* CC Awareness */}
        <Card className="shadow-sm border-primary/15 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-wider">Charter Awareness</span>
            <HelpCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-slate-800 tabular-nums">{ccStats.cc1AwarePercent}%</div>
            <p className="text-[9px] text-blue-605 font-bold mt-1 uppercase">Know about Citizen's Charter</p>
          </CardContent>
        </Card>
      </div>

      {/* Print Scorecard Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border shadow-sm">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-[#D4AF37]" />
          <span className="text-xs font-bold text-slate-700">Official ARTA-Harmonized CSM Scorecard is ready for printing.</span>
        </div>
        <Button size="sm" onClick={handlePrintScorecard} className="h-8 text-[9.5px] font-black uppercase tracking-wider">
          <Printer className="h-3.5 w-3.5 mr-1.5" /> Print Scorecard
        </Button>
      </div>

      {/* 2. DECISION SUPPORT SYSTEM (DSS) PANEL */}
      {hasAccessToAll && (
        <Card className="border-amber-200 bg-amber-50/20 shadow-md">
          <CardHeader className="bg-amber-100/50 border-b py-3.5">
            <CardTitle className="text-sm font-black uppercase flex items-center gap-2 text-amber-800">
              <ShieldCheck className="h-4.5 w-4.5 text-amber-700" />
              CSM Decision Support System (DSS)
            </CardTitle>
            <CardDescription className="text-amber-700/80 text-[11px] font-bold uppercase">
              Automated service analysis and institutional corrective recommendations.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {dssInsights.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {dssInsights.map(insight => (
                  <div key={insight.id} className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="text-xs font-black uppercase text-slate-800 tracking-tight">{insight.name}</span>
                      {insight.id !== 99 ? (
                        <Badge variant="destructive" className="text-[8.5px] uppercase font-black px-2 py-0.5">
                          Alert: {insight.positivePercent}% Positive
                        </Badge>
                      ) : (
                        <Badge className="bg-rose-500 text-white text-[8.5px] uppercase font-black px-2 py-0.5 border-none">
                          Kiosk Audit
                        </Badge>
                      )}
                    </div>
                    <p className="text-[11px] font-bold text-slate-700 italic leading-relaxed">
                      "{insight.recommendation}"
                    </p>
                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                      <p className="text-[9.5px] font-black text-amber-800 uppercase tracking-wider">Corrective Action Checklist:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {insight.checklist.map((item: string, i: number) => (
                          <li key={i} className="text-[9.5px] font-medium text-slate-650 leading-tight">
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center bg-white border border-emerald-200 rounded-xl space-y-2">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 mx-auto" />
                <div>
                  <h4 className="text-sm font-black text-emerald-800 uppercase">Excellent Service Performance</h4>
                  <p className="text-xs font-bold text-emerald-700 uppercase tracking-widest mt-1">
                    All Service Quality Dimensions meet or exceed the 85% satisfaction threshold.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. CHARTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* CC1 Chart */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-3">
            <CardTitle className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-slate-500" /> CC1: Charter Awareness
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 flex flex-col justify-center">
            {cc1PieData.length > 0 ? (
              <ChartContainer config={{}} className="h-[180px] w-full mx-auto">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={cc1PieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                      {cc1PieData.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="text-center py-10 opacity-30 text-xs font-bold">No Data</div>
            )}
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-650">CC1.1/3 Saw Charter:</span>
                <span className="font-mono font-black">{ccStats.cc1[1] + ccStats.cc1[3]}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-655">CC1.2 Aware but did not see:</span>
                <span className="font-mono font-black">{ccStats.cc1[2]}</span>
              </div>
              <div className="flex justify-between items-center text-[10px]">
                <span className="font-bold text-slate-655">CC1.4 Completely Unaware:</span>
                <span className="font-mono font-black">{ccStats.cc1[4]}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CC2/3 Visibility Progress */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-3">
            <CardTitle className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
              <HelpCircle className="h-4 w-4 text-slate-500" /> CC2 & CC3: Visibility & Helpfulness
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 space-y-4">
            {/* CC2 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-700">
                <span>CC2. Charter Visibility (Easy to see)</span>
                <span>{totalResponses > 0 ? Math.round(((ccStats.cc2[1] + ccStats.cc2[2]) / totalResponses) * 100) : 0}%</span>
              </div>
              <Progress value={totalResponses > 0 ? Math.round(((ccStats.cc2[1] + ccStats.cc2[2]) / totalResponses) * 100) : 0} className="h-2" />
            </div>

            {/* CC3 */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-slate-700">
                <span>CC3. Charter Helpfulness (Helped)</span>
                <span>{totalResponses > 0 ? Math.round(((ccStats.cc3[1] + ccStats.cc3[2]) / totalResponses) * 100) : 0}%</span>
              </div>
              <Progress value={totalResponses > 0 ? Math.round(((ccStats.cc3[1] + ccStats.cc3[2]) / totalResponses) * 100) : 0} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* SQD Average Rating Chart */}
        <Card className="shadow-md border-primary/10 overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/10 border-b py-3">
            <CardTitle className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-slate-500" /> SQD Satisfaction Benchmarks
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1">
            <ChartContainer config={{}} className="h-[200px] w-full">
              <ResponsiveContainer>
                <BarChart data={sqdData} layout="vertical" margin={{ left: -10, right: 10, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" strokeOpacity={0.1} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 9 }} />
                  <YAxis dataKey="key" type="category" tick={{ fontSize: 9, fontWeight: 'bold' }} width={35} />
                  <Bar dataKey="positivePercent" fill="hsl(var(--chart-2))" radius={[0, 3, 3, 0]}>
                    <LabelList dataKey="positivePercent" position="right" style={{ fontSize: '8px', fontWeight: 'bold' }} formatter={(v: any) => `${v}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* 4. SQD SCORECARD TABLE */}
      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-3.5">
          <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-705">
            <FileText className="h-4 w-4 text-primary" />
            ARTA Service Quality Dimensions (SQD) Scorecard
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="font-black text-[10px] uppercase pl-4">Dimension</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Avg Rating (5.0)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Positive % (S/VS)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Strongly Agree (5)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Agree (4)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Neutral (3)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Disagree (2)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">Strongly Disagree (1)</TableHead>
                <TableHead className="font-black text-[10px] uppercase text-center">N/A (0)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sqdData.map(sqd => (
                <TableRow key={sqd.id} className="hover:bg-slate-50/50">
                  <TableCell className="pl-4 py-3">
                    <div className="font-bold text-xs text-slate-800">{sqd.name}</div>
                    <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">{sqd.desc}</div>
                  </TableCell>
                  <TableCell className="text-center font-bold text-xs">{sqd.avg}</TableCell>
                  <TableCell className="text-center font-bold text-xs">
                    <span className={sqd.positivePercent >= 85 ? 'text-emerald-600' : 'text-rose-600'}>
                      {sqd.positivePercent}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[5]}</TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[4]}</TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[3]}</TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[2]}</TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[1]}</TableCell>
                  <TableCell className="text-center text-xs text-slate-600">{sqd.counts[0]}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 5. UNIT BENCHMARKS TABLE */}
      {hasAccessToAll && unitBenchmarks.length > 0 && (
        <Card className="shadow-md border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/10 border-b py-3.5">
            <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-705">
              <Building2 className="h-4 w-4 text-primary" />
              Unit Client Satisfaction Benchmarks & Rankings
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase">
              Compare satisfaction indices and compliance levels across university sectors.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="font-black text-[10px] uppercase pl-4">Unit / Office</TableHead>
                  <TableHead className="font-black text-[10px] uppercase">Campus Site</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-center">Logged Visitors</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-center">CSM Responses</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-center">Kiosk Engagement</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-center">CSM Index %</TableHead>
                  <TableHead className="font-black text-[10px] uppercase text-center">Avg SQD</TableHead>
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
                    <TableCell className="text-center font-bold text-xs">{u.avgRating}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 6. COMMENTS AND SUGGESTIONS FEED */}
      <Card className="shadow-md border-primary/10 overflow-hidden">
        <CardHeader className="bg-muted/10 border-b py-3.5">
          <CardTitle className="text-xs font-black uppercase flex items-center gap-2 text-slate-705">
            <Smile className="h-4 w-4 text-primary" />
            Client Qualitative Suggestions & Feedbacks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[250px] bg-slate-50/40 p-4">
            {filteredResponses.filter(r => r.comments && r.comments.trim().length > 0).length > 0 ? (
              <div className="space-y-4">
                {filteredResponses
                  .filter(r => r.comments && r.comments.trim().length > 0)
                  .sort((a,b) => {
                    const timeA = a.createdAt?.seconds || 0;
                    const timeB = b.createdAt?.seconds || 0;
                    return timeB - timeA; // descending
                  })
                  .map((r, idx) => {
                    const dateStr = r.createdAt?.toDate 
                      ? format(r.createdAt.toDate(), 'MM/dd/yyyy hh:mm a') 
                      : 'N/A';
                    return (
                      <div key={idx} className="bg-white border rounded-xl p-4 shadow-sm space-y-2">
                        <div className="flex justify-between items-start border-b pb-1.5">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-[#1B6535] uppercase">{r.visitorName}</span>
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">
                              Visitted: <span className="text-slate-600">{r.unitName}</span> &bull; Purpose: <span className="text-slate-600">{r.purpose}</span>
                            </div>
                          </div>
                          <span className="text-[9px] font-mono text-slate-400 font-bold">{dateStr}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-750 italic leading-relaxed">
                          "{r.comments}"
                        </p>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-12 text-xs font-bold text-muted-foreground uppercase italic opacity-40">
                No qualitative suggestions recorded for this period.
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper stub for ChartContainer if needed. Next template has it matching components/ui/chart.tsx
function ChartContainer({ children, className }: any) {
  return <div className={className}>{children}</div>;
}
