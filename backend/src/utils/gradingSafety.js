export const MANUAL_REVIEW_STATUS = 'Manual Review Required';

export const MANUAL_REVIEW_MESSAGE =
  "I can't grade this submission reliably. It may be unreadable, incomplete, or not a mathematics test, so it requires manual grading by a teacher.";

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

export const formatBufferToClaudePart = (buffer, mimeType) => ({
  type: 'image',
  source: {
    type: 'base64',
    media_type: mimeType,
    data: buffer.toString('base64')
  }
});

const BASE_GRADING_INSTRUCTIONS = `You are an expert school teacher evaluating uploaded handwritten school tests.
Your ONLY task is to decide whether the image is a gradable mathematics test and return valid JSON. Return nothing except JSON.

Before grading, perform an eligibility check. Mark the submission as manual review if ANY of these are true:
- The image is blank, corrupted, too blurry, too dark, rotated/cropped so badly that answers cannot be read, or handwriting is not understandable.
- The upload is not a school mathematics test or worksheet.
- The upload contains non-mathematics content, random marks, screenshots, photos of unrelated objects, documents from other subjects, or garbage/noise.
- You cannot identify enough math questions and student work to grade fairly.
- You are uncertain whether the content is a mathematics test.

Language and script handling:
- Readable mathematics worksheets may be written in English, Hindi, Marathi, Devanagari script, Romanized Hindi/Marathi, or a mix of these. Do NOT send a worksheet to manual review solely because it uses an Indian language or Devanagari text.
- Preserve student names exactly as written, including Hindi/Marathi/Devanagari characters and mixed-script names.
- Translate or interpret math instructions only as needed to grade; keep concept tags concise in English unless the answer key supplies a different concept label.

CRITICAL RULES:
1. Return ONLY a valid JSON object. Do NOT include markdown, code fences, explanations, or text outside JSON.
2. The JSON must be parseable by JSON.parse() in JavaScript.
3. If an answer key is provided below, grade ONLY against that answer key. Do not guess a different correct answer.
4. If an answer key is provided, infer the score from the key's points. Convert the earned points to a 0-100 percentage.
5. If no answer key is provided, grade only when the worksheet itself clearly includes enough information to judge correctness.
6. For every ungradable upload, use "gradingDecision": "manual_review", "status": "Manual Review Required", "totalScore": 0, an empty mistakes array, and the teacher-facing error message in "errorSummary".
7. Never invent a score, student name, question, or math work for an ungradable upload.

Return EXACTLY this structure for a gradable mathematics test:
{
  "gradingDecision": "graded",
  "studentName": "Extract and preserve the exact name written, including Devanagari or mixed-script names, otherwise 'Unknown'",
  "totalScore": <number between 0-100, as a percentage of earned points>,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "conceptMissed": "The topic or skill from the answer key, or a concise inferred math concept"
    }
  ],
  "misconception_patterns": [
    { "concept": "Fractions", "misconception": "short description", "severity": "minor|major" }
  ],
  "errorSummary": "Overall summary of student's misconceptions, if any",
  "status": "Success"
}

Return EXACTLY this structure for unreadable, non-mathematics, incomplete, or garbage uploads:
{
  "gradingDecision": "manual_review",
  "studentName": "Unknown",
  "totalScore": 0,
  "mistakes": [],
  "misconception_patterns": [],
  "errorSummary": "${MANUAL_REVIEW_MESSAGE}",
  "status": "Manual Review Required"
}`;

export const ANSWER_KEY_TRANSCRIPTION_PROMPT = `You are helping a teacher create a grading answer key from one filled model mathematics worksheet.
Return ONLY valid JSON. Do not include markdown or text outside JSON.

Readable model worksheets may be written in English, Hindi, Marathi, Devanagari script, Romanized Hindi/Marathi, or mixed language. Treat them as valid mathematics worksheets when the questions and filled answers are clear, and preserve source text where it matters for the answer key.

If the image is unreadable, not a mathematics worksheet, blank, or does not contain a filled model solution, return:
{
  "status": "Manual Review Required",
  "errorSummary": "${MANUAL_REVIEW_MESSAGE}",
  "questions": []
}

If it is readable, transcribe the answer key into this exact structure:
{
  "status": "Success",
  "title": "Short worksheet title if visible, otherwise Mathematics Worksheet",
  "questions": [
    {
      "questionNumber": "Q1",
      "expectedAnswer": "Final answer and essential work/steps visible in the model worksheet",
      "points": 10,
      "concept": "Specific topic or skill tested",
      "rubric": "Short note on what should receive credit"
    }
  ]
}

Rules:
- Include every numbered question you can read.
- Use the question numbering written on the page.
- If point values are visible, use them. Otherwise assign 10 points per question.
- Do not solve new questions yourself beyond what is visible in the filled model worksheet.
- If any answer is unclear, mention that uncertainty in the expectedAnswer or rubric.`;

const hasUsableAnswerKey = (answerKey) => (
  answerKey &&
  Array.isArray(answerKey.questions) &&
  answerKey.questions.length > 0
);

export const buildGradingSystemPrompt = (answerKey) => {
  if (!hasUsableAnswerKey(answerKey)) {
    return `${BASE_GRADING_INSTRUCTIONS}

No teacher answer key was provided for this session. Use your best judgment only if the worksheet is clearly gradable.`;
  }

  const compactKey = {
    source: answerKey.source || 'typed',
    totalPoints: answerKey.totalPoints,
    questions: answerKey.questions.map((question) => ({
      questionNumber: question.questionNumber,
      expectedAnswer: question.expectedAnswer,
      points: question.points,
      concept: question.concept,
      rubric: question.rubric
    }))
  };

  return `${BASE_GRADING_INSTRUCTIONS}

TEACHER ANSWER KEY - ground truth for this session:
${JSON.stringify(compactKey, null, 2)}

Use the key above as the sole source of correctness. The student worksheet may have a different layout, handwriting, or extra scratch work, but grade against these question numbers and expected answers.`;
};

export const GRADING_SYSTEM_PROMPT = buildGradingSystemPrompt(null);

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildManualReviewPayload = (reason = MANUAL_REVIEW_MESSAGE, studentName = 'Unknown') => ({
  gradingDecision: 'manual_review',
  studentName,
  totalScore: 0,
  mistakes: [],
  misconception_patterns: [],
  errorSummary: reason || MANUAL_REVIEW_MESSAGE,
  status: MANUAL_REVIEW_STATUS
});

export const validateUploadedImage = (file) => {
  if (!file) {
    return { ok: false, reason: 'No image file uploaded.' };
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.mimetype)) {
    return {
      ok: false,
      reason: 'This file type is not supported for AI grading. Please upload a clear PNG, JPG, WEBP, or GIF image of a mathematics test for manual review.'
    };
  }

  if (!file.buffer || file.buffer.length < 16) {
    return {
      ok: false,
      reason: 'This upload appears empty or corrupted, so it requires manual grading.'
    };
  }

  const bytes = file.buffer;
  const isJpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const isPng =
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const isGif =
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38;
  const isWebp =
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  const signatureMatches =
    (file.mimetype === 'image/jpeg' && isJpeg) ||
    (file.mimetype === 'image/png' && isPng) ||
    (file.mimetype === 'image/gif' && isGif) ||
    (file.mimetype === 'image/webp' && isWebp);

  if (!signatureMatches) {
    return {
      ok: false,
      reason: 'This upload does not appear to be a valid image file, so it requires manual grading.'
    };
  }

  return { ok: true };
};

export const extractJsonObject = (responseText = '') => {
  let cleansedText = responseText
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim();

  const jsonMatch = cleansedText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    cleansedText = jsonMatch[0];
  }

  return JSON.parse(cleansedText);
};

const normalizeQuestionNumber = (value, fallbackIndex) => {
  const raw = String(value || '').trim();
  if (raw) return raw.toUpperCase().startsWith('Q') ? raw.toUpperCase() : `Q${raw}`;
  return `Q${fallbackIndex + 1}`;
};

export const normalizeAnswerKeyPayload = (payload, source = 'typed') => {
  const rawQuestions = Array.isArray(payload?.questions) ? payload.questions : [];

  const questions = rawQuestions
    .map((question, index) => ({
      questionNumber: normalizeQuestionNumber(question.questionNumber, index),
      expectedAnswer: String(question.expectedAnswer || question.answer || '').trim(),
      points: Number.isFinite(Number(question.points)) && Number(question.points) > 0
        ? Number(question.points)
        : 10,
      concept: String(question.concept || question.topic || 'General Mathematics').trim() || 'General Mathematics',
      rubric: String(question.rubric || question.explanation || '').trim()
    }))
    .filter(question => question.expectedAnswer);

  const totalPoints = questions.reduce((sum, question) => sum + question.points, 0);

  return {
    source,
    rawText: typeof payload?.rawText === 'string' ? payload.rawText.trim() : '',
    questions,
    totalPoints,
    updatedAt: new Date()
  };
};

export const parseTypedAnswerKey = (rawText = '') => {
  const trimmed = String(rawText || '').trim();
  if (!trimmed) {
    return normalizeAnswerKeyPayload({ questions: [] }, 'typed');
  }

  try {
    const parsed = JSON.parse(trimmed);
    return normalizeAnswerKeyPayload({ ...parsed, rawText: trimmed }, 'typed');
  } catch {
    const questions = trimmed
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean)
      .map((line, index) => {
        const match = line.match(/^(?:Q(?:uestion)?\s*)?(\d+[a-zA-Z]?)\s*[:.)-]\s*(.+)$/i);
        if (!match) {
          return {
            questionNumber: `Q${index + 1}`,
            expectedAnswer: line,
            points: 10,
            concept: 'General Mathematics',
            rubric: ''
          };
        }

        return {
          questionNumber: `Q${match[1]}`,
          expectedAnswer: match[2].trim(),
          points: 10,
          concept: 'General Mathematics',
          rubric: ''
        };
      });

    return normalizeAnswerKeyPayload({ rawText: trimmed, questions }, 'typed');
  }
};

export const parseAndNormalizeAnswerKeyResponse = (responseText) => {
  const parsed = extractJsonObject(responseText);
  if (String(parsed.status || '').toLowerCase() === MANUAL_REVIEW_STATUS.toLowerCase()) {
    return {
      status: MANUAL_REVIEW_STATUS,
      errorSummary: parsed.errorSummary || MANUAL_REVIEW_MESSAGE,
      answerKey: normalizeAnswerKeyPayload({ questions: [] }, 'model_worksheet')
    };
  }

  const answerKey = normalizeAnswerKeyPayload(parsed, 'model_worksheet');
  if (!answerKey.questions.length) {
    return {
      status: MANUAL_REVIEW_STATUS,
      errorSummary: 'The model worksheet was readable, but no usable answers could be extracted.',
      answerKey
    };
  }

  return {
    status: 'Success',
    title: parsed.title || 'Mathematics Worksheet',
    answerKey
  };
};

export const normalizeGradingPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return buildManualReviewPayload('The AI response could not be interpreted, so this submission requires manual grading.');
  }

  const status = String(payload.status || '').trim();
  const decision = String(payload.gradingDecision || '').trim().toLowerCase();
  const isManualReview =
    decision === 'manual_review' ||
    status.toLowerCase() === MANUAL_REVIEW_STATUS.toLowerCase();

  if (isManualReview) {
    return buildManualReviewPayload(payload.errorSummary || MANUAL_REVIEW_MESSAGE, payload.studentName || 'Unknown');
  }

  const totalScore = Number(payload.totalScore);
  const mistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
  const misconceptionPatterns = Array.isArray(payload.misconception_patterns)
    ? payload.misconception_patterns
    : [];

  const hasValidScore = Number.isFinite(totalScore) && totalScore >= 0 && totalScore <= 100;
  const hasValidMistakes = mistakes.every((mistake) => (
    mistake &&
    typeof mistake.questionNumber === 'string' &&
    /^Q?\d+[a-z]?$/i.test(mistake.questionNumber.trim()) &&
    typeof mistake.conceptMissed === 'string' &&
    mistake.conceptMissed.trim()
  ));

  if (!hasValidScore || !hasValidMistakes) {
    return buildManualReviewPayload('The AI response was incomplete or inconsistent, so this submission requires manual grading.');
  }

  return {
    gradingDecision: 'graded',
    studentName: typeof payload.studentName === 'string' && payload.studentName.trim()
      ? payload.studentName.trim()
      : 'Unknown',
    totalScore,
    mistakes: mistakes.map((mistake) => ({
      questionNumber: mistake.questionNumber.trim().toUpperCase().startsWith('Q')
        ? mistake.questionNumber.trim().toUpperCase()
        : `Q${mistake.questionNumber.trim()}`,
      conceptMissed: mistake.conceptMissed.trim()
    })),
    misconception_patterns: misconceptionPatterns,
    errorSummary: typeof payload.errorSummary === 'string' ? payload.errorSummary : '',
    status: 'Success'
  };
};

export const parseAndNormalizeGradingResponse = (responseText) => {
  try {
    return normalizeGradingPayload(extractJsonObject(responseText));
  } catch {
    return buildManualReviewPayload('The AI response could not be read safely, so this submission requires manual grading.');
  }
};
