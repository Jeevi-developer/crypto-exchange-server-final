import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Generic function to send email
 * @param {string} toEmail
 * @param {string} subject
 * @param {string} htmlContent
 * @param {string} senderName
 */
const sendEmail = async (toEmail, subject, htmlContent, senderName = "Coindexin") => {
  const email = new SibApiV3Sdk.SendSmtpEmail({
    sender: { email: process.env.BREVO_SENDER_EMAIL, name: senderName },
    to: [{ email: toEmail }],
    subject,
    htmlContent,
  });

  try {
    const result = await apiInstance.sendTransacEmail(email);
    console.log(`📩 Email sent to ${toEmail}:`, result);
    return true;
  } catch (err) {
    console.error("📩 Email ERROR:", err.response?.body || err.message || err);
    return false;
  }
};

/**
 * Send OTP email
 */
export const sendOTP = async (toEmail, otp, expiryMinutes = 5) => {
  const htmlContent = `
    <p>Your OTP is <strong>${otp}</strong>.</p>
    <p>It will expire in ${expiryMinutes} minutes.</p>
  `;
  return await sendEmail(toEmail, "Your OTP Verification Code", htmlContent);
};

/**
 * Send Password Reset email
 */
export const sendResetPassword = async (toEmail, resetLink, expiryMinutes = 30) => {
  const htmlContent = `
    <h3>Password Reset Request</h3>
    <p>You requested to reset your password. Click the link below:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link will expire in ${expiryMinutes} minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return await sendEmail(toEmail, "Reset Your Password", htmlContent);
};
