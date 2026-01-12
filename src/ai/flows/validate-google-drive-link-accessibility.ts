
'use server';

/**
 * @fileOverview A Genkit flow that validates the accessibility of a Google Drive link.
 *
 * - validateGoogleDriveLinkAccessibility - A function that validates if a google drive link is accessible.
 * - ValidateGoogleDriveLinkAccessibilityInput - The input type for the validateGoogleDriveLinkAccessibility function.
 * - ValidateGoogleDriveLinkAccessibilityOutput - The return type for the validateGoogleDriveLinkAccessibility function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ValidateGoogleDriveLinkAccessibilityInputSchema = z.object({
  googleDriveLink: z
    .string()
    .url()
    .describe('The Google Drive link to validate.  Must start with https://drive.google.com'),
});
export type ValidateGoogleDriveLinkAccessibilityInput =
  z.infer<typeof ValidateGoogleDriveLinkAccessibilityInputSchema>;

const ValidateGoogleDriveLinkAccessibilityOutputSchema = z.object({
  isAccessible: z
    .boolean()
    .describe(
      'Whether the Google Drive link is publicly accessible to anyone on the internet without needing to sign in.'
    ),
  reason: z
    .string()
    .optional()
    .describe('A brief, user-friendly reason why the link is not accessible.'),
});
export type ValidateGoogleDriveLinkAccessibilityOutput =
  z.infer<typeof ValidateGoogleDriveLinkAccessibilityOutputSchema>;

export async function validateGoogleDriveLinkAccessibility(
  input: ValidateGoogleDriveLinkAccessibilityInput
): Promise<ValidateGoogleDriveLinkAccessibilityOutput> {
  return validateGoogleDriveLinkAccessibilityFlow(input);
}

const validateGoogleDriveLinkAccessibilityPrompt = ai.definePrompt({
  name: 'validateGoogleDriveLinkAccessibilityPrompt',
  input: {
    schema: ValidateGoogleDriveLinkAccessibilityInputSchema,
  },
  output: {
    schema: ValidateGoogleDriveLinkAccessibilityOutputSchema,
  },
  prompt: `You are an expert security scanner that determines if a Google Drive link is publicly accessible.

  Act as if you are an anonymous user on the internet with no special permissions.
  Given a Google Drive link, you will determine if the link is accessible to ANYONE on the internet without requiring them to sign into a Google account.

  - If the link leads directly to a file preview or folder that anyone can see, return isAccessible: true.
  - If the link prompts for a sign-in, shows a "You need access" page, is restricted to a specific organization, or is a malformed URL, return isAccessible: false.
  - If the link is not accessible, provide a simple, user-friendly reason. For example: "This link requires you to sign in." or "This link is restricted to a specific organization."

  Google Drive Link: {{{googleDriveLink}}}`,
});

const validateGoogleDriveLinkAccessibilityFlow = ai.defineFlow(
  {
    name: 'validateGoogleDriveLinkAccessibilityFlow',
    inputSchema: ValidateGoogleDriveLinkAccessibilityInputSchema,
    outputSchema: ValidateGoogleDriveLinkAccessibilityOutputSchema,
  },
  async input => {
    // Basic check for empty or invalid-looking links before calling the AI
    if (!input.googleDriveLink || !input.googleDriveLink.startsWith('https://drive.google.com/')) {
        return {
            isAccessible: false,
            reason: 'Please enter a valid Google Drive link.'
        };
    }

    try {
        const {output} = await validateGoogleDriveLinkAccessibilityPrompt(input);
        return output!;
    } catch (e) {
        console.error("Error validating Google Drive link with AI, falling back to a default invalid state.", e);
        // Fallback in case the AI fails for some reason. Default to not accessible to be safe.
        return {
            isAccessible: false,
            reason: 'Could not automatically verify the link. Please double-check sharing permissions.'
        };
    }
  }
);
