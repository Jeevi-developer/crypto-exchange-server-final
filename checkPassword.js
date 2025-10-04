import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/cryptoExchange";

mongoose.connect(MONGO_URI).then(async () => {
  try {
    const user = await User.findOne({ email: "gvsivagiri@gmail.com" });
    if (!user) {
      console.log("❌  User not found");
      return;
    }

    const match = await bcrypt.compare("JEEVITHA123", user.password);
    console.log("Password match result:", match);
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    mongoose.disconnect();
  }
});
