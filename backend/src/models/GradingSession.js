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
  }
}, {
  timestamps: true
});

export default mongoose.model('GradingSession', gradingSessionSchema);
