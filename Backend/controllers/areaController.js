const ParkingArea = require("../models/ParkingArea");
const ParkingSlot = require("../models/ParkingSlot");

const getLiveZoneStatus = (total, unavailable, fallback) => {
    if (!total) return fallback;
    if (unavailable >= total) return "Full";
    if (unavailable / total >= 0.8) return "High Capacity";
    return "Available";
};

const getAreas = async (req, res, next) => {
    try {
        const areas = await ParkingArea.find().lean();
        const liveAreas = await Promise.all(areas.map(async (area) => {
            const [slots_total, slots_occupied, slots_reserved] = await Promise.all([
                ParkingSlot.countDocuments({ area: area._id }),
                ParkingSlot.countDocuments({ area: area._id, status: "occupied" }),
                ParkingSlot.countDocuments({ area: area._id, status: "reserved" }),
            ]);
            const unavailable = slots_occupied + slots_reserved;
            return {
                ...area,
                slots_total,
                slots_occupied,
                slots_reserved,
                slots_available: Math.max(0, slots_total - unavailable),
                status: getLiveZoneStatus(slots_total, unavailable, area.status),
            };
        }));
        res.json(liveAreas.toSorted((a, b) => a.name.localeCompare(b.name)));
    } catch (error) {
        next(error);
    }
};

const createArea = async (req, res, next) => {
    try {
        const { zone_id, name, district, capacity_total, rate_egp_per_hour, status } = req.body;

        const area = await ParkingArea.create({
            zone_id,
            name,
            district,
            capacity_total,
            rate_egp_per_hour,
            status,
        });

        const io = req.app && req.app.get("io");
        if (io) io.emit("area:created", area);

        res.status(201).json(area);
    } catch (error) {
        next(error);
    }
};

module.exports = { getAreas, createArea };
