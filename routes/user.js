import express from "express";
import {
  updateBankDetails,
  depositINR,
  listUsers,
} from "../controllers/userController.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/bank", protect, updateBankDetails);

router.post("/deposit", protect, depositINR);

// GET all users with selected fields
router.get("/", async (req, res) => {
  try {
    const users = await User.find({}, "name country depositedValue") // select only needed fields
      .sort({ createdAt: -1 }); // optional: newest first
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Get total users count
router.get("/count", async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.get("/list", async (req, res) => {
  try {
    const users = await User.find(
      { role: "user" },
      "name depositedValue country kycId"
    )
      .populate({
        path: "kycId",
        select: "country", // fetch country from KYC
      })
      .sort({ createdAt: -1 })
      .lean();

    const formatted = users.map((u) => ({
      name: u.name,
      // ✅ First try KYC country, then User country, else "Unknown"
      country: u.kycId?.country || u.country || "Unknown",
      depositedValue: u.depositedValue ?? 0,
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

// Only superadmin can create admins
export default router;
