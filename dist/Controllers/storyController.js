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
exports.getStoryById = exports.getStories = exports.generateStoryThumbnail = exports.generateStoryTitles = exports.generateStoryDescription = exports.generateChapterImagePrompts = exports.generateStoryChapter = exports.initStory = void 0;
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
// FETCH STORIES
// ==========================
const getStories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    try {
        const stories = yield storyModel_1.Story.find({ user: (_b = req.user) === null || _b === void 0 ? void 0 : _b._id }).sort({ createdAt: -1 });
        res.json(stories);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching stories", error: error.message });
    }
});
exports.getStories = getStories;
// ==========================
// FETCH ONE STORY
// ==========================
const getStoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const story = yield storyModel_1.Story.findById(req.params.id);
        if (!story)
            return res.status(404).json({ message: "Story not found" });
        res.json(story);
    }
    catch (error) {
        res.status(500).json({ message: "Error fetching story", error: error.message });
    }
});
exports.getStoryById = getStoryById;
