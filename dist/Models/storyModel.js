"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Story = void 0;
const mongoose_1 = require("mongoose");
const paragraphSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    imagePrompt: { type: String },
});
const chapterSchema = new mongoose_1.Schema({
    number: { type: Number, required: true },
    title: { type: String },
    text: { type: String, required: true },
    paragraphs: [paragraphSchema],
});
const youtubeAssetsSchema = new mongoose_1.Schema({
    synopsis: { type: String },
    titles: [{ type: String }],
    description: { type: String },
    thumbnailPrompt: { type: String },
    hashtags: [{ type: String }],
});
const storySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    prompt: { type: String, required: true },
    targetWords: { type: Number, required: true },
    targetChapters: { type: Number, required: true },
    outline: { type: String },
    characterProfile: { type: String },
    chapters: [chapterSchema],
    youtubeAssets: { type: youtubeAssetsSchema, default: {} },
    status: {
        type: String,
        enum: ["in_progress", "chapters_complete", "assets_complete"],
        default: "in_progress",
    },
}, { timestamps: true });
exports.Story = (0, mongoose_1.model)("Story", storySchema);
