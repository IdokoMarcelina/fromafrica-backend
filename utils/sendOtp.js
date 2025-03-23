const Otp = require("../models/OtpModel");
const User = require("../models/UserModel");
const crypto = require('crypto')


const sendOtp = async (req, res) => {
    const { email } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        const otp = crypto.randomInt(100000, 999999).toString();
        console.log("Generated OTP:", otp); // Log OTP

        let savedOtp = await Otp.findOneAndUpdate(
            { email },
            { otp, createdAt: Date.now() },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        if (!savedOtp) {
            // If update didn't work, try creating a new document
            savedOtp = await Otp.create({ email, otp });
        }

        console.log("Saved OTP Record:", savedOtp); // Log database response

        if (!savedOtp) {
            return res.status(500).json({ message: "Failed to save OTP" });
        }

        res.status(200).json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

module.exports = sendOtp
