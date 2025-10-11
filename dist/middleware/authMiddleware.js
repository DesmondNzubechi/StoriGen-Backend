"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.restrictTo = exports.protect = void 0;
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const appError_1 = require("../errors/appError");
const protect = async (req, res, next) => {
    var _a;
    try {
        let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.jwt;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new appError_1.AppError('You are not authorized to access this route', 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user)
            return; // verifyTokenAndGetUser will handle the error via next
        req.user = user;
        next();
    }
    catch (err) {
        next(err);
    }
};
exports.protect = protect;
const restrictTo = (...roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return next(new appError_1.AppError('You are restricted from accessing this route', 403));
        }
        next();
    };
};
exports.restrictTo = restrictTo;
exports.authenticate = exports.protect;
exports.authorize = exports.restrictTo;
