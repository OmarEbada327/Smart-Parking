const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./db/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const parkingRoutes = require('./routes/parkingRouter');
const areaRoutes = require('./routes/areaRoutes');
const cors = require("cors");
const path = require("path");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "..", "Frontend")));

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });
app.set("io", io);

io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    socket.on("disconnect", () => console.log(`Socket disconnected: ${socket.id}`));
});

app.use("/api/auth", authRoutes);
app.use("/api/parking", parkingRoutes);
app.use("/api/areas", areaRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

connectDB()
    .then(() => {
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    });
