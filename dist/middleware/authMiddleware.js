"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.restrictTo = exports.protect = void 0;
// Dummy protect middleware (replace with real logic)
const protect = (req, res, next) => {
    // TODO: Implement JWT or session authentication
    next();
};
exports.protect = protect;
// Dummy restrictTo middleware (replace with real logic)
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // TODO: Implement role-based access control
        next();
    };
};
exports.restrictTo = restrictTo;
// Alias for protect function
exports.authenticate = exports.protect;
// Alias for restrictTo function
exports.authorize = exports.restrictTo;
