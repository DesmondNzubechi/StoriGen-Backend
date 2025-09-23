"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = require("mongoose");
const storySchema = new mongoose_1.Schema({
    prompt: { type: String, required: true },
    targetWords: { type: Number, required: true },
    targetChapters: { type: Number, required: true },
    content: { type: String, required: true },
}, { timestamps: true });
exports.default = (0, mongoose_1.model)("Story", storySchema);
