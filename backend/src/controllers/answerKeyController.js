import Anthropic from '@anthropic-ai/sdk';
import GradingSession from '../models/GradingSession.js';
import {
  ANSWER_KEY_TRANSCRIPTION_PROMPT,
  MANUAL_REVIEW_MESSAGE,
  formatBufferToClaudePart,
  normalizeMimeType,
  parseAndNormalizeAnswerKeyResponse,
  parseTypedAnswerKey,
  validateUploadedImage
} from '../utils/gradingSafety.js';

const findSession = async (sessionId) => GradingSession.findOne({ sessionId });

export const getAnswerKey = async (req, res) => {
  try {
    const session = await findSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    res.status(200).json(session.answerKey || { source: 'none', questions: [], totalPoints: 0 });
  } catch (error) {
    console.error('Get Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to fetch answer key.' });
  }
};

export const saveTypedAnswerKey = async (req, res) => {
  try {
    const session = await findSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const rawText = req.body?.rawText || req.body?.answerKeyText || '';
    const structuredPayload = Array.isArray(req.body?.questions)
      ? req.body
      : { rawText, questions: undefined };

    const answerKey = Array.isArray(req.body?.questions)
      ? parseTypedAnswerKey(JSON.stringify(structuredPayload))
      : parseTypedAnswerKey(rawText);

    if (!answerKey.questions.length) {
      return res.status(400).json({
        error: 'Please provide at least one answer in the key before grading.'
      });
    }

    session.answerKey = answerKey;
    session.lastAccessedAt = new Date();
    await session.save();

    res.status(200).json(session.answerKey);
  } catch (error) {
    console.error('Save Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to save answer key.' });
  }
};

export const transcribeModelWorksheet = async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI answer-key transcription is not configured. Missing API key.' });
    }

    const session = await findSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    const file = req.file;
    const imageValidation = validateUploadedImage(file);
    if (!imageValidation.ok) {
      return res.status(200).json({
        status: 'Manual Review Required',
        message: imageValidation.reason || MANUAL_REVIEW_MESSAGE,
        errorSummary: imageValidation.reason || MANUAL_REVIEW_MESSAGE
      });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 2500,
      system: ANSWER_KEY_TRANSCRIPTION_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            formatBufferToClaudePart(
              file.buffer,
              imageValidation.mimeType || normalizeMimeType(file.mimetype)
            ),
            {
              type: 'text',
              text: 'Transcribe this filled model worksheet into the answer-key JSON format.'
            }
          ]
        }
      ]
    });

    const parsed = parseAndNormalizeAnswerKeyResponse(response.content?.[0]?.text || '');
    if (parsed.status === 'Manual Review Required') {
      return res.status(200).json({
        status: parsed.status,
        message: parsed.errorSummary,
        errorSummary: parsed.errorSummary
      });
    }

    session.answerKey = parsed.answerKey;
    session.lastAccessedAt = new Date();
    if (parsed.title && (!session.title || session.title.startsWith('Session '))) {
      session.title = parsed.title;
    }
    await session.save();

    res.status(200).json({
      status: 'Success',
      answerKey: session.answerKey,
      session
    });
  } catch (error) {
    console.error('Transcribe Answer Key Error:', error);
    const status = error.status === 429 ? 429 : 500;
    res.status(status).json({
      error: error.status === 429
        ? 'AI service is busy. Please wait a moment and try again.'
        : 'Failed to transcribe the model worksheet.'
    });
  }
};

export const clearAnswerKey = async (req, res) => {
  try {
    const session = await findSession(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found.' });
    }

    session.answerKey = {
      source: 'none',
      rawText: '',
      questions: [],
      totalPoints: 0,
      updatedAt: new Date()
    };
    session.lastAccessedAt = new Date();
    await session.save();

    res.status(200).json(session.answerKey);
  } catch (error) {
    console.error('Clear Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to clear answer key.' });
  }
};
