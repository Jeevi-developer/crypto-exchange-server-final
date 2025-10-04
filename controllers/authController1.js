import bcrypt from "bcryptjs";
import User from "../models/User.js";
import Admin from "../models/Admin.js";
import generateToken from "../utils/generateToken.js";
import sendEmailOTP from "../utils/sendEmailOTP.js";
import { generateUniqueReferralCode } from "../utils/generateReferralCode.js";
import ReferralHistory from "../models/ReferralHistory.js";

// 📌 REGISTER - BULLETPROOF VERSION
export const register = async (req, res) => {
  try {
    const { name, email, password, userType, referredBy } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    const referralCode = await generateUniqueReferralCode();

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password, // plain password, Mongoose will hash it
      userType: userType || "individual",
      otp,
      otpExpiry,
      referralCode,
      referredBy: referredBy || null,
    });

    // Send OTP via email
    await sendEmailOTP(cleanEmail, otp);

    res.status(201).json({
      message: "User registered successfully. Please verify your email.",
      userId: newUser._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = email.trim().toLowerCase();

    // 1️⃣ Try to find admin first
    let user = await Admin.findOne({ email: cleanEmail });
    let role = "admin";

    // 2️⃣ If not admin, try users collection
    if (!user) {
      user = await User.findOne({ email: cleanEmail });
      role = "user";
    }

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 3️⃣ Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // 4️⃣ Generate token
    const token = generateToken(user._id);

    // 5️⃣ Return consistent user object
    res.status(200).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role || role, // use DB role if exists, fallback
        kycStatus: user.kycStatus || "not_submitted",
      },
    });
  } catch (err) {
    console.error("🔥 Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// export const login = async (req, res) => {
//   const { email, password } = req.body;

//   try {
//     console.log("🔍 Incoming login attempt:", email, password);

//     const user = await User.findOne({ email });
//     if (!user) {
//       console.log("❌ No user found with email:", email);
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     console.log("✅ User found:", user.email);
//     console.log("📌 Stored hashed password:", user.password);

//     const isMatch = await bcrypt.compare(password, user.password);
//     console.log("🔑 Password match result:", isMatch);

//     if (!isMatch) {
//       return res.status(400).json({ message: "Invalid credentials" });
//     }

//     const token = generateToken(user._id);

//     res.status(200).json({
//       message: "Logged in successfully",
//       token,
//       user: {
//         id: user._id,
//         name: user.name,
//         email: user.email,
//         role: user.role,
//         kycStatus: user.kycStatus || "not_submitted",
//       },
//     });
//   } catch (err) {
//     console.error("🔥 Login error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

// 📌 VERIFY EMAIL - IMPROVED
export const verifyEmail = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanOtp = String(otp).trim();

    console.log(`🔍 Email verification attempt: ${cleanEmail}`);

    // Find user
    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Verify OTP
    if (!user.otp || String(user.otp) !== cleanOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP",
      });
    }

    // Check OTP expiry
    if (!user.otpExpiry || user.otpExpiry <= new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one.",
      });
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    const token = generateToken(user._id);

    console.log(`✅ Email verified successfully: ${cleanEmail}`);

    res.json({
      success: true,
      message: "Email verified successfully",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        referralCode: user.referralCode,
        kycStatus: user.kycStatus || "not_submitted",
        isKYCCompleted: user.isKYCCompleted || false,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified || false,
        role: user.role || "user",
        kyc: {
          isSubmitted: user.isKYCCompleted || false,
        },
      },
    });
  } catch (error) {
    console.error("❌ Email verification error:", error);
    res.status(500).json({
      success: false,
      message: "Email verification failed",
    });
  }
};

// 📌 RESEND OTP
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate new OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send email
    const emailSent = await sendEmailOTP(cleanEmail, otp);
    if (!emailSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email",
      });
    }

    res.json({
      success: true,
      message: "New OTP sent to your email",
    });
  } catch (error) {
    console.error("❌ Resend OTP error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
    });
  }
};

// 📌 GOOGLE LOGIN - IMPROVED
export const googleLogin = async (req, res) => {
  try {
    const { email, name, googleId } = req.body;

    if (!email || !name || !googleId) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google login data",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Create new Google user
      const referralCode = await generateUniqueReferralCode();

      user = await User.create({
        name: name.trim(),
        email: cleanEmail,
        password: null, // No password for Google users
        userType: "google",
        googleId,
        isKYCCompleted: false,
        isEmailVerified: true, // Google accounts are pre-verified
        isPhoneVerified: false,
        referralCode,
        kycStatus: "not_submitted",
        role: "user",
        referralCount: 0,
        referralEarnings: 0,
        referredUsers: [],
      });

      console.log(`✅ New Google user created: ${cleanEmail}`);
    } else {
      // Update existing user with Google info
      if (!user.googleId) {
        user.googleId = googleId;
        user.isEmailVerified = true;
        await user.save();
      }
      console.log(`✅ Existing Google user login: ${cleanEmail}`);
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: "Google login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        referralCode: user.referralCode,
        kycStatus: user.kycStatus || "not_submitted",
        isKYCCompleted: user.isKYCCompleted || false,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified || false,
        role: user.role || "user",
        kyc: {
          isSubmitted: user.isKYCCompleted || false,
        },
      },
    });
  } catch (error) {
    console.error("❌ Google login error:", error);
    res.status(500).json({
      success: false,
      message: "Google login failed",
    });
  }
};

// 📌 FORGOT PASSWORD
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({ email: cleanEmail });
    if (!user) {
      // Don't reveal if email exists or not
      return res.json({
        success: true,
        message: "If the email exists, you will receive a password reset link",
      });
    }

    if (!user.password) {
      return res.status(400).json({
        success: false,
        message:
          "This account was created with Google. Please use Google Sign In.",
      });
    }

    // Generate reset token
    const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
    const resetTokenExpiry = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    user.passwordResetToken = resetToken;
    user.passwordResetExpiry = resetTokenExpiry;
    await user.save();

    // Send reset email (implement sendPasswordResetEmail similar to sendEmailOTP)
    // const emailSent = await sendPasswordResetEmail(cleanEmail, resetToken);

    res.json({
      success: true,
      message: "If the email exists, you will receive a password reset link",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
    });
  }
};

// 📌 RESET PASSWORD
export const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, newPassword, confirmPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Email, reset token, and new password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await User.findOne({
      email: cleanEmail,
      passwordResetToken: resetToken,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Verify hash
    const hashVerification = await bcrypt.compare(newPassword, hashedPassword);
    if (!hashVerification) {
      return res.status(500).json({
        success: false,
        message: "Password processing failed",
      });
    }

    // Update password and clear reset token
    user.password = hashedPassword;
    console.log("Hashed password:", hashedPassword);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    await user.save();

    console.log(`✅ Password reset successful: ${cleanEmail}`);

    res.json({
      success: true,
      message:
        "Password reset successful. You can now login with your new password.",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Password reset failed",
    });
  }
};

// 📌 GET PROFILE
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select(
      "-password -otp -otpExpiry -passwordResetToken -passwordResetExpiry"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("❌ Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch profile",
    });
  }
};

// 📌 CHANGE PASSWORD (for logged in users)
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user || !user.password) {
      return res.status(400).json({
        success: false,
        message: "Invalid user",
      });
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Verify hash
    const hashVerification = await bcrypt.compare(newPassword, hashedPassword);
    if (!hashVerification) {
      return res.status(500).json({
        success: false,
        message: "Password processing failed",
      });
    }

    user.password = hashedPassword;
    await user.save();

    console.log(`✅ Password changed successfully: ${user.email}`);

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to change password",
    });
  }
};

// 📌 SUBMIT KYC
export const submitKYC = async (req, res) => {
  try {
    const { kycData } = req.body;

    if (!kycData) {
      return res.status(400).json({
        success: false,
        message: "KYC data is required",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.kycData = kycData;
    user.isKYCCompleted = true;
    user.kycStatus = "pending"; // ✅ match your enum
    await user.save();

    res.json({
      success: true,
      message: "KYC submitted successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        referralCode: user.referralCode,
        kycStatus: user.kycStatus, // now "pending"
        isKYCCompleted: user.isKYCCompleted,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role,
        kyc: {
          isSubmitted: user.isKYCCompleted,
        },
      },
    });
  } catch (error) {
    console.error("❌ Submit KYC error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to submit KYC",
    });
  }
};

// GET current logged-in user
export const getMe = async (req, res) => {
  try {
    const userId = req.user.id;

    let user = await Admin.findById(userId).select("-password");
    if (user) {
      return res.status(200).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: "admin", // must explicitly set
        kycStatus: user.kycStatus || "not_submitted",
      });
    }

    user = await User.findById(userId).select("-password");
    if (user) {
      return res.status(200).json({
        id: user._id,
        name: user.name,
        email: user.email,
        role: "user",
        kycStatus: user.kycStatus || "not_submitted",
      });
    }

    return res.status(404).json({ message: "User not found" });
  } catch (err) {
    console.error("🔥 /auth/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// 📌 UPDATE PROFILE
export const updateProfile = async (req, res) => {
  try {
    const { name, email, userType } = req.body;

    const user = await User.findById(req.user.id);
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    if (name) user.name = name.trim();
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existingEmailUser = await User.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      });
      if (existingEmailUser) {
        return res
          .status(400)
          .json({ success: false, message: "Email already in use" });
      }
      user.email = cleanEmail;
      user.isEmailVerified = false; // force re-verification if email changes
    }
    if (userType) user.userType = userType;

    await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        userType: user.userType,
        referralCode: user.referralCode,
        kycStatus: user.kycStatus,
        isKYCCompleted: user.isKYCCompleted,
        isEmailVerified: user.isEmailVerified,
        isPhoneVerified: user.isPhoneVerified,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update profile" });
  }
};

// GET referral history - using existing User schema
export const getHistory = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Find all users referred by the current user
    const currentUser = await User.findById(req.user.id);
    if (!currentUser || !currentUser.referralCode) {
      return res.json({
        history: [],
        pagination: {
          current: 1,
          pages: 0,
          total: 0,
          hasNext: false,
          hasPrev: false,
        },
      });
    }

    // Get users who were referred by current user
    const referredUsers = await User.find({
      referredBy: currentUser.referralCode,
    })
      .select("name email referralCode createdAt depositedValue")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      referredBy: currentUser.referralCode,
    });

    // Calculate commission rate based on current user's referral count
    const getCommissionRate = (count) => {
      if (count >= 100) return 35;
      if (count >= 51) return 25;
      if (count >= 11) return 15;
      return 10;
    };

    const commissionRate = getCommissionRate(currentUser.referralCount);

    // Format history data
    const formattedHistory = referredUsers.map((user) => {
      // Calculate commission based on user's deposited value or a fixed amount
      const baseAmount = user.depositedValue || 1000; // Default base for commission calculation
      const commissionAmount = (baseAmount * commissionRate) / 100;

      return {
        _id: user._id,
        action: "registration", // Since we're tracking user registrations
        user: user.name || user.email || "Unknown User",
        referralCode: user.referralCode || "N/A",
        status: user.depositedValue > 0 ? "completed" : "pending",
        amount: commissionAmount,
        date: user.createdAt,
        details: {
          originalAmount: baseAmount,
          commissionRate: commissionRate,
          transactionId: `REF_${user._id}`,
          depositedValue: user.depositedValue || 0,
        },
      };
    });

    res.json({
      history: formattedHistory,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching referral history:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET referral statistics
export const getReferralStats = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get referred users
    const referredUsers = await User.find({
      referredBy: currentUser.referralCode,
    }).select("depositedValue createdAt");

    // Calculate various statistics
    const totalReferrals = referredUsers.length;
    const activeReferrals = referredUsers.filter(
      (user) => user.depositedValue > 0
    ).length;

    // Calculate monthly referrals
    const currentMonth = new Date();
    const startOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    );
    const monthlyReferrals = referredUsers.filter(
      (user) => user.createdAt >= startOfMonth
    ).length;

    // Calculate commission rate
    const getCommissionRate = (count) => {
      if (count >= 100) return 35;
      if (count >= 51) return 25;
      if (count >= 11) return 15;
      return 10;
    };

    const commissionRate = getCommissionRate(totalReferrals);

    // Calculate estimated pending earnings
    const pendingUsers = referredUsers.filter(
      (user) => user.depositedValue === 0
    );
    const pendingEarnings =
      pendingUsers.length * ((1000 * commissionRate) / 100); // Assuming 1000 as base amount

    res.json({
      totalEarnings: currentUser.referralEarnings || 0,
      totalReferrals: totalReferrals,
      activeReferrals: activeReferrals,
      pendingEarnings: pendingEarnings,
      monthlyReferrals: monthlyReferrals,
      commissionRate: commissionRate,
      recentActivity: referredUsers.slice(0, 5).map((user) => ({
        action: "registration",
        user: user.name || user.email || "Unknown",
        amount: (user.depositedValue * commissionRate) / 100,
        status: user.depositedValue > 0 ? "completed" : "pending",
        date: user.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error fetching referral stats:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Helper function to process referral when user makes deposit/trade
export const processReferralCommission = async (userId, action, amount) => {
  try {
    // Find the user who performed the action
    const user = await User.findById(userId);
    if (!user || !user.referredBy) {
      return null; // No referrer
    }

    // Find the referrer
    const referrer = await User.findOne({ referralCode: user.referredBy });
    if (!referrer) {
      return null; // Referrer not found
    }

    // Calculate commission
    const getCommissionRate = (count) => {
      if (count >= 100) return 35;
      if (count >= 51) return 25;
      if (count >= 11) return 15;
      return 10;
    };

    const rate = getCommissionRate(referrer.referralCount);
    const commissionAmount = (amount * rate) / 100;

    // Update referrer's earnings and balance
    await User.findByIdAndUpdate(referrer._id, {
      $inc: {
        referralEarnings: commissionAmount,
        "balance.inr": commissionAmount,
      },
    });

    console.log(
      `Referral commission processed: ₹${commissionAmount} for ${referrer.email}`
    );
    return { referrerId: referrer._id, amount: commissionAmount, rate };
  } catch (error) {
    console.error("Error processing referral commission:", error);
    throw error;
  }
};

// Update user referral count when someone registers with their code
export const updateReferralCount = async (referralCode, newUserId) => {
  try {
    const referrer = await User.findOne({ referralCode });
    if (referrer) {
      await User.findByIdAndUpdate(referrer._id, {
        $inc: { referralCount: 1 },
        $push: { referredUsers: newUserId },
      });
      console.log(`Referral count updated for ${referrer.email}`);
    }
  } catch (error) {
    console.error("Error updating referral count:", error);
  }
};
