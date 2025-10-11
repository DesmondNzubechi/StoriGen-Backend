"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatEmailVerificationCode = void 0;
const userModel_1 = __importDefault(require("../Models/userModel"));
const generatEmailVerificationCode = async () => {
    let isCodeUnique = false;
    let emailVerificationCode;
    while (!isCodeUnique) {
        emailVerificationCode = Math.floor(1000 + Math.random() * 9000);
        const userExistWithCode = await userModel_1.default.findOne({ emailVerificationCode });
        if (!userExistWithCode) {
            isCodeUnique = true;
        }
    }
    return emailVerificationCode;
};
exports.generatEmailVerificationCode = generatEmailVerificationCode;
