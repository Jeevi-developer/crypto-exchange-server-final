import User from "../models/User.js";

export const generateUniqueReferralCode = async () => {
  let code, exists;
  do {
    code = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6-char code
    exists = await User.findOne({ referralCode: code });
  } while (exists);
  return code;
};
