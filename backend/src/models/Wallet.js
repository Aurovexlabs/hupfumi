import mongoose from 'mongoose';

const walletSchema = new mongoose.Schema({
  user:                { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true, required: true },
  balance:             { type: Number, default: 0 },
  pendingBalance:      { type: Number, default: 0 },
  withdrawableBalance: { type: Number, default: 0 },
  totalEarned:         { type: Number, default: 0 },
  totalSpent:          { type: Number, default: 0 },
  totalDeposited:      { type: Number, default: 0 },
  totalWithdrawn:      { type: Number, default: 0 },
  withdrawalMethods:   [{ type: String, details: String, verified: Boolean }],
  lastTransactionAt:   Date,
}, { timestamps: true });

export default mongoose.model('Wallet', walletSchema);
