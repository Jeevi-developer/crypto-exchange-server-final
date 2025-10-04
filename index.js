import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import crypto from "crypto";
import { protect } from "./middleware/protect.js"; // ✅ named import

// 🔹 Load correct env file at the very top
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.development";
dotenv.config({ path: envFile });

console.log("✅ Loaded env:", envFile);
console.log("Frontend URL:", process.env.FRONTEND_URL);

const app = express();
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;

// 🔹 Connect DB and start server
connectDB().then(async () => {
  const { default: User } = await import("./models/User.js");
  const { default: authRoutes } = await import("./routes/auth.js");
  // ... rest of your route imports

  app.use("/api/auth", authRoutes);
  // ... rest of your routes

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});
