const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

exports.protectAdmin = async (req, res, next) => {
  let token;

  // 1️⃣ Check if Authorization header exists and starts with "Bearer"
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1]; // get the token part
  }

  // 2️⃣ If token not found, return 401
  if (!token) {
    return res.status(401).json({ error: 'Not authorized to access this route' });
  }

  try {
    // 3️⃣ Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4️⃣ Attach admin ID to request for further use
    req.adminId = decoded.id;

    // 5️⃣ Continue to next middleware or controller
    next();
  } catch (error) {
    // 6️⃣ If token invalid or expired
    res.status(401).json({ error: 'Not authorized to access this route' });
  }
};
