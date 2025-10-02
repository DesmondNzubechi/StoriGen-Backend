// import express from "express";
// import {
//   initStory,
//   generateStoryChapter,
//   generateChapterImagePrompts,
//   generateStoryDescription,
//   generateStoryTitles,
//   generateStoryThumbnail,
//   getUserStories,
//   getStoryById,
//   getUserStoryStats,
//   searchUserStories,
//   getStoriesByStatus,
// } from "../Controllers/storyController";
// import { protectedRoute as protect } from "../Controllers/authController";

// const router = express.Router();

// /**
//  * @swagger
//  * /api/story/init:
//  *   post:
//  *     summary: Initialize a new story
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - prompt
//  *               - targetWords
//  *               - targetChapters
//  *             properties:
//  *               prompt:
//  *                 type: string
//  *                 description: The story prompt/idea
//  *                 example: "A young girl discovers a magical forest"
//  *               targetWords:
//  *                 type: number
//  *                 description: Target word count for the story
//  *                 example: 2000
//  *               targetChapters:
//  *                 type: number
//  *                 description: Number of chapters to generate
//  *                 example: 5
//  *     responses:
//  *       201:
//  *         description: Story initialized successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Story'
//  *       400:
//  *         description: Missing required fields
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/init", protect, initStory);

// /**
//  * @swagger
//  * /api/story/{storyId}/chapters:
//  *   post:
//  *     summary: Generate a story chapter
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: storyId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             required:
//  *               - chapterNumber
//  *             properties:
//  *               chapterNumber:
//  *                 type: number
//  *                 description: Chapter number to generate
//  *                 example: 1
//  *     responses:
//  *       200:
//  *         description: Chapter generated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Chapter'
//  *       404:
//  *         description: Story not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       400:
//  *         description: Chapter number exceeds target chapters
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/:storyId/chapters", protect, generateStoryChapter);

// /**
//  * @swagger
//  * /api/story/{storyId}/chapters/{chapterNumber}/image-prompts:
//  *   post:
//  *     summary: Generate image prompts for chapter paragraphs
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: storyId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *       - in: path
//  *         name: chapterNumber
//  *         required: true
//  *         schema:
//  *           type: number
//  *         description: Chapter number
//  *     responses:
//  *       200:
//  *         description: Image prompts generated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Paragraph'
//  *       404:
//  *         description: Story or chapter not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/:storyId/chapters/:chapterNumber/image-prompts", protect, generateChapterImagePrompts);

// /**
//  * @swagger
//  * /api/story/{storyId}/metadata/description:
//  *   post:
//  *     summary: Generate YouTube description and synopsis
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: storyId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *     responses:
//  *       200:
//  *         description: Description generated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 description:
//  *                   type: string
//  *                   description: YouTube video description
//  *       404:
//  *         description: Story not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/:storyId/metadata/description", protect, generateStoryDescription);

// /**
//  * @swagger
//  * /api/story/{storyId}/metadata/titles:
//  *   post:
//  *     summary: Generate SEO-optimized YouTube titles
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: storyId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *     responses:
//  *       200:
//  *         description: Titles generated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 titles:
//  *                   type: array
//  *                   items:
//  *                     type: string
//  *                   description: Array of SEO-optimized titles
//  *       404:
//  *         description: Story not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/:storyId/metadata/titles", protect, generateStoryTitles);

// /**
//  * @swagger
//  * /api/story/{storyId}/metadata/thumbnail:
//  *   post:
//  *     summary: Generate thumbnail prompt
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: storyId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *     responses:
//  *       200:
//  *         description: Thumbnail prompt generated successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 thumbnailPrompt:
//  *                   type: string
//  *                   description: AI-generated thumbnail prompt
//  *       404:
//  *         description: Story not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.post("/:storyId/metadata/thumbnail", protect, generateStoryThumbnail);

// /**
//  * @swagger
//  * /api/story:
//  *   get:
//  *     summary: Get user stories with pagination and filtering
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *         description: Number of stories per page
//  *       - in: query
//  *         name: status
//  *         schema:
//  *           type: string
//  *           enum: [in_progress, chapters_complete, assets_complete]
//  *         description: Filter by story status
//  *       - in: query
//  *         name: search
//  *         schema:
//  *           type: string
//  *         description: Search in story prompt and chapter titles
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *           default: createdAt
//  *         description: Field to sort by
//  *       - in: query
//  *         name: sortOrder
//  *         schema:
//  *           type: string
//  *           enum: [asc, desc]
//  *           default: desc
//  *         description: Sort order
//  *     responses:
//  *       200:
//  *         description: Stories retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 stories:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Story'
//  *                 pagination:
//  *                   type: object
//  *                   properties:
//  *                     currentPage:
//  *                       type: integer
//  *                     totalPages:
//  *                       type: integer
//  *                     totalStories:
//  *                       type: integer
//  *                     hasNextPage:
//  *                       type: boolean
//  *                     hasPrevPage:
//  *                       type: boolean
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/", protect, getUserStories);

// /**
//  * @swagger
//  * /api/story/{id}:
//  *   get:
//  *     summary: Get a specific story by ID
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Story ID
//  *     responses:
//  *       200:
//  *         description: Story retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Story'
//  *       404:
//  *         description: Story not found
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/:id", protect, getStoryById);

// /**
//  * @swagger
//  * /api/story/stats:
//  *   get:
//  *     summary: Get user story statistics
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     responses:
//  *       200:
//  *         description: Story statistics retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 totalStories:
//  *                   type: integer
//  *                   description: Total number of stories
//  *                 totalWords:
//  *                   type: integer
//  *                   description: Total words across all stories
//  *                 totalChapters:
//  *                   type: integer
//  *                   description: Total chapters across all stories
//  *                 completedStories:
//  *                   type: integer
//  *                   description: Number of completed stories
//  *                 inProgressStories:
//  *                   type: integer
//  *                   description: Number of in-progress stories
//  *                 chaptersCompleteStories:
//  *                   type: integer
//  *                   description: Number of stories with chapters complete
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/stats", protect, getUserStoryStats);

// /**
//  * @swagger
//  * /api/story/search:
//  *   get:
//  *     summary: Search user stories
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: query
//  *         name: q
//  *         schema:
//  *           type: string
//  *         description: Search query
//  *       - in: query
//  *         name: status
//  *         schema:
//  *           type: string
//  *           enum: [in_progress, chapters_complete, assets_complete]
//  *         description: Filter by status
//  *       - in: query
//  *         name: dateFrom
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: Filter stories from this date
//  *       - in: query
//  *         name: dateTo
//  *         schema:
//  *           type: string
//  *           format: date
//  *         description: Filter stories to this date
//  *       - in: query
//  *         name: sortBy
//  *         schema:
//  *           type: string
//  *           default: createdAt
//  *         description: Field to sort by
//  *       - in: query
//  *         name: sortOrder
//  *         schema:
//  *           type: string
//  *           enum: [asc, desc]
//  *           default: desc
//  *         description: Sort order
//  *     responses:
//  *       200:
//  *         description: Search results retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 stories:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Story'
//  *                 totalResults:
//  *                   type: integer
//  *                 searchQuery:
//  *                   type: string
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/search", protect, searchUserStories);

// /**
//  * @swagger
//  * /api/story/status/{status}:
//  *   get:
//  *     summary: Get stories by status
//  *     tags: [Stories]
//  *     security:
//  *       - bearerAuth: []
//  *       - cookieAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: status
//  *         required: true
//  *         schema:
//  *           type: string
//  *           enum: [in_progress, chapters_complete, assets_complete]
//  *         description: Story status
//  *       - in: query
//  *         name: page
//  *         schema:
//  *           type: integer
//  *           default: 1
//  *         description: Page number for pagination
//  *       - in: query
//  *         name: limit
//  *         schema:
//  *           type: integer
//  *           default: 10
//  *         description: Number of stories per page
//  *     responses:
//  *       200:
//  *         description: Stories retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: object
//  *               properties:
//  *                 stories:
//  *                   type: array
//  *                   items:
//  *                     $ref: '#/components/schemas/Story'
//  *                 status:
//  *                   type: string
//  *                 pagination:
//  *                   type: object
//  *                   properties:
//  *                     currentPage:
//  *                       type: integer
//  *                     totalPages:
//  *                       type: integer
//  *                     totalStories:
//  *                       type: integer
//  *                     hasNextPage:
//  *                       type: boolean
//  *                     hasPrevPage:
//  *                       type: boolean
//  *       400:
//  *         description: Invalid status
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  *       401:
//  *         description: Not authenticated
//  *         content:
//  *           application/json:
//  *             schema:
//  *               $ref: '#/components/schemas/Error'
//  */
// router.get("/status/:status", protect, getStoriesByStatus);

// export default router;


import express from 'express';
import {
  generateChapterController,
  getFullStory,
 // getScript,
  getStoryUserById,
  updateScript
} from '../Controllers/storyController';
import { protectedRoute } from '../Controllers/authController';
// import { authenticate } from '../middleware/auth';

const router = express.Router();

/**
 * @swagger
 * /api/stories/chapters:
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
router.post('/chapters', protectedRoute, generateChapterController);
 
/**
 * @swagger
 * /api/stories/fullStory/{storyId}:
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
router.get('/fullStory/:storyId', protectedRoute, getFullStory);
/**
 * @swagger
 * /api/stories:
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
router.get('/', protectedRoute, getStoryUserById);

// /**
//  * @swagger
//  * /api/scripts/{summaryId}:
//  *   get:
//  *     summary: Get script information
//  *     tags: [Scripts]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: summaryId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Summary ID
//  *     responses:
//  *       200:
//  *         description: Script information retrieved successfully
//  *       404:
//  *         description: Script not found
//  *       401:
//  *         description: Not authenticated
//  */
// router.get('/:summaryId', protectedRoute, getScript);

// /**
//  * @swagger
//  * /api/scripts/{summaryId}:
//  *   patch:
//  *     summary: Update script settings
//  *     tags: [Scripts]
//  *     security:
//  *       - bearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: summaryId
//  *         required: true
//  *         schema:
//  *           type: string
//  *         description: Summary ID
//  *     requestBody:
//  *       required: true
//  *       content:
//  *         application/json:
//  *           schema:
//  *             type: object
//  *             properties:
//  *               totalChapters:
//  *                 type: integer
//  *                 minimum: 1
//  *                 maximum: 50
//  *                 description: Total number of chapters for the script
//  *               title:
//  *                 type: string
//  *                 description: Script title
//  *     responses:
//  *       200:
//  *         description: Script updated successfully
//  *       404:
//  *         description: Script not found
//  *       401:
//  *         description: Not authenticated
//  */
// router.patch('/:summaryId', protectedRoute, updateScript);

export default router;

