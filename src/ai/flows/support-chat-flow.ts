
'use server';

/**
 * @fileOverview An AI support agent for the RSU EOMS Portal.
 *
 * - supportChat - A function that handles user queries based on the portal's documentation.
 * - SupportChatInput - The input type for the supportChat function.
 * - SupportChatOutput - The return type for the supportChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SupportChatInputSchema = z.object({
  query: z.string().describe('The user\'s question about the EOMS portal.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  response: z.string().describe('The AI\'s answer to the user\'s query.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


const helpContent = `
  // System Overview
  // Purpose: Submission and Monitoring Portal for Romblon State University EOMS (ISO 21001:2018).
  // 6 Core Documents: SWOT, Needs & Expectations, Operational Plan, Quality Objectives, Risk Registry, Risk Action Plan.
  // Denominator: Institutional compliance scores are calculated based on these 6 reports.

  // Document Control & Revisions
  // Revisions: All documents start at Rev 00. Resubmissions or updates increment to Rev 01, 02, etc.
  // Statuses: Pending, Submitted (Awaiting Approval), Approved (Verified), Rejected.
  // Fuzzy Matching: The system uses a normalizer to identify reports even if named slightly differently (e.g. "2025 SWOT Analysis").

  // Risk Management
  // Lifecycle: Identification -> Analysis (Likelihood x Consequence) -> Treatment (Action Plan) -> Monitoring -> Post-Treatment Analysis -> Closure.
  // Rating Scale: High (10-25), Medium (5-9), Low (1-4).
  // Mandate: Action Plans are mandatory for Medium and High risks. Low risks are exempt.
  // AI Tool: Suggest Risk Treatment flow provides ISO-aligned mitigation strategies.

  // Academic Program Monitoring
  // Metrics: CHED COPC, AACCUP Accreditation levels, Enrollment (disaggregated by sex), Faculty Ranks, Graduation Outcomes.
  // Roadmap: Chronological tracking of next survey targets.

  // Quality Audit (IQA) & Unit Monitoring
  // IQA Hub: Plan framework -> Schedule itinerary -> Log Evidence (against ISO clauses) -> Final Report.
  // Monitoring Hub: On-site verification of 7S, signages, and EOMS files.
  // Notices: Automated generation of Notice of Compliance or Notice of Non-Compliance.

  // Role Permissions
  // Admin: Full system oversight, User activation, Risk Bridge (log risks from docs), Review Override (re-review rejected items).
  // Campus Director: Unit management for their campus, Notice generation, Site-specific analytics.
  // Unit Coordinator: Document submission, Risk logging, Program monitoring updates.
`;

export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const supportChatPrompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: { schema: SupportChatInputSchema },
  output: { schema: SupportChatOutputSchema },
  prompt: `You are an expert AI support agent for the "RSU EOMS Submission Portal". Your purpose is to answer user questions about how to use the portal and its compliance workflows.

  Your knowledge is based on the following official user manual content:
  ---
  ${helpContent}
  ---

  RULES:
  - Answer ONLY based on the provided user manual content.
  - Emphasize the 6-document framework for EOMS compliance.
  - Explain that Revision control is automatic (Rev 00, 01, etc.).
  - Mention that Risk Action Plans are only mandatory for Medium/High rated risks.
  - If the user asks a question not covered by the manual, politely state that you can only answer questions about the EOMS Portal's features and usage.
  - Be concise, professional, and helpful. Use bullet points for readability.

  User Query: {{{query}}}
  `,
});

const supportChatFlow = ai.defineFlow(
  {
    name: 'supportChatFlow',
    inputSchema: SupportChatInputSchema,
    outputSchema: SupportChatOutputSchema,
  },
  async input => {
    const { output } = await supportChatPrompt(input);
    return output!;
  }
);
