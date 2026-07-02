import Student from '../models/Student.js';
import AdaptiveWorksheet from '../models/AdaptiveWorksheet.js';
import {
  buildStudentWorksheetContext,
  generateAdaptiveQuestions,
} from '../utils/adaptiveWorksheetGenerator.js';
import { renderWorksheetPdf } from '../utils/worksheetPdfRenderer.js';

const streamPdfResponse = (res, buffer, filename) => {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.send(buffer);
};

const hasWorksheetProfile = (student) => {
  const errorDnaCount = student.errorDNA?.length || 0;
  const testMistakeCount = (student.tests || []).reduce(
    (sum, test) => sum + (test.mistakes?.length || 0),
    0
  );
  return errorDnaCount > 0 || testMistakeCount > 0;
};

/**
 * POST /api/students/:id/adaptive-worksheet
 * Generate + stream personalized PDF from the student's Error DNA profile.
 * Students section only — not linked to dashboard bulk sessions.
 */
export const generateStudentAdaptiveWorksheet = async (req, res) => {
  try {
    const { id } = req.params;
    const { concept } = req.body || {};

    const student = await Student.findById(id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    if (!hasWorksheetProfile(student)) {
      return res.status(400).json({
        error: 'Grade at least one test in the Students section first. Error DNA is built from individual student grading only.',
      });
    }

    const context = buildStudentWorksheetContext(student, { concept });
    const generated = await generateAdaptiveQuestions(context);

    const worksheet = await AdaptiveWorksheet.create({
      studentId: student._id,
      studentName: context.studentName,
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
 * GET /api/students/:id/adaptive-worksheets
 * List worksheets previously generated for a student profile.
 */
export const listStudentAdaptiveWorksheets = async (req, res) => {
  try {
    const { id } = req.params;
    const worksheets = await AdaptiveWorksheet.find({ studentId: id })
      .sort({ generatedAt: -1 })
      .limit(20);

    res.status(200).json({
      studentId: id,
      total: worksheets.length,
      worksheets: worksheets.map((w) => ({
        id: w._id.toString(),
        concept: w.concept,
        questionCount: w.questions?.length || 0,
        source: w.source,
        generatedAt: w.generatedAt,
        downloadPath: `/api/students/${id}/adaptive-worksheets/${w._id}/pdf`,
      })),
    });
  } catch (error) {
    console.error('List Student Adaptive Worksheets Error:', error);
    res.status(500).json({ error: 'Failed to list worksheets.' });
  }
};

/**
 * GET /api/students/:id/adaptive-worksheets/:worksheetId/pdf
 */
export const downloadStudentAdaptiveWorksheet = async (req, res) => {
  try {
    const { id, worksheetId } = req.params;
    const worksheet = await AdaptiveWorksheet.findOne({
      _id: worksheetId,
      studentId: id,
    });

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
    console.error('Download Student Adaptive Worksheet Error:', error);
    res.status(500).json({ error: 'Failed to download worksheet.' });
  }
};
