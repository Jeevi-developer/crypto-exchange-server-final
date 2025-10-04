import express from "express";
import User from "../models/User.js";
import sendSMSOTP from '../utils/sendSMSOTP.js';

const router = express.Router();

// Simulate in-memory OTP store (use DB in real case)
const phoneOtpStore = new Map();

// Send mobile OTP
router.post("/send-sms-otp", async (req, res) => {
  const { email, mobile } = req.body;

  if (!email || !mobile) {
    return res.status(400).json({ message: "Email and mobile are required" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  phoneOtpStore.set(mobile, { otp, expires: Date.now() + 5 * 60 * 1000 });

  const user = await User.findOneAndUpdate(
    { email },
    { mobile },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  const sent = await sendSMSOTP(mobile, otp);
  if (!sent) return res.status(500).json({ message: "Failed to send SMS OTP" });

  res.json({ success: true, message: "OTP sent to mobile" });
});

// 2. Verify OTP
router.post("/verify-phone", async (req, res) => {
  const { email, mobile, otp } = req.body;
  if (!email || !mobile || !otp) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const record = phoneOtpStore.get(mobile);
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid or expired OTP" });
  }

  const user = await User.findOneAndUpdate(
    { email },
    { isPhoneVerified: true },
    { new: true }
  );

  if (!user) return res.status(404).json({ message: "User not found" });

  phoneOtpStore.delete(mobile);

  res.json({ success: true, message: "Phone verified successfully" });
});

export default router;
