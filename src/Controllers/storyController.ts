import { Request, Response } from "express";
import { Story } from "../Models/storyModel";
import { generateOutline, generateChapter, generateImagePrompts, generateDescription, generateTitles, generateThumbnailPrompt } from "../Services/aiService";

// ==========================
// INIT STORY
// ==========================
export const initStory = async (req: Request, res: Response) => {
  try {
    const { prompt, targetWords, targetChapters } = req.body;
    if (!prompt || !targetWords || !targetChapters) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Generate outline
    const outline = await generateOutline(prompt, targetWords, targetChapters);

    // Create new story doc
    const story = await Story.create({
      user: (req as any).user?._id,
      prompt,
      targetWords,
      targetChapters,
      outline,
      chapters: [],
      youtubeAssets: {},
      status: "in_progress",
    });

    res.status(201).json(story);
  } catch (error: any) {
    res.status(500).json({ message: "Error initializing story", error: error.message });
  }
};

// ==========================
// GENERATE CHAPTER
// ==========================
export const generateStoryChapter = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const { chapterNumber } = req.body;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    if (chapterNumber > story.targetChapters) {
      return res.status(400).json({ message: "Chapter number exceeds targetChapters" });
    }

    const chapterText = await generateChapter(
      story.outline || "",
      chapterNumber,
      story.targetChapters,
      story.targetWords
    );

    // Split chapter into paragraphs
    const paragraphs = chapterText
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => ({ text: p }));

    const newChapter = {
      number: chapterNumber,
      title: `Chapter ${chapterNumber}`,
      text: chapterText,
      paragraphs,
    };

    story.chapters.push(newChapter);
    await story.save();

    res.json(newChapter);
  } catch (error: any) {
    res.status(500).json({ message: "Error generating chapter", error: error.message });
  }
};

// ==========================
// GENERATE IMAGE PROMPTS (PER PARAGRAPH)
// ==========================
export const generateChapterImagePrompts = async (req: Request, res: Response) => {
  try {
    const { storyId, chapterNumber } = req.params;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const chapter = story.chapters.find((c) => c.number === Number(chapterNumber));
    if (!chapter) return res.status(404).json({ message: "Chapter not found" });

    // Generate image prompts for each paragraph
    for (let i = 0; i < chapter.paragraphs.length; i++) {
      const imagePrompt = await generateImagePrompts(chapter.paragraphs[i].text, story.prompt);
      chapter.paragraphs[i].imagePrompt = imagePrompt;
    }

    await story.save();
    res.json(chapter.paragraphs);
  } catch (error: any) {
    res.status(500).json({ message: "Error generating image prompts", error: error.message });
  }
};

// ==========================
// GENERATE DESCRIPTION
// ==========================
export const generateStoryDescription = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const fullStory = story.chapters.map((c) => c.text).join("\n\n");
    const description = await generateDescription(fullStory);
    story.youtubeAssets.description = description;

    await story.save();
    res.json({ description });
  } catch (error: any) {
    res.status(500).json({ message: "Error generating description", error: error.message });
  }
};

// ==========================
// GENERATE TITLES
// ==========================
export const generateStoryTitles = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const fullStory = story.chapters.map((c) => c.text).join("\n\n");
    const titlesRaw = await generateTitles(fullStory);
    const titles = titlesRaw
      .split(/\n|\r|\r\n/g)
      .map((t) => t.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean);
    story.youtubeAssets.titles = titles;

    await story.save();
    res.json({ titles });
  } catch (error: any) {
    res.status(500).json({ message: "Error generating titles", error: error.message });
  }
};

// ==========================
// GENERATE THUMBNAIL PROMPT
// ==========================
export const generateStoryThumbnail = async (req: Request, res: Response) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const fullStory = story.chapters.map((c) => c.text).join("\n\n");
    const thumbnailPrompt = await generateThumbnailPrompt(fullStory);
    story.youtubeAssets.thumbnailPrompt = thumbnailPrompt;

    // Final update → assets_complete
    story.status = "assets_complete";
    await story.save();

    res.json({ thumbnailPrompt });
  } catch (error: any) {
    res.status(500).json({ message: "Error generating thumbnail prompt", error: error.message });
  }
};

// ==========================
// FETCH STORIES
// ==========================
export const getStories = async (req: Request, res: Response) => {
  try {
    const stories = await Story.find({ user: (req as any).user?._id }).sort({ createdAt: -1 });
    res.json(stories);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching stories", error: error.message });
  }
};

// ==========================
// FETCH ONE STORY
// ==========================
export const getStoryById = async (req: Request, res: Response) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story not found" });
    res.json(story);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching story", error: error.message });
  }
};
