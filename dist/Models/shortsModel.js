"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const shortsSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: [true, "Kindly provide the content of this motivational script."],
        trim: true,
    },
    title: {
        type: String,
        required: [true, "Kindly provide the title of this script."],
        trim: true,
    },
    caption: {
        type: String,
        required: [true, "A caption is required for this motivational short."],
        trim: true,
    },
    hashTag: {
        type: String,
        required: [true, "Please include at least one hashtag."],
        trim: true,
    },
    imagePrompts: {
        type: [String],
        default: [],
        validate: {
            validator: (arr) => Array.isArray(arr),
            message: "Image prompts must be an array of strings.",
        },
    },
    theme: {
        type: String,
        required: [true, "Please specify the theme (e.g., discipline, consistency, mindset)."],
        trim: true,
    },
    typeOfMotivation: {
        type: String,
        required: [true, "Please specify the type of motivation (e.g., fitness, personal, career)."],
        enum: [
            "Personal Motivation",
            "Career Motivation",
            "Fitness Motivation",
            "Financial Motivation",
            "Academic Motivation",
            "Spiritual Motivation",
        ],
        trim: true,
    },
    slug: {
        type: String,
        unique: true,
        sparse: true,
    },
    user: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "A user must be associated with this short."],
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
// 🔹 Pre-save hook: create a URL-friendly slug from title
shortsSchema.pre("save", function (next) {
    if (this.isModified("title")) {
        this.slug = this.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)+/g, "");
    }
    next();
});
// 🔹 Virtual field for short summary
shortsSchema.virtual("summary").get(function () {
    return this.content.length > 100 ? this.content.slice(0, 100) + "..." : this.content;
});
// 🔹 Text index for efficient searching
shortsSchema.index({
    title: "text",
    caption: "text",
    content: "text",
    theme: "text",
    typeOfMotivation: "text",
});
const ShortsModel = mongoose_1.default.model("Shorts", shortsSchema);
exports.default = ShortsModel;
