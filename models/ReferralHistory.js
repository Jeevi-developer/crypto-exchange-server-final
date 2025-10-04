import mongoose from "mongoose";

const referralHistorySchema = new mongoose.Schema(
  {
    // User who earned the commission
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // User who was referred (the one who performed the action)
    referredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Action that triggered the commission
    action: {
      type: String,
      enum: ["registration", "trading_fee", "deposit_bonus", "withdrawal", "first_trade"],
      required: true,
    },
    // Commission amount earned
    amount: {
      type: Number,
      required: true,
      default: 0,
    },
    // Status of the commission
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    // Additional details
    details: {
      originalAmount: Number, // The original transaction amount
      commissionRate: Number, // Rate applied (e.g., 10%, 15%)
      transactionId: String, // Reference to original transaction
    },
    // Metadata
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { 
    timestamps: true 
  }
);

// Index for faster queries
referralHistorySchema.index({ userId: 1, createdAt: -1 });
referralHistorySchema.index({ referredUserId: 1 });
referralHistorySchema.index({ status: 1 });

export default mongoose.model("ReferralHistory", referralHistorySchema);