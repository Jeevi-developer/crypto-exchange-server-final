import Admin from "../models/Admin.js";

export const verifyAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ error: "No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try user collection first
    let user = await User.findById(decoded.id);
    if (!user) {
      // Fallback: check Admin collection
      user = await Admin.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      // Force role = "admin" for admin documents
      user.role = "admin";
    }

    if (user.role !== "admin" && user.role !== "superadmin") {
      return res.status(403).json({ error: "Access denied. Admins only." });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("Admin auth error:", err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
