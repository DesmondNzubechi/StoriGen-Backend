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
// FETCH USER STORIES WITH PAGINATION
// ==========================
export const getUserStories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const status = req.query.status as string;
    const search = req.query.search as string;
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortOrder = req.query.sortOrder as string || 'desc';

    // Build filter object
    const filter: any = { user: userId };
    
    if (status) {
      filter.status = status;
    }
    
    if (search) {
      filter.$or = [
        { prompt: { $regex: search, $options: 'i' } },
        { 'chapters.title': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Execute query with pagination
    const stories = await Story.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-chapters.paragraphs.imagePrompt'); // Exclude image prompts for list view

    // Get total count for pagination
    const totalStories = await Story.countDocuments(filter);
    const totalPages = Math.ceil(totalStories / limit);

    res.json({
      stories,
      pagination: {
        currentPage: page,
        totalPages,
        totalStories,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching user stories", error: error.message });
  }
};

// ==========================
// FETCH ONE STORY BY ID (WITH USER VALIDATION)
// ==========================
export const getStoryById = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const storyId = req.params.id;

    const story = await Story.findOne({ 
      _id: storyId, 
      user: userId 
    });

    if (!story) {
      return res.status(404).json({ 
        message: "Story not found or you don't have permission to access it" 
      });
    }

    res.json(story);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching story", error: error.message });
  }
};

// ==========================
// FETCH USER STORY STATISTICS
// ==========================
export const getUserStoryStats = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;

    const stats = await Story.aggregate([
      { $match: { user: userId } },
      {
        $group: {
          _id: null,
          totalStories: { $sum: 1 },
          totalWords: { $sum: '$targetWords' },
          totalChapters: { $sum: { $size: '$chapters' } },
          completedStories: {
            $sum: {
              $cond: [{ $eq: ['$status', 'assets_complete'] }, 1, 0]
            }
          },
          inProgressStories: {
            $sum: {
              $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0]
            }
          },
          chaptersCompleteStories: {
            $sum: {
              $cond: [{ $eq: ['$status', 'chapters_complete'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      totalStories: 0,
      totalWords: 0,
      totalChapters: 0,
      completedStories: 0,
      inProgressStories: 0,
      chaptersCompleteStories: 0
    };

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching story statistics", error: error.message });
  }
};

// ==========================
// SEARCH USER STORIES
// ==========================
export const searchUserStories = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const { q, status, dateFrom, dateTo, sortBy, sortOrder } = req.query;

    // Build search filter
    const filter: any = { user: userId };

    if (q) {
      filter.$or = [
        { prompt: { $regex: q, $options: 'i' } },
        { 'chapters.title': { $regex: q, $options: 'i' } },
        { 'chapters.text': { $regex: q, $options: 'i' } }
      ];
    }

    if (status) {
      filter.status = status;
    }

    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom as string);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo as string);
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string || 'createdAt'] = sortOrder === 'asc' ? 1 : -1;

    const stories = await Story.find(filter)
      .sort(sort)
      .select('-chapters.paragraphs.imagePrompt')
      .limit(50); // Limit search results

    res.json({
      stories,
      totalResults: stories.length,
      searchQuery: q
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error searching stories", error: error.message });
  }
};

// ==========================
// GET STORY BY STATUS
// ==========================
export const getStoriesByStatus = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?._id;
    const status = req.params.status;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    // Validate status
    const validStatuses = ['in_progress', 'chapters_complete', 'assets_complete'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: "Invalid status. Must be one of: in_progress, chapters_complete, assets_complete" 
      });
    }

    const skip = (page - 1) * limit;

    const stories = await Story.find({ 
      user: userId, 
      status: status 
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-chapters.paragraphs.imagePrompt');

    const totalStories = await Story.countDocuments({ 
      user: userId, 
      status: status 
    });
    const totalPages = Math.ceil(totalStories / limit);

    res.json({
      stories,
      status,
      pagination: {
        currentPage: page,
        totalPages,
        totalStories,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error: any) {
    res.status(500).json({ message: "Error fetching stories by status", error: error.message });
  }
};
