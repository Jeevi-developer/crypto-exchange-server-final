import User from "../models/User.js";
import ReferralHistory from "../models/ReferralHistory.js";

export const processReferralCommission = async (referredUserId, action, originalAmount) => {
  try {
    // Find the referred user
    const referredUser = await User.findById(referredUserId);
    if (!referredUser || !referredUser.referredBy) {
      return null; // No referrer
    }

    // Find the referrer
    const referrer = await User.findOne({ referralCode: referredUser.referredBy });
    if (!referrer) {
      return null; // Referrer not found
    }

    // Calculate commission rate based on referrer's level
    const getCommissionRate = (referralCount) => {
      if (referralCount >= 100) return 35;
      if (referralCount >= 51) return 25;
      if (referralCount >= 11) return 15;
      return 10;
    };

    const rate = getCommissionRate(referrer.referralCount);
    const commissionAmount = (originalAmount * rate) / 100;

    // Create referral history entry
    const entry = new ReferralHistory({
      userId: referrer._id,
      referredUserId: referredUser._id,
      action,
      amount: commissionAmount,
      status: 'completed',
      details: {
        originalAmount,
        commissionRate: rate,
        transactionId: `TXN_${Date.now()}`,
      }
    });

    await entry.save();

    // Update referrer's earnings
    await User.findByIdAndUpdate(referrer._id, {
      $inc: { 
        referralEarnings: commissionAmount,
        'balance.inr': commissionAmount // Add to INR balance
      }
    });

    console.log(`Referral commission processed: ₹${commissionAmount} for ${referrer.email}`);
    return entry;

  } catch (error) {
    console.error("Error processing referral commission:", error);
    throw error;
  }
};

// Example usage in your trading/deposit controllers:
/*
import { processReferralCommission } from "../utils/referralHelper.js";

// In your trading fee controller
export const processTrade = async (req, res) => {
  // ... your trading logic
  
  const tradingFee = 100; // example fee
  const userId = req.user.id;
  
  // Process referral commission
  await processReferralCommission(userId, 'trading_fee', tradingFee);
  
  // ... rest of your logic
};
*/