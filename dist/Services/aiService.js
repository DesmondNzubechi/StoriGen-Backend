"use strict";
// import OpenAI from "openai";
// import { config } from "dotenv";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateThumbnailPrompt = exports.generateTitles = exports.generateDescription = exports.generateMetadata = exports.generateImagePrompts = exports.generateChapter = exports.generateOutline = void 0;
// config({ path: "./config.env" });
// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });
// // Generate story outline
// async function generateOutline(prompt: string, targetWords: number, targetChapters: number) {
//   const wordsPerChapter = Math.floor(targetWords / targetChapters);
//   const outlinePrompt = `
//   You are a professional storyteller.
//   Create a detailed outline for a ${targetWords}-word story about:
//   "${prompt}"
//   Divide it into ${targetChapters} chapters.
//   For each chapter, include:
//   - Title
//   - Key events
//   - Characters involved
//   - Word target (about ${wordsPerChapter} words)
//   `;
//   const response = await openai.chat.completions.create({
//     model: "gpt-5",
//     messages: [{ role: "user", content: outlinePrompt }],
//   });
//   return response.choices[0].message.content;
// }
// // Stream a chapter
// async function* streamChapter(
//   outline: string,
//   chapterNumber: number,
//   totalChapters: number,
//   wordsPerChapter: number
// ) {
//   const chapterPrompt = `
//   You are writing Chapter ${chapterNumber} of a ${totalChapters}-chapter story.
//   Follow this outline:
//   ${outline}
//   Rules:
//   - Write about ${wordsPerChapter} words.
//   - Keep characters, plot, and setting consistent with the outline.
//   - Make it engaging, descriptive, and suitable for spoken storytelling (YouTube narration).
//   - End with a transition that leads naturally into the next chapter (unless it’s the final chapter).
//   - Do NOT summarize. Write full detailed narrative.
//   `;
//   const stream = await openai.chat.completions.create({
//     model: "gpt-5",
//     messages: [{ role: "user", content: chapterPrompt }],
//     stream: true, // 🚨 Enable streaming
//   });
//   for await (const chunk of stream) {
//     const token = chunk.choices[0]?.delta?.content || "";
//     if (token) {
//       yield token; // send each token to frontend
//     }
//   }
// }
// // Main function: stream the full story chapter by chapter
// export async function* streamFullStory(
//   prompt: string,
//   targetWords: number,
//   targetChapters: number
// ) {
//   // Step 1: Create outline (non-streamed for now)
//   const outline: any = await generateOutline(prompt, targetWords, targetChapters);
//   // Step 2: Stream chapters
//   const wordsPerChapter = Math.floor(targetWords / targetChapters);
//   for (let i = 1; i <= targetChapters; i++) {
//     yield `\n\n--- Chapter ${i} ---\n\n`; // notify frontend a new chapter starts
//     for await (const token of streamChapter(outline, i, targetChapters, wordsPerChapter)) {
//       yield token;
//     }
//   }
// }
const openai_1 = __importDefault(require("openai"));
const dotenv_1 = require("dotenv");
// Load environment variables
(0, dotenv_1.config)({ path: "./config.env" });
if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY environment variable is required");
}
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY,
});
// 1. Generate Story Outline
function generateOutline(prompt, targetWords, targetChapters) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const outlinePrompt = `
  You are a professional storyteller.
  Create a detailed outline for a ${targetWords}-word African folktale story about:

  "${prompt}"

  Divide it into ${targetChapters} chapters.
  For each chapter, include:
  - Title
  - Key events
  - Characters involved
  - Word target (about ${Math.floor(targetWords / targetChapters)} words)
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: outlinePrompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateOutline = generateOutline;
// 2. Generate One Chapter
// Note: targetWords is optional for flexibility with existing controller usage
function generateChapter(outline, chapterNumber, totalChapters, targetWords) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const chapterPrompt = `
  You are writing Chapter ${chapterNumber} of a ${totalChapters}-chapter story.

  Follow this outline:
  ${outline}

  Rules:
  - Write about ${targetWords ? Math.floor(targetWords / totalChapters) : 500} words.
  - Keep characters, plot, and setting consistent with the outline.
  - Make it engaging, descriptive, and suitable for spoken storytelling (YouTube narration).
  - End with a transition to the next chapter.
  - Do NOT summarize. Write full detailed narrative.
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: chapterPrompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateChapter = generateChapter;
// 3. Generate Image Prompts per Paragraph
// Accept paragraph text and optionally the original user prompt as context
function generateImagePrompts(paragraphText, originalPrompt) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  Generate a single creative image prompt for the following story paragraph.
  Ensure consistent characters (age, attire, facial structure) across the story.
  Make the prompt highly creative, vivid, and action-focused.
  ${originalPrompt ? `\nOriginal story prompt/context: ${originalPrompt}\n` : ""}
  Paragraph:
  ${paragraphText}
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateImagePrompts = generateImagePrompts;
// 4. Generate Metadata (Titles, Description, Synopsis, Thumbnail)
function generateMetadata(fullStory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const metaPrompt = `
  You are a YouTube expert who specialises in viral African folktale videos.

  Based on the following story, generate:
  - A high-CTR YouTube description (SEO optimized).
  - A synopsis (2–3 sentences).
  - 5 outstanding title ideas.
  - A thumbnail prompt with vibrant colours.

  Story:
  ${fullStory}
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: metaPrompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateMetadata = generateMetadata;
/**
 * Generate SEO optimized YouTube description + synopsis
 */
function generateDescription(fullStory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  You are a YouTube expert for viral African folktale storytelling videos.

  Based on the following story, write:
  - A high-CTR YouTube video description (SEO optimized with keywords like African folktale, storytelling, bedtime story, etc.)
  - A 2–3 sentence synopsis that hooks the audience.

  Story:
  ${fullStory}
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateDescription = generateDescription;
/**
 * Generate 5 outstanding, high-CTR YouTube title ideas
 */
function generateTitles(fullStory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  You are a YouTube strategist. 
  Generate 5 unique, outstanding title ideas for the following African folktale story.
  Rules:
  - Titles should be engaging, click-worthy, and optimized for YouTube search.
  - Avoid being too long (max 60 characters).
  - Make sure they are different variations, not just rephrasing.

  Story:
  ${fullStory}
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateTitles = generateTitles;
/**
 * Generate creative thumbnail prompt
 */
function generateThumbnailPrompt(fullStory) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const prompt = `
  You are an expert thumbnail designer for viral YouTube videos.
  
  Based on the following story, generate a SINGLE, detailed thumbnail prompt.
  Rules:
  - Use vibrant colours.
  - Include the main character(s) in a dramatic pose or action.
  - Make it visually striking so it stands out on YouTube feeds.
  - Keep it culturally authentic (African folktale theme).
  - The prompt should be suitable for AI image generators like MidJourney or Stable Diffusion.

  Story:
  ${fullStory}
  `;
        const response = yield openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    });
}
exports.generateThumbnailPrompt = generateThumbnailPrompt;
