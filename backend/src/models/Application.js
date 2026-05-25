import mongoose from 'mongoose';

const applicationSchema = new mongoose.Schema({
  job:              { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  applicant:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  coverLetter:      { type: String, required: true },
  proposedBudget:   { type: Number, required: true },
  proposedTimeline: { type: String, required: true },
  attachments:      [{ name: String, url: String }],
  status:           { type: String, enum: ['pending','reviewed','shortlisted','accepted','rejected','withdrawn'], default: 'pending' },
}, { timestamps: true });

applicationSchema.index({ job: 1, status: 1 });
applicationSchema.index({ applicant: 1 });
applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });

export default mongoose.model('Application', applicationSchema);
