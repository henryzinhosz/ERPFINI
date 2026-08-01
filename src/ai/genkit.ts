import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Initializes and exports a singleton Genkit instance configured with the Google AI plugin.
 * This ensures that all AI-related operations throughout the application use the same
 * authenticated and configured instance.
 */
export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
});
