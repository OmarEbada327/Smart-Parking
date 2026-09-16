const mongoose = require('mongoose');
const { hashpassword, comparePassword } = require('../middleware/hashing');

const userschema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\S+@\S+\.\S+$/, "Please provide a valid email address"]
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
}, { timestamps: true });

userschema.pre("save", async function () {
    if (!this.isModified("password")) {
        return;
    }
    this.password = await hashpassword(this.password);
});

userschema.methods.comparePassword = function (plainPassword) {
    return comparePassword(plainPassword, this.password);
};

module.exports = mongoose.model("User", userschema);
