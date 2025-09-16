const User = require("../models/UserModel");
const bcrypt = require("bcryptjs");

// Update password
// Update password
async function updatePassword(adminId, newPassword) {
  const admin = await User.findById(adminId);
  if (!admin) throw new Error("Admin not found");

  admin.password = newPassword; // plain text, schema hook will hash it
  await admin.save();

  return { message: "Password updated successfully" };
}


// Update notifications
async function updateNotifications(adminId, newSettings) {
  const admin = await User.findOne({ _id: adminId, role: "admin" });
  if (!admin) throw new Error("Admin not found");

  admin.notifications = {
    ...admin.notifications,
    ...newSettings,
  };
  await admin.save();

  return { message: "Notification settings updated successfully" };
}

module.exports = { updatePassword, updateNotifications };
