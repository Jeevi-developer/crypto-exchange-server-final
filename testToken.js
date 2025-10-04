import bcrypt from "bcrypt";
import User from "./models/User.js"; // adjust path

router.get("/debug/check-password", async (req, res) => {
  try {
    const user = await User.findOne({ email: "gvsivagiri@gmail.com" });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare("JEEVITHA789", user.password); // your new password
    res.json({ match: isMatch });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});
