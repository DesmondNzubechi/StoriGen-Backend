"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = exports.authenticate = exports.restrictTo = exports.protect = void 0;
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const appError_1 = require("../errors/appError");
const protect = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.jwt;
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        if (!token) {
            return next(new appError_1.AppError('You are not authorized to access this route', 401));
        }
        const user = yield (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user)
            return; // verifyTokenAndGetUser will handle the error via next
        req.user = user;
        next();
    }
    catch (err) {
        next(err);
    }
});
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
