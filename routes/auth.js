import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import Superadmin from "../models/SuperAdmin.js";
import { protect } from "../middleware/auth.js";
import { sendOTP } from "../utils/brevoMail.js"; // central BREVO utility
import sendResetMail from "../utils/sendResetMail.js";
import {
  forgotPassword,
  resetPassword,
  register,
  verifyEmail,
} from "../controllers/authController.js";

const router = express.Router();

// Helper to create token and return safe user object
function createTokenAndPayload(doc, role) {
  // doc may be a mongoose doc or plain object
  const id = doc._id ? doc._id.toString() : doc.id;
  const payload = {
    id,
    role: role || doc.role || "user",
  };
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: "7d",
  });

  // Build a safe user object to return (no password)
  const safeUser = {
    _id: id,
    name: doc.name || doc.fullName || null,
    email: doc.email,
    role: payload.role,
    // add other safe fields if needed
  };
  return { token, user: safeUser };
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, userType, referredBy } = req.body;

    // 1. Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    let finalReferredBy = referredBy;
    let refSource = null; // track who referred (user or superadmin)

    // 2. If no referral code → default to superadmin
    if (!referredBy) {
      const superadmin = await Superadmin.findOne({});
      if (!superadmin)
        return res.status(500).json({ message: "Superadmin not found" });

      finalReferredBy = superadmin.referralCode;
      refSource = { type: "superadmin", doc: superadmin };
    } else {
      // 3. Validate referral code
      const refUser = await User.findOne({ referralCode: referredBy });
      const refSuperadmin = await Superadmin.findOne({
        referralCode: referredBy,
      });

      if (!refUser && !refSuperadmin)
        return res.status(400).json({ message: "Invalid referral code" });

      if (refUser) refSource = { type: "user", doc: refUser };
      else refSource = { type: "superadmin", doc: refSuperadmin };
    }

    // 4. Hash password
    // const hashedPassword = await bcrypt.hash(password, 10);

    // 5. Generate OTP (6-digit)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // valid 10 minutes

    // 6. Create new user
    const newUser = new User({
      name,
      email,
      // password: hashedPassword,
      password, // plain → will be hashed automatically by the pre('save') hook
      userType,
      referredBy: finalReferredBy,
      otp,
      otpExpiry,
      isVerified: false, // make sure your schema has this
    });

    await newUser.save();

    // 7. Update referral stats
    if (refSource) {
      refSource.doc.referralCount += 1;
      refSource.doc.referredUsers.push(newUser._id);
      await refSource.doc.save();
    }

    // 8. Send OTP via BREVO
    const mailSent = await sendOTP(email, otp, 10);
    if (!mailSent) {
      console.warn("OTP email could not be sent to", email);
    }

    res.status(201).json({
      message: "Registered successfully. OTP sent to email.",
    });
  } catch (err) {
    console.error("Register Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// LOGIN ROUTE WITH DEBUG
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // 🔹 Fetch user with password field explicitly
    const user = await User.findOne({ email }).select("+password");

    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    // 🔹 Debug logs
    console.log("🔹 User login attempt:", email);
    console.log("Stored hashed password:", user.password);

    // 🔹 Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match result:", isMatch);

    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🔹 Generate token payload
    const payload = { id: user._id.toString(), role: user.role || "user" };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    const safeUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: payload.role,
    };

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/verify-email", verifyEmail);

// GET CURRENT USER
router.get("/me", protect, (req, res) => {
  // req.user was set by protect middleware
  const u = req.user;
  if (!u.role) u.role = "user";
  res.json(u);
});

// 🔹 Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // 🔹 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // 🔹 Generate password reset token
    const rawToken = crypto.randomBytes(20).toString("hex"); // raw
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex"); // hashed

    const passwordResetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save to DB
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.passwordResetToken = hashedToken;
    user.passwordResetExpiry = passwordResetExpiry;
    await user.save();

    // 🔹 Send reset email
    const frontendUrl = process.env.FRONTEND_URL;
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    const emailSent = await sendResetMail(user.email, resetLink);

    // Log tokens for debugging
    console.log("📌 Forgot Password Debug:");
    console.log("User email:", email);
    console.log("OTP:", otp, "Expires at:", otpExpiry);
    console.log("Raw token (email link):", rawToken);
    console.log("Hashed token (DB):", hashedToken);
    console.log("Token expiry:", passwordResetExpiry);

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send reset email. Check your email configuration.",
      });
    }

    res.json({ message: "OTP and password reset link sent to your email" });
  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// 🔹 Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password, confirmPassword } = req.body;

    console.log("📌 Reset Password Debug:");
    console.log("Token from request:", token);

    if (!token) return res.status(400).json({ message: "Missing token" });
    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "Password fields are required" });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    // 🔹 Hash token to find user
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");
    console.log("Hashed token:", hashedToken);

    // 🔹 Find user with token and valid expiry
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: Date.now() },
    }).select("+password");

    if (!user) {
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });
    }

    console.log("User email:", user.email);

    // 🔹 Assign plain password — let pre('save') handle hashing
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpiry = undefined;
    user.otp = undefined;
    user.otpExpiry = undefined;

    await user.save();

    // 🔹 Debug the stored password after save
    const freshUser = await User.findById(user._id).select("+password");
    console.log("Updated hashed password in DB:", freshUser.password);

    res
      .status(200)
      .json({ message: "Password reset successful. You can now log in." });
  } catch (err) {
    console.error("❌ Reset Password Error:", err);
    res
      .status(500)
      .json({ message: "Something went wrong", error: err.message });
  }
});

// router.get("/debug/check-password", async (req, res) => {
//   try {
//     const user = await User.findOne({ email: "gvsivagiri@gmail.com" });
//     if (!user) return res.status(404).json({ message: "User not found" });

//     const isMatch = await bcrypt.compare("JEEVITHA789", user.password); // your new password
//     res.json({ match: isMatch });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

export default router;
