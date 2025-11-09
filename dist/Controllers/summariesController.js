"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteSummary = exports.updateSummary = exports.getSummaryById = exports.getSummaries = exports.generateSummary = void 0;
const Summary_1 = require("../Models/Summary");
const aiService_1 = require("../Services/aiService");
const appError_1 = require("../errors/appError");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
/**
 * Generate summary from an idea
 */
/**
 * Generate summary from an idea using AIService
 */
exports.generateSummary = (0, catchAsync_1.default)(async (req, res, next) => {
    const { idea, customizations = {} } = req.body;
    const { tone, style, targetAudience, niche, themes, settings } = customizations;
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    if (!idea) {
        return res.status(400).json({
            success: false,
            message: 'Idea is required',
        });
    }
    const summaryData = await aiService_1.AIService.generateViralSummary(idea.content, {
        tone,
        style,
        targetAudience,
        niche,
        themes,
        settings,
    });
    if (!summaryData || typeof summaryData !== 'object') {
        return res.status(500).json({
            success: false,
            message: 'AI did not return a valid summary object',
            raw: summaryData,
        });
    }
    const summary = await Summary_1.Summary.create({
        user: user._id,
        idea,
        ...summaryData,
    });
    res.status(201).json({
        success: true,
        data: summary,
    });
});
/**
 * Get all summaries for the authenticated user
 */
exports.getSummaries = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const summaries = await Summary_1.Summary.find({ user: user._id })
        .populate('idea', 'title theme setting')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit));
    res.status(200).json({
        success: true,
        data: summaries,
    });
});
/**
 * Get a single summary by ID
 */
exports.getSummaryById = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const { id } = req.params;
    const summary = await Summary_1.Summary.findOne({ _id: id, user: user._id })
        .populate('idea', 'title theme setting characters');
    if (!summary) {
        return res.status(404).json({
            success: false,
            message: 'Summary not found',
        });
    }
    res.status(200).json({
        success: true,
        data: { summary },
    });
});
/**
 * Update a summary
 */
exports.updateSummary = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const { id } = req.params;
    const updateData = req.body;
    const summary = await Summary_1.Summary.findOneAndUpdate({ _id: id, user: user._id }, updateData, { new: true, runValidators: true }).populate('idea', 'title theme setting');
    if (!summary) {
        return res.status(404).json({
            success: false,
            message: 'Summary not found',
        });
    }
    res.status(200).json({
        success: true,
        data: { summary },
    });
});
/**
 * Delete a summary
 */
exports.deleteSummary = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const { id } = req.params;
    const summary = await Summary_1.Summary.findOneAndDelete({ _id: id, user: user._id });
    if (!summary) {
        return res.status(404).json({
            success: false,
            message: 'Summary not found',
        });
    }
    res.status(200).json({
        success: true,
        message: 'Summary deleted successfully',
    });
});
