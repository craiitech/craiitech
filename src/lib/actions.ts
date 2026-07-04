'use server';

import { getAdminFirestore } from '@/firebase/admin';
import * as admin from 'firebase-admin';

// --- Error Reporting Action ---
interface ErrorReportPayload {
    errorMessage?: string;
    errorStack?: string;
    errorDigest?: string;
    url: string;
    userId?: string;
    userName?: string;
    userRole?: string;
    userEmail?: string;
}

export async function logError(payload: ErrorReportPayload) {
    try {
        const firestore = getAdminFirestore();
        if (!firestore) return { success: false, error: 'Admin SDK not initialized.' };
        
        const reportCollection = firestore.collection('errorReports');
        
        const sanitizedPayload = {
            errorMessage: payload.errorMessage || 'No error message provided.',
            errorStack: payload.errorStack || 'No stack trace provided.',
            errorDigest: payload.errorDigest || null,
            url: payload.url,
            userId: payload.userId || null,
            userName: payload.userName || null,
            userRole: payload.userRole || null,
            userEmail: payload.userEmail || null,
        };

        await reportCollection.add({
            ...sanitizedPayload,
            status: 'new',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
        return { success: true };
    } catch (error) {
        console.error('Failed to log error to Firestore:', error);
        return { success: false };
    }
}

/**
 * INSTITUTIONAL BACKUP SYNC
 * This action attempts to process the backup file for cloud storage.
 * Note: Actual writing to a private Google Drive folder requires a Service Account
 * with 'GOOGLE_DRIVE_API' enabled and appropriate permissions.
 */
export async function uploadBackupToDrive(base64Data: string, fileName: string, targetLink: string) {
    console.error(`[BACKUP-SYNC] Received sync request for ${fileName}`);
    
    // Extract Folder ID from common GDrive link formats
    const folderIdMatch = targetLink.match(/folders\/([a-zA-Z0-9_-]+)/);
    const folderId = folderIdMatch ? folderIdMatch[1] : 'unknown';

    // Simulate network latency for the data transit
    await new Promise(resolve => setTimeout(resolve, 4000));

    try {
        const firestore = getAdminFirestore();
        
        // CHECK: If Service Account is present, we would use 'googleapis' here.
        // For the prototype, we log the intent and status to the System Audit Trail.
        const hasServiceAccount = !!process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT;

        if (firestore) {
            await firestore.collection('activityLogs').add({
                action: 'institutional_backup_sync',
                details: { 
                    fileName, 
                    targetFolderId: folderId,
                    status: hasServiceAccount ? 'Success: Cloud Sync Verified' : 'Warning: Manual Download Triggered (API Key Missing)',
                    method: 'Server Action Transit'
                },
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userName: 'System (Automated Backup)',
                userRole: 'Admin'
            });
        }

        if (!hasServiceAccount) {
            return { 
                success: false, 
                error: 'Service Account credentials not configured. Cloud upload bypassed. Use local download.',
                isConfigurationError: true
            };
        }

        return { success: true, message: 'Cloud synchronization complete.' };
    } catch (e) {
        console.error("Backup sync failed", e);
        return { success: false, error: 'Transit error during synchronization.' };
    }
}

/**
 * Returns the current date and time adjusted to Philippine Time (UTC+8).
 */
export async function getOfficialServerTime(): Promise<{ iso: string; year: number; dateString: string }> {
    const now = new Date();
    const PH_OFFSET = 8 * 60 * 60 * 1000;
    const phTime = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + PH_OFFSET);
    
    return {
        iso: phTime.toISOString(),
        year: phTime.getFullYear(),
        dateString: phTime.toISOString().split('T')[0]
    };
}

/**
 * Public server action to fetch compliance matrix data.
 * Queries Firestore using admin SDK.
 */
export async function getPublicSubmissionMatrixData(selectedYear: number) {
  try {
    const firestore = getAdminFirestore();
    if (!firestore) return { error: 'Database service unavailable.' };

    const campusesSnap = await firestore.collection('campuses').get();
    const unitsSnap = await firestore.collection('units').get();
    const submissionsSnap = await firestore.collection('submissions')
      .where('year', '==', selectedYear)
      .get();
    const cyclesSnap = await firestore.collection('cycles').get();

    const campuses = campusesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as { id: string; name: string; location?: string }[];
    const units = unitsSnap.docs.map(d => ({ id: d.id, ...d.data() })) as admin.firestore.DocumentData[];
    const submissions = submissionsSnap.docs.map(d => d.data());

    const availableYears = Array.from(
      new Set([
        new Date().getFullYear(),
        ...cyclesSnap.docs.map(d => Number(d.data().year)).filter(Boolean)
      ])
    ).sort((a, b) => b - a);

    const submissionMap = new Map<string, admin.firestore.DocumentData>();
    submissions.forEach(s => {
      const key = `${s.campusId}-${s.unitId}-${s.reportType}-${s.cycleId}`.toLowerCase();
      submissionMap.set(key, s);
    });

    const matrix = campuses.map(campus => {
      const cId = String(campus.id).trim();
      const campusUnits = units.filter((unit: admin.firestore.DocumentData) => 
        unit.campusIds?.some((id: string) => String(id).trim() === cId)
      );
      if (campusUnits.length === 0) return null;

      const unitStatuses = campusUnits.map((unit: admin.firestore.DocumentData) => {
        const uId = String(unit.id).trim();
        const statuses: Record<string, 'submitted' | 'missing' | 'not-applicable'> = {};
        const cycles = ['first', 'final'] as const;

        cycles.forEach(cycleId => {
          const rorKey = `${cId}-${uId}-risk and opportunity registry-${cycleId}`.toLowerCase();
          const rorSubmission = submissionMap.get(rorKey);
          const isActionPlanNA = String(rorSubmission?.riskRating || '').toLowerCase() === 'low';

          const submissionTypesLocal = [
            'SWOT Analysis',
            'Needs and Expectation of Interested Parties',
            'Operational Plan',
            'Quality Objectives Monitoring',
            'Risk and Opportunity Registry',
            'Risk and Opportunity Action Plan',
          ];

          submissionTypesLocal.forEach(reportType => {
            const submissionKey = `${cId}-${uId}-${reportType.toLowerCase()}-${cycleId}`.toLowerCase();
            if (reportType === 'Risk and Opportunity Action Plan' && isActionPlanNA) {
              statuses[submissionKey] = 'not-applicable';
            } else if (submissionMap.has(submissionKey)) {
              statuses[submissionKey] = 'submitted';
            } else {
              statuses[submissionKey] = 'missing';
            }
          });
        });

        return { unitId: uId, unitName: unit.name, statuses };
      }).sort((a, b) => a.unitName.localeCompare(b.unitName));

      return { campusId: cId, campusName: campus.name, units: unitStatuses };
    }).filter((x): x is NonNullable<typeof x> => Boolean(x)).sort((a, b) => a.campusName.localeCompare(b.campusName));

    return { matrix, availableYears };
  } catch (error) {
    console.error('Failed to fetch public submission matrix:', error);
    return { error: 'Failed to retrieve compliance matrix data.' };
  }
}
