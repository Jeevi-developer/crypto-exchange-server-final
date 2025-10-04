import express from "express";
import multer from "multer";
import { submitKYC } from "../controllers/kycController.js";
import { protect } from "../middleware/protect.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/kyc/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

router.post("/submit", protect, upload.single("selfie"), submitKYC);

export default router;
