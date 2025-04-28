const Otp = require("../models/OtpModel");
const User = require("../models/UserModel");
const crypto = require('crypto');
const sendEmail = require("./sendEmail");

const sendOtp = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();

    try {
        // Check if the user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User with this email already exists" });
        }

        // Generate a random OTP
        const otp = crypto.randomInt(100000, 999999).toString();
        console.log("Generated OTP:", otp);

        // Create or update the OTP record
        let savedOtp = await Otp.findOneAndUpdate(
            { email },
            {
                $set: { otp },
                $setOnInsert: { createdAt: new Date() }  // Set `createdAt` correctly on insert
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        console.log("Saved OTP Record:", savedOtp);

        // Send the OTP via email here (e.g., using nodemailer)

        const subject = "Your OTP Code";
        const message = `Your OTP code is ${otp}. It expires in 10 minutes.`;
        await sendEmail(
            subject,
            message,
            email,
            process.env.EMAIL_USER,
            process.env.EMAIL_USER
        )
        res.status(200).json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

module.exports = sendOtp
