import express from "express";
import User from "../models/User.js";
import { protect, requireRole } from "../middleware/auth.js";

const router = express.Router();

// GET /api/users - list users (admin or superadmin)
router.get("/", protect, requireRole(["admin","superadmin"]), async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error("List users error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// DELETE /api/users/:id - delete a user (admin or superadmin)
router.delete("/:id", protect, requireRole(["admin","superadmin"]), async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Delete user error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PUT /api/users/:id/role - change user role (superadmin only)
router.put("/:id/role", protect, requireRole("superadmin"), async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "Role is required" });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Role updated", user });
  } catch (err) {
    console.error("Change role error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
