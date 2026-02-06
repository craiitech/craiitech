'use server';
/**
 * @fileOverview AI flow to suggest risk treatment actions.
 *
 * - suggestRiskTreatment - Function to generate mitigation strategies.
 * - SuggestTreatmentInput - Input schema (Risk type and description).
 * - SuggestTreatmentOutput - Return schema (list of suggested actions).
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestTreatmentInputSchema = z.object({
  type: z.enum(['Risk', 'Opportunity']),
  description: z.string().describe('The description of the risk or opportunity.'),
  objective: z.string().describe('The objective of the process being analyzed.'),
});
export type SuggestTreatmentInput = z.infer<typeof SuggestTreatmentInputSchema>;

const SuggestTreatmentOutputSchema = z.object({
  suggestions: z.string().describe('A bulleted list of professional mitigation or enhancement strategies.'),
});
export type SuggestTreatmentOutput = z.infer<typeof SuggestTreatmentOutputSchema>;

export async function suggestRiskTreatment(input: SuggestTreatmentInput): Promise<SuggestTreatmentOutput> {
  return suggestRiskTreatmentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRiskTreatmentPrompt',
  input: { schema: SuggestTreatmentInputSchema },
  output: { schema: SuggestTreatmentOutputSchema },
  prompt: `You are an expert ISO 21001:2018 (EOMS) consultant for a University.
  
  Based on the following information, suggest 3-5 specific, actionable, and professional treatment actions.
  
  Entry Type: {{{type}}}
  Process Objective: {{{objective}}}
  Description: {{{description}}}
  
  Format your response as a concise bulleted list. Focus on academic quality, data integrity, and operational efficiency.`,
});

const suggestRiskTreatmentFlow = ai.defineFlow(
  {
    name: 'suggestRiskTreatmentFlow',
    inputSchema: SuggestTreatmentInputSchema,
    outputSchema: SuggestTreatmentOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    return output!;
  }
);
