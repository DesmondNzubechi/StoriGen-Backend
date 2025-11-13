"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AIService = void 0;
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
const AI33_API_KEY = process.env.AI33_API_KEY;
if (!AI33_API_KEY) {
    throw new Error("AI33_API_KEY environment variable is required");
}
const AI33_API_BASE_URL = process.env.AI33_API_BASE_URL || "https://api.ai33.pro";
const AI33_DEFAULT_MODEL_ID = process.env.AI33_TTS_MODEL_ID || "eleven_multilingual_v2";
const AI33_DEFAULT_VOICE_ID = process.env.AI33_DEFAULT_VOICE_ID;
const resolveNumericEnv = (value, fallback) => {
    if (!value) {
        return fallback;
    }
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
const AI33_TTS_POLL_INTERVAL_MS = resolveNumericEnv(process.env.AI33_TTS_POLL_INTERVAL_MS, 2000);
const AI33_TTS_MAX_ATTEMPTS = resolveNumericEnv(process.env.AI33_TTS_MAX_ATTEMPTS, 15);
class AIService {
    static async sleep(ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }
    static async createSpeechTask(options) {
        const { text, voiceId, modelId, receiveUrl, withTranscript } = options;
        const resolvedVoiceId = voiceId || AI33_DEFAULT_VOICE_ID;
        if (!resolvedVoiceId) {
            throw new Error("A voiceId must be provided either in the request or via AI33_DEFAULT_VOICE_ID environment variable.");
        }
        const trimmedText = text.trim();
        if (!trimmedText) {
            throw new Error("Text content is required to generate speech.");
        }
        const payload = {
            text: trimmedText,
            model_id: modelId || AI33_DEFAULT_MODEL_ID,
            with_transcript: withTranscript !== null && withTranscript !== void 0 ? withTranscript : false,
        };
        if (receiveUrl) {
            payload.receive_url = receiveUrl;
        }
        const response = await fetch(`${AI33_API_BASE_URL}/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_44100_128`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": AI33_API_KEY,
            },
            body: JSON.stringify(payload),
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to create speech task. Status: ${response.status}. Body: ${errorBody}`);
        }
        const result = (await response.json());
        if (!result.task_id) {
            throw new Error(`Speech task creation response missing task_id. Raw response: ${JSON.stringify(result)}`);
        }
        return { taskId: result.task_id };
    }
    static async fetchSpeechTask(taskId) {
        const response = await fetch(`${AI33_API_BASE_URL}/v1/task/${taskId}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "xi-api-key": AI33_API_KEY,
            },
        });
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Failed to fetch speech task ${taskId}. Status: ${response.status}. Body: ${errorBody}`);
        }
        return (await response.json());
    }
    static async pollSpeechTask(taskId, pollIntervalMs, maxAttempts) {
        let attempts = 0;
        let latest = null;
        while (attempts < maxAttempts) {
            latest = await this.fetchSpeechTask(taskId);
            if (latest.status === "done" || latest.status === "error") {
                return latest;
            }
            attempts += 1;
            await this.sleep(pollIntervalMs);
        }
        return (latest || {
            id: taskId,
            created_at: new Date().toISOString(),
            status: "doing",
        });
    }
    static async generateMotivationSpeechAudio(options) {
        var _a, _b, _c;
        const pollInterval = (_a = options.pollIntervalMs) !== null && _a !== void 0 ? _a : AI33_TTS_POLL_INTERVAL_MS;
        const maxAttempts = (_b = options.maxPollAttempts) !== null && _b !== void 0 ? _b : AI33_TTS_MAX_ATTEMPTS;
        const { taskId } = await this.createSpeechTask(options);
        const task = await this.pollSpeechTask(taskId, pollInterval, maxAttempts);
        return {
            taskId,
            status: task.status,
            audioUrl: (_c = task.metadata) === null || _c === void 0 ? void 0 : _c.audio_url,
        };
    }
    //generate motivational speech
    static async generateMotivationalSpeech(customizations) {
        var _a, _b, _c, _d, _e, _f;
        const { typeOfMotivation, theme, targetWord } = customizations;
        const targetLength = targetWord || 200; // default ~200 words
        // Prompt designed for viral motivational shorts
        const prompt = `
Generate a **viral motivational script** using the following details:

Type of motivation: ${typeOfMotivation}
Theme: ${theme}
Target length: Around ${targetLength} words

Requirements:
1. Start with a **hook** — a bold, emotional first line that immediately grabs the viewer's attention.
2. Structure the script into **3–5 short, powerful paragraphs**, each representing an emotional or mental shift.
3. End with a **strong outro** that feels complete and motivating — then finish with a **social CTA** that says:
   “Follow us for more daily motivation. Like, comment, and share this video if it inspired you.”
4. The tone must be **cinematic, emotional, realistic**, and relatable.
5. Stay close to the ${targetLength}-word count.
6. After the script, also provide:
   - A **viral-style title** (short and catchy)
   - A **short caption** for TikTok/YouTube description (1–2 sentences)
   - **5–7 relevant hashtags**
   - **1 image prompt per paragraph**, describing what visuals would match each moment emotionally.

Format your response **exactly** like this: 

Title:
<generated title>

Caption:
<caption>

Hashtags:
<comma-separated hashtags>

Script:
<paragraph 1 - starts with hook>
<paragraph 2>
<paragraph 3>
<paragraph 4 (optional)>
<paragraph 5 (optional) - ends with outro + CTA>

Image Prompts:
1. <image prompt for paragraph 1>
2. <image prompt for paragraph 2>
3. <image prompt for paragraph 3>
4. <image prompt for paragraph 4 (if any)>
5. <image prompt for paragraph 5 (if any)>
`;
        // 🔥 Call OpenAI model
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
        });
        const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        // 🧩 Parse structured response
        const titleMatch = rawOutput.match(/Title:\s*(.*)/i);
        const captionMatch = rawOutput.match(/Caption:\s*([\s\S]*?)\n\s*Hashtags:/i);
        const hashtagsMatch = rawOutput.match(/Hashtags:\s*(.*)/i);
        const scriptMatch = rawOutput.match(/Script:\s*([\s\S]*?)\n\s*Image Prompts:/i);
        const imagePromptsMatch = rawOutput.match(/Image Prompts:\s*([\s\S]*)/i);
        const title = ((_c = titleMatch === null || titleMatch === void 0 ? void 0 : titleMatch[1]) === null || _c === void 0 ? void 0 : _c.trim()) || "Untitled Motivation";
        const caption = ((_d = captionMatch === null || captionMatch === void 0 ? void 0 : captionMatch[1]) === null || _d === void 0 ? void 0 : _d.trim()) || "Stay inspired, stay driven.";
        const hashTag = ((_e = hashtagsMatch === null || hashtagsMatch === void 0 ? void 0 : hashtagsMatch[1]) === null || _e === void 0 ? void 0 : _e.trim()) ||
            "#Motivation #Mindset #Discipline #Success #NeverGiveUp";
        const content = ((_f = scriptMatch === null || scriptMatch === void 0 ? void 0 : scriptMatch[1]) === null || _f === void 0 ? void 0 : _f.trim()) || rawOutput;
        const imagePrompts = imagePromptsMatch
            ? imagePromptsMatch[1]
                .split(/\n\d+\.\s*/)
                .map((item) => item.trim())
                .filter(Boolean)
            : [];
        return {
            title,
            caption,
            hashTag,
            content,
            imagePrompts,
        };
    }
    // Generate 5 viral motivational pieces
    //   static async generateMotivations(
    //     customizations: MotivationGenerationOptions
    //   ): Promise<GeneratedMotivation[]> {
    //     const { tone, type, themes, targetLength } = customizations;
    //     const resolvedTone = tone || "Uplifting";
    //     const resolvedType = type || "Affirmation";
    //     const resolvedThemes =
    //       themes.length > 0 ? themes.join(", ") : "resilience, perseverance";
    //     const resolvedLength = targetLength > 0 ? targetLength : 300;
    //     const prompt = `
    // You are a motivational and inspirational writing expert.
    // Generate exactly 5 unique ${resolvedType.toLowerCase()} pieces.
    // Guidelines:
    // - Tone: ${resolvedTone}
    // - Themes to weave in: ${resolvedThemes}
    // - Each piece must start with a compelling hook tailored to the tone, type, and themes.
    // - Each piece must end with an empowering outro that reinforces the customization details.
    // - Each piece must be roughly ${resolvedLength} words (±20%).
    // - Write in engaging, modern language. Avoid clichés and make each piece actionable.
    // - Use quotes from famous influential people, books, or movies to make each piece more engaging.
    // - Ensure each piece feels distinct while sharing the requested tone and themes.
    // - Provide a short caption (1 sentence) for each piece with exactly 5 relevant hashtags per piece.
    // - Finish with a **social CTA** that says: “Follow us for more daily motivation. Like, comment, and share this video if it inspired you.”
    // Return only valid JSON, no markdown, using this structure:
    // {
    //   "motivations": [
    //     {
    //       "content": "<motivation 1 text with hook at start and outro at end>",
    //       "caption": "<caption>",
    //     },
    //     {
    //       "content": "<motivation 2 text with hook at start and outro at end>",
    //       "caption": "<caption>",
    //     },
    //     {
    //       "content": "<motivation 3 text with hook at start and outro at end>",
    //       "caption": "<caption>",
    //     },
    //      {
    //       "content": "<motivation 3 text with hook at start and outro at end>",
    //       "caption": "<caption>",
    //     },
    //      {
    //       "content": "<motivation 3 text with hook at start and outro at end>",
    //       "caption": "<caption>",
    //     }
    //   ]
    // }
    // `;
    //     const response = await openai.chat.completions.create({
    //       model: "gpt-4o-mini",
    //       messages: [{ role: "user", content: prompt }],
    //       temperature: 0.8,
    //     });
    //     const rawOutput = response.choices[0]?.message?.content || "";
    //     const cleaned = rawOutput
    //       .replace(/```json\s*/gi, "")
    //       .replace(/```\s*/g, "")
    //       .trim();
    //     try {
    //       const parsed = JSON.parse(cleaned);
    //       if (
    //         parsed &&
    //         Array.isArray(parsed.motivations)
    //       ) {
    //         return parsed.motivations
    //           .map(
    //             (item: {
    //               content?: string;
    //               caption?: string;
    //              // hashtags?: string[];
    //             }) => ({
    //               content: item?.content?.trim() ?? "",
    //               caption: item?.caption?.trim() ?? "",
    //               // hashtags: Array.isArray(item?.hashtags)
    //               //   ? item!.hashtags.filter(
    //               //       (tag): tag is string => typeof tag === "string"
    //               //     )
    //               //   : [],
    //             })
    //           )
    //           .filter(
    //             (item: GeneratedMotivation) => item.content.length > 0
    //           );
    //       }
    //     } catch (error) {
    //       console.error("Failed to parse AI motivations response:", cleaned);
    //     }
    //     return [];
    //   }
    // Generate 5 viral motivational pieces
    // static async generateMotivations(
    //   customizations?: MotivationGenerationOptions
    // ): Promise<GeneratedMotivation[]> {
    //   // If no customizations provided, generate random ones
    //   const { tone, type, themes, targetLength } = customizations || {};
    //   const resolvedTone = tone;
    //   const resolvedType = type;
    //   const resolvedThemes = themes &&  themes.join(", ");
    //   const resolvedLength = targetLength && targetLength > 0 ? targetLength : 300;
    //   const prompt = `
    // You are a world-class motivational and inspirational writer for TikTok.
    // Generate exactly 5 unique, high-performing motivational content pieces optimized for short-form social media virality.
    // Instructions for each piece:
    // 1. Tone & Energy:
    //    - Use the tone: ${resolvedTone}
    //    - Write with engaging, modern language. Avoid clichés. Be actionable and inspiring.
    // 2. Structure / Narrative Flow:
    //    - Start with a compelling hook (1-2 sentences).
    //    - Build a relatable scenario or challenge.
    //    - Provide insight, reframing, or life lesson.
    //    - Include quotes from famous people, books, or movies.
    //    - End with an empowering outro that reinforces the main message.
    //    - Use metaphors or sensory language where relevant.
    // 3. Themes:
    //    - Integrate these themes: ${resolvedThemes}
    // 4. Type / Archetype:
    //    - Style this as: ${resolvedType}
    // 5. Length:
    //    - Each piece should be roughly ${resolvedLength} words (±20%).
    // 6. Call-to-Action & Social Prompt:
    //    - Include: "Like, Comment, and Follow for more — RulingYou"
    //    - Provide a **short caption** (1 sentence) summarizing the piece and you must Include exactly 5 relevant hashtags directly in the caption, after the sentence.
    // 7. Output strictly as JSON using this structure:
    // {
    //   "motivations": [
    //     {
    //       "content": "<motivation text with hook and empowering outro>",
    //      "caption": "<caption with hashtags included>"
    //     }
    //   ]
    // }
    // `;
    //   const response = await openai.chat.completions.create({
    //     model: "gpt-4o-mini",
    //     messages: [{ role: "user", content: prompt }],
    //     temperature: 0.8,
    //   });
    //   const rawOutput = response.choices[0]?.message?.content || "";
    //   const cleaned = rawOutput.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    //   try {
    //     const parsed = JSON.parse(cleaned);
    //     if (parsed && Array.isArray(parsed.motivations)) {
    //       return parsed.motivations
    //         .map((item: { content?: string; caption?: string }) => ({
    //           content: item?.content?.trim() ?? "",
    //           caption: item?.caption?.trim() ?? "",
    //           // hashtags: Array.isArray(item?.hashtags)
    //           //   ? item.hashtags.filter((tag): tag is string => typeof tag === "string")
    //           //   : [],
    //         }))
    //         .filter((item: GeneratedMotivation) => item.content.length > 0);
    //     }
    //   } catch (error) {
    //     console.error("Failed to parse AI motivations response:", cleaned);
    //   }
    //   return [];
    // }
    //   static async generateMotivations(
    //   customizations?: MotivationGenerationOptions
    // ): Promise<GeneratedMotivation[]> {
    //   // If no customizations provided, generate random ones
    //   const { tone, type, themes, targetLength } = customizations || {};
    //   const resolvedTone = tone;
    //   const resolvedType = type;
    //   const resolvedThemes = themes && themes.join(", ");
    //   const resolvedLength = targetLength && targetLength > 0 ? targetLength : 300;
    //   const prompt = `
    // You are a world-class motivational and inspirational video script writer optimized for viral success across TikTok, Instagram Reels, Facebook Reels, and YouTube Shorts/Long-form. You've analyzed thousands of viral motivational videos from 2025, incorporating best practices like emotional 0-3s hooks, fast pacing, relatable scenarios, cinematic visuals, rising audio, bold on-screen captions, compelling thumbnails, strategic hashtags, and engagement-driving CTAs. Your goal is to generate content that achieves high views (>100K), engagement (>5% likes/views), shares, and retention by applying every viral factor without omission.
    // Generate exactly 5 unique, high-performing motivational video scripts optimized for short-form virality (20-60s, ${resolvedLength} words) or adaptable to long-form compilations (1-2min+). Each script must be platform-agnostic but include notes for adaptations (e.g., faster cuts for TikTok, aesthetic filters for Instagram).
    // Instructions for each script:
    // 1. Tone & Energy:
    //    - Use the tone: ${resolvedTone} (e.g., energetic, reflective, urgent).
    //    - Write with engaging, modern language. Avoid clichés. Be actionable, inspiring, and psychologically resonant (tap into identity, emotions, intellect, social proof, practical benefits).
    //    - Incorporate rhetorical devices: questions, repetitions, metaphors, sensory language for relatability and emotional pull.
    // 2. Structure / Narrative Flow (Cross-Platform Viral Patterns):
    //    - **Hook (0-3s):** Emotional/relatable/shock/curiosity opener (e.g., "You've forgotten how strong you are" with direct address). Aim for 70%+ retention.
    //    - **Middle/Build (3-40s):** Relatable challenge/scenario, insight/reframing/life lesson, integrate Stoic/wisdom quotes from famous people/books/movies. Use 3-5 key points or story arc with rising tension.
    //    - **Climax (40-50s):** Empowering revelation or call to action, tied to themes.
    //    - **Ending/Outro (50-60s):** Reinforce message with motivational close, include CTA for engagement.
    //    - Length: Roughly ${resolvedLength} words (±20%), mapping to 20-60s spoken pace.
    //    - Pacing: Fast cuts (4-6/min), build with rising energy; for long-form, themed segments.
    // 3. Themes:
    //    - Integrate these themes: ${resolvedThemes} (weave universally: fear, regret, self-doubt into empowerment).
    // 4. Type / Archetype:
    //    - Style this as: ${resolvedType} (e.g., pep talk, affirmation, cinematic edit; ensure diversity: speeches, quotes montages, glow-ups).
    // 5. Viral Elements (Incorporate All Insights):
    //    - **Script/Phrasing:** Conversational "you" address, active voice, vary sentence length for rhythm. Include emotional drivers (pain/aspire), intellectual why's, social proof (stories), practical steps.
    //    - **On-Screen Captions/Text:** Bold sans-serif, timed sync (0.5s delay, 24pt), key phrases/quotes pop (80% screen, readable for silent viewing).
    //    - **Thumbnail:** Suggest frame (e.g., intense pose + quote overlay, high contrast, "Now or Never?").
    //    - **Posting Metadata:** Optimal time (8-10AM/8PM local), crosspost notes (duets for TikTok, boosts for FB).
    //    - **Hashtags:** 3-5 mix (broad #Motivation2025 + niche #StorigenMindset).
    //    - **CTAs & Engagement:** Questions ("What's your 2025 goal?"), tags ("Tag a friend"), challenges ("Save & share your win"), prompts for comments/shares/duets (40%+ reply boost).
    //    - **Distribution/Boost:** Notes for crossposting, UGC encouragement, no paid if not evident.
    //    - Avoid Failures: No generic quotes alone, slow pacing, no CTAs, salesy pitches.
    // 6. Platform-Specific Adaptations:
    //    - **TikTok:** 15-45s, trending sounds, duets/stitches, fast hooks.
    //    - **Instagram Reels:** Aesthetic visuals, UGC prompts, evening posts.
    //    - **Facebook Reels:** Community shares, morning posts, emotional narratives.
    //    - **YouTube Shorts:** Loopable hooks, subscribe CTAs; Long-form: Compilations with watch time focus.
    // 7. Call-to-Action & Social Prompt:
    //    - Include in script: "Like, Comment, and Follow for more — RulingYou" + platform CTAs.
    //    - Provide a **short caption** (1 sentence) summarizing the piece, including exactly 5 relevant hashtags after the sentence.
    //    - Add **thumbnail_description**, **visuals_description**, **audio_suggestion**, **caption_timings** (e.g., "0-3s: Hook text").
    // 8. Output strictly as JSON using this structure:
    // {
    //   "motivations": [
    //     {
    //       "content": "<script text >",
    //       "caption": "<caption with hashtags included>",
    //       "thumbnail_description": "<thumbnail idea>",
    //       "visuals_description": "<detailed visuals/editing notes>",
    //       "audio_suggestion": "<audio/music/VO notes>",
    //       "on_screen_captions": "<timed caption list>",
    //       "platform_adaptations": "<notes for each platform>",
    //       "cta_suggestions": "<additional CTAs>"
    //     }
    //   ]
    // }
    // `;
    //   const response = await openai.chat.completions.create({
    //     model: "gpt-4o-mini",
    //     messages: [{ role: "user", content: prompt }],
    //     temperature: 0.8,
    //   });
    //   const rawOutput = response.choices[0]?.message?.content || "";
    //   const cleaned = rawOutput.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
    //   try {
    //     const parsed = JSON.parse(cleaned);
    //     if (parsed && Array.isArray(parsed.motivations)) {
    //       return parsed.motivations
    //         .map((item: {
    //           content?: string;
    //           caption?: string;
    //           thumbnail_description?: string;
    //           visuals_description?: string;
    //           audio_suggestion?: string;
    //           on_screen_captions?: string;
    //           platform_adaptations?: string;
    //           cta_suggestions?: string;
    //         }) => ({
    //           content: item?.content?.trim() ?? "",
    //           caption: item?.caption?.trim() ?? "",
    //           thumbnail_description: item?.thumbnail_description?.trim() ?? "",
    //           visuals_description: item?.visuals_description?.trim() ?? "",
    //           audio_suggestion: item?.audio_suggestion?.trim() ?? "",
    //           on_screen_captions: item?.on_screen_captions?.trim() ?? "",
    //           platform_adaptations: item?.platform_adaptations?.trim() ?? "",
    //           cta_suggestions: item?.cta_suggestions?.trim() ?? "",
    //         }))
    //         .filter((item: GeneratedMotivation) => item.content.length > 0);
    //     }
    //   } catch (error) {
    //     console.error("Failed to parse AI motivations response:", cleaned);
    //   }
    //   return [];
    // }
    // static async generateMotivations(
    //   customizations?: MotivationGenerationOptions
    // ): Promise<GeneratedMotivation[]> {
    //   const { tone, type, themes, targetLength } = customizations || {};
    //   const resolvedTone = tone;
    //   const resolvedType = type;
    //   const resolvedThemes = themes && themes.join(", ");
    //   const resolvedLength = targetLength && targetLength > 0 ? targetLength : 300;
    //   const prompt = `
    // You are a world-class motivational writer and storytelling expert trained in viral short-form content psychology.
    // Your task is to generate **5 unique, emotionally charged motivational scripts** designed to go viral on TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.
    // Each script must:
    // 1. Be **100% voiceover-ready** — no visual, audio, or editing instructions.
    // 2. Be **formatted naturally for speech rhythm** — use strategic **line breaks**, **ellipses (...),** and **em dashes (—)** to create emotional pacing and pauses.
    // 3. Sound cinematic, confident, and emotionally resonant.
    // ---
    // **Structure and Flow (for each script):**
    // - **Hook (0–3s):** Begin with a powerful question, emotional contrast, or bold statement that grabs immediate attention.
    // - **Relatable Struggle (3–10s):** Describe a pain point or inner conflict most people feel.
    // - **Mindset Shift (10–25s):** Offer a realization, insight, or perspective change — something that reframes the struggle.
    // - **Credibility Anchor:** Optionally include one short quote from a recognizable figure (e.g., Jim Rohn, Tony Robbins, Les Brown, etc.) that reinforces the message.
    // - **Empowering Build (25–40s):** Amplify the emotional energy, use rhythmic phrasing, and encourage self-belief or action.
    // - **Emotional Echo Ending (40–60s):** End with a memorable, uplifting echo line — something that sounds like a powerful outro.
    // - **Call-to-Action (Final Line):** Say: “Like, Comment, and Follow for more — RulingYou.”
    // ---
    // **Tone & Style**
    // - Tone: ${resolvedTone}
    // - Type: ${resolvedType}
    // - Themes: ${resolvedThemes}
    // - Length: Roughly ${resolvedLength} words (±20%)
    // - Avoid clichés; write fresh, original, emotionally intelligent language.
    // - Use short sentences. Focus on rhythm and flow.
    // - Each sentence should feel like it could be the caption of a motivational post.
    // ---
    // **Caption Requirements:**
    // - Include **one concise, emotionally charged caption** (1 sentence max) that summarizes the core message.
    // - After the sentence, include **exactly 5 relevant hashtags** (focused on motivation, mindset, or self-growth).
    // - The hashtags should be natural, not overly generic.
    // ---
    // **Output Format (JSON only):**
    // {
    //   "motivations": [
    //     {
    //       "content": "<spoken script with natural rhythm and emotional pacing, no visual cues>",
    //       "caption": "<caption with 5 hashtags included>"
    //     }
    //   ]
    // }
    // Now generate the 5 viral-level motivational scripts.
    // `;
    //   const response = await openai.chat.completions.create({
    //     model: "gpt-4o-mini",
    //     messages: [{ role: "user", content: prompt }],
    //     temperature: 0.9,
    //   });
    //   const rawOutput = response.choices[0]?.message?.content || "";
    //   const cleaned = rawOutput
    //     .replace(/```json\s*/gi, "")
    //     .replace(/```\s*/g, "")
    //     .trim();
    //   try {
    //     const parsed = JSON.parse(cleaned);
    //     if (parsed && Array.isArray(parsed.motivations)) {
    //       return parsed.motivations
    //         .map((item: { content?: string; caption?: string }) => ({
    //           content: item?.content?.trim() ?? "",
    //           caption: item?.caption?.trim() ?? "",
    //         }))
    //         .filter((item: GeneratedMotivation) => item.content.length > 0);
    //     }
    //   } catch (error) {
    //     console.error("Failed to parse AI motivations response:", cleaned);
    //   }
    //   return [];
    // }
    static async generateMotivations(customizations) {
        var _a, _b;
        const { tone, type, themes, targetLength } = customizations || {};
        const resolvedTone = tone;
        const resolvedType = type;
        const resolvedThemes = themes && themes.join(", ");
        const resolvedLength = targetLength && targetLength > 0 ? targetLength : 300;
        const prompt = `
You are an expert viral motivational and inspirational writer for TikTok, Instagram Reels, YouTube Shorts, and Facebook Reels.  
Generate **5 unique motivational voiceover scripts** that are fully viral-ready.  

Requirements for each script:

1. **Hook (0–3s)**: 
   - Begin with a bold micro-hook or emotionally charged question.  
   - Immediately capture attention with a pattern-interrupt or relatable struggle.  

2. **Relatable Struggle (3–10s)**:  
   - Describe a common challenge or inner conflict with emotional language.  
   - Keep sentences short and rhythmical for voiceover pacing.  

3. **Mindset Shift / Turning Point (10–25s)**:  
   - Reframe the struggle into an opportunity.  
   - Include **one credible quote** (e.g., Jim Rohn, Tony Robbins, Les Brown, Elon Musk, Steve Jobs, Bill Gates, Mark Zuckerberg, Jeff Bezos, Jensen Huang, Warren Buffett, Rockefeller, Albert Einstein, Nikola Tesla, Donald Trump, Richard Branson, Oprah Winfrey, Michelle Obama, Dwayne “The Rock” Johnson, Simon Sinek, Sheryl Sandberg, Maya Angelou, Rumi, Confucius, Lao Tzu, Mahatma Gandhi, Malcolm X, Martin Luther King Jr., Stephen Covey, Ray Dalio, Naval Ravikant, Peter Drucker, Benjamin Franklin, Thomas Edison, Henry Ford, J.K. Rowling, Charles Darwin, Socrates, Aristotle, Leonardo da Vinci, Coco Chanel, Steve Wozniak, Plato, Fred Smith, Howard Schultz, Mark Cuban, Tony Hsieh.) naturally.  

4. **Empowering Build / Climax (25–40s)**:  
   - Use **punchy, rhythmic lines** for rewatchability (e.g., short commands or repeated phrases).  
   - Encourage immediate action or self-belief.  

5. **Emotional Echo Ending (40–60s)**:  
   - End with a memorable, uplifting line that reinforces empowerment.  
   - Include **CTA echo** before the platform call-to-action.  

6. **Call-to-Action (Final Line)**:  
   - Must always end with: “Like, Comment, and Follow for more — RulingYou.”  

7. **Voiceover Formatting**:  
   - Use **ellipses (...)** and **line breaks** to create natural pauses.  
   - Do **not** include music, visual, or stage directions.  
   - Text should read naturally aloud.  

8. **Caption**:  
   - One concise sentence summarizing the script’s core message.  
   - Include **exactly 5 hashtags** — at least one trending (#Motivation2025).  
   - Emotional, actionable, and discovery-focused.  

9. **Tone / Style / Themes**:  
   - Tone: ${resolvedTone}  
   - Type: ${resolvedType}  
   - Themes: ${resolvedThemes}  
   - Length: roughly ${resolvedLength} words (±20%)  

---

**Output strictly as JSON**:

{
  "motivations": [
    {
      "content": "<voiceover-ready script with natural pacing, micro-hooks, punchy climax lines, and emotional echo ending>",
      "caption": "<1-sentence summary with 5 hashtags>"
    }
  ]
}

Generate 5 scripts following these rules.
`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.9,
        });
        const rawOutput = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        const cleaned = rawOutput
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        try {
            const parsed = JSON.parse(cleaned);
            if (parsed && Array.isArray(parsed.motivations)) {
                return parsed.motivations
                    .map((item) => {
                    var _a, _b, _c, _d;
                    return ({
                        content: (_b = (_a = item === null || item === void 0 ? void 0 : item.content) === null || _a === void 0 ? void 0 : _a.trim()) !== null && _b !== void 0 ? _b : "",
                        caption: (_d = (_c = item === null || item === void 0 ? void 0 : item.caption) === null || _c === void 0 ? void 0 : _c.trim()) !== null && _d !== void 0 ? _d : "",
                    });
                })
                    .filter((item) => item.content.length > 0);
            }
        }
        catch (error) {
            console.error("Failed to parse AI motivations response:", cleaned);
        }
        return [];
    }
    // Generate 10 viral story ideas
    static async generateViralIdeas(customizations) {
        var _a, _b;
        const tone = customizations.tone || "cinematic";
        const style = customizations.style || "viral";
        const audience = customizations.targetAudience || "adults";
        const niche = customizations.niche || "African folktale";
        const themes = customizations.themes ||
            "palace drama, kindness, wisdom, curses, betrayal, forbidden love, ancestral wrath, hidden secrets";
        const settings = customizations.settings || "village, palace, forest, or kingdom";
        const prompt = `Generate 5 raw story ideas for a ${niche} YouTube storytelling video.
- Must be inspired by viral themes: ${themes}.
- Rooted in typical ${niche} settings (${settings}).
- Each idea must include a shocking twist or mystery that hooks viewers immediately.
- Write each idea in 3–4 sentences as a clear story seed.

Tone: ${tone}
Style: ${style}
Target Audience: ${audience}

Format: Numbered list (1–5), each with a brief title + 3–4 sentence description.`;
        // Call your AI model here
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // or whichever model
            messages: [{ role: "user", content: prompt }],
            temperature: 0.8,
        });
        // Extract output
        const output = ((_b = (_a = response === null || response === void 0 ? void 0 : response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "";
        return output
            .split(/\n(?=\d+\.)/)
            .map((item) => item.trim())
            .filter(Boolean);
    }
    //Generate Viral Summaries
    static async generateViralSummary(ideaContent, customizations) {
        var _a, _b;
        const tone = customizations.tone; //|| 'cinematic';
        const style = customizations.style; //|| 'viral';
        const audience = customizations.targetAudience; //|| 'general audience';
        const niche = customizations.niche; //|| 'storytelling';
        const themes = customizations.themes; //|| 'betrayal, curse, ancestral wrath, forbidden destiny';
        const settings = customizations.settings; //|| 'village, palace, forest, kingdom';
        const prompt = `Summarize this ${niche} story idea into a viral-style YouTube storytelling description:
"${ideaContent}"

Rules (adapt dynamically based on customizations):
- 5 - 10 sentences total.
- Hook must align with the selected tone (“dramatic”, “mysterious”, “emotional”, etc.).
- Include cultural/setting elements if provided: ${settings}.
- Emphasize key themes: ${themes}.
- Highlight target audience (${audience}) by making the language accessible to them.
- Maintain style: ${style}.
- End with suspense or curiosity, without revealing the full twist.

Tone: ${tone}
Style: ${style}
Target Audience: ${audience}
Niche: ${niche}

⚠️ Return ONLY valid JSON. 
⚠️ Do NOT include markdown code blocks, backticks, or explanations. 
Output must be exactly this JSON object:

{
  "title": "Generated title based on niche and theme",
  "content": "Full viral summary (3–5 sentences)",
  "hook": "First dramatic/mysterious sentence",
  "conflict": "Main conflict (derived from themes)",
  "niche": "${niche}",
  "resolution": "Resolution teaser (no spoilers)",
  "culturalElements": ["Extracted from settings or niche"],
  "viralElements": ["Hook, twist, suspense, mystery"]
}`;
        // Call AI
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
        });
        const rawOutput = ((_b = (_a = response === null || response === void 0 ? void 0 : response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
        // Parse safely
        try {
            // Remove Markdown fences if the AI still returns them
            const cleaned = rawOutput
                .replace(/```json\s*/gi, "")
                .replace(/```\s*/g, "")
                .trim();
            return JSON.parse(cleaned);
        }
        catch (err) {
            console.error("Failed to parse AI viral summary response as JSON:", rawOutput);
            return {
                error: "Invalid JSON returned by AI",
                raw: rawOutput,
                // Provide fallback structure
                title: "Generated Story",
                content: rawOutput,
                hook: "A mysterious tale unfolds...",
                conflict: "The central conflict",
                niche: customizations.niche || "African folktale",
                resolution: "How it ends",
                culturalElements: ["African culture", "Traditional values"],
                viralElements: ["Dramatic twist", "Emotional depth"],
            };
        }
    }
    //Generate Outlines
    static async generateOutline(summaryContent, totalChapters) {
        var _a, _b;
        const prompt = `
  Break this summary into a structured outline for ${totalChapters} chapters:
  "${summaryContent}"

  Rules:
  - Each chapter must have:
    - number
    - purpose (setup, rising, climax, resolution)
    - description (2–3 sentences max).
  - Ensure logical progression: setup → conflict rising → climax → resolution.
  - The final chapter must clearly resolve the conflict.
  
  Return JSON strictly:
  [
    { "number": 1, "purpose": "setup", "description": "..." },
    { "number": 2, "purpose": "rising", "description": "..." },
    ...
  ]
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "[]";
        // Clean the response by removing markdown code blocks if present
        const cleanedContent = content
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        try {
            return JSON.parse(cleanedContent);
        }
        catch (error) {
            console.error("Failed to parse AI outline response as JSON:", cleanedContent);
            // Fallback: return a basic structure if JSON parsing fails
            return Array.from({ length: totalChapters }, (_, i) => ({
                number: i + 1,
                purpose: i === 0 ? "setup" : i === totalChapters - 1 ? "resolution" : "rising",
                description: `Chapter ${i + 1} content based on: ${summaryContent.slice(0, 100)}...`,
            }));
        }
    }
    //Generate Chapters
    static async generateChapter(summaryContent, chapterNumber, totalChapters, outlineItem, options = {}) {
        var _a, _b;
        const { previousChapters = [], wordsPerChapter = 500 } = options;
        // Include ALL previous chapters in full (no truncation)
        const previousText = previousChapters.length > 0
            ? previousChapters
                .map((ch) => `Chapter ${ch.number}: ${ch.title}\n${ch.content}`)
                .join("\n\n")
            : "None yet (this is the beginning of the story).";
        // Extract character information from previous chapters for better continuity
        const characterContext = previousChapters.length > 0
            ? `\n📌 ESTABLISHED CHARACTERS (from previous chapters): Use these exact same characters and their relationships:\n` +
                previousChapters
                    .map((ch) => {
                    // Extract character names and relationships mentioned in each chapter
                    const content = ch.content;
                    const characterMatches = content.match(/(?:Prince|Princess|King|Queen|Chief|Warrior|Villager|Elder|Mother|Father|Son|Daughter|Brother|Sister|Friend|Enemy|Servant|Messenger)\s+[A-Z][a-z]+/g) || [];
                    return `Chapter ${ch.number} characters: ${[
                        ...new Set(characterMatches),
                    ].join(", ")}`;
                })
                    .join("\n")
            : "";
        const isFinalChapter = chapterNumber === totalChapters;
        const prompt = `
You are writing Chapter ${chapterNumber} of a ${totalChapters}-chapter continuous story.

📌 Story Summary (this defines the main characters, family, and central conflict — NEVER alter them):
${summaryContent}

📌 Previous Chapters (you MUST continue directly from these events — maintain characters, setting, and unresolved plotlines):
${previousText}${characterContext}

📌 Current Chapter Outline:
${outlineItem || `Chapter ${chapterNumber} storyline continuation`}

CRITICAL CONTINUITY RULES:
- Write around ${wordsPerChapter} words.
- MAINTAIN THE SAME CHARACTERS AND FAMILY from the summary and previous chapters. Do NOT introduce new families or main characters unless absolutely necessary for the plot.
- If you must introduce a new character, make it a minor supporting character (like a messenger, neighbor, or servant) who serves the existing main characters' story.
- Keep the same setting/location unless the plot explicitly requires movement.
- Continue the same storyline, conflicts, and relationships established in previous chapters.
- Reference specific events, conversations, and character interactions from previous chapters to maintain continuity.
- Use the same character names, relationships, and family dynamics established in the summary and previous chapters.
- Do NOT reset or restart the story with different characters or families.

STORYTELLING REQUIREMENTS:
- Use vivid, descriptive storytelling suitable for YouTube narration.
- ${isFinalChapter
            ? "Since this is the FINAL CHAPTER, resolve the central conflict and end the story on a satisfying note."
            : "End with a suspenseful transition to the next chapter."}
- Do NOT summarize; write full narrative text with multiple paragraphs.
- VERY IMPORTANT: Always return the result in strict JSON format, exactly as specified below.

Example JSON format to follow:
{
  "title": "Chapter title",
  "content": "Full chapter text",
  "paragraphs": [{"text": "Paragraph 1"}, {"text": "Paragraph 2"}],
  "wordCount": number,
  "number": chapter number
}`;
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [{ role: "user", content: prompt }],
        });
        const content = ((_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) || "{}";
        // Clean markdown wrappers if present
        const cleanedContent = content
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/g, "")
            .trim();
        try {
            return JSON.parse(cleanedContent);
        }
        catch (error) {
            console.error("Failed to parse AI response as JSON:", cleanedContent);
            // Fallback: return a basic structure if JSON parsing fails
            return {
                title: `Chapter ${chapterNumber}`,
                content: cleanedContent,
                paragraphs: [{ text: cleanedContent }],
                wordCount: cleanedContent.split(" ").length,
                number: chapterNumber,
            };
        }
    }
    // Generate creative thumbnail prompt
    static async generateThumbnailPrompt(fullStory) {
        var _a;
        const prompt = `
  You are an expert thumbnail designer for viral YouTube videos.

  Analyze the story below and determine what type of story it is 
  (e.g., African folktale, romance, fantasy, horror, mystery, sci-fi, etc.).
  
  Based on the story type, generate ONE detailed thumbnail prompt 
  that could be used in an AI image generator (like MidJourney or Stable Diffusion). 

  Rules for the thumbnail prompt:
  ● Identify the main character(s) and describe them in attire or style authentic to the story’s setting/genre. 
    Give them a strong emotional expression that matches the story’s tone 
    (fear, anger, shock, sadness, pride, mystery, joy, determination).
  ● Place the character in a dramatic setting that reflects the conflict or theme 
    (palace courtyard, futuristic city, battlefield, moonlit forest, haunted house, marketplace, ancestral shrine, etc.).
  ● Add one symbolic or supernatural visual cue from the story 
    (glowing eyes, broken crown, shadow figure, mask, lightning, fire, snake, mysterious artifact, etc.) to spark curiosity.
  ● Use a cinematic color palette that fits the mood of the story 
    (e.g., warm golds/reds/oranges for epic drama, deep blues/purples for mystery, 
    neon tones for sci-fi, etc.), contrasted with shadows or cool tones to build tension.
  ● Generate 3–5 short overlay text options that tease the story’s conflict or mystery. 
    The text must be emotional, suspenseful, and avoid giving away the twist.
  ● Ensure the overall design feels bold, mysterious, and click-worthy, aligned with viral YouTube storytelling thumbnails.

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate a single viral YouTube title
    static async generateViralTitle(fullStory) {
        var _a;
        const prompt = `
  You are a YouTube strategist and viral title expert.

  Analyze the story below and first identify its type/genre 
  (e.g., African folktale, romance, fantasy, horror, sci-fi, mystery, etc.).

  Based on that, generate 1 viral YouTube title for the story.

  Rules for the title:
  ● Title must be under 65 characters.
  ● Use emotional, suspenseful, or mysterious words 
    (e.g., shocking, forbidden, untold, cursed, betrayed, secret, mysterious, lost, haunted).
  ● Include cultural or genre-specific cues 
    (e.g., palace, king, queen, bride, village, forest, spirits, throne, wedding, galaxy, haunted house, etc.).
  ● Hint at the conflict or twist without revealing the full outcome.
  ● Style: cinematic, dramatic, and curiosity-driven, like successful viral storytelling channels.
  ● Return ONLY the title, no numbering or additional text.

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate 5 outstanding, high-CTR YouTube title ideas
    static async generateTitles(fullStory) {
        var _a;
        const prompt = `
  You are a YouTube strategist and viral title expert.

  Analyze the story below and first identify its type/genre 
  (e.g., African folktale, romance, fantasy, horror, sci-fi, mystery, etc.).

  Based on that, generate 10 viral YouTube title ideas for the story.

  Rules for the titles:
  ● Each title must be under 65 characters.
  ● Use emotional, suspenseful, or mysterious words 
    (e.g., shocking, forbidden, untold, cursed, betrayed, secret, mysterious, lost, haunted).
  ● Include cultural or genre-specific cues 
    (e.g., palace, king, queen, bride, village, forest, spirits, throne, wedding, galaxy, haunted house, etc.).
  ● Hint at the conflict or twist without revealing the full outcome.
  ● Style: cinematic, dramatic, and curiosity-driven, like successful viral storytelling channels.
  ● Deliver the result as a clean numbered list (1–10).

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate SEO optimized YouTube description + synopsis
    static async generateDescription(fullStory) {
        var _a;
        const prompt = `
  You are a YouTube strategist and expert storyteller.

  Analyze the story below and determine its type/genre 
  (e.g., African folktale, fantasy, horror, romance, sci-fi, mystery, etc.).

  Based on the story, write a compelling YouTube video description.

  Rules:
  ● Begin with a dramatic hook in 1–2 sentences that teases the central conflict or mystery.
  ● Provide a short synopsis of the story (3–5 sentences) written in a cinematic, suspenseful style.
  ● Add cultural or historical references that match the story’s setting 
    (e.g., palace, ancestors, traditions, rituals, spirits, kings, queens, warriors, galaxy, haunted house, etc.).
  ● End with a strong call to action: encourage viewers to like, share, comment their thoughts, 
    and subscribe for more stories.
  ● Keep the tone engaging, mysterious, and aligned with viral storytelling channels.
  ● Make sure it feels optimized for YouTube descriptions (keywords, emotional language, 
    curiosity-driven phrasing).

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate image prompts
    static async generateImagePrompts(chapterText, originalPrompt) {
        var _a;
        const prompt = `
  You are an expert AI image prompt engineer for cinematic storytelling.

  For the following chapter, generate 1 detailed image prompt for EACH paragraph.

  Rules for the image prompts:
  ● Each prompt must vividly capture the main event, setting, or emotion of its paragraph.
  ● Keep characters visually consistent across all prompts (same names, appearance, attire).
  ● Use cinematic, dramatic, and culturally accurate visuals based on the story’s genre. 
    If African storytelling: include palaces, villages, forests, rivers, warriors, kings, queens, rituals, masks, ancestral spirits, festivals, 
    traditional clothing, and landscapes. 
    If another genre: adapt cultural cues (e.g., sci-fi city, medieval castle, haunted mansion).
  ● Style: hyper-realistic / cinematic / epic illustration.
  ● Each prompt should be standalone (do not mention “paragraph” or “chapter” in the wording).
  ● Deliver results as a clean numbered list, matching the number of paragraphs in the chapter.

  ${originalPrompt ? `Reference for consistency: ${originalPrompt}` : ""}

  Chapter:
  ${chapterText}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate shorthooks
    static async generateShortsHooks(fullStory) {
        var _a;
        const prompt = `
  You are a YouTube strategist and scriptwriter for viral storytelling Shorts.

  Analyze the story below and determine its type/genre 
  (e.g., African folktale, fantasy, horror, romance, sci-fi, mystery, etc.).

  Based on the story, create 5 different YouTube Shorts opening hooks 
  (5–10 seconds each).

  Rules:
  ● Start with a shocking question, mysterious statement, or dramatic action.
  ● Use suspenseful and emotional language that makes the viewer curious to keep watching.
  ● Keep sentences short, punchy, and cinematic (ideal for Shorts format).
  ● Style should feel like viral storytelling channels: engaging, mysterious, and full of tension.
  ● Deliver results as a clean numbered list (1–5).

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
    //Generate SEO keywords and hashtags
    static async generateSEOKeywords(fullStory) {
        var _a;
        const prompt = `
  You are a YouTube SEO expert and viral content strategist.

  Analyze the story below and determine its type/genre 
  (e.g., African folktale, fantasy, horror, romance, sci-fi, mystery, etc.).

  Based on the story, generate SEO-optimized keywords and hashtags.

  Rules:
  ● Generate 15 SEO keywords (2-4 words each) that are relevant to the story's genre, themes, and cultural elements.
  ● Generate 10 trending YouTube hashtags that mix general storytelling tags with specific cultural/genre tags.
  ● Keywords should include terms like: storytelling, folktale, African stories, bedtime stories, viral stories, etc.
  ● Hashtags should be formatted with # and include both broad and niche tags.
  ● Focus on terms that would help the video rank well in YouTube search and recommendations.

  Story:
  ${fullStory}
  `;
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
        });
        return ((_a = response.choices[0].message) === null || _a === void 0 ? void 0 : _a.content) || "";
    }
}
exports.AIService = AIService;
