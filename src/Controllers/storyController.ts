import { NextFunction, Request, Response } from 'express';
import { Story } from '../Models/storyModel';
import { Summary } from '../Models/Summary';
import { AIService } from '../Services/aiService';
import { AppError } from '../errors/appError';
import catchAsync from '../utils/catchAsync';

type AuthenticatedRequest = Request & {
  user?: any;
};


export const generateChapterController = catchAsync<AuthenticatedRequest>(async (req, res, next) => {
  const { storyId, summary, summaryId, chapterNumber, totalChapters, wordsPerChapter, customizations = {} } = req.body;

  if (!chapterNumber || !totalChapters) {
    return res.status(400).json({
      success: false,
      message: "chapterNumber and totalChapters are required",
    });  
  } 

  const user = req.user;
  if (!user) {
    return next(new AppError("You are not authorised to access this route", 401));
  }

  let story: any;
  let summaryContent: string;
  let storyCustomizations: any = {};

  // If storyId exists → fetch story, outline, and last chapter summary
  if (storyId) {
    story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }
    summaryContent = story.summary;
    // Use stored customizations from story
    storyCustomizations = { 
      title: story.storyTitle,
      characters: story.characters || [],
      settings: story.settings || [],
      themes: story.themes || [],
      tone: story.tone || "dramatic",
    }; 
  } else {
    // Handle summary input: either from summaryId (DB) or summary (direct)
    if (summaryId) {
      // Fetch summary from database
      const summaryDoc = await Summary.findOne({ _id: summaryId, user: user._id });
      if (!summaryDoc) {
        return res.status(404).json({
          success: false,
          message: "Summary not found",
        });
      }
      summaryContent = summaryDoc.content;
      // Extract customizations from stored summary
      storyCustomizations = {
        title: summaryDoc.title,
        characters: summaryDoc.mainCharacters,
        settings: [], // Can be extracted from summary content if needed
        themes: summaryDoc.themes,
        tone: customizations.tone || "dramatic", // Use from request or default
      };
    } else if (summary) {
      // Use summary directly from request
      summaryContent = summary;
      // Use customizations from request
      storyCustomizations = {
        title: customizations.title,
        characters: customizations.characters || [],
        settings: customizations.settings ? (Array.isArray(customizations.settings) ? customizations.settings : [customizations.settings]) : [],
        themes: customizations.themes ? (Array.isArray(customizations.themes) ? customizations.themes : [customizations.themes]) : [],
        tone: customizations.tone || "dramatic",
      };
    } else {
      return res.status(400).json({
        success: false,
        message: "Either summary, summaryId, or storyId is required",
      });
    }
    
    // At this point, summaryContent is guaranteed to be assigned
    if (!summaryContent) {
      return res.status(400).json({
        success: false,
        message: "Summary content is required",
      });
    }
    // Must be first chapter to create new story
    if (chapterNumber !== 1) {
      return res.status(400).json({
        success: false,
        message: "You must start with Chapter 1 when creating a new story",
      });
    }

    // Generate enhanced outline with metadata
    const outlineResult = await AIService.generateEnhancedOutline(
      summaryContent,
      totalChapters,
      storyCustomizations
    );

    if (!outlineResult || !outlineResult.outline || outlineResult.outline.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Failed to generate outline",
      });
    }

    // Create new story with metadata
    story = await Story.create({
      user: user._id,
      prompt: summaryContent,
      targetWords: (wordsPerChapter || 500) * totalChapters,
      totalChapters: totalChapters,
      summary: summaryContent,
      outline: outlineResult.outline,
      storyTitle: outlineResult.metadata.title,
      characters: outlineResult.metadata.characters,
      settings: outlineResult.metadata.settings,
      themes: outlineResult.metadata.themes,
      tone: outlineResult.metadata.tone,
      chapters: [],
      status: "in_progress",
    });
  }

  // Enforce sequential generation
  if (chapterNumber > 1) {
    const previousChapterExists = story.chapters.some((ch: any) => ch.number === chapterNumber - 1);
    if (!previousChapterExists) {
      return res.status(400).json({
        success: false,
        message: `You must generate Chapter ${chapterNumber - 1} before generating Chapter ${chapterNumber}.`,
      });
    }
  }

  // Prevent duplicates
  if (story.chapters.some((ch: any) => ch.number === chapterNumber)) {
    return res.status(400).json({
      success: false,
      message: `Chapter ${chapterNumber} already exists.`,
    });
  }

  // Get outline item for this chapter
  const outlineItem = story.outline[chapterNumber - 1];
  if (!outlineItem) {
    return res.status(400).json({
      success: false,
      message: `Outline for Chapter ${chapterNumber} not found.`,
    });
  }

  // Get last chapter summary for continuity (for subsequent chapters)
  const lastChapter = story.chapters
    .sort((a: any, b: any) => b.number - a.number)
    .find((ch: any) => ch.number === chapterNumber - 1);
  const lastChapterSummary = lastChapter?.summary;

  // Generate chapter with outline + last chapter summary (not full story)
  const chapter = await AIService.generateChapter(
    summaryContent,
    chapterNumber,
    story.totalChapters,
    outlineItem.description,
    {
      storyOutline: story.outline,
      lastChapterSummary: lastChapterSummary,
      wordsPerChapter: wordsPerChapter || 500,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
    }
  );

  // Append chapter with summary
  story.chapters.push({
    number: chapterNumber,
    title: chapter.title,
    content: chapter.content,
    summary: chapter.summary, // Store chapter summary for continuity
    wordCount: chapter.wordCount,
    paragraphs: chapter.paragraphs,
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
});

/**
 * Get all chapters for a script
 */
export const getFullStory = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                                        
  try {
    const { storyId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

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
export const getStoryUserById = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                                    
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

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
export const updateScript = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                                        
  try {
    const { summaryId } = req.params;
    const { totalChapters, title } = req.body;
    const user = req.user;

    if (!user) {
      return next(
        new AppError("You are not authorised to access this route", 401)
      );
    }

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
export const generateViralTitle = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                                  
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate single viral title using story outline and metadata (not full story)
    const viralTitle = await AIService.generateViralTitle({
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
    });

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
export const generateViralDescription = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                            
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate description using story outline and metadata (not full story)
    const descriptionResponse = await AIService.generateDescription({
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
    });

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
export const generateViralThumbnailPrompts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                       
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate thumbnail prompt using story outline and metadata (not full story)
    const videoTitle = story.youtubeAssets.titles?.[0] || story.storyTitle; // Use first title if available, otherwise story title
    const thumbnailPrompt = await AIService.generateThumbnailPrompt({
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
      videoTitle: videoTitle,
    });

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
export const generateViralShortsHooks = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                            
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate shorts hooks using story outline and metadata (not full story)
    const hooks = await AIService.generateShortsHooks({
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
    });

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
export const generateSEOKeywords = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                                 
  try {
    const { storyId } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

    // Find story and verify ownership
    const story = await Story.findOne({ _id: storyId, user: user._id });
    if (!story) {
      return res.status(404).json({
        success: false,
        message: "Story not found",
      });
    }

    // Generate SEO keywords and hashtags using story outline and metadata (not full story)
    const seoResult = await AIService.generateSEOKeywords({
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
    });
    
    const { keywords, hashtags } = seoResult;

    // Update story with keywords and hashtags
    story.youtubeAssets.hashtags = hashtags;
    story.youtubeAssets.keywords = keywords;
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
export const generateChapterImagePrompts = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {                                                         
  try {
    const { storyId, chapterNumber } = req.params;

    const user = req.user;
    if (!user) {
      return next(new AppError("You are not authorised to access this route", 401));
    }

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

    // Get stored character details for consistency
    const storedCharacterDetails = (story.characterDetails || []).map((char: any) => ({
      name: char.name,
      age: char.age,
      attire: char.attire,
      facialFeatures: char.facialFeatures,
      physicalTraits: char.physicalTraits,
      otherDetails: char.otherDetails,
    }));

    // Generate image prompts for the chapter using outline, metadata, and stored character details
    const imagePromptsResponse = await AIService.generateImagePrompts(chapter.content, {
      storyOutline: story.outline,
      storyMetadata: {
        title: story.storyTitle,
        characters: story.characters || [],
        settings: story.settings || [],
        themes: story.themes || [],
        tone: story.tone,
      },
      storedCharacterDetails: storedCharacterDetails,
      chapterNumber: parseInt(chapterNumber),
    });
     
    // Parse the response to extract individual prompts
    const prompts = imagePromptsResponse
      .split(/\n|\r|\r\n/g)
      .map((p: string) => p.replace(/^[-*\d\.\)\s]+/, "").trim())
      .filter(Boolean);

    // Extract character details from the generated prompts
    const characterNames = story.characters || [];
    if (characterNames.length > 0 && prompts.length > 0) {
      const extractedDetails = await AIService.extractCharacterDetails(
        prompts,
        characterNames,
        storedCharacterDetails
      );

      // Update character details in story
      // Only update if new details are found or if there's a meaningful story reason
      const currentChapterNum = parseInt(chapterNumber);
      const outlineItem = story.outline.find((item: any) => item.number === currentChapterNum);
      const hasPlotChange = outlineItem?.purpose === 'climax' || outlineItem?.purpose === 'resolution';
      
      extractedDetails.forEach((newChar) => {
        const existingIndex = story.characterDetails.findIndex(
          (char: any) => char.name.toLowerCase() === newChar.name.toLowerCase()
        );

        if (existingIndex >= 0) {
          // Check if update is needed (only update if new details are provided or plot requires change)
          const existing = story.characterDetails[existingIndex];
          let needsUpdate = false;
          let updateReason = '';

          // Check each field for updates
          if (newChar.age && newChar.age !== existing.age) {
            needsUpdate = true;
            updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
          }
          if (newChar.attire && newChar.attire !== existing.attire) {
            needsUpdate = true;
            updateReason = hasPlotChange ? 'Plot-driven attire change' : 'New detail found';
          }
          if (newChar.facialFeatures && newChar.facialFeatures !== existing.facialFeatures) {
            needsUpdate = true;
            updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
          }
          if (newChar.physicalTraits && newChar.physicalTraits !== existing.physicalTraits) {
            needsUpdate = true;
            updateReason = hasPlotChange ? 'Plot-driven transformation' : 'New detail found';
          }
          if (newChar.otherDetails && newChar.otherDetails !== existing.otherDetails) {
            needsUpdate = true;
            updateReason = hasPlotChange ? 'Plot development' : 'New detail found';
          }

          // Only update if there's a meaningful reason
          if (needsUpdate && (hasPlotChange || !existing.age || !existing.attire || !existing.facialFeatures)) {
            story.characterDetails[existingIndex] = {
              ...existing,
              ...newChar,
              lastUpdatedChapter: currentChapterNum,
              updateReason: updateReason,
            };
          }
        } else {
          // Add new character details
          story.characterDetails.push({
            name: newChar.name,
            age: newChar.age,
            attire: newChar.attire,
            facialFeatures: newChar.facialFeatures,
            physicalTraits: newChar.physicalTraits,
            otherDetails: newChar.otherDetails,
            lastUpdatedChapter: currentChapterNum,
            updateReason: 'Initial character introduction',
          });
        }
      });
    }

    // Create chapter image prompts entry
    const chapterImagePrompts = {
      chapter: parseInt(chapterNumber),
      prompts: prompts
    };

    // Remove existing prompts for this chapter if any
    story.chapterImagePrompts = story.chapterImagePrompts.filter(
      (cip: any) => cip.chapter !== parseInt(chapterNumber)
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


