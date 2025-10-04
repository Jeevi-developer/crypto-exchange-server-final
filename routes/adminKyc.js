// routes/adminKyc.js
import express from "express";
import KYC from "../models/KYC.js";
import User from "../models/User.js";
import { verifyAdmin } from "../middleware/adminMiddleware.js"; // middleware for admin auth

const router = express.Router();

// Approve/Reject KYC
router.put("/:kycId/status", verifyAdmin, async (req, res) => {
  try {
    const { status } = req.body; // "approved" or "rejected"
    const kyc = await KYC.findById(req.params.kycId);

    if (!kyc) return res.status(404).json({ error: "KYC not found" });

    // Update KYC status
    kyc.status = status;
    await kyc.save();

    // Update User's kycStatus
    await User.findByIdAndUpdate(kyc.user, { kycStatus: status });

    res.json({ message: `KYC ${status} successfully.` });
  } catch (error) {
    console.error("KYC update failed:", error);
    res.status(500).json({ error: "Failed to update KYC status" });
  }
});

export default router;
