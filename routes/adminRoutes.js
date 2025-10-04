import express from "express";
import axios from "axios";
import User from "../models/User.js";
import Staking from "../models/Staking.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

/**
 * @route   POST /api/admins/create
 * @desc    Create a new admin (Superadmin only)
 */

// Get live coin price (CoinGecko)
async function getCoinPrice(currency) {
  if (currency === "inr") return 1; // INR is fixed
  try {
    const response = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${currency}&vs_currencies=inr`
    );
    return response.data[currency]?.inr || 0;
  } catch (err) {
    console.error("Coin price fetch failed:", err.message);
    throw new Error("Failed to fetch live coin price");
  }
}

router.post(
  "/create",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const {
        name,
        email,
        password,
        role = "admin",
        permissions = {},
      } = req.body;

      if (!["admin", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      const existing = await User.findOne({ email });
      if (existing) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const newAdmin = new User({
        name,
        email,
        password,
        role,
        permissions,
      });

      await newAdmin.save();

      res.status(201).json({
        message: `${role} created successfully`,
        user: {
          _id: newAdmin._id,
          name: newAdmin.name,
          email: newAdmin.email,
          role: newAdmin.role,
        },
      });
    } catch (err) {
      console.error("Create admin error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   GET /api/admins
 * @desc    List all admins (Admin + Superadmin)
 */
router.get(
  "/",
  protect,
  requireRole(["admin", "superadmin"]),
  async (req, res) => {
    try {
      const admins = await User.find({
        role: { $in: ["admin", "superadmin"] },
      }).select("-password");
      res.json(admins);
    } catch (err) {
      console.error("List admins error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * @route   PATCH /api/admins/role/:id
 * @desc    Change user role (Superadmin only)
 */
router.patch(
  "/role/:id",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const { role } = req.body;

      if (!["user", "admin", "superadmin"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      if (req.params.id === String(req.user._id) && role !== "superadmin") {
        return res.status(400).json({ message: "You cannot demote yourself" });
      }

      const user = await User.findByIdAndUpdate(
        req.params.id,
        { role },
        { new: true }
      ).select("-password");

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Role updated successfully", user });
    } catch (err) {
      console.error("Change role error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.patch(
  "/wallet-lock/:id",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.walletLocked = !user.walletLocked; // toggle
      await user.save();

      res.json({
        message: `Wallet ${
          user.walletLocked ? "locked" : "unlocked"
        } successfully`,
        user,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error toggling wallet lock", error: err.message });
    }
  }
);

// ✅ Foreclose staking (Superadmin only)
router.patch(
  "/staking-foreclose/:id",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      const staking = await Staking.findById(req.params.id).populate("user");
      if (!staking)
        return res.status(404).json({ message: "Staking record not found" });
      if (staking.status !== "active")
        return res
          .status(400)
          .json({ message: "Staking already closed or completed" });

      const user = staking.user;

      // Get live coin price
      const priceInINR = await getCoinPrice(staking.currency);

      // Refund = staked amount × live INR price
      const refundAmountINR = staking.amount * priceInINR;

      // Credit INR wallet
      user.balance.inr += refundAmountINR;
      await user.save();

      // Mark staking as foreclosed
      staking.status = "foreclosed";
      await staking.save();

      res.json({
        message: "Staking foreclosed successfully",
        currency: staking.currency,
        stakedAmount: staking.amount,
        currentPrice: priceInINR,
        refundAmountINR,
        userBalance: user.balance.inr,
      });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Error foreclosing staking", error: err.message });
    }
  }
);

/**
 * @route   DELETE /api/admins/:id
 * @desc    Revoke admin (Superadmin only)
 */
router.delete(
  "/:id",
  protect,
  requireRole("superadmin"),
  async (req, res) => {
    try {
      if (req.params.id === String(req.user._id)) {
        return res.status(400).json({ message: "You cannot delete yourself" });
      }

      const deleted = await User.findByIdAndDelete(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Admin revoked successfully" });
    } catch (err) {
      console.error("Revoke admin error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
