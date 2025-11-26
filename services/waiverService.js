const User = require("../models/UserModel");
const WaiverCode = require("../models/WaiverModel");
const sendEmail = require("../utils/sendEmail");

const applyWaiverCode = async (userId, code) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  if (user.hasUsedWaiver) {
    throw new Error("Waiver already used");
  }

  const waiver = await WaiverCode.findOne({ code });
  if (!waiver) throw new Error("Invalid waiver code");

  if (!waiver.isActive) throw new Error("This code is inactive");

  if (waiver.expiresAt && waiver.expiresAt < Date.now()) {
    throw new Error("This code has expired");
  }

  if (waiver.usedBy.length >= waiver.usagesLimit) {
    throw new Error("This code has reached its usage limit");
  }

  // Activate subscription
  user.subscriptionStatus = "active";
  user.subscriptionPlan = "waiver";
  user.subscriptionExpiresAt = new Date().setFullYear(new Date().getFullYear() + 1);
  user.hasUsedWaiver = true;
  await user.save();

  // Track usage
  waiver.usedBy.push(user._id);
  await waiver.save();

  // Send emails
  await sendEmail(
    "Subscription Activated",
    `<p>Your subscription has been activated using the waiver code <b>${code}</b>.</p>`,
    user.email,
    process.env.EMAIL_USER,
    process.env.EMAIL_USER
  );

  return {
    message: "Subscription activated successfully",
    user,
  };
};

module.exports = {
  applyWaiverCode,
};
