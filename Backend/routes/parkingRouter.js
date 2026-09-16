const express = require('express');
const { getSlots, createSlot, updateSlotStatus } = require("../controllers/parkingController");
const { protect } = require("../middleware/auth");
const { body, param } = require("express-validator");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

router.get("/slots", protect, getSlots);
router.post(
    "/slots",
    protect,
    [
        body("label").trim().notEmpty().withMessage("Slot label is required"),
        body("status").optional().isIn(["available", "reserved", "occupied"])
            .withMessage("Status must be one of 'available', 'reserved', or 'occupied'"),
    ],
    validateRequest,
    createSlot
);
router.put(
    "/slots/:id/status",
    protect,
    [
        param("id").isMongoId().withMessage("Parking slot id is invalid"),
        body("status").isIn(["available", "reserved", "occupied"])
            .withMessage("Status must be one of 'available', 'reserved', or 'occupied'"),
    ],
    validateRequest,
    updateSlotStatus
);

module.exports = router;
