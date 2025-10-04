import mongoose from "mongoose";

const kycSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  type: String,
  firstName: String,
  lastName: String,
  dob: String,
  mobileNumber: String,
  addressLine1: String,
  locality: String,
  country: String,
  pinCode: String,
  state: String,
  district: String,
  city: String,
  pan: String,
  aadhar: String,
  accountType: String,
  accountNumber: String,
  accountStatus: String,
  dateOfOpening: String,
  branchCode: String,
  selfie: String, // store file path
  status: {
    type: String,
    enum: ["not_submitted", "pending", "approved", "rejected"],
    default: "not_submitted",
  },
  submittedAt: { type: Date, default: Date.now },
});
export default mongoose.model("KYC", kycSchema);
