"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const summariesController_1 = require("../Controllers/summariesController");
const authController_1 = require("../Controllers/authController");
//import { authenticate } from '../middleware/auth';
const router = express_1.default.Router();
/**
 * @swagger
 * /api/summaries:
 *   post:
 *     summary: Generate summary from an idea using AI
 *     tags: [Summaries]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ideaId
 *             properties:
 *               ideaId:
 *                 type: string
 *                 description: ID of the idea to generate summary from
 *               customizations:
 *                 type: object
 *                 properties:
 *                   tone:
 *                     type: string
 *                     enum: [dramatic, mysterious, emotional, cinematic, traditional]
 *                   style:
 *                     type: string
 *                     enum: [viral, educational, entertainment, cultural]
 *                   targetAudience:
 *                     type: string
 *                     enum: [children, adults, family, teens]
 *     responses:
 *       201:
 *         description: Summary generated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Idea not found
 *       401:
 *         description: Not authenticated
 */
router.post('/', authController_1.protectedRoute, summariesController_1.generateSummary);
/**
 * @swagger
 * /api/summaries:
 *   get:
 *     summary: Get all summaries for the authenticated user
 *     tags: [Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Summaries retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/', authController_1.protectedRoute, summariesController_1.getSummaries);
/**
 * @swagger
 * /api/summaries/{id}:
 *   get:
 *     summary: Get a single summary by ID
 *     tags: [Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Summary ID
 *     responses:
 *       200:
 *         description: Summary retrieved successfully
 *       404:
 *         description: Summary not found
 *       401:
 *         description: Not authenticated
 */
router.get('/:id', authController_1.protectedRoute, summariesController_1.getSummaryById);
/**
 * @swagger
 * /api/summaries/{id}:
 *   patch:
 *     summary: Update a summary
 *     tags: [Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Summary ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               content:
 *                 type: string
 *               hook:
 *                 type: string
 *               conflict:
 *                 type: string
 *               resolution:
 *                 type: string
 *               culturalElements:
 *                 type: array
 *                 items:
 *                   type: string
 *               viralElements:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Summary updated successfully
 *       404:
 *         description: Summary not found
 *       401:
 *         description: Not authenticated
 */
router.patch('/:id', authController_1.protectedRoute, summariesController_1.updateSummary);
/**
 * @swagger
 * /api/summaries/{id}:
 *   delete:
 *     summary: Delete a summary
 *     tags: [Summaries]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Summary ID
 *     responses:
 *       200:
 *         description: Summary deleted successfully
 *       404:
 *         description: Summary not found
 *       401:
 *         description: Not authenticated
 */
router.delete('/:id', authController_1.protectedRoute, summariesController_1.deleteSummary);
exports.default = router;
