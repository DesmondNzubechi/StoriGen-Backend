"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const shortsController_1 = require("../Controllers/shortsController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/shorts/generate:
 *   post:
 *     summary: Generate a new motivational short using AI
 *     tags: [Shorts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - typeOfMotivation
 *               - theme
 *               - userId
 *             properties:
 *               typeOfMotivation:
 *                 type: string
 *                 example: "Fitness Motivation"
 *               theme:
 *                 type: string
 *                 example: "Discipline"
 *               targetWord:
 *                 type: string
 *                 example: "Consistency"
 *               userId:
 *                 type: string
 *                 example: "6710fa72b34512a0ddfa82be"
 *     responses:
 *       201:
 *         description: Motivational short generated successfully
 *       400:
 *         description: Missing required fields
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Failed to generate motivational short
 */
router.post("/generate", authMiddleware_1.protect, shortsController_1.generateShort);
/**
 * @swagger
 * /api/shorts:
 *   get:
 *     summary: Get all motivational shorts
 *     tags: [Shorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: typeOfMotivation
 *         schema:
 *           type: string
 *         description: Filter by type of motivation
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *         description: Filter by theme
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Keyword search across title, caption, content, theme, and typeOfMotivation
 *     responses:
 *       200:
 *         description: Shorts retrieved successfully
 *       401:
 *         description: Not authenticated
 *       500:
 *         description: Failed to fetch shorts
 */
router.get("/", authMiddleware_1.protect, shortsController_1.getAllShorts);
/**
 * @swagger
 * /api/shorts/{idOrSlug}:
 *   get:
 *     summary: Get a single motivational short by ID or slug
 *     tags: [Shorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: idOrSlug
 *         required: true
 *         schema:
 *           type: string
 *         description: Short ID or slug
 *     responses:
 *       200:
 *         description: Motivational short retrieved successfully
 *       404:
 *         description: Short not found
 *       401:
 *         description: Not authenticated
 */
router.get("/:idOrSlug", authMiddleware_1.protect, shortsController_1.getShortByIdOrSlug);
/**
 * @swagger
 * /api/shorts/{id}:
 *   delete:
 *     summary: Delete a motivational short
 *     tags: [Shorts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Short ID
 *     responses:
 *       200:
 *         description: Short deleted successfully
 *       404:
 *         description: Short not found
 *       401:
 *         description: Not authenticated
 */
router.delete("/:id", authMiddleware_1.protect, shortsController_1.deleteShort);
exports.default = router;
