"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validationMiddleware_1 = require("../middleware/validationMiddleware");
const authController_1 = require("../Controllers/authController");
const passport_1 = __importDefault(require("../config/passport"));
const router = express_1.default.Router();
/**{
    "status": "error",
    "message": "User not authenticated"
}
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated ID of the user
 *         name:
 *           type: string
 *           description: Full name of the user
 *         email:
 *           type: string
 *           description: User's email address
 *         password:
 *           type: string
 *           description: User's password
 *           format: password
 *         role:
 *           type: string
 *           enum: [user, admin, super-admin]
 *           description: Role of the user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date the user was created
 */
/**
 * @swagger
 * /api/v1/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/User'
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Validation error
 */
router.route("/register").post((0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.registerValidationRules), authController_1.registerUser);
/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: Log in an existing user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *                 format: password
 *     responses:
 *       200:
 *         description: User logged in successfully
 *       401:
 *         description: Invalid credentials
 */
router.route("/login").post((0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.loginValidationRules), authController_1.loginUser);
/**
 * @swagger
 * /api/v1/auth/fetchMe:
 *   get:
 *     summary: Fetch current user details
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       403:
 *         description: Access forbidden
 */
router.route("/fetchMe").get(authController_1.fetchMe);
/**
 * @swagger
 * /api/v1/auth/updateMe:
 *   patch:
 *     summary: Update user profile
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: User profile updated successfully
 *       403:
 *         description: Access forbidden
 */
router.route("/updateMe").patch(authController_1.protectedRoute, (0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.updateMeValidationRules), authController_1.updateMe);
/**
 * @swagger
 * /api/v1/auth/changePassword:
 *   patch:
 *     summary: Change user password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Current user password
 *                 format: password
 *               newPassword:
 *                 type: string
 *                 description: New user password
 *                 format: password
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Invalid credentials
 */
router.route("/changePassword").patch((0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.changePasswordValidationRules), authController_1.changeUserPassword);
/**
 * @swagger
 * /api/v1/auth/forgotPassword:
 *   post:
 *     summary: Request a password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *     responses:
 *       200:
 *         description: Password reset email sent
 *       404:
 *         description: User not found
 */
router.route("/forgotPassword").post((0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.forgotPasswordValidationRules), authController_1.forgottPassword);
/**
 * @swagger
 * /api/v1/auth/makeUserAdmin/{id}:
 *   patch:
 *     summary: Grant admin role to a user
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           description: User ID
 *     responses:
 *       200:
 *         description: User granted admin role successfully
 *       403:
 *         description: Access forbidden
 */
router
    .route("/makeUserAdmin/:id")
    .patch(authController_1.protectedRoute, (0, authController_1.restrictedRoute)(["super-admin"]), authController_1.makeUserAdmin);
/**
 * @swagger
 * /api/v1/auth/resetPassword/{token}:
 *   patch:
 *     summary: Reset password with token
 *     tags: [Auth]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *           description: Password reset token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               password:
 *                 type: string
 *                 description: New password
 *                 format: password
 *               confirmPassword:
 *                 type: string
 *                 description: Confirm the new password
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token or password mismatch
 */
router.route("/resetPassword/:token").patch((0, validationMiddleware_1.validateRequestBody)(validationMiddleware_1.resetPasswordValidationRules), authController_1.resetPassword);
/**
 * @swagger
 * /api/v1/auth/verifyEmail:
 *   patch:
 *     summary: Verify user email
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Email verified successfully
 *       400:
 *         description: Verification failed
 */
router.route("/verifyEmail").patch(authController_1.verifyUserEmail);
/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: Log out the user
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: User logged out successfully
 */
router.route("/logout").post(authController_1.logoutUser);
/**
 * @swagger
 * //sendVerificationCode:
 *   post:
 *     summary: Send verification code to the user
 *     tags: [Auth]
 *     responses:
 *       201:
 *         description: verification code successfully sent
 */
router.route("/sendVerificationCode").patch(authController_1.sendVerificationCode);
/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     responses:
 *       302:
 *         description: Redirects to Google login page
 */
router.get('/google', passport_1.default.authenticate('google', { scope: ['profile', 'email'] }));
/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Google authentication successful
 *       401:
 *         description: Google authentication failed
 */
router.get('/google/callback', passport_1.default.authenticate('google', { failureRedirect: '/api/v1/auth/google/failure' }), authController_1.googleOAuthSuccess);
/**
 * @swagger
 * /api/v1/auth/google/failure:
 *   get:
 *     summary: Google OAuth failure
 *     tags: [Auth]
 *     responses:
 *       401:
 *         description: Google authentication failed
 */
router.get('/google/failure', authController_1.googleOAuthFailure);
/**
 * @swagger
 * /api/v1/auth/link-google:
 *   post:
 *     summary: Link Google account to existing email account
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 description: User's email address
 *               password:
 *                 type: string
 *                 description: User's password
 *     responses:
 *       200:
 *         description: Account verified, proceed with Google OAuth
 *       400:
 *         description: Invalid credentials or already linked
 */
router.post('/link-google', (0, validationMiddleware_1.validateRequestBody)([
    { field: 'email', required: true, type: 'string' },
    { field: 'password', required: true, minLength: 6 }
]), authController_1.linkGoogleAccount);
/**
 * @swagger
 * /api/v1/auth/unlink-google:
 *   post:
 *     summary: Unlink Google account from email account
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Google account successfully unlinked
 *       400:
 *         description: No Google account linked or no password set
 *       401:
 *         description: Not authorized
 */
router.post('/unlink-google', authController_1.protectedRoute, authController_1.unlinkGoogleAccount);
exports.default = router;
