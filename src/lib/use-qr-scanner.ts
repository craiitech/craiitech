'use client';

import { useCallback, useRef } from 'react';
import type { Firestore } from 'firebase/firestore';
import { doc, getDoc } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { verifyPayloadSignature, resolveActiveSession, parseSessionTime } from '@/lib/unit-activity-crypto';
import type { DeviceBinding, AttendanceActivity, ActivityAttendanceLog } from '@/lib/types';

export type ScanResult = {
  status: 'success' | 'error';
  message: string;
  log?: Omit<ActivityAttendanceLog, 'id'>;
};

export type ParsedPayload = {
  userId: string;
  deviceFingerprint: string;
  timestamp: number;
  signature: string;
  userName?: string;
  unitId?: string;
  unitName?: string;
  sessionId?: string;
  contactNumber?: string;
  sex?: string;
};

function parsePayload(data: string): ParsedPayload | null {
  try {
    const parsed = JSON.parse(data);
    // Support both full format {userId, deviceFingerprint, timestamp, signature}
    // and minified format {u, f, t, s}
    return {
      userId: parsed.userId || parsed.u || '',
      deviceFingerprint: parsed.deviceFingerprint || parsed.f || '',
      timestamp: parsed.timestamp || parsed.t || 0,
      signature: parsed.signature || parsed.s || '',
      userName: parsed.userName || parsed.n || undefined,
      unitId: parsed.unitId || parsed.i || undefined,
      unitName: parsed.unitName || parsed.o || parsed.m || undefined,
      sessionId: parsed.sessionId || undefined,
      contactNumber: parsed.contactNumber || parsed.c || undefined,
      sex: parsed.sex || undefined,
    };
  } catch {
    return null;
  }
}

type ProcessScanOptions = {
  firestore: Firestore;
  payload: ParsedPayload;
  activity: AttendanceActivity;
  lateThresholdMinutes?: number;
};

export async function processScan({ firestore, payload, activity, lateThresholdMinutes }: ProcessScanOptions): Promise<ScanResult> {
  const { userId, deviceFingerprint, timestamp, signature, userName, unitId, unitName, sessionId, contactNumber, sex } = payload;

  if (!userId || !deviceFingerprint || !timestamp || !signature) {
    return { status: 'error', message: 'Invalid QR payload format.' };
  }

  if (Date.now() - timestamp > 70000) {
    return { status: 'error', message: 'Rejected: Expired QR token.' };
  }

  const valid = await verifyPayloadSignature(userId, timestamp, deviceFingerprint, signature);
  if (!valid) {
    return { status: 'error', message: 'Security Rejection: Invalid QR signature (tamper detected).' };
  }

  // Check device binding
  const bindingRef = doc(firestore, 'attendanceDeviceBindings', deviceFingerprint);
  const bindingSnap = await getDoc(bindingRef);

  if (!bindingSnap.exists()) {
    return { status: 'error', message: 'Rejected: Untracked device. Registration required.' };
  }

  const binding = bindingSnap.data() as DeviceBinding;
  if (binding.userId !== userId) {
    return { status: 'error', message: 'Security Rejection: Device locked to another user.' };
  }

  // Resolve active session
  const session = resolveActiveSession(activity);
  const sessionId_ = sessionId || session.id;

  // Compute lateness
  const scanTime = new Date(timestamp);
  const sessionStart = parseSessionTime(session.date, session.startTime);
  const sessionEnd = parseSessionTime(session.date, session.endTime);

  let status: 'ON_TIME' | 'LATE' | 'OUTSIDE_WINDOW' | 'REJECTED' = 'ON_TIME';
  const threshold = lateThresholdMinutes ?? activity.lateThresholdMinutes ?? 15;

  if (scanTime.getTime() > sessionEnd) {
    status = 'OUTSIDE_WINDOW';
  } else if (scanTime.getTime() > sessionStart + threshold * 60000) {
    status = 'LATE';
  }

  return {
    status: 'success',
    message: `Attendance recorded: ${status === 'ON_TIME' ? 'On Time' : status === 'LATE' ? 'Late' : 'Outside Window'}`,
    log: {
      activityId: activity.id,
      userId,
      userName: userName || binding.userName || 'Attendee',
      unitId: unitId || binding.unitId || '',
      unitName: unitName || binding.unitName || '',
      deviceFingerprint,
      scannedAt: new Date(timestamp),
      status,
      sessionId: sessionId_,
      sessionLabel: session.label,
      contactNumber: contactNumber || binding.contactNumber,
      sex: sex || binding.sex,
    },
  };
}

export function useQrScanner(readerElementId: string = 'qr-reader') {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  const startScanner = useCallback(async (
    onScan: (payload: ParsedPayload) => void,
    onError: (error: string) => void,
  ) => {
    const Html5QrcodeModule = (await import('html5-qrcode')).Html5Qrcode;
    scannerRef.current = new Html5QrcodeModule(readerElementId);

    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: (width: number, height: number) => {
            const size = Math.min(width, height) * 0.75;
            return { width: size, height: size };
          }
        },
        (decodedText) => {
          const payload = parsePayload(decodedText);
          if (payload) {
            onScan(payload);
          } else {
            onError('Unrecognized QR format.');
          }
        },
        () => { /* ignore non-qr frames */ },
      );
    } catch (err: any) {
      onError(`Camera error: ${err.message}`);
    }
  }, [readerElementId]);

  const stopScanner = useCallback(() => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  }, []);

  return { startScanner, stopScanner, parsePayload };
}
