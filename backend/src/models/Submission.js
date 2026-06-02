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
  studentName: {
    type: String,
    default: "Unknown"
  },
  totalScore: {
    type: Number,
    required: true
  },
  mistakes: [mistakeSchema],
  status: {
    type: String,
    default: "Success"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('Submission', submissionSchema);