import express from "express";
import User from "../models/User.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// Global state
let globalWithdrawalsPaused = false;

/**
 * @route   GET /api/superadmin/users
 * @desc    Get all users with filters (Superadmin only)
 */
router.get(
  "/users",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { email, kycStatus, active } = req.query;

      const filter = {};
      if (email) filter.email = { $regex: email, $options: "i" };
      if (kycStatus) filter.kycStatus = kycStatus;
      if (active) filter.active = active === "true";

      const users = await User.find(filter).select("-password");
      res.json(users);
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error fetching users", error: err.message });
    }
  }
);

/**
 * @route   PATCH /api/superadmin/kyc/:id
 * @desc    Approve/Reject KYC
 */
router.patch(
  "/kyc/:id",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { status } = req.body; // "approved" | "rejected"
      if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid KYC status" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { kycStatus: status },
        { new: true }
      ).select("-password");

      if (!user) return res.status(404).json({ message: "User not found" });

      res.json({ message: `KYC ${status}`, user });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating KYC", error: err.message });
    }
  }
);

/**
 * @route   PATCH /api/superadmin/users/:id/status
 * @desc    Suspend / Unsuspend user account
 */
router.patch(
  "/users/:id/status",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.status = user.status === "active" ? "suspended" : "active";
      await user.save();

      res.json({
        message: `User ${user.status === "active" ? "unsuspended" : "suspended"} successfully`,
        user,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error updating status", error: err.message });
    }
  }
);

/**
 * @route   POST /api/superadmin/users/:id/reset-password
 * @desc    Reset user password (random new one)
 */
router.post(
  "/users/:id/reset-password",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const newPassword = Math.random().toString(36).slice(-8); // random 8-char password
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.password = newPassword;
      await user.save();

      res.json({
        message: "Password reset successfully",
        newPassword, // ⚠️ In production, send via email instead of returning
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error resetting password", error: err.message });
    }
  }
);

/**
 * @route   POST /api/superadmin/users/:id/force-logout
 * @desc    Force logout user
 */
router.post(
  "/users/:id/force-logout",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      // You’d invalidate the user’s tokens here
      res.json({ message: "User forcefully logged out" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error forcing logout", error: err.message });
    }
  }
);

/**
 * @route   POST /api/superadmin/system/pause-withdrawals
 * @desc    Pause/Unpause all withdrawals
 */
router.post(
  "/system/pause-withdrawals",
  protect,
  requireRole("superadmin"),
  (req, res) => {
    globalWithdrawalsPaused = !globalWithdrawalsPaused;
    res.json({
      message: `Withdrawals ${globalWithdrawalsPaused ? "paused" : "resumed"}`,
      status: globalWithdrawalsPaused,
    });
  }
);

/**
 * @route   POST /api/superadmin/system/emergency-shutdown
 * @desc    Emergency shutdown of exchange
 */
router.post(
  "/system/emergency-shutdown",
  protect,
  requireRole("superadmin"),
  (req, res) => {
    // Example: halt all operations
    res.json({ message: "🚨 Exchange shutdown activated!" });
  }
);

export default router;
