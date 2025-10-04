import mongoose from "mongoose";

const stakingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true }, // staked amount (in crypto units)
  currency: {
    type: String,
    enum: ["inr", "btc", "eth", "usdt"],
    default: "inr",
  },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date, required: true }, // 5 years later
  status: {
    type: String,
    enum: ["active", "foreclosed", "completed"],
    default: "active",
  },
});

export default mongoose.model("Staking", stakingSchema);
