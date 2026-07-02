import Anthropic from '@anthropic-ai/sdk';
import Student from '../models/Student.js';
import {
  escapeRegExp,
  MANUAL_REVIEW_MESSAGE,
  NEEDS_TEACHER_REVIEW_STATUS,
} from '../utils/gradingSafety.js';
import { recordGradingRun } from '../utils/costTelemetry.js';
import { executeWorksheetGrading } from '../utils/gradingPipeline.js';
import { createWorksheetFeedback } from '../utils/feedbackUtils.js';

// ─── Controller Handlers ────────────────────────────────────────────────────

/**
 * GET /api/students
 * Returns all students with computed averageScore and totalTests
 */
export const getAllStudents = async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    // Map to a clean response (virtuals are included via toJSON)
    const response = students.map(s => ({
      _id: s._id,
      studentName: s.studentName,
      avatarColor: s.avatarColor,
      averageScore: s.averageScore,
      totalTests: s.totalTests,
      tests: s.tests,
      riskTier: s.riskTier,
      riskReason: s.riskReason,
      riskRecommendedAction: s.riskRecommendedAction,
      riskUpdatedAt: s.riskUpdatedAt,
      createdAt: s.createdAt
    }));
    res.status(200).json(response);
  } catch (error) {
    console.error('Get All Students Error:', error);
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
};

/**
 * POST /api/students
 * Creates a new student profile
 * Body: { studentName: string }
 */
export const createStudent = async (req, res) => {
  try {
    const { studentName } = req.body;
    if (!studentName || !studentName.trim()) {
      return res.status(400).json({ error: 'Student name is required.' });
    }

    // Check for duplicate
    const existing = await Student.findOne({
      studentName: { $regex: new RegExp(`^${escapeRegExp(studentName.trim())}$`, 'i') }
    });
    if (existing) {
      return res.status(409).json({ error: 'A student with this name already exists.' });
    }

    const student = new Student({ studentName: studentName.trim() });
    await student.save();

    res.status(201).json({
      _id: student._id,
      studentName: student.studentName,
      avatarColor: student.avatarColor,
      averageScore: student.averageScore,
      totalTests: student.totalTests,
      createdAt: student.createdAt
    });
  } catch (error) {
    console.error('Create Student Error:', error);
    res.status(500).json({ error: 'Failed to create student.' });
  }
};

/**
 * GET /api/students/:id
 * Returns full student document with complete test history
 */
export const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }
    res.status(200).json(student);
  } catch (error) {
    console.error('Get Student Error:', error);
    res.status(500).json({ error: 'Failed to fetch student.' });
  }
};

/**
 * POST /api/students/:id/grade
 * Individual student grading — isolated from dashboard bulk sessions.
 * Builds test history and Error DNA on the student profile only.
 */
export const gradeStudentTest = async (req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(500).json({ error: 'AI grading is not configured. Missing API key.' });
    }

    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    const answerKey = student.answerKey?.questions?.length ? student.answerKey : null;
    const gradeResult = await executeWorksheetGrading(file, answerKey);
    const parsed = gradeResult.payload;

    if (parsed.status === 'Manual Review Required') {
      return res.status(200).json({
        status: parsed.status,
        message: parsed.errorSummary || MANUAL_REVIEW_MESSAGE,
        errorSummary: parsed.errorSummary || MANUAL_REVIEW_MESSAGE,
      });
    }

    if (parsed.status === NEEDS_TEACHER_REVIEW_STATUS) {
      return res.status(200).json({
        status: parsed.status,
        message: parsed.reviewReason || 'This grade needs teacher review before it is added to the student timeline.',
        reviewReason: parsed.reviewReason,
        totalScore: parsed.totalScore,
        mistakes: parsed.mistakes,
        questionResults: parsed.questionResults,
        confidenceSummary: parsed.confidenceSummary,
      });
    }

    const testRecord = {
      date: new Date(),
      score: Number(parsed.totalScore) || 0,
      totalQuestions: Math.max(parsed.questionResults?.length || 0, 10),
      mistakes: parsed.mistakes || [],
      questionResults: parsed.questionResults || [],
      confidenceSummary: parsed.confidenceSummary || {
        averageConfidence: 0,
        minimumConfidence: 0,
        lowConfidenceCount: 0,
      },
      reviewReason: parsed.reviewReason || '',
      errorSummary: parsed.errorSummary || '',
      sessionId: '',
    };

    student.tests.push(testRecord);

    if (!student.errorDNA) {
      student.errorDNA = [];
    }

    const patterns = (parsed.misconception_patterns || []).filter(
      (p) => p?.concept && p?.misconception
    );

    patterns.forEach((p) => {
      const existing = student.errorDNA.find(
        (dna) =>
          dna.concept === p.concept &&
          dna.misconception.toLowerCase() === p.misconception.toLowerCase()
      );
      if (existing) {
        existing.occurrences += 1;
        existing.lastSeen = new Date();
      } else {
        student.errorDNA.push({
          concept: p.concept,
          misconception: p.misconception,
          severity: p.severity === 'major' ? 'major' : 'minor',
          occurrences: 1,
          firstSeen: new Date(),
          lastSeen: new Date(),
        });
      }
    });

    await student.save();

    const savedTest = student.tests[student.tests.length - 1];

    let feedbackToken = '';
    let feedbackUrl = '';
    try {
      const feedbackResult = await createWorksheetFeedback({
        sessionId: '',
        studentId: student._id,
        studentName: student.studentName,
        submissionId: null,
        testId: savedTest._id,
        score: testRecord.score,
        totalQuestions: testRecord.totalQuestions,
        mistakes: testRecord.mistakes,
        questionResults: testRecord.questionResults,
        answerKey: student.answerKey,
      });
      feedbackToken = feedbackResult.feedbackToken;
      feedbackUrl = feedbackResult.feedbackUrl;
      savedTest.feedbackToken = feedbackToken;
      await student.save();
    } catch (feedbackError) {
      console.warn('Worksheet feedback creation skipped:', feedbackError.message);
    }

    await recordGradingRun({
      sessionId: null,
      worksheetsCount: 1,
      successCount: 1,
      inputTokens: gradeResult.usage.inputTokens,
      outputTokens: gradeResult.usage.outputTokens,
      durationMs: gradeResult.durationMs,
      batchSize: 1,
      source: 'student_profile',
    });

    res.status(200).json({
      message: 'Test graded successfully.',
      test: savedTest,
      studentName: student.studentName,
      averageScore: student.averageScore,
      totalTests: student.totalTests,
      feedbackToken,
      feedbackUrl,
    });
  } catch (error) {
    console.error('Grade Student Test Error:', error);
    const status = error.status === 429 ? 429 : 500;
    res.status(status).json({
      error:
        error.status === 429
          ? 'AI service is busy. Please wait a moment and try again.'
          : 'Failed to grade test. Please try again.',
    });
  }
};

/**
 * GET /api/students/class-misconceptions
 * Returns top 5 misconceptions across the whole class
 */
export const getClassMisconceptions = async (req, res) => {
  try {
    const students = await Student.find();
    const allMisconceptions = {};
    
    students.forEach(student => {
      (student.errorDNA || []).forEach(dna => {
        const key = `${dna.concept}|${dna.misconception.toLowerCase()}`;
        if (!allMisconceptions[key]) {
          allMisconceptions[key] = {
            concept: dna.concept,
            misconception: dna.misconception,
            severity: dna.severity || 'minor',
            occurrences: 0,
            studentsAffected: new Set()
          };
        }
        allMisconceptions[key].occurrences += dna.occurrences;
        allMisconceptions[key].studentsAffected.add(student.studentName);
      });
    });

    const sorted = Object.values(allMisconceptions)
      .map(item => ({
        ...item,
        studentsAffectedCount: Array.from(item.studentsAffected).length
      }))
      .sort((a, b) => b.studentsAffectedCount - a.studentsAffectedCount || b.occurrences - a.occurrences)
      .slice(0, 5);

    res.status(200).json(sorted);
  } catch (error) {
    console.error('Class Misconceptions Error:', error);
    res.status(500).json({ error: 'Failed to fetch class misconceptions.' });
  }
};

/**
 * POST /api/students/risk-assessment
 * Re-evaluates risk tier for all students in the cohort via Claude
 */
export const assessCohortRisk = async (req, res) => {
  try {
    const students = await Student.find();
    
    // Build payload for Claude
    const cohortData = students.map(s => {
      const recentTests = [...s.tests].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-3);
      const recentScores = recentTests.map(t => t.score);
      
      let trend = "flat";
      if (recentScores.length >= 2) {
        const diff = recentScores[recentScores.length - 1] - recentScores[0];
        if (diff > 5) trend = "improving";
        else if (diff < -5) trend = "declining";
      }

      const weakConcepts = s.errorDNA.slice(0, 3).map(dna => dna.concept);

      return {
        studentId: s._id.toString(),
        studentName: s.studentName,
        recentScores,
        scoreTrend: trend,
        weakConcepts
      };
    });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const prompt = `You are an AI educational analyst.
I will provide a JSON array of students with their recent scores, score trend, and weak concepts.
For each student, assess their risk of underperforming on the next assessment.
Return ONLY a valid JSON array of objects with EXACTLY this structure:
[
  {
    "studentId": "id-from-input",
    "riskTier": "high" | "medium" | "low",
    "primaryReason": "One sentence explaining the risk",
    "recommendedAction": "One concrete teacher action"
  }
]
Do not include any markdown or other text.`;

    const response = await client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 4000,
      system: prompt,
      messages: [{ role: "user", content: JSON.stringify(cohortData) }]
    });

    let responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    const assessments = JSON.parse(responseText);

    for (const assessment of assessments) {
      await Student.findByIdAndUpdate(assessment.studentId, {
        riskTier: assessment.riskTier.toLowerCase(),
        riskReason: assessment.primaryReason,
        riskRecommendedAction: assessment.recommendedAction,
        riskUpdatedAt: new Date()
      });
    }

    res.status(200).json({ message: "Cohort risk assessed successfully.", assessments });
  } catch (error) {
    console.error("Risk Assessment Error:", error);
    res.status(500).json({ error: "Failed to assess cohort risk." });
  }
};

/**
 * POST /api/students/:id/parent-message
 * Generates a ready-to-send bilingual parent message via Claude
 */
export const generateParentMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { language = 'both', tone = 'friendly' } = req.body;

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const recentTests = [...student.tests].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-3);
    const recentScores = recentTests.map(t => t.score);
    const weakConcepts = student.errorDNA.slice(0, 3).map(dna => dna.concept);

    const studentData = {
      studentName: student.studentName,
      averageScore: student.averageScore,
      recentScores,
      weakConcepts,
      riskTier: student.riskTier
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const prompt = `Generate a parent communication message for the following student performance data.
Tone: ${tone} and encouraging, avoid jargon.
Language requirement: ${language === 'both' ? 'Hindi (Devanagari script) with English translation below' : language === 'hindi' ? 'Hindi (Devanagari script) only' : 'English only'}.
Include:
1) One-line overall progress summary.
2) One specific concept to practice at home (give a concrete example activity).
3) One genuine positive observation.
Keep total length under 100 words per language.

Student data:
${JSON.stringify(studentData)}

Return ONLY a valid JSON object with this exact structure:
{
  "hindi": "Hindi text here (or empty string if English only)",
  "english": "English text here (or empty string if Hindi only)",
  "whatsappText": "A merged, emoji-friendly version ready to be sent on WhatsApp",
  "smsText": "Concise SMS under 160 chars in primary language, no emojis",
  "ivrText": "Spoken script for automated voice call in primary language, no emojis, under 80 words"
}
Do not include any markdown or other text.`;

    const response = await client.messages.create({
      model: "claude-opus-4-1-20250805",
      max_tokens: 1500,
      system: prompt,
      messages: [{ role: "user", content: "Generate the message." }]
    });

    let responseText = response.content[0].text;
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      responseText = jsonMatch[0];
    }
    
    const parsed = JSON.parse(responseText);

    res.status(200).json(parsed);
  } catch (error) {
    console.error("Generate Parent Message Error:", error);
    res.status(500).json({ error: "Failed to generate parent message." });
  }
};
