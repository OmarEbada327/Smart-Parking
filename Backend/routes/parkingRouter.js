const express = require('express');
const { getSlots, createSlot, updateSlotStatus, reserveSlot } = require("../controllers/parkingController");
const { protect } = require("../middleware/auth");
const { adminOnly } = require("../middleware/adminOnly");
const { body, param } = require("express-validator");
const { validateRequest } = require("../middleware/validateRequest");

const router = express.Router();

router.get("/slots", protect, getSlots);
router.post(
    "/slots",
    protect,
    [
        body("label").trim().notEmpty().withMessage("Slot label is required"),
        body("area").notEmpty().withMessage("Parking area is required")
            .bail().isMongoId().withMessage("Area id is invalid"),
        body("status").optional().isIn(["available", "reserved", "occupied"])
            .withMessage("Status must be one of 'available', 'reserved', or 'occupied'"),
    ],
    validateRequest,
    adminOnly,
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
    adminOnly,
    updateSlotStatus
);

router.post(
    "/slots/:id/reserve",
    protect,
    [
        param("id").isMongoId().withMessage("Parking slot id is invalid"),
        body("payment_method").isIn(["card", "wallet", "cash"])
            .withMessage("Choose card, mobile wallet, or cash"),
        body("cardholder_name")
            .if(body("payment_method").equals("card"))
            .trim().notEmpty().withMessage("Cardholder name is required"),
        body("card_number")
            .if(body("payment_method").equals("card"))
            .custom((value) => /^[0-9 ]{13,23}$/.test(value || ""))
            .withMessage("Enter a valid card number"),
        body("card_expiry")
            .if(body("payment_method").equals("card"))
            .matches(/^(0[1-9]|1[0-2])\/\d{2}$/)
            .withMessage("Enter the expiry date as MM/YY"),
        body("card_cvc")
            .if(body("payment_method").equals("card"))
            .matches(/^\d{3,4}$/)
            .withMessage("Enter a valid CVC"),
        body("wallet_number")
            .if(body("payment_method").equals("wallet"))
            .matches(/^01\d{9}$/)
            .withMessage("Enter a valid Egyptian mobile wallet number"),
    ],
    validateRequest,
    reserveSlot
);

module.exports = router;
