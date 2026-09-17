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
        const { label, area, status, sensor_id } = req.body;

        if (!label) {
            res.status(400);
            throw new Error("Slot label is required");
        }

        const slot = await ParkingSlot.create({ label, area, status, sensor_id });

        const io = req.app && req.app.get("io");
        if (io) io.emit("slot:created", slot);

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

        const io = req.app && req.app.get("io");
        if (io) io.emit("slot:updated", slot);

        res.status(200).json(slot);
    }catch (error) {
        next(error);
    }
};

const reserveSlot = async (req, res, next) => {
    try {
        const slot = await ParkingSlot.findOneAndUpdate(
            { _id: req.params.id, status: "available" },
            {
                status: "reserved",
                is_reserved: true,
                reserved_by: req.user._id,
                reserved_at: new Date(),
                payment_method: req.body.payment_method,
            },
            { new: true, runValidators: true }
        );

        if (!slot) {
            res.status(409);
            throw new Error("This parking space is no longer available");
        }

        const io = req.app && req.app.get("io");
        if (io) io.emit("slot:updated", slot);

        res.status(200).json(slot);
    } catch (error) {
        next(error);
    }
};

module.exports = { getSlots, createSlot, updateSlotStatus, reserveSlot };
