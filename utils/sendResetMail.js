import { sendResetPassword } from "./brevoMail.js";

const sendResetMail = async (toEmail, resetLink) => {
  try {
    const emailSent = await sendResetPassword(toEmail, resetLink, 30);
    if (!emailSent) {
      console.log(`⚠️ RESET LINK (dev mode): ${resetLink}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("📩 Password Reset Email ERROR:", error);
    console.log(`⚠️ RESET LINK (dev mode): ${resetLink}`);
    return false;
  }
};

export default sendResetMail;
