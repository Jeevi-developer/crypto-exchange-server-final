export const requirePermission = (permissionKey) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authorized" });

    // Superadmin bypass
    if (req.user.role === "superadmin") return next();

    if (req.user.permissions?.[permissionKey]) return next();

    return res
      .status(403)
      .json({ message: `Access denied. Missing permission: ${permissionKey}` });
  };
};
