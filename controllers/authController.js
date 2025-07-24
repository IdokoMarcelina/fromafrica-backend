const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/UserModel');
const jwt = require('jsonwebtoken');
const Otp = require('../models/OtpModel');
const sendOtp = require('../utils/sendOtp'); 
const bcrypt = require('bcryptjs')

const generateJwt = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );
};

// Send OTP immediately when user enters email
const initiateRegistration = async (req, res) => {
  const { email } = req.body;
  console.log("Received Request Body:", req.body); 

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Send OTP to user
    await sendOtp(req, res);
  } catch (error) {
    res.status(500).json({ message: "Error initiating registration", error: error.message });
  }
};


const verifyOtp = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp;

    // Validate the OTP and email
    if (!email || !otp || otp === "undefined") {
        return res.status(400).json({ message: "Invalid or missing OTP" });
    }

    try {
        // Find the OTP record for the provided email
        const otpRecord = await Otp.findOne({ email });

        console.log("Trying to verify OTP for:", email);
        console.log("Found OTP Record:", otpRecord);
        console.log("Received OTP:", otp);

        // If no OTP record is found, return an error
        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found" });
        }

        // Check if the OTP has expired (more than 10 minutes old)
        const now = Date.now();
        const expiryLimit = 10 * 60 * 1000; // 10 minutes
        const otpAge = now - otpRecord.createdAt.getTime();

        if (otpAge > expiryLimit) {
            return res.status(400).json({ message: "OTP has expired" });
        }

        // Verify the OTP
        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        // Mark OTP as verified
        otpRecord.isVerified = true;
        await otpRecord.save();

        // Update the user's verification status
        const updatedUser = await User.findOneAndUpdate(
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






const registerUser = async (req, res) => {
  const { email, password, name, phone, avatar, role, address, sellerDetails } = req.body;

  try {
    // 🔍 Check if the user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // 🔍 Ensure email was verified before proceeding
    const otpRecord = await Otp.findOne({ email });

    if (!otpRecord || !otpRecord.isVerified) {  // ✅ Corrected check
      return res.status(400).json({ message: "Email not verified. Please verify OTP first." });
    }

    // 🔍 Ensure seller provides all required details
    if (role === "seller" && (!name || !phone || !address || !sellerDetails)) {
      return res.status(400).json({ message: "All seller details are required" });
    }

    // 🔹 Create new user
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
    });

    
    await newUser.save();
    const token = generateJwt(newUser);

    // ✅ Optionally delete the OTP record after successful registration
    await Otp.deleteOne({ email });

    res.status(201).json({
      message: "User registered successfully",
      user: { _id: newUser._id, email, token },
    });

  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // 🔍 Check if the user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🔍 Check if password is correct
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // 🔍 Ensure the user is verified
    if (!user.isVerified) {
      return res.status(400).json({ message: "Email not verified. Please verify your email." });
    }

    // 🔑 Generate JWT token
    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    const token = jwt.sign(
  { id: user._id, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    // res.status(200).json({
    //   message: "Login successful",
    //   user: { _id: user._id, email,role, token },
      
    // });

    res.status(200).json({
  message: "Login successful",
  user: {
    _id: user._id,
    email: user.email,
    role: user.role, // ✅ Corrected this line
    token
  }
});


  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = {
  initiateRegistration,
  registerUser,
  login,
  verifyOtp,
}
