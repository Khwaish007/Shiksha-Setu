export const MANUAL_REVIEW_STATUS = 'Manual Review Required';

export const MANUAL_REVIEW_MESSAGE =
  "I can't grade this submission reliably. It may be unreadable, incomplete, or not a mathematics test, so it requires manual grading by a teacher.";

export const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);

const MATH_CONCEPTS = new Set([
  'Linear Equations',
  'Area Calculation',
  'Trigonometry',
  'Quadratic Factorization',
  'Pythagorean Theorem',
  'Calculus Differentiation',
  'Probability',
  'System of Linear Equations',
  'Calculus Integration'
]);

export const GRADING_SYSTEM_PROMPT = `You are an expert school teacher evaluating uploaded handwritten mathematics tests.
Your ONLY task is to decide whether the image is a gradable mathematics test and return valid JSON. Return nothing except JSON.

Before grading, perform an eligibility check. Mark the submission as manual review if ANY of these are true:
- The image is blank, corrupted, too blurry, too dark, rotated/cropped so badly that answers cannot be read, or handwriting is not understandable.
- The upload is not a school mathematics test or worksheet.
- The upload contains non-mathematics content, random marks, screenshots, photos of unrelated objects, documents from other subjects, or garbage/noise.
- You cannot identify enough math questions and student work to grade fairly.
- You are uncertain whether the content is a mathematics test.

CRITICAL RULES:
1. Return ONLY a valid JSON object. Do NOT include markdown, code fences, explanations, or text outside JSON.
2. The JSON must be parseable by JSON.parse() in JavaScript.
3. There are 10 questions total. Each question is worth 10 points.
4. If and only if the submission is clearly a gradable mathematics test, calculate the score based on correct answers.
5. For every ungradable upload, use "gradingDecision": "manual_review", "status": "Manual Review Required", "totalScore": 0, empty mistake/annotation arrays, and the teacher-facing error message in "errorSummary".
6. Never invent a score, student name, question, or math work for an ungradable upload.

Return EXACTLY this structure for a gradable mathematics test:
{
  "gradingDecision": "graded",
  "studentName": "Extract the exact name written (e.g. 'Student_12'), otherwise 'Unknown'",
  "totalScore": <number between 0-100, where each correct answer = 10 points>,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "conceptMissed": "One of: 'Linear Equations', 'Area Calculation', 'Trigonometry', 'Quadratic Factorization', 'Pythagorean Theorem', 'Calculus Differentiation', 'Probability', 'System of Linear Equations', 'Calculus Integration'"
    }
  ],
  "annotations": [
    { "step": 1, "description": "What the student did", "status": "correct|wrong|consequence" }
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
  "annotations": [],
  "misconception_patterns": [],
  "errorSummary": "${MANUAL_REVIEW_MESSAGE}",
  "status": "Manual Review Required"
}`;

export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export const buildManualReviewPayload = (reason = MANUAL_REVIEW_MESSAGE, studentName = 'Unknown') => ({
  gradingDecision: 'manual_review',
  studentName,
  totalScore: 0,
  mistakes: [],
  annotations: [],
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
  const annotations = Array.isArray(payload.annotations) ? payload.annotations : [];
  const misconceptionPatterns = Array.isArray(payload.misconception_patterns)
    ? payload.misconception_patterns
    : [];

  const hasValidScore = Number.isFinite(totalScore) && totalScore >= 0 && totalScore <= 100;
  const hasValidMistakes = mistakes.every((mistake) => (
    mistake &&
    typeof mistake.questionNumber === 'string' &&
    /^Q?\d+$/i.test(mistake.questionNumber.trim()) &&
    MATH_CONCEPTS.has(mistake.conceptMissed)
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
      conceptMissed: mistake.conceptMissed
    })),
    annotations,
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
