const notFound = (req, res, next) => {
    res.status(404);
    next(new Error(`Route not found - ${req.originalUrl}`));
};

const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode;

    if (err.name === "ValidationError" || err.name === "CastError") {
        statusCode = 400;
    }

    if (err.code === 11000) {
        statusCode = 409;
    }

    res.status(statusCode).json({
        message: err.code === 11000 ? "A record with that value already exists" : err.message,
    });
};

module.exports = { notFound, errorHandler };