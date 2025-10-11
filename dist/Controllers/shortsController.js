"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShort = exports.getShortByIdOrSlug = exports.getAllShorts = exports.generateShort = void 0;
const shortsModel_1 = __importDefault(require("../Models/shortsModel"));
const aiService_1 = require("../Services/aiService");
const verifyTokenAndGetUser_1 = require("../utils/verifyTokenAndGetUser");
const appError_1 = require("../errors/appError");
// Generate motivational short via AI
const generateShort = async (req, res, next) => {
    try {
        const { typeOfMotivation, theme, targetWord } = req.body;
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user) {
            return next(new appError_1.AppError("User does not exist. Kindly register", 404));
        }
        if (!typeOfMotivation || !theme || !targetWord) {
            return res.status(400).json({
                status: "fail",
                message: "typeOfMotivation, theme, and target word are required.",
            });
        }
        // Generate using AI Service
        const aiResult = await aiService_1.AIService.generateMotivationalSpeech({
            typeOfMotivation,
            theme,
            targetWord,
        });
        // Save to DB
        const newShort = await shortsModel_1.default.create({
            title: aiResult.title,
            caption: aiResult.caption,
            hashTag: aiResult.hashTag,
            content: aiResult.content,
            imagePrompts: aiResult.imagePrompts,
            theme,
            typeOfMotivation,
            user: user._id,
        });
        return res.status(201).json({
            status: "success",
            message: "Motivational short generated successfully.",
            data: newShort,
        });
    }
    catch (error) {
        console.error("❌ Error generating short:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to generate motivational short.",
            error: error.message,
        });
    }
};
exports.generateShort = generateShort;
// Get all shorts (with optional filters)
const getAllShorts = async (req, res, next) => {
    try {
        const token = req.cookies.jwt;
        if (!token) {
            return next(new appError_1.AppError("You are not authorised to access this route", 401));
        }
        const user = await (0, verifyTokenAndGetUser_1.verifyTokenAndGetUser)(token, next);
        if (!user) {
            return next(new appError_1.AppError("Cant find user with this token. Please login again", 401));
        }
        const allTheShorts = await shortsModel_1.default.find();
        //   const { typeOfMotivation, theme, search } = req.query;
        //   const filter: any = {};
        //   if (typeOfMotivation) filter.typeOfMotivation = typeOfMotivation;
        //   if (theme) filter.theme = theme;
        //   let query = ShortsModel.find(filter).sort({ createdAt: -1 });
        //   //Text search
        //   if (search) {
        //     query = ShortsModel.find({
        //       ...filter,
        //       $text: { $search: search as string },
        //     });
        //   }
        //   const shorts = await query;
        res.status(200).json({
            status: "success",
            results: allTheShorts.length,
            data: allTheShorts,
        });
    }
    catch (error) {
        console.error("❌ Error fetching shorts:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch motivational shorts.",
            error: error.message,
        });
    }
};
exports.getAllShorts = getAllShorts;
// Get single short by ID or slug
const getShortByIdOrSlug = async (req, res, next) => {
    try {
        const { idOrSlug } = req.params;
        let short;
        if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
            short = await shortsModel_1.default.findById(idOrSlug);
        }
        else {
            short = await shortsModel_1.default.findOne({ slug: idOrSlug });
        }
        if (!short) {
            return res.status(404).json({
                status: "fail",
                message: "Motivational short not found.",
            });
        }
        res.status(200).json({
            status: "success",
            data: short,
        });
    }
    catch (error) {
        console.error("❌ Error fetching short:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to fetch motivational short.",
            error: error.message,
        });
    }
};
exports.getShortByIdOrSlug = getShortByIdOrSlug;
// Delete a short
const deleteShort = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await shortsModel_1.default.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({
                status: "fail",
                message: "Motivational short not found.",
            });
        }
        res.status(200).json({
            status: "success",
            message: "Motivational short deleted successfully.",
        });
    }
    catch (error) {
        console.error("❌ Error deleting short:", error);
        res.status(500).json({
            status: "error",
            message: "Failed to delete motivational short.",
            error: error.message,
        });
    }
};
exports.deleteShort = deleteShort;
