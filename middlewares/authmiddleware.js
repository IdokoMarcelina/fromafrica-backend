const jwt = require('jsonwebtoken');
const User = require('../models/UserModel');

const authenticateUser = async (req, res, next)=>{


    const token = req.cookies.token;

    if(!token){
        return res.status(401).json({message: 'Access denied! no token provided'})
    }

    try {
        const verified = jwt.verify(token, process.env.JWT_SECRET)
        const user = await User.findById(verified.id).select("-password")
        if(!user){
           return res.status(401).json({message:"user not found"})
      
        }

        req.user = user
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid or expired token'})
    }
}

module.exports = authenticateUser