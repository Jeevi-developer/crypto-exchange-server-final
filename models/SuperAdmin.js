// models/Superadmin.js
import mongoose from "mongoose";

const SuperadminSchema = new mongoose.Schema({
  name: String,
  email: String,
  password: String,
  userType: String,
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },
  otp: String,
  otpExpiry: Date,
  referralCode: { type: String, unique: true },
  referralCount: { type: Number, default: 0 },
  referralEarnings: { type: Number, default: 0 },
  referredUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  kycStatus: { type: String, default: "pending" },
  balance: { type: Object, default: {} },
  role: { type: String, default: "superadmin" },
  walletLocked: { type: Boolean, default: false },
  stakingLocked: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.model("Superadmin", SuperadminSchema);
