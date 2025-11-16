"use strict";
// import { Schema, model, Document, Types } from "mongoose";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Story = void 0;
// interface IParagraph {
//   text: string;
//   imagePrompt?: string;
// }
// interface IChapter {
//   number: number;
//   title?: string;
//   text: string;
//   paragraphs: IParagraph[];
// }
// interface IYouTubeAssets {
//   synopsis?: string;
//   titles?: string[];
//   description?: string;
//   thumbnailPrompt?: string;
//   hashtags?: string[];
// }
// export interface IStory extends Document {
//   user?: Types.ObjectId; // optional if you want authentication
//   prompt: string;
//   targetWords: number;
//   targetChapters: number;
//   outline?: string;
//   characterProfile?: string;
//   chapters: IChapter[];
//   youtubeAssets: IYouTubeAssets;
//   status: "in_progress" | "chapters_complete" | "assets_complete";
//   createdAt: Date;
//   updatedAt: Date;
// }
// const paragraphSchema = new Schema<IParagraph>({
//   text: { type: String, required: true },
//   imagePrompt: { type: String },
// });
// const chapterSchema = new Schema<IChapter>({
//   number: { type: Number, required: true },
//   title: { type: String },
//   text: { type: String, required: true },
//   paragraphs: [paragraphSchema],
// });
// const youtubeAssetsSchema = new Schema<IYouTubeAssets>({
//   synopsis: { type: String },
//   titles: [{ type: String }],
//   description: { type: String },
//   thumbnailPrompt: { type: String },
//   hashtags: [{ type: String }],
// });
// const storySchema = new Schema<IStory>(
//   {
//     user: { type: Schema.Types.ObjectId, ref: "User" },
//     prompt: { type: String, required: true },
//     targetWords: { type: Number, required: true },
//     targetChapters: { type: Number, required: true },
//     outline: { type: String },
//     characterProfile: { type: String },
//     chapters: [chapterSchema],
//     youtubeAssets: { type: youtubeAssetsSchema, default: {} },
//     status: {
//       type: String,
//       enum: ["in_progress", "chapters_complete", "assets_complete"],
//       default: "in_progress",
//     },
//   },
//   { timestamps: true }
// );
// export const Story = model<IStory>("Story", storySchema);
const mongoose_1 = require("mongoose");
const paragraphSchema = new mongoose_1.Schema({
    text: { type: String, required: true },
    imagePrompt: { type: String },
});
const chapterImagePromptsSchema = new mongoose_1.Schema({
    chapter: { type: Number, required: true },
    prompts: [{ type: String, required: true }],
});
const characterDetailsSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    age: { type: String, trim: true },
    attire: { type: String, trim: true },
    facialFeatures: { type: String, trim: true },
    physicalTraits: { type: String, trim: true },
    otherDetails: { type: String, trim: true },
    lastUpdatedChapter: { type: Number },
    updateReason: { type: String, trim: true },
});
const outlineItemSchema = new mongoose_1.Schema({
    number: { type: Number, required: true },
    purpose: { type: String, required: true },
    description: { type: String, required: true },
});
const shortsHookAssetSchema = new mongoose_1.Schema({
    hook: { type: String, required: true },
    imagePrompts: [{ type: String, required: true }],
}, { _id: false });
const chapterSchema = new mongoose_1.Schema({
    number: { type: Number, required: true },
    title: { type: String },
    content: { type: String, required: true },
    summary: { type: String }, // Short summary for continuity
    wordCount: { type: Number },
    paragraphs: [paragraphSchema],
});
const youtubeAssetsSchema = new mongoose_1.Schema({
    synopsis: { type: String },
    titles: [{ type: String }],
    description: { type: String },
    thumbnailPrompt: { type: String },
    hashtags: [{ type: String }],
    keywords: [{ type: String }],
    shortsHooks: [shortsHookAssetSchema],
});
const storySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    prompt: { type: String, required: true },
    targetWords: { type: Number, required: true },
    totalChapters: { type: Number, required: true },
    outline: [outlineItemSchema],
    summary: { type: String, required: true },
    characterProfile: { type: String },
    // Story metadata for outline generation
    storyTitle: { type: String },
    characters: [{ type: String }],
    settings: [{ type: String }],
    themes: [{ type: String }],
    tone: { type: String },
    niche: { type: String },
    chapters: [chapterSchema],
    chapterImagePrompts: [chapterImagePromptsSchema],
    characterDetails: [characterDetailsSchema], // Stored character visual details
    youtubeAssets: {
        type: youtubeAssetsSchema, default: {
            synopsis: "",
            titles: [],
            description: "",
            thumbnailPrompt: "",
            hashtags: [],
            keywords: [],
            shortsHooks: []
        }
    },
    status: {
        type: String,
        enum: [
            "in_progress",
            "chapters_complete",
            "assets_complete",
            "completed",
        ],
        default: "in_progress",
    },
}, { timestamps: true });
exports.Story = (0, mongoose_1.model)("Story", storySchema);
