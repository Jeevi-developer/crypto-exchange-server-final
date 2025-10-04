import Wallet from "../models/Wallet.js";

// ✅ Get wallet balances & transactions
export const getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ userId: req.user.id }); // req.user from auth middleware
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }
    res.json(wallet);
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Deposit crypto
export const deposit = async (req, res) => {
  try {
    const { currency, amount } = req.body;

    if (!["BTC", "ETH", "USDT"].includes(currency)) {
      return res.status(400).json({ message: "Invalid currency" });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      wallet = new Wallet({ userId: req.user.id });
    }

    wallet.balances[currency] += amount;
    wallet.transactions.push({ type: "deposit", currency, amount });

    await wallet.save();
    res.json({ message: "Deposit successful", wallet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};

// ✅ Withdraw crypto
export const withdraw = async (req, res) => {
  try {
    const { currency, amount } = req.body;

    if (!["BTC", "ETH", "USDT"].includes(currency)) {
      return res.status(400).json({ message: "Invalid currency" });
    }

    const wallet = await Wallet.findOne({ userId: req.user.id });

    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    if (wallet.balances[currency] < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    wallet.balances[currency] -= amount;
    wallet.transactions.push({ type: "withdraw", currency, amount });

    await wallet.save();
    res.json({ message: "Withdrawal successful", wallet });
  } catch (error) {
    res.status(500).json({ message: "Server error", error });
  }
};
