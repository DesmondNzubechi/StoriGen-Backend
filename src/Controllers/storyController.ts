import { Request, Response } from "express";
import Story from "../Models/storyModel";
import { streamFullStory } from "../Services/aiService";

export const generateStoryStream = async (req: Request, res: Response) => {
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
    for await (const chunk of streamFullStory(prompt, targetWords, targetChapters)) {
      storyContent += chunk; // collect story to save later
      res.write(chunk); // stream live to client
    }

    // Save to MongoDB after streaming is complete
    const story = new Story({
      prompt,
      targetWords,
      targetChapters,
      content: storyContent.trim(),
    });
    await story.save();

    res.end();
  } catch (error: any) {
    console.error(error);
    res.write(`Error: ${error.message}`);
    res.end();
  }
};

// Fetch all stories
export const getStories = async (req: Request, res: Response) => {
  try {
    const stories = await Story.find().sort({ createdAt: -1 });
    res.json(stories);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch stories" });
  }
};

// Fetch single story by ID
export const getStoryById = async (req: Request, res: Response) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ error: "Story not found" });
    res.json(story);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch story" });
  }
};
