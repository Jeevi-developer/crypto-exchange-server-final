export const processDeposit = async (req, res) => {
  try {
    const { amount } = req.body;
    const userId = req.user.id;
    
    // Process the deposit
    await User.findByIdAndUpdate(userId, {
      $inc: { 
        depositedValue: amount,
        'balance.inr': amount 
      }
    });

    // Process referral commission
    await processReferralCommission(userId, 'deposit', amount);

    res.json({ message: 'Deposit successful', amount });
  } catch (error) {
    console.error("Deposit error:", error);
    res.status(500).json({ message: "Deposit failed" });
  }
};

// Example: In your registration controller
export const register = async (req, res) => {
  try {
    const { name, email, password, referralCode } = req.body;
    
    // Create user
    const user = new User({
      name,
      email,
      password,
      referredBy: referralCode || null,
      referralCode: generateUniqueCode(), // Your function to generate unique codes
    });

    await user.save();

    // Update referrer's count if referred
    if (referralCode) {
      await updateReferralCount(referralCode, user._id);
    }

    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Registration failed" });
  }
};