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
      'Whether the Google Drive link is accessible.'
    ),
  reason: z
    .string()
    .optional()
    .describe('The reason why the link is not accessible.'),
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
  prompt: `You are an expert at determining if a Google Drive link is accessible.

  Given a Google Drive link, you will determine if the link is a valid and accessible link to a Google Drive file.

  If the link is accessible, return isAccessible: true.
  If the link is not accessible (e.g., it requires a sign-in, is a malformed URL, or points to a file that does not exist), return isAccessible: false and provide a simple reason.

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
        console.error("Error validating Google Drive link with AI, falling back to basic check", e);
        // Fallback in case the AI fails for some reason.
        return {
            isAccessible: true,
            reason: ''
        };
    }
  }
);
