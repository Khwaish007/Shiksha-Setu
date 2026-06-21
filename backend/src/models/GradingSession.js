import mongoose from 'mongoose';
import crypto from 'crypto';

const gradingSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    unique: true,
    index: true,
    default: () => crypto.randomUUID()
  },
  title: {
    type: String,
    default: () => `Session ${new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })}`
  },
  status: {
    type: String,
    enum: ['active', 'archived'],
    default: 'active'
  },
  source: {
    type: String,
    enum: ['batch', 'student', 'mixed'],
    default: 'batch'
  },
  totalUploads: {
    type: Number,
    default: 0
  },
  gradedCount: {
    type: Number,
    default: 0
  },
  manualReviewCount: {
    type: Number,
    default: 0
  },
  needsReviewCount: {
    type: Number,
    default: 0
  },
  averageScore: {
    type: Number,
    default: 0
  },
  answerKey: {
    source: {
      type: String,
      enum: ['none', 'typed', 'model_worksheet'],
      default: 'none'
    },
    rawText: {
      type: String,
      default: ''
    },
    questions: {
      type: [{
        questionNumber: { type: String, required: true },
        expectedAnswer: { type: String, required: true },
        points: { type: Number, default: 10 },
        concept: { type: String, default: 'General Mathematics' },
        rubric: { type: String, default: '' }
      }],
      default: []
    },
    totalPoints: {
      type: Number,
      default: 0
    },
    updatedAt: {
      type: Date
    }
  },
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  telemetry: {
    totalInputTokens: { type: Number, default: 0 },
    totalOutputTokens: { type: Number, default: 0 },
    totalWorksheetsGraded: { type: Number, default: 0 },
    totalGradingDurationMs: { type: Number, default: 0 },
    totalCostInr: { type: Number, default: 0 },
    runCount: { type: Number, default: 0 },
    lastBatchAt: { type: Date },
    lastBatchWorksheets: { type: Number, default: 0 },
    lastBatchDurationMs: { type: Number, default: 0 },
    lastBatchInputTokens: { type: Number, default: 0 },
    lastBatchOutputTokens: { type: Number, default: 0 },
    lastBatchCostInr: { type: Number, default: 0 },
    lastBatchThroughput: { type: Number, default: 0 },
  }
}, {
  timestamps: true
});

export default mongoose.model('GradingSession', gradingSessionSchema);
