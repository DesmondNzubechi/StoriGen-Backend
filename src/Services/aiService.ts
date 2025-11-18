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

const AI33_API_KEY = process.env.AI33_API_KEY;

if (!AI33_API_KEY) {
  throw new Error("AI33_API_KEY environment variable is required");
}

const AI33_API_BASE_URL =
  process.env.AI33_API_BASE_URL || "https://api.ai33.pro";
const AI33_DEFAULT_MODEL_ID =
  process.env.AI33_TTS_MODEL_ID || "eleven_multilingual_v2";
const AI33_DEFAULT_VOICE_ID = process.env.AI33_DEFAULT_VOICE_ID;

const resolveNumericEnv = (
  value: string | undefined,
  fallback: number
): number => {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
};

const AI33_TTS_POLL_INTERVAL_MS = resolveNumericEnv(
  process.env.AI33_TTS_POLL_INTERVAL_MS,
  2000
);
const AI33_TTS_MAX_ATTEMPTS = resolveNumericEnv(
  process.env.AI33_TTS_MAX_ATTEMPTS,
  15
);

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
  niche?: Niche | string; 
  settings?: string;
}
interface MotivationCustomization {
  typeOfMotivation: string; // e.g. "Fitness Motivation"
  theme: string;            // e.g. "Discipline"
  targetWord: number;      // e.g. "consistency"
}

interface MotivationGenerationOptions {
  tone: string;
  type: string;
  themes: string[];
  targetLength: number;
} 
  
interface SpeechGenerationOptions {
  text: string;
  voiceId?: string;
  modelId?: string;
  receiveUrl?: string;
  withTranscript?: boolean;
  pollIntervalMs?: number;
  maxPollAttempts?: number;
}

type SpeechTaskStatus = "doing" | "done" | "error";

interface SpeechTaskMetadata {
  audio_url?: string;
  srt_url?: string;
}

interface SpeechTaskResponse {
  id: string;
  created_at: string;
  status: SpeechTaskStatus;
  error_message?: string | null;
  credit_cost?: number;
  metadata?: SpeechTaskMetadata;
  progress?: number;
  type?: string;
}

interface SpeechGenerationResult {
  taskId: string;
  status: SpeechTaskStatus;
  audioUrl?: string;
}

export interface GeneratedMotivation {
  content: string;
  caption: string;
  //hashtags: string[];
}
export class AIService {
  private static async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private static async createSpeechTask(
    options: SpeechGenerationOptions
  ): Promise<{ taskId: string }> {
    const { text, voiceId, modelId, receiveUrl, withTranscript } = options;

    const resolvedVoiceId = voiceId || AI33_DEFAULT_VOICE_ID;
    if (!resolvedVoiceId) {
      throw new Error(
        "A voiceId must be provided either in the request or via AI33_DEFAULT_VOICE_ID environment variable."
      );
    }

    const trimmedText = text.trim();
    if (!trimmedText) {
      throw new Error("Text content is required to generate speech.");
    }

    const payload: Record<string, unknown> = {
      text: trimmedText,
      model_id: modelId || AI33_DEFAULT_MODEL_ID,
      with_transcript: withTranscript ?? false,
    };

    if (receiveUrl) {
      payload.receive_url = receiveUrl;
    }

    const response = await fetch(
      `${AI33_API_BASE_URL}/v1/text-to-speech/${resolvedVoiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": AI33_API_KEY!,
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to create speech task. Status: ${response.status}. Body: ${errorBody}`
      );
    }

    const result = (await response.json()) as {
      success?: boolean;
      task_id?: string;
      error?: string;
      message?: string;
    };

    if (!result.task_id) {
      throw new Error(
        `Speech task creation response missing task_id. Raw response: ${JSON.stringify(
          result
        )}`
      );
    }

    return { taskId: result.task_id };
  }

  private static async fetchSpeechTask(
    taskId: string
  ): Promise<SpeechTaskResponse> {
    const response = await fetch(`${AI33_API_BASE_URL}/v1/task/${taskId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": AI33_API_KEY!,
      },
    }); 

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `Failed to fetch speech task ${taskId}. Status: ${response.status}. Body: ${errorBody}`
      );
    }

    return (await response.json()) as SpeechTaskResponse;
  }

  private static async pollSpeechTask(
    taskId: string,
    pollIntervalMs: number,
    maxAttempts: number
  ): Promise<SpeechTaskResponse> {
    let attempts = 0;
    let latest: SpeechTaskResponse | null = null;

    while (attempts < maxAttempts) {
      latest = await this.fetchSpeechTask(taskId);

      if (latest.status === "done" || latest.status === "error") {
        return latest;
      }

      attempts += 1;
      await this.sleep(pollIntervalMs);
    }

    return (
      latest || {
        id: taskId,
        created_at: new Date().toISOString(),
        status: "doing",
      }
    );
  }

  static async generateMotivationSpeechAudio(
    options: SpeechGenerationOptions
  ): Promise<SpeechGenerationResult> {
    const pollInterval =
      options.pollIntervalMs ?? AI33_TTS_POLL_INTERVAL_MS;
    const maxAttempts =
      options.maxPollAttempts ?? AI33_TTS_MAX_ATTEMPTS;

    const { taskId } = await this.createSpeechTask(options);

    const task = await this.pollSpeechTask(
      taskId,
      pollInterval,
      maxAttempts
    );

    return {
      taskId,
      status: task.status,
      audioUrl: task.metadata?.audio_url,
    };
  }

  //generate motivational speech
  static async generateMotivationalSpeech(
    customizations: MotivationCustomization
  ): Promise<{
    title: string;
    caption: string;
    hashTag: string;
    content: string;
    imagePrompts: string[];
  }> {
    const { typeOfMotivation, theme, targetWord } = customizations;
    const targetLength = targetWord || 200; // default ~200 words

    // Prompt designed for viral motivational shorts
    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

Generate a **viral motivational script** using the following details:

Type of motivation: ${typeOfMotivation}
Theme: ${theme}
Target length: Around ${targetLength} words

Requirements:
1. Start with a **hook** — a bold, emotional first line that immediately grabs the viewer's attention.
2. Structure the script into **3–5 short, powerful paragraphs**, each representing an emotional or mental shift.
3. End with a **strong outro** that feels complete and motivating — then finish with a **social CTA** that says:
   "Follow us for more daily motivation. Like, comment, and share this video if it inspired you."
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

    const rawOutput = response.choices[0]?.message?.content || "";

    // 🧩 Parse structured response
    const titleMatch = rawOutput.match(/Title:\s*(.*)/i);
    const captionMatch = rawOutput.match(/Caption:\s*([\s\S]*?)\n\s*Hashtags:/i);
    const hashtagsMatch = rawOutput.match(/Hashtags:\s*(.*)/i);
    const scriptMatch = rawOutput.match(/Script:\s*([\s\S]*?)\n\s*Image Prompts:/i);
    const imagePromptsMatch = rawOutput.match(/Image Prompts:\s*([\s\S]*)/i);

    const title = titleMatch?.[1]?.trim() || "Untitled Motivation";
    const caption = captionMatch?.[1]?.trim() || "Stay inspired, stay driven.";
    const hashTag =
      hashtagsMatch?.[1]?.trim() ||
      "#Motivation #Mindset #Discipline #Success #NeverGiveUp";
    const content = scriptMatch?.[1]?.trim() || rawOutput;
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

  static async generateMotivations(
  customizations?: MotivationGenerationOptions
): Promise<GeneratedMotivation[]> {
  // If no customizations provided, generate random ones
  const { tone, type, themes, targetLength } = customizations || {};
  const resolvedTone = tone;
  const resolvedType = type;
  const resolvedThemes = themes &&  themes.join(", ");
  const resolvedLength = targetLength && targetLength > 0 ? targetLength : 300;

  const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a world-class motivational and inspirational writer for TikTok.
Generate exactly 5 unique, high-performing motivational content pieces optimized for short-form social media virality.

Instructions for each piece:
1. Tone & Energy:
   - Use the tone: ${resolvedTone}
   - Write with engaging, modern language. Avoid clichés. Be actionable and inspiring.

2. Structure / Narrative Flow:
   - Start with a **hook** — a bold, emotional first line that immediately grabs the viewer's attention.
   - Build a relatable scenario or challenge.
   - Provide insight, reframing, or life lesson.
   - Include quotes from famous people, books, or movies.
   - End with an empowering outro that reinforces the main message.
   - Use metaphors or sensory language where relevant.
  

3. Themes:
   - Integrate these themes: ${resolvedThemes}

4. Type / Archetype:
   - Style this as: ${resolvedType}

5. Length: 
   - Each piece should be roughly ${resolvedLength} words (±20%).

6. Call-to-Action & Social Prompt:
   - Include: "Like, Comment, and Follow for more — RulingYou"
   - Provide a **short caption** (1 sentence) summarizing the piece and you must Include exactly 5 relevant hashtags directly in the caption, after the sentence.

7. Output strictly as JSON using this structure:

{
  "motivations": [
    {
      "content": "<motivation text with hook and empowering outro>",
     "caption": "<caption with hashtags included>"
    }
  ]
}
`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.8,
  });

  const rawOutput = response.choices[0]?.message?.content || "";
  const cleaned = rawOutput.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    if (parsed && Array.isArray(parsed.motivations)) {
      return parsed.motivations
        .map((item: { content?: string; caption?: string }) => ({
          content: item?.content?.trim() ?? "",
          caption: item?.caption?.trim() ?? "",
          // hashtags: Array.isArray(item?.hashtags)
          //   ? item.hashtags.filter((tag): tag is string => typeof tag === "string")
          //   : [],
        }))
        .filter((item: GeneratedMotivation) => item.content.length > 0);
    }
  } catch (error) {
    console.error("Failed to parse AI motivations response:", cleaned);
  }

  return []; 
}


  static async generateViralIdeas(
    customizations: PromptCustomization
  ): Promise<string[]> {
    const tone = customizations.tone;
    const style = customizations.style;
    const audience = customizations.targetAudience ;
    const niche = customizations.niche;
    const themes =
      customizations.themes 
    const settings =
      customizations.settings ;

    const prompt = `IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

Generate 2 raw story ideas for a ${niche} YouTube storytelling video.
- Must be inspired by viral themes: ${themes}.
- Rooted in typical ${niche} settings (${settings}).
- Each idea must include a shocking twist or mystery that hooks viewers immediately.
- Write each idea in 1 sentence as a clear story seed.

Tone: ${tone}
Style: ${style}
Target Audience: ${audience}

Format: Numbered list (1–2), each with a brief title + 1 sentence description.`;

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
    tone: string, targetAudience:string, niche:string, themes:string, settings: string 
  ): Promise<any> {
    const prompt = `IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

Generate 5 unique summaries of ${niche} stories. Each summary should be in 2–3 engaging paragraphs that highlight the main characters, the central conflict, and the resolution. Make each summary vivid and easy to follow, ending with the wisdom or moral lesson the story teaches.

Customization Details:
- Story Type/Niche: ${niche}
- Tone: ${tone || "dramatic"}
- Style:  "viral"
- Target Audience: ${targetAudience || "general audience"}
- Themes: ${themes || "conflict, resolution, wisdom"}
- Settings: ${settings || "various locations fitting the niche"}

Requirements for each summary:
1. **Main Characters**: Clearly introduce the main characters with their roles and motivations.
2. **Central Conflict**: Describe the primary challenge, obstacle, or problem the characters face.
3. **Resolution**: Explain how the conflict is resolved or how the story concludes.
4. **Moral Lesson/Wisdom**: End each summary with the wisdom or moral lesson the story teaches.
5. **Vividness**: Use descriptive, engaging language that brings the story to life.
6. **Length**: Each summary should be 2–3 paragraphs (approximately 150–250 words).
7. **Uniqueness**: Each of the 5 summaries should be completely different stories within the ${niche} genre.

⚠️ Return ONLY valid JSON. 
⚠️ Do NOT include markdown code blocks, backticks, or explanations. 
Output must be exactly this JSON array:

[
  {
    "title": "Story title 1",
    "content": "2-3 paragraph summary with characters, conflict, resolution, and moral lesson",
    "mainCharacters": [],
    "conflict": "Brief description of the central conflict",
    "resolution": "How the conflict is resolved",
    "moralLesson": "The wisdom or moral lesson taught by this story",
    "niche": "${niche}",
    "themes": []
  },
  {
    "title": "Story title 2",
    "content": "2-3 paragraph summary with characters, conflict, resolution, and moral lesson",
    "mainCharacters": [],
    "conflict": "Brief description of the central conflict",
    "resolution": "How the conflict is resolved",
    "moralLesson": "The wisdom or moral lesson taught by this story",
    "niche": "${niche}",
    "themes": []
  }
  // ... continue for all 5 summaries
]`;

    // Call AI
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    const rawOutput = response?.choices[0]?.message?.content || "[]";

    // Parse safely
    try {
      // Remove Markdown fences if the AI still returns them
      const cleaned = rawOutput
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      
      // Ensure we return an array
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      
      // If it's a single object, wrap it in an array
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return [parsed];
      }
      
      return parsed;
    } catch (err) {
      console.error(
        "Failed to parse AI viral summary response as JSON:",
        rawOutput
      );
      // Return fallback structure as array
      return [{
        error: "Invalid JSON returned by AI",
        raw: rawOutput,
        title: "Generated Story",
        content: rawOutput,
        mainCharacters: ["Unknown"],
        conflict: "The central conflict",
        resolution: "How it ends",
        moralLesson: "The wisdom of the story",
        niche: niche || "story",
        themes: themes ? themes.split(",").map(t => t.trim()) : ["conflict", "resolution"],
      }];
    }
  }

  //Generate Enhanced Outlines with Story Metadata
  static async generateEnhancedOutline(
    summaryContent: string,
    totalChapters: number,
    customizations: {
      title?: string;
      characters?: string[];
      settings?: string[];
      themes?: string[];
      tone?: string;
    } = {}
  ): Promise<{
    outline: {
      number: number;
      purpose: string;
      description: string;
    }[];
    metadata: {
      title: string;
      characters: string[];
      settings: string[];
      themes: string[];
      tone: string;
    };
  }> {
    const { title, characters, settings, themes, tone } = customizations;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

Generate a comprehensive story outline and metadata based on this summary:
"${summaryContent}"

Requirements:
1. Extract or generate:
   - A compelling story title
   - Main characters (names and brief roles)
   - Settings/locations where the story takes place
   - Key themes explored in the story
   - Story tone (dramatic, mysterious, emotional, etc.)

2. Create a detailed outline for ${totalChapters} chapters:
   - Each chapter must have: number, purpose (setup, rising, climax, resolution), and a detailed description (2-3 sentences)
   - Ensure logical progression: setup → conflict rising → climax → resolution
   - The final chapter must clearly resolve the conflict
   - Make the outline very solid and detailed for consistent chapter generation

${title ? `- Use this title: ${title}` : '- Generate a compelling title based on the summary'}
${characters && characters.length > 0 ? `- Main characters: ${characters.join(', ')}` : '- Extract main characters from the summary'}
${settings && settings.length > 0 ? `- Settings: ${settings.join(', ')}` : '- Extract settings from the summary'}
${themes && themes.length > 0 ? `- Themes: ${themes.join(', ')}` : '- Extract themes from the summary'}
${tone ? `- Tone: ${tone}` : '- Determine tone from the summary'}

Return JSON strictly:
{
  "title": "Story title",
  "characters": ["Character 1", "Character 2"],
  "settings": ["Setting 1", "Setting 2"],
  "themes": ["Theme 1", "Theme 2"],
  "tone": "dramatic",
  "outline": [
    { "number": 1, "purpose": "setup", "description": "Detailed description..." },
    { "number": 2, "purpose": "rising", "description": "Detailed description..." },
    ...
  ]
}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content || "{}";

    // Clean the response by removing markdown code blocks if present
    const cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    try {
      const parsed = JSON.parse(cleanedContent);
      return {
        outline: parsed.outline || [],
        metadata: {
          title: parsed.title || title || "Untitled Story",
          characters: parsed.characters || characters || [],
          settings: parsed.settings || settings || [],
          themes: parsed.themes || themes || [],
          tone: parsed.tone || tone || "dramatic",
        },
      };
    } catch (error) {
      console.error(
        "Failed to parse AI outline response as JSON:",
        cleanedContent
      );
      // Fallback: return a basic structure if JSON parsing fails
      return {
        outline: Array.from({ length: totalChapters }, (_, i) => ({
          number: i + 1,
          purpose:
            i === 0 ? "setup" : i === totalChapters - 1 ? "resolution" : "rising",
          description: `Chapter ${i + 1} content based on: ${summaryContent.slice(
            0,
            100
          )}...`,
        })),
        metadata: {
          title: title || "Untitled Story",
          characters: characters || [],
          settings: settings || [],
          themes: themes || [],
          tone: tone || "dramatic",
        },
      };
    }
  }

 
  //Generate Chapters with Summary
  static async generateChapter( 
    summaryContent: string,
    chapterNumber: number,
    totalChapters: number,
    outlineItem: string,
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      lastChapterSummary?: string;
      wordsPerChapter?: number;
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
        niche?: string;
      };
    } = {}
  ): Promise<{
    title: string;
    content: string;
    summary: string; // Short summary for continuity - MUST be generated
    paragraphs: { text: string }[];
    wordCount: number;
    number: number;
  }> {
    const { 
      storyOutline = [], 
      lastChapterSummary, 
      wordsPerChapter = 500,
      storyMetadata = {}
    } = options;

    const { title, characters = [], settings = [], themes = [], tone, niche } = storyMetadata;

    // For subsequent chapters (chapterNumber > 1), ONLY use outline + last chapter summary
    // For first chapter, use full summary
    const contextForContinuity = chapterNumber > 1 && lastChapterSummary
      ? `📌 Previous Chapter Summary (for continuity):
${lastChapterSummary}

📌 Full Story Outline (for context):
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : chapterNumber === 1
      ? `📌 Story Summary (this defines the main characters, family, and central conflict — NEVER alter them):
${summaryContent}`
      : `📌 Story Summary (this defines the main characters, family, and central conflict — NEVER alter them):
${summaryContent}

📌 Full Story Outline (for context):
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`;

    const isFinalChapter = chapterNumber === totalChapters;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are writing Chapter ${chapterNumber} of a ${totalChapters}-chapter continuous story.

${contextForContinuity}

${title ? `📌 Story Title: ${title}` : ''}
${characters.length > 0 ? `📌 Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `📌 Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `📌 Themes: ${themes.join(', ')}` : ''}
${tone ? `📌 Tone: ${tone}` : ''}

📌 Current Chapter Outline:
${outlineItem || `Chapter ${chapterNumber} storyline continuation`}

CRITICAL CONTINUITY RULES:
- Write around ${wordsPerChapter} words.
- MAINTAIN THE SAME CHARACTERS from the story metadata and previous chapters. Do NOT introduce new main characters unless absolutely necessary for the plot.
- If you must introduce a new character, make it a minor supporting character who serves the existing main characters' story.
- Keep the same setting/location unless the plot explicitly requires movement.
- Continue the same storyline, conflicts, and relationships established in previous chapters.
- Reference specific events from the previous chapter summary to maintain continuity.
- Use the same character names, relationships, and dynamics established in the story metadata.
- Do NOT reset or restart the story with different characters or families.

STORYTELLING REQUIREMENTS:
- Use vivid, descriptive storytelling suitable for YouTube narration.
- ${
      isFinalChapter
        ? "Since this is the FINAL CHAPTER, resolve the central conflict and end the story on a satisfying note."
        : "End with a suspenseful transition to the next chapter."
    }
- Do NOT summarize; write full narrative text with multiple paragraphs.
- CRITICAL: You MUST generate a concise 2-3 sentence summary of this chapter. This summary will be used for continuity in the next chapter generation.
- VERY IMPORTANT: Return ONLY valid JSON. Do NOT include any text before or after the JSON object. Do NOT include prefixes like "Chapter X:" or any other descriptive text. Start your response directly with the opening brace { and end with the closing brace }.

Return ONLY this JSON structure:
{
  "title": "Chapter title",
  "content": "Full chapter text",
  "summary": "A concise 2-3 sentence summary of this chapter for continuity (MUST be included)",
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
    let cleanedContent = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    // Extract JSON object even if there's text before it (e.g., "Chapter 3: Chapter 3 {...}")
    // Find the first opening brace and extract the complete JSON object
    const firstBraceIndex = cleanedContent.indexOf('{');
    if (firstBraceIndex >= 0) {
      // Find the matching closing brace by counting nested braces
      let braceCount = 0;
      let jsonEndIndex = firstBraceIndex;
      
      for (let i = firstBraceIndex; i < cleanedContent.length; i++) {
        if (cleanedContent[i] === '{') {
          braceCount++;
        } else if (cleanedContent[i] === '}') {
          braceCount--;
          if (braceCount === 0) {
            jsonEndIndex = i + 1;
            break;
          }
        }
      }
      
      if (braceCount === 0) {
        cleanedContent = cleanedContent.substring(firstBraceIndex, jsonEndIndex);
      }
    }

    try {
      const parsed = JSON.parse(cleanedContent);
      // Ensure summary is included - this is critical for continuity
      if (!parsed.summary || parsed.summary.trim().length === 0) {
        // Generate a summary from the content if not provided by AI
        const sentences = parsed.content.split(/[.!?]+/).filter((s: string) => s.trim().length > 0);
        parsed.summary = sentences.slice(0, 3).join('. ').trim() + (sentences.length > 0 ? '.' : '');
        console.warn(`Chapter ${chapterNumber} summary was not provided by AI, generated fallback summary`);
      }
      return parsed;
    } catch (error) {
      console.error("Failed to parse AI response as JSON:", cleanedContent);
      // Fallback: return a basic structure if JSON parsing fails
      const fallbackContent = cleanedContent;
      return {
        title: `Chapter ${chapterNumber}`,
        content: fallbackContent,
        summary: fallbackContent.split('.').slice(0, 3).join('.') + '.',
        paragraphs: [{ text: fallbackContent }],
        wordCount: fallbackContent.split(" ").length,
        number: chapterNumber,
      };
    }
  }

  // Generate creative thumbnail prompt
  static async generateThumbnailPrompt(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
      };
      videoTitle?: string;
    } = {}
  ) {
    const { storyOutline = [], storyMetadata = {}, videoTitle } = options;
    const { title, characters = [], settings = [], themes = [], tone } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${videoTitle ? `Video Title: ${videoTitle}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are an expert thumbnail designer for viral YouTube videos.

Create a YouTube thumbnail concept based on the provided story outline and video title.

${metadataText}

${outlineText}

REQUIREMENTS:
● The main focus should be one or two key characters, shown with strong emotional expressions (fear, anger, shock, sadness, pride), dressed in attire that fits the story's world and setting.
● Include one mysterious or supernatural visual element (such as glowing eyes, a shadowy figure, a symbolic creature, fire, storm clouds, a mask, etc.) to spark curiosity.
● Use a dramatic background that reflects the story's environment—palace-like settings, forests, villages, shrines, or any relevant location from the outline—designed with strong visual contrast.
● Choose a color palette that supports tension and drama, such as warm tones against deeper shadows.
● Add a short 3–5 word overlay text in a bold, cinematic font that hints at the conflict without revealing it.
● The final concept should feel cinematic, suspenseful, highly click-worthy, and maintain an air of mystery.
● Adapt to the story's genre, tone, themes, and setting (not limited to any specific type or culture).

Generate ONE detailed thumbnail prompt that could be used in an AI image generator (like MidJourney or Stable Diffusion).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return response.choices[0].message?.content || "";
  }

  //Generate a single viral YouTube title
  static async generateViralTitle(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
      };
    } = {}
  ) {
    const { storyOutline = [], storyMetadata = {} } = options;
    const { title, characters = [], settings = [], themes = [], tone } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a YouTube strategist and viral title expert.

Create a viral YouTube title based on the provided story outline.

${metadataText}

${outlineText}

REQUIREMENTS:
● Each title must be under 65 characters.
● Use emotional, suspenseful, or mysterious wording (e.g., shocking, forbidden, untold, cursed, betrayed, secret, lost, haunted).
● Add contextual cues inspired by the story's world—such as its setting, roles, cultural elements, or atmosphere.
● Hint at the central conflict or twist without giving away the outcome.
● Style should remain cinematic, dramatic, and curiosity-driven, similar to successful viral storytelling titles.
● Adapt to the story's genre, tone, themes, and setting (not limited to any specific type or culture).
● Return ONLY the title, no numbering or additional text.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return response.choices[0].message?.content || "";
  }

  //Generate 5 outstanding, high-CTR YouTube title ideas
  static async generateTitles(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
      };
    } = {}
  ) {
    const { storyOutline = [], storyMetadata = {} } = options;
    const { title, characters = [], settings = [], themes = [], tone } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a YouTube strategist and viral title expert.

Create viral YouTube titles based on the provided story outline.

${metadataText}

${outlineText}

REQUIREMENTS:
● Generate 10 viral YouTube title ideas for the story.
● Each title must be under 65 characters.
● Use emotional, suspenseful, or mysterious wording (e.g., shocking, forbidden, untold, cursed, betrayed, secret, lost, haunted).
● Add contextual cues inspired by the story's world—such as its setting, roles, cultural elements, or atmosphere.
● Hint at the central conflict or twist without giving away the outcome.
● Style should remain cinematic, dramatic, and curiosity-driven, similar to successful viral storytelling titles.
● Adapt to the story's genre, tone, themes, and setting (not limited to any specific type or culture).
● Deliver the results in a numbered list (1–10).`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return response.choices[0].message?.content || "";
  } 

  //Generate SEO optimized YouTube description + synopsis
  static async generateDescription(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
      };
    } = {}
  ) {
    const { storyOutline = [], storyMetadata = {} } = options;
    const { title, characters = [], settings = [], themes = [], tone } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a YouTube strategist and expert storyteller.

Write a compelling YouTube video description based on the provided story outline.

${metadataText}

${outlineText}

STRUCTURE REQUIREMENTS:
1. **Opening Hook (1-2 sentences)**: 
   - Open with a dramatic hook that hints at the central conflict or mystery
   - Make it captivating and curiosity-driven
   - Do not reveal the full outcome

2. **Cinematic Synopsis (3-5 sentences)**:
   - Follow with a 3-5 sentence cinematic synopsis written in an engaging, suspenseful style
   - Build on the hook and expand the narrative
   - Maintain suspense and intrigue

3. **Contextual Elements**:
   - Incorporate contextual elements to ground the description in the story's unique universe:
     * Setting details (${settings.length > 0 ? settings.join(', ') : 'various locations'})
     * Character roles (${characters.length > 0 ? characters.join(', ') : 'main characters'})
     * Themes (${themes.length > 0 ? themes.join(', ') : 'central themes'})
     * Tone (${tone || 'dramatic'})
     * World-building details that enhance the story's atmosphere

4. **Call to Action**:
   - Conclude with a strong call to action encouraging viewers to:
     * Like the video
     * Share with others
     * Comment their thoughts
     * Subscribe for more content

5. **Tone & Style**:
   - Keep the tone captivating and aligned with viral storytelling formats
   - Use emotional language and curiosity-driven phrasing
   - Optimize for YouTube descriptions with relevant keywords
   - Make it engaging, mysterious, and compelling

Generate the description following this exact structure.`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.8,
    });

    return response.choices[0].message?.content || "";
  }

  //Generate image prompts
  static async generateImagePrompts(
    chapterText: string,
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
        niche?: string;
      };
      storedCharacterDetails?: Array<{
        name: string;
        age?: string;
        skinTone?: string;
        ethnicity?: string;
        attire?: string;
        facialFeatures?: string;
        physicalTraits?: string;
        otherDetails?: string;
      }>;
      chapterNumber?: number;
    } = {}
  ) {
    const { storyOutline = [], storyMetadata = {}, storedCharacterDetails = [], chapterNumber } = options;
    const { title, characters = [], settings = [], themes = [], tone, niche } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Full Story Outline (for visual consistency):
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    // Format stored character details for the prompt
    const characterDetailsText = storedCharacterDetails.length > 0
      ? `\n📌 ESTABLISHED CHARACTER VISUAL DETAILS (MUST USE THESE EXACT DESCRIPTIONS):
${storedCharacterDetails.map(char => {
  const details = [];
  if (char.age) details.push(`Age: ${char.age}`);
  if (char.skinTone) details.push(`Skin Tone: ${char.skinTone}`);
  if (char.ethnicity) details.push(`Ethnicity: ${char.ethnicity}`);
  if (char.attire) details.push(`Attire: ${char.attire}`);
  if (char.facialFeatures) details.push(`Facial Features: ${char.facialFeatures}`);
  if (char.physicalTraits) details.push(`Physical Traits: ${char.physicalTraits}`);
  if (char.otherDetails) details.push(`Other: ${char.otherDetails}`);
  return `- ${char.name}: ${details.join(', ')}`;
}).join('\n')}

CRITICAL: You MUST use these exact character descriptions in all image prompts. Do NOT change them unless the story outline or plot explicitly requires a change (e.g., character ages, changes attire due to plot, etc.).`
      : '';

    const metadataText = `
📌 Story Context (for visual consistency):
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}
${niche ? `Story Niche/Type: ${niche}` : ''}${characterDetailsText}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are an expert AI image prompt engineer for cinematic storytelling.

For the following chapter, generate one creative image prompt for each paragraph.

CRITICAL INSTRUCTIONS FOR VISUAL CONSISTENCY:
${metadataText}

${outlineText}

CHARACTER CONSISTENCY REQUIREMENTS:
${storedCharacterDetails.length > 0 
  ? `- You have established character details above. USE THOSE EXACT DESCRIPTIONS for all characters mentioned.
- Only modify character details if the story outline or plot explicitly requires it (e.g., time passage, plot-driven transformation, etc.)
- If a character appears but has no stored details, create consistent details and include them in your prompts`
  : `- For each character that appears, specify consistent details:
  * Age (e.g., "a 25-year-old warrior", "an elderly king in his 60s")
  * Skin tone (e.g., "dark brown", "light tan", "olive", "pale")
  * Ethnicity (e.g., "African", "West African", "East African", "white", "european", "Asian", "Middle Eastern", etc.)
  * Attire (e.g., "wearing traditional royal robes", "dressed in battle armor")
  * Facial features (e.g., "with a strong jawline and piercing eyes", "a weathered face with deep wrinkles")
  * Physical traits (e.g., "tall and muscular", "petite with long braided hair", "distinctive scar on left cheek")
- Use the same character descriptions across all image prompts for the same character
- ALWAYS include skin tone and ethnicity to ensure visual consistency across chapters`}
- Then add the action or scene description

IMAGE PROMPT REQUIREMENTS:
- Each prompt must vividly capture the main event, setting, or emotion of its paragraph
- Each image prompt must be highly creative and visually striking
- Use cinematic, dramatic, and culturally accurate visuals based on the story's genre
  * If African storytelling: include palaces, villages, forests, rivers, warriors, kings, queens, rituals, masks, ancestral spirits, festivals, traditional clothing, and landscapes
  * If another genre: adapt cultural cues (e.g., sci-fi city, medieval castle, haunted mansion)
- Style: hyper-realistic / cinematic / epic illustration
- Each prompt should be standalone (do not mention "paragraph" or "chapter" in the wording)
- Provide exactly one image prompt per paragraph
- Deliver results as a clean numbered list, matching the number of paragraphs in the chapter

Chapter Content:
${chapterText}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    return response.choices[0].message?.content || "";
  }

  // Extract character details from image prompts
  static async extractCharacterDetails(
    imagePrompts: string[],
    characterNames: string[],
    existingCharacterDetails: Array<{
      name: string;
      age?: string;
      skinTone?: string;
      ethnicity?: string;
      attire?: string;
      facialFeatures?: string;
      physicalTraits?: string;
      otherDetails?: string;
    }> = []
  ): Promise<Array<{
    name: string;
    age?: string;
    skinTone?: string;
    ethnicity?: string;
    attire?: string;
    facialFeatures?: string;
    physicalTraits?: string;
    otherDetails?: string;
  }>> {
    if (characterNames.length === 0) {
      return [];
    }

    const promptsText = imagePrompts.join('\n\n');
    const existingDetailsText = existingCharacterDetails.length > 0
      ? `\n\nExisting character details (do not duplicate these):
${existingCharacterDetails.map(char => {
  const details = [];
  if (char.age) details.push(`Age: ${char.age}`);
  if (char.skinTone) details.push(`Skin Tone: ${char.skinTone}`);
  if (char.ethnicity) details.push(`Ethnicity: ${char.ethnicity}`);
  if (char.attire) details.push(`Attire: ${char.attire}`);
  if (char.facialFeatures) details.push(`Facial Features: ${char.facialFeatures}`);
  if (char.physicalTraits) details.push(`Physical Traits: ${char.physicalTraits}`);
  if (char.otherDetails) details.push(`Other: ${char.otherDetails}`);
  return `- ${char.name}: ${details.join(', ')}`;
}).join('\n')}`
      : '';

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

Analyze the following image prompts and extract detailed visual descriptions for each character mentioned.

Characters to extract details for: ${characterNames.join(', ')}

${existingDetailsText}

For each character found in the prompts, extract and structure:
- Age (if mentioned, e.g., "25-year-old", "elderly", "young")
- Skin tone (if mentioned, e.g., "dark brown", "light tan", "olive", "pale", "deep brown", "caramel")
- Ethnicity (if mentioned, e.g., "African", "West African", "East African","European", "white", "Asian", "Middle Eastern", "Latino", etc.)
- Attire (clothing, accessories, e.g., "royal robes", "battle armor")
- Facial features (e.g., "strong jawline", "piercing eyes", "weathered face", "high cheekbones", "broad nose")
- Physical traits (e.g., "tall and muscular", "petite", "distinctive scar")
- Other defining details (any other visual characteristics)

IMPORTANT: Always try to identify skin tone and ethnicity from context, character names, settings, or cultural references in the image prompts. If not explicitly mentioned, infer from contextual clues.

Return ONLY valid JSON in this format:
{
  "characters": [
    {
      "name": "Character Name",
      "age": "age description if found",
      "skinTone": "skin tone description if found",
      "ethnicity": "ethnicity description if found",
      "attire": "attire description if found",
      "facialFeatures": "facial features if found",
      "physicalTraits": "physical traits if found",
      "otherDetails": "other details if found"
    }
  ]
}

Image Prompts:
${promptsText}
`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3, // Lower temperature for more consistent extraction
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      
      if (parsed.characters && Array.isArray(parsed.characters)) {
        // Merge with existing details, only updating if new details are found
        const merged: Array<{
          name: string;
          age?: string;
          skinTone?: string;
          ethnicity?: string;
          attire?: string;
          facialFeatures?: string;
          physicalTraits?: string;
          otherDetails?: string;
        }> = [];

        // Start with existing details
        existingCharacterDetails.forEach(existing => {
          merged.push({ ...existing });
        });

        // Add or update with new details
        parsed.characters.forEach((newChar: any) => {
          const existingIndex = merged.findIndex(c => 
            c.name.toLowerCase() === newChar.name.toLowerCase()
          );
          
          if (existingIndex >= 0) {
            // Update existing only if new details are provided
            if (newChar.age && !merged[existingIndex].age) merged[existingIndex].age = newChar.age;
            if (newChar.skinTone && !merged[existingIndex].skinTone) merged[existingIndex].skinTone = newChar.skinTone;
            if (newChar.ethnicity && !merged[existingIndex].ethnicity) merged[existingIndex].ethnicity = newChar.ethnicity;
            if (newChar.attire && !merged[existingIndex].attire) merged[existingIndex].attire = newChar.attire;
            if (newChar.facialFeatures && !merged[existingIndex].facialFeatures) merged[existingIndex].facialFeatures = newChar.facialFeatures;
            if (newChar.physicalTraits && !merged[existingIndex].physicalTraits) merged[existingIndex].physicalTraits = newChar.physicalTraits;
            if (newChar.otherDetails && !merged[existingIndex].otherDetails) merged[existingIndex].otherDetails = newChar.otherDetails;
          } else {
            // Add new character
            merged.push({
              name: newChar.name,
              age: newChar.age,
              skinTone: newChar.skinTone,
              ethnicity: newChar.ethnicity,
              attire: newChar.attire,
              facialFeatures: newChar.facialFeatures,
              physicalTraits: newChar.physicalTraits,
              otherDetails: newChar.otherDetails,
            });
          }
        });

        return merged;
      }

      return existingCharacterDetails;
    } catch (error) {
      console.error("Failed to extract character details:", error);
      return existingCharacterDetails; // Return existing if extraction fails
    }
  }

  //Generate Shorts hook + image prompts
  static async generateShortsHooks(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
        niche?: string;
      };
    } = {}
  ): Promise<{ hook: string; imagePrompts: string[] } | null> {
    const { storyOutline = [], storyMetadata = {} } = options;
    const { title, characters = [], settings = [], themes = [], tone, niche } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}
${niche ? `Story Niche/Type: ${niche}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a YouTube strategist and scriptwriter for viral storytelling Shorts, and an expert at visual storytelling prompts.

Using the provided story outline and context, create ONE powerful intro for a YouTube Short storytelling video, **plus image prompts** for that intro.

${metadataText}

${outlineText}

INTRO STRUCTURE (HOOK + TRANSITION):
- Write the intro as **multiple short paragraphs**.
- Together, these paragraphs should form:
  - A **hook** (3–5 suspenseful sentences) that immediately grabs attention, mysterious, dramatic, curiosity-driven.
  - A **transition** (2–3 sentences) that calms slightly but still engages, introducing the setting, time, or atmosphere, and smoothly leading into the story.
- Sentences should be short, cinematic, and high-retention.

IMAGE PROMPTS FOR THE INTRO:
- After writing the intro, generate **one image prompt per paragraph** of the intro.
- Each image prompt should:
  - Visually represent the key emotional and narrative beat of that paragraph.
  - Include clear details about characters (age, attire, facial features, physical traits) and setting (location, time of day, atmosphere) that match the story's world.
  - Be highly creative, cinematic, and visually striking.

OUTPUT FORMAT (CRITICAL):
Return ONLY valid JSON in this exact format:
{
  "hook": "Full intro text with paragraphs separated by \\n\\n.",
  "imagePrompts": [
    "Image prompt for paragraph 1",
    "Image prompt for paragraph 2",
    "Image prompt for paragraph 3"
  ]
}

⚠️ Do NOT include markdown, backticks, or any text outside the JSON.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);

      const hookText =
        parsed &&
        typeof parsed.hook === "string" &&
        parsed.hook.trim().length > 0
          ? parsed.hook.trim()
          : "";

      const imagePrompts: string[] = Array.isArray(parsed.imagePrompts)
        ? parsed.imagePrompts
            .filter((p: any) => typeof p === "string" && p.trim().length > 0)
            .map((p: string) => p.trim())
        : [];

      if (!hookText) {
        return null;
      }

      return {
        hook: hookText,
        imagePrompts,
      };
    } catch (error) {
      console.error("Failed to parse shorts hooks response as JSON:", error);
      // Return null if parsing fails
      return null;
    }
  }

  //Generate SEO keywords and hashtags
  static async generateSEOKeywords(
    options: {
      storyOutline?: { number: number; purpose: string; description: string }[];
      storyMetadata?: {
        title?: string;
        characters?: string[];
        settings?: string[];
        themes?: string[];
        tone?: string;
      };
    } = {}
  ): Promise<{
    keywords: string[];
    hashtags: string[];
  }> {
    const { storyOutline = [], storyMetadata = {} } = options;
    const { title, characters = [], settings = [], themes = [], tone } = storyMetadata;

    const outlineText = storyOutline.length > 0
      ? `📌 Story Outline:
${storyOutline.map(item => `Chapter ${item.number} (${item.purpose}): ${item.description}`).join('\n')}`
      : '';

    const metadataText = `
📌 Story Context:
${title ? `Title: ${title}` : ''}
${characters.length > 0 ? `Main Characters: ${characters.join(', ')}` : ''}
${settings.length > 0 ? `Settings: ${settings.join(', ')}` : ''}
${themes.length > 0 ? `Themes: ${themes.join(', ')}` : ''}
${tone ? `Tone: ${tone}` : ''}`;

    const prompt = `
IMPORTANT: Use simple, easy-to-understand English in all your responses. Avoid complex grammar and heavy language structures.

You are a YouTube SEO expert and viral content strategist.

Generate SEO-optimized keywords and hashtags based on the provided story outline and context.

${metadataText}

${outlineText}

REQUIREMENTS:

1. **SEO Keywords (15 keywords)**:
   - Generate exactly 15 SEO-friendly keywords tailored to the story's world, themes, conflict, and style
   - Keywords should be short 2-4-word phrases with high search intent
   - Align keywords with the story's tone, genre, themes, and narrative style
   - Focus on terms that would help the video rank well in YouTube search and recommendations
   - Include a mix of:
     * Story/genre-specific terms
     * Theme-related keywords
     * Character-related terms
     * Setting/location keywords
     * Emotional/tone keywords
     * Conflict-driven keywords

2. **YouTube Hashtags (10 hashtags)**:
   - Generate exactly 10 trending YouTube hashtags that will boost visibility
   - Combine broad storytelling tags with more specific emotional, thematic, or world-building cues relevant to the story
   - Hashtags should be formatted with # symbol
   - Mix of:
     * Broad storytelling tags (e.g., #Storytelling, #Narrative)
     * Genre-specific tags
     * Emotional/thematic tags
     * World-building tags
     * Trending YouTube tags

OUTPUT FORMAT:
Return ONLY valid JSON in this exact format:
{
  "keywords": [
    "keyword 1",
    "keyword 2",
    ...
    "keyword 15"
  ],
  "hashtags": [
    "#hashtag1",
    "#hashtag2",
    ...
    "#hashtag10"
  ]
}

⚠️ Return ONLY valid JSON. Do NOT include markdown code blocks, backticks, or explanations.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      });

      const content = response.choices[0]?.message?.content || "{}";
      const cleaned = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();

      const parsed = JSON.parse(cleaned);
      
      // Ensure we have arrays and limit to required counts
      const keywords = Array.isArray(parsed.keywords) 
        ? parsed.keywords.slice(0, 15).filter((k: any) => k && typeof k === 'string' && k.trim().length > 0)
        : [];
      
      const hashtags = Array.isArray(parsed.hashtags)
        ? parsed.hashtags.slice(0, 10).filter((h: any) => h && typeof h === 'string' && h.trim().length > 0)
        : [];

      return {
        keywords: keywords.length > 0 ? keywords : [],
        hashtags: hashtags.length > 0 ? hashtags : [],
      };
    } catch (error) {
      console.error("Failed to parse SEO keywords response as JSON:", error);
      // Return empty arrays if parsing fails
      return {
        keywords: [],
        hashtags: [],
      };
    }
  }

}

