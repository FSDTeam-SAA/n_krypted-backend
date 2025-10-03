"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);
    // Check if headers have already been sent
    if (res.headersSent) {
        return next(err);
    }
    res.status(500).json({ message: err.message || 'Something went wrong' });
};
exports.default = errorMiddleware;
