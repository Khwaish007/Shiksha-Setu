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
  "status": "Success"
}

If the image is unreadable:
{
  "studentName": "Unknown",
  "totalScore": 0,
  "mistakes": [],
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
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No image file uploaded.' });
    }

    // Initialize Claude client
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Format the image for Claude
    const imagePart = formatBufferToClaudePart(file.buffer, file.mimetype);

    // Run AI grading
    const gradingResult = await generateWithRetry(client, GRADING_SYSTEM_PROMPT, imagePart);

    // Parse response
    const responseText = gradingResult.content[0].text;
    let cleansedText = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const jsonMatch = cleansedText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleansedText = jsonMatch[0];
    }

    const parsed = JSON.parse(cleansedText);

    // Build the test record
    const testRecord = {
      date: new Date(),
      score: Number(parsed.totalScore),
      totalQuestions: 10,
      mistakes: (parsed.mistakes || []).map(m => ({
        questionNumber: m.questionNumber,
        conceptMissed: m.conceptMissed
      }))
    };

    // Push test into student's tests array
    student.tests.push(testRecord);
    await student.save();

    // Dual-write to Submission collection so classroom heatmap includes this test
    const submissionFilter = { studentName: { $regex: new RegExp(`^${student.studentName.trim()}$`, 'i') } };
    const submissionUpdate = {
      studentName: student.studentName.trim(),
      totalScore: testRecord.score,
      mistakes: testRecord.mistakes,
      status: parsed.status || 'Success',
      createdAt: new Date()
    };
    await Submission.findOneAndUpdate(submissionFilter, submissionUpdate, { returnDocument: 'after', upsert: true });

    // Return the saved test record (last in array)
    const savedTest = student.tests[student.tests.length - 1];

    res.status(200).json({
      message: 'Test graded successfully.',
      test: savedTest,
      studentName: student.studentName,
      averageScore: student.averageScore,
      totalTests: student.totalTests
    });
  } catch (error) {
    console.error('Grade Student Test Error:', error);
    res.status(500).json({ error: 'Failed to grade test. Please try again.' });
  }
};
