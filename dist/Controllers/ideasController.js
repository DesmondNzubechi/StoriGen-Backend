"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleFavorite = exports.deleteIdea = exports.updateIdea = exports.getIdeaById = exports.getIdeas = exports.getUserIdeas = exports.createIdea = exports.generateIdeas = void 0;
const Idea_1 = require("../Models/Idea");
const aiService_1 = require("../Services/aiService");
const appError_1 = require("../errors/appError");
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
/**
 * Generate and auto-save ideas
 */
const generateIdeas = async (req, res, next) => {
    try {
        const { tone, style, targetAudience, niche, themes, settings } = req.body;
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user)
            return;
        // Generate ideas with AI (returns string[])
        const ideas = await aiService_1.AIService.generateViralIdeas({
            tone,
            style,
            targetAudience,
            niche,
            themes,
            settings,
        });
        // Parse and save each idea
        const savedIdeas = await Promise.all(ideas.map((ideaText) => {
            // Extract title and content
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
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error generating ideas",
            error: error.message,
        });
    }
};
exports.generateIdeas = generateIdeas;
/**
 * Create a new idea
 */
const createIdea = async (req, res) => {
    try {
        const { title, content, theme, setting, characters, tone, style, targetAudience } = req.body;
        if (!title || !content || !theme || !setting) {
            return res.status(400).json({
                success: false,
                message: 'Title, content, theme, and setting are required'
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
            targetAudience: targetAudience || 'adults'
        });
        res.status(201).json({
            success: true,
            data: { idea }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating idea',
            error: error.message
        });
    }
};
exports.createIdea = createIdea;
/**
 * Get all ideas for the logged-in user
 */
const getUserIdeas = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user)
            return;
        const ideas = await Idea_1.Idea.find({ user: user._id }).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            data: ideas,
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching user ideas",
            error: error.message,
        });
    }
};
exports.getUserIdeas = getUserIdeas;
const getIdeas = async (req, res) => {
    try {
        const { page = 1, limit = 10, theme, tone, style } = req.query;
        const filter = { user: req.user._id };
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
                    hasPrevPage: Number(page) > 1
                }
            }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching ideas',
            error: error.message
        });
    }
};
exports.getIdeas = getIdeas;
/**
 * Get a single idea by ID
 */
const getIdeaById = async (req, res) => {
    try {
        const { id } = req.params;
        const idea = await Idea_1.Idea.findOne({ _id: id, user: req.user._id });
        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { idea }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching idea',
            error: error.message
        });
    }
};
exports.getIdeaById = getIdeaById;
/**
 * Update an idea
 */
const updateIdea = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        const idea = await Idea_1.Idea.findOneAndUpdate({ _id: id, user: req.user._id }, updateData, { new: true, runValidators: true });
        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { idea }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating idea',
            error: error.message
        });
    }
};
exports.updateIdea = updateIdea;
/**
 * Delete an idea
 */
const deleteIdea = async (req, res) => {
    try {
        const { id } = req.params;
        const idea = await Idea_1.Idea.findOneAndDelete({ _id: id, user: req.user._id });
        if (!idea) {
            return res.status(404).json({
                success: false,
                message: 'Idea not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Idea deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting idea',
            error: error.message
        });
    }
};
exports.deleteIdea = deleteIdea;
/**
 * Toggle favorite for an idea
 */
const toggleFavorite = async (req, res, next) => {
    try {
        const { ideaId } = req.params;
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user)
            return;
        // Find the idea belonging to user
        const idea = await Idea_1.Idea.findOne({ _id: ideaId, user: user._id });
        if (!idea) {
            return res.status(404).json({
                success: false,
                message: "Idea not found",
            });
        }
        // Toggle favorite
        idea.favorite = !idea.favorite;
        await idea.save();
        res.status(200).json({
            success: true,
            data: {
                idea,
                message: `Idea ${idea.favorite ? "marked as favorite" : "removed from favorites"}`
            },
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating favorite status",
            error: error.message,
        });
    }
};
exports.toggleFavorite = toggleFavorite;
