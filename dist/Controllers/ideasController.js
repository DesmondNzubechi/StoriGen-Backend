"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavorite = exports.deleteIdea = exports.updateIdea = exports.getIdeaById = exports.getIdeas = exports.getUserIdeas = exports.createIdea = exports.generateIdeas = void 0;
const Idea_1 = require("../Models/Idea");
const aiService_1 = require("../Services/aiService");
const appError_1 = require("../errors/appError");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
/**
 * Generate and auto-save ideas
 */
exports.generateIdeas = (0, catchAsync_1.default)(async (req, res, next) => {
    const { tone, style, targetAudience, niche, themes, settings } = req.body;
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const ideas = await aiService_1.AIService.generateViralIdeas({
        tone,
        style,
        targetAudience,
        niche,
        themes,
        settings,
    });
    const savedIdeas = await Promise.all(ideas.map((ideaText) => {
        const match = ideaText.match(/^\d+\.\s*\*\*(.*?)\*\*\s*(.+)$/s);
        const title = match ? match[1].trim() : "Untitled Idea";
        const content = match ? match[2].trim() : ideaText;
        return Idea_1.Idea.create({
            user: user._id,
            title,
            content,
            theme: themes || "general",
            setting: settings || "unspecified",
            characters: [],
            tone: tone || "dramatic",
            style: style || "viral",
            targetAudience: targetAudience || "adults",
            niche: niche || "general",
            favorite: false,
            status: "draft",
        });
    }));
    res.status(201).json({
        success: true,
        data: savedIdeas,
    });
});
/**
 * Create a new idea
 */
exports.createIdea = (0, catchAsync_1.default)(async (req, res) => {
    const { title, content, theme, setting, characters, tone, style, targetAudience, } = req.body;
    if (!title || !content || !theme || !setting) {
        return res.status(400).json({
            success: false,
            message: 'Title, content, theme, and setting are required',
        });
    }
    const idea = await Idea_1.Idea.create({
        user: req.user._id,
        title,
        content,
        theme,
        setting,
        characters: characters || [],
        tone: tone || 'dramatic',
        style: style || 'viral',
        targetAudience: targetAudience || 'adults',
    });
    res.status(201).json({
        success: true,
        data: { idea },
    });
});
/**
 * Get all ideas for the logged-in user
 */
exports.getUserIdeas = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const ideas = await Idea_1.Idea.find({ user: user._id }).sort({ createdAt: -1 });
    res.status(200).json({
        success: true,
        data: ideas,
    });
});
exports.getIdeas = (0, catchAsync_1.default)(async (req, res) => {
    const { page = 1, limit = 10, theme, tone, style } = req.query;
    const user = req.user;
    const filter = { user: user._id };
    if (theme)
        filter.theme = { $regex: theme, $options: 'i' };
    if (tone)
        filter.tone = tone;
    if (style)
        filter.style = style;
    const skip = (Number(page) - 1) * Number(limit);
    const ideas = await Idea_1.Idea.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    const total = await Idea_1.Idea.countDocuments(filter);
    res.status(200).json({
        success: true,
        data: {
            ideas,
            pagination: {
                currentPage: Number(page),
                totalPages: Math.ceil(total / Number(limit)),
                totalItems: total,
                hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
                hasPrevPage: Number(page) > 1,
            },
        },
    });
});
/**
 * Get a single idea by ID
 */
exports.getIdeaById = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const idea = await Idea_1.Idea.findOne({ _id: id, user: req.user._id });
    if (!idea) {
        return res.status(404).json({
            success: false,
            message: 'Idea not found',
        });
    }
    res.status(200).json({
        success: true,
        data: { idea },
    });
});
/**
 * Update an idea
 */
exports.updateIdea = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    const idea = await Idea_1.Idea.findOneAndUpdate({ _id: id, user: req.user._id }, updateData, { new: true, runValidators: true });
    if (!idea) {
        return res.status(404).json({
            success: false,
            message: 'Idea not found',
        });
    }
    res.status(200).json({
        success: true,
        data: { idea },
    });
});
/**
 * Delete an idea
 */
exports.deleteIdea = (0, catchAsync_1.default)(async (req, res) => {
    const { id } = req.params;
    const idea = await Idea_1.Idea.findOneAndDelete({ _id: id, user: req.user._id });
    if (!idea) {
        return res.status(404).json({
            success: false,
            message: 'Idea not found',
        });
    }
    res.status(200).json({
        success: true,
        message: 'Idea deleted successfully',
    });
});
/**
 * Toggle favorite for an idea
 */
exports.toggleFavorite = (0, catchAsync_1.default)(async (req, res, next) => {
    const { ideaId } = req.params;
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const idea = await Idea_1.Idea.findOne({ _id: ideaId, user: user._id });
    if (!idea) {
        return res.status(404).json({
            success: false,
            message: "Idea not found",
        });
    }
    idea.favorite = !idea.favorite;
    await idea.save();
    res.status(200).json({
        success: true,
        data: {
            idea,
            message: `Idea ${idea.favorite ? "marked as favorite" : "removed from favorites"}`,
        },
    });
});
