import mongoose from "mongoose";

const MONGO_URI = "mongodb://127.0.0.1:27017/cryptoExchange"; // change db name

// ✅ Existing users collection
const userSchema = new mongoose.Schema(
  {},
  { strict: false, collection: "users" }
);
const User = mongoose.model("User", userSchema);

// ✅ New combined adminUsers collection
const adminUserSchema = new mongoose.Schema(
  {},
  { strict: false, collection: "adminUsers" }
);
const AdminUser = mongoose.model("AdminUser", adminUserSchema);

async function migrate() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // 1️⃣ Find all admins and superadmins
    const adminUsers = await User.find({
      role: { $in: ["admin", "superadmin"] },
    });
    console.log("Found:", adminUsers.length, "docs");

    if (adminUsers.length > 0) {
      await AdminUser.insertMany(adminUsers.map((u) => u.toObject()));
      console.log("Inserted into adminUsers collection");
    } else {
      console.log("⚠️ No admins/superadmins found in users collection");
    }

    // 2️⃣ (Optional) Remove them from `users` collection
    // await User.deleteMany({ role: { $in: ["admin", "superadmin"] } });
    // console.log("✅ Removed admins & superadmins from users collection");

    await mongoose.disconnect();
    console.log("✅ Migration complete & MongoDB disconnected");
  } catch (err) {
    console.error("❌ Migration failed:", err);
    mongoose.disconnect();
  }
}

migrate();
