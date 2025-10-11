"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyTokenAndGetUser = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const dotenv_1 = require("dotenv");
const appError_1 = require("../errors/appError");
const userModel_1 = __importDefault(require("../Models/userModel"));
(0, dotenv_1.config)({ path: "./config.env" });
const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
    throw new appError_1.AppError("make sure the environmental variable is defined", 400);
}
const verifyTokenAndGetUser = async (token, next) => {
    try {
        const decoded = await new Promise((resolve, reject) => {
            jsonwebtoken_1.default.verify(token, JWT_SECRET, (err, decoded) => {
                if (err)
                    reject(new appError_1.AppError("Token Verication Failed", 400));
                else
                    resolve(decoded);
            });
        });
        const user = await userModel_1.default.findById(decoded.id);
        if (!user) {
            return next(new appError_1.AppError("User not found with this id", 404));
        }
        if (user.changePasswordAfter(decoded.iat)) {
            return next(new appError_1.AppError("user recently changed password. please login again", 400));
        }
        return user;
    }
    catch (error) {
        console.log(error);
        return next(new appError_1.AppError("Authentication failed", 401));
    }
};
exports.verifyTokenAndGetUser = verifyTokenAndGetUser;
