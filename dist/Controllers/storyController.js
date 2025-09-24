"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoriesByStatus = exports.searchUserStories = exports.getUserStoryStats = exports.getStoryById = exports.getUserStories = exports.generateStoryThumbnail = exports.generateStoryTitles = exports.generateStoryDescription = exports.generateChapterImagePrompts = exports.generateStoryChapter = exports.initStory = void 0;
const storyModel_1 = require("../Models/storyModel");
const aiService_1 = require("../Services/aiService");
// ==========================
// INIT STORY
// ==========================
const initStory = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { prompt, targetWords, targetChapters } = req.body;
        if (!prompt || !targetWords || !targetChapters) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        // Generate outline
        const outline = yield (0, aiService_1.generateOutline)(prompt, targetWords, targetChapters);
        // Create new story doc
        const story = yield storyModel_1.Story.create({
            user: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
            prompt,
            targetWords,
            targetChapters,
            outline,
            chapters: [],
            youtubeAssets: {},
            status: "in_progress",
        });
        res.status(201).json(story);
    }
    catch (error) {
        res.status(500).json({ message: "Error initializing story", error: error.message });
    }
});
exports.initStory = initStory;
// ==========================
// GENERATE CHAPTER
// ==========================
const generateStoryChapter = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storyId } = req.params;
        const { chapterNumber } = req.body;
        const story = yield storyModel_1.Story.findById(storyId);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        if (chapterNumber > story.targetChapters) {
            return res.status(400).json({ message: "Chapter number exceeds targetChapters" });
        }
        const chapterText = yield (0, aiService_1.generateChapter)(story.outline || "", chapterNumber, story.targetChapters, story.targetWords);
        // Split chapter into paragraphs
        const paragraphs = chapterText
            .split("\n\n")
            .map((p) => p.trim())
            .filter(Boolean)
            .map((p) => ({ text: p }));
        const newChapter = {
            number: chapterNumber,
            title: `Chapter ${chapterNumber}`,
            text: chapterText,
            paragraphs,
        };
        story.chapters.push(newChapter);
        yield story.save();
        res.json(newChapter);
    }
    catch (error) {
        res.status(500).json({ message: "Error generating chapter", error: error.message });
    }
});
exports.generateStoryChapter = generateStoryChapter;
// ==========================
// GENERATE IMAGE PROMPTS (PER PARAGRAPH)
// ==========================
const generateChapterImagePrompts = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storyId, chapterNumber } = req.params;
        const story = yield storyModel_1.Story.findById(storyId);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        const chapter = story.chapters.find((c) => c.number === Number(chapterNumber));
        if (!chapter)
            return res.status(404).json({ message: "Chapter not found" });
        // Generate image prompts for each paragraph
        for (let i = 0; i < chapter.paragraphs.length; i++) {
            const imagePrompt = yield (0, aiService_1.generateImagePrompts)(chapter.paragraphs[i].text, story.prompt);
            chapter.paragraphs[i].imagePrompt = imagePrompt;
        }
        yield story.save();
        res.json(chapter.paragraphs);
    }
    catch (error) {
        res.status(500).json({ message: "Error generating image prompts", error: error.message });
    }
});
exports.generateChapterImagePrompts = generateChapterImagePrompts;
// ==========================
// GENERATE DESCRIPTION
// ==========================
const generateStoryDescription = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storyId } = req.params;
        const story = yield storyModel_1.Story.findById(storyId);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        const fullStory = story.chapters.map((c) => c.text).join("\n\n");
        const description = yield (0, aiService_1.generateDescription)(fullStory);
        story.youtubeAssets.description = description;
        yield story.save();
        res.json({ description });
    }
    catch (error) {
        res.status(500).json({ message: "Error generating description", error: error.message });
    }
});
exports.generateStoryDescription = generateStoryDescription;
// ==========================
// GENERATE TITLES
// ==========================
const generateStoryTitles = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storyId } = req.params;
        const story = yield storyModel_1.Story.findById(storyId);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        const fullStory = story.chapters.map((c) => c.text).join("\n\n");
        const titlesRaw = yield (0, aiService_1.generateTitles)(fullStory);
        const titles = titlesRaw
            .split(/\n|\r|\r\n/g)
            .map((t) => t.replace(/^[-*\d\.\)\s]+/, "").trim())
            .filter(Boolean);
        story.youtubeAssets.titles = titles;
        yield story.save();
        res.json({ titles });
    }
    catch (error) {
        res.status(500).json({ message: "Error generating titles", error: error.message });
    }
});
exports.generateStoryTitles = generateStoryTitles;
// ==========================
// GENERATE THUMBNAIL PROMPT
// ==========================
const generateStoryThumbnail = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { storyId } = req.params;
        const story = yield storyModel_1.Story.findById(storyId);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        const fullStory = story.chapters.map((c) => c.text).join("\n\n");
        const thumbnailPrompt = yield (0, aiService_1.generateThumbnailPrompt)(fullStory);
        story.youtubeAssets.thumbnailPrompt = thumbnailPrompt;
        // Final update → assets_complete
        story.status = "assets_complete";
        yield story.save();
        res.json({ thumbnailPrompt });
    }
    catch (error) {
        res.status(500).json({ message: "Error generating thumbnail prompt", error: error.message });
    }
});
exports.generateStoryThumbnail = generateStoryThumbnail;
// ==========================
// FETCH USER STORIES WITH PAGINATION
// ==========================
const getUserStories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const userId = (_b = req.user) === null || _b === void 0 ? void 0 : _b._id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const status = req.query.status;
        const search = req.query.search;
        const sortBy = req.query.sortBy || 'createdAt';
        const sortOrder = req.query.sortOrder || 'desc';
        // Build filter object
        const filter = { user: userId };
        if (status) {
            filter.status = status;
        }
        if (search) {
            filter.$or = [
                { prompt: { $regex: search, $options: 'i' } },
                { 'chapters.title': { $regex: search, $options: 'i' } }
            ];
        }
        // Build sort object
        const sort = {};
        sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
        // Calculate pagination
        const skip = (page - 1) * limit;
        // Execute query with pagination
        const stories = yield storyModel_1.Story.find(filter)
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-chapters.paragraphs.imagePrompt'); // Exclude image prompts for list view
        // Get total count for pagination
        const totalStories = yield storyModel_1.Story.countDocuments(filter);
        const totalPages = Math.ceil(totalStories / limit);
        res.json({
            stories,
            pagination: {
                currentPage: page,
                totalPages,
                totalStories,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching user stories", error: error.message });
    }
});
exports.getUserStories = getUserStories;
// ==========================
// FETCH ONE STORY BY ID (WITH USER VALIDATION)
// ==========================
const getStoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _c;
    try {
        const userId = (_c = req.user) === null || _c === void 0 ? void 0 : _c._id;
        const storyId = req.params.id;
        const story = yield storyModel_1.Story.findOne({
            _id: storyId,
            user: userId
        });
        if (!story) {
            return res.status(404).json({
                message: "Story not found or you don't have permission to access it"
            });
        }
        res.json(story);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching story", error: error.message });
    }
});
exports.getStoryById = getStoryById;
// ==========================
// FETCH USER STORY STATISTICS
// ==========================
const getUserStoryStats = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _d;
    try {
        const userId = (_d = req.user) === null || _d === void 0 ? void 0 : _d._id;
        const stats = yield storyModel_1.Story.aggregate([
            { $match: { user: userId } },
            {
                $group: {
                    _id: null,
                    totalStories: { $sum: 1 },
                    totalWords: { $sum: '$targetWords' },
                    totalChapters: { $sum: { $size: '$chapters' } },
                    completedStories: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'assets_complete'] }, 1, 0]
                        }
                    },
                    inProgressStories: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
                        }
                    },
                    chaptersCompleteStories: {
                        $sum: {
                            $cond: [{ $eq: ['$status', 'chapters_complete'] }, 1, 0]
                        }
                    }
                }
            }
        ]);
        const result = stats[0] || {
            totalStories: 0,
            totalWords: 0,
            totalChapters: 0,
            completedStories: 0,
            inProgressStories: 0,
            chaptersCompleteStories: 0
        };
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching story statistics", error: error.message });
    }
});
exports.getUserStoryStats = getUserStoryStats;
// ==========================
// SEARCH USER STORIES
// ==========================
const searchUserStories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e;
    try {
        const userId = (_e = req.user) === null || _e === void 0 ? void 0 : _e._id;
        const { q, status, dateFrom, dateTo, sortBy, sortOrder } = req.query;
        // Build search filter
        const filter = { user: userId };
        if (q) {
            filter.$or = [
                { prompt: { $regex: q, $options: 'i' } },
                { 'chapters.title': { $regex: q, $options: 'i' } },
                { 'chapters.text': { $regex: q, $options: 'i' } }
            ];
        }
        if (status) {
            filter.status = status;
        }
        if (dateFrom || dateTo) {
            filter.createdAt = {};
            if (dateFrom)
                filter.createdAt.$gte = new Date(dateFrom);
            if (dateTo)
                filter.createdAt.$lte = new Date(dateTo);
        }
        // Build sort object
        const sort = {};
        sort[sortBy || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;
        const stories = yield storyModel_1.Story.find(filter)
            .sort(sort)
            .select('-chapters.paragraphs.imagePrompt')
            .limit(50); // Limit search results
        res.json({
            stories,
            totalResults: stories.length,
            searchQuery: q
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error searching stories", error: error.message });
    }
});
exports.searchUserStories = searchUserStories;
// ==========================
// GET STORY BY STATUS
// ==========================
const getStoriesByStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _f;
    try {
        const userId = (_f = req.user) === null || _f === void 0 ? void 0 : _f._id;
        const status = req.params.status;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        // Validate status
        const validStatuses = ['in_progress', 'chapters_complete', 'assets_complete'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: "Invalid status. Must be one of: in_progress, chapters_complete, assets_complete"
            });
        }
        const skip = (page - 1) * limit;
        const stories = yield storyModel_1.Story.find({
            user: userId,
            status: status
        })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .select('-chapters.paragraphs.imagePrompt');
        const totalStories = yield storyModel_1.Story.countDocuments({
            user: userId,
            status: status
        });
        const totalPages = Math.ceil(totalStories / limit);
        res.json({
            stories,
            status,
            pagination: {
                currentPage: page,
                totalPages,
                totalStories,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            }
        });
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching stories by status", error: error.message });
    }
});
exports.getStoriesByStatus = getStoriesByStatus;
