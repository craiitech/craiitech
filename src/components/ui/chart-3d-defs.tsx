'use client';

import React from 'react';

/**
 * Reusable SVG definitions for 3D gradient lighting, cylindrical bevels,
 * elevation shadows, and depth filters across Recharts charts.
 */
export function Chart3DDefs({ idPrefix = 'chart3d' }: { idPrefix?: string }) {
  return (
    <svg style={{ height: 0, width: 0, position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* 3D Drop Shadow Filter for Bars, Pies, and Cards */}
        <filter id={`${idPrefix}-elevation-shadow`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.18" floodColor="#0f172a" />
        </filter>

        <filter id={`${idPrefix}-glow-shadow`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>

        <filter id={`${idPrefix}-soft-depth`} x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="2" dy="5" stdDeviation="3" floodOpacity="0.22" floodColor="#000000" />
        </filter>

        {/* --- 3D GRADIENTS WITH SPECULAR LIGHTING --- */}

        {/* Indigo 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-indigo`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a5b4fc" stopOpacity={1} />
          <stop offset="35%" stopColor="#6366f1" stopOpacity={1} />
          <stop offset="85%" stopColor="#4338ca" stopOpacity={1} />
          <stop offset="100%" stopColor="#312e81" stopOpacity={1} />
        </linearGradient>

        {/* Emerald 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-emerald`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6ee7b7" stopOpacity={1} />
          <stop offset="35%" stopColor="#10b981" stopOpacity={1} />
          <stop offset="85%" stopColor="#047857" stopOpacity={1} />
          <stop offset="100%" stopColor="#064e3b" stopOpacity={1} />
        </linearGradient>

        {/* Sky / Blue 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-sky`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7dd3fc" stopOpacity={1} />
          <stop offset="35%" stopColor="#0284c7" stopOpacity={1} />
          <stop offset="85%" stopColor="#0369a1" stopOpacity={1} />
          <stop offset="100%" stopColor="#082f49" stopOpacity={1} />
        </linearGradient>

        {/* Amber / Orange 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-amber`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity={1} />
          <stop offset="35%" stopColor="#f59e0b" stopOpacity={1} />
          <stop offset="85%" stopColor="#d97706" stopOpacity={1} />
          <stop offset="100%" stopColor="#78350f" stopOpacity={1} />
        </linearGradient>

        {/* Rose / Red 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-rose`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" stopOpacity={1} />
          <stop offset="35%" stopColor="#f43f5e" stopOpacity={1} />
          <stop offset="85%" stopColor="#be123c" stopOpacity={1} />
          <stop offset="100%" stopColor="#881337" stopOpacity={1} />
        </linearGradient>

        {/* Violet / Purple 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-violet`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c4b5fd" stopOpacity={1} />
          <stop offset="35%" stopColor="#8b5cf6" stopOpacity={1} />
          <stop offset="85%" stopColor="#6d28d9" stopOpacity={1} />
          <stop offset="100%" stopColor="#4c1d95" stopOpacity={1} />
        </linearGradient>

        {/* Cyan / Teal 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-cyan`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity={1} />
          <stop offset="35%" stopColor="#06b6d4" stopOpacity={1} />
          <stop offset="85%" stopColor="#0e7490" stopOpacity={1} />
          <stop offset="100%" stopColor="#164e63" stopOpacity={1} />
        </linearGradient>

        {/* Fuchsia / Pink 3D Gradient */}
        <linearGradient id={`${idPrefix}-grad-fuchsia`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0abfc" stopOpacity={1} />
          <stop offset="35%" stopColor="#d946ef" stopOpacity={1} />
          <stop offset="85%" stopColor="#a21caf" stopOpacity={1} />
          <stop offset="100%" stopColor="#701a75" stopOpacity={1} />
        </linearGradient>

        {/* Area 3D Flow Gradients (Vertical with gentle fade) */}
        <linearGradient id={`${idPrefix}-area-indigo`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#6366f1" stopOpacity={0.7} />
          <stop offset="50%" stopColor="#818cf8" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.0} />
        </linearGradient>

        <linearGradient id={`${idPrefix}-area-emerald`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity={0.7} />
          <stop offset="50%" stopColor="#34d399" stopOpacity={0.35} />
          <stop offset="100%" stopColor="#059669" stopOpacity={0.0} />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Custom High-Legibility 3D Bar Label with contrasting background badge
 */
export function RenderBar3DLabel(props: any) {
  const { x, y, width, height, value } = props;
  if (value === undefined || value === null || value === 0) return null;

  const isVertical = height > 24;
  const isHorizontal = width > 28;

  const formatted = typeof value === 'number' ? value.toLocaleString() : value;

  if (isVertical) {
    // Top of vertical bar
    return (
      <g>
        <rect
          x={x + width / 2 - 14}
          y={Math.max(0, y - 18)}
          width={28}
          height={15}
          rx={4}
          fill="rgba(15, 23, 42, 0.85)"
          stroke="#e2e8f0"
          strokeWidth={0.5}
        />
        <text
          x={x + width / 2}
          y={Math.max(0, y - 7)}
          fill="#ffffff"
          textAnchor="middle"
          fontSize={8.5}
          fontWeight={900}
          fontFamily="sans-serif"
        >
          {formatted}
        </text>
      </g>
    );
  }

  if (isHorizontal) {
    // End of horizontal bar
    return (
      <g>
        <rect
          x={x + width + 4}
          y={y + height / 2 - 8}
          width={Math.max(26, String(formatted).length * 7 + 8)}
          height={16}
          rx={4}
          fill="rgba(15, 23, 42, 0.85)"
          stroke="#cbd5e1"
          strokeWidth={0.5}
        />
        <text
          x={x + width + 4 + Math.max(26, String(formatted).length * 7 + 8) / 2}
          y={y + height / 2 + 3.5}
          fill="#ffffff"
          textAnchor="middle"
          fontSize={9}
          fontWeight={900}
          fontFamily="sans-serif"
        >
          {formatted}
        </text>
      </g>
    );
  }

  return null;
}

/**
 * Custom 3D Pie / Donut Callout Label with percentage and count
 */
export function RenderPie3DLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent, value, name }: any) {
  if (percent < 0.04) return null; // Skip tiny slices to prevent clutter

  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  const pctString = `${(percent * 100).toFixed(0)}%`;

  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={14}
        fill="rgba(15, 23, 42, 0.88)"
        stroke="#ffffff"
        strokeWidth={1.5}
        filter="drop-shadow(0px 2px 3px rgba(0,0,0,0.3))"
      />
      <text
        x={x}
        y={y + 3.5}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={8.5}
        fontWeight={900}
        fontFamily="sans-serif"
      >
        {pctString}
      </text>
    </g>
  );
}
