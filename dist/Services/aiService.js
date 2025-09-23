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
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return", awaitReturn), i[Symbol.asyncIterator] = function () { return this; }, i;
    function awaitReturn(f) { return function (v) { return Promise.resolve(v).then(f, reject); }; }
    function verb(n, f) { if (g[n]) { i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; if (f) i[n] = f(i[n]); } }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.streamFullStory = void 0;
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: "./config.env" });
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// Generate story outline
function generateOutline(prompt, targetWords, targetChapters) {
    return __awaiter(this, void 0, void 0, function* () {
        const wordsPerChapter = Math.floor(targetWords / targetChapters);
        const outlinePrompt = `
  You are a professional storyteller.
  Create a detailed outline for a ${targetWords}-word story about:

  "${prompt}"

  Divide it into ${targetChapters} chapters.
  For each chapter, include:
  - Title
  - Key events
  - Characters involved
  - Word target (about ${wordsPerChapter} words)
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-5",
            messages: [{ role: "user", content: outlinePrompt }],
        });
        return response.choices[0].message.content;
    });
}
// Stream a chapter
function streamChapter(outline, chapterNumber, totalChapters, wordsPerChapter) {
    var _a, _b;
    return __asyncGenerator(this, arguments, function* streamChapter_1() {
        var _c, e_1, _d, _e;
        const chapterPrompt = `
  You are writing Chapter ${chapterNumber} of a ${totalChapters}-chapter story.

  Follow this outline:
  ${outline}

  Rules:
  - Write about ${wordsPerChapter} words.
  - Keep characters, plot, and setting consistent with the outline.
  - Make it engaging, descriptive, and suitable for spoken storytelling (YouTube narration).
  - End with a transition that leads naturally into the next chapter (unless it’s the final chapter).
  - Do NOT summarize. Write full detailed narrative.
  `;
        const stream = yield __await(openai.chat.completions.create({
            model: "gpt-5",
            messages: [{ role: "user", content: chapterPrompt }],
            stream: true, // 🚨 Enable streaming
        }));
        try {
            for (var _f = true, stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _c = stream_1_1.done, !_c; _f = true) {
                _e = stream_1_1.value;
                _f = false;
                const chunk = _e;
                const token = ((_b = (_a = chunk.choices[0]) === null || _a === void 0 ? void 0 : _a.delta) === null || _b === void 0 ? void 0 : _b.content) || "";
                if (token) {
                    yield yield __await(token); // send each token to frontend
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_f && !_c && (_d = stream_1.return)) yield __await(_d.call(stream_1));
            }
            finally { if (e_1) throw e_1.error; }
        }
    });
}
// Main function: stream the full story chapter by chapter
function streamFullStory(prompt, targetWords, targetChapters) {
    return __asyncGenerator(this, arguments, function* streamFullStory_1() {
        var _a, e_2, _b, _c;
        // Step 1: Create outline (non-streamed for now)
        const outline = yield __await(generateOutline(prompt, targetWords, targetChapters));
        // Step 2: Stream chapters
        const wordsPerChapter = Math.floor(targetWords / targetChapters);
        for (let i = 1; i <= targetChapters; i++) {
            yield yield __await(`\n\n--- Chapter ${i} ---\n\n`); // notify frontend a new chapter starts
            try {
                for (var _d = true, _e = (e_2 = void 0, __asyncValues(streamChapter(outline, i, targetChapters, wordsPerChapter))), _f; _f = yield __await(_e.next()), _a = _f.done, !_a; _d = true) {
                    _c = _f.value;
                    _d = false;
                    const token = _c;
                    yield yield __await(token);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = _e.return)) yield __await(_b.call(_e));
                }
                finally { if (e_2) throw e_2.error; }
            }
        }
    });
}
exports.streamFullStory = streamFullStory;
