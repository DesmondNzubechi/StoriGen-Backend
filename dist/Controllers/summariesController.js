"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSummary = exports.updateSummary = exports.getSummaryById = exports.getSummaries = exports.generateSummary = void 0;
const Summary_1 = require("../Models/Summary");
const aiService_1 = require("../Services/aiService");
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const appError_1 = require("../errors/appError");
//import { AuthenticatedRequest } from '../middleware/authMiddleware';
/**
 * Generate summary from an idea
 */
/**
 * Generate summary from an idea using AIService
 */
const generateSummary = async (req, res, next) => {
    try {
        const { idea, customizations = {} } = req.body;
        const { tone, style, targetAudience, niche, themes, settings } = customizations;
        if (!idea) {
            return res.status(400).json({
                success: false,
                message: 'Idea is required',
            });
        }
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        // Fetch idea tied to this user
        // const idea = await Idea.findOne({ _id: ideaId, user: user._id });
        // if (!idea) {
        //   return res.status(404).json({
        //     success: false,
        //     message: 'Idea not found',
        //   });
        // }
        // Ask AI to generate summary
        const summaryData = await aiService_1.AIService.generateViralSummary(idea.content, {
            tone,
            style,
            targetAudience,
            niche,
            themes,
            settings,
        });
        console.log("AI summary data:", summaryData);
        // Validate AI response
        if (!summaryData || typeof summaryData !== 'object') {
            return res.status(500).json({
                success: false,
                message: 'AI did not return a valid summary object',
                raw: summaryData,
            });
        }
        // Save to DB (spread dynamic keys)
        const summary = await Summary_1.Summary.create({
            user: user._id,
            idea,
            ...summaryData,
        });
        res.status(201).json({
            success: true,
            data: summary,
        });
    }
    catch (error) {
        console.error('Error generating summary:', error);
        res.status(500).json({
            success: false,
            message: 'Error generating summary',
            error: error.message,
        });
    }
};
exports.generateSummary = generateSummary;
/**
 * Get all summaries for the authenticated user
 */
const getSummaries = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        const summaries = await Summary_1.Summary.find({ user: user._id })
            .populate('idea', 'title theme setting')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Summary_1.Summary.countDocuments({ user: user._id });
        res.status(200).json({
            success: true,
            data: summaries,
            // pagination: {
            //   currentPage: Number(page),
            //   totalPages: Math.ceil(total / Number(limit)),
            //   totalItems: total,
            //   hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
            //   hasPrevPage: Number(page) > 1
            // }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching summaries',
            error: error.message
        });
    }
};
exports.getSummaries = getSummaries;
/**
 * Get a single summary by ID
 */
const getSummaryById = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    try {
        const { id } = req.params;
        const summary = await Summary_1.Summary.findOne({ _id: id, user: user._id })
            .populate('idea', 'title theme setting characters');
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'Summary not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { summary }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching summary',
            error: error.message
        });
    }
};
exports.getSummaryById = getSummaryById;
/**
 * Update a summary
 */
const updateSummary = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    try {
        const { id } = req.params;
        const updateData = req.body;
        const summary = await Summary_1.Summary.findOneAndUpdate({ _id: id, user: user._id }, updateData, { new: true, runValidators: true }).populate('idea', 'title theme setting');
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'Summary not found'
            });
        }
        res.status(200).json({
            success: true,
            data: { summary }
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error updating summary',
            error: error.message
        });
    }
};
exports.updateSummary = updateSummary;
/**
 * Delete a summary
 */
const deleteSummary = async (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
    try {
        const { id } = req.params;
        const summary = await Summary_1.Summary.findOneAndDelete({ _id: id, user: user._id });
        if (!summary) {
            return res.status(404).json({
                success: false,
                message: 'Summary not found'
            });
        }
        res.status(200).json({
            success: true,
            message: 'Summary deleted successfully'
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error deleting summary',
            error: error.message
        });
    }
};
exports.deleteSummary = deleteSummary;
