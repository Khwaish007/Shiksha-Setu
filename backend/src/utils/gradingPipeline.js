import Anthropic from '@anthropic-ai/sdk';
import {
  buildGradingSystemPrompt,
  buildManualReviewPayload,
  formatBufferToClaudePart,
  normalizeMimeType,
  parseAndNormalizeGradingResponse,
  validateUploadedImage,
} from './gradingSafety.js';
import { extractUsage } from './costTelemetry.js';

const GRADING_MODEL = 'claude-opus-4-1-20250805';
const GRADING_MAX_TOKENS = 4096;

export const generateWithRetry = async (client, systemPrompt, imageData, maxRetries = 3) => {
  let delayMs = 15000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.messages.create({
        model: GRADING_MODEL,
        max_tokens: GRADING_MAX_TOKENS,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              imageData,
              {
                type: 'text',
                text: 'Grade this handwritten mathematics worksheet. Return only the JSON object specified in your instructions.',
              },
            ],
          },
        ],
      });
    } catch (error) {
      const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`[429] Rate limited. Retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs += 10000;
        continue;
      }
      throw error;
    }
  }
};

/**
 * Shared worksheet grading used by batch upload and student profile upload.
 * Uses answer key as ground truth when provided; otherwise LLM mathematical knowledge.
 */
export const executeWorksheetGrading = async (file, answerKey = null) => {
  const startedAt = Date.now();
  const imageValidation = validateUploadedImage(file);

  if (!imageValidation.ok) {
    return {
      ok: false,
      validationFailed: true,
      payload: buildManualReviewPayload(imageValidation.reason),
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: Date.now() - startedAt,
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const reason = 'AI grading is not configured. Missing API key.';
    return {
      ok: false,
      validationFailed: true,
      payload: buildManualReviewPayload(reason),
      usage: { inputTokens: 0, outputTokens: 0 },
      durationMs: Date.now() - startedAt,
    };
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const imagePart = formatBufferToClaudePart(
    file.buffer,
    imageValidation.mimeType || normalizeMimeType(file.mimetype)
  );
  const gradingPrompt = buildGradingSystemPrompt(answerKey);
  const gradingResult = await generateWithRetry(client, gradingPrompt, imagePart);
  const usage = extractUsage(gradingResult);
  const responseText = gradingResult.content?.[0]?.text || '';
  const payload = parseAndNormalizeGradingResponse(responseText);

  return {
    ok: true,
    validationFailed: false,
    payload,
    usage,
    durationMs: Date.now() - startedAt,
  };
};
