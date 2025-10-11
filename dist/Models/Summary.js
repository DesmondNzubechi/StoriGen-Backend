"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Summary = void 0;
const mongoose_1 = require("mongoose");
const summarySchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    idea: { type: String, required: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true },
    niche: { type: String, required: true },
    hook: { type: String, required: true },
    conflict: { type: String, required: true },
    resolution: { type: String, required: true },
    culturalElements: [{ type: String, trim: true }],
    viralElements: [{ type: String, trim: true }],
}, { timestamps: true });
// Indexes for efficient querying
summarySchema.index({ user: 1, createdAt: -1 });
summarySchema.index({ idea: 1 });
exports.Summary = (0, mongoose_1.model)("Summary", summarySchema);
