import mongoose from 'mongoose';

const savedItemSchema = new mongoose.Schema({
  user:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refType: { type: String, enum: ['job','service','product'], required: true },
  refId:   { type: mongoose.Schema.Types.ObjectId, required: true },
  title:   String,
  slug:    String,
  price:   Number,
  image:   String,
}, { timestamps: true });

savedItemSchema.index({ user: 1, refType: 1, createdAt: -1 });
savedItemSchema.index({ user: 1, refId: 1, refType: 1 }, { unique: true });

export default mongoose.model('SavedItem', savedItemSchema);
