const express = require('express')
const { registerUser, login, verifyOtp, initiateRegistration, verifyOtpFromLink, getAllUsers, forgetPassword, verifyForgotPasswordOtp, resetPassword } = require('../controllers/authController')
const router = express.Router()

router.post('/initiateRegistration', initiateRegistration);
router.post('/verifyOtp', verifyOtp)
router.post('/register', registerUser)
router.post('/forget-password', forgetPassword)
router.post('/verify-forget-password', verifyForgotPasswordOtp)
router.post('/reset-password', resetPassword)
router.post('/login', login)
router.get('/get-users', getAllUsers)

module.exports = router;