const jwt = require('jsonwebtoken');
const db = require('../config/db');
exports.verifyToken = async (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(403).json({ message: 'Không có token!' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Check account còn tồn tại không
    const [rows] = await db.query(
      'SELECT id FROM accounts WHERE id = ? AND is_active = 1',
      [decoded.id]
    );
    if (rows.length === 0) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại!' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token không hợp lệ!' });
  }
};

// Kiểm tra quyền admin
exports.isAdmin = (req, res, next) => {
  if (req.user.role_id !== 1) {
    return res.status(403).json({ message: 'Chỉ admin mới có quyền này!' });
  }
  next();
};