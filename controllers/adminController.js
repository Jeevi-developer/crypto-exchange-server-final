import User from "../models/User.js";

// ✅ Admin Dashboard: list all users
export const getAdminDashboard = async (req, res) => {
  try {
    const users = await User.find(
      { role: "user" },
      "name email depositedValue kycStatus role createdAt"
    ).sort({ createdAt: -1 });

    res.json({
      message: "Admin dashboard data",
      users,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ SuperAdmin Dashboard: list all admins + superadmins
export const getSuperAdminDashboard = async (req, res) => {
  try {
    const admins = await User.find(
      { role: { $in: ["admin", "superadmin"] } },
      "name email role createdAt"
    ).sort({ createdAt: -1 });

    res.json({
      message: "SuperAdmin dashboard data",
      admins,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Promote user to admin (superadmin only)
export const promoteToAdmin = async (req, res) => {
  const { userId } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.role = "admin";
    await user.save();

    res.json({ message: "User promoted to admin", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

// ✅ Demote admin to user (superadmin only)
export const demoteToUser = async (req, res) => {
  const { adminId } = req.body;

  try {
    const admin = await User.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.role = "user";
    await admin.save();

    res.json({ message: "Admin demoted to user", admin });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
