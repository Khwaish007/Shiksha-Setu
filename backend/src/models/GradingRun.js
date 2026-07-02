import mongoose from 'mongoose';

const gradingRunSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    index: true,
    default: null,
  },
  worksheetsCount: {
    type: Number,
    default: 0,
  },
  successCount: {
    type: Number,
    default: 0,
  },
  inputTokens: {
    type: Number,
    default: 0,
  },
  outputTokens: {
    type: Number,
    default: 0,
  },
  totalTokens: {
    type: Number,
    default: 0,
  },
  durationMs: {
    type: Number,
    default: 0,
  },
  batchSize: {
    type: Number,
    default: 1,
  },
  source: {
    type: String,
    enum: ['batch', 'student', 'student_profile', 'answer_key'],
    default: 'batch',
  },
  costInr: {
    type: Number,
    default: 0,
  },
  costPerWorksheetInr: {
    type: Number,
    default: 0,
  },
  throughputPerMin: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

gradingRunSchema.index({ createdAt: -1 });

export default mongoose.model('GradingRun', gradingRunSchema);
