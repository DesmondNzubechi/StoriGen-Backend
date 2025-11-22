"use strict";
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
    // Use _id instead of id to ensure consistency with Mongoose
    done(null, user._id ? user._id.toString() : user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    try {
        const user = await userModel_1.default.findById(id);
        if (!user) {
            return done(new Error('User not found'), null);
        }
        done(null, user);
    }
    catch (error) {
        done(error, null);
    }
});
// Google Strategy
passport_1.default.use(new passport_google_oauth20_1.Strategy({
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
    proxy: true,
}, async (accessToken, refreshToken, profile, done) => {
    var _a, _b;
    try {
        // Validate profile data
        if (!profile.emails || !profile.emails[0] || !profile.emails[0].value) {
            return done(new Error('Email not provided by Google'), undefined);
        }
        const email = profile.emails[0].value;
        // Check if user already exists by email
        let user = await userModel_1.default.findOne({ email });
        if (!user) {
            // Generate a single secure random password for both fields
            const randomPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
            // Create new user if doesn't exist
            try {
                user = await userModel_1.default.create({
                    email: email,
                    fullName: profile.displayName || 'User',
                    password: randomPassword,
                    confirmPassword: randomPassword, // Use the same password
                    isEmailVerified: true,
                    emailVerified: true,
                    googleId: profile.id,
                    profilePicture: ((_b = (_a = profile.photos) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.value) || '',
                });
            }
            catch (createError) {
                console.error('Error creating user:', createError);
                return done(new Error(`Failed to create user: ${createError.message || 'Unknown error'}`), undefined);
            }
        }
        else if (!user.googleId) {
            // Link Google account if user exists but hasn't linked Google
            user.googleId = profile.id;
            try {
                await user.save();
            }
            catch (saveError) {
                console.error('Error saving user:', saveError);
                return done(new Error(`Failed to link Google account: ${saveError.message || 'Unknown error'}`), undefined);
            }
        }
        else if (user.googleId !== profile.id) {
            // This should not happen, but handle it gracefully
            return done(new Error('Google account already linked to another user'), undefined);
        }
        return done(null, user);
    }
    catch (error) {
        console.error('Passport Google Strategy Error:', error);
        return done(new Error(error.message || 'Authentication failed'), undefined);
    }
}));
exports.default = passport_1.default;
