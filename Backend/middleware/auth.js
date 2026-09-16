const jwt = require('jsonwebtoken');
const User = require('../models/user');

const protect = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    const tokenMatch = authHeader && authHeader.match(/^Bearer\s+(.+)$/i);

    if (!tokenMatch) {
        return res.status(401).json({ message: "Not authorized, no token provided" });
    }

    try {
        const token = tokenMatch[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = await User.findById(decoded.id).select("-password");

        if (!req.user) {
            return res.status(401).json({ message: "Not authorized, user not found" });
        }

        next();
    }catch (error) {
        return res.status(401).json({ message: "Not authorized, invalid token" });
    }
};

module.exports = { protect };
