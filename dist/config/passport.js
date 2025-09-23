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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const passport_1 = __importDefault(require("passport"));
const passport_google_oauth20_1 = require("passport-google-oauth20");
const userModel_1 = __importDefault(require("../Models/userModel"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: './config.env' });
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_CALLBACK_URL } = process.env;
if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALLBACK_URL) {
    throw new Error('Google OAuth credentials are not properly configured');
}
passport_1.default.serializeUser((user, done) => {
    done(null, user.id);
});
passport_1.default.deserializeUser((id, done) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const user = yield userModel_1.default.findById(id);
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
}));
// Google Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    proxy: true,
}, (accessToken, refreshToken, profile, done) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        // Check if user already exists by email
        let user = yield userModel_1.default.findOne({ email: profile.emails[0].value });
        if (!user) {
            // Generate a single secure random password for both fields
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            // Create new user if doesn't exist
            user = yield userModel_1.default.create({
                email: profile.emails[0].value,
                fullName: profile.displayName,
                password: randomPassword,
                confirmPassword: randomPassword, // Use the same password
                isEmailVerified: true,
                emailVerified: true,
                googleId: profile.id,
                profilePicture: ((_b = (_a = profile.photos) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || '',
            });
        }
        else if (!user.googleId) {
            // Link Google account if user exists but hasn't linked Google
            user.googleId = profile.id;
            yield user.save();
        }
        else if (user.googleId !== profile.id) {
            // This should not happen, but handle it gracefully
            return done(new Error('Google account already linked to another user'), undefined);
        }
        return done(null, user);
    }
    catch (error) {
        return done(error, undefined);
    }
})));
exports.default = passport_1.default;
