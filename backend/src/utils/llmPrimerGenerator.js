import Anthropic from '@anthropic-ai/sdk';
import { buildFallbackLlmPrimer } from './passportGenerator.js';

export const generateLlmPrimer = async ({
  firstName,
  gradeLevel,
  totalTests,
  overallAverage,
  trend,
  strengths,
  errorPatterns,
  immediateGaps,
}) => {
  const fallback = buildFallbackLlmPrimer({
    firstName,
    gradeLevel,
    totalTests,
    overallAverage,
    trend,
    strengths,
    errorPatterns,
    immediateGaps,
  });

  if (!process.env.ANTHROPIC_API_KEY) {
    return fallback;
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const prompt = `Write a 3-sentence first-person LLM primer for a student to paste into ChatGPT/Claude/Gemini.
Student: ${firstName}, ${gradeLevel}, Mathematics
Tests taken: ${totalTests}, average: ${overallAverage}%
Trend: ${trend}
Strengths: ${strengths.join(', ') || 'none yet'}
Top error patterns: ${errorPatterns.map((e) => e.pattern).join('; ') || 'none yet'}
Immediate gaps: ${immediateGaps.join('; ') || 'none yet'}

Rules:
- First person ("I am...")
- Plain English a Class 8 student can understand
- Mention specific recurring mistake if any
- End with a request for personalized help
- Exactly 3 sentences, no JSON, no quotes around output`;

    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 400,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim();
    return text.length > 50 ? text : fallback;
  } catch (error) {
    console.warn('LLM primer fallback:', error.message);
    return fallback;
  }
};
