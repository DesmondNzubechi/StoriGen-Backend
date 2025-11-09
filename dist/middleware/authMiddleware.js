"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.restrictTo = exports.protect = void 0;
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const appError_1 = require("../errors/appError");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const extractToken = (req) => {
    var _a;
    if ((_a = req.cookies) === null || _a === void 0 ? void 0 : _a.jwt) {
        return req.cookies.jwt;
    }
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }
    return null;
};
exports.protect = (0, catchAsync_1.default)(async (req, res, next) => {
    const token = extractToken(req);
    if (!token) {
        return next(new appError_1.AppError("You are not authorized to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return;
    }
    // Store resolved authentication on the request so controllers can rely on it.
    // This dual cookie/header check keeps iOS/Safari users authenticated when
    // cross-site cookies are stripped in third-party contexts.
    req.user = user;
    req.authToken = token;
    next();
});
const restrictTo = (...roles) => (req, res, next) => {
    const user = req.user;
    if (!user || !roles.includes(user.role)) {
        return next(new appError_1.AppError("You are restricted from accessing this route", 403));
    }
    next();
};
exports.restrictTo = restrictTo;
exports.authenticate = exports.protect;
exports.authorize = exports.restrictTo;
