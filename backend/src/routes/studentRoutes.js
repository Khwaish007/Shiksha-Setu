import express from 'express';
import multer from 'multer';
import {
  getAllStudents,
  createStudent,
  getClassMisconceptions,
  assessCohortRisk,
  getStudentById,
  generateParentMessage,
  gradeStudentTest,
  getTestReplay
} from '../controllers/studentController.js';

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
});

// GET  /api/students        → list all students
router.get('/', getAllStudents);

// POST /api/students        → create new student profile
router.post('/', createStudent);

// GET /api/students/class-misconceptions → get top 5 misconceptions across the class
router.get('/class-misconceptions', getClassMisconceptions);

// POST /api/students/risk-assessment → assess cohort risk via Claude
router.post('/risk-assessment', assessCohortRisk);

// GET  /api/students/:id    → get single student with full test history
router.get('/:id', getStudentById);

// POST /api/students/:id/parent-message → generate Claude message
router.post('/:id/parent-message', generateParentMessage);

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

// GET /api/students/:studentId/tests/:testId/replay → get test image and annotations
router.get('/:studentId/tests/:testId/replay', getTestReplay);

export default router;
