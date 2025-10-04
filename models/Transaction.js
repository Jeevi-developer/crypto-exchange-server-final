import mongoose from "mongoose";

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["deposit", "withdraw", "trade"], required: true },
  asset: { type: String, enum: ["BTC", "ETH", "USDT"], required: true },
  amount: { type: mongoose.Schema.Types.Decimal128, required: true },
  fee: { type: mongoose.Schema.Types.Decimal128, default: 0 },
  address: { type: String }, // for withdraws
  status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }
}, { timestamps: true });

export default mongoose.model("Transaction", TransactionSchema);
