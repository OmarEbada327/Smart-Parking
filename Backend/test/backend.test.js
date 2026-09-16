const assert = require("node:assert/strict");
const test = require("node:test");
const express = require("express");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

process.env.JWT_SECRET = "test-secret";
process.env.JWT_EXPIRES_IN = "1h";

const { hashpassword, comparePassword } = require("../middleware/hashing");
const { protect } = require("../middleware/auth");
const { notFound, errorHandler } = require("../middleware/errorHandler");
const User = require("../models/user");
const ParkingSlot = require("../models/ParkingSlot");
const { register, login } = require("../controllers/authController");
const { getSlots, createSlot, updateSlotStatus } = require("../controllers/parkingController");
const connectDB = require("../db/db");

const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
});

const invoke = async (handler, req) => {
    const res = response();
    let error;
    await handler(req, res, (err) => { error = err; });
    return { res, error };
};

test("hashing hashes and verifies passwords", async () => {
    const hash = await hashpassword("secret12");
    assert.notEqual(hash, "secret12");
    assert.equal(await comparePassword("secret12", hash), true);
    assert.equal(await comparePassword("wrong-password", hash), false);
});

test("schemas validate data and hash passwords before save", async () => {
    await assert.rejects(new User({ name: "A", email: "invalid", password: "secret12" }).validate());
    await assert.rejects(new User({ name: "A", email: "a@example.com", password: "123" }).validate());
    await assert.rejects(new ParkingSlot({ label: "A", status: "broken" }).validate());

    const user = new User({ name: "A", email: "a@example.com", password: "secret12" });
    await User.schema.s.hooks.execPre("save", user);
    assert.notEqual(user.password, "secret12");
    assert.equal(await user.comparePassword("secret12"), true);
});

test("authentication controllers register, normalize email, and reject failed login", async () => {
    const originalFindOne = User.findOne;
    const originalCreate = User.create;
    try {
        let created;
        User.findOne = async () => null;
        User.create = async (data) => {
            created = data;
            return { _id: "507f1f77bcf86cd799439011", ...data };
        };
        const registered = await invoke(register, { body: { name: "Ada", email: " ADA@EXAMPLE.COM ", password: "secret12" } });
        assert.equal(registered.res.statusCode, 201);
        assert.equal(created.email, "ada@example.com");
        assert.equal(jwt.verify(registered.res.body.token, process.env.JWT_SECRET).id, "507f1f77bcf86cd799439011");

        const passwordHash = await hashpassword("secret12");
        User.findOne = async () => ({
            _id: "507f1f77bcf86cd799439011", name: "Ada", email: "ada@example.com",
            comparePassword: (password) => comparePassword(password, passwordHash),
        });
        const loggedIn = await invoke(login, { body: { email: "Ada@Example.com", password: "secret12" } });
        assert.equal(loggedIn.res.statusCode, 200);

        const rejected = await invoke(login, { body: { email: "ada@example.com", password: "wrong-password" } });
        assert.equal(rejected.res.statusCode, 401);
        assert.equal(rejected.error.message, "Invalid email or password");
    } finally {
        User.findOne = originalFindOne;
        User.create = originalCreate;
    }
});

test("authentication middleware accepts bearer tokens and rejects missing credentials", async () => {
    const originalFindById = User.findById;
    try {
        User.findById = () => ({ select: async () => ({ _id: "507f1f77bcf86cd799439011", name: "Ada" }) });
        const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
        const req = { headers: { authorization: `bearer   ${token}` } };
        let continued = false;
        await protect(req, response(), () => { continued = true; });
        assert.equal(continued, true);
        assert.equal(req.user.name, "Ada");

        const rejected = response();
        await protect({ headers: {} }, rejected, () => {});
        assert.equal(rejected.statusCode, 401);
    } finally {
        User.findById = originalFindById;
    }
});

test("parking controllers cover listing, creation, invalid status, update, and missing slots", async () => {
    const originalFind = ParkingSlot.find;
    const originalCreate = ParkingSlot.create;
    const originalUpdate = ParkingSlot.findByIdAndUpdate;
    try {
        ParkingSlot.find = () => ({ sort: async (sort) => {
            assert.deepEqual(sort, { label: 1 });
            return [{ label: "A" }];
        } });
        assert.deepEqual((await invoke(getSlots, { body: {} })).res.body, [{ label: "A" }]);

        ParkingSlot.create = async (data) => ({ _id: "slot-1", ...data });
        const created = await invoke(createSlot, { body: { label: "A", status: "available" } });
        assert.equal(created.res.statusCode, 201);

        const invalid = await invoke(updateSlotStatus, { params: { id: "id" }, body: { status: "broken" } });
        assert.equal(invalid.res.statusCode, 400);
        assert.match(invalid.error.message, /Status must/);

        ParkingSlot.findByIdAndUpdate = async (id, update, options) => {
            assert.equal(id, "slot-1");
            assert.deepEqual(update, { status: "occupied" });
            assert.deepEqual(options, { new: true, runValidators: true });
            return { _id: id, status: "occupied" };
        };
        const updated = await invoke(updateSlotStatus, { params: { id: "slot-1" }, body: { status: "occupied" } });
        assert.equal(updated.res.statusCode, 200);

        ParkingSlot.findByIdAndUpdate = async () => null;
        const missing = await invoke(updateSlotStatus, { params: { id: "slot-1" }, body: { status: "available" } });
        assert.equal(missing.res.statusCode, 404);
        assert.equal(missing.error.message, "Parking slot not found");
    } finally {
        ParkingSlot.find = originalFind;
        ParkingSlot.create = originalCreate;
        ParkingSlot.findByIdAndUpdate = originalUpdate;
    }
});

test("error, not-found, and database helpers handle failures", async () => {
    const castResponse = response();
    errorHandler({ name: "CastError", message: "Invalid id" }, {}, castResponse, () => {});
    assert.equal(castResponse.statusCode, 400);

    const duplicateResponse = response();
    errorHandler({ code: 11000, message: "duplicate" }, {}, duplicateResponse, () => {});
    assert.equal(duplicateResponse.statusCode, 409);

    const missingResponse = response();
    let notFoundError;
    notFound({ originalUrl: "/missing" }, missingResponse, (error) => { notFoundError = error; });
    assert.equal(missingResponse.statusCode, 404);
    assert.match(notFoundError.message, /\/missing/);

    const originalUri = process.env.MONGO_URI;
    const originalConnect = mongoose.connect;
    try {
        delete process.env.MONGO_URI;
        await assert.rejects(connectDB(), /MONGO_URI is not configured/);
        process.env.MONGO_URI = "mongodb://test";
        mongoose.connect = async (uri) => assert.equal(uri, "mongodb://test");
        await connectDB();
        mongoose.connect = async () => { throw new Error("Database unavailable"); };
        await assert.rejects(connectDB(), /Database unavailable/);
    } finally {
        mongoose.connect = originalConnect;
        if (originalUri === undefined) delete process.env.MONGO_URI;
        else process.env.MONGO_URI = originalUri;
    }
});

test("route validators reject malformed auth and parking requests", async () => {
    const authRoutes = require("../routes/authRoutes");
    const parkingRoutes = require("../routes/parkingRouter");
    const originalFindById = User.findById;
    User.findById = () => ({ select: async () => ({ _id: "507f1f77bcf86cd799439011" }) });
    const app = express();
    app.use(express.json());
    app.use("/api/auth", authRoutes);
    app.use("/api/parking", parkingRoutes);
    const server = app.listen(0);

    try {
        const base = `http://127.0.0.1:${server.address().port}`;
        const post = (path, body, headers = {}) => fetch(`${base}${path}`, {
            method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body),
        });
        assert.equal((await post("/api/auth/register", { name: "", email: "invalid", password: "123" })).status, 400);
        assert.equal((await post("/api/auth/login", { email: "invalid", password: "123" })).status, 400);
        const token = jwt.sign({ id: "507f1f77bcf86cd799439011" }, process.env.JWT_SECRET);
        assert.equal((await post("/api/parking/slots", { label: "", status: "broken" }, { authorization: `Bearer ${token}` })).status, 400);
        const update = await fetch(`${base}/api/parking/slots/not-an-id/status`, {
            method: "PUT", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ status: "broken" }),
        });
        assert.equal(update.status, 400);
    } finally {
        await new Promise((resolve) => server.close(resolve));
        User.findById = originalFindById;
    }
});
