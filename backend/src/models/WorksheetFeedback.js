import mongoose from 'mongoose';

const wrongQuestionSchema = new mongoose.Schema({
  questionNumber: { type: String, required: true },
  concept: { type: String, default: 'General Mathematics' },
  evidence: { type: String, default: '' },
  workedSolution: { type: String, default: '' },
  rubric: { type: String, default: '' },
}, { _id: false });

const practiceProblemSchema = new mongoose.Schema({
  concept: { type: String, default: 'General Mathematics' },
  question: { type: String, required: true },
  hint: { type: String, default: '' },
  answer: { type: String, default: '' },
}, { _id: false });

const localizedBlockSchema = new mongoose.Schema({
  greeting: { type: String, default: '' },
  scoreSummary: { type: String, default: '' },
  mistakesTitle: { type: String, default: '' },
  workedSolutionLabel: { type: String, default: '' },
  practiceTitle: { type: String, default: '' },
  encouragement: { type: String, default: '' },
}, { _id: false });

const worksheetFeedbackSchema = new mongoose.Schema({
  feedbackToken: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  studentFirstName: { type: String, trim: true, default: 'Student' },
  score: { type: Number, required: true },
  totalQuestions: { type: Number, default: 10 },
  mistakes: [{
    questionNumber: String,
    conceptMissed: String,
  }],
  wrongQuestions: [wrongQuestionSchema],
  practiceProblem: practiceProblemSchema,
  localizedContent: {
    en: localizedBlockSchema,
    hi: localizedBlockSchema,
    mr: localizedBlockSchema,
  },
  sessionId: { type: String, index: true },
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  submissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Submission' },
  testId: { type: mongoose.Schema.Types.ObjectId },
  sourceType: {
    type: String,
    enum: ['student_test', 'submission'],
    default: 'student_test',
  },
  gradedAt: { type: Date, default: Date.now },
  aiEnhanced: { type: Boolean, default: false },
}, {
  timestamps: true,
});

export default mongoose.model('WorksheetFeedback', worksheetFeedbackSchema);
