import Anthropic from '@anthropic-ai/sdk';
import Student from '../models/Student.js';
import {
  ANSWER_KEY_TRANSCRIPTION_PROMPT,
  MANUAL_REVIEW_MESSAGE,
  formatBufferToClaudePart,
  normalizeMimeType,
  parseAndNormalizeAnswerKeyResponse,
  parseTypedAnswerKey,
  validateUploadedImage,
} from '../utils/gradingSafety.js';

const findStudent = async (id) => Student.findById(id);

export const getStudentAnswerKey = async (req, res) => {
  try {
    const student = await findStudent(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    res.status(200).json(student.answerKey || { source: 'none', questions: [], totalPoints: 0 });
  } catch (error) {
    console.error('Get Student Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to fetch answer key.' });
  }
};

export const saveStudentTypedAnswerKey = async (req, res) => {
  try {
    const student = await findStudent(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
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
        error: 'Please provide at least one answer in the key before grading.',
      });
    }

    student.answerKey = answerKey;
    await student.save();

    res.status(200).json(student.answerKey);
  } catch (error) {
    console.error('Save Student Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to save answer key.' });
  }
};

export const transcribeStudentModelWorksheet = async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI answer-key transcription is not configured. Missing API key.' });
    }

    const student = await findStudent(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const file = req.file;
    const imageValidation = validateUploadedImage(file);
    if (!imageValidation.ok) {
      return res.status(200).json({
        status: 'Manual Review Required',
        message: imageValidation.reason || MANUAL_REVIEW_MESSAGE,
        errorSummary: imageValidation.reason || MANUAL_REVIEW_MESSAGE,
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
              text: 'Transcribe this filled model worksheet into the answer-key JSON format.',
            },
          ],
        },
      ],
    });

    const parsed = parseAndNormalizeAnswerKeyResponse(response.content[0].text);
    if (parsed.status === 'Manual Review Required') {
      return res.status(200).json({
        status: parsed.status,
        message: parsed.errorSummary,
        errorSummary: parsed.errorSummary,
      });
    }

    student.answerKey = parsed.answerKey || parsed;
    await student.save();

    res.status(200).json({
      status: 'Success',
      answerKey: student.answerKey,
    });
  } catch (error) {
    console.error('Transcribe Student Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to transcribe answer key.' });
  }
};

export const clearStudentAnswerKey = async (req, res) => {
  try {
    const student = await findStudent(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    student.answerKey = {
      source: 'none',
      rawText: '',
      questions: [],
      totalPoints: 0,
      updatedAt: new Date(),
    };
    await student.save();

    res.status(200).json(student.answerKey);
  } catch (error) {
    console.error('Clear Student Answer Key Error:', error);
    res.status(500).json({ error: 'Failed to clear answer key.' });
  }
};
