import OpenAI from "openai";
import { config } from "dotenv";

config({ path: "./config.env" });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Generate story outline
async function generateOutline(prompt: string, targetWords: number, targetChapters: number) {
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

  const response = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: outlinePrompt }],
  });

  return response.choices[0].message.content;
}

// Stream a chapter
async function* streamChapter(
  outline: string,
  chapterNumber: number,
  totalChapters: number,
  wordsPerChapter: number
) {
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

  const stream = await openai.chat.completions.create({
    model: "gpt-5",
    messages: [{ role: "user", content: chapterPrompt }],
    stream: true, // 🚨 Enable streaming
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content || "";
    if (token) {
      yield token; // send each token to frontend
    }
  }
}

// Main function: stream the full story chapter by chapter
export async function* streamFullStory(
  prompt: string,
  targetWords: number,
  targetChapters: number
) {
  // Step 1: Create outline (non-streamed for now)
  const outline: any = await generateOutline(prompt, targetWords, targetChapters);

  // Step 2: Stream chapters
  const wordsPerChapter = Math.floor(targetWords / targetChapters);

  for (let i = 1; i <= targetChapters; i++) {
    yield `\n\n--- Chapter ${i} ---\n\n`; // notify frontend a new chapter starts
    for await (const token of streamChapter(outline, i, targetChapters, wordsPerChapter)) {
      yield token;
    }
  }
}
