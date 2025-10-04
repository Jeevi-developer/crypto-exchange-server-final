import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

export const protect = async (req, res, next) => {
  let token;

  // Accept token from Authorization header (Bearer ...) or from cookie (if used)
  if (req.headers.authorization?.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies?.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to find a User first
    let user = await User.findById(decoded.id).select("-password").lean();

    // If not found in users, try admins
    if (!user) {
      const admin = await Admin.findById(decoded.id).select("-password").lean();
      if (admin) {
        // normalize to same shape as User for downstream code
        user = {
          _id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role || "admin",
          // any other admin fields you want to expose
        };
      }
    }

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Ensure a role exists
    if (!user.role) user.role = "user";

    req.user = user; // plain object or mongoose doc
    next();
  } catch (err) {
    console.error("protect error:", err);
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

export const requireRole = (requiredRoles) => {
  return (req, res, next) => {
    const role = req.user?.role;
    if (!role) return res.status(403).json({ message: "Access denied" });

    const rolesArray = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    if (!rolesArray.includes(role)) {
      return res.status(403).json({ message: "Access denied" });
    }

    next();
  };
};
