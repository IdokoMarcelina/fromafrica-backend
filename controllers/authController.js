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


const verifyOtpFromLink = async (req, res) => {
    console.log("Request Method:", req.method);
    console.log("Full Request URL:", req.protocol + "://" + req.get("host") + req.originalUrl);
    console.log("Request Params:", req.params);
    const { email, otp } = req.params;
     console.log("Request Params:", req.params);


    if (!email || !otp || otp === "undefined") {
        return res.status(400).json({ message: "Invalid or missing OTP" });
    }

    try {
        const otpRecord = await Otp.findOne({ email });

        console.log("Stored OTP:", otpRecord?.otp || "No OTP found"); // Log stored OTP
        console.log("Received OTP:", otp); // Log received OTP

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        otpRecord.isVerified = true;
        await otpRecord.save(); // Save updated OTP record

        return res.status(200).json({ message: "Email verified successfully" });

        // await Otp.deleteOne({ email });

        //  return res.status(200).json({
        //     message: "OTP verified successfully",
        //     email: email,
        //     verified: true
        // });
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
      isVerified: true, // ✅ Set isVerified to true since OTP was verified
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
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(200).json({
      message: "Login successful",
      user: { _id: user._id, email, token },
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
  verifyOtpFromLink,
};
