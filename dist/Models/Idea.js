"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Idea = void 0;
const mongoose_1 = require("mongoose");
const ideaSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    niche: { type: String, required: true },
    theme: { type: String, required: true, trim: true },
    setting: { type: String, required: true, trim: true },
    favorite: { type: Boolean, default: false },
    characters: [{ type: String, trim: true }],
    tone: {
        type: String,
        enum: ['dramatic', 'mysterious', 'emotional', 'cinematic', 'traditional'],
        default: 'dramatic'
    },
    style: {
        type: String,
        enum: ['viral', 'educational', 'entertainment', 'cultural'],
        default: 'viral'
    },
    targetAudience: {
        type: String,
        enum: ['children', 'adults', 'family', 'teens'],
        default: 'adults'
    },
}, { timestamps: true });
// Indexes for efficient querying
ideaSchema.index({ user: 1, createdAt: -1 });
ideaSchema.index({ theme: 1 });
ideaSchema.index({ tone: 1, style: 1 });
exports.Idea = (0, mongoose_1.model)("Idea", ideaSchema);
