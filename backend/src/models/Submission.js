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

export default mongoose.model('Submission', submissionSchema);
