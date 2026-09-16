const dotenv = require("dotenv");
const connectDB = require("../db/db");
const User = require("../models/user");
const ParkingSlot = require("../models/ParkingSlot");
const { hashpassword } = require("../middleware/hashing");

dotenv.config();

const seed = async () => {
    await connectDB();

    await User.deleteMany();
    await ParkingSlot.deleteMany();

    const hashedPassword = await hashpassword("admin123");
    await User.create({
        name: "Admin",
        email: "admin@test.com",
        password: hashedPassword,
        is_admin: true
    });

    await ParkingSlot.insertMany([
        { label: "A1", status: "available" },
        { label: "A2", status: "available" },
        { label: "A3", status: "reserved" },
        { label: "A4", status: "occupied" },
    ]);

    console.log("Seed data created:");
  console.log("  Admin login -> admin@smartparking.com / admin1234");
  console.log("  4 parking slots created (A1-A4)");

  process.exit(0);
};

seed().catch((err) => {
    console.error("Seeding failed:", err.message);
  process.exit(1);
});