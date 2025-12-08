const Otp = require("../models/OtpModel");
const User = require("../models/UserModel");
const crypto = require('crypto');
const sendEmail = require("./sendEmail");

const sendOtp = async (req, res) => {
    const email = req.body.email?.trim().toLowerCase();
    const type = req.body.type || 'registration';

    try {
        let userId = null;

        // For registration, check if user exists
        if (type === 'registration') {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: "User with this email already exists" });
            }
        } else if (type === 'forgot-password') {
            // For forgot-password, user must exist
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(404).json({ message: "User with this email does not exist" });
            }
            userId = user._id;
        }

        // Delete old OTP of same type
        await Otp.deleteMany({ email, type });

        const otp = crypto.randomInt(100000, 999999).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        console.log(`Generated ${type} OTP:`, otp);

        // Create new OTP
        await Otp.create({
            user: userId, // null for registration, userId for forgot-password
            email,
            otp,
            type,
            created_at: new Date(),
            expires_at: expiresAt,
            isVerified: false
        });

        console.log("Saved OTP Record - Type:", type, "User ID:", userId);

        const subject = type === 'registration' ? "Email Verification OTP" : "Password Reset OTP";
        const message = `Your OTP code is ${otp}. It expires in 10 minutes.`;
        
        await sendEmail(
            subject,
            message,
            email,
            process.env.EMAIL_USER,
            process.env.EMAIL_USER
        );

        res.status(200).json({ message: "OTP sent successfully" });

    } catch (error) {
        console.error("Error sending OTP:", error);
        res.status(500).json({ message: "Error sending OTP", error: error.message });
    }
};

module.exports = sendOtp;