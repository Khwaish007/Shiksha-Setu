import mongoose from 'mongoose';

const mistakeSchema = new mongoose.Schema({
  questionNumber: {
    type: String,
    required: true
  },
  conceptMissed: {
    type: String,
    required: true
  }
});

const questionResultSchema = new mongoose.Schema({
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

const submissionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    index: true,
    required: true
  },
  studentName: {
    type: String,
    default: "Unknown"
  },
  totalScore: {
    type: Number,
    required: true
  },
  mistakes: [mistakeSchema],
  questionResults: {
    type: [questionResultSchema],
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
  reviewStatus: {
    type: String,
    enum: ['none', 'pending', 'approved'],
    default: 'none'
  },
  reviewedAt: {
    type: Date
  },
  sourceStudentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student'
  },
  errorSummary: {
    type: String
  },
  status: {
    type: String,
    default: "Success"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

submissionSchema.index({ sessionId: 1, studentName: 1 });
submissionSchema.index({ sessionId: 1, createdAt: -1 });
submissionSchema.index({ sessionId: 1, status: 1, reviewStatus: 1, createdAt: -1 });

export default mongoose.model('Submission', submissionSchema);
