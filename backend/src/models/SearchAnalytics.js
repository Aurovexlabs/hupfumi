import mongoose from 'mongoose';

const schema = new mongoose.Schema({
  term:           { type: String, required: true, lowercase: true, trim: true },
  count:          { type: Number, default: 1 },
  lastSearchedAt: { type: Date, default: Date.now },
}, { timestamps: false });

schema.index({ term: 1 }, { unique: true });
schema.index({ count: -1 });

export default mongoose.model('SearchAnalytics', schema);
