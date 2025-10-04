import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
dotenv.config();

const client = SibApiV3Sdk.ApiClient.instance;
const apiKey = client.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

/**
 * Send a transactional email using BREVO
 * @param {string} toEmail - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} htmlContent - HTML content of the email
 * @param {string} senderName - Optional sender name (default: 'Coindexin')
 * @returns {Promise<boolean>} - true if sent successfully, false otherwise
 */
export const sendEmail = async (
  toEmail,
  subject,
  htmlContent,
  senderName = "Coindexin"
) => {
  const email = {
    sender: { email: process.env.SENDER_EMAIL, name: senderName },
    to: [{ email: toEmail }],
    subject,
    htmlContent,
  };

  try {
    console.log(`📧 Sending email to ${toEmail} | Subject: ${subject}`);
    const result = await apiInstance.sendTransacEmail(email);
    console.log("📩 Email sent:", result);
    return true;
  } catch (error) {
    console.error(
      "📩 Email ERROR:",
      error.response?.body || error.message || error
    );
    return false;
  }
};

/**
 * Send OTP email
 * @param {string} toEmail
 * @param {string} otp
 * @param {number} expiryMinutes
 */
export const sendOTP = async (toEmail, otp, expiryMinutes = 5) => {
  const htmlContent = `
    <p>Your OTP is <strong>${otp}</strong>.</p>
    <p>It expires in ${expiryMinutes} minutes.</p>
  `;
  return await sendEmail(toEmail, "Your OTP Verification Code", htmlContent);
};

/**
 * Send Password Reset email
 * @param {string} toEmail
 * @param {string} resetLink
 * @param {number} expiryMinutes
 */
export const sendResetPassword = async (
  toEmail,
  resetLink,
  expiryMinutes = 30
) => {
  const htmlContent = `
    <h3>Password Reset Request</h3>
    <p>You requested to reset your password. Click the link below:</p>
    <a href="${resetLink}">${resetLink}</a>
    <p>This link will expire in ${expiryMinutes} minutes.</p>
    <p>If you did not request this, please ignore this email.</p>
  `;
  return await sendEmail(toEmail, "Reset Your Password", htmlContent);
};
