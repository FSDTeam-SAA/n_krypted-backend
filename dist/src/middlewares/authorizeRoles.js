"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const authorizeRoles = (...roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            res
                .status(403)
                .json({
                success: false,
                message: 'Access denied: insufficient permissions',
            });
            return;
        }
        next();
    };
};
exports.default = authorizeRoles;
