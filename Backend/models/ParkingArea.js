const mongoose = require("mongoose");

const parkingAreaSchema = new mongoose.Schema({
    zone_id: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    district: {
        type: String,
        trim: true
    },
    capacity_total: {
        type: Number,
        required: true,
        min: 0
    },
    spots_occupied: {
        type: Number,
        required: true,
        min: 0,
        default: 0
    },
    status: {
        type: String,
        enum: ["Available", "High Capacity", "Full"],
        default: "Available"
    },
    rate_egp_per_hour: {
        type: Number,
        required: true,
        min: 0
    },
}, { timestamps: true });

module.exports = mongoose.model("ParkingArea", parkingAreaSchema);