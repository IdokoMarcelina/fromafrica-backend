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
        const otpRecord = await Otp.findOne({ email, type: 'registration' });
        console.log("Trying to verify OTP for:", email);
        console.log("Found OTP Record:", otpRecord);
        console.log("Received OTP:", otp);

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found" });
        }

        const now = new Date();
        if (now > otpRecord.expires_at) {
            await Otp.deleteOne({ email, type: 'registration' });
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        otpRecord.isVerified = true;
        await otpRecord.save();

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
      businessStatus: role === "seller" ? "pending" : "approved"  
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
        businessStatus: newUser.businessStatus, 
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
        businessStatus: user.businessStatus, 
        token
      }
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

const forgetPassword = async (req, res) => {
    try {
        const email = req.body.email?.trim().toLowerCase();

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: 'User with this email does not exist.' });
        }

        req.body.type = 'forgot-password';
        await sendOtp(req, res);

    } catch (error) {
        console.error("Forgot password error:", error);
        return res.status(500).json({ message: 'Server error', error: error.message });
    }
};


const verifyForgotPasswordOtp = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const otp = req.body.otp;

    if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
    }

    try {
        const otpRecord = await Otp.findOne({ 
            email, 
            type: 'forgot-password' 
        });

        if (!otpRecord) {
            return res.status(400).json({ message: "OTP expired or not found" });
        }

        if (new Date() > otpRecord.expires_at) {
            await Otp.deleteOne({ email, type: 'forgot-password' });
            return res.status(400).json({ message: "OTP has expired" });
        }

        if (otpRecord.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        otpRecord.isVerified = true;
        await otpRecord.save();

        res.status(200).json({ 
            message: "OTP verified successfully. You can now reset your password." 
        });

    } catch (error) {
        console.error("Error verifying forgot password OTP:", error);
        res.status(500).json({ message: "Error verifying OTP", error: error.message });
    }
};


const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
        return res.status(400).json({ message: "Email and new password are required" });
    }

    if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    try {
        const emailLower = email.trim().toLowerCase();

        const otpRecord = await Otp.findOne({ 
            email: emailLower, 
            type: 'forgot-password',
            isVerified: true 
        });

        if (!otpRecord) {
            return res.status(400).json({ 
                message: "OTP not verified. Please verify OTP first." 
            });
        }

        const user = await User.findOne({ email: emailLower });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.password = newPassword;
        await user.save();

        await Otp.deleteOne({ email: emailLower, type: 'forgot-password' });

        res.status(200).json({ message: "Password reset successfully. You can now login." });

    } catch (error) {
        console.error("Error resetting password:", error);
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
  getAllUsers,
  forgetPassword,
  verifyForgotPasswordOtp,
  resetPassword
};
