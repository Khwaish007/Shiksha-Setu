import express from 'express';
import multer from 'multer';
import {
  getAllStudents,
  createStudent,
  getStudentById,
  gradeStudentTest
} from '../controllers/studentController.js';

const router = express.Router();

// Multer: store upload in memory for immediate processing
const upload = multer({ storage: multer.memoryStorage() });

// GET  /api/students        → list all students
router.get('/', getAllStudents);

// POST /api/students        → create new student profile
router.post('/', createStudent);

// GET  /api/students/:id    → get single student with full test history
router.get('/:id', getStudentById);

// POST /api/students/:id/grade → upload test image, AI grade, save to student
router.post('/:id/grade', upload.single('worksheet'), gradeStudentTest);

export default router;
