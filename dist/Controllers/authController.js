"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.unlinkGoogleAccount = exports.linkGoogleAccount = exports.googleOAuthFailure = exports.googleOAuthSuccess = exports.logoutUser = exports.verifyUserEmail = exports.sendVerificationCode = exports.resetPassword = exports.forgottPassword = exports.makeUserAdmin = exports.changeUserPassword = exports.updateMe = exports.restrictedRoute = exports.protectedRoute = exports.fetchMe = exports.loginUser = exports.registerUser = exports.createAndSendTokenToUser = void 0;
const userModel_1 = __importDefault(require("../Models/userModel"));
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
const appError_1 = require("../errors/appError");
const dotenv_1 = require("dotenv");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const sendEmail_1 = require("../utils/sendEmail");
const crypto_1 = __importDefault(require("crypto"));
const appResponse_1 = require("../utils/appResponse");
const emailVerificationCode_1 = require("../utils/emailVerificationCode");
(0, dotenv_1.config)({ path: "./config.env" });
const { JWT_EXPIRES_IN, JWT_SECRET, JWT_COOKIE_EXPIRES, ORIGIN_URL, NODE_ENV, COOKIE_DOMAIN, } = process.env;
if (!JWT_EXPIRES_IN || !JWT_SECRET || !JWT_COOKIE_EXPIRES || !ORIGIN_URL) {
    throw new appError_1.AppError("Kindly make sure that these env variable are defined", 400);
}
const isProduction = NODE_ENV === "production";
const cookieExpiryDays = parseInt(JWT_COOKIE_EXPIRES, 10);
if (Number.isNaN(cookieExpiryDays)) {
    throw new appError_1.AppError("JWT_COOKIE_EXPIRES must be a valid number", 500);
}
const buildCookieOptions = () => {
    const cookieOptions = {
        expires: new Date(Date.now() + cookieExpiryDays * 24 * 60 * 60 * 1000),
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
    };
    if (COOKIE_DOMAIN) {
        cookieOptions.domain = COOKIE_DOMAIN;
    }
    return cookieOptions;
};
const signInToken = async (id) => {
    return jsonwebtoken_1.default.sign({ id }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN || "10d" });
};
const createAndSendTokenToUser = async (user, statusCode, message, res) => {
    const token = await signInToken(user._id);
    res.cookie("jwt", token, buildCookieOptions());
    res.status(statusCode).json({
        status: "success",
        message,
        data: {
            user,
        },
    });
};
exports.createAndSendTokenToUser = createAndSendTokenToUser;
//REGISTER USER
exports.registerUser = (0, catchAsync_1.default)(async (req, res, next) => {
    const { fullName, email, password, confirmPassword } = req.body;
    const userExist = await userModel_1.default.findOne({ email: email });
    if (userExist) {
        return next(new appError_1.AppError("User already exist with this email. If you are the one kindly login.", 700));
    }
    if (!fullName || !email || !password || !confirmPassword) {
        return next(new appError_1.AppError("Kindly fill in the required field", 400));
    }
    const user = await userModel_1.default.create({
        fullName,
        email,
        password,
        confirmPassword,
    });
    res.status(201).json({
        status: "success",
        message: "user registration successful.",
    });
});
//LOGIN USER
exports.loginUser = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, password } = req.body;
    const user = await userModel_1.default.findOne({ email: email }).select("+password");
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new appError_1.AppError("invalid email or password. Kindly try again", 400));
    }
    // Check if user has Google account linked
    const hasGoogleAccount = user.googleId ? true : false;
    // Only issue JWT if email is verified
    const token = await signInToken(user._id);
    res.cookie("jwt", token, buildCookieOptions());
    res.status(200).json({
        status: "success",
        message: "Login successful",
        data: {
            user: {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role,
                emailVerified: user.emailVerified,
                profilePicture: user.profilePicture,
                hasGoogleAccount,
                googleId: user.googleId
            },
        },
    });
});
//FETCH AUTHENTICATED USER INFORMATION
exports.fetchMe = (0, catchAsync_1.default)(async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return next(new appError_1.AppError("An error occured. Please try again", 400));
    }
    res.status(200).json({
        status: "success",
        message: "user fetched successfully",
        data: {
            user,
        },
    });
});
//PROTECTED ROUTE
exports.protectedRoute = (0, catchAsync_1.default)(async (req, res, next) => {
    let token = req.cookies.jwt;
    // Fallback to Authorization header if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new appError_1.AppError("You are not authorized to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return next(new appError_1.AppError("User with this token does not exist or  token already expired", 400));
    }
    // Set user in request object
    req.user = user;
    next();
});
const restrictedRoute = (role) => {
    return (0, catchAsync_1.default)(async (req, res, next) => {
        let token = req.cookies.jwt;
        // Fallback to Authorization header if cookie is not present
        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user || !role.includes(user.role)) {
            return next(new appError_1.AppError("You are restricted from accessing this route", 401));
        }
        next();
    });
};
exports.restrictedRoute = restrictedRoute;
exports.updateMe = (0, catchAsync_1.default)(async (req, res, next) => {
    let token = req.cookies.jwt;
    // Fallback to Authorization header if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new appError_1.AppError("You are not authorized to perform this action.", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return next(new appError_1.AppError("Could not find user with this token. please login again.", 404));
    }
    const { newEmail, newFullName } = req.body;
    if (!newEmail || !newFullName) {
        return next(new appError_1.AppError("Kindly provide the required field", 400));
    }
    const updateUser = await userModel_1.default.findByIdAndUpdate(user.id, { newEmail, newFullName }, {
        runValidators: true,
        new: true,
    });
    if (!exports.updateMe) {
        return next(new appError_1.AppError("Could not update user info. Please try again", 400));
    }
    return (0, appResponse_1.AppResponse)(res, 200, "success", "User information successfully updated.", updateUser);
});
exports.changeUserPassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { currentPassword, newPassword, confirmNewPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmNewPassword) {
        return next(new appError_1.AppError("Please provide the required field", 400));
    }
    if (newPassword !== confirmNewPassword) {
        return next(new appError_1.AppError("new password and confirm password must be the same.", 400));
    }
    let token = req.cookies.jwt;
    // Fallback to Authorization header if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new appError_1.AppError("You are not authorized to perform this action.", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return next(new appError_1.AppError("Could not fetch user with the token. Kindly login again.", 404));
    }
    const correctP = await user.correctPassword(currentPassword, user.password);
    if (!correctP) {
        return next(new appError_1.AppError("The password you provided is not the same with your current password. Please try agian", 400));
    }
    user.password = newPassword;
    user.confirmPassword = confirmNewPassword;
    await user.save();
    (0, exports.createAndSendTokenToUser)(user, 200, "password change successful.", res);
});
exports.makeUserAdmin = (0, catchAsync_1.default)(async (req, res, next) => {
    const { id } = req.params;
    if (!id) {
        return next(new appError_1.AppError("Kindly provide the user id", 400));
    }
    const user = await userModel_1.default.findByIdAndUpdate(id, { role: "super-admin" }, {
        new: true,
        runValidators: true,
    });
    if (!user) {
        return next(new appError_1.AppError("Something went wrong. Please try again", 400));
    }
    return (0, appResponse_1.AppResponse)(res, 200, "success", "User successfully upgraded to admin.", user);
});
exports.forgottPassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email } = req.body;
    const user = await userModel_1.default.findOne({ email });
    if (!user) {
        return next(new appError_1.AppError("User does not exist with this email.", 404));
    }
    const resetToken = user.createResetPasswordToken();
    await user.save({ validateBeforeSave: false });
    const resetUrl = `${ORIGIN_URL}/auth/reset-password/${resetToken}`;
    const message = `forgot your password? kindly reset your password by clicking the link below. If you did not request for this kindly ignore. This is only valid for 30 minutes.`;
    try {
        (0, sendEmail_1.sendEmail)({
            message,
            subject: "RESET PASSWORD LINK",
            email: user.email,
            name: user.fullName,
            link: resetUrl,
            linkName: "Reset Password",
        });
        res.status(200).json({
            status: "success",
            message: "Token sent successful",
        });
    }
    catch (error) {
        return next(new appError_1.AppError("An error occured while sending email. Please try again", 400));
    }
});
exports.resetPassword = (0, catchAsync_1.default)(async (req, res, next) => {
    const { token } = req.params;
    const decodedToken = crypto_1.default.createHash("sha256").update(token).digest("hex");
    const user = await userModel_1.default.findOne({
        passwordResetToken: decodedToken,
        passwordResetTokenExpires: { $gt: Date.now() },
    });
    if (!user) {
        return next(new appError_1.AppError("This token is invalid or already expired", 400));
    }
    const { password, confirmPassword } = req.body;
    user.password = password;
    user.confirmPassword = confirmPassword;
    user.passwordResetTokenExpires = undefined;
    user.passwordResetToken = undefined;
    await user.save();
    (0, sendEmail_1.sendEmail)({
        message: "You have successfully reset your password. Kindly login back using the link below",
        subject: "PASSWORD RESET SUCCESSFUL",
        email: user.email,
        name: user.fullName,
        link: ORIGIN_URL,
        linkName: "Login",
    });
    return (0, appResponse_1.AppResponse)(res, 200, "success", "You have successfully reset your password. Kindly Login again", null);
});
exports.sendVerificationCode = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email } = req.body;
    const user = await userModel_1.default.findOne({ email });
    if (!user) {
        return next(new appError_1.AppError("User does not exist", 404));
    }
    if (user.emailVerified) {
        return next(new appError_1.AppError("User email already verified. Kindly login", 400));
    }
    const verificationCode = await (0, emailVerificationCode_1.generatEmailVerificationCode)();
    const verificationMessage = "Please verify your email using the code below to start booking your favorite events. Note, the code expires in 30 minutes.";
    user.emailVerificationCode = verificationCode;
    user.emailVerificationCodeExpires = Date.now() + 30 * 60 * 1000;
    await user.save({ validateBeforeSave: false });
    (0, sendEmail_1.sendEmail)({
        name: user.fullName,
        email: user.email,
        subject: "VERIFY YOUR EMAIL",
        message: verificationMessage,
        vCode: verificationCode,
        link: ORIGIN_URL,
        linkName: "Visit our website",
    });
    return (0, appResponse_1.AppResponse)(res, 200, "success", "Verification code sent successful. Kindly check your email", null);
});
exports.verifyUserEmail = (0, catchAsync_1.default)(async (req, res, next) => {
    const { verificationCode } = req.body;
    if (!verificationCode) {
        return next(new appError_1.AppError("Kindly provide the verification code sent to your email.", 400));
    }
    const user = await userModel_1.default.findOne({ emailVerificationCode: verificationCode });
    if (!user) {
        return next(new appError_1.AppError("Wrong verification code or if you did not get any code try resending it.", 400));
    }
    if (user.emailVerified) {
        return next(new appError_1.AppError("User Email already verified. Kindly proceed to login.", 400));
    }
    if (user.emailVerificationCodeExpires < Date.now()) {
        return next(new appError_1.AppError("Verification code expired. Kindly send another one.", 400));
    }
    user.emailVerificationCode = null;
    user.emailVerificationCodeExpires = null;
    user.emailVerified = true;
    user.isEmailVerified = true;
    await user.save({ validateBeforeSave: false });
    const verificationMessage = "You have successfully verified your email. You can now proceed to login";
    (0, sendEmail_1.sendEmail)({
        name: user.fullName,
        email: user.email,
        subject: "EMAIL VERIFICATION SUCCESSFUL",
        message: verificationMessage,
        vCode: "VERIFIED",
        // link: `${ORIGIN_URL}/login`,
        // linkName: "Login Here",
    });
    return (0, appResponse_1.AppResponse)(res, 200, "success", "You have successfully verified your email. Kindly Login again", null);
});
exports.logoutUser = (0, catchAsync_1.default)(async (req, res, next) => {
    const cookieOptions = {
        ...buildCookieOptions(),
        expires: new Date(Date.now() + 1000),
    };
    res.cookie("jwt", "logout", cookieOptions);
    res.status(200).json({
        status: "success",
        message: "Logout successful",
    });
});
exports.googleOAuthSuccess = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError('Authentication failed', 401));
    }
    // Check if this is a new user or existing user
    const isNewUser = !user.createdAt || (Date.now() - new Date(user.createdAt).getTime()) < 60000; // Within 1 minute
    const token = await signInToken(user._id);
    res.cookie("jwt", token, buildCookieOptions());
    // Redirect to frontend with token in URL
    const frontendRedirectUrl = ORIGIN_URL;
    return res.redirect(frontendRedirectUrl);
});
//GOOGLE OAUTH FAILURE HANDLER
exports.googleOAuthFailure = (0, catchAsync_1.default)(async (req, res, next) => {
    return next(new appError_1.AppError('Google authentication failed', 401));
});
//LINK GOOGLE ACCOUNT TO EXISTING EMAIL ACCOUNT
exports.linkGoogleAccount = (0, catchAsync_1.default)(async (req, res, next) => {
    const { email, password } = req.body;
    // Verify user credentials first
    const user = await userModel_1.default.findOne({ email: email }).select("+password");
    if (!user || !(await user.correctPassword(password, user.password))) {
        return next(new appError_1.AppError("Invalid email or password. Please verify your credentials.", 400));
    }
    // Check if user already has Google account linked
    if (user.googleId) {
        return next(new appError_1.AppError("This account is already linked to a Google account.", 400));
    }
    // Return success with instructions to proceed with Google OAuth
    res.status(200).json({
        status: "success",
        message: "Account verified. Please proceed with Google OAuth to link your account.",
        data: {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName
            }
        }
    });
});
//UNLINK GOOGLE ACCOUNT
exports.unlinkGoogleAccount = (0, catchAsync_1.default)(async (req, res, next) => {
    let token = req.cookies.jwt;
    // Fallback to Authorization header if cookie is not present
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
        return next(new appError_1.AppError("You are not authorized to perform this action.", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    if (!user) {
        return next(new appError_1.AppError("Could not find user with this token. Please login again.", 404));
    }
    // Check if user has Google account linked
    if (!user.googleId) {
        return next(new appError_1.AppError("No Google account is linked to this account.", 400));
    }
    // Check if user has a password set (to ensure they can still login)
    if (!user.password) {
        return next(new appError_1.AppError("Cannot unlink Google account. Please set a password first.", 400));
    }
    // Unlink Google account
    user.googleId = undefined;
    await user.save();
    res.status(200).json({
        status: "success",
        message: "Google account successfully unlinked.",
        data: {
            user: {
                _id: user._id,
                email: user.email,
                fullName: user.fullName,
                hasGoogleAccount: false
            }
        }
    });
});
