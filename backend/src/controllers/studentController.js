import Anthropic from '@anthropic-ai/sdk';
import Student from '../models/Student.js';
import Submission from '../models/Submission.js';

// ─── Reused helpers from gradeController.js ─────────────────────────────────

const formatBufferToClaudePart = (buffer, mimeType) => ({
  type: "image",
  source: {
    type: "base64",
    media_type: mimeType,
    data: buffer.toString("base64")
  }
});

const generateWithRetry = async (client, systemPrompt, imageData, maxRetries = 3) => {
  let delayMs = 15000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await client.messages.create({
        model: "claude-opus-4-1-20250805",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: [imageData, {
              type: "text",
              text: "Please analyze this worksheet image and provide the grading results in JSON format."
            }]
          }
        ]
      });
    } catch (error) {
      const isRateLimit = error.status === 429 || (error.message && error.message.includes('429'));
      if (isRateLimit && i < maxRetries - 1) {
        console.warn(`[429] Rate limited. Retrying in ${delayMs / 1000}s... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delayMs += 10000;
        continue;
      }
      throw error;
    }
  }
};

const GRADING_SYSTEM_PROMPT = `You are an expert school teacher evaluating handwritten student quizzes. Your ONLY task is to return valid JSON, nothing else.

CRITICAL RULES:
1. You MUST return ONLY a valid JSON object. Do NOT include any text, explanation, or narrative.
2. Do NOT use markdown code blocks like \`\`\`json.
3. The JSON must be parseable by JSON.parse() in JavaScript.
4. There are 10 questions total. Each question is worth 10 points (100 points total).
5. Calculate the score based on how many questions are answered correctly. Deduct 10 points per incorrect answer.
6. Return EXACTLY this structure with no additional text before or after:
{
  "studentName": "Extract the exact name written (e.g. 'Student_12'), otherwise 'Unknown'",
  "totalScore": <number between 0-100, where each correct answer = 10 points>,
  "mistakes": [
    {
      "questionNumber": "Q1",
      "conceptMissed": "One of: 'Linear Equations', 'Area Calculation', 'Trigonometry', 'Quadratic Factorization', 'Pythagorean Theorem', 'Calculus Differentiation', 'Probability', 'System of Linear Equations', 'Calculus Integration'"
    }
  ],
  "annotations": [
    { "step": 1, "description": "What the student did in this step", "status": "correct|wrong|consequence" }
  ],
  "misconception_patterns": [
    { "concept": "Fractions", "misconception": "inverts fraction before multiplying instead of after", "severity": "major" }
  ],
  "errorSummary": "Overall summary of student's misconceptions, if any",
  "status": "Success"
}

If the image is unreadable:
{
  "studentName": "Unknown",
  "totalScore": 0,
  "mistakes": [],
  "annotations": [],
  "misconception_patterns": [],
  "errorSummary": "Unreadable",
  "status": "Manual Review Required"
}`;

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
      studentName: { $regex: new RegExp(`^${studentName.trim()}$`, 'i') }
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
 * Accepts single image upload, runs Claude AI grading,
 * pushes test record into student's tests array,
 * AND dual-writes to Submission collection for heatmap consistency
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

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const imagePart = formatBufferToClaudePart(file.buffer, file.mimetype);

    const gradingResult = await generateWithRetry(client, GRADING_SYSTEM_PROMPT, imagePart);

    const responseText = gradingResult.content?.[0]?.text || '';
    let cleansedText = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleansedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleansedText = jsonMatch[0];
    }

    let parsed;
    try {
      parsed = JSON.parse(cleansedText);
    } catch (parseError) {
      console.error('Grade Student Test JSON parse error:', parseError.message);
      parsed = {
        totalScore: 0,
        mistakes: [],
        annotations: [],
        misconception_patterns: [],
        errorSummary: 'AI response could not be parsed',
        status: 'Manual Review Required',
      };
    }

    const mistakes = (parsed.mistakes || [])
      .filter((m) => m?.questionNumber && m?.conceptMissed)
      .map((m) => ({
        questionNumber: String(m.questionNumber),
        conceptMissed: String(m.conceptMissed),
      }));

    const testRecord = {
      date: new Date(),
      score: Number(parsed.totalScore) || 0,
      totalQuestions: 10,
      mistakes,
      annotations: parsed.annotations || [],
      errorSummary: parsed.errorSummary || '',
      imageBase64: file.buffer.toString('base64'),
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

    res.status(200).json({
      message: 'Test graded successfully.',
      test: savedTest,
      studentName: student.studentName,
      averageScore: student.averageScore,
      totalTests: student.totalTests,
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
 * GET /api/students/:studentId/tests/:testId/replay
 * Returns the test image and AI annotations for frontend canvas replay
 */
export const getTestReplay = async (req, res) => {
  try {
    const student = await Student.findById(req.params.studentId);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const test = student.tests.id(req.params.testId) || student.tests.find(t => t.testId === req.params.testId);
    if (!test) {
      return res.status(404).json({ error: 'Test not found.' });
    }

    if (!test.imageBase64) {
      return res.status(404).json({ error: 'Image not available for this test.' });
    }

    res.status(200).json({
      imageBase64: test.imageBase64,
      annotations: test.annotations || [],
      errorSummary: test.errorSummary || ""
    });
  } catch (error) {
    console.error('Get Test Replay Error:', error);
    res.status(500).json({ error: 'Failed to fetch test replay.' });
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
  "whatsappText": "A merged, emoji-friendly version ready to be sent on WhatsApp"
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
