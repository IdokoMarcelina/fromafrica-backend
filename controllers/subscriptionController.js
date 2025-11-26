const User = require('../models/UserModel');
const Subscription = require('../models/subscriptionModel');
const Waiver = require('../models/WaiverModel');
const sendEmail = require('../utils/sendEmail');

const setSubscriptionFee = async (req, res) => {
  try {
    const { fee, currency } = req.body;
    if (!fee) return res.status(400).json({ message: 'Fee is required' });

    let subscription = await Subscription.findOne();
    if (subscription) {
      subscription.fee = fee;
      subscription.currency = currency || subscription.currency;
      await subscription.save();
    } else {
      subscription = await Subscription.create({ fee, currency });
    }

    res.status(200).json({ message: 'Subscription fee set successfully', subscription });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const createWaiver = async (req, res) => {
  try {
    const { code, expiresAt } = req.body;
    if (!code || !expiresAt) return res.status(400).json({ message: 'Code and expiry required' });

    const waiver = await Waiver.create({
      code,
      expiresAt,
      createdBy: req.user._id
    });

    res.status(201).json({ message: 'Waiver code created', waiver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const applyWaiver = async (req, res) => {
  try {
    const { code } = req.body;
    const user = await User.findById(req.user._id);

    if (!code) return res.status(400).json({ message: 'Waiver code required' });
    if (user.hasUsedWaiver) return res.status(400).json({ message: 'You already used a waiver' });

    const waiver = await Waiver.findOne({ code, isActive: true });
    if (!waiver || new Date(waiver.expiresAt) < new Date()) {
      return res.status(400).json({ message: 'Invalid or expired waiver code' });
    }

    // update user subscription
    user.subscriptionStatus = 'active';
    user.subscriptionPlan = 'waiver';
    user.subscriptionExpiresAt = new Date(new Date().setFullYear(new Date().getFullYear() + 1)); // 1 year free
    user.hasUsedWaiver = true;
    await user.save();

    // send email
    const subject = 'Subscription Successful';
    const message = `Hi ${user.name}, your subscription has been activated using waiver code ${code}.`;
    await sendEmail(subject, message, user.email, process.env.EMAIL_USER, process.env.EMAIL_USER);

    res.status(200).json({ message: 'Waiver applied successfully', subscription: user.subscriptionPlan });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { setSubscriptionFee, createWaiver, applyWaiver };
