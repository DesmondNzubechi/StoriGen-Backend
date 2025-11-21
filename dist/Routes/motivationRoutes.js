"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const motivationController_1 = require("../Controllers/motivationController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const authController_1 = require("../Controllers/authController");
const router = express_1.default.Router();
/**
 * @swagger
 * tags:
 *   name: Motivation
 *   description: Endpoints for generating and managing motivational content
 */
/**
 * @swagger
 * /api/v1/motivation/generate:
 *   post:
 *     summary: Generate motivational content
 *     description: Generates motivational pieces based on user customisation. Automatically saves generated entries.
 *     tags: [Motivation]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tone
 *               - theme
 *               - type
 *               - targetLength
 *             properties:
 *               tone:
 *                 type: string
 *                 example: Uplifting
 *               theme:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Perseverance", "Growth"]
 *               type:
 *                 type: string
 *                 example: Speech
 *               targetLength:
 *                 type: number
 *                 example: 250
 *     responses:
 *       201:
 *         description: Motivations generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorised
 */
router.post("/generate", authController_1.protectedRoute, motivationController_1.generateMotivation);
/**
 * @swagger
 * /api/v1/motivation/{id}/speech:
 *   post:
 *     summary: Generate speech for an existing motivation
 *     description: Generates an audio narration for the specified motivation using the stored content.
 *     tags: [Motivation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Motivation identifier
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voiceId:
 *                 type: string
 *                 description: Override default TTS voice
 *               modelId:
 *                 type: string
 *                 description: Override default TTS model
 *               receiveUrl:
 *                 type: string
 *                 format: uri
 *                 description: Webhook URL for asynchronous delivery
 *               withTranscript:
 *                 type: boolean
 *                 description: Include transcript in TTS response if supported
 *     responses:
 *       200:
 *         description: Speech generated successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorised
 *       404:
 *         description: Motivation not found
 *       504:
 *         description: Speech generation timed out
 */
router.post("/:id/speech", authController_1.protectedRoute, (0, authMiddleware_1.restrictTo)("admin", "super-admin"), motivationController_1.generateSpeechForMotivation);
/**
 * @swagger
 * /api/v1/motivation:
 *   get:
 *     summary: Get motivations (authenticated user)
 *     description: Returns motivations with optional filters. Use `mine=true` to restrict to current user.
 *     tags: [Motivation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *         description: Filter by tone
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: Filter by type
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *         description: Comma-separated themes to match
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Full-text search across content and captions
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: Page size (default 20, max 100)
 *       - in: query
 *         name: mine
 *         schema:
 *           type: string
 *         description: Set to "true" to return only the requesting user's motivations
 *     responses:
 *       200:
 *         description: Motivations fetched successfully
 *       401:
 *         description: Unauthorised
 */
router.get("/", authController_1.protectedRoute, motivationController_1.getAllMotivations);
/**
 * @swagger
 * /api/v1/motivation/mine:
 *   get:
 *     summary: Get the authenticated user's motivations
 *     tags: [Motivation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Motivations fetched successfully
 *       401:
 *         description: Unauthorised
 */
router.get("/mine", authController_1.protectedRoute, motivationController_1.getUserMotivations);
/**
 * @swagger
 * /api/v1/motivation/admin/all:
 *   get:
 *     summary: Admin – Get all motivations
 *     description: Returns all motivations with optional filters. Restricted to admin / super-admin users.
 *     tags: [Motivation]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *       - in: query
 *         name: userId
 *         schema:
 *           type: string
 *         description: Filter by specific user id
 *     responses:
 *       200:
 *         description: Motivations fetched successfully
 *       401:
 *         description: Unauthorised
 *       403:
 *         description: Forbidden
 */
router.get("/admin/all", authController_1.protectedRoute, (0, authMiddleware_1.restrictTo)("admin", "super-admin"), motivationController_1.getAllMotivationsAdmin);
/**
 * @swagger
 * /api/v1/motivation/{id}:
 *   get:
 *     summary: Get motivation by id
 *     tags: [Motivation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Motivation fetched successfully
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Motivation not found
 */
router.get("/:id", authController_1.protectedRoute, motivationController_1.getMotivationById);
/**
 * @swagger
 * /api/v1/motivation/{id}:
 *   delete:
 *     summary: Delete motivation
 *     tags: [Motivation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Motivation deleted successfully
 *       400:
 *         description: Invalid id
 *       404:
 *         description: Motivation not found
 */
router.delete("/:id", authController_1.protectedRoute, motivationController_1.deleteMotivation);
/**
 * @swagger
 * /api/v1/motivation/{id}:
 *   patch:
 *     summary: Update motivation
 *     tags: [Motivation]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               tone:
 *                 type: string
 *               type:
 *                 type: string
 *               theme:
 *                 type: array
 *                 items:
 *                   type: string
 *               targetLength:
 *                 type: number
 *               caption:
 *                 type: string
 *     responses:
 *       200:
 *         description: Motivation updated successfully
 *       400:
 *         description: Invalid data
 *       404:
 *         description: Motivation not found
 */
router.patch("/:id", authController_1.protectedRoute, motivationController_1.updateMotivation);
exports.default = router;
