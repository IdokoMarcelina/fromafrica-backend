const User = require('../models/UserModel'); 

const isAdmin = async (req, res, next) => {
  try {
    if (req.user && req.user.role === 'admin') {
      return next(); 
    }
    
    const user = await User.findById(req.user._id); 
    if (user && user.role === 'admin') {
      return next();
    }

    res.status(403).json({ message: "Access denied. Admins only." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
};

module.exports = isAdmin;
