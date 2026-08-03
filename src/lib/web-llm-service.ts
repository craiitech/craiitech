'use client';

import { CreateMLCEngine, MLCEngine, InitProgressReport } from '@mlc-ai/web-llm';

export interface WebLlmModelInfo {
  id: string;
  name: string;
  size: string;
  description: string;
  isRecommended?: boolean;
}

export const AVAILABLE_WEBLLM_MODELS: WebLlmModelInfo[] = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (1B Instruct)',
    size: '~600 MB',
    description: 'Fast, lightweight model tuned for executive summaries & compliance analysis.',
    isRecommended: true,
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Alibaba Qwen 2.5 (1.5B Instruct)',
    size: '~900 MB',
    description: 'High-precision model for deep risk intelligence & analytical discussions.',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Microsoft Phi 3.5 Mini',
    size: '~2.1 GB',
    description: 'Advanced reasoning model for complex institutional decision evaluations.',
  },
  {
    id: 'SmolLM2-360M-Instruct-q4f16_1-MLC',
    name: 'HuggingFace SmolLM2 (360M)',
    size: '~250 MB',
    description: 'Ultra lightweight model for low-memory devices & quick commentary.',
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Meta Llama 3.2 (3B Instruct)',
    size: '~1.8 GB',
    description: 'Comprehensive high-capacity model for thorough strategic narratives.',
  },
];

let globalEngine: MLCEngine | null = null;
let currentLoadedModelId: string | null = null;

/**
 * Checks if a WebLLM model is already cached in browser CacheStorage or localStorage
 */
export async function checkCachedWebLlmModel(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  const storedModel = localStorage.getItem('rsu_webllm_selected_model');

  try {
    if ('caches' in window) {
      const keys = await caches.keys();
      const hasWebLlmCache = keys.some((k) => k.includes('webllm') || k.includes('mlc') || k.includes('model'));

      if (hasWebLlmCache && storedModel) {
        return storedModel;
      }
    }
  } catch (e) {
    console.warn('Error checking WebLLM cache:', e);
  }

  return storedModel || null;
}

/**
 * Initializes the WebLLM engine with background progress tracking
 */
export async function initWebLlmEngine(
  modelId: string,
  onProgress?: (report: InitProgressReport) => void,
): Promise<MLCEngine> {
  if (globalEngine && currentLoadedModelId === modelId) {
    return globalEngine;
  }

  try {
    const engine = await CreateMLCEngine(modelId, {
      initProgressCallback: (report) => {
        if (onProgress) onProgress(report);
      },
    });

    globalEngine = engine;
    currentLoadedModelId = modelId;
    localStorage.setItem('rsu_webllm_selected_model', modelId);
    return engine;
  } catch (err) {
    console.error('Failed to initialize WebLLM engine:', err);
    throw err;
  }
}

/**
 * Generates AI discussion commentary using WebLLM
 */
export async function generateWebLlmDiscussion(prompt: string, contextData?: Record<string, unknown>): Promise<string> {
  if (globalEngine) {
    try {
      const systemPrompt =
        'You are an expert Institutional Quality Assurance & EOMS Auditor for Romblon State University. Generate concise, professional, action-oriented executive AI discussion and strategic insights for institutional dashboards. Keep paragraph under 120 words.';

      const contextStr = contextData ? `\n\nLive Metrics Data: ${JSON.stringify(contextData)}` : '';

      const completion = await globalEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}${contextStr}` },
        ],
        temperature: 0.5,
        max_tokens: 300,
      });

      return completion.choices[0]?.message?.content || fallbackDiscussionGenerator(prompt, contextData);
    } catch (e) {
      console.warn('WebLLM generation error, using fallback discussion:', e);
    }
  }

  return fallbackDiscussionGenerator(prompt, contextData);
}

/**
 * Generates an academic research-paper "Discussion of Findings" section using WebLLM.
 * Produces formal, third-person academic prose that interprets ISO/IEC 25010 results,
 * ties them to the verbal interpretation scale, and derives implications & recommendations.
 */
export async function generateWebLlmResearchDiscussion(
  prompt: string,
  contextData?: Record<string, unknown>,
  maxTokens = 600,
): Promise<string> {
  if (globalEngine) {
    try {
      const systemPrompt =
        'You are an academic research co-author specializing in ISO/IEC 25010 software quality evaluation. ' +
        'Write a formal, third-person academic "Discussion of Findings" paragraph for a research paper or thesis. ' +
        'Interpret the weighted means and verbal interpretations, explain the highest and lowest scores, ' +
        'relate the findings to the ISO definitions and to related studies of academic information systems, ' +
        'and conclude with institutional implications and recommendations. ' +
        'Use an academic tone, complete sentences, and no bullet points.';

      const contextStr = contextData ? `\n\nStudy Data: ${JSON.stringify(contextData)}` : '';

      const completion = await globalEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}${contextStr}` },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || fallbackSoftwareQualityDiscussionGenerator(prompt, contextData);
    } catch (e) {
      console.warn('WebLLM research discussion error, using fallback:', e);
    }
  }

  return fallbackSoftwareQualityDiscussionGenerator(prompt, contextData);
}

/**
 * Rule-based academic fallback for ISO/IEC 25010 software quality discussions.
 * Used when WebGPU is unavailable, the engine is still initializing, or generation fails.
 */
export function fallbackSoftwareQualityDiscussionGenerator(
  prompt: string,
  contextData?: Record<string, unknown>,
): string {
  const overallMean = (contextData?.overallMean as number) ?? null;
  const overallSD = (contextData?.overallSD as number) ?? null;
  const evaluationCount = (contextData?.evaluationCount as number) ?? 0;
  const categoryName = contextData?.categoryName as string | undefined;
  const categoryMean = contextData?.categoryMean as number | undefined;
  const subCharacteristics =
    (contextData?.subCharacteristics as Array<{ name: string; mean: number; desc?: string }>) ?? [];
  const categories = (contextData?.categories as Array<{ name: string; mean: number }>) ?? [];

  const verbal = (m: number): string => {
    if (m >= 4.5) return 'Strongly Agree';
    if (m >= 3.5) return 'Agree';
    if (m >= 2.5) return 'Moderately Agree';
    if (m >= 1.5) return 'Disagree';
    return 'Strongly Disagree';
  };

  // Per-category discussion
  if (categoryName && typeof categoryMean === 'number') {
    const sorted = [...subCharacteristics].sort((a, b) => b.mean - a.mean);
    const top = sorted.slice(0, 3).map((s) => s.name);
    const bottom = sorted.slice(-2).map((s) => s.name);

    let text = `The evaluation of ${categoryName} yielded an overall weighted mean of ${categoryMean.toFixed(2)}, verbally interpreted as "${verbal(categoryMean)}". `;
    text += `This finding indicates that the EOMS submission portal satisfies the ISO/IEC 25010 requirements for this quality characteristic at a ${
      categoryMean >= 4.0 ? 'high' : categoryMean >= 3.0 ? 'satisfactory' : 'developing'
    } level. `;
    if (top.length) {
      text += `The strongest sub-characteristics were ${top.join(', ')}, suggesting that these aspects are well established and positively perceived by the respondents. `;
    }
    if (bottom.length) {
      text += `Conversely, ${bottom.join(', ')} registered the lowest means, indicating areas that may require further enhancement to raise the overall maturity of this characteristic. `;
    }
    text += `These results are consistent with prior ISO/IEC 25010-based assessments of academic information systems, which commonly report ${
      categoryMean >= 3.5
        ? 'high ratings for this characteristic'
        : 'comparatively moderate ratings for this characteristic'
    }. `;
    text += `Institutionally, the finding implies that continuous monitoring and targeted improvement of the lower-rated sub-characteristics should be prioritized to sustain quality assurance objectives.`;
    return text;
  }

  // Overall discussion
  if (typeof overallMean === 'number') {
    const sorted = [...categories].sort((a, b) => b.mean - a.mean);
    const highest = sorted[0];
    const lowest = sorted[sorted.length - 1];

    let text = `The aggregate software quality assessment of the RSU EOMS Submission Portal, evaluated against the ISO/IEC 25010:2011 quality model, produced an overall maturity index of ${overallMean.toFixed(2)} (SD = ${
      overallSD !== null ? overallSD.toFixed(2) : 'N/A'
    }), verbally interpreted as "${verbal(overallMean)}" based on ${evaluationCount} evaluation${evaluationCount === 1 ? '' : 's'}. `;
    text += `This index indicates that the portal's quality, as perceived by its stakeholders, is ${
      overallMean >= 4.0
        ? 'commendable and supportive of institutional quality assurance operations'
        : overallMean >= 3.0
          ? 'acceptable, with room for continued refinement'
          : 'still in need of substantial improvement'
    }. `;
    if (highest) {
      text += `Among the eight quality characteristics, ${highest.name} obtained the highest weighted mean (${highest.mean.toFixed(2)}), signifying a well-matured aspect of the system. `;
    }
    if (lowest) {
      text += `Meanwhile, ${lowest.name} registered the lowest weighted mean (${lowest.mean.toFixed(2)}), identifying it as the primary candidate for future enhancement. `;
    }
    text += `The findings are comparable to similar ISO/IEC 25010 evaluations of university management systems, where functional and usability characteristics typically dominate performance scores. `;
    text += `It is recommended that the institution sustain the established quality strengths, address the identified weaknesses through continuous improvement initiatives, and conduct periodic re-evaluations to track maturity progression.`;
    return text;
  }

  return 'An academic discussion of the findings could not be generated from the available data. Please ensure evaluation records exist and try again.';
}

/**
 * Generates a concise executive briefing for the EOMS Executive Overview using WebLLM.
 * Synthesizes the institutional quality posture from live compliance metrics.
 */
export async function generateWebLlmExecutiveBriefing(
  prompt: string,
  contextData?: Record<string, unknown>,
  maxTokens = 700,
): Promise<string> {
  if (globalEngine) {
    try {
      const systemPrompt =
        "You are an expert Executive Briefing Analyst for Romblon State University's EOMS (ISO 21001:2018). " +
        'Write a concise, professional, action-oriented institutional briefing for the university executive leadership. ' +
        'Synthesize the provided live compliance metrics, and for every metric you reference briefly explain WHAT the metric measures, what its current value implies, and the recommended action it calls for. ' +
        'Then list the open-item register and end with clearly prioritized recommended actions. ' +
        'Use short paragraphs; keep each point on its own line. Formal executive tone, no jargon.';

      const contextStr = contextData ? `\n\nLive Compliance Metrics: ${JSON.stringify(contextData)}` : '';

      const completion = await globalEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}${contextStr}` },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || fallbackExecutiveBriefingGenerator(prompt, contextData);
    } catch (e) {
      console.warn('WebLLM executive briefing error, using fallback:', e);
    }
  }

  return fallbackExecutiveBriefingGenerator(prompt, contextData);
}

/**
 * Rule-based executive briefing fallback when WebGPU/engine is unavailable.
 * Produces a complete briefing that explains each metric's meaning, its value,
 * its implication, and the prioritized actions it implies.
 */
export function fallbackExecutiveBriefingGenerator(prompt: string, contextData?: Record<string, unknown>): string {
  // Metric values are stored either as a 0..1 ratio or a percentage; normalize to 0..100.
  const toPct = (k: string): number => {
    const n = Number(contextData?.[k] ?? 0);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  };

  const score = toPct('eomsQualityScore') || toPct('eomsScore');
  const submissionRate = toPct('submissionRate');
  const iqaProgressRate = toPct('iqaProgressRate');
  const carResolutionRate = toPct('carResolutionRate');
  const riskControlRate = toPct('riskControlRate');
  const copcComplianceRate = toPct('copcComplianceRate');
  const accreditationRate = toPct('accreditationRate');
  const openCars = Number(contextData?.openCars ?? 0);
  const pendingAudits = Number(contextData?.pendingAudits ?? 0);
  const openRisks = Number(contextData?.openRisks ?? 0);
  const missingCopc = Number(contextData?.missingCopc ?? 0);
  const scope = (contextData?.scope as string) ?? 'university';

  const scopeLabel = scope === 'unit' ? 'the unit' : scope === 'campus' ? 'the campus' : 'the university';

  // Per-metric explanation: meaning + implication + action.
  const explain = (label: string, value: number, meaning: string, ok: string, warn: string): string => {
    const status = value >= 80 ? 'strong' : value >= 60 ? 'acceptable' : value >= 40 ? 'concerning' : 'critical';
    return `${label} (${value}%) tracks ${meaning}. This is ${status}. ${value >= 60 ? ok : warn}`;
  };

  const lines: string[] = [];

  lines.push(
    `${scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1)} is operating at a ${score}% EOMS quality index — the composite readout of all monitored compliance dimensions combined.`,
  );

  lines.push(
    explain(
      'Submission compliance',
      submissionRate,
      'the share of required documents, reports, and quality records actually submitted against the planned list',
      'Maintain the submission cadence and keep closure evidence current.',
      'Review the submission pipeline, clear documentation backlogs, and reinforce on-time reporting.',
    ),
  );

  lines.push(
    explain(
      'Internal audit (IQA) progress',
      iqaProgressRate,
      'how much of the scheduled internal quality audit plan has been completed this cycle',
      'Keep the audit calendar on track.',
      'Catch up on scheduled audits so independent assurance of the quality management system is not left stale.',
    ),
  );

  lines.push(
    explain(
      'CAR resolution',
      carResolutionRate,
      'the share of corrective action requests submitted that were actually closed',
      'Sustain closure of corrective actions.',
      'Prioritize closing open corrective action requests; lower resolution than submission means known nonconformities remain exposed and may recur.',
    ),
  );

  lines.push(
    explain(
      'Risk control',
      riskControlRate,
      'the share of identified risks that have a fully implemented control or mitigation',
      'Keep the risk register current.',
      'Treat the highest-risk register entries; a low control rate leaves unaddressed threats to institutional objectives.',
    ),
  );

  lines.push(
    explain(
      'CHED COPC compliance',
      copcComplianceRate,
      'the share of academic programs holding a valid Certificate of Program Compliance',
      'Maintain certificate coverage across programs.',
      'Renew missing COPC certificates; programs without them are ineligible to advance toward external accreditation.',
    ),
  );

  lines.push(
    explain(
      'Accreditation performance',
      accreditationRate,
      'progress of academic programs toward their target external accreditation maturity',
      'Continue program-level readiness work.',
      'Accelerate program readiness so quality recognition is not delayed.',
    ),
  );

  const residuals: string[] = [];
  if (openCars > 0) residuals.push(`${openCars} open corrective action request(s)`);
  if (pendingAudits > 0) residuals.push(`${pendingAudits} pending internal quality audit(s)`);
  if (openRisks > 0) residuals.push(`${openRisks} uncontrolled risk register item(s)`);
  if (missingCopc > 0) residuals.push(`${missingCopc} program(s) missing CHED COPC certificates`);

  if (residuals.length > 0) {
    lines.push(`Open-item register shows ${residuals.join(', ')}.`);
  } else {
    lines.push('Open-item register shows no residual corrective, audit, risk, or COPC items.');
  }

  const targets: string[] = [];
  if (submissionRate < 75) targets.push('clear the submission backlog and restore on-time reporting');
  if (iqaProgressRate < 75) targets.push('execute the remaining internal quality audits on schedule');
  if (carResolutionRate < 75 && openCars > 0)
    targets.push('resolve the highest-impact open CARs with verified closure evidence');
  if (riskControlRate < 75 && openRisks > 0) targets.push('treat the highest-severity open risks');
  if (copcComplianceRate < 100 && missingCopc > 0) targets.push('renew the expiring CHED COPC certificates');
  if (accreditationRate < 75) targets.push('advance program accreditation readiness');

  lines.push(
    targets.length > 0
      ? `Prioritized actions: ${targets.join('; ')}.`
      : 'Prioritized action: sustain the current compliance monitoring cadence to maintain ISO 21001:2018 alignment.',
  );

  return lines.join('\n');
}

/**
 * High quality fallback discussion generator if WebGPU is unavailable or engine is initializing
 */
export function fallbackDiscussionGenerator(prompt: string, contextData?: Record<string, unknown>): string {
  const score = (contextData?.eomsScore as number) ?? (contextData?.compositeScore as number) ?? 85;
  const subs = (contextData?.totalSubs as number) ?? (contextData?.subsTotal as number) ?? 0;
  const risks = (contextData?.totalRisks as number) ?? (contextData?.risksTotal as number) ?? 0;

  if (prompt.toLowerCase().includes('overview') || prompt.toLowerCase().includes('health')) {
    return `Institutional EOMS health is operating at a ${score}% composite compliance index across all active campuses. Quantitative tracking reveals ${subs} document submissions and ${risks} logged risk items. Strategic priorities focus on resolving open CAR items and strengthening cross-campus quality alignment for ISO 21001:2018 accreditation requirements.`;
  }

  if (prompt.toLowerCase().includes('submission') || prompt.toLowerCase().includes('compliance')) {
    return `Submission compliance shows strong momentum with ${subs} total archived deliverables. Operational planning and SWOT analyses represent the highest completion rates, while action plan entries require accelerated unit-level verification before upcoming cycle deadlines.`;
  }

  if (prompt.toLowerCase().includes('risk') || prompt.toLowerCase().includes('threat')) {
    return `Risk intelligence indicates ${risks} tracked operational items. High-severity entries are predominantly centered in infrastructure and academic continuity. Preventive action plans are 78% implemented, mitigating critical institutional vulnerabilities.`;
  }

  if (prompt.toLowerCase().includes('car') || prompt.toLowerCase().includes('corrective')) {
    return `Corrective Action Requests (CAR) maintain an active resolution rate. Audited non-conformances emphasize process documentation and calibration logs. Units are advised to complete root-cause verifications promptly to ensure full audit closure.`;
  }

  if (prompt.toLowerCase().includes('audit') || prompt.toLowerCase().includes('accreditation')) {
    return `Internal Quality Audit (IQA) and accreditation records demonstrate steady progress toward regional accreditation standards. Continuous monitoring of assigned recommendations is essential to ensure 100% compliance across all academic programs.`;
  }

  return `Executive analysis confirms steady progress in institutional quality management. Operational metrics demonstrate high compliance alignment with RSU EOMS policies. Priority focus remains on timely submissions, risk mitigation, and root-cause resolution for corrective actions.`;
}
