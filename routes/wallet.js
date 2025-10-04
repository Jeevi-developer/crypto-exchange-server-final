import express from "express";
import Wallet from "../models/Wallet.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// 📌 Get wallet balances
router.get("/", protect, async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet.toObject());
  } catch (err) {
    res.status(500).json({ message: "Error fetching wallet", error: err.message });
  }
});

// 📌 Mock deposit
router.post("/deposit/mock", protect, async (req, res) => {
  try {
    const { asset, amount } = req.body;
    if (!["BTC", "ETH", "USDT"].includes(asset)) {
      return res.status(400).json({ message: "Invalid asset" });
    }

    const wallet = await Wallet.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { [`balances.${asset}`]: amount } },
      { new: true, upsert: true }
    );

    res.json(wallet.toObject());
  } catch (err) {
    res.status(500).json({ message: "Error depositing", error: err.message });
  }
});

// 📌 Withdraw
router.post("/withdraw", protect, async (req, res) => {
  try {
    const { asset, amount } = req.body;
    if (!["BTC", "ETH", "USDT"].includes(asset)) {
      return res.status(400).json({ message: "Invalid asset" });
    }

    const wallet = await Wallet.findOne({ userId: req.user._id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    if (wallet.balances[asset] < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balances[asset] -= amount;
    await wallet.save();

    res.json(wallet.toObject());
  } catch (err) {
    res.status(500).json({ message: "Error withdrawing", error: err.message });
  }
});

export default router;
