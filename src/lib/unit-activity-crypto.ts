const APP_SECRET_SALT = 'rsu_attendance_secure_salt_2026';
const OTP_KEY_SALT = 'rsu-otp-key-2026';

let hmacKey: CryptoKey | null = null;
let otpKey: CryptoKey | null = null;

async function getKey(salt: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(salt);
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

export async function generatePayloadSignature(userId: string, timestamp: number, fp: string): Promise<string> {
  if (!hmacKey) hmacKey = await getKey(APP_SECRET_SALT, ['sign', 'verify']);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}-${timestamp}-${fp}`);
  const signature = await crypto.subtle.sign('HMAC', hmacKey, data);
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `SIG-${hex.substring(0, 16)}`;
}

export async function generateActivityCode(activityId: string, timestamp: number): Promise<string> {
  if (!otpKey) otpKey = await getKey(OTP_KEY_SALT, ['sign', 'verify']);
  const windowId = Math.floor(timestamp / 60000);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${activityId}-${windowId}`);
  const signature = await crypto.subtle.sign('HMAC', otpKey, data);
  const hash = new DataView(signature).getUint32(0);
  return ((Math.abs(hash) % 900) + 100).toString();
}

let offlineKey: CryptoKey | null = null;

export async function signOfflineLog(data: Record<string, any>): Promise<string> {
  if (!offlineKey) offlineKey = await getKey('rsu-offline-log-key', ['sign', 'verify']);
  const encoder = new TextEncoder();
  const serialized = Object.keys(data).sort().map(k => `${k}:${data[k] ?? ''}`).join('|');
  const sig = await crypto.subtle.sign('HMAC', offlineKey, encoder.encode(serialized));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.substring(0, 16);
}

export async function verifyOfflineLog(data: Record<string, any>, expectedSig: string): Promise<boolean> {
  const computed = await signOfflineLog(data);
  return computed === expectedSig;
}

export function parseSessionTime(dateStr: string, timeStr: string): number {
  try {
    const d = new Date(`${dateStr}T${timeStr}:00`);
    return isNaN(d.getTime()) ? Date.now() : d.getTime();
  } catch {
    return Date.now();
  }
}

export function resolveActiveSession(activity: {
  sessions?: { id: string; date: string; startTime: string; endTime: string; requiresLogout: boolean; label: string; sessionType: string }[];
  activeSessionId?: string;
  startDateTime?: any;
  endDateTime?: any;
  requiresLogout?: boolean;
}) {
  const sessions = activity.sessions;
  if (sessions && sessions.length > 0) {
    const active = sessions.find(s => s.id === (activity.activeSessionId || sessions[0].id));
    return active || sessions[0];
  }
  const d = activity.startDateTime?.toDate ? activity.startDateTime.toDate() : activity.startDateTime ? new Date(activity.startDateTime) : new Date();
  const yd = d.getFullYear();
  const md = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const date = `${yd}-${md}-${dd}`;
  const startTime = activity.startDateTime ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '08:00';
  const ed = activity.endDateTime?.toDate ? activity.endDateTime.toDate() : activity.endDateTime ? new Date(activity.endDateTime) : new Date();
  const endTime = activity.endDateTime ? `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}` : '17:00';
  return {
    id: 'default', date, label: 'Default Session', sessionType: 'WHOLE_DAY' as const,
    requiresLogout: activity.requiresLogout ?? false, startTime, endTime
  };
}
