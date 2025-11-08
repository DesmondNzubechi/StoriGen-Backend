"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Motivation = void 0;
const mongoose_1 = require("mongoose");
const motivationSchema = new mongoose_1.Schema({
    content: {
        type: String,
        required: true,
        trim: true,
    },
    tone: {
        type: String,
        trim: true,
    },
    caption: {
        type: String,
        trim: true,
    },
    // hashtags: {
    //   type: [
    //     {
    //       type: String,
    //       trim: true,
    //     },
    //   ],
    //   default: [],
    // },
    audioUrl: {
        type: String,
        trim: true,
    },
    audioTaskId: {
        type: String,
        trim: true,
    },
    theme: [
        {
            type: String,
            trim: true,
        },
    ],
    type: {
        type: String,
        trim: true,
    },
    targetLength: {
        type: Number,
        min: 0,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
}, {
    timestamps: true,
});
motivationSchema.index({ createdAt: -1 });
motivationSchema.index({ tone: 1, type: 1 });
motivationSchema.index({ theme: 1 });
motivationSchema.index({ caption: "text", content: "text" });
exports.Motivation = (0, mongoose_1.model)("Motivation", motivationSchema);
