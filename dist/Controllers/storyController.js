"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStoryById = exports.getStories = exports.generateStoryStream = void 0;
const storyModel_1 = __importDefault(require("../Models/storyModel"));
const aiService_1 = require("../Services/aiService");
const generateStoryStream = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    const { prompt, targetWords, targetChapters } = req.body;
    if (!prompt || !targetWords || !targetChapters) {
        return res.status(400).json({ error: "Missing required fields" });
    }
    // Setup streaming headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    let storyContent = "";
    try {
        try {
            for (var _d = true, _e = __asyncValues((0, aiService_1.streamFullStory)(prompt, targetWords, targetChapters)), _f; _f = yield _e.next(), _a = _f.done, !_a; _d = true) {
                _c = _f.value;
                _d = false;
                const chunk = _c;
                storyContent += chunk; // collect story to save later
                res.write(chunk); // stream live to client
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = _e.return)) yield _b.call(_e);
            }
            finally { if (e_1) throw e_1.error; }
        }
        // Save to MongoDB after streaming is complete
        const story = new storyModel_1.default({
            prompt,
            targetWords,
            targetChapters,
            content: storyContent.trim(),
        });
        yield story.save();
        res.end();
    }
    catch (error) {
        console.error(error);
        res.write(`Error: ${error.message}`);
        res.end();
    }
});
exports.generateStoryStream = generateStoryStream;
// Fetch all stories
const getStories = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stories = yield storyModel_1.default.find().sort({ createdAt: -1 });
        res.json(stories);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch stories" });
    }
});
exports.getStories = getStories;
// Fetch single story by ID
const getStoryById = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const story = yield storyModel_1.default.findById(req.params.id);
        if (!story)
            return res.status(404).json({ error: "Story not found" });
        res.json(story);
    }
    catch (error) {
        res.status(500).json({ error: "Failed to fetch story" });
    }
});
exports.getStoryById = getStoryById;
