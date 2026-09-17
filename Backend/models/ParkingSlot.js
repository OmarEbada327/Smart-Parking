const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    area: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ParkingArea",
        required: true
    },
    status: {
        type: String,
        enum: ["available", "reserved", "occupied"],
        default: "available"
    },
    sensor_id: {
        type: String,
        trim: true,
        unique: true,
        sparse: true
    },
    occupied_since: {
        type: Date,
        default: null
    },
    is_reserved: {
        type: Boolean,
        default: false
    },
    reserved_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },
    reserved_at: {
        type: Date,
        default: null
    },
    payment_method: {
        type: String,
        enum: ["card", "wallet", "cash"],
        default: null
    },
}, { timestamps: true });

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);
