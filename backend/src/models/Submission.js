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

const annotationSchema = new mongoose.Schema({
  step: { type: Number },
  description: { type: String },
  status: { type: String }
}, { _id: false });


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
  annotations: [annotationSchema],
  errorSummary: {
    type: String
  },
  imageBase64: {
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

export default mongoose.model('Submission', submissionSchema);