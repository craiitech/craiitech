type FingerprintInput = {
  academicYear: number;
  submissions: unknown[];
  risks: unknown[];
  cars: unknown[];
  compliances: unknown[];
  programs: unknown[];
  schedules: unknown[];
};

export function createHomeDashboardFingerprint(input: FingerprintInput): string {
  const serialized = JSON.stringify(input);
  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < serialized.length; index++) {
    const code = serialized.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ code, 0x85ebca6b);
  }

  return `${(first >>> 0).toString(16).padStart(8, '0')}${(second >>> 0).toString(16).padStart(8, '0')}`;
}
