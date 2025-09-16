const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const Otp = require('../models/OtpModel');
const sendOtp = require('../utils/sendOtp'); 
const bcrypt = require('bcryptjs');

const generateJwt = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Step 1: Start registration (send OTP)
const initiateRegistration = async (req, res) => {
  const { email } = req.body;
  console.log("Received Request Body:", req.body); 

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    await sendOtp(req, res);
  } catch (error) {
    res.status(500).json({ message: "Error initiating registration", error: error.message });
  }
};

// Step 2: Verify OTP
const verifyOtp = async (req, res) => {
  const email = req.body.email?.trim().toLowerCase();
  const otp = req.body.otp;

  if (!email || !otp || otp === "undefined") {
    return res.status(400).json({ message: "Invalid or missing OTP" });
  }

  try {
    const otpRecord = await Otp.findOne({ email });

    console.log("Trying to verify OTP for:", email);
    console.log("Found OTP Record:", otpRecord);
    console.log("Received OTP:", otp);

    if (!otpRecord) {
      return res.status(400).json({ message: "OTP expired or not found" });
    }

    const now = Date.now();
    const expiryLimit = 10 * 60 * 1000; 
    const otpAge = now - otpRecord.createdAt.getTime();

    if (otpAge > expiryLimit) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (otpRecord.otp !== otp) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    otpRecord.isVerified = true;
    await otpRecord.save();

    await User.findOneAndUpdate(
      { email },
      { isVerified: true },
      { new: true }
    );

    return res.status(200).json({ message: "Email verified successfully" });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

// Step 3: Register User
const registerUser = async (req, res) => {
  const { email, password, name, phone, avatar, role, address, sellerDetails } = req.body;

  try {
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord || !otpRecord.isVerified) {  
      return res.status(400).json({ message: "Email not verified. Please verify OTP first." });
    }

    if (role === "seller" && (!name || !phone || !address || !sellerDetails)) {
      return res.status(400).json({ message: "All seller details are required" });
    }

    const newUser = new User({
      email,
      password,
      name,
      phone,
      avatar,
      role,
      address,
      sellerDetails: role === "seller" ? sellerDetails : null,
      isVerified: true,
      businessStatus: role === "seller" ? "pending" : "approved"  // ✅ sellers start with pending
    });

    await newUser.save();
    const token = generateJwt(newUser);

    await Otp.deleteOne({ email });

    res.status(201).json({
      message: role === "seller"
        ? "User registered successfully. Awaiting admin approval."
        : "User registered successfully",
      user: { 
        _id: newUser._id, 
        email: newUser.email, 
        role: newUser.role,
        businessStatus: newUser.businessStatus, // ✅ return status
        token 
      },
    });

  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Step 4: Login
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(400).json({ message: "Email not verified. Please verify your email." });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        email: user.email,
        role: user.role,
        businessStatus: user.businessStatus, // ✅ include here too
        token
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// Step 5: Get all users
const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}, '_id name email role businessStatus');
    res.status(200).json({ users });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  initiateRegistration,
  registerUser,
  login,
  verifyOtp,
  getAllUsers
};
