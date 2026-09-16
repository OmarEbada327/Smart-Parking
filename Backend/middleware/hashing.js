const bcrypt = require('bcrypt');

const hashpassword = async (plainPassword) => {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(plainPassword, salt);
};

const comparePassword = (plainPassword, hashedPassword) => {
    return bcrypt.compare(plainPassword, hashedPassword);
};

module.exports = { hashpassword, comparePassword };