import mongoose from 'mongoose';

const worksheetQuestionSchema = new mongoose.Schema({
  prompt: { type: String, required: true },
  answer: { type: String, required: true },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'medium' },
  targetsMisconception: { type: String, default: '' },
}, { _id: false });

const adaptiveWorksheetSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student' },
  studentName: { type: String, required: true },
  sessionId: { type: String },
  concept: { type: String, required: true },
  questions: [worksheetQuestionSchema],
  errorDnaSnapshot: [{
    concept: String,
    misconception: String,
    occurrences: Number,
    severity: String,
  }],
  source: { type: String, enum: ['ai', 'fallback'], default: 'ai' },
  generatedAt: { type: Date, default: Date.now },
});

adaptiveWorksheetSchema.index({ sessionId: 1, generatedAt: -1 });
adaptiveWorksheetSchema.index({ studentId: 1, generatedAt: -1 });

export default mongoose.model('AdaptiveWorksheet', adaptiveWorksheetSchema);
