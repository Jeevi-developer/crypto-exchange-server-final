import User from "../models/User.js";

export const updateBankDetails = async (req, res) => {
  try {
    const userId = req.user.id; // from your auth middleware
    const { accountNumber, ifsc } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { bankDetails: { accountNumber, ifsc } },
      { new: true }
    );

    res.status(200).json(user.bankDetails);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update bank details" });
  }
};

export const depositINR = async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: "Invalid amount" });

    const user = await User.findById(userId);

    user.balance.inr = (user.balance.inr || 0) + amount;
    await user.save();

    res.status(200).json({ balance: user.balance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Deposit failed" });
  }
};

export const listUsers = async (req, res) => {
  try {
    // Fetch only normal users
    const users = await User.find({ role: "user" }, "name depositedValue kycId")
      .populate({
        path: "kycId",
        select: "country", // only fetch country from KYC
      })
      .lean(); // convert to plain JS object

    // Map the data
    const formatted = users.map(u => ({
      name: u.name,
      depositedValue: u.depositedValue ?? 0,               // from User schema
      country: u.kycId?.country || "Not Submitted",       // from KYC schema
    }));

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error" });
  }
};
