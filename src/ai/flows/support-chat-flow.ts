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
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('The conversation history.'),
});
export type SupportChatInput = z.infer<typeof SupportChatInputSchema>;

const SupportChatOutputSchema = z.object({
  response: z.string().describe('The AI\'s answer to the user\'s query.'),
});
export type SupportChatOutput = z.infer<typeof SupportChatOutputSchema>;


const helpContent = `
  // General (For All Users)
  // Account Registration: Users sign up with their RSU email, agree to Data Privacy, and create an account.
  // Completing Profile: After signup, users select their Campus, Role, and Unit.
  // Account Verification: After completing their profile and accepting an NDA, an admin must verify the account. Users are notified by email upon approval.
  // Logging Out: Click the avatar, then "Log out".

  // Employee / Unit Coordinator / Unit ODIMO
  // Dashboard: Shows submission stats, charts, recent activity, and a submission checklist.
  // How to Submit: Go to "New Submission", select Year/Cycle, click a report, paste a valid Google Drive link, complete the final checklist, and submit.
  // Handling Rejection: Find the rejected report, view feedback on the detail page, get a new link for the corrected document, and use the "Resubmit Report" form.

  // Campus Director & Campus ODIMO (Approvers)
  // Approvals Page: Lists all "Submitted" status reports from their campus. Users cannot approve their own submissions.
  // Approving/Rejecting: Approve with the green checkmark. Reject with the red 'X' and provide mandatory feedback.
  // Campus Dashboard & Settings: The dashboard shows campus-wide analytics. Campus Directors can manage units for their campus. Campus ODIMOs can post campus-wide announcements.

  // Administrator
  // System Administration: Manage Users, Campuses, Units, Roles, and Campus-wide settings from the "Settings" page.
  // Account Activation: Activate or deactivate user accounts.
  // Secure Deletion: Admins can permanently delete submissions via a safety confirmation dialog on the Submissions page.
  // Audit Log: A read-only log of all significant user and system actions.
`;

export async function supportChat(input: SupportChatInput): Promise<SupportChatOutput> {
  return supportChatFlow(input);
}

const supportChatPrompt = ai.definePrompt({
  name: 'supportChatPrompt',
  input: { schema: SupportChatInputSchema },
  output: { schema: SupportChatOutputSchema },
  prompt: `You are an expert AI support agent for the "RSU EOMS Submission Portal". Your purpose is to answer user questions about how to use the portal.

  Your knowledge is based on the following official user manual content:
  ---
  ${helpContent}
  ---

  RULES:
  - Answer ONLY based on the provided user manual content.
  - If the user asks a question not covered by the manual, politely state that you can only answer questions about the EOMS Portal's features and usage. DO NOT invent answers.
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
    // For now, we are not using history but it is here for future enhancement.
    const { output } = await supportChatPrompt(input);
    return output!;
  }
);
