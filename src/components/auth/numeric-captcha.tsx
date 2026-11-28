'use client';

import { useEffect, useRef } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface NumericCaptchaProps {
  code: string;
  value: string;
  onChange: (value: string) => void;
  onRefresh: () => void;
  failedAttempts: number;
  maxAttempts: number;
  disabled?: boolean;
}

export function NumericCaptcha({
  code,
  value,
  onChange,
  onRefresh,
  failedAttempts,
  maxAttempts,
  disabled = false,
}: NumericCaptchaProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const remainingAttempts = Math.max(0, maxAttempts - failedAttempts);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;

    // Clean high-contrast dark slate background for readability
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Subtle distortion lines to deter plain OCR while keeping digits legible
    for (let i = 0; i < 4; i += 1) {
      ctx.strokeStyle = i % 2 === 0 ? 'rgba(148, 163, 184, 0.25)' : 'rgba(56, 189, 248, 0.22)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, ((i + 1) * height) / 5 + (i % 2 === 0 ? -4 : 4));
      ctx.bezierCurveTo(width * 0.33, (i * 13) % height, width * 0.66, height - ((i * 11) % height), width, height / 2);
      ctx.stroke();
    }

    // Light background speckle dots
    for (let i = 0; i < 24; i += 1) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.28)';
      const x = (i * 37 + code.charCodeAt(i % code.length) * 13) % width;
      const y = (i * 19 + code.charCodeAt((i + 1) % code.length) * 7) % height;
      ctx.fillRect(x, y, 1.5, 1.5);
    }

    // Draw each digit with slight vertical jitter & rotation
    const digitSpacing = width / (code.length + 1);
    ctx.font = 'bold 24px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';

    for (let i = 0; i < code.length; i += 1) {
      const char = code[i];
      const seed = char.charCodeAt(0) + i * 17;
      const angle = ((seed % 9) - 4) * 0.035;
      const offsetY = ((seed % 7) - 3) * 1.1;

      ctx.save();
      ctx.translate(digitSpacing * (i + 1), height / 2 + offsetY);
      ctx.rotate(angle);
      ctx.fillStyle = i % 2 === 0 ? '#f8fafc' : '#bae6fd';
      ctx.fillText(char, 0, 0);
      ctx.restore();
    }
  }, [code]);

  return (
    <div className="rounded-lg border border-amber-500/40 bg-slate-950/80 p-3.5 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor="captcha-signin" className="text-xs font-semibold text-amber-200 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          CAPTCHA Verification Required
        </Label>
        <span className="text-[11px] font-medium text-slate-400">
          {remainingAttempts} of {maxAttempts} tries left
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <canvas
          ref={canvasRef}
          width={180}
          height={48}
          role="img"
          aria-label="CAPTCHA numeric challenge"
          className="h-12 w-[180px] rounded-md border border-slate-700 bg-slate-900 select-none shrink-0"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={disabled}
          aria-label="Generate new CAPTCHA number"
          title="Generate new CAPTCHA number"
          className="h-12 w-11 shrink-0 bg-gray-800/70 border-gray-700 text-slate-200 hover:bg-gray-700 hover:text-white"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <Input
        id="captcha-signin"
        type="text"
        inputMode="numeric"
        autoComplete="off"
        maxLength={code.length}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, ''))}
        disabled={disabled}
        placeholder={`Enter the ${code.length}-digit number above`}
        className="bg-gray-800/50 border-gray-700 text-white tracking-[0.25em] font-mono text-center focus:ring-amber-400 focus:border-amber-400"
      />

      <p className={failedAttempts > 0 ? 'text-[11px] font-medium text-amber-300' : 'text-[11px] text-slate-400'}>
        {failedAttempts > 0
          ? `Invalid CAPTCHA attempts: ${failedAttempts} of ${maxAttempts} (${remainingAttempts} remaining before 30-minute lockout).`
          : `Enter the ${code.length}-digit number above to verify your identity.`}
      </p>
    </div>
  );
}
