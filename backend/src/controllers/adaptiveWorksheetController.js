import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Student from '../models/Student.js';
import Submission from '../models/Submission.js';
import AdaptiveWorksheet from '../models/AdaptiveWorksheet.js';
import {
  buildStudentWorksheetContext,
  generateAdaptiveQuestions,
} from '../utils/adaptiveWorksheetGenerator.js';
import { renderWorksheetPdf } from '../utils/worksheetPdfRenderer.js';
import { extractWeakConcepts } from '../utils/interventionUtils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..', '..', '..');
const staticPdfDirs = [
  path.join(projectRoot, 'practice_tests_pdf'),
  path.join(projectRoot, 'frontend', 'public', 'practice_tests_pdf'),
];

const getRequestSessionId = (req) =>
  req.params?.sessionId || req.query?.sessionId || req.body?.sessionId || null;

const escapeRegExp = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findStudentByName = async (name) => {
  if (!name) return null;
  return Student.findOne({
    studentName: new RegExp(`^${escapeRegExp(name.trim())}$`, 'i'),
  });
};

const getSessionMistakesForStudent = async (sessionId, studentName) => {
  if (!sessionId || !studentName) return [];
  const submissions = await Submission.find({
    sessionId,
    status: 'Success',
    studentName: new RegExp(`^${escapeRegExp(studentName.trim())}$`, 'i'),
  }).sort({ createdAt: -1 });

  return submissions[0]?.mistakes || [];
};

const streamPdfResponse = (res, buffer, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(buffer);
};

const createAndSaveWorksheet = async ({
  student,
  context,
  sessionId,
  generated,
}) => {
  const worksheet = await AdaptiveWorksheet.create({
    studentId: student._id,
    studentName: context.studentName,
    sessionId: sessionId || undefined,
    concept: generated.concept,
    questions: generated.questions,
    errorDnaSnapshot: context.misconceptions,
    source: generated.source,
  });

  const pdfBuffer = await renderWorksheetPdf({
    studentName: context.studentName,
    concept: generated.concept,
    questions: generated.questions,
    misconceptions: context.misconceptions,
  });

  return { worksheet, pdfBuffer };
};

/**
 * POST /api/students/:id/adaptive-worksheet
 * Generate + stream personalized PDF for one student.
 */
export const generateStudentAdaptiveWorksheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { concept, sessionId } = req.body || {};

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const sessionMistakes = await getSessionMistakesForStudent(sessionId, student.studentName);
    const context = buildStudentWorksheetContext(student, { concept, sessionMistakes });
    const generated = await generateAdaptiveQuestions(context);
    const { worksheet, pdfBuffer } = await createAndSaveWorksheet({
      student,
      context,
      sessionId,
      generated,
    });

    const slug = context.studentName.replace(/\s+/g, '_').toLowerCase();
    const filename = `${slug}_${generated.concept.replace(/\s+/g, '_')}_adaptive.pdf`;

    res.setHeader('X-Worksheet-Id', worksheet._id.toString());
    streamPdfResponse(res, pdfBuffer, filename);
  } catch (error) {
    console.error('Generate Student Adaptive Worksheet Error:', error);
    res.status(500).json({ error: 'Failed to generate adaptive worksheet.' });
  }
};

/**
 * GET /api/v1/grading/adaptive-worksheets/:id/pdf
 * Re-download a previously generated worksheet.
 */
export const downloadAdaptiveWorksheet = async (req, res) => {
  try {
    const worksheet = await AdaptiveWorksheet.findById(req.params.id);
    if (!worksheet) {
      return res.status(404).json({ error: 'Worksheet not found.' });
    }

    const pdfBuffer = await renderWorksheetPdf({
      studentName: worksheet.studentName,
      concept: worksheet.concept,
      questions: worksheet.questions,
      misconceptions: worksheet.errorDnaSnapshot,
    });

    const filename = `${worksheet.studentName.replace(/\s+/g, '_')}_adaptive.pdf`;
    streamPdfResponse(res, pdfBuffer, filename);
  } catch (error) {
    console.error('Download Adaptive Worksheet Error:', error);
    res.status(500).json({ error: 'Failed to download worksheet.' });
  }
};

/**
 * POST /api/v1/grading/adaptive-worksheets
 * One-click differentiated practice for entire class.
 */
export const generateClassAdaptiveWorksheets = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required.' });
    }

    const submissions = await Submission.find({ sessionId, status: 'Success' });
    if (!submissions.length) {
      return res.status(200).json({
        sessionId,
        totalGenerated: 0,
        worksheets: [],
        message: 'No graded worksheets in this session yet.',
      });
    }

    const studentNames = [...new Set(submissions.map((s) => s.studentName))];
    const worksheets = [];
    const errors = [];

    for (const name of studentNames) {
      try {
        let student = await findStudentByName(name);
        if (!student) {
          student = await Student.create({ studentName: name });
        }

        const sessionMistakes = await getSessionMistakesForStudent(sessionId, name);
        const weakConcepts = extractWeakConcepts(sessionMistakes, 1);
        const hasData = weakConcepts.length > 0 || (student.errorDNA?.length > 0);

        if (!hasData) {
          errors.push({ studentName: name, reason: 'No mistake or Error DNA data' });
          continue;
        }

        const context = buildStudentWorksheetContext(student, {
          concept: weakConcepts[0]?.concept,
          sessionMistakes,
        });
        const generated = await generateAdaptiveQuestions(context);
        const { worksheet } = await createAndSaveWorksheet({
          student,
          context,
          sessionId,
          generated,
        });

        worksheets.push({
          id: worksheet._id.toString(),
          studentName: context.studentName,
          concept: generated.concept,
          questionCount: generated.questions.length,
          source: generated.source,
          targetedMisconceptions: context.misconceptions.slice(0, 3).map((m) => m.misconception),
          downloadPath: `/api/v1/grading/adaptive-worksheets/${worksheet._id}/pdf`,
        });
      } catch (err) {
        errors.push({ studentName: name, reason: err.message });
      }
    }

    res.status(200).json({
      sessionId,
      totalGenerated: worksheets.length,
      totalStudents: studentNames.length,
      worksheets,
      errors: errors.length ? errors : undefined,
      message: worksheets.length
        ? `Generated ${worksheets.length} personalized worksheets — one per student based on their Error DNA.`
        : 'No worksheets generated. Grade tests first so Error DNA and mistakes are available.',
    });
  } catch (error) {
    console.error('Generate Class Adaptive Worksheets Error:', error);
    res.status(500).json({ error: 'Failed to generate class worksheets.' });
  }
};

/**
 * GET /api/v1/grading/adaptive-worksheets?sessionId=
 * List worksheets generated for a session.
 */
export const listSessionAdaptiveWorksheets = async (req, res) => {
  try {
    const sessionId = getRequestSessionId(req);
    const query = sessionId ? { sessionId } : {};
    const worksheets = await AdaptiveWorksheet.find(query)
      .sort({ generatedAt: -1 })
      .limit(100)
      .select('studentName concept questions source generatedAt');

    res.status(200).json({
      sessionId: sessionId || null,
      total: worksheets.length,
      worksheets: worksheets.map((w) => ({
        id: w._id.toString(),
        studentName: w.studentName,
        concept: w.concept,
        questionCount: w.questions?.length || 0,
        source: w.source,
        generatedAt: w.generatedAt,
        downloadPath: `/api/v1/grading/adaptive-worksheets/${w._id}/pdf`,
      })),
    });
  } catch (error) {
    console.error('List Adaptive Worksheets Error:', error);
    res.status(500).json({ error: 'Failed to list worksheets.' });
  }
};

/**
 * Enhanced practice test: adaptive if studentId provided, else static PDF.
 */
export const getAdaptiveOrStaticPracticeTest = async (req, res) => {
  const { concept } = req.params;
  const { studentId, sessionId } = req.query;

  if (studentId) {
    try {
      const student = await Student.findById(studentId);
      if (student) {
        const sessionMistakes = await getSessionMistakesForStudent(sessionId, student.studentName);
        const context = buildStudentWorksheetContext(student, { concept, sessionMistakes });
        const generated = await generateAdaptiveQuestions(context);
        const pdfBuffer = await renderWorksheetPdf({
          studentName: context.studentName,
          concept: generated.concept,
          questions: generated.questions,
          misconceptions: context.misconceptions,
        });

        const filename = `${concept.replace(/\s+/g, '_')}_adaptive.pdf`;
        return streamPdfResponse(res, pdfBuffer, filename);
      }
    } catch (error) {
      console.warn('Adaptive practice fallback to static:', error.message);
    }
  }

  const sanitizedConcept = concept.replace(/\s/g, '_').toLowerCase();
  const filename = `${sanitizedConcept}_practice_test.pdf`;

  for (const dir of staticPdfDirs) {
    const filepath = path.join(dir, filename);
    if (fs.existsSync(filepath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      return fs.createReadStream(filepath).pipe(res);
    }
  }

  return res.status(404).json({ error: 'Practice test not found for this concept.' });
};
