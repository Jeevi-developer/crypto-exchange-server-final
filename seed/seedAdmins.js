import dotenv from "dotenv";
dotenv.config();
import { connectDB } from "../config/db.js";
import { createAdmin } from "../controllers/createAdmin.js";

const run = async () => {
  await connectDB();
  // WARNING: This script does NOT drop collections. It creates if not exists.
  const adminsToCreate = [
    { email: "superadmin@cdex.com", password: "SuperPassword123", name: "Super Admin", role: "superadmin" },
    { email: "admin@cdex.com", password: "AdminPassword123", name: "Admin User", role: "admin" }
  ];
  for (const a of adminsToCreate) {
    const adm = await createAdmin(a);
    console.log("Admin created/exists:", adm.email, adm.role);
  }
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
