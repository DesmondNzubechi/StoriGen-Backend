"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const storyController_1 = require("../Controllers/storyController");
const authController_1 = require("../Controllers/authController");
const router = express_1.default.Router();
/**
 * @swagger
 * /api/story/init:
 *   post:
 *     summary: Initialize a new story
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - prompt
 *               - targetWords
 *               - targetChapters
 *             properties:
 *               prompt:
 *                 type: string
 *                 description: The story prompt/idea
 *                 example: "A young girl discovers a magical forest"
 *               targetWords:
 *                 type: number
 *                 description: Target word count for the story
 *                 example: 2000
 *               targetChapters:
 *                 type: number
 *                 description: Number of chapters to generate
 *                 example: 5
 *     responses:
 *       201:
 *         description: Story initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Story'
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/init", authController_1.protectedRoute, storyController_1.initStory);
/**
 * @swagger
 * /api/story/{storyId}/chapters:
 *   post:
 *     summary: Generate a story chapter
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterNumber
 *             properties:
 *               chapterNumber:
 *                 type: number
 *                 description: Chapter number to generate
 *                 example: 1
 *     responses:
 *       200:
 *         description: Chapter generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Chapter'
 *       404:
 *         description: Story not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       400:
 *         description: Chapter number exceeds target chapters
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:storyId/chapters", authController_1.protectedRoute, storyController_1.generateStoryChapter);
/**
 * @swagger
 * /api/story/{storyId}/chapters/{chapterNumber}/image-prompts:
 *   post:
 *     summary: Generate image prompts for chapter paragraphs
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *       - in: path
 *         name: chapterNumber
 *         required: true
 *         schema:
 *           type: number
 *         description: Chapter number
 *     responses:
 *       200:
 *         description: Image prompts generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Paragraph'
 *       404:
 *         description: Story or chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:storyId/chapters/:chapterNumber/image-prompts", authController_1.protectedRoute, storyController_1.generateChapterImagePrompts);
/**
 * @swagger
 * /api/story/{storyId}/metadata/description:
 *   post:
 *     summary: Generate YouTube description and synopsis
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Description generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 description:
 *                   type: string
 *                   description: YouTube video description
 *       404:
 *         description: Story not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:storyId/metadata/description", authController_1.protectedRoute, storyController_1.generateStoryDescription);
/**
 * @swagger
 * /api/story/{storyId}/metadata/titles:
 *   post:
 *     summary: Generate SEO-optimized YouTube titles
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Titles generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 titles:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: Array of SEO-optimized titles
 *       404:
 *         description: Story not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:storyId/metadata/titles", authController_1.protectedRoute, storyController_1.generateStoryTitles);
/**
 * @swagger
 * /api/story/{storyId}/metadata/thumbnail:
 *   post:
 *     summary: Generate thumbnail prompt
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Thumbnail prompt generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 thumbnailPrompt:
 *                   type: string
 *                   description: AI-generated thumbnail prompt
 *       404:
 *         description: Story not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/:storyId/metadata/thumbnail", authController_1.protectedRoute, storyController_1.generateStoryThumbnail);
/**
 * @swagger
 * /api/story:
 *   get:
 *     summary: Get all user stories
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Stories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Story'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/", authController_1.protectedRoute, storyController_1.getStories);
/**
 * @swagger
 * /api/story/{id}:
 *   get:
 *     summary: Get a specific story by ID
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *     responses:
 *       200:
 *         description: Story retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Not authenticated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/:id", authController_1.protectedRoute, storyController_1.getStoryById);
exports.default = router;
