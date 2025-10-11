"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ideasController_1 = require("../Controllers/ideasController");
const authMiddleware_1 = require("../middleware/authMiddleware");
const authController_1 = require("../Controllers/authController");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/ideas/generate:
 *   post:
 *     summary: Generate viral story ideas using AI
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
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
 *       200:
 *         description: Ideas generated successfully
 *       401:
 *         description: Not authenticated
 */
router.post('/generate', authMiddleware_1.protect, ideasController_1.generateIdeas);
/**
 * @swagger
 * /api/ideas:
 *   post:
 *     summary: Create a new idea
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - content
 *               - theme
 *               - setting
 *             properties:
 *               title:
 *                 type: string
 *                 example: "The Palace Secret"
 *               content:
 *                 type: string
 *                 example: "A young prince discovers a hidden palace secret..."
 *               theme:
 *                 type: string
 *                 example: "betrayal"
 *               setting:
 *                 type: string
 *                 example: "palace"
 *               characters:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["prince", "queen", "guardian"]
 *               tone:
 *                 type: string
 *                 enum: [dramatic, mysterious, emotional, cinematic, traditional]
 *                 default: dramatic
 *               style:
 *                 type: string
 *                 enum: [viral, educational, entertainment, cultural]
 *                 default: viral
 *               targetAudience:
 *                 type: string
 *                 enum: [children, adults, family, teens]
 *                 default: adults
 *     responses:
 *       201:
 *         description: Idea created successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Not authenticated
 */
router.post('/', authMiddleware_1.protect, ideasController_1.createIdea);
/**
 * @swagger
 * /api/ideas:
 *   get:
 *     summary: Get all ideas for the authenticated user
 *     tags: [Ideas]
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
 *       - in: query
 *         name: theme
 *         schema:
 *           type: string
 *         description: Filter by theme
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *           enum: [dramatic, mysterious, emotional, cinematic, traditional]
 *         description: Filter by tone
 *       - in: query
 *         name: style
 *         schema:
 *           type: string
 *           enum: [viral, educational, entertainment, cultural]
 *         description: Filter by style
 *     responses:
 *       200:
 *         description: Ideas retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get('/', authMiddleware_1.protect, ideasController_1.getIdeas);
/**
 * @swagger
 * /api/ideas/my:
 *   get:
 *     summary: Get all ideas belonging to the logged-in user
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved user ideas
 *       401:
 *         description: Not authenticated
 */
router.get('/my', authController_1.protectedRoute, ideasController_1.getUserIdeas);
/**
 * @swagger
 * /api/ideas/{id}:
 *   get:
 *     summary: Get a single idea by ID
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Idea ID
 *     responses:
 *       200:
 *         description: Idea retrieved successfully
 *       404:
 *         description: Idea not found
 *       401:
 *         description: Not authenticated
 */
router.get('/:id', authMiddleware_1.protect, ideasController_1.getIdeaById);
/**
 * @swagger
 * /api/ideas/{id}:
 *   patch:
 *     summary: Update an idea
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Idea ID
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
 *               theme:
 *                 type: string
 *               setting:
 *                 type: string
 *               characters:
 *                 type: array
 *                 items:
 *                   type: string
 *               tone:
 *                 type: string
 *                 enum: [dramatic, mysterious, emotional, cinematic, traditional]
 *               style:
 *                 type: string
 *                 enum: [viral, educational, entertainment, cultural]
 *               targetAudience:
 *                 type: string
 *                 enum: [children, adults, family, teens]
 *     responses:
 *       200:
 *         description: Idea updated successfully
 *       404:
 *         description: Idea not found
 *       401:
 *         description: Not authenticated
 */
router.patch('/:id', authMiddleware_1.protect, ideasController_1.updateIdea);
/**
 * @swagger
 * /api/ideas/{id}:
 *   delete:
 *     summary: Delete an idea
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Idea ID
 *     responses:
 *       200:
 *         description: Idea deleted successfully
 *       404:
 *         description: Idea not found
 *       401:
 *         description: Not authenticated
 */
router.delete('/:id', authMiddleware_1.protect, ideasController_1.deleteIdea);
/**
 * @swagger
 * /api/ideas/{ideaId}/favorite:
 *   patch:
 *     summary: Toggle favorite status of an idea
 *     tags: [Ideas]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ideaId
 *         required: true
 *         schema:
 *           type: string
 *         description: Idea ID
 *     responses:
 *       200:
 *         description: Favorite status updated successfully
 *       404:
 *         description: Idea not found
 *       401:
 *         description: Not authenticated
 */
router.patch("/:ideaId/favorite", authController_1.protectedRoute, ideasController_1.toggleFavorite);
exports.default = router;
