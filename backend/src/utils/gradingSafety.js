export const MANUAL_REVIEW_STATUS = 'Manual Review Required';
export const NEEDS_TEACHER_REVIEW_STATUS = 'Needs Teacher Review';
export const LOW_CONFIDENCE_THRESHOLD = 0.72;

export const MANUAL_REVIEW_MESSAGE =
  "I can't grade this submission reliably. It may be unreadable, incomplete, or not a mathematics test, so it requires manual grading by a teacher.";

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif'
]);

export const normalizeMimeType = (mimeType) => {
  const normalized = String(mimeType || 'image/jpeg').toLowerCase();
  if (normalized === 'image/jpg' || normalized === 'image/jpeg') return 'image/jpeg';
  return normalized;
};

const CANONICAL_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

export const formatBufferToClaudePart = (buffer, mimeType) => ({
  type: 'image',
  source: {
    type: 'base64',
    media_type: mimeType,
    data: buffer.toString('base64')
  }
});

const BASE_GRADING_INSTRUCTIONS = `You are an expert school mathematics teacher grading uploaded handwritten tests.
Your ONLY task is to grade readable mathematics worksheets and return valid JSON. Return nothing except JSON.

DEFAULT BEHAVIOR — GRADE FIRST:
Assume a readable handwritten mathematics worksheet SHOULD be graded. When unsure between grading and manual review, choose grading.

Mark "gradingDecision": "manual_review" ONLY when the upload is clearly NOT gradable:
- The image is blank, severely corrupted, or so blurry/dark/cropped that NO math questions or student answers can be read at all.
- The upload is clearly NOT a mathematics test: photos of people/objects, unrelated documents, pure garbage/noise, screenshots with no math work.
- The content is clearly a non-mathematics subject with no math to grade (e.g. essay, history notes only).

DO NOT use manual_review for:
- Messy, informal, or partially cropped handwriting that is still readable.
- Hindi, Marathi, Devanagari, English, or mixed-language math worksheets.
- Missing or unclear student name (use "Unknown").
- Some questions hard to read — grade the readable ones; use needs_teacher_review only if major ambiguity affects the score.
- Imperfect photo quality when math questions and student work are still visible.

Language and script handling:
- Readable mathematics worksheets may be written in English, Hindi, Marathi, Devanagari script, Romanized Hindi/Marathi, or a mix. Language is NEVER a reason for manual review.
- Preserve student names exactly as written, including Hindi/Marathi/Devanagari characters.
- Keep concept tags concise in English unless the answer key supplies a different concept label.

CRITICAL RULES:
1. Return ONLY a valid JSON object. Do NOT include markdown, code fences, explanations, or text outside JSON.
2. The JSON must be parseable by JSON.parse() in JavaScript.
3. If a TEACHER ANSWER KEY is provided below, grade ONLY against that key — it is the ground truth for correctness and points.
4. If an answer key is provided, compute totalScore as the percentage of points earned out of total key points (0–100).
5. If NO answer key is provided, use your own mathematical knowledge: read each question, determine the correct answer yourself, compare the student's visible work, and assign a fair score. You MUST grade readable math worksheets without an answer key.
6. For manual_review uploads only: "gradingDecision": "manual_review", "status": "Manual Review Required", "totalScore": 0, empty mistakes, and errorSummary explaining why.
7. Never invent student work, but DO grade real visible work even when handwriting is imperfect.
8. For gradable uploads, include questionResults for each question you graded (confidence 0–1). If a perfect score, mistakes may be an empty array [].
9. Use "gradingDecision": "needs_teacher_review" and "status": "Needs Teacher Review" ONLY when you graded but one or more questions have confidence below ${LOW_CONFIDENCE_THRESHOLD} or the score is genuinely ambiguous. Do NOT use this for clear, readable worksheets.

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
  "questionResults": [
    {
      "questionNumber": "Q1",
      "concept": "The answer-key concept or inferred math concept",
      "isCorrect": true,
      "confidence": 0.94,
      "evidence": "Short reason based on visible student work",
      "pointsEarned": 10
    }
  ],
  "confidenceSummary": {
    "averageConfidence": 0.91,
    "minimumConfidence": 0.84,
    "lowConfidenceCount": 0
  },
  "misconception_patterns": [
    { "concept": "Fractions", "misconception": "short description", "severity": "minor|major" }
  ],
  "errorSummary": "Overall summary of student's misconceptions, if any",
  "status": "Success"
}

Return EXACTLY this structure for a mathematics worksheet that is readable enough to grade tentatively, but has one or more low-confidence question judgments:
{
  "gradingDecision": "needs_teacher_review",
  "studentName": "Extract and preserve the exact name written, otherwise 'Unknown'",
  "totalScore": <tentative number between 0-100>,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "conceptMissed": "The topic or skill from the answer key, or a concise inferred math concept"
    }
  ],
  "questionResults": [
    {
      "questionNumber": "Q1",
      "concept": "The answer-key concept or inferred math concept",
      "isCorrect": false,
      "confidence": 0.58,
      "evidence": "What is unclear or ambiguous",
      "pointsEarned": 0
    }
  ],
  "confidenceSummary": {
    "averageConfidence": 0.78,
    "minimumConfidence": 0.58,
    "lowConfidenceCount": 1
  },
  "reviewReason": "Short teacher-facing reason for review",
  "misconception_patterns": [],
  "errorSummary": "Tentative summary; teacher should verify low-confidence questions before accepting the grade.",
  "status": "Needs Teacher Review"
}

Return EXACTLY this structure for unreadable, non-mathematics, incomplete, or garbage uploads:
{
  "gradingDecision": "manual_review",
  "studentName": "Unknown",
  "totalScore": 0,
  "mistakes": [],
  "questionResults": [],
  "confidenceSummary": {
    "averageConfidence": 0,
    "minimumConfidence": 0,
    "lowConfidenceCount": 0
  },
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

NO TEACHER ANSWER KEY for this session.
Grade using your mathematical expertise:
- Read every visible question on the worksheet.
- Solve each question yourself to determine the correct answer.
- Compare the student's handwritten work to your solution.
- Assign points per question and compute totalScore as a 0–100 percentage.
- Readable handwritten mathematics tests MUST receive a grade, not manual review.`;
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

TEACHER ANSWER KEY — ground truth for this session (use this as the SOLE source of correct answers):
${JSON.stringify(compactKey, null, 2)}

Grade the student's worksheet against the key above. Match question numbers flexibly (e.g. "1" = "Q1"). The student sheet may differ in layout or include scratch work, but correctness is determined ONLY by the key.`;
};

export const GRADING_SYSTEM_PROMPT = buildGradingSystemPrompt(null);

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildManualReviewPayload = (reason = MANUAL_REVIEW_MESSAGE, studentName = 'Unknown') => ({
  gradingDecision: 'manual_review',
  studentName,
  totalScore: 0,
  mistakes: [],
  questionResults: [],
  confidenceSummary: {
    averageConfidence: 0,
    minimumConfidence: 0,
    lowConfidenceCount: 0
  },
  misconception_patterns: [],
  errorSummary: reason || MANUAL_REVIEW_MESSAGE,
  status: MANUAL_REVIEW_STATUS
});

export const validateUploadedImage = (file) => {
  if (!file) {
    return { ok: false, reason: 'No image file uploaded.' };
  }

  const mimeType = normalizeMimeType(file.mimetype);

  if (!CANONICAL_IMAGE_TYPES.has(mimeType) && !ALLOWED_IMAGE_TYPES.has(String(file.mimetype || '').toLowerCase())) {
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
    bytes[3] === 0x47;
  const isGif =
    bytes[0] === 0x47 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x38;
  const isWebp =
    bytes.length > 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;

  const signatureMatches =
    (mimeType === 'image/jpeg' && isJpeg) ||
    (mimeType === 'image/png' && isPng) ||
    (mimeType === 'image/gif' && isGif) ||
    (mimeType === 'image/webp' && isWebp);

  // Allow common camera uploads through even when MIME/signature metadata is imperfect;
  // Claude decides whether the content is a gradable math worksheet.
  if (!signatureMatches && bytes.length >= 512) {
    return { ok: true, mimeType };
  }

  if (!signatureMatches) {
    return {
      ok: false,
      reason: 'This upload does not appear to be a valid image file, so it requires manual grading.'
    };
  }

  return { ok: true, mimeType };
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
  if (raw) {
    const digitMatch = raw.match(/(\d+[a-z]?)/i);
    if (digitMatch) {
      const num = digitMatch[1].toUpperCase();
      return num.startsWith('Q') ? num : `Q${num}`;
    }
    if (raw.toUpperCase().startsWith('Q')) return raw.toUpperCase();
  }
  return `Q${fallbackIndex + 1}`;
};

const clampConfidence = (value) => {
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return null;
  return Math.min(1, Math.max(0, confidence));
};

const normalizeQuestionResults = (results = []) => (
  Array.isArray(results)
    ? results.map((result, index) => {
        const confidence = clampConfidence(result?.confidence);
        const pointsEarned = Number(result?.pointsEarned);

        return {
          questionNumber: normalizeQuestionNumber(result?.questionNumber, index),
          concept: String(result?.concept || result?.conceptMissed || 'General Mathematics').trim() || 'General Mathematics',
          isCorrect: Boolean(result?.isCorrect),
          confidence: confidence ?? 0,
          evidence: String(result?.evidence || '').trim(),
          pointsEarned: Number.isFinite(pointsEarned) ? pointsEarned : null
        };
      })
    : []
);

const buildConfidenceSummary = (questionResults, providedSummary = {}) => {
  const confidences = questionResults
    .map(result => clampConfidence(result.confidence))
    .filter(confidence => confidence !== null);

  const minimumConfidence = confidences.length ? Math.min(...confidences) : 0;
  const averageConfidence = confidences.length
    ? confidences.reduce((sum, confidence) => sum + confidence, 0) / confidences.length
    : 0;
  const lowConfidenceCount = confidences.filter(confidence => confidence < LOW_CONFIDENCE_THRESHOLD).length;

  const providedLowCount = Number(providedSummary.lowConfidenceCount);

  return {
    averageConfidence: Number.isFinite(Number(providedSummary.averageConfidence))
      ? Math.min(1, Math.max(0, Number(providedSummary.averageConfidence)))
      : Number(averageConfidence.toFixed(2)),
    minimumConfidence: Number.isFinite(Number(providedSummary.minimumConfidence))
      ? Math.min(1, Math.max(0, Number(providedSummary.minimumConfidence)))
      : Number(minimumConfidence.toFixed(2)),
    lowConfidenceCount: Number.isFinite(providedLowCount)
      ? Math.max(lowConfidenceCount, Math.max(0, providedLowCount))
      : lowConfidenceCount
  };
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

const normalizeMistakesArray = (mistakes = []) => {
  if (!Array.isArray(mistakes)) return [];

  return mistakes
    .filter((mistake) => mistake && (mistake.questionNumber != null || mistake.conceptMissed || mistake.concept))
    .map((mistake, index) => ({
      questionNumber: normalizeQuestionNumber(mistake.questionNumber, index),
      conceptMissed: String(mistake.conceptMissed || mistake.concept || 'General Mathematics').trim() || 'General Mathematics'
    }));
};

const parseScore = (payload) => {
  const raw = payload?.totalScore ?? payload?.score;
  const score = Number(raw);
  if (!Number.isFinite(score)) return null;
  return Math.min(100, Math.max(0, Math.round(score)));
};

export const normalizeGradingPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return buildManualReviewPayload('The AI response could not be interpreted, so this submission requires manual grading.');
  }

  const status = String(payload.status || '').trim();
  const decision = String(payload.gradingDecision || '').trim().toLowerCase();
  const totalScore = parseScore(payload);
  const hasValidScore = totalScore !== null;

  const explicitManualReview = decision === 'manual_review';
  const statusSaysManual = status.toLowerCase() === MANUAL_REVIEW_STATUS.toLowerCase();

  const questionResultsEarly = normalizeQuestionResults(payload.questionResults);
  const hasGradingEvidence =
    decision === 'graded' ||
    questionResultsEarly.length > 0 ||
    (Array.isArray(payload.mistakes) && payload.mistakes.length > 0) ||
    (hasValidScore && totalScore > 0);

  if ((explicitManualReview || statusSaysManual) && !hasGradingEvidence) {
    return buildManualReviewPayload(payload.errorSummary || MANUAL_REVIEW_MESSAGE, payload.studentName || 'Unknown');
  }

  const isNeedsTeacherReview =
    decision === 'needs_teacher_review' ||
    status.toLowerCase() === NEEDS_TEACHER_REVIEW_STATUS.toLowerCase();

  const misconceptionPatterns = Array.isArray(payload.misconception_patterns)
    ? payload.misconception_patterns
    : [];
  const questionResults = questionResultsEarly;
  const confidenceSummary = buildConfidenceSummary(questionResults, payload.confidenceSummary);
  const normalizedMistakes = normalizeMistakesArray(payload.mistakes);

  if (!hasValidScore) {
    return buildManualReviewPayload('The AI response did not include a valid score, so this submission requires manual grading.');
  }

  const studentName = typeof payload.studentName === 'string' && payload.studentName.trim()
    ? payload.studentName.trim()
    : 'Unknown';

  const hasLowConfidence = questionResults.length > 0 && confidenceSummary.lowConfidenceCount > 0;

  if (isNeedsTeacherReview || hasLowConfidence) {
    return {
      gradingDecision: 'needs_teacher_review',
      studentName,
      totalScore,
      mistakes: normalizedMistakes,
      questionResults,
      confidenceSummary,
      reviewReason: typeof payload.reviewReason === 'string' && payload.reviewReason.trim()
        ? payload.reviewReason.trim()
        : 'One or more question judgments had low confidence and should be checked by a teacher.',
      misconception_patterns: misconceptionPatterns,
      errorSummary: typeof payload.errorSummary === 'string' ? payload.errorSummary : '',
      status: NEEDS_TEACHER_REVIEW_STATUS
    };
  }

  return {
    gradingDecision: 'graded',
    studentName,
    totalScore,
    mistakes: normalizedMistakes,
    questionResults,
    confidenceSummary,
    reviewReason: '',
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
