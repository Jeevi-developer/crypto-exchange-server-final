// utils/sendSMSOTP.js
import twilio from 'twilio';
import dotenv from 'dotenv';
dotenv.config();

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const sendSMSOTP = async (to, otp) => {
  try {
    const message = await client.messages.create({
      body: `Your OTP code is: ${otp}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to, // format: +91xxxxxxxxxx
    });
    console.log('✅ SMS sent:', message.sid);
    return true;
  } catch (error) {
    console.error('❌ SMS send error:', error.message);
    console.error("👉 Full error:", error); // Add this to see full issue
    return false;
  }
};

export default sendSMSOTP;
