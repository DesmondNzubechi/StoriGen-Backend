"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteShort = exports.getShortByIdOrSlug = exports.getAllShorts = exports.generateShort = void 0;
const shortsModel_1 = __importDefault(require("../Models/shortsModel"));
const aiService_1 = require("../Services/aiService");
const appError_1 = require("../errors/appError");
const catchAsync_1 = __importDefault(require("../utils/catchAsync"));
exports.generateShort = (0, catchAsync_1.default)(async (req, res, next) => {
    const { typeOfMotivation, theme, targetWord } = req.body;
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    if (!typeOfMotivation || !theme || !targetWord) {
        return res.status(400).json({
            status: "fail",
            message: "typeOfMotivation, theme, and target word are required.",
        });
    }
    const aiResult = await aiService_1.AIService.generateMotivationalSpeech({
        typeOfMotivation,
        theme,
        targetWord,
    });
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
    res.status(201).json({
        status: "success",
        message: "Motivational short generated successfully.",
        data: newShort,
    });
});
exports.getAllShorts = (0, catchAsync_1.default)(async (req, res, next) => {
    const user = req.user;
    if (!user) {
        return next(new appError_1.AppError("You are not authorised to access this route", 401));
    }
    const allTheShorts = await shortsModel_1.default.find();
    res.status(200).json({
        status: "success",
        results: allTheShorts.length,
        data: allTheShorts,
    });
});
exports.getShortByIdOrSlug = (0, catchAsync_1.default)(async (req, res) => {
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
});
exports.deleteShort = (0, catchAsync_1.default)(async (req, res) => {
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
});
