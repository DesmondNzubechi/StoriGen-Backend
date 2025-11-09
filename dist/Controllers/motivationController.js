"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMotivation = exports.deleteMotivation = exports.getAllMotivationsAdmin = exports.getMotivationById = exports.getUserMotivations = exports.getAllMotivations = exports.generateSpeechForMotivation = exports.generateMotivation = void 0;
const Motivation_1 = require("../Models/Motivation");
const appError_1 = require("../errors/appError");
const validateObjectId_1 = require("../utils/validateObjectId");
const aiService_1 = require("../Services/aiService");
const normalizeThemes = (theme) => {
    if (!theme) {
        return [];
    }
    const toStringValue = (value) => {
        if (typeof value === "string") {
            return value;
        }
        return Object.values(value)
            .map((part) => (typeof part === "string" ? part : ""))
            .join(",");
    };
    if (Array.isArray(theme)) {
        return theme
            .map((item) => toStringValue(item))
            .flatMap((entry) => entry
            .split(",")
            .map((segment) => segment.trim())
            .filter((segment) => segment.length > 0));
    }
    if (typeof theme === "object") {
        const serialized = toStringValue(theme);
        return serialized
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    if (typeof theme === "string") {
        return theme
            .split(",")
            .map((item) => item.trim())
            .filter((item) => item.length > 0);
    }
    return [];
};
const generateMotivation = async (req, res, next) => {
    try {
        const { tone, theme, type, targetLength } = req.body;
        if (!tone || typeof tone !== "string" || !tone.trim()) {
            return next(new appError_1.AppError("tone is required when generating motivation.", 400));
        }
        if (!type || typeof type !== "string" || !type.trim()) {
            return next(new appError_1.AppError("type is required when generating motivation.", 400));
        }
        const themes = normalizeThemes(theme);
        if (themes.length === 0) {
            return next(new appError_1.AppError("Provide at least one theme when generating motivation.", 400));
        }
        if (targetLength === undefined || targetLength === null) {
            return next(new appError_1.AppError("targetLength is required when generating motivation.", 400));
        }
        const numericTargetLength = typeof targetLength === "number"
            ? targetLength
            : parseInt(targetLength, 10);
        if (Number.isNaN(numericTargetLength) || numericTargetLength <= 0) {
            return next(new appError_1.AppError("targetLength must be a positive number.", 400));
        }
        const normalizedTone = tone.trim();
        const normalizedType = type.trim();
        const { user } = req;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        let generatedMotivations = [];
        try {
            generatedMotivations = await aiService_1.AIService.generateMotivations({
                tone: normalizedTone,
                type: normalizedType,
                themes,
                targetLength: numericTargetLength,
            });
        }
        catch (error) {
            console.error("AI motivation generation failed:", error);
        }
        const sanitizedPayloads = generatedMotivations.map(({ content, caption }) => {
            var _a;
            const trimmedContent = content.trim();
            const trimmedCaption = caption.trim();
            const fallbackCaption = trimmedCaption ||
                `${(_a = trimmedContent.split(".")[0]) !== null && _a !== void 0 ? _a : trimmedContent}.`.trim();
            return {
                content: trimmedContent,
                caption: fallbackCaption,
            };
        });
        const savedMotivations = await Motivation_1.Motivation.insertMany(sanitizedPayloads.map((payload) => ({
            ...payload,
            tone: normalizedTone,
            theme: themes,
            type: normalizedType,
            targetLength: numericTargetLength,
            createdBy: user._id,
        })));
        res.status(201).json({
            success: true,
            data: savedMotivations,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateMotivation = generateMotivation;
const generateSpeechForMotivation = async (req, res, next) => {
    var _a;
    try {
        const { id } = req.params;
        if (!(0, validateObjectId_1.validateObjectId)(id)) {
            return next(new appError_1.AppError("Invalid motivation id supplied.", 400));
        }
        const motivation = await Motivation_1.Motivation.findById(id);
        if (!motivation) {
            return next(new appError_1.AppError("Motivation not found.", 404));
        }
        const content = (_a = motivation.content) === null || _a === void 0 ? void 0 : _a.trim();
        if (!content) {
            return next(new appError_1.AppError("Motivation content is empty. Cannot generate speech.", 400));
        }
        const sanitizedContent = content
            .replace(/(^|\s)(#[^\s]+)/g, "$1")
            .replace(/\s{2,}/g, " ")
            .trim();
        if (!sanitizedContent) {
            return next(new appError_1.AppError("Motivation content contains only hashtags. Cannot generate speech.", 400));
        }
        const voiceId = typeof req.body.voiceId === "string" &&
            req.body.voiceId.trim().length > 0
            ? req.body.voiceId.trim()
            : "nPczCjzI2devNBz1zQrb";
        const receiveUrl = typeof req.body.receiveUrl === "string" &&
            req.body.receiveUrl.trim().length > 0
            ? req.body.receiveUrl.trim()
            : undefined;
        const modelId = typeof req.body.modelId === "string" &&
            req.body.modelId.trim().length > 0
            ? req.body.modelId.trim()
            : "eleven_multilingual_v2";
        const withTranscript = typeof req.body.withTranscript === "boolean"
            ? req.body.withTranscript
            : req.body.withTranscript === "false";
        let speechResult;
        try {
            speechResult = await aiService_1.AIService.generateMotivationSpeechAudio({
                text: sanitizedContent,
                voiceId,
                receiveUrl,
                modelId,
                withTranscript,
            });
        }
        catch (error) {
            console.error("Speech generation failed:", error);
            return next(new appError_1.AppError("Failed to generate speech audio for motivational content.", 502));
        }
        if (speechResult.status !== "done" || !speechResult.audioUrl) {
            return next(new appError_1.AppError("Speech generation did not complete successfully. Please try again.", 504));
        }
        motivation.audioUrl = speechResult.audioUrl;
        motivation.audioTaskId = speechResult.taskId;
        await motivation.save();
        res.status(200).json({
            success: true,
            data: motivation,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.generateSpeechForMotivation = generateSpeechForMotivation;
const getAllMotivations = async (req, res, next) => {
    try {
        const { tone, theme, type, page = "1", limit = "20", search } = req.query;
        const filter = {};
        if (typeof tone === "string" && tone.trim()) {
            filter.tone = tone.trim();
        }
        if (typeof type === "string" && type.trim()) {
            filter.type = type.trim();
        }
        if (theme) {
            const themes = normalizeThemes(Array.isArray(theme) ? theme : theme.toString());
            if (themes.length > 0) {
                filter.theme = { $in: themes };
            }
        }
        if (search && typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { content: { $regex: regex } },
                { caption: { $regex: regex } },
                { hashtags: { $elemMatch: { $regex: regex } } },
            ];
        }
        const { user } = req;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const { mine } = req.query;
        if (mine === "true") {
            filter.createdBy = user._id;
        }
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const skip = (parsedPage - 1) * parsedLimit;
        const [motivations, total] = await Promise.all([
            Motivation_1.Motivation.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Motivation_1.Motivation.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            length: motivations.length,
            data: motivations,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(total / parsedLimit),
                hasNext: skip + motivations.length < total,
                hasPrev: parsedPage > 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllMotivations = getAllMotivations;
const getUserMotivations = async (req, res, next) => {
    try {
        const { user } = req;
        if (!user) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const { tone, theme, type, page = "1", limit = "20", search } = req.query;
        const filter = {
            createdBy: user._id,
        };
        if (typeof tone === "string" && tone.trim()) {
            filter.tone = tone.trim();
        }
        if (typeof type === "string" && type.trim()) {
            filter.type = type.trim();
        }
        if (theme) {
            const themes = normalizeThemes(Array.isArray(theme) ? theme : theme.toString());
            if (themes.length > 0) {
                filter.theme = { $in: themes };
            }
        }
        if (typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { content: { $regex: regex } },
                { caption: { $regex: regex } },
            ];
        }
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const skip = (parsedPage - 1) * parsedLimit;
        const [motivations, total] = await Promise.all([
            Motivation_1.Motivation.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .lean(),
            Motivation_1.Motivation.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            length: motivations.length,
            data: motivations,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(total / parsedLimit),
                hasNext: skip + motivations.length < total,
                hasPrev: parsedPage > 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getUserMotivations = getUserMotivations;
const getMotivationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!(0, validateObjectId_1.validateObjectId)(id)) {
            return next(new appError_1.AppError("Invalid motivation id supplied.", 400));
        }
        const motivation = await Motivation_1.Motivation.findById(id);
        if (!motivation) {
            return next(new appError_1.AppError("Motivation not found.", 404));
        }
        res.status(200).json({
            success: true,
            data: motivation,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMotivationById = getMotivationById;
const getAllMotivationsAdmin = async (req, res, next) => {
    try {
        const authUser = req.user;
        if (!authUser) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const { tone, theme, type, page = "1", limit = "20", search, userId, } = req.query;
        const filter = {};
        if (typeof tone === "string" && tone.trim()) {
            filter.tone = tone.trim();
        }
        if (typeof type === "string" && type.trim()) {
            filter.type = type.trim();
        }
        if (theme) {
            const themes = normalizeThemes(Array.isArray(theme) ? theme : theme.toString());
            if (themes.length > 0) {
                filter.theme = { $in: themes };
            }
        }
        if (typeof search === "string" && search.trim()) {
            const regex = new RegExp(search.trim(), "i");
            filter.$or = [
                { content: { $regex: regex } },
                { caption: { $regex: regex } },
                { hashtags: { $elemMatch: { $regex: regex } } },
            ];
        }
        if (typeof userId === "string" && (0, validateObjectId_1.validateObjectId)(userId)) {
            filter.createdBy = userId;
        }
        const parsedPage = Math.max(parseInt(page, 10) || 1, 1);
        const parsedLimit = Math.max(Math.min(parseInt(limit, 10) || 20, 100), 1);
        const skip = (parsedPage - 1) * parsedLimit;
        const [motivations, total] = await Promise.all([
            Motivation_1.Motivation.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parsedLimit)
                .populate("createdBy", "fullName email role")
                .lean(),
            Motivation_1.Motivation.countDocuments(filter),
        ]);
        res.status(200).json({
            success: true,
            data: motivations,
            pagination: {
                total,
                page: parsedPage,
                limit: parsedLimit,
                pages: Math.ceil(total / parsedLimit),
                hasNext: skip + motivations.length < total,
                hasPrev: parsedPage > 1,
            },
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getAllMotivationsAdmin = getAllMotivationsAdmin;
const deleteMotivation = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!(0, validateObjectId_1.validateObjectId)(id)) {
            return next(new appError_1.AppError("Invalid motivation id supplied.", 400));
        }
        const motivation = await Motivation_1.Motivation.findByIdAndDelete(id);
        if (!motivation) {
            return next(new appError_1.AppError("Motivation not found.", 404));
        }
        res.status(200).json({
            success: true,
            message: "Motivation deleted successfully.",
        });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteMotivation = deleteMotivation;
const updateMotivation = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!(0, validateObjectId_1.validateObjectId)(id)) {
            return next(new appError_1.AppError("Invalid motivation id supplied.", 400));
        }
        const allowedFields = ["content", "tone", "type", "theme", "targetLength", "caption"];
        const updateData = {};
        allowedFields.forEach((field) => {
            if (field in req.body) {
                if (field === "theme") {
                    updateData.theme = normalizeThemes(req.body.theme);
                }
                else if (field === "caption") {
                    if (typeof req.body.caption === "string" && req.body.caption.trim()) {
                        updateData.caption = req.body.caption.trim();
                    }
                    else {
                        updateData.caption = undefined;
                    }
                }
                else if (field === "targetLength") {
                    const numericValue = typeof req.body.targetLength === "number"
                        ? req.body.targetLength
                        : parseInt(req.body.targetLength, 10);
                    if (!Number.isNaN(numericValue)) {
                        updateData.targetLength = numericValue;
                    }
                }
                else if (typeof req.body[field] === "string") {
                    updateData[field] = req.body[field].trim();
                }
                else {
                    updateData[field] = req.body[field];
                }
            }
        });
        if (Object.keys(updateData).length === 0) {
            return next(new appError_1.AppError("No valid fields supplied for update.", 400));
        }
        const motivation = await Motivation_1.Motivation.findByIdAndUpdate(id, updateData, {
            new: true,
            runValidators: true,
        });
        if (!motivation) {
            return next(new appError_1.AppError("Motivation not found.", 404));
        }
        res.status(200).json({
            success: true,
            data: motivation,
        });
    }
    catch (error) {
        next(error);
    }
};
exports.updateMotivation = updateMotivation;
