import express from 'express';
import {
  getWorksheetFeedback,
  getWorksheetFeedbackMeta,
} from '../controllers/feedbackController.js';

const router = express.Router();

router.get('/:token/meta', getWorksheetFeedbackMeta);
router.get('/:token', getWorksheetFeedback);

export default router;
