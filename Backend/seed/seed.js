const dotenv = require("dotenv");
const connectDB = require("../db/db");
const User = require("../models/user");
const ParkingArea = require("../models/ParkingArea");
const ParkingSlot = require("../models/ParkingSlot");

dotenv.config();

const DEFAULT_ADMIN_CREDENTIALS = {
    name: "Admin",
    email: "admin@test.com",
    password: "admin123",
};

const PARKING_ZONES = [
    {
        zone_id: "GZ-DOK-01",
        name: "Dokki Square Underground",
        district: "Dokki",
        capacity_total: 5,
        spots_occupied: 3,
        status: "High Capacity",
        rate_egp_per_hour: 15,
    },
    {
        zone_id: "GZ-HRM-02",
        name: "City Mall Garage",
        district: "El Haram",
        capacity_total: 5,
        spots_occupied: 2,
        status: "Available",
        rate_egp_per_hour: 10,
    },
    {
        zone_id: "GZ-CU-03",
        name: "Cairo University Main Gate",
        district: "University District",
        capacity_total: 5,
        spots_occupied: 4,
        status: "Full",
        rate_egp_per_hour: 5,
    },
    {
        zone_id: "GZ-MOH-04",
        name: "Sphinx Square Surface Lot",
        district: "Mohandeseen",
        capacity_total: 5,
        spots_occupied: 1,
        status: "Available",
        rate_egp_per_hour: 20,
    },
];

const PARKING_SLOTS_BY_ZONE = {
    "GZ-DOK-01": [
        { slot_id: "DOK-01", sensor_id: "esp_dok_01", status: "occupied", occupied_since: "2026-09-17T08:15:00Z", is_reserved: false },
        { slot_id: "DOK-02", sensor_id: "esp_dok_02", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "DOK-03", sensor_id: "esp_dok_03", status: "occupied", occupied_since: "2026-09-17T10:42:00Z", is_reserved: true },
        { slot_id: "DOK-04", sensor_id: "esp_dok_04", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "DOK-05", sensor_id: "esp_dok_05", status: "occupied", occupied_since: "2026-09-17T11:05:00Z", is_reserved: false },
    ],
    "GZ-HRM-02": [
        { slot_id: "HRM-01", sensor_id: "esp_hrm_01", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "HRM-02", sensor_id: "esp_hrm_02", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "HRM-03", sensor_id: "esp_hrm_03", status: "occupied", occupied_since: "2026-09-17T09:30:00Z", is_reserved: false },
        { slot_id: "HRM-04", sensor_id: "esp_hrm_04", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "HRM-05", sensor_id: "esp_hrm_05", status: "occupied", occupied_since: "2026-09-17T11:15:00Z", is_reserved: true },
    ],
    "GZ-CU-03": [
        { slot_id: "CU-01", sensor_id: "esp_cu_01", status: "occupied", occupied_since: "2026-09-17T07:45:00Z", is_reserved: false },
        { slot_id: "CU-02", sensor_id: "esp_cu_02", status: "occupied", occupied_since: "2026-09-17T07:50:00Z", is_reserved: false },
        { slot_id: "CU-03", sensor_id: "esp_cu_03", status: "occupied", occupied_since: "2026-09-17T08:05:00Z", is_reserved: false },
        { slot_id: "CU-04", sensor_id: "esp_cu_04", status: "occupied", occupied_since: "2026-09-17T08:12:00Z", is_reserved: false },
        { slot_id: "CU-05", sensor_id: "esp_cu_05", status: "free", occupied_since: null, is_reserved: false },
    ],
    "GZ-MOH-04": [
        { slot_id: "SPX-01", sensor_id: "esp_spx_01", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "SPX-02", sensor_id: "esp_spx_02", status: "occupied", occupied_since: "2026-09-17T10:20:00Z", is_reserved: false },
        { slot_id: "SPX-03", sensor_id: "esp_spx_03", status: "free", occupied_since: null, is_reserved: false },
        { slot_id: "SPX-04", sensor_id: "esp_spx_04", status: "free", occupied_since: null, is_reserved: true },
        { slot_id: "SPX-05", sensor_id: "esp_spx_05", status: "occupied", occupied_since: "2026-09-17T11:45:00Z", is_reserved: false },
    ],
};


function resolveStatus(rawSlot) {
    if (rawSlot.is_reserved) return "reserved";
    return rawSlot.status === "occupied" ? "occupied" : "available";
}

function buildSlotDoc(area, rawSlot) {
    return {
        label: rawSlot.slot_id,
        area: area._id,
        sensor_id: rawSlot.sensor_id,
        status: resolveStatus(rawSlot),
        occupied_since: rawSlot.occupied_since ? new Date(rawSlot.occupied_since) : null,
        is_reserved: rawSlot.is_reserved,
    };
}

const seed = async () => {
    await connectDB();

    await User.deleteMany();
    await ParkingArea.deleteMany();
    await ParkingSlot.deleteMany();

    await User.create({
        name: DEFAULT_ADMIN_CREDENTIALS.name,
        email: DEFAULT_ADMIN_CREDENTIALS.email,
        password: DEFAULT_ADMIN_CREDENTIALS.password,
        role: "admin",
    });

    const areas = await ParkingArea.insertMany(PARKING_ZONES);

    const slotDocs = areas.flatMap((area) => {
        const rawSlots = PARKING_SLOTS_BY_ZONE[area.zone_id] || [];
        return rawSlots.map((rawSlot) => buildSlotDoc(area, rawSlot));
    });
    const slots = await ParkingSlot.insertMany(slotDocs);

    console.log("Seed data created:");
    console.log(`  Admin login -> ${DEFAULT_ADMIN_CREDENTIALS.email} / ${DEFAULT_ADMIN_CREDENTIALS.password}`);
    console.log(`  ${areas.length} parking zones created (Giza Governorate)`);
    console.log(`  ${slots.length} parking slots created (5 per zone, from real sensor data)`);

    return DEFAULT_ADMIN_CREDENTIALS;
};

if (require.main === module) {
    seed()
        .then(() => process.exit(0))
        .catch((err) => {
            console.error("Seeding failed:", err.message);
            process.exit(1);
        });
}

module.exports = { DEFAULT_ADMIN_CREDENTIALS, PARKING_ZONES, seed };