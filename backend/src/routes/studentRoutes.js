import express from 'express';
import multer from 'multer';
import {
  getAllStudents,
  createStudent,
  getClassMisconceptions,
  assessCohortRisk,
  getStudentById,
  generateParentMessage,
  gradeStudentTest
} from '../controllers/studentController.js';
import {
  generateStudentInterventionPlan,
  updateParentPhone,
} from '../controllers/interventionController.js';
import {
  logStudentReteach,
  getStudentInterventionImpact,
} from '../controllers/interventionImpactController.js';
import {
  generateStudentAdaptiveWorksheet,
  listStudentAdaptiveWorksheets,
  downloadStudentAdaptiveWorksheet,
} from '../controllers/adaptiveWorksheetController.js';
import { generateStudentScopeLessonPlan } from '../controllers/lessonPlanController.js';
import {
  getStudentAnswerKey,
  saveStudentTypedAnswerKey,
  transcribeStudentModelWorksheet,
  clearStudentAnswerKey,
} from '../controllers/studentAnswerKeyController.js';
import {
  sendStudentParentNotification,
  updateCommunicationPreferences,
  getStudentNotificationLogs,
  getParentChannelStatus,
  serveIvrTwiml,
} from '../controllers/parentChannelController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

// GET  /api/students/parent-channels/status → SMS/IVR provider availability
router.get('/parent-channels/status', getParentChannelStatus);

// GET  /api/students/ivr-twiml → Twilio voice webhook
router.get('/ivr-twiml', serveIvrTwiml);

// GET  /api/students        → list all students
router.get('/', getAllStudents);

// POST /api/students        → create new student profile
router.post('/', createStudent);

// GET /api/students/class-misconceptions → get top 5 misconceptions across the class
router.get('/class-misconceptions', getClassMisconceptions);

// POST /api/students/risk-assessment → assess cohort risk via Claude
router.post('/risk-assessment', assessCohortRisk);

// POST /api/students/lesson-plan → micro-lesson for a misconception (Students section)
router.post('/lesson-plan', generateStudentScopeLessonPlan);

// GET  /api/students/:id    → get single student with full test history
router.get('/:id', getStudentById);

// POST /api/students/:id/parent-message → generate Claude message
router.post('/:id/parent-message', generateParentMessage);

// POST /api/students/:id/intervention-plan → one-click intervention plan
router.post('/:id/intervention-plan', generateStudentInterventionPlan);

// POST /api/students/:id/intervention-log → log completed reteach actions
router.post('/:id/intervention-log', logStudentReteach);

// GET /api/students/:id/intervention-impact → before/after impact deltas
router.get('/:id/intervention-impact', getStudentInterventionImpact);

// PATCH /api/students/:id/parent-phone → save parent WhatsApp number
router.patch('/:id/parent-phone', updateParentPhone);

// PATCH /api/students/:id/communication-preferences → SMS/IVR channel prefs
router.patch('/:id/communication-preferences', updateCommunicationPreferences);

// POST /api/students/:id/send-parent-notification → send via WhatsApp/SMS/IVR
router.post('/:id/send-parent-notification', sendStudentParentNotification);

// GET /api/students/:id/notification-logs → delivery audit trail
router.get('/:id/notification-logs', getStudentNotificationLogs);

// POST /api/students/:id/adaptive-worksheet → personalized PDF from Error DNA
router.post('/:id/adaptive-worksheet', generateStudentAdaptiveWorksheet);

// GET /api/students/:id/adaptive-worksheets → list generated worksheets
router.get('/:id/adaptive-worksheets', listStudentAdaptiveWorksheets);

// GET /api/students/:id/adaptive-worksheets/:worksheetId/pdf
router.get('/:id/adaptive-worksheets/:worksheetId/pdf', downloadStudentAdaptiveWorksheet);

// Student-scoped answer key (separate from dashboard sessions)
router.get('/:id/answer-key', getStudentAnswerKey);
router.put('/:id/answer-key', saveStudentTypedAnswerKey);
router.post('/:id/answer-key/transcribe', (req, res, next) => {
  upload.single('modelWorksheet')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4 MB.' });
      }
      return next(err);
    }
    transcribeStudentModelWorksheet(req, res, next);
  });
});
router.delete('/:id/answer-key', clearStudentAnswerKey);

// POST /api/students/:id/grade → upload test image, AI grade, save to student
router.post('/:id/grade', (req, res, next) => {
  upload.single('worksheet')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'File too large. Maximum size is 4 MB.' });
      }
      return next(err);
    }
    gradeStudentTest(req, res, next);
  });
});


export default router;
