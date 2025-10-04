import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/cryptoExchange";

mongoose.connect(MONGO_URI).then(async () => {
  try {
    const plainPassword = "Admin@123"; // new password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const result = await Admin.updateOne(
      { email: "admin@cdex.com" },
      { $set: { password: hashedPassword } }
    );

    console.log("✅ Admin password reset result:", result);
  } catch (err) {
    console.error("❌ Error resetting password:", err);
  } finally {
    mongoose.disconnect();
  }
});
