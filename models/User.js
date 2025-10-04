import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";

// Nanoid for unique referral code generation
const nanoid = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 8);

const userSchema = new mongoose.Schema(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
    userType: { type: String, default: "individual" },
    role: { type: String, default: "user" },

    // Verification fields
    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    otp: { type: String, default: null },
    otpExpiry: { type: Date, default: null },

    // ✅ Unique referral code for this user
    referralCode: { type: String, unique: true, default: () => nanoid() },

    // ✅ The code of the person who referred this user
    referredBy: { type: String, default: null },

    referralCount: { type: Number, default: 0 },
    referralEarnings: { type: Number, default: 0 },
    referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    kycStatus: {
      type: String,
      enum: ["not_submitted", "pending", "approved", "rejected"],
      default: "not_submitted",
    },
    kycId: { type: mongoose.Schema.Types.ObjectId, ref: "KYC" },
    kycData: { type: Object, default: {} },

    balance: {
      inr: { type: Number, default: 0 },
      usd: { type: Number, default: 0 },
    },
    walletLocked: { type: Boolean, default: false },
    stakingLocked: { type: Boolean, default: false },

    passwordResetToken: { type: String, default: null },
    passwordResetExpiry: { type: Date, default: null },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("User", userSchema);
