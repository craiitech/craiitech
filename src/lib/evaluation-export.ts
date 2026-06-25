'use client';

import { iso25010Categories } from '@/lib/iso-25010-data';
import type { SoftwareEvaluation } from '@/lib/types';

/**
 * Generates a CSV string from evaluation data for all sub-characteristics.
 */
export function generateEvaluationCSV(evaluations: SoftwareEvaluation[]): string {
  const headers = [
    'Category',
    'Sub-Characteristic',
    'Sub-Characteristic ID',
    'ISO Definition',
    'Mean Score',
    'Standard Deviation',
    'Min',
    'Max',
    'N (Respondents)',
    'Qualitative Rating',
  ];

  const rows: string[][] = [];

  for (const cat of iso25010Categories) {
    for (const sub of cat.subCharacteristics) {
      const scores = evaluations.map((e) => e.scores[sub.id] || 0).filter((s) => s > 0);
      const n = scores.length;
      const mean = n > 0 ? scores.reduce((a, b) => a + b, 0) / n : 0;
      const sd =
        n > 1
          ? Math.sqrt(scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / (n - 1))
          : 0;
      const min = n > 0 ? Math.min(...scores) : 0;
      const max = n > 0 ? Math.max(...scores) : 0;
      const rating = getQualitativeRating(mean);

      rows.push([
        cat.name,
        sub.name,
        sub.id,
        `"${sub.desc.replace(/"/g, '""')}"`,
        mean.toFixed(2),
        sd.toFixed(2),
        String(min),
        String(max),
        String(n),
        rating,
      ]);
    }
  }

  // Add summary row
  const allScores = evaluations.flatMap((e) =>
    Object.values(e.scores).filter((s) => typeof s === 'number' && s > 0)
  );
  const overallMean =
    evaluations.length > 0
      ? evaluations.reduce((a, e) => a + e.overallScore, 0) / evaluations.length
      : 0;
  const overallSD =
    evaluations.length > 1
      ? Math.sqrt(
          evaluations.reduce((sum, e) => sum + Math.pow(e.overallScore - overallMean, 2), 0) /
            (evaluations.length - 1)
        )
      : 0;

  rows.push([
    'OVERALL',
    'Aggregate Maturity Index',
    'overall',
    '"Grand mean of all 31 sub-characteristics"',
    overallMean.toFixed(2),
    overallSD.toFixed(2),
    allScores.length > 0 ? String(Math.min(...allScores)) : '0',
    allScores.length > 0 ? String(Math.max(...allScores)) : '0',
    String(evaluations.length),
    getQualitativeRating(overallMean),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates a CSV of category-level averages.
 */
export function generateCategorySummaryCSV(evaluations: SoftwareEvaluation[]): string {
  const headers = [
    'Category',
    'Sub-Characteristics Count',
    'Weight (%)',
    'Category Mean',
    'Standard Deviation',
    'Qualitative Rating',
    'Trend',
  ];

  const rows: string[][] = [];
  const totalSubs = iso25010Categories.reduce((a, c) => a + c.subCharacteristics.length, 0);

  for (const cat of iso25010Categories) {
    const catScores: number[] = [];
    for (const sub of cat.subCharacteristics) {
      const subScores = evaluations.map((e) => e.scores[sub.id] || 0).filter((s) => s > 0);
      if (subScores.length > 0) {
        catScores.push(subScores.reduce((a, b) => a + b, 0) / subScores.length);
      }
    }

    const catMean = catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
    const catSD =
      catScores.length > 1
        ? Math.sqrt(catScores.reduce((s, v) => s + Math.pow(v - catMean, 2), 0) / (catScores.length - 1))
        : 0;
    const weight = ((cat.subCharacteristics.length / totalSubs) * 100).toFixed(1);
    const trend = catMean >= 4.0 ? '↑ High' : catMean >= 3.0 ? '→ Acceptable' : '↓ Needs Improvement';

    rows.push([
      cat.name,
      String(cat.subCharacteristics.length),
      `${weight}%`,
      catMean.toFixed(2),
      catSD.toFixed(2),
      getQualitativeRating(catMean),
      trend,
    ]);
  }

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates a CSV of user comments and recommendations.
 */
export function generateCommentsCSV(evaluations: SoftwareEvaluation[]): string {
  const headers = [
    'Evaluator',
    'Date',
    'Overall Score',
    'Qualitative Rating',
    'General Comments',
    'Recommendations',
  ];

  const rows: string[][] = evaluations
    .filter((e) => e.generalComments || e.recommendations)
    .map((e) => {
      const date = e.timestamp?.toDate
        ? e.timestamp.toDate().toISOString()
        : new Date(e.timestamp).toISOString();
      return [
        `"${(e.userName || 'Anonymous').replace(/"/g, '""')}"`,
        date,
        e.overallScore.toFixed(2),
        getQualitativeRating(e.overallScore),
        `"${(e.generalComments || '').replace(/"/g, '""')}"`,
        `"${(e.recommendations || '').replace(/"/g, '""')}"`,
      ];
    });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates the Likert distribution table as CSV.
 */
export function generateLikertDistributionCSV(evaluations: SoftwareEvaluation[]): string {
  const headers = ['Rating', 'Label', 'Frequency (n)', 'Percentage (%)'];
  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;

  for (const e of evaluations) {
    for (const score of Object.values(e.scores)) {
      if (typeof score === 'number' && score >= 1 && score <= 5) {
        distribution[score]++;
        total++;
      }
    }
  }

  const labels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Satisfactory', 4: 'Good', 5: 'Excellent' };
  const rows = [5, 4, 3, 2, 1].map((rating) => [
    String(rating),
    labels[rating],
    String(distribution[rating]),
    total > 0 ? ((distribution[rating] / total) * 100).toFixed(1) + '%' : '0.0%',
  ]);

  rows.push(['Total', '', String(total), '100.0%']);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

/**
 * Generates a comprehensive markdown research report.
 */
export function generateFullMarkdownReport(evaluations: SoftwareEvaluation[]): string {
  const n = evaluations.length;
  const overallMean = n > 0 ? evaluations.reduce((a, e) => a + e.overallScore, 0) / n : 0;
  const overallSD =
    n > 1
      ? Math.sqrt(evaluations.reduce((s, e) => s + Math.pow(e.overallScore - overallMean, 2), 0) / (n - 1))
      : 0;

  let md = `# RSU EOMS Portal — ISO/IEC 25010 Software Quality Evaluation Results\n\n`;
  md += `> **Generated:** ${new Date().toISOString()}\n`;
  md += `> **Standard:** ISO/IEC 25010:2011\n`;
  md += `> **Total Evaluations (N):** ${n}\n`;
  md += `> **Overall Maturity Index:** ${overallMean.toFixed(2)} (${getQualitativeRating(overallMean)})\n`;
  md += `> **Standard Deviation:** ${overallSD.toFixed(2)}\n\n`;
  md += `---\n\n`;

  // Category Summary Table
  md += `## Category-Level Summary\n\n`;
  md += `| # | Quality Characteristic | Sub-Char Count | Category Mean | SD | Qualitative Rating |\n`;
  md += `|---|----------------------|----------------|--------------|-------|--------------------|\n`;

  const totalSubs = iso25010Categories.reduce((a, c) => a + c.subCharacteristics.length, 0);

  for (let i = 0; i < iso25010Categories.length; i++) {
    const cat = iso25010Categories[i];
    const catScores: number[] = [];
    for (const sub of cat.subCharacteristics) {
      const subScores = evaluations.map((e) => e.scores[sub.id] || 0).filter((s) => s > 0);
      if (subScores.length > 0) {
        catScores.push(subScores.reduce((a, b) => a + b, 0) / subScores.length);
      }
    }
    const catMean = catScores.length > 0 ? catScores.reduce((a, b) => a + b, 0) / catScores.length : 0;
    const catSD =
      catScores.length > 1
        ? Math.sqrt(catScores.reduce((s, v) => s + Math.pow(v - catMean, 2), 0) / (catScores.length - 1))
        : 0;

    md += `| ${i + 1} | ${cat.name} | ${cat.subCharacteristics.length} | ${catMean.toFixed(2)} | ${catSD.toFixed(2)} | ${getQualitativeRating(catMean)} |\n`;
  }

  md += `| | **Overall** | **${totalSubs}** | **${overallMean.toFixed(2)}** | **${overallSD.toFixed(2)}** | **${getQualitativeRating(overallMean)}** |\n\n`;

  // Sub-Characteristic Detail
  md += `## Sub-Characteristic Detail\n\n`;
  md += `| # | Category | Sub-Characteristic | ID | Mean | SD | Min | Max | N | Rating |\n`;
  md += `|---|----------|-------------------|----|------|-----|-----|-----|---|--------|\n`;

  let counter = 1;
  for (const cat of iso25010Categories) {
    for (const sub of cat.subCharacteristics) {
      const scores = evaluations.map((e) => e.scores[sub.id] || 0).filter((s) => s > 0);
      const sn = scores.length;
      const mean = sn > 0 ? scores.reduce((a, b) => a + b, 0) / sn : 0;
      const sd =
        sn > 1 ? Math.sqrt(scores.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / (sn - 1)) : 0;
      const min = sn > 0 ? Math.min(...scores) : 0;
      const max = sn > 0 ? Math.max(...scores) : 0;

      md += `| ${counter} | ${cat.name} | ${sub.name} | ${sub.id} | ${mean.toFixed(2)} | ${sd.toFixed(2)} | ${min} | ${max} | ${sn} | ${getQualitativeRating(mean)} |\n`;
      counter++;
    }
  }

  // Likert Distribution
  md += `\n## Likert Scale Distribution\n\n`;
  md += `| Rating | Label | Frequency (n) | Percentage (%) |\n`;
  md += `|--------|-------|---------------|----------------|\n`;

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let total = 0;
  for (const e of evaluations) {
    for (const score of Object.values(e.scores)) {
      if (typeof score === 'number' && score >= 1 && score <= 5) {
        distribution[score]++;
        total++;
      }
    }
  }

  const labels: Record<number, string> = { 1: 'Poor', 2: 'Fair', 3: 'Satisfactory', 4: 'Good', 5: 'Excellent' };
  for (const rating of [5, 4, 3, 2, 1]) {
    const pct = total > 0 ? ((distribution[rating] / total) * 100).toFixed(1) : '0.0';
    md += `| ${rating} | ${labels[rating]} | ${distribution[rating]} | ${pct}% |\n`;
  }
  md += `| **Total** | | **${total}** | **100.0%** |\n\n`;

  // User Comments
  const withComments = evaluations.filter((e) => e.generalComments || e.recommendations);
  if (withComments.length > 0) {
    md += `## User Comments & Recommendations\n\n`;
    for (const e of withComments) {
      const date = e.timestamp?.toDate
        ? e.timestamp.toDate().toLocaleDateString()
        : new Date(e.timestamp).toLocaleDateString();
      md += `### ${e.userName} — ${date} (Score: ${e.overallScore.toFixed(1)})\n\n`;
      if (e.generalComments) {
        md += `**General Comments:**\n> ${e.generalComments.replace(/\n/g, '\n> ')}\n\n`;
      }
      if (e.recommendations) {
        md += `**Recommendations:**\n> ${e.recommendations.replace(/\n/g, '\n> ')}\n\n`;
      }
      md += `---\n\n`;
    }
  }

  return md;
}

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies text to clipboard.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

function getQualitativeRating(score: number): string {
  if (score >= 4.5) return 'Exceptional';
  if (score >= 4.0) return 'High Quality';
  if (score >= 3.0) return 'Acceptable';
  if (score >= 1.0) return 'Action Required';
  return 'No Data';
}
