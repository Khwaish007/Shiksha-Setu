import mongoose from 'mongoose';

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

const studentQuestionResultSchema = new mongoose.Schema({
  questionNumber: {
    type: String,
    required: true
  },
  concept: {
    type: String,
    default: 'General Mathematics'
  },
  isCorrect: {
    type: Boolean,
    default: false
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  evidence: {
    type: String,
    default: ''
  },
  pointsEarned: {
    type: Number,
    default: null
  }
}, { _id: false });

const errorDNASchema = new mongoose.Schema({
  concept: { type: String, required: true },
  misconception: { type: String, required: true },
  severity: { type: String, enum: ['minor', 'major'] },
  occurrences: { type: Number, default: 1 },
  firstSeen: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now }
}, { _id: false });


const testRecordSchema = new mongoose.Schema({
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
  mistakes: [studentMistakeSchema],
  questionResults: {
    type: [studentQuestionResultSchema],
    default: []
  },
  confidenceSummary: {
    averageConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    minimumConfidence: {
      type: Number,
      min: 0,
      max: 1,
      default: 0
    },
    lowConfidenceCount: {
      type: Number,
      default: 0
    }
  },
  reviewReason: {
    type: String,
    default: ''
  },
  errorSummary: {
    type: String
  }
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
  tests: [testRecordSchema],
  errorDNA: [errorDNASchema],
  riskTier: { type: String, enum: ['high', 'medium', 'low', 'unassessed'], default: 'unassessed' },
  riskReason: { type: String },
  riskRecommendedAction: { type: String },
  riskUpdatedAt: { type: Date },
  parentPhone: { type: String, trim: true, default: '' },
  parentCommunication: {
    preferredChannel: {
      type: String,
      enum: ['whatsapp', 'sms', 'ivr', 'auto'],
      default: 'auto',
    },
    preferredLanguage: {
      type: String,
      enum: ['hindi', 'english', 'both'],
      default: 'hindi',
    },
    hasSmartphone: { type: Boolean, default: true },
  },
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
