'use client';

import { useEffect, useRef } from 'react';
import { useUser, useFirestore } from '@/firebase';
import { collection, query, where, getDocs, Timestamp } from '@/firebase/firestore-wrapper';
import { useVoice } from './voice-provider';
import { submissionTypes } from '@/lib/constants';
import { isCycleActive } from '@/lib/utils';
import type { Submission, ProgramComplianceRecord, Cycle, ManagementReviewOutput } from '@/lib/types';

export function VoiceAnnouncements() {
  const { userProfile, isUserLoading, isAdmin, userRole } = useUser();
  const firestore = useFirestore();
  const { speak, enabled } = useVoice();
  const announced = useRef(false);

  useEffect(() => {
    if (isUserLoading || !userProfile || !firestore || !enabled || announced.current) return;
    announced.current = true;

    const fetchAndAnnounce = async () => {
      const now = new Date();
      const unitId = userProfile.unitId;
      const campusId = userProfile.campusId;
      const activeYear = now.getFullYear();
      const listItems: string[] = [];

      // 1. Open CARs (Corrective Action Requests)
      let openCarsCount = 0;
      if (unitId) {
        try {
          const carsSnap = await getDocs(query(
            collection(firestore, 'correctiveActionRequests'),
            where('unitId', '==', unitId)
          ));
          openCarsCount = carsSnap.docs.filter(d => {
            const s = d.data().status;
            return s === 'Open' || s === 'Awaiting Response/Update';
          }).length;
        } catch { /* silent */ }
      }
      if (openCarsCount > 0) {
        listItems.push(`First, you have ${openCarsCount} open corrective action request${openCarsCount > 1 ? 's' : ''}, which you can address by logging implementation plans and evidence in the Corrective Action module.`);
      }

      // 2. Overdue Risks
      let overdueRisksCount = 0;
      if (unitId) {
        try {
          const risksSnap = await getDocs(query(
            collection(firestore, 'risks'),
            where('unitId', '==', unitId)
          ));
          overdueRisksCount = risksSnap.docs.filter(d => {
            const data = d.data();
            if (data.status === 'Closed' || !data.targetDate) return false;
            const target = data.targetDate instanceof Timestamp ? data.targetDate.toDate() : new Date(data.targetDate);
            return target < now;
          }).length;
        } catch { /* silent */ }
      }
      if (overdueRisksCount > 0) {
        listItems.push(`Second, you have ${overdueRisksCount} overdue risk treatment${overdueRisksCount > 1 ? 's' : ''}, which you can address by navigating to the Risk Register and updating their final assessments.`);
      }

      // 3. Actionable Decisions (Management Review Outputs)
      let mrDecisionsCount = 0;
      if (unitId) {
        try {
          const mroSnap = await getDocs(collection(firestore, 'managementReviewOutputs'));
          mrDecisionsCount = mroSnap.docs.filter(d => {
            const data = d.data() as ManagementReviewOutput;
            const hasAssignment = data.assignments?.some(a => a.unitId === unitId) || data.concernedUnitIds?.includes(unitId);
            return hasAssignment && (data.status === 'Open' || data.status === 'On-going');
          }).length;
        } catch { /* silent */ }
      }
      if (mrDecisionsCount > 0) {
        listItems.push(`Third, you have ${mrDecisionsCount} pending management review decision${mrDecisionsCount > 1 ? 's' : ''}, which you can address by submitting implementation details and evidence in the Management Review outputs page.`);
      }

      // 4. Accreditation Gaps & Open Recommendations
      let accreditationGapsCount = 0;
      let openRecommendationsCount = 0;
      if (unitId) {
        try {
          const pcSnap = await getDocs(query(
            collection(firestore, 'programCompliances'),
            where('unitId', '==', unitId)
          ));
          const compliances = pcSnap.docs.map(d => d.data() as ProgramComplianceRecord)
                                       .filter(c => Number(c.academicYear) === activeYear);
          compliances.forEach(c => {
            if (c.ched?.copcStatus !== 'With COPC') {
              accreditationGapsCount++;
            }
            const milestones = c.accreditationRecords || [];
            const latest = milestones.find(m => m.lifecycleStatus === 'Current') || milestones[milestones.length - 1];
            if (!latest || latest.level === 'Non Accredited') {
              accreditationGapsCount++;
            }
            milestones.forEach(m => {
              m.recommendations?.forEach(reco => {
                if ((reco.status === 'Open' || reco.status === 'In Progress') && 
                    reco.assignedUnitIds?.includes(unitId)) {
                  openRecommendationsCount++;
                }
              });
            });
          });
        } catch { /* silent */ }
      }
      if (accreditationGapsCount > 0 || openRecommendationsCount > 0) {
        let text = `Fourth, we found `;
        const gapsText: string[] = [];
        if (accreditationGapsCount > 0) {
          gapsText.push(`${accreditationGapsCount} active program authority or accreditation gap${accreditationGapsCount > 1 ? 's' : ''}`);
        }
        if (openRecommendationsCount > 0) {
          gapsText.push(`${openRecommendationsCount} open accreditor recommendation${openRecommendationsCount > 1 ? 's' : ''}`);
        }
        text += gapsText.join(' and ');
        text += `, which you can address by uploading compliance certificates or evidence logs in the Program Monitoring section.`;
        listItems.push(text);
      }

      // 5. Missing Current Cycle Submissions
      const missingReports: string[] = [];
      if (unitId) {
        try {
          let allCycles: Cycle[] = [];
          try {
            const cyclesSnap = await getDocs(collection(firestore, 'cycles'));
            allCycles = cyclesSnap.docs.map(d => ({ id: d.id, ...d.data() } as Cycle));
          } catch { /* silent */ }

          const subSnap = await getDocs(query(
            collection(firestore, 'submissions'),
            where('unitId', '==', unitId)
          ));
          const unitSubs = subSnap.docs.map(d => d.data() as Submission);
          const currentYearSubmissions = unitSubs.filter(s => Number(s.year) === activeYear);

          for (const cycleId of ['first', 'final'] as const) {
            if (isCycleActive(cycleId, activeYear, allCycles)) {
              const cycleSubs = currentYearSubmissions.filter(s => s.cycleId === cycleId);
              const registrySub = cycleSubs.find(s => s.reportType === 'Risk and Opportunity Registry');
              const isActionPlanNA = registrySub?.riskRating === 'low';
              
              const approvedOrSubmittedSet = new Set(cycleSubs.filter(s => s.statusId === 'approved' || s.statusId === 'submitted').map(s => s.reportType));
              
              const missing = submissionTypes.filter(type => {
                if (approvedOrSubmittedSet.has(type)) return false;
                if (type === 'Risk and Opportunity Action Plan' && isActionPlanNA) return false;
                return true;
              });

              if (missing.length > 0) {
                const cycleLabel = cycleId === 'first' ? 'first cycle' : 'final cycle';
                missingReports.push(`${cycleLabel} ${missing.join(', and ')}`);
              }
            }
          }
        } catch { /* silent */ }
      }
      if (missingReports.length > 0) {
        listItems.push(`Fifth, you have not submitted all required reports for the active cycle, missing documents include: ${missingReports.join(', and ')}, please prepare and upload these in the submissions panel.`);
      }

      // 6. Returned Requests (Procedure manual revisions or Form registrations)
      let returnedRequestsCount = 0;
      if (unitId) {
        try {
          const prSnap = await getDocs(query(
            collection(firestore, 'procedureRevisionRequests'),
            where('unitId', '==', unitId)
          ));
          const returnedPR = prSnap.docs.filter(d => d.data().status === 'Returned for Revision').length;
          returnedRequestsCount += returnedPR;
        } catch { /* silent */ }

        try {
          const ufSnap = await getDocs(query(
            collection(firestore, 'unitFormRequests'),
            where('unitId', '==', unitId)
          ));
          const returnedUF = ufSnap.docs.filter(d => d.data().status === 'Returned for Correction').length;
          returnedRequestsCount += returnedUF;
        } catch { /* silent */ }
      }
      if (returnedRequestsCount > 0) {
        listItems.push(`Sixth, you have ${returnedRequestsCount} request${returnedRequestsCount > 1 ? 's' : ''} returned for correction by the Quality Assurance Office, you can address this by reviewing their feedback and resubmitting.`);
      }

      // 7. Portal Software Evaluation
      let hasCompletedSoftwareEvaluation = true;
      if (!isAdmin && userRole !== 'Auditor' && userRole !== 'Supervisor' && userRole !== 'VP' && userProfile?.id) {
        try {
          const evalSnap = await getDocs(query(
            collection(firestore, 'softwareEvaluations'),
            where('userId', '==', userProfile.id)
          ));
          if (evalSnap.empty) {
            hasCompletedSoftwareEvaluation = false;
          }
        } catch { /* silent */ }
      }
      if (!hasCompletedSoftwareEvaluation) {
        listItems.push(`Seventh, you have not completed the Portal Software Evaluation, please share your feedback to help us improve the system.`);
      }

      // Admin / Supervisor specific announcements (Submissions pending review)
      if (isAdmin || userRole === 'Supervisor' || userRole === 'VP') {
        let pendingReviewCount = 0;
        try {
          const pendingQuery = isAdmin
            ? query(collection(firestore, 'submissions'), where('statusId', '==', 'submitted'))
            : query(collection(firestore, 'submissions'), where('campusId', '==', campusId));
          const pendingSnap = await getDocs(pendingQuery);
          pendingReviewCount = pendingSnap.docs.filter(d => d.data().statusId === 'submitted').length;
        } catch { /* silent */ }
        if (pendingReviewCount > 0) {
          listItems.push(`Additionally, you have ${pendingReviewCount} submission${pendingReviewCount > 1 ? 's' : ''} pending review, which you can evaluate in the approvals dashboard.`);
        }
      }

      // Admin / Auditor specific announcements (CARs for final verification)
      if (isAdmin || userRole === 'Auditor') {
        let verifyCount = 0;
        try {
          const verifySnap = await getDocs(query(
            collection(firestore, 'correctiveActionRequests'),
            where('status', '==', 'For Final Verification')
          ));
          verifyCount = verifySnap.size;
        } catch { /* silent */ }
        if (verifyCount > 0) {
          listItems.push(`Additionally, you have ${verifyCount} corrective action request${verifyCount > 1 ? 's' : ''} awaiting final verification in your inbox.`);
        }
      }

      // Admin specific announcements (Form Registrations and Procedure Manual Revisions pending review)
      if (isAdmin) {
        let pendingFormsCount = 0;
        let pendingManualsCount = 0;
        try {
          const formsSnap = await getDocs(collection(firestore, 'unitFormRequests'));
          pendingFormsCount = formsSnap.docs.filter(d => {
            const s = d.data().status;
            return s === 'Submitted' || s === 'QA Review' || s === 'Endorsement for Approval';
          }).length;
        } catch { /* silent */ }

        try {
          const manualsSnap = await getDocs(collection(firestore, 'procedureRevisionRequests'));
          pendingManualsCount = manualsSnap.docs.filter(d => {
            const s = d.data().status;
            return s === 'Submitted' || s === 'Awaiting Presidential Approval';
          }).length;
        } catch { /* silent */ }

        if (pendingFormsCount > 0 || pendingManualsCount > 0) {
          const parts: string[] = [];
          if (pendingFormsCount > 0) {
            parts.push(`${pendingFormsCount} form registration request${pendingFormsCount > 1 ? 's' : ''}`);
          }
          if (pendingManualsCount > 0) {
            parts.push(`${pendingManualsCount} procedure revision request${pendingManualsCount > 1 ? 's' : ''}`);
          }
          listItems.push(`Additionally, you have ${parts.join(' and ')} pending review in the manuals and forms inbox.`);
        }
      }

      // Unread communications (for everyone)
      let unreadCommsCount = 0;
      try {
        const commsSnap = await getDocs(query(
          collection(firestore, 'communications')
        ));
        const roleLower = userRole?.toLowerCase() || '';
        const isOdimo = isAdmin || roleLower.includes('odimo') || roleLower.includes('coordinator');
        const currentYear = new Date().getFullYear();
        unreadCommsCount = commsSnap.docs.filter(d => {
          const c = d.data();
          if (c.senderUnitId === unitId) return false;
          const date = c.createdAt?.toDate ? c.createdAt.toDate() : c.createdAt ? new Date(c.createdAt) : null;
          if (date && date.getFullYear() !== currentYear) return false;
          let isRecipient = false;
          if (c.recipientType === 'all') isRecipient = true;
          else if (c.recipientType === 'campus' && c.recipientIds?.includes(campusId)) isRecipient = true;
          else if (c.recipientType === 'unit' && c.recipientIds?.includes(unitId)) isRecipient = true;
          else if (c.recipientType === 'individual' && c.recipientIds?.includes(userProfile.id)) isRecipient = true;
          if (!isRecipient) return false;
          const isReceivedByUnit = !!c.recipientRefNums?.[unitId];
          if (!isOdimo && !isReceivedByUnit) return false;
          const hasRead = c.readBy?.includes(userProfile.id) || (unitId && c.readBy?.includes(unitId));
          return !hasRead;
        }).length;
      } catch { /* silent */ }
      if (unreadCommsCount > 0) {
        listItems.push(`Finally, you have ${unreadCommsCount} unread communication${unreadCommsCount > 1 ? 's' : ''} in the Communications Hub.`);
      }

      setTimeout(() => {
        if (listItems.length > 0) {
          const speechText = `Here is your quality assurance and compliance summary. Please check the following items requiring your attention: ${listItems.join(' ')}`;
          speak(speechText);
        } else {
          speak(`Congratulations! You have no pending items that require your attention.`);
        }
      }, 4500);
    };

    fetchAndAnnounce();
  }, [isUserLoading, userProfile, firestore, isAdmin, userRole, enabled, speak]);

  return null;
}
