import OpenAI from "openai";
import { config } from "dotenv";
import { Niche } from "../types/types";

// Load environment variables
config({ path: "./config.env" });

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface PromptCustomization {
  tone?:
    | "dramatic"
    | "mysterious"
    | "emotional"
    | "cinematic"
    | "traditional"
    | string;
  style?: "viral" | "educational" | "entertainment" | "cultural" | string;
  targetAudience?: "children" | "adults" | "family" | "teens" | string;
  themes?: string;
  niche?: Niche | string; // ✅ now strongly typed
  settings?: string;
}
export class AIService {
  // Generate 10 viral story ideas
  static async generateViralIdeas(
    customizations: PromptCustomization
  ): Promise<string[]> {
    const tone = customizations.tone || "cinematic";
    const style = customizations.style || "viral";
    const audience = customizations.targetAudience || "adults";
    const niche = customizations.niche || "African folktale";
    const themes =
      customizations.themes ||
      "palace drama, kindness, wisdom, curses, betrayal, forbidden love, ancestral wrath, hidden secrets";
    const settings =
      customizations.settings || "village, palace, forest, or kingdom";

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
    const output = response?.choices[0]?.message?.content || "";
    return output
      .split(/\n(?=\d+\.)/)
      .map((item: any) => item.trim())
      .filter(Boolean);
  }

  //Generate Viral Summaries
  static async generateViralSummary(
    ideaContent: string,
    customizations: PromptCustomization
  ): Promise<any> {
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

    const rawOutput = response?.choices[0]?.message?.content || "{}";

    // Parse safely
    try {
      // Remove Markdown fences if the AI still returns them
      const cleaned = rawOutput
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      return JSON.parse(cleaned);
    } catch (err) {
      console.error(
        "Failed to parse AI viral summary response as JSON:",
        rawOutput
      );
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
  static async generateOutline(
    summaryContent: string,
    totalChapters: number
  ): Promise<
    {
      number: number;
      purpose: string;
      description: string;
    }[]
  > {
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

    const content = response.choices[0]?.message?.content || "[]";

    // Clean the response by removing markdown code blocks if present
    const cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
      console.error(
        "Failed to parse AI outline response as JSON:",
        cleanedContent
      );
      // Fallback: return a basic structure if JSON parsing fails
      return Array.from({ length: totalChapters }, (_, i) => ({
        number: i + 1,
        purpose:
          i === 0 ? "setup" : i === totalChapters - 1 ? "resolution" : "rising",
        description: `Chapter ${i + 1} content based on: ${summaryContent.slice(
          0,
          100
        )}...`,
      }));
    }
  }

  //Generate Chapters
  static async generateChapter(
    summaryContent: string,
    chapterNumber: number,
    totalChapters: number,
    outlineItem: string,
    options: {
      previousChapters?: { number: number; title: string; content: string }[];
      wordsPerChapter?: number;
    } = {}
  ): Promise<{
    title: string;
    content: string;
    paragraphs: { text: string }[];
    wordCount: number;
    number: number;
  }> {
    const { previousChapters = [], wordsPerChapter = 500 } = options;

    // Include ALL previous chapters in full (no truncation)
    const previousText =
      previousChapters.length > 0
        ? previousChapters
            .map((ch) => `Chapter ${ch.number}: ${ch.title}\n${ch.content}`)
            .join("\n\n")
        : "None yet (this is the beginning of the story).";

    // Extract character information from previous chapters for better continuity
    const characterContext =
      previousChapters.length > 0
        ? `\n📌 ESTABLISHED CHARACTERS (from previous chapters): Use these exact same characters and their relationships:\n` +
          previousChapters
            .map((ch) => {
              // Extract character names and relationships mentioned in each chapter
              const content = ch.content;
              const characterMatches =
                content.match(
                  /(?:Prince|Princess|King|Queen|Chief|Warrior|Villager|Elder|Mother|Father|Son|Daughter|Brother|Sister|Friend|Enemy|Servant|Messenger)\s+[A-Z][a-z]+/g
                ) || [];
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
- ${
      isFinalChapter
        ? "Since this is the FINAL CHAPTER, resolve the central conflict and end the story on a satisfying note."
        : "End with a suspenseful transition to the next chapter."
    }
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

    const content = response.choices[0]?.message?.content || "{}";

    // Clean markdown wrappers if present
    const cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch (error) {
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
  static async generateThumbnailPrompt(fullStory: string) {
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

    return response.choices[0].message?.content || "";
  }

  //Generate 5 outstanding, high-CTR YouTube title ideas
  static async generateTitles(fullStory: string) {
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

    return response.choices[0].message?.content || "";
  }

  //Generate SEO optimized YouTube description + synopsis
  static async generateDescription(fullStory: string) {
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

    return response.choices[0].message?.content || "";
  }

  //Generate image prompts
  static async generateImagePrompts(
    chapterText: string,
    originalPrompt?: string
  ) {
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

    return response.choices[0].message?.content || "";
  }
}
