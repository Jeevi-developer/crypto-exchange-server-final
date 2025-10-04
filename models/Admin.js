import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, default: "admin" } // admin or superadmin
});

// Explicit collection name "admins" matches your existing DB.
export default mongoose.model("Admin", adminSchema, "admins");
