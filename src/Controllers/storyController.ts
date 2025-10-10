import { NextFunction, Request, Response } from 'express';
import { Story } from '../Models/storyModel';
import { AIService } from '../Services/aiService';
import { verifyTokenAndGetUser } from '../utils/verifyTokenAndGetUser';
import { AppError } from '../errors/appError';


export const generateChapterController = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId, summary, chapterNumber, totalChapters, wordsPerChapter, customizations = {} } = req.body;

    if (!chapterNumber || !totalChapters) {
      return res.status(400).json({
        success: false,
        message: "chapterNumber and totalChapters are required",
      });
    } 
 
    const token = req.cookies.jwt;
     
       if (!token) {
         return next(
           new AppError("You are not authorised to access this route", 401)
         );
       }
      
       const user = await verifyTokenAndGetUser(token, next);

    let story;

    // If storyId exists → find the story
    if (storyId) {
      story = await Story.findOne({ _id: storyId, user: user._id });
      if (!story) {
        return res.status(404).json({
          success: false,
          message: "Story not found",
        });
      }
    } else {
      // Must be first chapter to create new story
      if (chapterNumber !== 1) {
        return res.status(400).json({
          success: false,
          message: "You must start with Chapter 1 when creating a new story",
        });
      }

      if (!summary) {
        return res.status(400).json({
          success: false,
          message: "Summary is required when creating a new story",
        });
      }

      // Generate outline at creation
      const outline = await AIService.generateOutline(summary, totalChapters);

        if (!outline) {
        return res.status(400).json({
          success: false,
          message: "outline is required when creating a new story",
        });
      }

      console.log("The outline", outline)

      story = await Story.create({
        user: user._id,
        prompt: summary, // Using summary as prompt since prompt is required
        targetWords: wordsPerChapter * totalChapters, // Calculate total words
        totalChapters: totalChapters,
        summary,
        outline,
        chapters: [],
        status: "in_progress",
      });
    }

    // ✅ Enforce sequential generation
    if (chapterNumber > 1) {
      const previousChapterExists = story.chapters.some(ch => ch.number === chapterNumber - 1);
      if (!previousChapterExists) {
        return res.status(400).json({
          success: false,
          message: `You must generate Chapter ${chapterNumber - 1} before generating Chapter ${chapterNumber}.`,
        });
      }
    }

    // Prevent duplicates
    if (story.chapters.some(ch => ch.number === chapterNumber)) {
      return res.status(400).json({
        success: false,
        message: `Chapter ${chapterNumber} already exists.`,
      });
    }

    // Get outline item for this chapter
    const outlineItem = story?.outline[chapterNumber - 1];
    if (!outlineItem) {
      return res.status(400).json({
        success: false,
        message: `Outline for Chapter ${chapterNumber} not found.`,
      });
    }

    // Prepare previous chapters for continuity
    const previousChapters = story.chapters
      .sort((a, b) => a.number - b.number)
      .map(ch => ({
        number: ch.number,
        title: ch.title,
        content: ch.content
      }));

    // Generate chapter
    const chapter = await AIService.generateChapter(
      story.summary,
      chapterNumber,
      story.totalChapters,
      outlineItem?.description || `Chapter ${chapterNumber} storyline continuation`, // Pass the description string instead of the whole object
      { 
        previousChapters,
        wordsPerChapter, 
        ...customizations 
      }
    );
 
    console.log("The chapter is here", chapter)

    // Append chapter
    story.chapters.push({
      number: chapterNumber,
      title: chapter.title,
      content: chapter.content,
      wordCount: chapter.wordCount,
      paragraphs : chapter.paragraphs
    });

    // Mark completed if last chapter
    if (chapterNumber === story.totalChapters) {
      story.status = "completed";
    }

    await story.save();

    res.status(201).json({
      success: true,
      data: {
        storyId: story._id,
        chapter,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error generating chapter",
      error: error.message,
    });
  }
};

/**
 * Get all chapters for a script
 */
export const getFullStory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Check token
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find the story with chapters
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Pagination for chapters (optional)
    const skip = (Number(page) - 1) * Number(limit);
    const total = story.chapters.length;

    const paginatedChapters = story.chapters
      .sort((a, b) => a.number - b.number)
      .slice(skip, skip + Number(limit));

    res.status(200).json({
      success: true,
      data: {
        story: {
          _id: story._id,
          prompt: story.prompt,
          summary: story.summary,
          outline: story.outline,
          targetWords: story.targetWords,
          targetChapters: story.totalChapters,
          characterProfile: story.characterProfile,
          youtubeAssets: story.youtubeAssets,
          status: story.status,
          chapterImagePrompts: story.chapterImagePrompts,
          createdAt: story.createdAt,
          updatedAt: story.updatedAt,
          chapters: paginatedChapters,
        },
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
          hasNextPage: Number(page) < Math.ceil(total / Number(limit)),
          hasPrevPage: Number(page) > 1,
        },
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Error fetching story",
      error: error.message,
    });
  }
};
 
/**
 * Get a story by ID
 */
export const getStoryUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story by ID & ownership
    const story = await Story.find({user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found for this particular user" ,
      });
    }

    console.log("All my story", story)

    res.status(200).json({
      success: true,
      data: story,
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false,
      message: "Error fetching story",
      error: error.message,
    });
  }
};

/**
 * Update script settings
 */
export const updateScript = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { summaryId } = req.params;
    const { totalChapters, title } = req.body;
    const token = req.cookies.jwt;
     
       if (!token) {
         return next(
           new AppError("You are not authorised to access this route", 401)
         );
       }
     
       const user = await verifyTokenAndGetUser(token, next);

    const script = await Story.findOneAndUpdate(
      { summary: summaryId, user: user._id },
      { targetChapters: totalChapters, title },
      { new: true, runValidators: true }
    ).populate('summary', 'title content');

    if (!script) {
      return res.status(404).json({
        success: false,
        message: 'Script not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { script }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error updating script',
      error: error.message
    });
  }
};
 

//GENERATE STORY TITLE
// === Generate Single Viral Title ===
export const generateViralTitle = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate full story text for context
    const fullStory = story.chapters.map(ch => ch.content).join("\n\n") || story.summary || story.prompt;

    // Generate single viral title
    const viralTitle = await AIService.generateViralTitle(fullStory);

    // Update story - store in youtubeAssets.titles array (first element)
    if (!story.youtubeAssets.titles) {
      story.youtubeAssets.titles = [];
    }
    story.youtubeAssets.titles = [viralTitle];
    await story.save();

    res.status(200).json({
      success: true,
      message: "Viral title generated successfully",
      data: {
        storyId: story._id,
        viralTitle: viralTitle,
        updatedStory: story
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating viral title",
      error: err.message 
    });
  }
};

// === Generate Viral Description ===
export const generateViralDescription = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate full story text for AI context
    const fullStory = story.chapters.map(ch => ch.content).join("\n\n") || story.summary || story.prompt;

    // Generate description using AI service
    const descriptionResponse = await AIService.generateDescription(fullStory);

    // Clean and format response (optional)
    const description = descriptionResponse.trim();

    // Update story with new viral description
    story.youtubeAssets.description = description;
    await story.save();

    res.status(200).json({
      success: true,
      message: "Viral description generated successfully",
      data: {
        storyId: story._id,
        viralDescription: description,
        updatedStory: story,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: "Error generating viral description",
      error: err.message,
    });
  }
};


// === Generate Viral Thumbnail Prompts ===
export const generateViralThumbnailPrompts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate full story text for context
    const fullStory = story.chapters.map(ch => ch.content).join("\n\n") || story.summary || story.prompt;

    // Generate thumbnail prompt
    const thumbnailPrompt = await AIService.generateThumbnailPrompt(fullStory);

    // Update story
    story.youtubeAssets.thumbnailPrompt = thumbnailPrompt;
    await story.save();

    res.status(200).json({
      success: true,
      message: "Viral thumbnail prompt generated successfully",
      data: {
        storyId: story._id,
        thumbnailPrompt: thumbnailPrompt,
        updatedStory: story
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating thumbnail prompt",
      error: err.message 
    });
  }
};

// === Generate Viral YouTube Shorts Hooks ===
export const generateViralShortsHooks = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate full story text for context
    const fullStory = story.chapters.map(ch => ch.content).join("\n\n") || story.summary || story.prompt;

    // Generate shorts hooks
    const hooksResponse = await AIService.generateShortsHooks(fullStory);
    
    // Parse the response to extract individual hooks
    const hooks = hooksResponse
      .split(/\n|\r|\r\n/g)
      .map((h: string) => h.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 5); // Limit to 5 hooks

    // Update story
    story.youtubeAssets.shortsHooks = hooks;
    await story.save();

    res.status(200).json({
      success: true,
      message: "Viral shorts hooks generated successfully",
      data: {
        storyId: story._id,
        shortsHooks: hooks,
        updatedStory: story
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating shorts hooks",
      error: err.message 
    });
  }
};

// === Generate SEO Keywords and Hashtags ===
export const generateSEOKeywords = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate full story text for context
    const fullStory = story.chapters.map(ch => ch.content).join("\n\n") || story.summary || story.prompt;

    // Generate SEO keywords and hashtags
    const seoResponse = await AIService.generateSEOKeywords(fullStory);
    
    // Parse the response to extract keywords and hashtags
    const lines = seoResponse.split(/\n|\r|\r\n/g).filter(Boolean);
    
    // Extract keywords (usually listed first)
    const keywords = lines
      .filter(line => !line.includes('#') && line.trim().length > 0)
      .map(line => line.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 15); // Limit to 15 keywords

    // Extract hashtags (lines starting with #)
    const hashtags = lines
      .filter(line => line.includes('#'))
      .map(line => line.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 10); // Limit to 10 hashtags

    // Update story
    story.youtubeAssets.hashtags = hashtags;
    await story.save();

    res.status(200).json({
      success: true,
      message: "SEO keywords and hashtags generated successfully",
      data: {
        storyId: story._id,
        keywords: keywords,
        hashtags: hashtags,
        updatedStory: story
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating SEO keywords and hashtags",
      error: err.message 
    });
  }
};

// === Generate Chapter Image Prompts ===
export const generateChapterImagePrompts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { storyId, chapterNumber } = req.params;

    // Check authentication
    const token = req.cookies.jwt;
    if (!token) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    const user = await verifyTokenAndGetUser(token, next);
    if (!user) return;

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Find the specific chapter
    const chapter = story.chapters.find(ch => ch.number === parseInt(chapterNumber));
    if (!chapter) {
      return res.status(404).json({
        success: false,
        message: `Chapter ${chapterNumber} not found`,
      });
    }

    // Generate image prompts for the chapter
    const imagePromptsResponse = await AIService.generateImagePrompts(chapter.content, story.summary || story.prompt);
    
    // Parse the response to extract individual prompts
    const prompts = imagePromptsResponse
      .split(/\n|\r|\r\n/g)
      .map((p: string) => p.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean);

    // Create chapter image prompts entry
    const chapterImagePrompts = {
      chapter: parseInt(chapterNumber),
      prompts: prompts
    };

    // Remove existing prompts for this chapter if any
    story.chapterImagePrompts = story.chapterImagePrompts.filter(
      cip => cip.chapter !== parseInt(chapterNumber)
    );

    // Add new prompts
    story.chapterImagePrompts.push(chapterImagePrompts);
    await story.save();

    res.status(200).json({
      success: true,
      message: `Image prompts generated successfully for Chapter ${chapterNumber}`,
      data: {
        storyId: story._id,
        chapterNumber: parseInt(chapterNumber),
        imagePrompts: prompts,
        updatedStory: story
      }
    });
  } catch (err: any) {
    res.status(500).json({ 
      success: false, 
      message: "Error generating chapter image prompts",
      error: err.message 
    });
  }
};


