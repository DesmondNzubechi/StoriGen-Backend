import express from "express";
import { generateShort, getAllShorts, getShortByIdOrSlug, deleteShort } from "../Controllers/shortsController";
import { protect } from "../middleware/authMiddleware";

const router = express.Router();

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
router.post("/generate", protect, generateShort);

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
router.get("/", protect, getAllShorts);

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
router.get("/:idOrSlug", protect, getShortByIdOrSlug);

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
router.delete("/:id", protect, deleteShort);

export default router;
