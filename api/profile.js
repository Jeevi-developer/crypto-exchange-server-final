import express from "express";
import { verifyToken } from "../middleware/auth.js";
import User from "../models/User.js";
import KYC from "../models/KYC.js";
import Bank from "../models/Bank.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("name email phone role");
    const kyc = await KYC.findOne({ user: req.user._id }).select("status submittedAt");
    const bank = await Bank.findOne({ user: req.user._id });

    res.json({
      name: user.name,
      email: maskEmail(user.email),
      phone: maskPhone(user.phone),
      kycStatus: kyc?.status || "not_submitted",
      bankLinked: !!bank,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function maskEmail(email) {
  const [name, domain] = email.split("@");
  return `${name[0]}${"*".repeat(name.length - 2)}${name.slice(-1)}@${domain}`;
}

function maskPhone(phone) {
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}

export default router;