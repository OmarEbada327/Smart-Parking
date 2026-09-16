const ParkingSlot = require("../models/ParkingSlot");

const getSlots = async (req, res, next) => {
    try {
        const slots = await ParkingSlot.find().sort({ label: 1 });
        res.json(slots);
    }catch (error) {
        next(error);
    }
};

const createSlot = async (req, res, next) => {
    try {
        const { label, status } = req.body;

        if (!label) {
            res.status(400);
            throw new Error("Slot label is required");
        }

        const slot = await ParkingSlot.create({ label, status });
        res.status(201).json(slot);
    }catch (error) {
        next(error);
    }
};

const updateSlotStatus = async (req, res, next) => {
    try {
        const { status } = req.body;

        if (!["available", "reserved", "occupied"].includes(status)) {
            res.status(400);
            throw new Error("Status must be one of 'available', 'reserved', or 'occupied'");
        }

        const slot = await ParkingSlot.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!slot) {
            res.status(404);
            throw new Error("Parking slot not found");
        }

        res.status(200).json(slot);
    }catch (error) {
        next(error);
    }
};

module.exports = { getSlots, createSlot, updateSlotStatus };