const express = require('express')
const { registerUser, login, verifyOtp, initiateRegistration, verifyOtpFromLink } = require('../controllers/authController')
const router = express.Router()

router.post('/initiateRegistration', initiateRegistration);
router.get('/verifyOtp/:email/:otp', verifyOtpFromLink)
router.post('/register', registerUser)
router.post('/login', login)

module.exports = router 