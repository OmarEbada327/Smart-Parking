const express = require('express');
const { getAreas, createArea } = require("../controllers/areaController");
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");
const { body } = require("express-validator");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

router.get("/", protect, getAreas);
router.post(
    "/",
    protect,
    [
        body("zone_id").trim().notEmpty().withMessage("Zone id is required"),
        body("name").trim().notEmpty().withMessage("Area name is required"),
        body("district").optional().trim(),
        body("capacity_total").isFloat({ min: 0 }).withMessage("Capacity must be a non-negative number"),
        body("rate_egp_per_hour").isFloat({ min: 0 }).withMessage("Rate must be a non-negative number"),
        body("status").optional().isIn(["Available", "High Capacity", "Full"])
            .withMessage("Status must be one of 'Available', 'High Capacity', or 'Full'"),
    ],
    validateRequest,
    adminOnly,
    createArea
);

module.exports = router;