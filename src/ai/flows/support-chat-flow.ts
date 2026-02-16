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
  // General (For All Users)
  // Account Registration: Users sign up with their RSU email and create an account after agreeing to the Data Privacy statement.
  // Account Verification: After completing their profile and accepting an NDA, an admin must verify the account.
  // Profile Updates: Users can update their first and last name on the "Profile" page.

  // Risk Management Lifecycle (IMPORTANT)
  // 1. Identification (First Cycle): Log risks/opportunities, set initial Likelihood/Consequence, and propose a Treatment Plan. Status: "Open".
  // 2. Monitoring (Ongoing): Units should update the "Monitoring Notes / Updates" field as mitigation activities occur. Status: "In Progress".
  // 3. Evaluation (Final Cycle): Units must close the risk, perform "Post-Treatment Analysis" (Residual Risk), and provide evidence of completion. Status: "Closed".

  // Risk Rating Scale (Magnitude = Likelihood x Consequence)
  // High Priority: 10 - 25 (Requires mandatory Action Plan)
  // Medium Priority: 5 - 9 (Requires mandatory Action Plan)
  // Low Priority: 1 - 4 (Monitor only)

  // Employee / Unit Coordinator / Unit ODIMO
  // Dashboard: Shows submission stats, checklist, and risk overview.
  // How to Submit: Go to "New Submission / Resubmission", select Year/Cycle, paste GDrive link, complete checklist, and submit.
  // Handling Rejection: Find the rejected report, view feedback, correct the doc, and use the "Resubmit Report" form on the detail page.

  // Approvers (Campus Director, VP, ODIMO)
  // Approvals Page: Lists "Submitted" reports from their campus. Users cannot self-approve.
  // Approving/Rejecting: Provide feedback for rejections. Approving redirects back to the list.

  // Administrator
  // System Admin: Manage Users, Campuses, Units, Roles, Cycles, and Manuals from "Settings".
  // Secure Deletion: Admins can delete submissions using a random challenge phrase confirmation.
  // Audit Log: A read-only log of all system actions.
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
  - For Risk Management queries, emphasize the lifecycle: Identification (Cycle 1), Monitoring (Ongoing), and Evaluation (Final Cycle).
  - If the user asks a question not covered by the manual, politely state that you can only answer questions about the EOMS Portal's features and usage.
  - Be concise and clear. Use bullet points or numbered lists if it helps with clarity.
  - Your persona is helpful, professional, and friendly.

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
