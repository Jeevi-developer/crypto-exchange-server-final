import { sendOTP } from "./brevoMail.js"; // adjust path if needed

const sendEmailOTP = async (toEmail, otp) => {
  try {
    const emailSent = await sendOTP(toEmail, otp, 5); // expiry 5 minutes
    if (!emailSent) {
      console.log(`⚠️ OTP fallback (dev mode): ${otp}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("📩 Email OTP ERROR:", error);
    console.log(`⚠️ OTP fallback (dev mode): ${otp}`);
    return false;
  }
};

export default sendEmailOTP;
