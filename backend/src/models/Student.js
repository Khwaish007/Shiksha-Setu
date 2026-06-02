import mongoose from 'mongoose';
import crypto from 'crypto';

const studentMistakeSchema = new mongoose.Schema({
  questionNumber: {
    type: String,
    required: true
  },
  conceptMissed: {
    type: String,
    required: true
  }
}, { _id: false });

const testRecordSchema = new mongoose.Schema({
  testId: {
    type: String,
    default: () => crypto.randomUUID()
  },
  date: {
    type: Date,
    default: Date.now
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    default: 10
  },
  mistakes: [studentMistakeSchema]
});

const studentSchema = new mongoose.Schema({
  studentName: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  avatarColor: {
    type: String,
    default: () => {
      const palette = [
        '#7dd3fc', '#a78bfa', '#fb7185', '#34d399',
        '#fbbf24', '#f472b6', '#60a5fa', '#c084fc',
        '#4ade80', '#f97316', '#38bdf8', '#e879f9'
      ];
      return palette[Math.floor(Math.random() * palette.length)];
    }
  },
  tests: [testRecordSchema]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual: average score computed from all test results
studentSchema.virtual('averageScore').get(function () {
  if (!this.tests || this.tests.length === 0) return 0;
  const total = this.tests.reduce((sum, t) => sum + t.score, 0);
  return Math.round(total / this.tests.length);
});

// Virtual: total number of tests
studentSchema.virtual('totalTests').get(function () {
  return this.tests ? this.tests.length : 0;
});

export default mongoose.model('Student', studentSchema);
