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
      'Whether the Google Drive link is accessible to the organization.'
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
  prompt: `You are an expert at determining if a Google Drive link is accessible to an organization.

  Given a Google Drive link, you will determine if the link is accessible to the organization (e.g. accessible to @org.edu).

  If the link is accessible, return isAccessible: true.
  If the link is not accessible, return isAccessible: false and provide a reason.

  Google Drive Link: {{{googleDriveLink}}}`,
});

const validateGoogleDriveLinkAccessibilityFlow = ai.defineFlow(
  {
    name: 'validateGoogleDriveLinkAccessibilityFlow',
    inputSchema: ValidateGoogleDriveLinkAccessibilityInputSchema,
    outputSchema: ValidateGoogleDriveLinkAccessibilityOutputSchema,
  },
  async input => {
    const {output} = await validateGoogleDriveLinkAccessibilityPrompt(input);
    return output!;
  }
);
