/**
 * Smoke test for worksheet QR feedback flow.
 * Run: node src/scripts/verifyQrFeedback.js
 */
import dotenv from 'dotenv';
import connectDatabase from '../config/db.js';
import WorksheetFeedback from '../models/WorksheetFeedback.js';
import {
  createWorksheetFeedback,
  formatPublicFeedback,
} from '../utils/feedbackUtils.js';

dotenv.config();

const run = async () => {
  await connectDatabase();

  const sample = await createWorksheetFeedback({
    studentName: 'Verify Test Student',
    score: 65,
    totalQuestions: 10,
    mistakes: [{ questionNumber: 'Q2', conceptMissed: 'Linear Equations' }],
    questionResults: [
      {
        questionNumber: 'Q2',
        concept: 'Linear Equations',
        isCorrect: false,
        evidence: 'Student subtracted instead of adding.',
      },
    ],
    answerKey: {
      questions: [{
        questionNumber: 'Q2',
        expectedAnswer: 'x = 4. Subtract 5 from both sides, divide by 2.',
        concept: 'Linear Equations',
      }],
    },
  });

  const loaded = await WorksheetFeedback.findOne({ feedbackToken: sample.feedbackToken });
  if (!loaded) throw new Error('Feedback record not persisted');

  const publicPayload = formatPublicFeedback(loaded, 'hi');
  if (!publicPayload.wrongQuestions.length) throw new Error('Expected wrong questions');
  if (!publicPayload.practiceProblem?.question) throw new Error('Expected practice problem');
  if (!publicPayload.content?.greeting) throw new Error('Expected localized greeting');

  console.log('✓ QR feedback smoke test passed');
  console.log('  token:', sample.feedbackToken);
  console.log('  url:', sample.feedbackUrl);
  console.log('  wrongQuestions:', publicPayload.wrongQuestions.length);
  console.log('  practice:', publicPayload.practiceProblem.question);

  await WorksheetFeedback.deleteOne({ feedbackToken: sample.feedbackToken });
  process.exit(0);
};

run().catch((err) => {
  console.error('✗ QR feedback smoke test failed:', err.message);
  process.exit(1);
});
