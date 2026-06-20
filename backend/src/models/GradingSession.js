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
  lastAccessedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

export default mongoose.model('GradingSession', gradingSessionSchema);
