"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateChapterImagePrompts = exports.generateSEOKeywords = exports.generateViralShortsHooks = exports.generateViralThumbnailPrompts = exports.generateViralDescription = exports.generateViralTitle = exports.updateScript = exports.getStoryUserById = exports.getFullStory = exports.generateChapterController = void 0;
const storyModel_1 = require("../Models/storyModel");
const Summary_1 = require("../Models/Summary");
const aiService_1 = require("../Services/aiService");
const appError_1 = require("../errors/appError");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.generateChapterController = (0, catchAsync_1.default)(async (req, res, next) => {
    const { storyId, summary, summaryId, chapterNumber, totalChapters, wordsPerChapter, customizations = {} } = req.body;
    if (!chapterNumber || !totalChapters) {
        return res.status(400).json({
            success: false,
            message: "chapterNumber and totalChapters are required",
        });
    }
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    let story;
    let summaryContent;
    let storyCustomizations = {};
    // If storyId exists → fetch story, outline, and last chapter summary
    if (storyId) {
        story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        summaryContent = story.summary;
        // Use stored customizations from story
        storyCustomizations = {
            title: story.storyTitle,
            characters: story.characters || [],
            settings: story.settings || [],
            themes: story.themes || [],
            tone: story.tone || "dramatic",
            niche: story.niche,
        };
    }
    else {
        // Handle summary input: either from summaryId (DB) or summary (direct)
        if (summaryId) {
            // Fetch summary from database
            const summaryDoc = await Summary_1.Summary.findOne({ _id: summaryId, user: user._id });
            if (!summaryDoc) {
                return res.status(404).json({
                    success: false,
                    message: "Summary not found",
                });
            }
            summaryContent = summaryDoc.content;
            // Extract customizations from stored summary
            storyCustomizations = {
                title: summaryDoc.title,
                characters: summaryDoc.mainCharacters,
                settings: [], // Can be extracted from summary content if needed
                themes: summaryDoc.themes,
                tone: customizations.tone || "dramatic", // Use from request or default
                niche: summaryDoc.niche,
            };
        }
        else if (summary) {
            // Use summary directly from request
            summaryContent = summary;
            // Use customizations from request
            storyCustomizations = {
                title: customizations.title,
                characters: customizations.characters || [],
                settings: customizations.settings ? (Array.isArray(customizations.settings) ? customizations.settings : [customizations.settings]) : [],
                themes: customizations.themes ? (Array.isArray(customizations.themes) ? customizations.themes : [customizations.themes]) : [],
                tone: customizations.tone || "dramatic",
                niche: customizations.niche,
            };
        }
        else {
            return res.status(400).json({
                success: false,
                message: "Either summary, summaryId, or storyId is required",
            });
        }
        // At this point, summaryContent is guaranteed to be assigned
        if (!summaryContent) {
            return res.status(400).json({
                success: false,
                message: "Summary content is required",
            });
        }
        // Must be first chapter to create new story
        if (chapterNumber !== 1) {
            return res.status(400).json({
                success: false,
                message: "You must start with Chapter 1 when creating a new story",
            });
        }
        // Generate enhanced outline with metadata
        const outlineResult = await aiService_1.AIService.generateEnhancedOutline(summaryContent, totalChapters, storyCustomizations);
        if (!outlineResult || !outlineResult.outline || outlineResult.outline.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Failed to generate outline",
            });
        }
        // Create new story with metadata
        story = await storyModel_1.Story.create({
            user: user._id,
            prompt: summaryContent,
            targetWords: (wordsPerChapter || 500) * totalChapters,
            totalChapters: totalChapters,
            summary: summaryContent,
            outline: outlineResult.outline,
            storyTitle: outlineResult.metadata.title,
            characters: outlineResult.metadata.characters,
            settings: outlineResult.metadata.settings,
            themes: outlineResult.metadata.themes,
            tone: outlineResult.metadata.tone,
            niche: storyCustomizations.niche,
            chapters: [],
            status: "in_progress",
        });
    }
    // Enforce sequential generation
    if (chapterNumber > 1) {
        const previousChapterExists = story.chapters.some((ch) => ch.number === chapterNumber - 1);
        if (!previousChapterExists) {
            return res.status(400).json({
                success: false,
                message: `You must generate Chapter ${chapterNumber - 1} before generating Chapter ${chapterNumber}.`,
            });
        }
    }
    // Prevent duplicates
    if (story.chapters.some((ch) => ch.number === chapterNumber)) {
        return res.status(400).json({
            success: false,
            message: `Chapter ${chapterNumber} already exists.`,
        });
    }
    // Get outline item for this chapter
    const outlineItem = story.outline[chapterNumber - 1];
    if (!outlineItem) {
        return res.status(400).json({
            success: false,
            message: `Outline for Chapter ${chapterNumber} not found.`,
        });
    }
    // Get last chapter summary for continuity (for subsequent chapters)
    const lastChapter = story.chapters
        .sort((a, b) => b.number - a.number)
        .find((ch) => ch.number === chapterNumber - 1);
    const lastChapterSummary = lastChapter === null || lastChapter === void 0 ? void 0 : lastChapter.summary;
    // Generate chapter with outline + last chapter summary (not full story)
    const chapter = await aiService_1.AIService.generateChapter(summaryContent, chapterNumber, story.totalChapters, outlineItem.description, {
        storyOutline: story.outline,
        lastChapterSummary: lastChapterSummary,
        wordsPerChapter: wordsPerChapter || 500,
        storyMetadata: {
            title: story.storyTitle,
            characters: story.characters || [],
            settings: story.settings || [],
            themes: story.themes || [],
            tone: story.tone,
            niche: story.niche,
        },
    });
    // Append chapter with summary
    story.chapters.push({
        number: chapterNumber,
        title: chapter.title,
        content: chapter.content,
        summary: chapter.summary, // Store chapter summary for continuity
        wordCount: chapter.wordCount,
        paragraphs: chapter.paragraphs,
    });
    // Mark completed if last chapter
    if (chapterNumber === story.totalChapters) {
        story.status = "completed";
    }
    await story.save();
    res.status(201).json({
        success: true,
        data: {
            storyId: story._id,
            chapter,
        },
    });
});
/**
 * Get all chapters for a script
 */
const getFullStory = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find the story with chapters
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Pagination for chapters (optional)
        const skip = (Number(page) - 1) * Number(limit);
        const total = story.chapters.length;
        const paginatedChapters = story.chapters
            .sort((a, b) => a.number - b.number)
            .slice(skip, skip + Number(limit));
        res.status(200).json({
            success: true,
            data: {
                story: story,
                // story: {
                //   _id: story._id,
                //   prompt: story.prompt,
                //   summary: story.summary,
                //   outline: story.outline,
                //   targetWords: story.targetWords,
                //   targetChapters: story.totalChapters,
                //   characterProfile: story.characterProfile,
                //   youtubeAssets: story.youtubeAssets,
                //   status: story.status,
                //   chapterImagePrompts: story.chapterImagePrompts,
                //   createdAt: story.createdAt,
                //   updatedAt: story.updatedAt,
                //   chapters: paginatedChapters,
                // },
                // pagination: {
                //   currentPage: Number(page),
                //   totalPages: Math.ceil(total / Number(limit)),
                //   totalItems: total,
                //   hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
                //   hasPrevPage: Number(page) > 1,
                // },
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching story",
            error: error.message,
        });
    }
};
exports.getFullStory = getFullStory;
/**
 * Get a story by ID
 */
const getStoryUserById = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story by ID & ownership
        const story = await storyModel_1.Story.find({ user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found for this particular user",
            });
        }
        console.log("All my story", story);
        res.status(200).json({
            success: true,
            data: story,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching story",
            error: error.message,
        });
    }
};
exports.getStoryUserById = getStoryUserById;
/**
 * Update script settings
 */
const updateScript = async (req, res, next) => {
    try {
        const { summaryId } = req.params;
        const { totalChapters, title } = req.body;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const script = await storyModel_1.Story.findOneAndUpdate({ summary: summaryId, user: user._id }, { targetChapters: totalChapters, title }, { new: true, runValidators: true }).populate('summary', 'title content');
        if (!script) {
            return res.status(404).json({
                success: false,
                message: 'Script not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { script }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating script',
            error: error.message
        });
    }
};
exports.updateScript = updateScript;
//GENERATE STORY TITLE
// === Generate Single Viral Title ===
const generateViralTitle = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Generate single viral title using story outline and metadata (not full story)
        const viralTitle = await aiService_1.AIService.generateViralTitle({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
            },
        });
        // Update story - store in youtubeAssets.titles array (first element)
        if (!story.youtubeAssets.titles) {
            story.youtubeAssets.titles = [];
        }
        const hadExistingTitle = story.youtubeAssets.titles.length > 0;
        story.youtubeAssets.titles = [viralTitle];
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExistingTitle
                ? "Viral title regenerated and replaced successfully"
                : "Viral title generated successfully",
            data: {
                storyId: story._id,
                viralTitle: viralTitle,
                replacedExisting: hadExistingTitle,
                updatedStory: story
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating viral title",
            error: err.message
        });
    }
};
exports.generateViralTitle = generateViralTitle;
// === Generate Viral Description (with SEO Keywords & Hashtags) ===
const generateViralDescription = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Generate description using story outline and metadata (not full story)
        const descriptionResponse = await aiService_1.AIService.generateDescription({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
            },
        });
        // Clean and format response (optional)
        const description = descriptionResponse.trim();
        // Generate SEO (keywords + hashtags) alongside description using the same context
        const seoResult = await aiService_1.AIService.generateSEOKeywords({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
            },
        });
        const { keywords = [], hashtags = [] } = seoResult || {};
        // Detect existing values for regenerate messaging
        const hadExistingDescription = Boolean(story.youtubeAssets.description && story.youtubeAssets.description.length > 0);
        const hadExistingSEO = (Array.isArray(story.youtubeAssets.hashtags) && story.youtubeAssets.hashtags.length > 0) ||
            (Array.isArray(story.youtubeAssets.keywords) && story.youtubeAssets.keywords.length > 0);
        // Update story with new viral description, keywords and hashtags (stored together under youtubeAssets)
        story.youtubeAssets.description = description;
        story.youtubeAssets.keywords = keywords;
        story.youtubeAssets.hashtags = hashtags;
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExistingDescription || hadExistingSEO
                ? "Viral description and SEO regenerated and replaced successfully"
                : "Viral description and SEO generated successfully",
            data: {
                storyId: story._id,
                viralDescription: description,
                keywords,
                hashtags,
                replacedExisting: hadExistingDescription || hadExistingSEO,
                updatedStory: story,
            },
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating viral description and SEO",
            error: err.message,
        });
    }
};
exports.generateViralDescription = generateViralDescription;
// === Generate Viral Thumbnail Prompts ===
const generateViralThumbnailPrompts = async (req, res, next) => {
    var _a;
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Ensure character details exist - generate if missing
        let characterDetails = story.characterDetails || [];
        if (characterDetails.length === 0 && story.characters && story.characters.length > 0) {
            characterDetails = await aiService_1.AIService.generateCharacterDetailsFromOutline(story.outline, {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
                niche: story.niche,
            }, story.summary);
            // Save generated character details to story
            if (characterDetails.length > 0) {
                story.characterDetails = characterDetails.map(char => ({
                    ...char,
                    lastUpdatedChapter: 0,
                    updateReason: 'Auto-generated from story outline'
                }));
                await story.save();
            }
        }
        // Get stored character details for consistency
        const storedCharacterDetails = characterDetails.map((char) => ({
            name: char.name,
            age: char.age,
            skinTone: char.skinTone,
            ethnicity: char.ethnicity,
            attire: char.attire,
            facialFeatures: char.facialFeatures,
            physicalTraits: char.physicalTraits,
            otherDetails: char.otherDetails,
        }));
        // Generate thumbnail prompt using story outline, metadata, and character details
        const videoTitle = ((_a = story.youtubeAssets.titles) === null || _a === void 0 ? void 0 : _a[0]) || story.storyTitle; // Use first title if available, otherwise story title
        const hadExistingThumbnail = Boolean(story.youtubeAssets.thumbnailPrompt && story.youtubeAssets.thumbnailPrompt.length > 0);
        const thumbnailPrompt = await aiService_1.AIService.generateThumbnailPrompt({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
            },
            videoTitle: videoTitle,
            storedCharacterDetails: storedCharacterDetails,
        });
        // Update story
        story.youtubeAssets.thumbnailPrompt = thumbnailPrompt;
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExistingThumbnail
                ? "Viral thumbnail prompt regenerated and replaced successfully"
                : "Viral thumbnail prompt generated successfully",
            data: {
                storyId: story._id,
                thumbnailPrompt: thumbnailPrompt,
                replacedExisting: hadExistingThumbnail,
                updatedStory: story
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating thumbnail prompt",
            error: err.message
        });
    }
};
exports.generateViralThumbnailPrompts = generateViralThumbnailPrompts;
// === Generate Viral YouTube Shorts Hooks ===
const generateViralShortsHooks = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Ensure character details exist - generate if missing
        let characterDetails = story.characterDetails || [];
        if (characterDetails.length === 0 && story.characters && story.characters.length > 0) {
            characterDetails = await aiService_1.AIService.generateCharacterDetailsFromOutline(story.outline, {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
                niche: story.niche,
            }, story.summary);
            // Save generated character details to story
            if (characterDetails.length > 0) {
                story.characterDetails = characterDetails.map(char => ({
                    ...char,
                    lastUpdatedChapter: 0,
                    updateReason: 'Auto-generated from story outline'
                }));
                await story.save();
            }
        }
        // Get stored character details for consistency
        const storedCharacterDetails = characterDetails.map((char) => ({
            name: char.name,
            age: char.age,
            skinTone: char.skinTone,
            ethnicity: char.ethnicity,
            attire: char.attire,
            facialFeatures: char.facialFeatures,
            physicalTraits: char.physicalTraits,
            otherDetails: char.otherDetails,
        }));
        // Generate single shorts hook + image prompts using story outline, metadata, and character details
        const hookResult = await aiService_1.AIService.generateShortsHooks({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
                niche: story.niche,
            },
            storedCharacterDetails: storedCharacterDetails,
        });
        if (!hookResult) {
            return res.status(500).json({
                success: false,
                message: "Failed to generate shorts hook",
            });
        }
        // Update story (store as an array of one structured hook object)
        const hadExistingHooks = Array.isArray(story.youtubeAssets.shortsHooks) && story.youtubeAssets.shortsHooks.length > 0;
        story.youtubeAssets.shortsHooks = [
            {
                hook: hookResult.hook,
                imagePrompts: hookResult.imagePrompts || [],
            },
        ];
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExistingHooks
                ? "Viral shorts hooks regenerated and replaced successfully"
                : "Viral shorts hooks generated successfully",
            data: {
                storyId: story._id,
                shortsHooks: story.youtubeAssets.shortsHooks,
                replacedExisting: hadExistingHooks,
                updatedStory: story
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating shorts hooks",
            error: err.message
        });
    }
};
exports.generateViralShortsHooks = generateViralShortsHooks;
// === Generate SEO Keywords and Hashtags ===
const generateSEOKeywords = async (req, res, next) => {
    try {
        const { storyId } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Generate SEO keywords and hashtags using story outline and metadata (not full story)
        const seoResult = await aiService_1.AIService.generateSEOKeywords({
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
            },
        });
        const { keywords, hashtags } = seoResult;
        // Update story with keywords and hashtags
        const hadExistingSEO = (Array.isArray(story.youtubeAssets.hashtags) && story.youtubeAssets.hashtags.length > 0) ||
            (Array.isArray(story.youtubeAssets.keywords) && story.youtubeAssets.keywords.length > 0);
        story.youtubeAssets.hashtags = hashtags;
        story.youtubeAssets.keywords = keywords;
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExistingSEO
                ? "SEO keywords and hashtags regenerated and replaced successfully"
                : "SEO keywords and hashtags generated successfully",
            data: {
                storyId: story._id,
                keywords: keywords,
                hashtags: hashtags,
                replacedExisting: hadExistingSEO,
                updatedStory: story
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating SEO keywords and hashtags",
            error: err.message
        });
    }
};
exports.generateSEOKeywords = generateSEOKeywords;
// === Generate Chapter Image Prompts ===
const generateChapterImagePrompts = async (req, res, next) => {
    try {
        const { storyId, chapterNumber } = req.params;
        const user = req.user;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        // Find story and verify ownership
        const story = await storyModel_1.Story.findOne({ _id: storyId, user: user._id });
        if (!story) {
            return res.status(404).json({
                success: false,
                message: "Story not found",
            });
        }
        // Find the specific chapter
        const chapter = story.chapters.find(ch => ch.number === parseInt(chapterNumber));
        if (!chapter) {
            return res.status(404).json({
                success: false,
                message: `Chapter ${chapterNumber} not found`,
            });
        }
        // Ensure character details exist - generate if missing
        let characterDetails = story.characterDetails || [];
        if (characterDetails.length === 0 && story.characters && story.characters.length > 0) {
            characterDetails = await aiService_1.AIService.generateCharacterDetailsFromOutline(story.outline, {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
                niche: story.niche,
            }, story.summary);
            // Save generated character details to story
            if (characterDetails.length > 0) {
                story.characterDetails = characterDetails.map(char => ({
                    ...char,
                    lastUpdatedChapter: parseInt(chapterNumber),
                    updateReason: 'Auto-generated from story outline'
                }));
                await story.save();
            }
        }
        // Get stored character details for consistency
        const storedCharacterDetails = characterDetails.map((char) => ({
            name: char.name,
            age: char.age,
            skinTone: char.skinTone,
            ethnicity: char.ethnicity,
            attire: char.attire,
            facialFeatures: char.facialFeatures,
            physicalTraits: char.physicalTraits,
            otherDetails: char.otherDetails,
        }));
        // Generate image prompts for the chapter using outline, metadata, and stored character details
        const imagePromptsResponse = await aiService_1.AIService.generateImagePrompts(chapter.content, {
            storyOutline: story.outline,
            storyMetadata: {
                title: story.storyTitle,
                characters: story.characters || [],
                settings: story.settings || [],
                themes: story.themes || [],
                tone: story.tone,
                niche: story.niche,
            },
            storedCharacterDetails: storedCharacterDetails,
            chapterNumber: parseInt(chapterNumber),
        });
        // Parse the response to extract individual prompts
        const prompts = imagePromptsResponse
            .split(/\n|\r|\r\n/g)
            .map((p) => p.replace(/^[-*\d\.\)\s]+/, "").trim())
            .filter(Boolean);
        // Extract character details from the generated prompts
        const characterNames = story.characters || [];
        if (characterNames.length > 0 && prompts.length > 0) {
            const extractedDetails = await aiService_1.AIService.extractCharacterDetails(prompts, characterNames, storedCharacterDetails);
            // Update character details in story
            // Only update if new details are found or if there's a meaningful story reason
            const currentChapterNum = parseInt(chapterNumber);
            const outlineItem = story.outline.find((item) => item.number === currentChapterNum);
            const hasPlotChange = (outlineItem === null || outlineItem === void 0 ? void 0 : outlineItem.purpose) === 'climax' || (outlineItem === null || outlineItem === void 0 ? void 0 : outlineItem.purpose) === 'resolution';
            extractedDetails.forEach((newChar) => {
                const existingIndex = story.characterDetails.findIndex((char) => char.name.toLowerCase() === newChar.name.toLowerCase());
                if (existingIndex >= 0) {
                    // Check if update is needed (only update if new details are provided or plot requires change)
                    const existing = story.characterDetails[existingIndex];
                    let needsUpdate = false;
                    let updateReason = '';
                    // Check each field for updates
                    if (newChar.age && newChar.age !== existing.age) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
                    }
                    if (newChar.skinTone && newChar.skinTone !== existing.skinTone) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
                    }
                    if (newChar.ethnicity && newChar.ethnicity !== existing.ethnicity) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
                    }
                    if (newChar.attire && newChar.attire !== existing.attire) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot-driven attire change' : 'New detail found';
                    }
                    if (newChar.facialFeatures && newChar.facialFeatures !== existing.facialFeatures) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
                    }
                    if (newChar.physicalTraits && newChar.physicalTraits !== existing.physicalTraits) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot-driven transformation' : 'New detail found';
                    }
                    if (newChar.otherDetails && newChar.otherDetails !== existing.otherDetails) {
                        needsUpdate = true;
                        updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
                    }
                    // Only update if there's a meaningful reason
                    if (needsUpdate && (hasPlotChange || !existing.age || !existing.skinTone || !existing.ethnicity || !existing.attire || !existing.facialFeatures)) {
                        story.characterDetails[existingIndex] = {
                            ...existing,
                            ...newChar,
                            lastUpdatedChapter: currentChapterNum,
                            updateReason: updateReason,
                        };
                    }
                }
                else {
                    // Add new character details
                    story.characterDetails.push({
                        name: newChar.name,
                        age: newChar.age,
                        skinTone: newChar.skinTone,
                        ethnicity: newChar.ethnicity,
                        attire: newChar.attire,
                        facialFeatures: newChar.facialFeatures,
                        physicalTraits: newChar.physicalTraits,
                        otherDetails: newChar.otherDetails,
                        lastUpdatedChapter: currentChapterNum,
                        updateReason: 'Initial character introduction',
                    });
                }
            });
        }
        // Create chapter image prompts entry
        const chapterImagePrompts = {
            chapter: parseInt(chapterNumber),
            prompts: prompts
        };
        // Check if there were existing prompts for this chapter
        const hadExisting = story.chapterImagePrompts.some((cip) => cip.chapter === parseInt(chapterNumber));
        // Remove existing prompts for this chapter if any
        story.chapterImagePrompts = story.chapterImagePrompts.filter((cip) => cip.chapter !== parseInt(chapterNumber));
        // Add new prompts
        story.chapterImagePrompts.push(chapterImagePrompts);
        await story.save();
        res.status(200).json({
            success: true,
            message: hadExisting
                ? `Image prompts regenerated and replaced for Chapter ${chapterNumber}`
                : `Image prompts generated successfully for Chapter ${chapterNumber}`,
            data: {
                storyId: story._id,
                chapterNumber: parseInt(chapterNumber),
                imagePrompts: prompts,
                replacedExisting: hadExisting,
                updatedStory: story
            }
        });
    }
    catch (err) {
        res.status(500).json({
            success: false,
            message: "Error generating chapter image prompts",
            error: err.message
        });
    }
};
exports.generateChapterImagePrompts = generateChapterImagePrompts;
