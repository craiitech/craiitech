import { parseDate } from './utils';

// HMAC salts — stored in public env vars so they're not in source code.
// NEXT_PUBLIC is used because these need to be available in the browser bundle.
// Rotation scheme: set NEXT_PUBLIC_ATTENDANCE_SALT_{YEAR} before each year.
// The fallback maintains compatibility if no env var is set.
function getSalt(year: number): string {
  const envKey = `NEXT_PUBLIC_ATTENDANCE_SALT_${year}` as string;
  const envSalt = typeof process !== 'undefined' ? (process.env[envKey] || process.env.NEXT_PUBLIC_ATTENDANCE_SALT) : undefined;
  return envSalt || `rsu_attendance_secure_salt_${year}`;
}

function getOtpSalt(year: number): string {
  const envKey = `NEXT_PUBLIC_ATTENDANCE_OTP_SALT_${year}` as string;
  const envSalt = typeof process !== 'undefined' ? (process.env[envKey] || process.env.NEXT_PUBLIC_ATTENDANCE_OTP_SALT) : undefined;
  return envSalt || `rsu-otp-key-${year}`;
}

function getOfflineSalt(year: number): string {
  const envKey = `NEXT_PUBLIC_ATTENDANCE_OFFLINE_SALT_${year}` as string;
  const envSalt = typeof process !== 'undefined' ? (process.env[envKey] || process.env.NEXT_PUBLIC_ATTENDANCE_OFFLINE_SALT) : undefined;
  return envSalt || `rsu-offline-log-key-${year}`;
}

const currentYear = new Date().getFullYear();

let hmacKey: CryptoKey | null = null;
let hmacKeyPrev: CryptoKey | null = null;
let otpKey: CryptoKey | null = null;
const otpKeyPrev: CryptoKey | null = null;
let offlineKey: CryptoKey | null = null;
let offlineKeyPrev: CryptoKey | null = null;

async function getKey(salt: string, usage: KeyUsage[]): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(salt);
  return crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, usage);
}

export async function generatePayloadSignature(userId: string, timestamp: number, fp: string): Promise<string> {
  if (!hmacKey) hmacKey = await getKey(getSalt(currentYear), ['sign', 'verify']);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}-${timestamp}-${fp}`);
  const signature = await crypto.subtle.sign('HMAC', hmacKey, data);
  const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `SIG-${hex.substring(0, 16)}`;
}

export async function verifyPayloadSignature(userId: string, timestamp: number, fp: string, expectedSig: string): Promise<boolean> {
  const expectedPrefix = 'SIG-';
  if (!expectedSig.startsWith(expectedPrefix)) return false;
  const sigHex = expectedSig.slice(expectedPrefix.length);

  const encoder = new TextEncoder();
  const data = encoder.encode(`${userId}-${timestamp}-${fp}`);

  // Try current year key first, then previous year
  for (const key of [await getCurrentHmacKey(), await getPrevHmacKey()].filter(Boolean)) {
    if (!key) continue;
    const computed = await crypto.subtle.sign('HMAC', key, data);
    const hex = Array.from(new Uint8Array(computed)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
    if (hex === sigHex) return true;
  }
  return false;
}

async function getCurrentHmacKey(): Promise<CryptoKey | null> {
  try {
    if (!hmacKey) hmacKey = await getKey(getSalt(currentYear), ['sign', 'verify']);
    return hmacKey;
  } catch { return null; }
}

async function getPrevHmacKey(): Promise<CryptoKey | null> {
  try {
    if (!hmacKeyPrev) hmacKeyPrev = await getKey(getSalt(currentYear - 1), ['sign', 'verify']);
    return hmacKeyPrev;
  } catch { return null; }
}

export async function generateActivityCode(activityId: string, timestamp: number): Promise<string> {
  if (!otpKey) otpKey = await getKey(getOtpSalt(currentYear), ['sign', 'verify']);
  const windowId = Math.floor(timestamp / 60000);
  const encoder = new TextEncoder();
  const data = encoder.encode(`${activityId}-${windowId}`);
  const signature = await crypto.subtle.sign('HMAC', otpKey, data);
  const hash = new DataView(signature).getUint32(0);
  return ((Math.abs(hash) % 900) + 100).toString();
}

export async function signOfflineLog(data: Record<string, unknown>): Promise<string> {
  if (!offlineKey) offlineKey = await getKey(getOfflineSalt(currentYear), ['sign', 'verify']);
  const encoder = new TextEncoder();
  const serialized = Object.keys(data).sort().map(k => `${k}:${data[k] ?? ''}`).join('|');
  const sig = await crypto.subtle.sign('HMAC', offlineKey, encoder.encode(serialized));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.substring(0, 16);
}

export async function verifyOfflineLog(data: Record<string, unknown>, expectedSig: string): Promise<boolean> {
  const computed = await signOfflineLog(data);
  if (computed === expectedSig) return true;
  // Try previous year salt
  if (!offlineKeyPrev) offlineKeyPrev = await getKey(getOfflineSalt(currentYear - 1), ['sign', 'verify']);
  const encoder = new TextEncoder();
  const serialized = Object.keys(data).sort().map(k => `${k}:${data[k] ?? ''}`).join('|');
  const sig = await crypto.subtle.sign('HMAC', offlineKeyPrev, encoder.encode(serialized));
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.substring(0, 16) === expectedSig;
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
  startDateTime?: unknown;
  endDateTime?: unknown;
  requiresLogout?: boolean;
}) {
  const sessions = activity.sessions;
  if (sessions && sessions.length > 0) {
    const active = sessions.find(s => s.id === (activity.activeSessionId || sessions[0].id));
    return active || sessions[0];
  }
  const d = activity.startDateTime ? parseDate(activity.startDateTime) : new Date();
  const yd = d.getFullYear();
  const md = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const date = `${yd}-${md}-${dd}`;
  const startTime = activity.startDateTime ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '08:00';
  const ed = activity.endDateTime ? parseDate(activity.endDateTime) : new Date();
  const endTime = activity.endDateTime ? `${String(ed.getHours()).padStart(2, '0')}:${String(ed.getMinutes()).padStart(2, '0')}` : '17:00';
  return {
    id: 'default', date, label: 'Default Session', sessionType: 'WHOLE_DAY' as const,
    requiresLogout: activity.requiresLogout ?? false, startTime, endTime
  };
}
