const mongoose = require("mongoose");

const parkingSlotSchema = new mongoose.Schema({
    label: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ["available", "reserved", "occupied"],
        default: "available"
    },
}, { timestamps: true });

module.exports = mongoose.model("ParkingSlot", parkingSlotSchema);