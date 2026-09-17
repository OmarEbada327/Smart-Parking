const jwt = require("jsonwebtoken");
const User = require("../models/user");

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN,
    });
};

const register = async (req, res, next) => {
    try {
        const { name, password } = req.body;
        const email = emailFromRequest(req);

        if (!name || !email || !password) {
            res.status(400);
            throw new Error("Please provide all required fields");
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400);
            throw new Error("Email already registered");
        }

        const user = await User.create({ name, email, password });

        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        next(error);
    }
};

const login = async (req, res, next) => {
    try {
        const { password } = req.body;
        const email = emailFromRequest(req);

        if (!email || !password) {
            res.status(400);
            throw new Error("Email and password are required");
        }

        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password))) {
            res.status(401);
            throw new Error("Invalid email or password");
        }

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } catch (error) {
        next(error);
    }
};

const emailFromRequest = (req) => String(req.body.email || "").trim().toLowerCase();

module.exports = { register, login };
