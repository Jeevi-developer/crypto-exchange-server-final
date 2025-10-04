import Admin from "../models/Admin.js";
import bcrypt from "bcryptjs";

// Example helper used by seed script or other controllers if you want to create admins programmatically.
export const createAdmin = async ({ email, password, name, role = "admin" }) => {
  const existing = await Admin.findOne({ email });
  if (existing) return existing;
  const hashed = await bcrypt.hash(password, 10);
  const admin = await Admin.create({ email, password: hashed, name, role });
  return admin;
};
