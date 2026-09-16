const express = require('express');
const { register, login } = require("../controllers/authController");
const rateLimit = require("express-rate-limit");
const { body } = require("express-validator");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { success: false, message: "Too many login attempts, please try again after 15 minutes" }
});

const loginValidator = [
    body("email").trim().isEmail().withMessage("Please provide a valid email address").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long")
];

const registerValidator = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").trim().isEmail().withMessage("Please provide a valid email address").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters long"),
];

router.post("/register", registerValidator, validateRequest, register);
router.post("/login", loginLimiter, loginValidator, validateRequest, login);

module.exports = router;
