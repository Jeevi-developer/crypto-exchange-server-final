import express from "express";
import Admin from "../models/Admin.js";
import User from "../models/User.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET admin dashboard (admin only)
router.get("/", protect, requireRole("admin"), async (req, res) => {
  res.json({ message: "Welcome Admin", user: req.user });
});

// GET superadmin dashboard
router.get("/super", protect, requireRole("superadmin"), async (req, res) => {
  res.json({ message: "Welcome Superadmin", user: req.user });
});

// GET all admins (superadmin only)
router.get("/list", protect, requireRole("superadmin"), async (req, res) => {
  try {
    const admins = await Admin.find().select("-password");
    res.json(admins);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// PROMOTE user to admin (superadmin only)
router.post("/promote/:id", protect, requireRole("superadmin"), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    user.role = "admin";
    await user.save();
    res.json({ message: "User promoted to admin", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// DEMOTE admin to user (superadmin only)
router.post("/demote/:id", protect, requireRole("superadmin"), async (req, res) => {
  try {
    const admin = await Admin.findById(req.params.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    admin.role = "user"; // optional, or remove from Admin collection
    await admin.save();
    res.json({ message: "Admin demoted to user", admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
