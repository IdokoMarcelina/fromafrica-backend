
const isSeller = (req, res, next) => {
    if (req.user && req.user.role === 'seller') {
      next(); 
    } else {
      return res.status(403).json({
        message: 'Access denied: Only sellers are allowed to perform this action'
      });
    }
  };
  
  module.exports = isSeller;
  