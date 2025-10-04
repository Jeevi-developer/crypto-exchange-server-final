// resetSingleUserPassword.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "./models/User.js";

const MONGO_URI = "mongodb://127.0.0.1:27017/cryptoExchange";

async function run() {
  await mongoose.connect(MONGO_URI);

  const email = "gvsivagiri@gmail.com";      // ✅ change to your user
  const plainPassword = "JEEVITHA@123";      // ✅ new password

  const user = await User.findOne({ email });
  if (!user) {
    console.log("User not found");
    return mongoose.disconnect();
  }

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  // ✅ Direct DB update bypasses pre-save hook
  await User.updateOne({ _id: user._id }, { $set: { password: hashedPassword } });

  console.log(`✅ Password reset to: ${plainPassword} for ${email}`);
  mongoose.disconnect();
}

run();
