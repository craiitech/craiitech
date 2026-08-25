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
        'First state the composite posture and an overall verdict (strong / mixed / AT RISK). ' +
        'Then rank the monitored dimensions from most to least urgent, and for each briefly explain WHAT the metric measures, what its current value implies, and the action it calls for. ' +
        'Put a clear CRITICAL PRIORITIES — ACT NOW callout for any dimension in the danger zone. ' +
        'List the open-item register and end with a numbered ORDERED ACTION PLAN sequenced strictly by urgency, starting with the highest-impact exposure. ' +
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
 * Produces a complete briefing that explains each metric's meaning and value,
 * emphasizes the most critical gaps (ranked by severity), and closes with an
 * ordered, urgency-based action plan those gaps call for.
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

  // Per-metric status word and urgency ranking.
  const word = (v: number): string =>
    v >= 80 ? 'strong' : v >= 60 ? 'acceptable' : v >= 40 ? 'concerning' : 'critical';

  const dims: Array<{
    label: string;
    value: number;
    measure: string;
    action: string;
    survive: string;
    residual: string;
  }> = [
    {
      label: 'RISK CONTROL',
      value: riskControlRate,
      measure: 'the share of identified risks that have a fully implemented control or mitigation',
      action: `Treat the highest-priority open risks first (${openRisks} open register items) — uncontrolled exposures are live threats to institutional objectives.`,
      survive: 'Retain the risk register and control cadence.',
      residual: openRisks > 0 ? ` (${openRisks} open register items)` : '',
    },
    {
      label: 'SUBMISSION COMPLIANCE',
      value: submissionRate,
      measure: 'the share of required documents, reports, and quality records actually delivered on the planned list',
      action: 'Clear the submission backlog and restore on-time reporting so ISO 21001:2018 evidence is complete.',
      survive: 'Maintain the submission cadence and closure evidence.',
      residual: '',
    },
    {
      label: 'ACCREDITATION PERFORMANCE',
      value: accreditationRate,
      measure: 'progress of academic programs toward their target external accreditation maturity',
      action: 'Accelerate program accreditation readiness so institutional quality recognition is not delayed.',
      survive: 'Continue program-level readiness work.',
      residual: '',
    },
    {
      label: 'CAR RESOLUTION',
      value: carResolutionRate,
      measure: 'the share of corrective action requests submitted that were actually closed',
      action: `Resolve the highest-impact open CARs with verified closure evidence (${openCars} open).`,
      survive: 'Complete closure of corrective actions.',
      residual: openCars > 0 ? ` (${openCars} open)` : '',
    },
    {
      label: 'INTERNAL AUDIT (IQA) PROGRESS',
      value: iqaProgressRate,
      measure: 'how many of the scheduled internal quality audits have been completed this cycle',
      action: `Execute the remaining internal audits on schedule (${pendingAudits} pending) so assurance stays current.`,
      survive: 'Keep the audit calendar on schedule.',
      residual: pendingAudits > 0 ? ` (${pendingAudits} pending)` : '',
    },
    {
      label: 'CHED COPC COMPLIANCE',
      value: copcComplianceRate,
      measure: 'the share of academic programs holding a valid Certificate of Program Compliance',
      action: `Renew the ${missingCopc} expiring CHED COPC certificates so programs remain accreditation-eligible.`,
      survive: 'Maintain certificate coverage across programs.',
      residual: missingCopc > 0 ? ` (${missingCopc} missing)` : '',
    },
  ];

  // Rank by severity first (critical first), then by largest gap.
  const tierToOrder: Record<string, number> = { critical: 0, concerning: 1, acceptable: 2, strong: 3 };
  const ranked = [...dims].sort((a, b) => tierToOrder[word(a.value)] - tierToOrder[word(b.value)] || a.value - b.value);

  const criticalDims = ranked.filter((d) => word(d.value) === 'critical');
  const needsAction = ranked.filter((d) => d.residual !== '' || (word(d.value) !== 'strong' && d.value < 85));

  const lines: string[] = [];

  const scopeTitle = scopeLabel.charAt(0).toUpperCase() + scopeLabel.slice(1);
  lines.push(
    `${scopeTitle} is operating at a ${score}% EOMS quality index — the composite readout of all monitored compliance dimensions combined.`,
  );

  const overall =
    score >= 70
      ? 'Overall institutional posture is strong.'
      : score >= 55
        ? 'Posture is mixed — strengths exist but several dimensions must not be left unchecked.'
        : 'OVERALL POSTURE IS AT RISK — multiple dimensions sit below acceptable thresholds and need immediate executive action.';
  lines.push(overall);

  if (criticalDims.length > 0) {
    lines.push('=== CRITICAL PRIORITIES — ACT NOW ===');
    criticalDims.forEach((d, i) => {
      lines.push(
        `${i + 1}. ${d.label} (${d.value}%)${d.residual} is ${word(d.value)}: it tracks ${d.measure}. ${d.action}`,
      );
    });
  } else {
    lines.push('=== PRIORITY WATCH === No dimension is critical this period; keep the items below moving.');
  }

  lines.push('=== PER-DIMENSION DETAIL ===');
  ranked.forEach((d) => {
    const s = word(d.value);
    const noAction = s === 'strong' && d.residual === '';
    const verdict = noAction
      ? 'strong — no action required'
      : s === 'strong'
        ? 'strong overall, but residual items remain — requires action'
        : s === 'acceptable'
          ? 'acceptable — continue action'
          : `${s} — requires action`;
    const advice = noAction ? d.survive : d.action;
    lines.push(`${d.label} (${d.value}%) tracks ${d.measure}. Current status is ${verdict}. ${advice}`);
  });

  const residuals: string[] = [];
  if (openCars > 0) residuals.push(`${openCars} open corrective action request(s)`);
  if (pendingAudits > 0) residuals.push(`${pendingAudits} pending internal quality audit(s)`);
  if (openRisks > 0) residuals.push(`${openRisks} uncontrolled risk register item(s)`);
  if (missingCopc > 0) residuals.push(`${missingCopc} program(s) missing CHED COPC certificates`);
  lines.push(
    residuals.length > 0
      ? `Open-item register: ${residuals.join(', ')}.`
      : 'Open-item register: no residual corrective, audit, risk, or COPC items.',
  );

  lines.push('=== ORDERED ACTION PLAN (by urgency) ===');
  if (needsAction.length > 0) {
    needsAction.forEach((d, i) => {
      lines.push(`${i + 1}. ${d.action}`);
    });
  } else {
    lines.push('1. Sustain the current compliance monitoring cadence to maintain ISO 21001:2018 alignment.');
  }

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

/**
 * Generates contextual risk analysis & action directives (Unit, Supervisory, or Institutional) using WebLLM.
 * Evaluates current academic year risk profiles, highlights unmitigated/high-magnitude risks,
 * and synthesizes actionable recommendations tailored for the target operating level.
 */
export async function generateWebLlmRiskIntelligence(
  prompt: string,
  contextData?: Record<string, unknown>,
  maxTokens = 850,
): Promise<string> {
  if (globalEngine) {
    try {
      const scope = (contextData?.scope as string) || 'institutional';
      const unitTitle = (contextData?.unitName as string) || 'Operating Unit';
      const campusTitle = (contextData?.campusName as string) || 'Campus / Division';
      const year = (contextData?.year as number) || new Date().getFullYear();

      let systemPrompt =
        'You are an expert Institutional Risk Analyst & Executive Quality Assurance Officer for Romblon State University (RSU) under ISO 21001:2018 Educational Organizations Management Systems (EOMS). ' +
        'Analyze the risk registry data for the current academic year, identify critical risks demanding top management intervention, and synthesize an executive university risk analysis. ' +
        'Structure your output clearly into:\n' +
        '1. EXECUTIVE RISK VERDICT & POSTURE: Overall risk posture of the university for the academic year.\n' +
        '2. TOP MANAGEMENT ATTENTION REQUIRED: Specific high-magnitude, unmitigated, or escalated risks that require executive direction, resource authorization, or institutional policy.\n' +
        '3. INSTITUTIONAL THREAT PATTERNS & CROSS-CAMPUS VULNERABILITIES: Systemic patterns across academic, operational, infrastructural, and compliance domains.\n' +
        '4. STRATEGIC MITIGATION DIRECTIVES: Numbered, actionable, prioritized directives for the University President, Executive Council, Campus Directors, and Quality Assurance Office.\n' +
        'Maintain an authoritative, objective executive tone with precise numbers and actionable recommendations.';

      if (scope === 'unit') {
        systemPrompt =
          `You are an expert QMS Risk Specialist & Operational Quality Officer assisting the Unit Head and operating staff of "${unitTitle}" (${campusTitle}) at Romblon State University under ISO 21001:2018 EOMS.\n` +
          `Analyze the unit's active risk and opportunity registry for Academic Year ${year}, evaluate overdue or pending mitigation treatments, identify assigned risk owner responsibilities, and formulate practical, step-by-step unit action directives.\n` +
          'Structure your output clearly into standard Markdown sections:\n' +
          `### 1. UNIT RISK POSTURE & PROFILE: Summary of active risks, severity ratings, and treatment progress for ${unitTitle}.\n` +
          '### 2. CRITICAL UNIT VULNERABILITIES & OVERDUE TREATMENTS: Specific high/medium risks, overdue milestones, or operational bottlenecks requiring immediate unit action.\n' +
          '### 3. RISK OWNER ASSIGNMENT & ACCOUNTABILITY: Clear breakdown of responsibilities, task owners, and action commitments for unit personnel.\n' +
          '### 4. ACTIONABLE MITIGATION STEPS & PREVENTION DIRECTIVES: Concrete, numbered, practical steps the Unit Head and staff must execute immediately to mitigate vulnerabilities, achieve closure, and leverage opportunities.\n' +
          'Format with clear Markdown headings (###), bold tags for risk severity, and numbered lists (1., 2.). Do NOT use raw ASCII equal signs like ===. Maintain a supportive, highly actionable, and precise QMS operational tone.';
      } else if (scope === 'supervisory') {
        systemPrompt =
          `You are an Executive Quality Assurance Evaluator & Supervisory Risk Analyst assisting Deans, Campus Directors, and Supervisory Unit Heads across "${campusTitle}" at Romblon State University under ISO 21001:2018 EOMS.\n` +
          `Analyze the multi-unit risk data under your supervisory jurisdiction for Academic Year ${year}, identify systemic risk clusters across operating departments, evaluate unmitigated high-risk items requiring supervisory approval or resource support, and formulate supervisory action directives.\n` +
          'Structure your output clearly into standard Markdown sections:\n' +
          '### 1. SUPERVISORY RISK OVERSIGHT POSTURE: Cross-unit risk exposure, closure efficiency, and overall quality health under supervisory oversight.\n' +
          '### 2. DEPARTMENTAL RISK CLUSTERS & ESCALATION WATCHLIST: Common vulnerabilities across supervised units and risks requiring supervisory intervention, budget approval, or policy escalation.\n' +
          '### 3. RESOURCE ALLOCATION & REMEDIATION PRIORITIES: Priority administrative, logistical, and budgetary support required to unblock operating units.\n' +
          '### 4. SUPERVISORY ACTION DIRECTIVES FOR UNIT HEADS: Numbered, actionable supervisory instructions to direct unit heads, establish accountability deadlines, and ensure ISO 21001 compliance.\n' +
          'Format with clear Markdown headings (###), bold tags for risk severity, and numbered lists (1., 2.). Do NOT use raw ASCII equal signs like ===. Maintain an authoritative, constructive supervisory oversight tone.';
      }

      const contextStr = contextData ? `\n\nLive Risk Registry Data: ${JSON.stringify(contextData)}` : '';

      const completion = await globalEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}${contextStr}` },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || fallbackRiskIntelligenceGenerator(prompt, contextData);
    } catch (e) {
      console.warn('WebLLM risk intelligence error, using fallback:', e);
    }
  }

  return fallbackRiskIntelligenceGenerator(prompt, contextData);
}

/**
 * Rule-based risk intelligence fallback when WebGPU/engine is unavailable.
 * Generates tailored reports for Unit, Supervisory, or Institutional scopes.
 */
export function fallbackRiskIntelligenceGenerator(prompt: string, contextData?: Record<string, unknown>): string {
  const scope = (contextData?.scope as string) || 'institutional';
  const unitName = (contextData?.unitName as string) || 'Operating Unit';
  const campusName = (contextData?.campusName as string) || 'Main Campus';
  const year = (contextData?.year as number) || new Date().getFullYear();
  const totalRisks = (contextData?.totalRisks as number) || 0;
  const highRisks = (contextData?.highRisks as number) || 0;
  const mediumRisks = (contextData?.mediumRisks as number) || 0;
  const lowRisks = (contextData?.lowRisks as number) || 0;
  const openCount = (contextData?.openCount as number) || 0;
  const inProgressCount = (contextData?.inProgressCount as number) || 0;
  const closedCount = (contextData?.closedCount as number) || 0;
  const opportunitiesCount = (contextData?.opportunitiesCount as number) || 0;
  const attentionRisks =
    (contextData?.attentionRisks as Array<{
      id: string;
      description: string;
      unitName: string;
      campusName: string;
      magnitude: number;
      rating: string;
      status: string;
      objective: string;
      treatment: string;
      targetDate?: string;
      responsible?: string;
    }>) || [];
  const topObjectives = (contextData?.topObjectives as Array<{ name: string; count: number }>) || [];
  const overdueCount = (contextData?.overdueCount as number) || 0;

  const resolutionRate = totalRisks > 0 ? Math.round((closedCount / totalRisks) * 100) : 0;
  const activeHighCount = attentionRisks.filter((r) => r.rating === 'High' && r.status !== 'Closed').length;

  const lines: string[] = [];

  // ==========================================
  // UNIT-LEVEL RISK ACTION PLAN FALLBACK
  // ==========================================
  if (scope === 'unit') {
    lines.push(`## UNIT RISK ACTION PLAN — ${unitName.toUpperCase()} (${campusName.toUpperCase()}) — AY ${year}`);
    lines.push(`### 1. OPERATIONAL RISK STATUS & EXPOSURE SUMMARY`);
    if (activeHighCount > 0 || overdueCount > 0) {
      lines.push(
        `**Unit Risk Status**: **ACTION REQUIRED**. ${unitName} is currently tracking ${totalRisks} registered risks (${highRisks} High, ${mediumRisks} Medium, ${lowRisks} Low). There are ${overdueCount} overdue treatment plans and ${activeHighCount} high-severity items requiring immediate execution.`,
      );
    } else {
      lines.push(
        `**Unit Risk Status**: **CONTROLLED OPERATIONAL POSTURE**. ${unitName} maintains ${totalRisks} logged risks with a ${resolutionRate}% mitigation closure rate (${closedCount} closed, ${inProgressCount} in progress, ${openCount} open).`,
      );
    }

    lines.push(`\n### 2. CRITICAL UNIT VULNERABILITIES & PENDING TREATMENTS`);
    if (attentionRisks.length > 0) {
      attentionRisks.slice(0, 5).forEach((r, idx) => {
        lines.push(`${idx + 1}. [${r.rating.toUpperCase()} RISK • Mag: ${r.magnitude}] "${r.description}"`);
        lines.push(`   • Operational Objective: ${r.objective || 'Unit Standard Operations'}`);
        lines.push(`   • Mitigation Plan: ${r.treatment || 'Treatment under formulation'}`);
        lines.push(
          `   • Assigned Owner: ${r.responsible || 'Unit Head / Focal Person'} | Due: ${r.targetDate || 'Immediate'}`,
        );
      });
    } else {
      lines.push(`• No critical unmitigated high risks currently recorded for ${unitName}.`);
    }

    lines.push(`\n### 3. RISK OWNER ASSIGNMENT & ACCOUNTABILITY`);
    lines.push(
      `• **${unitName} Unit Head**: Direct overall risk monitoring, resource request follow-ups, and QMS compliance.`,
    );
    lines.push(
      `• **Designated Risk Focal Persons**: Submit objective evidence of completed treatments to QAO for risk closure.`,
    );
    if (opportunitiesCount > 0) {
      lines.push(
        `• **Innovation Focal**: Translate ${opportunitiesCount} identified opportunities into formalized standard operating procedures (SOPs).`,
      );
    }

    lines.push(`\n### 4. ACTIONABLE UNIT MITIGATION DIRECTIVES`);
    lines.push(
      `1. Immediate Treatment Execution: Prioritize and implement action plans for the ${openCount + inProgressCount} pending risk items before target deadlines.`,
    );
    lines.push(
      `2. Evidence Collation: Prepare and upload verification documents (e.g. photos, logs, approvals) for treated risks to support ISO 21001 audit verification.`,
    );
    lines.push(
      `3. Supervisor Escalation: If mitigation requires budget or institutional policy support, submit formal escalation to the Supervisory Head/Campus Director.`,
    );
    lines.push(
      `4. Monthly Risk Review: Conduct a 15-minute unit risk check-in every last Friday of the month to review mitigation progress.`,
    );

    return lines.join('\n');
  }

  // ==========================================
  // SUPERVISORY RISK OVERSIGHT FALLBACK
  // ==========================================
  if (scope === 'supervisory') {
    lines.push(`## SUPERVISORY RISK OVERSIGHT BRIEFING — ${campusName.toUpperCase()} — AY ${year}`);
    lines.push(`### 1. SUPERVISORY RISK OVERSIGHT POSTURE`);
    lines.push(
      `**Supervisory Jurisdiction Overview**: Supervised operating units across ${campusName} are tracking ${totalRisks} total risks and ${opportunitiesCount} opportunities. Current treatment resolution rate across the supervisory cluster is ${resolutionRate}%, with ${overdueCount} overdue actions and ${activeHighCount} active high-magnitude risks.`,
    );

    lines.push(`\n### 2. DEPARTMENTAL RISK CLUSTERS & SUPERVISORY ATTENTION ITEMS`);
    if (attentionRisks.length > 0) {
      attentionRisks.slice(0, 6).forEach((r, idx) => {
        lines.push(`${idx + 1}. [${r.rating.toUpperCase()} • Mag: ${r.magnitude}] [${r.unitName}]: "${r.description}"`);
        lines.push(`   • Impacted Goal: ${r.objective}`);
        lines.push(`   • Planned Mitigation: ${r.treatment || 'Pending Unit Action'} | Status: ${r.status}`);
      });
    } else {
      lines.push(`• All supervised units maintain compliant, low-residual risk ratings.`);
    }

    lines.push(`\n### 3. RESOURCE ALLOCATION & SUPERVISORY BOTTLENECK REMEDIATION`);
    if (topObjectives.length > 0) {
      lines.push(
        `1. Vulnerability Concentration: Supervised risk items cluster primarily around: ${topObjectives
          .slice(0, 3)
          .map((o) => `"${o.name}" (${o.count} items)`)
          .join(', ')}.`,
      );
    }
    lines.push(
      `2. Overdue Action Remediation: ${overdueCount} treatment plans have passed their target dates, indicating potential budget, equipment, or staffing bottlenecks.`,
    );

    lines.push(`\n### 4. SUPERVISORY ACTION DIRECTIVES FOR UNIT HEADS`);
    lines.push(
      `1. Mandatory Catch-up Timetable: Require Unit Heads with overdue items to submit revised 30-day catch-up schedules.`,
    );
    lines.push(
      `2. Administrative Resource Endorsement: Expedite supervisory endorsement for procurement and facility maintenance requisitions tied to high-risk treatments.`,
    );
    lines.push(
      `3. Cross-Departmental Coordination: Harmonize risk controls across parallel academic/administrative units to prevent recurring operational failures.`,
    );
    lines.push(
      `4. Quarterly Supervisory Risk Audit: Include risk treatment review as a standing agenda item in regular Dean/Director council meetings.`,
    );

    return lines.join('\n');
  }

  // ==========================================
  // INSTITUTIONAL SCOPE FALLBACK (DEFAULT)
  // ==========================================
  lines.push(`## INSTITUTIONAL RISK INTELLIGENCE & STRATEGIC SYNTHESIS — AY ${year}`);
  lines.push(`### 1. EXECUTIVE RISK POSTURE & RESIDUAL EXPOSURE`);
  if (activeHighCount > 3 || overdueCount > 5) {
    lines.push(
      `**University Risk Status**: **ELEVATED THREAT LEVEL**. The university currently tracks ${totalRisks} registered risks for AY ${year}, with ${activeHighCount} active high-magnitude risks and ${overdueCount} overdue treatment actions requiring urgent leadership intervention.`,
    );
  } else if (activeHighCount > 0 || resolutionRate < 60) {
    lines.push(
      `**University Risk Status**: **MODERATE EXPOSURE — MANAGED WITH MONITORING**. The active risk registry contains ${totalRisks} items (${highRisks} High, ${mediumRisks} Medium, ${lowRisks} Low). Treatment resolution rate stands at ${resolutionRate}%, with ${closedCount} risks successfully treated and closed.`,
    );
  } else {
    lines.push(
      `**University Risk Status**: **CONTROLLED & LOW RESIDUAL EXPOSURE**. The risk control framework is operating effectively with a ${resolutionRate}% mitigation closure rate across monitored operating units.`,
    );
  }

  lines.push('\n### 2. TOP MANAGEMENT ATTENTION REQUIRED');
  if (attentionRisks.length > 0) {
    lines.push(
      `Top management must immediately review and authorize mitigation resources for the following ${attentionRisks.length} prioritized risk items:`,
    );
    attentionRisks.slice(0, 5).forEach((r, idx) => {
      lines.push(
        `${idx + 1}. [${r.rating.toUpperCase()} RISK • Mag: ${r.magnitude}] ${r.unitName} (${r.campusName}): "${r.description}"`,
      );
      lines.push(`   • Impacted Objective: ${r.objective || 'General Institutional Operations'}`);
      lines.push(
        `   • Status: ${r.status} ${r.targetDate ? `| Target: ${r.targetDate}` : ''} | Planned Action: ${r.treatment || 'Treatment under formulation'}`,
      );
    });
  } else {
    lines.push(
      '• No active High-severity risks are currently unmitigated. Continue monitoring Medium and Low risk registers.',
    );
  }

  lines.push('\n### 3. INSTITUTIONAL THREAT PATTERNS & VULNERABILITIES');
  if (topObjectives.length > 0) {
    lines.push(
      `1. Strategic Objective Vulnerability: Risks are most densely concentrated in: ${topObjectives
        .slice(0, 3)
        .map((o) => `"${o.name}" (${o.count} items)`)
        .join(', ')}.`,
    );
  }
  lines.push(
    `2. Risk-to-Opportunity Ratio: The university records ${totalRisks} risks alongside ${opportunitiesCount} identified opportunities (${totalRisks > 0 ? (opportunitiesCount / totalRisks).toFixed(2) : 0} ratio), indicating a strategic imperative to translate defensive controls into positive quality innovations.`,
  );
  lines.push(
    `3. Control Cadence: ${openCount} items remain in Open status and ${inProgressCount} in Progress, necessitating reinforced accountability for designated risk owners.`,
  );

  lines.push('\n### 4. TOP MANAGEMENT STRATEGIC ACTION DIRECTIVES');
  lines.push(
    '1. Resource Allocation: Direct the Budget and Planning Office to expedite funding releases for the critical high-magnitude treatments identified above.',
  );
  lines.push(
    '2. Executive Risk Oversight: Mandate monthly progress reporting from unit heads on the top attention watchlist during Administrative Council meetings.',
  );
  lines.push(
    '3. Cross-Campus Standardization: Harmonize preventive controls across satellite campuses to eliminate recurrent infrastructure and operational gaps.',
  );
  lines.push(
    '4. Preventive Opportunity Leveraging: Institutionalize treatments as permanent QMS Standard Operating Procedures (SOPs) for ISO 21001:2018 compliance.',
  );

  return lines.join('\n');
}

/**
 * Generates an institutional multi-site system-wide audit analysis using WebLLM.
 * Evaluates cross-campus common NCs, systemic OFIs, satellite disparities, and ISO 19011 root cause directives.
 */
export async function generateWebLlmSystemAuditAnalysis(
  prompt: string,
  contextData?: Record<string, unknown>,
  maxTokens = 950,
): Promise<string> {
  if (globalEngine) {
    try {
      const systemPrompt =
        'You are the Lead Quality Assurance Auditor & Chief Management Systems Evaluator for Romblon State University (RSU) under ISO 19011:2018 (Guidelines for Auditing Management Systems) and ISO 21001:2018 (Educational Organizations Management Systems). ' +
        'You are conducting an institutional multi-site audit intelligence analysis across the entire RSU system (Main Campus Odiongan and satellite campuses: Romblon, Cajidiocan, San Fernando, San Agustin, Santa Maria, Calatrava, Santa Fe, Sawang). ' +
        'Analyze the Firestore audit dataset to identify systemic, cross-campus Non-Conformances (NCs) and Observations for Improvement (OFIs), evaluate geographic quality disparities, detect root cause clusters, and formulate prioritized corrective directives for University Top Management.\n\n' +
        'Structure your analysis clearly into:\n' +
        '1. EXECUTIVE AUDIT VERDICT & SYSTEM INTEGRITY POSTURE: Overall quality health of the university network.\n' +
        '2. SYSTEMIC CROSS-CAMPUS NON-CONFORMANCES (SAME NC CLUSTERS): Specific clauses and operational breakdowns observed across multiple campuses/satellites demanding centralized corrective intervention.\n' +
        '3. SYSTEMIC OBSERVATIONS FOR IMPROVEMENT (OFI) & LATENT VULNERABILITIES: Recurring areas for improvement across the satellite network before they escalate into non-conformances.\n' +
        '4. MAIN VS. SATELLITE DISPARITY & QUALITY RESILIENCE: Analysis of geographic, procedural, or infrastructural gaps between the Main Campus and remote satellite branches.\n' +
        '5. SYSTEMIC ROOT CAUSE THEMES & TOP MANAGEMENT ACTION DIRECTIVES: Actionable, numbered strategic directives for the Board of Regents, University President, Vice Presidents (VPAA, VPAF, VPREDI), Campus Directors, and Quality Assurance Office.\n' +
        'Maintain an authoritative, precise, and constructive ISO 19011 audit tone with specific metric citations.';

      const contextStr = contextData ? `\n\nLive System Audit Dataset: ${JSON.stringify(contextData)}` : '';

      const completion = await globalEngine.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `${prompt}${contextStr}` },
        ],
        temperature: 0.4,
        max_tokens: maxTokens,
      });

      return completion.choices[0]?.message?.content || fallbackSystemAuditAnalysisGenerator(prompt, contextData);
    } catch (e) {
      console.warn('WebLLM system audit analysis error, using fallback:', e);
    }
  }

  return fallbackSystemAuditAnalysisGenerator(prompt, contextData);
}

/**
 * Rule-based system audit analysis fallback when WebGPU/engine is unavailable.
 */
export function fallbackSystemAuditAnalysisGenerator(prompt: string, contextData?: Record<string, unknown>): string {
  const year = (contextData?.year as number) || new Date().getFullYear();
  const totalFindings = (contextData?.totalFindings as number) || 0;
  const totalNC = (contextData?.totalNC as number) || 0;
  const totalOFI = (contextData?.totalOFI as number) || 0;
  const totalCompliance = (contextData?.totalCompliance as number) || 0;
  const affectedCampusesCount = (contextData?.affectedCampusesCount as number) || 0;
  const systemicNCs =
    (contextData?.systemicNCs as Array<{
      clause: string;
      clauseTitle?: string;
      occurrences: number;
      campuses: string[];
      sampleDescription: string;
    }>) || [];
  const systemicOFIs =
    (contextData?.systemicOFIs as Array<{
      clause: string;
      clauseTitle?: string;
      occurrences: number;
      campuses: string[];
      sampleDescription: string;
    }>) || [];
  const satelliteDisparities =
    (contextData?.satelliteDisparities as Array<{
      campus: string;
      ncCount: number;
      ofiCount: number;
    }>) || [];

  const lines: string[] = [];

  // Section 1: Executive Verdict
  lines.push(`=== RSU SYSTEM-WIDE AUDIT INTELLIGENCE SYNTHESIS — AY ${year} ===`);
  lines.push(
    `Institutional Compliance Verdict: Multi-site audit analysis across ${affectedCampusesCount} campuses captured ${totalFindings} total findings (${totalNC} Non-Conformances, ${totalOFI} Observations for Improvement, and ${totalCompliance} Compliances). Under ISO 19011:2018 guidelines, multiple recurrent non-conformances across satellite branches signify systemic procedural gaps rather than isolated unit lapses.`,
  );

  // Section 2: Systemic NCs
  lines.push('\n=== SYSTEMIC CROSS-CAMPUS NON-CONFORMANCES (SAME NC CLUSTERS) ===');
  if (systemicNCs.length > 0) {
    lines.push(`The following Non-Conformances recur across multiple campuses in the university network:`);
    systemicNCs.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. [ISO Clause ${item.clause}${item.clauseTitle ? `: ${item.clauseTitle}` : ''}] • ${item.occurrences} Occurrences across ${item.campuses.length} Campuses (${item.campuses.join(', ')})`,
      );
      lines.push(`   • Audit Observation: "${item.sampleDescription}"`);
      lines.push(
        `   • Systemic Risk: Centralized procedural standard is inconsistently implemented across satellite campuses.`,
      );
    });
  } else {
    lines.push(
      '• No recurrent Non-Conformances detected spanning multiple campuses. Non-conformances remain localized.',
    );
  }

  // Section 3: Systemic OFIs
  lines.push('\n=== SYSTEMIC OBSERVATIONS FOR IMPROVEMENT (OFI) & LATENT GAPS ===');
  if (systemicOFIs.length > 0) {
    lines.push(`Common improvement opportunities observed across satellite locations:`);
    systemicOFIs.forEach((item, idx) => {
      lines.push(
        `${idx + 1}. [ISO Clause ${item.clause}${item.clauseTitle ? `: ${item.clauseTitle}` : ''}] • ${item.occurrences} OFIs in ${item.campuses.join(', ')}`,
      );
      lines.push(`   • Advisory Note: "${item.sampleDescription}"`);
    });
  } else {
    lines.push('• Opportunities for improvement are balanced across operational units.');
  }

  // Section 4: Main vs Satellite Disparities
  lines.push('\n=== MAIN VS. SATELLITE CAMPUS QUALITY DISPARITY ANALYSIS ===');
  if (satelliteDisparities.length > 0) {
    lines.push('Finding distribution across university branches:');
    satelliteDisparities.slice(0, 5).forEach((d) => {
      lines.push(`• ${d.campus}: ${d.ncCount} NC(s), ${d.ofiCount} OFI(s)`);
    });
    lines.push(
      'Satellite branches exhibit higher variance in documented information control (Clause 7.5) and measurement traceability (Clause 7.1.5) due to geographic isolation and decentralized recordkeeping.',
    );
  } else {
    lines.push('Quality compliance metrics remain evenly distributed across all university campuses.');
  }

  // Section 5: Strategic Directives
  lines.push('\n=== SYSTEMIC ROOT CAUSES & TOP MANAGEMENT ACTION DIRECTIVES ===');
  lines.push(
    '1. Centralized QMS Policy Harmonization: VPAA and Quality Assurance Office must issue unified procedural templates and syllabus verification checklists to all satellite directors.',
  );
  lines.push(
    '2. Satellite Resource & Calibration Support: VPAF must prioritize procurement of standardized calibration and laboratory safety equipment for remote campuses.',
  );
  lines.push(
    '3. Mandatory CAR Root Cause Verification: Require campus directors to submit verified objective evidence of systemic corrective action before closing repeat audit findings.',
  );
  lines.push(
    '4. Cross-Campus Peer Audits: Institutionalize cross-campus auditor assignments to foster inter-campus bench-learning and eliminate localized compliance blindspots.',
  );

  return lines.join('\n');
}
