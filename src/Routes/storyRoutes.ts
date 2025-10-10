import express from "express";
import {
  generateChapterController,
  getFullStory,
  getStoryUserById,
  generateChapterImagePrompts,
  updateScript,
  generateViralTitle,
  generateViralThumbnailPrompts,
  generateViralShortsHooks,
  generateSEOKeywords,
  generateViralDescription
} from "../Controllers/storyController";
import { protectedRoute } from "../Controllers/authController";

const router = express.Router();

/**
 * @swagger
 * /api/story/chapters:
 *   post:
 *     summary: Generate a single chapter for a story (chapter-by-chapter)
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterNumber
 *               - totalChapters
 *             properties:
 *               storyId:
 *                 type: string
 *                 description: Existing story ID (omit if creating a new story with chapter 1)
 *               summary:
 *                 type: string
 *                 description: Required only when creating a new story (Chapter 1)
 *               chapterNumber:
 *                 type: integer
 *                 description: Current chapter number being generated
 *               totalChapters:
 *                 type: integer
 *                 description: Total number of chapters planned for the story
 *               wordsPerChapter:
 *                 type: integer
 *                 description: Approximate number of words per chapter
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
 *         description: Chapter generated successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/chapters", protectedRoute, generateChapterController);

/**
 * @swagger
 * /api/story/fullStory/{storyId}:
 *   get:
 *     summary: Get a full story (with chapters)
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Story ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for chapters
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of chapters per page
 *     responses:
 *       200:
 *         description: Story with chapters retrieved successfully
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.get("/fullStory/:storyId", protectedRoute, getFullStory);

/**
 * @swagger
 * /api/story:
 *   get:
 *     summary: Get all stories for the authenticated user
 *     tags: [Stories]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Stories retrieved successfully
 *       401:
 *         description: Not authenticated
 */
router.get("/", protectedRoute, getStoryUserById);

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
router.post(
  "/:storyId/chapters/:chapterNumber/image-prompts",
  protectedRoute,
  generateChapterImagePrompts
);

/**
 * @swagger
 * /api/story/{storyId}/viral-title:
 *   post:
 *     summary: Generate a single viral YouTube title for a story
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
 *         description: Viral title generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     storyId:
 *                       type: string
 *                     viralTitle:
 *                       type: string
 *                     updatedStory:
 *                       $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/:storyId/viral-title", protectedRoute, generateViralTitle);

/**
 * @swagger
 * /api/story/{storyId}/viral-description:
 *   post:
 *     summary: Generate a single viral YouTube description for a story
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
 *         description: Viral description generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     storyId:
 *                       type: string
 *                     viralDescription:
 *                       type: string
 *                     updatedStory:
 *                       $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/:storyId/viral-description", protectedRoute, generateViralDescription);


/**
 * @swagger
 * /api/story/{storyId}/thumbnail-prompts:
 *   post:
 *     summary: Generate viral thumbnail prompts for a story
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
 *         description: Thumbnail prompts generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     storyId:
 *                       type: string
 *                     thumbnailPrompt:
 *                       type: string
 *                     updatedStory:
 *                       $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/:storyId/thumbnail-prompts", protectedRoute, generateViralThumbnailPrompts);

/**
 * @swagger
 * /api/story/{storyId}/shorts-hooks:
 *   post:
 *     summary: Generate viral YouTube Shorts hooks for a story
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
 *         description: Shorts hooks generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     storyId:
 *                       type: string
 *                     shortsHooks:
 *                       type: array
 *                       items:
 *                         type: string
 *                     updatedStory:
 *                       $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/:storyId/shorts-hooks", protectedRoute, generateViralShortsHooks);

/**
 * @swagger
 * /api/story/{storyId}/seo-keywords:
 *   post:
 *     summary: Generate SEO keywords and hashtags for a story
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
 *         description: SEO keywords and hashtags generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     storyId:
 *                       type: string
 *                     keywords:
 *                       type: array
 *                       items:
 *                         type: string
 *                     hashtags:
 *                       type: array
 *                       items:
 *                         type: string
 *                     updatedStory:
 *                       $ref: '#/components/schemas/Story'
 *       404:
 *         description: Story not found
 *       401:
 *         description: Not authenticated
 */
router.post("/:storyId/seo-keywords", protectedRoute, generateSEOKeywords);

export default router;
